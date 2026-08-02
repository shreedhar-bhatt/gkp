const quiz = {
  data: null,
  currentIndex: 0,
  answers: [],
  timer: null,
  seconds: 0,
  score: 0,
  pointsPerQuestion: 1,
  negativeMarkingPercent: 20,
  submitted: false,
  answered: new Set(),

  start(data) {
    this.data = data;
    this.currentIndex = 0;
    this.answers = new Array(data.questions.length).fill(null);
    this.seconds = 0;
    this.score = 0;
    this.submitted = false;
    this.answered = new Set();

    document.getElementById('quiz-title').textContent = data.metadata?.title || 'Loksewa Quiz';
    this.startTimer();
    this.render();
  },

  startTimer() {
    clearInterval(this.timer);
    this.timer = setInterval(() => {
      this.seconds++;
      document.getElementById('quiz-timer').textContent = Utils.formatTime(this.seconds);
    }, 1000);
  },

  stopTimer() {
    clearInterval(this.timer);
  },

  render() {
    const q = this.data.questions[this.currentIndex];
    const total = this.data.questions.length;
    const isAnswered = this.answered.has(this.currentIndex);

    document.getElementById('question-counter').textContent = this.submitted
      ? `Review ${this.currentIndex + 1}/${total}`
      : `Question ${this.currentIndex + 1}/${total}`;
    document.getElementById('score-display').textContent = `Score: ${this.score}`;
    document.getElementById('progress-fill').style.width = `${((this.currentIndex + 1) / total) * 100}%`;

    document.getElementById('question-category').textContent = q.category || 'General';
    document.getElementById('question-difficulty').textContent = q.difficulty || 'Medium';
    document.getElementById('question-text').textContent = q.question;

    const grid = document.getElementById('options-grid');
    grid.innerHTML = '';

    const markers = ['A', 'B', 'C', 'D'];
    q.options.forEach((opt, idx) => {
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      
      if (this.submitted || isAnswered) {
        if (idx === q.correctAnswer) {
          btn.classList.add('correct');
        } else if (idx === this.answers[this.currentIndex] && idx !== q.correctAnswer) {
          btn.classList.add('wrong');
        }
        btn.disabled = true;
      } else {
        if (this.answers[this.currentIndex] === idx) btn.classList.add('selected');
        btn.addEventListener('click', () => this.selectOption(idx));
      }
      
      btn.innerHTML = `
        <span class="option-marker">${markers[idx]}</span>
        <span class="option-text">${Utils.escapeHtml(opt)}</span>
      `;
      grid.appendChild(btn);
    });

    const card = document.querySelector('.question-card');
    let extra = card.querySelector('.feedback-area');
    if (!extra) {
      extra = document.createElement('div');
      extra.className = 'feedback-area';
      card.appendChild(extra);
    }
    extra.innerHTML = '';

    if (this.submitted || isAnswered) {
      if (q.explanation) {
        extra.innerHTML += `<div class="explanation-box"><strong>Explanation:</strong> ${Utils.escapeHtml(q.explanation)}</div>`;
      }
      if (q.studyPoint) {
        extra.innerHTML += `<div class="study-point-box"><strong>Study Point:</strong>${Utils.escapeHtml(q.studyPoint)}</div>`;
      }
    }

    let bookmarkBtn = card.querySelector('.bookmark-btn');
    if (!bookmarkBtn) {
      bookmarkBtn = document.createElement('button');
      bookmarkBtn.className = 'bookmark-btn';
      bookmarkBtn.onclick = () => this.toggleBookmark(q);
      card.querySelector('.question-meta').appendChild(bookmarkBtn);
    }
    const isBookmarked = Storage.isBookmarked(q.question);
    bookmarkBtn.classList.toggle('active', isBookmarked);
    bookmarkBtn.innerHTML = isBookmarked ? '🔖 Bookmarked' : '🔖 Bookmark';

    document.getElementById('btn-prev').disabled = this.currentIndex === 0;
    
    if (this.submitted) {
      document.getElementById('btn-next').classList.add('hidden');
      document.getElementById('btn-submit').classList.add('hidden');
      const finishBtn = document.getElementById('btn-finish');
      if (finishBtn) finishBtn.classList.remove('hidden');
    } else {
      document.getElementById('btn-next').classList.toggle('hidden', this.currentIndex === total - 1);
      document.getElementById('btn-submit').classList.toggle('hidden', this.currentIndex !== total - 1);
      
      if (isAnswered && this.currentIndex < total - 1) {
        document.getElementById('btn-next').classList.remove('hidden');
        document.getElementById('btn-submit').classList.add('hidden');
      }
      
      if (isAnswered && this.currentIndex === total - 1) {
        document.getElementById('btn-next').classList.add('hidden');
        document.getElementById('btn-submit').classList.remove('hidden');
      }
    }
  },

  toggleBookmark(q) {
    const bookmarks = Storage.toggleBookmark(q);
    const isBookmarked = Storage.isBookmarked(q.question);
    const bookmarkBtn = document.querySelector('.question-card .bookmark-btn');
    if (bookmarkBtn) {
      bookmarkBtn.classList.toggle('active', isBookmarked);
      bookmarkBtn.innerHTML = isBookmarked ? '🔖 Bookmarked' : '🔖 Bookmark';
    }
  },

  selectOption(idx) {
    if (this.answered.has(this.currentIndex) || this.submitted) return;
    
    this.answers[this.currentIndex] = idx;
    this.answered.add(this.currentIndex);

    const q = this.data.questions[this.currentIndex];
    if (idx === q.correctAnswer) {
      this.score += this.pointsPerQuestion;
    } else {
      const neg = (this.pointsPerQuestion * this.negativeMarkingPercent) / 100;
      this.score = Math.max(0, this.score - neg);
    }

    this.render();
  },

  nextQuestion() {
    if (this.currentIndex < this.data.questions.length - 1) {
      this.currentIndex++;
      this.render();
    }
  },

  prevQuestion() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.render();
    }
  },

  submitQuiz() {
    this.stopTimer();
    this.submitted = true;

    let correct = 0;
    let wrong = 0;
    let attempted = 0;
    this.data.questions.forEach((q, idx) => {
      if (this.answers[idx] === q.correctAnswer) {
        correct++;
        attempted++;
      } else if (this.answers[idx] !== null) {
        wrong++;
        attempted++;
      }
    });

    const neg = (this.pointsPerQuestion * this.negativeMarkingPercent) / 100;
    this.score = Math.max(0, (correct * this.pointsPerQuestion) - (wrong * neg));
    const total = this.data.questions.length;
    const maxScore = total * this.pointsPerQuestion;
    const percentage = Math.round((this.score / maxScore) * 100);

    const result = {
      id: Date.now(),
      date: new Date().toISOString(),
      title: this.data.metadata?.title || 'Loksewa Quiz',
      score: correct,
      wrong: wrong,
      attempted: attempted,
      total: total,
      percentage: percentage,
      time: this.seconds,
      points: this.score,
      quote: Utils.getMotivationQuote(percentage)
    };

    Storage.saveResult(result);
    
    const quizSession = {
      resultId: result.id,
      data: this.data,
      answers: this.answers
    };
    localStorage.setItem('samasamaik_current_quiz', JSON.stringify(quizSession));
    
    resultView.show(result);

    const footer = document.querySelector('.quiz-footer');
    let finishBtn = document.getElementById('btn-finish');
    if (!finishBtn) {
      finishBtn = document.createElement('button');
      finishBtn.id = 'btn-finish';
      finishBtn.className = 'btn btn-success';
      finishBtn.textContent = 'View Result';
      finishBtn.onclick = () => app.showView('result');
      footer.appendChild(finishBtn);
    }
    finishBtn.classList.remove('hidden');

    this.render();
  }
};
