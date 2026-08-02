const resultView = {
  currentResult: null,

  show(result) {
    this.currentResult = result;
    try {
      this.quizData = (typeof quiz !== 'undefined' && quiz.data) ? quiz.data : null;
      if (!this.quizData && typeof app !== 'undefined' && app.currentData) {
        this.quizData = app.currentData;
      }
      if (!this.quizData) {
        const session = JSON.parse(localStorage.getItem('samasamaik_current_quiz'));
        if (session && session.data) {
          this.quizData = session.data;
        }
      }
    } catch {
      this.quizData = null;
    }
    document.getElementById('result-score').textContent = result.score;
    document.getElementById('result-total').textContent = result.total;
    document.getElementById('result-percentage').textContent = `${result.percentage}%`;
    document.getElementById('result-time').textContent = Utils.formatTime(result.time);
    document.getElementById('result-accuracy').textContent = `${result.percentage}%`;
    document.getElementById('result-points').textContent = `${result.points} pts`;
    document.getElementById('result-attempted').textContent = result.attempted || 0;
    document.getElementById('result-wrong').textContent = result.wrong || 0;

    const grade = Utils.getGrade(result.percentage);
    document.getElementById('result-message').textContent = `${grade.emoji} ${grade.text}`;
    document.getElementById('result-quote').textContent = result.quote || '';

    document.getElementById('review-section').classList.add('hidden');
    document.getElementById('review-section').innerHTML = '';
  },

  downloadPDF() {
    if (!this.currentResult) {
      alert('No result available. Please complete a quiz first.');
      return;
    }

    const result = this.currentResult;
    const data = this.quizData;
    
    if (!data) {
      alert('Quiz data not available. Please try again or refresh the page.');
      return;
    }

    const title = data.metadata?.title || 'Quiz';
    const questions = data.questions || [];
    const date = new Date().toLocaleString();

    let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${Utils.escapeHtml(title)} - Result</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #1e293b; line-height: 1.6; }
    h1 { color: #2563eb; border-bottom: 3px solid #2563eb; padding-bottom: 10px; }
    .header { text-align: center; margin-bottom: 30px; }
    .header h1 { border: none; font-size: 24px; }
    .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin: 20px 0; }
    .stat-box { background: #f8fafc; padding: 16px; border-radius: 8px; text-align: center; border: 1px solid #e2e8f0; }
    .stat-value { font-size: 28px; font-weight: 800; color: #2563eb; }
    .stat-label { font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
    .question { margin-bottom: 24px; padding: 20px; border-left: 4px solid #e2e8f0; background: #f8fafc; border-radius: 8px; }
    .question.correct { border-left-color: #16a34a; }
    .question.wrong { border-left-color: #dc2626; }
    .question.unanswered { border-left-color: #d97706; }
    .q-text { font-weight: 700; font-size: 16px; margin-bottom: 12px; }
    .options { margin: 12px 0; }
    .option { padding: 8px 12px; margin: 4px 0; border-radius: 6px; background: #fff; border: 1px solid #e2e8f0; }
    .option.correct { background: #dcfce7; border-color: #16a34a; font-weight: 600; }
    .option.wrong { background: #fee2e2; border-color: #dc2626; font-weight: 600; }
    .explanation { background: #f0f9ff; padding: 12px; border-left: 3px solid #2563eb; margin-top: 12px; border-radius: 6px; font-size: 14px; }
    .study-point { background: #fffbeb; padding: 12px; border-left: 3px solid #d97706; margin-top: 8px; border-radius: 6px; font-size: 14px; }
    .label { font-weight: 700; color: #2563eb; }
    .footer { text-align: center; margin-top: 40px; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 20px; }
    @media print { body { padding: 20px; } .question { page-break-inside: avoid; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>समसामायिक - Quiz Result</h1>
    <p>${Utils.escapeHtml(title)}</p>
    <p>Generated: ${date}</p>
  </div>

  <div class="stats">
    <div class="stat-box">
      <div class="stat-value">${result.score}/${result.total}</div>
      <div class="stat-label">Score</div>
    </div>
    <div class="stat-box">
      <div class="stat-value">${result.percentage}%</div>
      <div class="stat-label">Accuracy</div>
    </div>
    <div class="stat-box">
      <div class="stat-value">${result.points}</div>
      <div class="stat-label">Points</div>
    </div>
  </div>

  <div class="stats">
    <div class="stat-box">
      <div class="stat-value">${result.attempted || 0}</div>
      <div class="stat-label">Attempted</div>
    </div>
    <div class="stat-box">
      <div class="stat-value">${result.wrong || 0}</div>
      <div class="stat-label">Wrong</div>
    </div>
    <div class="stat-box">
      <div class="stat-value">${Utils.formatTime(result.time)}</div>
      <div class="stat-label">Time</div>
    </div>
  </div>

  <h2>Answer Review</h2>`;

    data.questions.forEach((q, idx) => {
      let userAnswer = null;
      try {
        const session = JSON.parse(localStorage.getItem('samasamaik_current_quiz'));
        if (session && session.answers) {
          userAnswer = session.answers[idx];
        }
      } catch {
        // ignore
      }
      if (userAnswer === null && typeof quiz !== 'undefined' && quiz.answers) {
        userAnswer = quiz.answers[idx];
      }
      const isCorrect = userAnswer === q.correctAnswer;
      const isUnanswered = userAnswer === null;
      const statusClass = isCorrect ? 'correct' : isUnanswered ? 'unanswered' : 'wrong';

      let optionsHtml = '';
      q.options.forEach((opt, optIdx) => {
        let cls = 'option';
        if (optIdx === q.correctAnswer) cls += ' correct';
        else if (optIdx === userAnswer && !isCorrect) cls += ' wrong';
        optionsHtml += `<div class="${cls}">${Utils.escapeHtml(opt)} ${optIdx === q.correctAnswer ? '✓' : ''} ${optIdx === userAnswer && !isCorrect ? '✗' : ''}</div>`;
      });

      html += `
    <div class="question ${statusClass}">
      <div class="q-text">${idx + 1}. ${Utils.escapeHtml(q.question)}</div>
      <div class="options">${optionsHtml}</div>
      ${q.explanation ? `<div class="explanation"><span class="label">Explanation:</span> ${Utils.escapeHtml(q.explanation)}</div>` : ''}
      ${q.studyPoint ? `<div class="study-point"><span class="label">Study Point:</span> ${Utils.escapeHtml(q.studyPoint)}</div>` : ''}
    </div>`;
    });

    html += `
  <div class="footer">
    <p>समसामायिक Loksewa Quiz &copy; 2083 | Generated on ${date}</p>
  </div>
</body>
</html>`;

    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      setTimeout(() => {
        win.print();
      }, 500);
    } else {
      alert('Please allow popups to download the PDF.');
    }
  },

  reviewAnswers() {
    if (!this.currentResult || !quiz.data) return;
    const section = document.getElementById('review-section');
    section.classList.remove('hidden');
    section.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'review-header';
    header.innerHTML = `
      <h3 class="review-title">Answer Review</h3>
      <button class="btn btn-secondary btn-sm" onclick="document.getElementById('review-section').classList.add('hidden')">Close</button>
    `;
    section.appendChild(header);

    quiz.data.questions.forEach((q, idx) => {
      const userAnswer = quiz.answers[idx];
      const isCorrect = userAnswer === q.correctAnswer;
      const isUnanswered = userAnswer === null;

      const item = document.createElement('div');
      item.className = `review-item ${isCorrect ? 'correct' : isUnanswered ? 'unanswered' : 'wrong'}`;

      let optionsHtml = '';
      q.options.forEach((opt, optIdx) => {
        let cls = 'review-option';
        if (optIdx === q.correctAnswer) cls += ' correct';
        else if (optIdx === userAnswer && !isCorrect) cls += ' wrong';
        else if (optIdx === userAnswer && isCorrect) cls += ' correct';

        optionsHtml += `<div class="${cls}">${Utils.escapeHtml(opt)}</div>`;
      });

      item.innerHTML = `
        <div class="review-question">${idx + 1}. ${Utils.escapeHtml(q.question)}</div>
        <div class="review-options">${optionsHtml}</div>
        ${q.explanation ? `<div class="review-explanation"><strong>Explanation:</strong> ${Utils.escapeHtml(q.explanation)}</div>` : ''}
        ${q.studyPoint ? `<div class="review-study"><strong>Study Point:</strong>${Utils.escapeHtml(q.studyPoint)}</div>` : ''}
      `;

      section.appendChild(item);
    });
  }
};
