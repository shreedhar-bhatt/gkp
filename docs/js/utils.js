const Utils = {
  formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  },

  shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  },

  getGrade(percentage) {
    if (percentage >= 90) return { text: 'Outstanding!', emoji: '🏆' };
    if (percentage >= 75) return { text: 'Excellent!', emoji: '🌟' };
    if (percentage >= 60) return { text: 'Good progress!', emoji: '👍' };
    if (percentage >= 40) return { text: 'Keep practicing', emoji: '📚' };
    return { text: 'Keep trying!', emoji: '💪' };
  },

  getMotivationQuote(percentage) {
    if (percentage >= 90) return "🏆 You are a champion! Keep aiming higher!";
    if (percentage >= 75) return "🌟 Excellent work! You are almost there!";
    if (percentage >= 60) return "👍 Good job! A little more practice and you'll ace it!";
    if (percentage >= 40) return "📚 Don't give up! Every mistake is a lesson.";
    return "💪 Failure is the stepping stone to success. Try again!";
  },

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};
