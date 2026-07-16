export function initRouter() {
  window.YFM.pages = {
    login: () => import('./modules/auth/login.js'),
    guest: () => import('./modules/auth/guest.js'),
    guestAtleta: () => import('./modules/auth/guestAtleta.js'),
    guestGenitore: () => import('./modules/auth/guestGenitore.js'),
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
    notifications: () => import('./modules/coach/notifications.js'),
    stats: () => import('./modules/performance/stats.js'),
    reports: () => import('./modules/performance/reports.js'),
    settings: () => import('./modules/club/settings.js'),
    club: () => import('./modules/club/club.js'),
    absence: () => import('./modules/auth/absence.js'),
    seasonsCategories: () => import('./modules/club/seasonsCategories.js'),
    staff: () => import('./modules/club/staff.js'),
    importCenter: () => import('./modules/import/importCenter.js'),
    workspaces: () => import('./modules/admin/workspaces.js'),
    tournaments: () => import('./modules/coach/tournaments.js'),
    matchCenter: () => import('./modules/team/matchCenter.js'),
    printCenter: () => import('./modules/team/printCenter.js'),
    printConvocazione: () => import('./modules/print/printConvocazione.js'),
    printDistinta: () => import('./modules/print/printDistinta.js'),
    printFormazione: () => import('./modules/print/printFormazione.js'),
    printReport: () => import('./modules/print/printReport.js'),
    printPresenze: () => import('./modules/print/printPresenze.js'),
    printRosa: () => import('./modules/print/printRosa.js'),
    printScadenze: () => import('./modules/print/printScadenzeMediche.js'),
    fees: () => import('./modules/club/fees.js'),
    kit: () => import('./modules/club/kit.js'),
    checklist: () => import('./modules/club/checklist.js'),
    registration: () => import('./modules/club/registration.js'),
    'print-tesseramento': () => import('./modules/print/printTesseramento.js')
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
    return !!sessionStorage.getItem('yfm_guest');
  };

  window.YFM.isAdmin = function() {
    const user = window.YFM.getUser();
    if (!user) return false;
    return user.is_superadmin === true || user.ruolo === 'admin';
  };

  window.YFM.isSuperAdmin = function() {
    const user = window.YFM.getUser();
    return !!(user && user.is_superadmin === true);
  };

  window.YFM.canWrite = function(modulo) {
    const user = window.YFM.getUser();
    if (!user) return false;
    if (user.is_superadmin === true || user.ruolo === 'admin') return true;
    if (user.ruolo === 'allenatore') {
      // Allenatore: usa capabilities del profilo (non tutto write)
      const p = user.permessi;
      if (!p) return true; // fallback legacy: allenatore senza permessi = tutto
      const caps = p.capabilities || p;
      if (!caps || Object.keys(caps).length === 0) return true;
      return caps[modulo] === 'write';
    }
    const p = user.permessi;
    if (!p) return false;
    const caps = p.capabilities || p;
    return caps[modulo] === 'write';
  };

  window.YFM.canRead = function(modulo) {
    const user = window.YFM.getUser();
    if (!user) return false;
    if (user.is_superadmin === true || user.ruolo === 'admin') return true;
    if (user.ruolo === 'allenatore') {
      const p = user.permessi;
      if (!p) return true;
      const caps = p.capabilities || p;
      if (!caps || Object.keys(caps).length === 0) return true;
      return caps[modulo] === 'read' || caps[modulo] === 'write';
    }
    const p = user.permessi;
    if (!p) return false;
    const caps = p.capabilities || p;
    return caps[modulo] === 'read' || caps[modulo] === 'write';
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
    const guestStr = sessionStorage.getItem('yfm_guest');
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
    const guestAllowedPages = ['dashboard', 'calendar', 'stats', 'club', 'absence', 'matchCenter', 'guestAtleta', 'guestGenitore', 'print-tesseramento'];
    
    if (!publicPages.includes(page)) {
      const isGuest = window.YFM.isGuest();
      const isAuthenticated = window.YFM.isAuthenticated();
      
      if (!isGuest && !isAuthenticated) {
        window.YFM.navigateTo('login');
        return;
      }
      
      // Guest: blocca pagine non permesse e redirect dashboard → home
      if (isGuest) {
        if (page === 'dashboard') {
          const guestTipo = sessionStorage.getItem('guest_tipo');
          page = guestTipo === 'genitore' ? 'guestGenitore' : 'guestAtleta';
        } else if (!guestAllowedPages.includes(page)) {
          const guestTipo = sessionStorage.getItem('guest_tipo');
          page = guestTipo === 'genitore' ? 'guestGenitore' : 'guestAtleta';
        }
      }
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
      // Campanella notifiche guest
      if (window.YFM.isGuest() && document.getElementById('guestBellWrap')) {
        import('./modules/auth/guestAtleta.js').then(m => {
          if (m.updateGuestBell) m.updateGuestBell();
        }).catch(() => {});
      }
      // Help contestuale
      import('./components/PageHelp.js').then(m => m.injectPageHelp(page)).catch(() => {});
    } catch (error) {
      container.innerHTML = `<div class="error-box">Errore nel caricamento di ${page}: ${error.message}</div>`;
    }
  };
}
