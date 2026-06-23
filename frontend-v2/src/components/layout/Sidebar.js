export function setupLayout() {
  // Recupera info utente da localStorage
  const userStr = localStorage.getItem('yfm_user');
  const user = userStr ? JSON.parse(userStr) : null;
  const guestStr = localStorage.getItem('yfm_guest');
  const guest = guestStr ? JSON.parse(guestStr) : null;
  
  const isGuest = !!guest;
  const currentUser = user;
  const userInitial = currentUser?.nome ? currentUser.nome[0].toUpperCase() : isGuest ? (guest.tipo === 'atleta' ? 'A' : 'G') : 'U';
  const userName = currentUser?.nome || (isGuest ? (guest.tipo === 'atleta' ? 'Atleta' : 'Genitore') : '');
  const userRole = currentUser?.ruolo || (isGuest ? guest.tipo : '');
  const userRoleLabel = userRole === 'admin' ? 'Amministratore' : userRole === 'staff' ? 'Staff' : userRole === 'allenatore' ? 'Allenatore' : userRole === 'atleta' ? 'Atleta' : userRole === 'genitore' ? 'Genitore' : userRole;

  // Helper per verificare se mostrare sezione in base al ruolo
  const showForRole = (roles) => {
    if (isGuest) return false; // Guest non vede sidebar normale
    if (!currentUser) return false;
    if (currentUser.is_superadmin === true) return true;
    if (typeof roles === 'string') roles = [roles];
    return roles.includes(currentUser.ruolo);
  };

  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="layout">
      <aside class="sidebar" id="sidebar">
        <div class="sidebar-logo">
          <div class="sidebar-logo-icon">Y</div>
          <span class="sidebar-logo-text">YFM</span>
        </div>
        <div class="sidebar-info">
          <div class="sidebar-info-label">Workspace</div>
          <div class="sidebar-info-workspace" id="workspaceName">Caricamento...</div>
          <div class="sidebar-info-season" id="seasonName">Stagione 2025/26</div>
        </div>
        <nav class="sidebar-nav">
          <a href="#" class="active" data-page="dashboard">📊 Dashboard</a>
          
          <!-- Sezione Club -->
          ${showForRole(['admin']) ? `
          <div class="sidebar-section-title">🏢 Club</div>
          <a href="#" data-page="settings">⚙️ Impostazioni</a>
          ` : ''}
          
          <!-- Sezione Team -->
          <div class="sidebar-section-title">👥 Team</div>
          <a href="#" data-page="roster">👥 Rosa</a>
          <a href="#" data-page="calendar">📅 Calendario</a>
          
          <!-- Sezione Coach -->
          <div class="sidebar-section-title">🎯 Coach</div>
          <a href="#" data-page="training">🏃 Allenamenti</a>
          ${showForRole(['admin', 'allenatore', 'staff']) ? `
          <a href="#" data-page="convocazioni" style="display:none;">👥 Convocazioni</a>
          ` : ''}
          
          <!-- Sezione Performance -->
          <div class="sidebar-section-title">📈 Performance</div>
          <a href="#" data-page="stats">📊 Statistiche</a>
          <a href="#" data-page="reports">📄 Report</a>
          
          <!-- Sezione Admin (solo admin) -->
          ${showForRole(['admin']) ? `
          <div class="sidebar-section-title">🔐 Amministrazione</div>
          <a href="#" data-page="users">👥 Utenti</a>
          <a href="#" data-page="guestLinks">🔗 Link Guest</a>
          ` : ''}
        </nav>
        <div class="sidebar-user">
          <div class="sidebar-user-avatar">${userInitial}</div>
          <div>
            <div class="sidebar-user-name" id="userName">${userName}</div>
            <div class="sidebar-user-role" id="userRole">${userRoleLabel}</div>
          </div>
          <button id="logoutBtn" class="btn btn-secondary btn-small" style="margin-left:auto;display:${(currentUser || guest) ? 'inline-block' : 'none'};">Logout</button>
        </div>
      </aside>
      <div class="main">
        <header class="header">
          <button id="menuBtn">☰</button>
          <img id="headerLogo" src="" style="width:32px;height:32px;border-radius:8px;object-fit:cover;display:none;cursor:pointer;" onclick="updateLogo()" title="Clicca per cambiare logo">
          <span id="headerSocName" style="font-weight:600;color:var(--blue);font-size:15px;margin-left:8px;margin-right:auto;"></span>
          <div class="header-right">
            <select class="header-select" id="squadraSelect"><option>Caricamento...</option></select>
            <button id="headerLogoutBtn" onclick="window.YFM.handleLogout()" style="background:#E74C3C;color:white;border:none;padding:8px 16px;border-radius:8px;cursor:pointer;margin-left:12px;font-weight:500;display:${(currentUser || guest) ? 'inline-block' : 'none'};">🚪 Logout</button>
            <div class="player-avatar" style="width:36px;height:36px;font-size:14px;">${userInitial}</div>
          </div>
        </header>
        <div class="content" id="pageContent">
          <div class="loading"><div class="spinner"></div>Caricamento...</div>
        </div>
      </div>
    </div>
  `;

  const sidebar = document.getElementById('sidebar');
  const menuBtn = document.getElementById('menuBtn');

  // Navigazione dal menu laterale
  document.querySelectorAll('.sidebar-nav a').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      if (window.YFM && typeof window.YFM.navigateTo === 'function') {
        window.YFM.navigateTo(link.dataset.page);
      }
      // Su mobile chiudi la sidebar dopo il click
      if (window.innerWidth <= 768 && sidebar) {
        sidebar.classList.remove('open');
        document.body.classList.remove('sidebar-open');
      }
    });
  });

  // Toggle sidebar su mobile tramite hamburger
  if (menuBtn && sidebar) {
    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = sidebar.classList.toggle('open');
      if (isOpen) {
        document.body.classList.add('sidebar-open');
      } else {
        document.body.classList.remove('sidebar-open');
      }
    });
  }

  // Chiudi sidebar cliccando fuori (solo mobile)
  document.addEventListener('click', (e) => {
    if (!sidebar || window.innerWidth > 768) return;
    if (!sidebar.classList.contains('open')) return;

    const target = e.target;
    if (sidebar.contains(target) || (menuBtn && menuBtn.contains(target))) {
      return;
    }

    sidebar.classList.remove('open');
    document.body.classList.remove('sidebar-open');
  });
}
