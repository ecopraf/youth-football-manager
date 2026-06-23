import './style.css'
import { setupLayout } from './components/layout/Sidebar'
import { initRouter } from './router'
import { loadWorkspaceInfo } from './modules/club/workspace'
import { loadSquadre } from './modules/team/squadre'
import { loadPlayerDetail } from './modules/team/playerDetail.js'

// Inizializza oggetto globale
window.YFM = {
  squadraId: '33333333-3333-3333-3333-333333333333',
  allSquadre: [],
  currentPage: 'dashboard',
  allPlayers: [],
  allMatches: [],
  workspaceInfo: null
}

// Funzioni globali per logout
window.YFM.handleLogout = function() {
  localStorage.removeItem('yfm_token');
  localStorage.removeItem('yfm_user');
  localStorage.removeItem('yfm_guest');
  window.location.reload();
};

// Funzioni globali per i moduli del calendario (caricate on-demand)
window.YFM.loadCalendar = async () => {
  const m = await import('./modules/team/calendar.js')
  await m.default()
}
window.YFM.openConvocation = async (mid, readOnly) => {
  const m = await import('./modules/team/convocazioni.js')
  m.openConvocation(mid, readOnly)
}
window.YFM.openDistinta = async (mid) => {
  const m = await import('./modules/team/distinta.js')
  m.openDistinta(mid)
}
window.YFM.openFormazioneForm = async (mid) => {
  const m = await import('./modules/team/formazione.js')
  m.openFormazioneForm(mid)
}
window.YFM.openNoteAvversario = async (mid) => {
  const m = await import('./modules/team/noteAvversario.js')
  m.openNoteAvversario(mid)
}
window.YFM.openMatchDetail = async (mid) => {
  const m = await import('./modules/team/matchDetail.js')
  m.openMatchDetail(mid)
}
window.YFM.openValutazioni = async (mid) => {
  const m = await import('./modules/team/valutazioni.js')
  m.openValutazioni(mid)
}
window.YFM.openResultForm = async (mid) => {
  const m = await import('./modules/team/resultForm.js')
  m.openResultForm(mid)
}
window.YFM.openPlayerDetail = function(playerId) {
  var c = document.getElementById('pageContent');
  if (!c) {
    console.error('pageContent non trovato');
    return;
  }
  loadPlayerDetail(c, playerId);
};

// Adatta il titolo pagina per mobile
window.YFM.adjustPageTitleForMobile = function() {
  try {
    const titleEl = document.querySelector('.page-title');
    if (!titleEl) return;
    const getSquadraName = window.YFM && typeof window.YFM.getSquadraName === 'function'
      ? window.YFM.getSquadraName : null;
    if (!getSquadraName) return;
    const squadraName = getSquadraName();
    if (!squadraName) return;
    const rawText = titleEl.textContent.trim();
    if (!rawText.endsWith(squadraName)) return;
    if (titleEl.dataset.splitForMobile === '1') return;
    const mainPart = rawText.slice(0, rawText.length - squadraName.length).trim();
    titleEl.innerHTML = mainPart + ' ' +
      '<span class="desktop-only-squadra">' + squadraName + '</span>' +
      '<span class="mobile-only-line">' + squadraName + '</span>';
    titleEl.dataset.splitForMobile = '1';
  } catch (e) {
    console.warn('adjustPageTitleForMobile error', e);
  }
};

document.addEventListener('DOMContentLoaded', () => {
  setupLayout();
  initRouter();
  
  // Inizializza UI utente
  if (window.YFM.updateUserUI) window.YFM.updateUserUI();
  
  // Setup logout button - con event delegation
  document.addEventListener('click', (e) => {
    if (e.target.id === 'logoutBtn' || e.target.closest('#logoutBtn')) {
      e.preventDefault();
      window.YFM.handleLogout();
    }
  });
  
  // Check autenticazione
  if (window.YFM.isAuthenticated && window.YFM.isAuthenticated()) {
    loadWorkspaceInfo();
    loadSquadre().then(() => {
      window.YFM.navigateTo('dashboard');
    });
  } else {
    window.YFM.navigateTo('login');
  }
});
