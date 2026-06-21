export function initRouter() {
  window.YFM.pages = {
    dashboard: () => import('./modules/team/dashboard.js'),
    roster: () => import('./modules/team/roster.js'),
    calendar: () => import('./modules/team/calendar.js'),
    training: () => import('./modules/coach/training.js'),
    stats: () => import('./modules/performance/stats.js'),
    reports: () => import('./modules/performance/reports.js'),
    settings: () => import('./modules/club/settings.js')
  };
  
  window.YFM.navigateTo = async (page) => {
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
    } catch (error) {
      container.innerHTML = `<div class="error-box">Errore nel caricamento di ${page}: ${error.message}</div>`;
    }
  };
}
