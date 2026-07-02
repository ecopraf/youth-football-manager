import './style.css'
import { setupLayout } from './components/layout/Sidebar'
import { initRouter } from './router'
import { loadWorkspaceInfo } from './modules/club/workspace'
import { loadSquadre } from './modules/team/squadre'
import { loadPlayerDetail } from './modules/team/playerDetail.js'
import { showWorkspaceSelectorModal, initWorkspaceSwitcherInSidebar, getSavedWorkspaceId, resetWorkspaceCache, loadAvailableWorkspaces, isSuperAdmin, saveCurrentWorkspace } from './modules/club/workspaceSwitcher'
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
  return s ? s.nome + (s.categoria ? ' ' + s.categoria : '') : 'Squadra';
};
window.YFM.getSquadra = () => {
  return window.YFM.allSquadre.find(x => x.id === window.YFM.squadraId) || {};
};
window.YFM.getSocietaName = () => {
  return window.YFM.workspaceInfo ? window.YFM.workspaceInfo.nome : 'ASD';
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
      
      if (isSuperAdmin(user)) {
        const savedWsId = getSavedWorkspaceId();
        const savedWs = savedWsId && workspaces.find(w => w.id === savedWsId);
        
        if (savedWs) {
          window.YFM.workspaceInfo = savedWs;
          window.YFM.activeWorkspaceId = savedWs.id;
        } else if (workspaces.length > 1) {
          const selectedWs = await showWorkspaceSelectorModal();
          if (selectedWs) {
            saveCurrentWorkspace(selectedWs.id);
            window.YFM.workspaceInfo = selectedWs;
            window.YFM.activeWorkspaceId = selectedWs.id;
          }
        } else if (workspaces.length === 1) {
          saveCurrentWorkspace(workspaces[0].id);
          window.YFM.workspaceInfo = workspaces[0];
          window.YFM.activeWorkspaceId = workspaces[0].id;
        }
        
        setTimeout(() => initWorkspaceSwitcherInSidebar(), 100);
      } else {
        const userWs = workspaces.find(w => w.id === user?.workspace_id) || workspaces[0];
        if (userWs) {
          window.YFM.workspaceInfo = userWs;
          window.YFM.activeWorkspaceId = userWs.id;
        }
      }
      
      await Promise.all([loadWorkspaceInfo(), loadSquadre()]);
      window.YFM.navigateTo('dashboard');
    } catch (err) {
      console.error('[MAIN] Init error:', err);
      // Fallback: prova comunque a caricare
      try {
        await Promise.all([loadWorkspaceInfo(), loadSquadre()]);
        window.YFM.navigateTo('dashboard');
      } catch (e2) {
        console.error('[MAIN] Fallback error:', e2);
        window.YFM.navigateTo('login');
      }
    }
  } else {
    window.YFM.navigateTo('login');
  }
});
