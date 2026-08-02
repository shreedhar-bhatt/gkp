const Storage = {
  KEY_USERS: 'samasamaik_users',
  KEY_SESSION: 'samasamaik_session',
  KEY_RESULTS: 'loksewa_quiz_results',
  KEY_BOOKMARKS: 'loksewa_quiz_bookmarks',

  getCurrentUser() {
    try {
      const session = localStorage.getItem(this.KEY_SESSION);
      return session ? JSON.parse(session) : null;
    } catch {
      return null;
    }
  },

  getUserKey(baseKey) {
    const user = this.getCurrentUser();
    if (user && user.username) {
      return `${baseKey}_${user.username}`;
    }
    return baseKey;
  },

  getUsers() {
    try {
      const data = localStorage.getItem(this.KEY_USERS);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  },

  saveUser(username, password) {
    const users = this.getUsers();
    users[username] = { password, createdAt: new Date().toISOString() };
    localStorage.setItem(this.KEY_USERS, JSON.stringify(users));
  },

  validateUser(username, password) {
    const users = this.getUsers();
    return users[username] && users[username].password === password;
  },

  userExists(username) {
    const users = this.getUsers();
    return !!users[username];
  },

  login(username, password) {
    if (this.validateUser(username, password)) {
      const session = { username, loginTime: new Date().toISOString() };
      localStorage.setItem(this.KEY_SESSION, JSON.stringify(session));
      return true;
    }
    return false;
  },

  logout() {
    localStorage.removeItem(this.KEY_SESSION);
  },

  isLoggedIn() {
    return !!this.getCurrentUser();
  },

  getResults() {
    try {
      const key = this.getUserKey(this.KEY_RESULTS);
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveResult(result) {
    const results = this.getResults();
    results.unshift(result);
    if (results.length > 50) results.pop();
    const key = this.getUserKey(this.KEY_RESULTS);
    localStorage.setItem(key, JSON.stringify(results));
  },

  clearResults() {
    const key = this.getUserKey(this.KEY_RESULTS);
    localStorage.removeItem(key);
  },

  getStats() {
    const results = this.getResults();
    if (results.length === 0) return null;
    const totalScore = results.reduce((sum, r) => sum + r.score, 0);
    const totalQuestions = results.reduce((sum, r) => sum + r.total, 0);
    return {
      attempts: results.length,
      avgScore: Math.round((totalScore / totalQuestions) * 100),
      bestScore: Math.max(...results.map(r => Math.round((r.score / r.total) * 100)))
    };
  },

  getBookmarks() {
    try {
      const key = this.getUserKey(this.KEY_BOOKMARKS);
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  toggleBookmark(question) {
    const bookmarks = this.getBookmarks();
    const idx = bookmarks.findIndex(b => b.question === question.question);
    if (idx >= 0) {
      bookmarks.splice(idx, 1);
    } else {
      bookmarks.push({
        question: question.question,
        options: question.options,
        correctAnswer: question.correctAnswer,
        explanation: question.explanation,
        studyPoint: question.studyPoint,
        category: question.category,
        difficulty: question.difficulty
      });
    }
    const key = this.getUserKey(this.KEY_BOOKMARKS);
    localStorage.setItem(key, JSON.stringify(bookmarks));
    return bookmarks;
  },

  isBookmarked(questionText) {
    const bookmarks = this.getBookmarks();
    return bookmarks.some(b => b.question === questionText);
  },

  getSubscribers() {
    try {
      const data = localStorage.getItem('samasamaik_subscribers');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  addSubscriber(email) {
    const subscribers = this.getSubscribers();
    if (!subscribers.find(s => s.email === email)) {
      subscribers.push({
        email,
        subscribedAt: new Date().toISOString(),
        active: true
      });
      localStorage.setItem('samasamaik_subscribers', JSON.stringify(subscribers));
      return true;
    }
    return false;
  },

  isSubscribed(email) {
    const subscribers = this.getSubscribers();
    return subscribers.some(s => s.email === email && s.active);
  },

  incrementVisitorCount() {
    const count = parseInt(localStorage.getItem('samasamaik_visitors') || '0', 10);
    const newCount = count + 1;
    localStorage.setItem('samasamaik_visitors', newCount.toString());
    return newCount;
  },

  getVisitorCount() {
    return parseInt(localStorage.getItem('samasamaik_visitors') || '0', 10);
  }
};
