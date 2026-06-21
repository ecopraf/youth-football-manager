export function setupLayout() {
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
          <a href="#" data-page="roster">👥 Rosa</a>
          <a href="#" data-page="calendar">📅 Calendario</a>
          <a href="#" data-page="training">🏃 Allenamenti</a>
          <a href="#" data-page="stats">📈 Dati & Statistiche</a>
          <a href="#" data-page="reports">📄 Report</a>
          <a href="#" data-page="settings">⚙️ Impostazioni</a>
        </nav>
        <div class="sidebar-user">
          <div class="sidebar-user-avatar">M</div>
          <div>
            <div class="sidebar-user-name">Marco Rossi</div>
            <div class="sidebar-user-role">Allenatore</div>
          </div>
        </div>
      </aside>
      <div class="main">
        <header class="header">
          <button id="menuBtn">☰</button>
          <img id="headerLogo" src="" style="width:32px;height:32px;border-radius:8px;object-fit:cover;display:none;cursor:pointer;" onclick="updateLogo()" title="Clicca per cambiare logo">
          <span id="headerSocName" style="font-weight:600;color:var(--blue);font-size:15px;margin-left:8px;margin-right:auto;"></span>
          <div class="header-right">
            <select class="header-select" id="squadraSelect"><option>Caricamento...</option></select>
            <div class="player-avatar" style="width:36px;height:36px;font-size:14px;">M</div>
          </div>
        </header>
        <div class="content" id="pageContent">
          <div class="loading"><div class="spinner"></div>Caricamento...</div>
        </div>
      </div>
    </div>
  `;

  // Configura la navigazione del menu
  document.querySelectorAll('.sidebar-nav a').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      window.YFM.navigateTo(link.dataset.page);
    });
  });
}
