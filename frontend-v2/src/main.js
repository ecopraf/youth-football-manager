import './style.css'
import './utils/ui.js'
import { setupLayout } from './components/layout/Sidebar'
import { initRouter } from './router'
import { loadWorkspaceInfo } from './modules/club/workspace'
import { loadSquadre } from './modules/team/squadre'
import { loadPlayerDetail } from './modules/team/playerDetail.js'
import { getSavedWorkspaceId, resetWorkspaceCache, loadAvailableWorkspaces, isSuperAdmin, saveCurrentWorkspace, populateWorkspaceSelect } from './modules/club/workspaceSwitcher'
import { BUILD_INFO } from './build-info'

window.YFM_BUILD_ID = BUILD_INFO.id

window.YFM = {
  squadraId: null,
  allSquadre: [],
  currentPage: 'dashboard',
  allPlayers: [],
  allMatches: [],
  workspaceInfo: null,
  guestToken: null,
  pageParams: null,
  apiBase: ''
};

window.YFM.getSquadraName = () => {
  const s = window.YFM.allSquadre.find(x => x.id === window.YFM.squadraId);
  if (!s) return 'Squadra';
  return s.category?.nome || s.nome;
};
window.YFM.getSquadra = () => {
  return window.YFM.allSquadre.find(x => x.id === window.YFM.squadraId) || {};
};
window.YFM.getSocietaName = () => {
  return window.YFM.workspaceInfo ? window.YFM.workspaceInfo.nome : 'ASD';
};
window.YFM.getWorkspaceLogo = () => {
  return window.YFM.workspaceInfo ? window.YFM.workspaceInfo.logo_url : null;
};

window.YFM.handleLogout = function() {
  localStorage.removeItem('yfm_token');
  localStorage.removeItem('yfm_user');
  localStorage.removeItem('yfm_guest');
  localStorage.removeItem('yfm_active_workspace');
  localStorage.removeItem('yfm_demo_session');
  localStorage.removeItem('yfm_demo_user');
  resetWorkspaceCache();
  window.location.href = '/';
};

window.YFM.loadCalendar = async () => {
  const m = await import('./modules/team/calendar.js')
  await m.default()
}
window.YFM.loadSquadre = loadSquadre;
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
  if (window.YFM.isGuest && window.YFM.isGuest()) return;
  var c = document.getElementById('pageContent');
  if (!c) { console.error('pageContent non trovato'); return; }
  loadPlayerDetail(c, playerId);
};

document.addEventListener('DOMContentLoaded', async () => {
  setupLayout();
  initRouter();

  const path = window.location.pathname;
  if (path.startsWith('/guest/')) {
    const token = path.split('/guest/')[1];
    if (token) {
      window.YFM.guestToken = token;
      window.YFM.navigateTo('guest');
      return;
    }
  }

  const isAuth = window.YFM.isAuthenticated && window.YFM.isAuthenticated();

  if (isAuth) {
    try {
      const user = window.YFM.getUser();
      const workspaces = await loadAvailableWorkspaces();
      
      let currentWs = null;
      if (isSuperAdmin(user)) {
        const savedWsId = getSavedWorkspaceId();
        currentWs = (savedWsId && workspaces.find(w => w.id === savedWsId)) || workspaces[0];
      } else {
        currentWs = workspaces.find(w => w.id === user?.workspace_id) || workspaces[0];
      }
      
      if (currentWs) {
        saveCurrentWorkspace(currentWs.id);
        window.YFM.workspaceInfo = currentWs;
        window.YFM.activeWorkspaceId = currentWs.id;
      }
      
      await Promise.all([loadWorkspaceInfo(), loadSquadre()]);
      if (isSuperAdmin(user)) populateWorkspaceSelect(workspaces);
      window.YFM.navigateTo('dashboard');
    } catch (err) {
      console.error('[MAIN] Init error:', err);
      try {
        await Promise.all([loadWorkspaceInfo(), loadSquadre()]);
        window.YFM.navigateTo('dashboard');
      } catch (e2) {
        window.YFM.navigateTo('login');
      }
    }
  } else {
    window.YFM.navigateTo('login');
  }
});
