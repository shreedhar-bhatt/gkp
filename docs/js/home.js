const home = {
  async loadLatest() {
    try {
      const res = await fetch('data/latest.json');
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      this.renderLatest(data);
    } catch (e) {
      document.getElementById('latest-card').innerHTML = `
        <div class="card-body">
          <p style="color: var(--danger);">Failed to load data.</p>
          <p style="color: var(--text-muted); font-size: 0.9rem;">Please try again later.</p>
        </div>`;
    }
  },

  renderLatest(data) {
    const meta = data.metadata;
    document.querySelector('#latest-card .card-title').textContent = meta.title || 'Loksewa Quiz';
    document.getElementById('latest-title').textContent = meta.title || 'Loksewa Quiz';
    document.getElementById('latest-date').textContent = meta.date || '-';
    document.getElementById('latest-count').textContent = meta.totalQuestions || data.questions?.length || 0;
  },

  async loadCategories() {
    try {
      const indexRes = await fetch('data/archive_index.json');
      if (!indexRes.ok) throw new Error('No archive index');
      const indexData = await indexRes.json();
      const archives = indexData.archives || [];

      const allQuestions = [];

      const quizPromises = archives.map(async (archive) => {
        try {
          const qRes = await fetch(archive.filePath);
          if (!qRes.ok) return [];
          const qData = await qRes.json();
          return qData.questions || [];
        } catch {
          return [];
        }
      });

      const questionArrays = await Promise.all(quizPromises);
      questionArrays.forEach(qs => allQuestions.push(...qs));

      if (allQuestions.length === 0) {
        throw new Error('No questions found');
      }

      this.renderCategories(allQuestions);
    } catch {
      document.getElementById('categories-list').innerHTML = '<p style="color: var(--text-muted);">Failed to load categories.</p>';
      document.getElementById('categories-full-list').innerHTML = '<p style="color: var(--text-muted);">Failed to load categories.</p>';
    }
  },

  async loadQuizzesByDate() {
    try {
      const indexRes = await fetch('data/archive_index.json');
      if (!indexRes.ok) throw new Error('No archive index');
      const indexData = await indexRes.json();
      const archives = indexData.archives || [];

      const quizPromises = archives.map(async (archive) => {
        try {
          const qRes = await fetch(archive.filePath);
          if (!qRes.ok) return null;
          const qData = await qRes.json();
          return {
            date: archive.date,
            filePath: archive.filePath,
            title: qData.metadata?.title || 'Loksewa Quiz',
            totalQuestions: qData.metadata?.totalQuestions || qData.questions?.length || 0,
            source: qData.metadata?.source || 'Gorkhapatra'
          };
        } catch {
          return null;
        }
      });

      const quizzes = (await Promise.all(quizPromises)).filter(Boolean);
      this.renderQuizzesByDate(quizzes);
    } catch {
      document.getElementById('quizzes-by-date').innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 20px;">No quizzes available yet.</p>';
    }
  },

  renderQuizzesByDate(quizzes) {
    const container = document.getElementById('quizzes-by-date');
    if (!quizzes.length) {
      container.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 20px;">No quizzes available yet.</p>';
      return;
    }

    container.innerHTML = quizzes.map((q, idx) => `
      <div class="quiz-date-card" onclick="app.startQuizFromArchive('${q.filePath}')">
        <div class="quiz-date-card-header">
          <span class="quiz-date-badge">${idx + 1}</span>
          <div class="quiz-date-card-info">
            <h4 class="quiz-date-card-title">${Utils.escapeHtml(q.title)}</h4>
            <span class="quiz-date-card-meta">📅 ${Utils.escapeHtml(q.date)} | 📰 ${Utils.escapeHtml(q.source)} | ❓ ${q.totalQuestions} questions</span>
          </div>
        </div>
        <button class="btn btn-primary btn-sm">Start Quiz</button>
      </div>
    `).join('');
  },

  renderCategories(questions) {
    const categoryMap = {};
    const categoryIcons = {
      'Economy': '💰',
      'International Affairs': '🌍',
      'Science & Technology': '🔬',
      'National Affairs': '🇳🇵',
      'General': '📚',
      'Politics': '🏛️',
      'History': '📜',
      'Geography': '🗺️',
      'Sports': '⚽',
      'Culture': '🎭'
    };

    questions.forEach(q => {
      const cat = q.category || 'General';
      if (!categoryMap[cat]) categoryMap[cat] = 0;
      categoryMap[cat]++;
    });

    const createCard = (name, count) => {
      const icon = categoryIcons[name] || '📁';
      return `
        <div class="category-card" onclick="app.startCategoryQuiz('${Utils.escapeHtml(name)}')">
          <span class="category-icon">${icon}</span>
          <div class="category-info">
            <span class="category-name">${Utils.escapeHtml(name)}</span>
            <span class="category-count">${count} questions</span>
          </div>
        </div>
      `;
    };

    const html = Object.entries(categoryMap).map(([name, count]) => createCard(name, count)).join('');
    document.getElementById('categories-list').innerHTML = html || '<p style="color: var(--text-muted);">No categories found.</p>';
    document.getElementById('categories-full-list').innerHTML = html || '<p style="color: var(--text-muted);">No categories found.</p>';
  },

  loadHistory() {
    const results = Storage.getResults();
    const container = document.getElementById('history-list');

    if (results.length === 0) {
      container.innerHTML = '<div class="empty-state"><p>No exam history yet.</p></div>';
      return;
    }

    container.innerHTML = results.slice(0, 10).map(r => `
      <div class="history-item">
        <div class="history-info">
          <span class="history-title">${Utils.escapeHtml(r.title)}</span>
          <span class="history-meta">${new Date(r.date).toLocaleDateString('en-US')}</span>
        </div>
        <span class="history-score">${r.score}/${r.total}</span>
      </div>
    `).join('');
  },

  loadBookmarks() {
    const bookmarks = Storage.getBookmarks();
    const container = document.getElementById('bookmarks-list');

    if (bookmarks.length === 0) {
      container.innerHTML = '<div class="empty-state"><p>No bookmarks yet. Bookmark questions during the quiz to see them here.</p></div>';
      return;
    }

    container.innerHTML = bookmarks.map((b, idx) => `
      <div class="review-item">
        <div class="review-question">${idx + 1}. ${Utils.escapeHtml(b.question)}</div>
        <div class="review-options">
          ${b.options.map((opt, optIdx) => {
            let cls = 'review-option';
            if (optIdx === b.correctAnswer) cls += ' correct';
            return `<div class="${cls}">${Utils.escapeHtml(opt)}</div>`;
          }).join('')}
        </div>
        ${b.explanation ? `<div class="review-explanation"><strong>Explanation:</strong> ${Utils.escapeHtml(b.explanation)}</div>` : ''}
        ${b.studyPoint ? `<div class="review-study"><strong>Study Point:</strong>${Utils.escapeHtml(b.studyPoint)}</div>` : ''}
      </div>
    `).join('');
  }
};
