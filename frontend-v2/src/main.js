import './style.css'
import './utils/ui.js'
import { setupLayout } from './components/layout/Sidebar'
import { initRouter } from './router'
import { loadWorkspaceInfo } from './modules/club/workspace'
import { loadSquadre } from './modules/team/squadre'
import { loadPlayerDetail } from './modules/team/playerDetail.js'
import { getSavedWorkspaceId, resetWorkspaceCache, loadAvailableWorkspaces, isSuperAdmin, saveCurrentWorkspace, populateWorkspaceSelect } from './modules/club/workspaceSwitcher'
import { BUILD_INFO } from './build-info'
import { apiFetch } from './services/api'
import { initSessionGuard, destroySessionGuard } from './utils/sessionGuard'

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
  if (!window.YFM.workspaceInfo) return 'ASD';
  return window.YFM.workspaceInfo.nome_breve || window.YFM.workspaceInfo.nome;
};
window.YFM.getWorkspaceLogo = () => {
  return window.YFM.workspaceInfo ? window.YFM.workspaceInfo.logo_url : null;
};

window.YFM.handleLogout = function() {
  destroySessionGuard();
  const wasGuest = !!sessionStorage.getItem('yfm_guest');
  localStorage.removeItem('yfm_token');
  localStorage.removeItem('yfm_user');
  sessionStorage.removeItem('yfm_guest');
  localStorage.removeItem('yfm_active_workspace');
  localStorage.removeItem('yfm_demo_session');
  localStorage.removeItem('yfm_demo_user');
  localStorage.removeItem('yfm_squadra_id');
  resetWorkspaceCache();
  if (wasGuest) {
    document.getElementById('app').innerHTML = `<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f5f7fa;">
      <div style="text-align:center;padding:40px;background:white;border-radius:16px;box-shadow:0 4px 20px rgba(0,0,0,0.08);max-width:360px;">
        <p style="font-size:40px;margin-bottom:12px;">👋</p>
        <h2 style="margin:0 0 8px;color:#1a1a2e;">Sessione terminata</h2>
        <p style="color:#666;font-size:14px;">Per accedere di nuovo, usa il link che ti è stato inviato.</p>
      </div>
    </div>`;
  } else {
    window.location.href = '/';
  }
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
  window.YFM.pageParams = { matchId: mid };
  window.YFM.navigateTo('matchCenter');
}
window.YFM.openMatchCenter = async (mid) => {
  window.YFM.pageParams = { matchId: mid };
  window.YFM.navigateTo('matchCenter');
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
      
      let currentWs = null;
      if (isSuperAdmin(user)) {
        // Superadmin: /auth/me non serve (hardcoded), carica workspaces
        const workspaces = await loadAvailableWorkspaces();
        const savedWsId = getSavedWorkspaceId();
        currentWs = (savedWsId && workspaces.find(w => w.id === savedWsId)) || workspaces[0];
        if (currentWs) {
          saveCurrentWorkspace(currentWs.id);
          window.YFM.workspaceInfo = currentWs;
          window.YFM.activeWorkspaceId = currentWs.id;
        }
        await Promise.all([loadWorkspaceInfo(), loadSquadre()]);
        populateWorkspaceSelect(workspaces);
      } else {
        // Admin/staff: usa dati localStorage, refresh /auth/me in background
        window.YFM.activeWorkspaceId = user.workspace_id;
        saveCurrentWorkspace(user.workspace_id);
        // Carica app subito, refresh profilo in background
        const mePromise = apiFetch('/auth/me').then(freshUser => {
          if (freshUser?.id) window.YFM.setUser(freshUser);
        }).catch(() => {});
        await Promise.all([loadWorkspaceInfo(), loadSquadre()]);
        // Attendi /auth/me solo se ancora in corso (non blocca il render)
        await mePromise;
      }
      
      window.YFM.navigateTo('dashboard');
      initSessionGuard();
      // Badge notifiche assenze (subito + polling ogni 60s)
      import('./modules/coach/notifications.js').then(m => {
        m.updateNotifBadge();
        if (!window._notifInterval) {
          window._notifInterval = setInterval(() => m.updateNotifBadge(), 60000);
        }
      }).catch(() => {});
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
