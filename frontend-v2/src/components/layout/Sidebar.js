export function setupLayout() {
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
  
  const showForRole = (roles) => {
    if (isGuest) return false;
    if (!currentUser) return false;
    if (currentUser.is_superadmin === true) return true;
    if (typeof roles === 'string') roles = [roles];
    return roles.includes(currentUser.ruolo);
  };

  const isSuperadmin = currentUser?.is_superadmin === true;

  const app = document.getElementById('app');
  app.innerHTML = '<div class="layout"><aside class="sidebar" id="sidebar"><div class="sidebar-logo"><img src="/assets/app-icon.png" alt="YFM" class="sidebar-app-icon"><span class="sidebar-logo-text">YFM</span></div><div class="sidebar-info">' + (isSuperadmin ? '<div class="sidebar-info-label">Workspace</div><select id="workspaceSelect" class="sidebar-ws-select"><option>Caricamento...</option></select>' : '<div class="sidebar-info-label">Workspace</div><div class="sidebar-info-workspace" id="workspaceName">Caricamento...</div>') + '<div class="sidebar-info-season" id="seasonName">Stagione 2025/26</div></div><nav class="sidebar-nav"><a href="#" class="active" data-page="dashboard" title="📊 Panoramica: statistiche, prossima partita, top players">📊 Dashboard</a><div class="sidebar-section-title">👥 Team</div><a href="#" data-page="roster" title="👥 Lista giocatori, statistiche individuali, storico">👥 Rosa</a><a href="#" data-page="calendar" title="📅 Calendario partite, risultati, archiviazione">📅 Calendario</a><a href="#" data-page="importCenter" title="📥 Import Center: importa dati da fonti esterne">📥 Import Center</a><div class="sidebar-section-title">📈 Performance</div><a href="#" data-page="stats" title="📊 Marcatori, assist, discipline, statistiche">📊 Statistiche</a><a href="#" data-page="reports" title="📄 Report partita e stagionale PDF">📄 Report</a><div class="sidebar-section-title">🎯 Coach</div><a href="#" class="sidebar-expandable" id="trainingToggle" title="🏋️ Allenamenti">🏋️ Allenamenti <span style="float:right;font-size:10px;">▶</span></a><div id="trainingSubmenu" style="display:none;padding-left:12px;"><a href="#" data-page="trainingSessions" title="📋 Programma sedute">📋 Sedute</a><a href="#" data-page="trainingPresenze" title="🙋 Presenze allenamenti">🙋 Presenze</a><a href="#" data-page="trainingSettings" title="⚙️ Configurazione allenamenti">⚙️ Impostazioni</a></div>' + (showForRole(['admin', 'allenatore', 'staff']) ? '<a href="#" data-page="convocazioni" style="display:none;">👥 Convocazioni</a>' : '') + (showForRole(['admin']) ? '<div class="sidebar-section-title">🏢 Club</div><a href="#" data-page="settings" title="⚙️ Configurazione società, logo, dati club">⚙️ Impostazioni</a><a href="#" data-page="staff" title="👔 Organigramma staff societario">👔 Staff</a>' : '') + (showForRole(['admin']) ? '<div class="sidebar-section-title">🔐 Amministrazione</div>' + (isSuperadmin ? '<a href="#" data-page="workspaces" title="🏢 Gestione workspace/società">🏢 Workspace</a>' : '') + '<a href="#" data-page="users" title="👥 Gestione utenti e permessi">👥 Utenti</a>' : '') + (showForRole(['admin', 'allenatore']) ? '<a href="#" data-page="guestLinks" title="🔗 Genera e gestisci link guest temporanei">🔗 Link Guest</a>' : '') + '</nav><div class="sidebar-user" id="sidebarUser" style="cursor:pointer;display:' + ((currentUser || guest) ? 'flex' : 'none') + ';" title="Clicca per opzioni"><div class="sidebar-user-avatar" id="sidebarUserAvatar">' + userInitial + '</div><div><div class="sidebar-user-name" id="sidebarUserName">' + userName + '</div><div class="sidebar-user-role" id="sidebarUserRole">' + userRoleLabel + '</div></div></div><div class="sidebar-footer" style="padding:12px 24px;border-top:1px solid rgba(255,255,255,0.1);font-size:10px;color:rgba(255,255,255,0.4);font-family:monospace;" id="buildInfo">build: ' + (window.YFM_BUILD_ID || 'dev') + '</div></aside><div class="main"><header class="header"><button id="menuBtn">☰</button><img id="headerLogo" src="" style="width:40px;height:40px;border-radius:8px;object-fit:contain;display:none;cursor:pointer;" onclick="updateLogo()" title="Clicca per cambiare logo"><span id="headerSocName" style="font-weight:600;color:var(--blue);font-size:15px;margin-left:8px;margin-right:auto;"></span><div class="header-right"><select class="header-select" id="squadraSelect"><option>Caricamento...</option></select><div class="user-menu-container" style="position:relative;"><div class="player-avatar" id="headerUserAvatar" style="width:36px;height:36px;font-size:14px;cursor:pointer;" title="' + userName + '">' + userInitial + '</div><div class="user-dropdown" id="userDropdown" style="display:none;position:absolute;top:100%;right:0;margin-top:8px;background:white;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);min-width:160px;z-index:1000;overflow:hidden;"><div style="padding:12px 16px;border-bottom:1px solid #eee;"><div style="font-weight:600;font-size:13px;">' + userName + '</div><div style="font-size:11px;color:#888;">' + userRoleLabel + '</div></div><button onclick="window.YFM.handleLogout()" style="width:100%;padding:12px 16px;text-align:left;background:none;border:none;cursor:pointer;font-size:13px;color:#E74C3C;display:flex;align-items:center;gap:8px;">🚪 Logout</button></div></div></div></header><div class="content" id="pageContent"><div class="loading"><div class="spinner"></div>Caricamento...</div></div></div></div><style>.user-dropdown button:hover { background: #f8f8f8; }</style>';

  const sidebar = document.getElementById('sidebar');
  const menuBtn = document.getElementById('menuBtn');
  const sidebarUser = document.getElementById('sidebarUser');
  const headerUserAvatar = document.getElementById('headerUserAvatar');
  const userDropdown = document.getElementById('userDropdown');

  if (headerUserAvatar && userDropdown) {
    headerUserAvatar.addEventListener('click', (e) => {
      e.stopPropagation();
      userDropdown.style.display = userDropdown.style.display === 'none' ? 'block' : 'none';
    });
  }

  if (sidebarUser && userDropdown) {
    sidebarUser.addEventListener('click', (e) => {
      e.stopPropagation();
      userDropdown.style.display = userDropdown.style.display === 'none' ? 'block' : 'none';
    });
  }

  document.addEventListener('click', (e) => {
    if (userDropdown && userDropdown.style.display === 'block') {
      if (!e.target.closest('.user-menu-container') && !e.target.closest('#sidebarUser')) {
        userDropdown.style.display = 'none';
      }
    }
  });

  // Toggle menu espandibile Allenamenti
  const trainingToggle = document.getElementById('trainingToggle');
  const trainingSubmenu = document.getElementById('trainingSubmenu');
  if (trainingToggle && trainingSubmenu) {
    trainingToggle.addEventListener('click', (e) => {
      e.preventDefault();
      const isOpen = trainingSubmenu.style.display !== 'none';
      trainingSubmenu.style.display = isOpen ? 'none' : 'block';
      trainingToggle.querySelector('span').textContent = isOpen ? '▶' : '▼';
    });
  }

  document.querySelectorAll('.sidebar-nav a').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      if (link.classList.contains('sidebar-expandable')) return; // Toggle gestito sopra
      if (window.YFM && typeof window.YFM.navigateTo === 'function') {
        window.YFM.navigateTo(link.dataset.page);
      }
      if (window.innerWidth <= 768 && sidebar) {
        sidebar.classList.remove('open');
        document.body.classList.remove('sidebar-open');
      }
    });
  });

  if (menuBtn && sidebar) {
    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = sidebar.classList.toggle('open');
      document.body.classList.toggle('sidebar-open', isOpen);
    });
  }

  document.addEventListener('click', (e) => {
    if (!sidebar || window.innerWidth > 768) return;
    if (!sidebar.classList.contains('open')) return;
    if (sidebar.contains(e.target) || (menuBtn && menuBtn.contains(e.target))) return;
    sidebar.classList.remove('open');
    document.body.classList.remove('sidebar-open');
  });
}

export function setupGuestLayout(tipo) {
  const isAtleta = tipo === 'atleta';
  const icon = isAtleta ? '🏃' : '👪';
  const label = isAtleta ? 'Atleta' : 'Genitore';

  const app = document.getElementById('app');
  app.innerHTML = `<div class="layout">
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-logo">
        <img src="/assets/app-icon.png" alt="YFM" class="sidebar-app-icon">
        <span class="sidebar-logo-text">YFM</span>
      </div>
      <div class="sidebar-info">
        <div class="sidebar-info-label">Accesso Guest</div>
        <div class="sidebar-info-workspace" id="workspaceName">${label}</div>
      </div>
      <nav class="sidebar-nav">
        <a href="#" class="active" data-page="dashboard">📊 Dashboard</a>
        <a href="#" data-page="roster">👥 Rosa</a>
        <a href="#" data-page="calendar">📅 Calendario</a>
        ${isAtleta ? '<a href="#" data-page="stats">📊 Statistiche</a>' : ''}
      </nav>
      <div class="sidebar-user" style="display:flex;">
        <div class="sidebar-user-avatar">${icon}</div>
        <div>
          <div class="sidebar-user-name">${label}</div>
          <div class="sidebar-user-role">Guest</div>
        </div>
      </div>
      <div style="padding:12px 16px;">
        <button onclick="window.YFM.handleLogout()" style="width:100%;padding:10px;background:#E74C3C;color:white;border:none;border-radius:8px;cursor:pointer;font-size:13px;">🚪 Esci</button>
      </div>
    </aside>
    <div class="main">
      <header class="header">
        <button id="menuBtn">☰</button>
        <span style="font-weight:600;color:var(--blue);font-size:15px;margin-right:auto;">Youth Football Manager</span>
        <div class="header-right">
          <select class="header-select" id="squadraSelect"><option>Caricamento...</option></select>
        </div>
      </header>
      <div class="content" id="pageContent"><div class="loading"><div class="spinner"></div>Caricamento...</div></div>
    </div>
  </div>`;

  // Event listeners
  const sidebar = document.getElementById('sidebar');
  const menuBtn = document.getElementById('menuBtn');

  document.querySelectorAll('.sidebar-nav a').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      if (window.YFM && typeof window.YFM.navigateTo === 'function') {
        window.YFM.navigateTo(link.dataset.page);
      }
      if (window.innerWidth <= 768 && sidebar) {
        sidebar.classList.remove('open');
        document.body.classList.remove('sidebar-open');
      }
    });
  });

  if (menuBtn && sidebar) {
    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = sidebar.classList.toggle('open');
      document.body.classList.toggle('sidebar-open', isOpen);
    });
  }
}
