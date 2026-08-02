const app = {
  currentData: null,

  init() {
    this.updateProfileUI();
    this.updateVisitorCount();
    home.loadLatest();
    home.loadCategories();
    home.loadQuizzesByDate();

    if (this.isLoggedIn()) {
      home.loadHistory();
    }

    document.getElementById('sidebar-toggle').addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('open');
    });

    document.getElementById('theme-toggle').addEventListener('click', () => {
      document.body.classList.toggle('dark-mode');
      const isDark = document.body.classList.contains('dark-mode');
      localStorage.setItem('quizflow_theme', isDark ? 'dark' : 'light');
    });

    const savedTheme = localStorage.getItem('quizflow_theme');
    if (savedTheme === 'dark') {
      document.body.classList.add('dark-mode');
    }

    document.addEventListener('click', (e) => {
      const sidebar = document.getElementById('sidebar');
      const toggle = document.getElementById('sidebar-toggle');
      if (window.innerWidth <= 768 && sidebar.classList.contains('open') && !sidebar.contains(e.target) && !toggle.contains(e.target)) {
        sidebar.classList.remove('open');
      }
    });

    const profileBtn = document.getElementById('profile-btn');
    const profileDropdown = document.getElementById('profile-dropdown');
    
    if (profileBtn && profileDropdown) {
      profileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        profileDropdown.classList.toggle('open');
        if (profileDropdown.classList.contains('open')) {
          this.updateProfileStats();
        }
      });

      document.addEventListener('click', (e) => {
        if (!profileDropdown.contains(e.target) && e.target !== profileBtn) {
          profileDropdown.classList.remove('open');
        }
      });
    }
  },

  isLoggedIn() {
    return Storage.isLoggedIn();
  },

  getCurrentUser() {
    return Storage.getCurrentUser();
  },

  updateProfileUI() {
    const user = this.getCurrentUser();
    const profileName = document.getElementById('profile-name');
    const profileEmail = document.getElementById('profile-email');
    const loginNavItem = document.getElementById('nav-login');
    const logoutNavItem = document.getElementById('nav-logout');

    if (user) {
      if (profileName) profileName.textContent = user.username;
      if (profileEmail) profileEmail.textContent = `${user.username}@samasamaik`;
      if (loginNavItem) loginNavItem.classList.add('hidden');
      if (logoutNavItem) logoutNavItem.classList.remove('hidden');
    } else {
      if (profileName) profileName.textContent = 'Guest';
      if (profileEmail) profileEmail.textContent = 'guest@samasamaik';
      if (loginNavItem) loginNavItem.classList.remove('hidden');
      if (logoutNavItem) logoutNavItem.classList.add('hidden');
    }
  },

  switchLoginTab(tab) {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');

    if (tab === 'login') {
      loginForm.classList.remove('hidden');
      registerForm.classList.add('hidden');
      tabLogin.classList.add('active');
      tabRegister.classList.remove('active');
    } else {
      loginForm.classList.add('hidden');
      registerForm.classList.remove('hidden');
      tabLogin.classList.remove('active');
      tabRegister.classList.add('active');
    }
  },

  handleLogin(event) {
    event.preventDefault();
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;

    if (!username || !password) {
      alert('Please enter both username and password');
      return;
    }

    if (Storage.login(username, password)) {
      this.updateProfileUI();
      this.goHome();
    } else {
      alert('Invalid username or password');
    }
  },

  handleRegister(event) {
    event.preventDefault();
    const username = document.getElementById('register-username').value.trim();
    const password = document.getElementById('register-password').value;
    const confirm = document.getElementById('register-confirm').value;

    if (!username || !password) {
      alert('Please fill in all fields');
      return;
    }

    if (password !== confirm) {
      alert('Passwords do not match');
      return;
    }

    if (Storage.userExists(username)) {
      alert('Username already exists');
      return;
    }

    Storage.saveUser(username, password);
    Storage.login(username, password);
    this.updateProfileUI();
    this.goHome();
  },

  handleLogout() {
    Storage.logout();
    this.updateProfileUI();
    this.goHome();
  },

  showView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.sidebar-link').forEach(n => n.classList.remove('active'));

    const viewMap = {
      home: 'view-home',
      quiz: 'view-quiz',
      result: 'view-result',
      login: 'view-login',
      categories: 'view-categories',
      bookmarks: 'view-bookmarks',
      history: 'view-history',
      subscribers: 'view-subscribers',
      about: 'view-about'
    };
    const target = document.getElementById(viewMap[viewId] || 'view-home');
    if (target) target.classList.add('active');

    document.querySelectorAll(`.sidebar-link[data-target="${viewId}"]`).forEach(n => n.classList.add('active'));

    if (viewId === 'categories') {
      home.loadCategories();
    }
    if (viewId === 'history') {
      home.loadHistory();
    }
    if (viewId === 'bookmarks') {
      home.loadBookmarks();
    }
    if (viewId === 'subscribers') {
      this.loadSubscribers();
    }
  },

  goHome() {
    this.showView('home');
    document.getElementById('sidebar').classList.remove('open');
  },

  goLogin() {
    this.showView('login');
    document.getElementById('sidebar').classList.remove('open');
  },

  goCategories() {
    this.showView('categories');
    document.getElementById('sidebar').classList.remove('open');
  },

  goBookmarks() {
    this.showView('bookmarks');
    document.getElementById('sidebar').classList.remove('open');
  },

  goHistory() {
    this.showView('history');
    document.getElementById('sidebar').classList.remove('open');
  },

  goSubscribers() {
    this.showView('subscribers');
    this.loadSubscribers();
    document.getElementById('sidebar').classList.remove('open');
  },

  loadSubscribers() {
    const subscribers = Storage.getSubscribers();
    const container = document.getElementById('subscribers-list');

    if (subscribers.length === 0) {
      container.innerHTML = '<div class="empty-state"><p>No subscribers yet.</p></div>';
      return;
    }

    container.innerHTML = `
      <div class="subscribers-header">
        <span>Total Subscribers: <strong>${subscribers.length}</strong></span>
        <button class="btn btn-secondary btn-sm" onclick="app.exportSubscribers()">Export CSV</button>
      </div>
      <div class="subscribers-grid">
        ${subscribers.map((s, idx) => `
          <div class="subscriber-card">
            <span class="subscriber-email">${idx + 1}. ${Utils.escapeHtml(s.email)}</span>
            <span class="subscriber-date">${new Date(s.subscribedAt).toLocaleDateString('en-US')}</span>
          </div>
        `).join('')}
      </div>
    `;
  },

  exportSubscribers() {
    const subscribers = Storage.getSubscribers();
    if (subscribers.length === 0) {
      alert('No subscribers to export');
      return;
    }

    let csv = 'Email,Subscribed At\n';
    subscribers.forEach(s => {
      csv += `${s.email},${new Date(s.subscribedAt).toLocaleString()}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'subscribers.csv';
    a.click();
    URL.revokeObjectURL(url);
  },

  goAbout() {
    this.showView('about');
    document.getElementById('sidebar').classList.remove('open');
  },

  startLatestQuiz() {
    fetch('data/latest.json')
      .then(r => r.json())
      .then(data => this.startQuiz(data))
      .catch(() => alert('Failed to load quiz data.'));
  },

  startQuizFromArchive(filePath) {
    fetch(filePath)
      .then(r => r.json())
      .then(data => this.startQuiz(data))
      .catch(() => alert('Failed to load quiz data.'));
  },

  startQuiz(data) {
    this.currentData = data;
    this.showView('quiz');
    quiz.start(data);
  },

  async startCategoryQuiz(category) {
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

      const filtered = {
        metadata: { title: `${category} Quiz` },
        questions: allQuestions.filter(q => (q.category || 'General') === category)
      };

      if (filtered.questions.length === 0) {
        alert('No questions in this category.');
        return;
      }

      this.startQuiz(filtered);
    } catch {
      alert('Failed to load quiz data.');
    }
  },

  updateProfileStats() {
    const results = Storage.getResults();
    const bookmarks = Storage.getBookmarks();
    const stats = Storage.getStats();
    const subscribers = Storage.getSubscribers();
    
    document.getElementById('profile-quizzes').textContent = results.length;
    document.getElementById('profile-bookmarks').textContent = bookmarks.length;
    document.getElementById('profile-subscribers').textContent = subscribers.length;
    document.getElementById('profile-best').textContent = stats ? `${stats.bestScore}%` : '0%';
  },

  handleSubscribe(event) {
    event.preventDefault();
    const emailInput = document.getElementById('subscribe-email');
    const email = emailInput.value.trim();

    if (!email || !email.includes('@')) {
      alert('Please enter a valid email address');
      return;
    }

    if (Storage.isSubscribed(email)) {
      alert('This email is already subscribed!');
      return;
    }

    Storage.addSubscriber(email);
    emailInput.value = '';
    alert('Thank you for subscribing! You will receive quiz updates every Wednesday.');
  },

  updateVisitorCount() {
    const count = Storage.incrementVisitorCount();
    const countElement = document.getElementById('visitor-count');
    if (countElement) {
      countElement.textContent = count;
    }
  },

  getVisitorCount() {
    const count = Storage.getVisitorCount();
    const countElement = document.getElementById('visitor-count');
    if (countElement) {
      countElement.textContent = count;
    }
  }
};

document.addEventListener('DOMContentLoaded', () => app.init());
