import './style.css'
import { setupLayout } from './components/layout/Sidebar'
import { initRouter } from './router'
import { loadWorkspaceInfo } from './modules/club/workspace'
import { loadSquadre } from './modules/team/squadre'

window.YFM = window.YFM || {}
window.YFM.squadraId = '33333333-3333-3333-3333-333333333333'
window.YFM.allSquadre = []
window.YFM.currentPage = 'dashboard'
window.YFM.allPlayers = []
window.YFM.allMatches = []
window.YFM.workspaceInfo = null

document.addEventListener('DOMContentLoaded', () => {
  setupLayout()
  initRouter()
  loadWorkspaceInfo()
  loadSquadre().then(() => {
    window.YFM.navigateTo('dashboard')
  })
})

// Funzioni globali per i moduli del calendario (caricate on-demand)
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


// Scheda giocatore: funzione globale di comodo
import { loadPlayerDetail } from './modules/team/playerDetail.js';

window.YFM = window.YFM || {};
window.YFM.openPlayerDetail = function(playerId) {
  var c = document.getElementById('pageContent');
  if (!c) {
    console.error('pageContent non trovato');
    return;
  }
  loadPlayerDetail(c, playerId);
};


// Adatta il titolo pagina per mobile: split tra sezione e nome squadra
window.YFM = window.YFM || {};
window.YFM.adjustPageTitleForMobile = function() {
  try {
    const titleEl = document.querySelector('.page-title');
    if (!titleEl) return;

    const getSquadraName = window.YFM && typeof window.YFM.getSquadraName === 'function'
      ? window.YFM.getSquadraName
      : null;
    if (!getSquadraName) return;

    const squadraName = getSquadraName();
    if (!squadraName) return;

    const rawText = titleEl.textContent.trim();
    if (!rawText.endsWith(squadraName)) return;

    // Evita di processare due volte
    if (titleEl.dataset.splitForMobile === '1') return;

    const mainPart = rawText.slice(0, rawText.length - squadraName.length).trim();
    // Esempio: "Allenamenti Under 14 Regionale"
    // mainPart -> "Allenamenti Under 14", squadraName -> "Regionale"
    // oppure "Allenamenti" / "Under 14 Regionale": comunque la seconda riga è chiara

    titleEl.innerHTML =
      mainPart + ' ' +
      '<span class="desktop-only-squadra">' + squadraName + '</span>' +
      '<span class="mobile-only-line">' + squadraName + '</span>';

    titleEl.dataset.splitForMobile = '1';
  } catch (e) {
    console.warn('adjustPageTitleForMobile error', e);
  }
};
