export function initRouter() {
  window.YFM.pages = {
    login: () => import('./modules/auth/login.js'),
    dashboard: () => import('./modules/team/dashboard.js'),
    roster: () => import('./modules/team/roster.js'),
    calendar: () => import('./modules/team/calendar.js'),
    training: () => import('./modules/coach/training.js'),
    stats: () => import('./modules/performance/stats.js'),
    reports: () => import('./modules/performance/reports.js'),
    settings: () => import('./modules/club/settings.js')
  };

  // Auth helper functions
  window.YFM.isAuthenticated = function() {
    const token = localStorage.getItem('yfm_token');
    if (!token) return false;
    // Check se token è scaduto (opzionale)
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp && payload.exp < Date.now() / 1000) {
      window.YFM.logout();
      return false;
    }
    return true;
  };

  window.YFM.getUser = function() {
    const userStr = localStorage.getItem('yfm_user');
    return userStr ? JSON.parse(userStr) : null;
  };

  window.YFM.setUser = function(user) {
    localStorage.setItem('yfm_user', JSON.stringify(user));
    window.YFM.updateUserUI();
  };

  window.YFM.logout = function() {
    localStorage.removeItem('yfm_token');
    localStorage.removeItem('yfm_user');
    window.YFM.updateUserUI();
    window.YFM.navigateTo('login');
  };

  window.YFM.updateUserUI = function() {
    const user = window.YFM.getUser();
    const userNameEl = document.getElementById('userName');
    const userRoleEl = document.getElementById('userRole');
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (user && userNameEl) {
      userNameEl.textContent = user.nome;
      userNameEl.style.display = 'inline';
    }
    if (user && userRoleEl) {
      userRoleEl.textContent = user.ruolo || '';
      userRoleEl.style.display = user.ruolo ? 'inline' : 'none';
    }
    if (logoutBtn) {
      logoutBtn.style.display = user ? 'inline-block' : 'none';
    }
  };

  window.YFM.navigateTo = async (page) => {
    // Proteggi le route (escludi login e public pages)
    const publicPages = ['login'];
    if (!publicPages.includes(page) && !window.YFM.isAuthenticated()) {
      window.YFM.navigateTo('login');
      return;
    }

    const container = document.getElementById('pageContent');
    container.innerHTML = '<div class="loading"><div class="spinner"></div>Caricamento...</div>';
    
    window.YFM.currentPage = page;
    
    document.querySelectorAll('.sidebar-nav a').forEach(link => {
      link.classList.toggle('active', link.dataset.page === page);
    });
    
    try {
      const module = await window.YFM.pages[page]();
      if (module.default) {
        await module.default();
      }
      // Adatta il titolo per mobile dopo il render della pagina
      if (window.YFM && typeof window.YFM.adjustPageTitleForMobile === 'function') {
        window.YFM.adjustPageTitleForMobile();
      }
    } catch (error) {
      container.innerHTML = `<div class="error-box">Errore nel caricamento di ${page}: ${error.message}</div>`;
    }
  };
}
