export function initRouter() {
  window.YFM.pages = {
    login: () => import('./modules/auth/login.js'),
    guest: () => import('./modules/auth/guest.js'),
    users: () => import('./modules/admin/users.js'),
    guestLinks: () => import('./modules/admin/guestLinks.js'),
    dashboard: () => import('./modules/team/dashboard.js'),
    roster: () => import('./modules/team/roster.js'),
    calendar: () => import('./modules/team/calendar.js'),
    matchDetail: () => import('./modules/team/matchDetail.js'),
    convocazioni: () => import('./modules/team/convocazioni.js'),
    formazione: () => import('./modules/team/formazione.js'),
    formation: () => import('./modules/team/formazione.js'),
    playerDetail: () => import('./modules/team/playerDetail.js'),
    training: () => import('./modules/coach/trainingSessions.js'),
    trainingSessions: () => import('./modules/coach/trainingSessions.js'),
    trainingPresenze: () => import('./modules/coach/trainingPresenze.js'),
    trainingSettings: () => import('./modules/coach/trainingSettings.js'),
    stats: () => import('./modules/performance/stats.js'),
    reports: () => import('./modules/performance/reports.js'),
    settings: () => import('./modules/club/settings.js')
  };

  window.YFM.isAuthenticated = function() {
    const token = localStorage.getItem('yfm_token');
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp && payload.exp < Date.now() / 1000) {
        window.YFM.logout();
        return false;
      }
      return true;
    } catch {
      return false;
    }
  };

  window.YFM.isGuest = function() {
    return !!localStorage.getItem('yfm_guest') && !localStorage.getItem('yfm_token');
  };

  window.YFM.isAdmin = function() {
    const user = window.YFM.getUser();
    if (!user) return false;
    return user.is_superadmin === true || user.ruolo === 'admin';
  };

  window.YFM.hasRole = function(role) {
    const user = window.YFM.getUser();
    if (!user) return false;
    if (user.is_superadmin === true) return true;
    return user.ruolo === role || (user.ruoli && user.ruoli.includes(role));
  };

  window.YFM.hasAccessToSquadra = function(squadraId) {
    const user = window.YFM.getUser();
    if (!user) return false;
    if (user.is_superadmin === true) return true;
    if (user.ruolo === 'admin') return true;
    if (user.squadre_accesso && user.squadre_accesso.includes(squadraId)) return true;
    return false;
  };

  window.YFM.getUser = function() {
    const userStr = localStorage.getItem('yfm_user');
    return userStr ? JSON.parse(userStr) : null;
  };

  window.YFM.getGuestData = function() {
    const guestStr = localStorage.getItem('yfm_guest');
    return guestStr ? JSON.parse(guestStr) : null;
  };

  window.YFM.setUser = function(user) {
    localStorage.setItem('yfm_user', JSON.stringify(user));
    window.YFM.updateUserUI();
  };

  window.YFM.updateUserUI = function() {
    const user = window.YFM.getUser();
    const guest = window.YFM.getGuestData();
    const userNameEl = document.getElementById('userName');
    const userRoleEl = document.getElementById('userRole');
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (user && userNameEl) {
      userNameEl.textContent = user.nome;
      userNameEl.style.display = 'inline';
    } else if (guest && userNameEl) {
      userNameEl.textContent = guest.tipo === 'atleta' ? 'Atleta' : 'Genitore';
      userNameEl.style.display = 'inline';
    }
    
    if (user && userRoleEl) {
      userRoleEl.textContent = user.ruolo || '';
      userRoleEl.style.display = user.ruolo ? 'inline' : 'none';
    } else if (guest && userRoleEl) {
      userRoleEl.textContent = guest.tipo;
      userRoleEl.style.display = 'inline';
    }
    
    if (logoutBtn) {
      logoutBtn.style.display = (user || guest) ? 'inline-block' : 'none';
    }
  };

  window.YFM.navigateTo = async (page, params) => {
    console.log('[ROUTER] navigateTo chiamato con:', page);
    
    const publicPages = ['login', 'guest'];
    
    if (!publicPages.includes(page)) {
      const isGuest = window.YFM.isGuest();
      const isAuthenticated = window.YFM.isAuthenticated();
      
      console.log('[ROUTER] Controlli - isGuest:', isGuest, 'isAuthenticated:', isAuthenticated);
      
      if (!isGuest && !isAuthenticated) {
        console.log('[ROUTER] Redirect a login');
        window.YFM.navigateTo('login');
        return;
      }
      console.log('[ROUTER] Accesso permesso, proseguo con caricamento pagina');
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
        if (params) {
          window.YFM.pageParams = params;
        }
        await module.default();
      }
      if (window.YFM && typeof window.YFM.adjustPageTitleForMobile === 'function') {
        window.YFM.adjustPageTitleForMobile();
      }
      if (window.YFM.updateUserUI) {
        window.YFM.updateUserUI();
      }
    } catch (error) {
      container.innerHTML = `<div class="error-box">Errore nel caricamento di ${page}: ${error.message}</div>`;
    }
  };
}
