import './style.css'
import { setupLayout } from './components/layout/Sidebar'
import { initRouter } from './router'
import { loadWorkspaceInfo } from './modules/club/workspace'
import { loadSquadre } from './modules/team/squadre'
import { loadPlayerDetail } from './modules/team/playerDetail.js'
import demoManager from './modules/demo/demo'

// Inizializza oggetto globale
window.YFM = {
  squadraId: '33333333-3333-3333-3333-333333333333',
  allSquadre: [],
  currentPage: 'dashboard',
  allPlayers: [],
  allMatches: [],
  workspaceInfo: null,
  guestToken: null,
  pageParams: null
}

// Funzioni helper per squadra
window.YFM.getSquadraName = () => {
  const s = window.YFM.allSquadre.find(x => x.id === window.YFM.squadraId);
  return s ? s.nome : 'Squadra';
};
window.YFM.getSquadra = () => {
  return window.YFM.allSquadre.find(x => x.id === window.YFM.squadraId) || {};
};
window.YFM.getSocietaName = () => {
  return window.YFM.workspaceInfo ? window.YFM.workspaceInfo.nome : 'ASD Albalonga';
};

// Funzioni globali per logout
window.YFM.handleLogout = function() {
  // Rimuovi tutti i dati di sessione
  localStorage.removeItem('yfm_token');
  localStorage.removeItem('yfm_user');
  localStorage.removeItem('yfm_guest');
  localStorage.removeItem('yfm_demo_session');
  localStorage.removeItem('yfm_demo_progress');
  // Rimuovi tutti i dati demo
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith('yfm_demo') || key.startsWith('demo_')) {
      localStorage.removeItem(key);
    }
  });
  // Rimuovi UI demo
  if (window.demoManager && typeof window.demoManager.resetDemo === 'function') {
    window.demoManager.resetDemo();
  }
  // Redirect alla landing
  window.location.href = '/landing.html';
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
  
  // Check per guest link (URL: /guest/{token})
  const path = window.location.pathname;
  if (path.startsWith('/guest/')) {
    const token = path.split('/guest/')[1];
    if (token) {
      window.YFM.guestToken = token;
      window.YFM.navigateTo('guest');
      return;
    }
  }

  // Check per parametri demo dalla landing
  const urlParams = new URLSearchParams(window.location.search);
  const demoEmail = urlParams.get('demo_email');
  const demoPassword = urlParams.get('demo_password');
  const autoLogin = urlParams.get('auto_login');

  // Se già autenticato
  if (window.YFM.isAuthenticated && window.YFM.isAuthenticated()) {
    // Carica workspace e squadre in parallelo
    Promise.all([
      loadWorkspaceInfo(),
      loadSquadre()
    ]).then(() => {
      // Inizializza demo se è una sessione demo
      if (localStorage.getItem('yfm_demo_session') === 'active') {
        demoManager.init();
      }
      window.YFM.navigateTo('dashboard');
    }).catch(() => {
      window.YFM.navigateTo('dashboard');
    });
  } 
  // Auto-login demo dalla landing
  else if (autoLogin === '1' && demoEmail && demoPassword) {
    fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: demoEmail, password: demoPassword })
    })
    .then(res => res.json())
    .then(res => {
      if (res.token) {
        localStorage.setItem('yfm_token', res.token);
        localStorage.setItem('yfm_user', JSON.stringify(res.user));
        localStorage.setItem('yfm_demo_session', 'active');
        
        // Pulisci URL da parametri
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
        
        // Carica dati
        return Promise.all([loadWorkspaceInfo(), loadSquadre()]);
      } else {
        throw new Error('Login fallito');
      }
    })
    .then(() => {
      // Inizializza demo
      demoManager.init();
      window.YFM.navigateTo('dashboard');
    })
    .catch((err) => {
      console.error('Auto-login demo fallito:', err);
      window.YFM.navigateTo('login');
    });
  } 
  else {
    window.YFM.navigateTo('login');
  }
});
