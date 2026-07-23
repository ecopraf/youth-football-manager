import './style.css'
import { showToast } from './utils/ui.js'

// Handle stale chunk errors after deploy (dynamic import fails → auto-reload)
window.addEventListener('vite:preloadError', () => { window.location.reload(); });
window.addEventListener('unhandledrejection', (e) => {
  if (e.reason?.message?.includes('dynamically imported module')) {
    window.location.reload();
  }
});

import { setupLayout } from './components/layout/Sidebar'
import { initRouter } from './router'
import { loadWorkspaceInfo } from './modules/club/workspace'
import { loadSquadre } from './modules/team/squadre'
import { initSupportWidget } from './components/supportWidget'
import { loadPlayerDetail } from './modules/team/playerDetail.js'
import { getSavedWorkspaceId, resetWorkspaceCache, loadAvailableWorkspaces, isSuperAdmin, saveCurrentWorkspace, populateWorkspaceSelect } from './modules/club/workspaceSwitcher'
import { BUILD_INFO } from './build-info'
import { registerSW } from 'virtual:pwa-register'
import { apiFetch } from './services/api'
import { initSessionGuard, destroySessionGuard } from './utils/sessionGuard'

window.YFM_BUILD_ID = BUILD_INFO.id

const updateSW = registerSW({
  onOfflineReady() {},
  onNeedRefresh() {
    if (window.YFM?.currentPage === 'matchCenter') return;
    showUpdateToast(() => updateSW(true));
  },
  onRegisteredSW(swUrl, registration) {
    if (!registration) return;
    // Espone checkForUpdates per uso manuale
    window.YFM.checkForUpdates = () => {
      if (registration.waiting) {
        showUpdateToast(() => updateSW(true));
        return;
      }
      let updateFound = false;
      const onUpdateFound = () => { updateFound = true; };
      registration.addEventListener('updatefound', onUpdateFound, { once: true });
      registration.update().then(() => {
        setTimeout(() => {
          registration.removeEventListener('updatefound', onUpdateFound);
          if (!updateFound && !document.getElementById('yfm-update-toast')) {
            showToast('✓ App già aggiornata', 'success', 3000, 'top');
          }
        }, 3000);
      });
    };
    // Polling: 30s per superadmin, 30min per tutti gli altri
    // Il ruolo è noto solo dopo il login, quindi si controlla dinamicamente
    setInterval(() => {
      if (document.hidden) return;
      const isSA = window.YFM.getUser()?.is_superadmin === true;
      const interval = isSA ? 30 * 1000 : 30 * 60 * 1000;
      const now = Date.now();
      if (!window._lastSWCheck || now - window._lastSWCheck >= interval) {
        window._lastSWCheck = now;
        registration.update();
      }
    }, 30 * 1000); // tick ogni 30s, decide se aggiornare in base al ruolo
  }
})

function showUpdateToast(onConfirm) {
  if (document.getElementById('yfm-update-toast')) return; // già visibile
  const toast = document.createElement('div');
  toast.id = 'yfm-update-toast';
  toast.style.cssText = 'position:fixed;top:24px;left:50%;transform:translateX(-50%);background:#1a1a2e;color:white;padding:12px 16px;border-radius:12px;display:flex;align-items:center;gap:12px;z-index:9999;box-shadow:0 4px 20px rgba(0,0,0,0.3);font-size:14px;white-space:nowrap;';
  toast.innerHTML = `
    <span>🚀 Nuova versione disponibile</span>
    <button id="yfm-update-btn" style="background:#667eea;color:white;border:none;border-radius:8px;padding:6px 14px;cursor:pointer;font-size:13px;font-weight:600;">Aggiorna ora</button>
    <button id="yfm-update-dismiss" style="background:transparent;color:#aaa;border:none;cursor:pointer;font-size:18px;line-height:1;padding:0 2px;">×</button>
  `;
  document.body.appendChild(toast);
  document.getElementById('yfm-update-btn').onclick = () => onConfirm();
  document.getElementById('yfm-update-dismiss').onclick = () => toast.remove();
}

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
  if (wasGuest) {
    // Guest: pulisce solo sessionStorage, non tocca localStorage (altre tab potrebbero avere sessioni normali)
    sessionStorage.removeItem('yfm_guest');
  } else {
    localStorage.removeItem('yfm_token');
    localStorage.removeItem('yfm_user');
    localStorage.removeItem('yfm_active_workspace');
    localStorage.removeItem('yfm_demo_session');
    localStorage.removeItem('yfm_demo_user');
    localStorage.removeItem('yfm_squadra_id');
    resetWorkspaceCache();
  }
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
  const path = window.location.pathname;
  const isGuestPath = path.startsWith('/guest/');

  if (isGuestPath) {
    // Nascondi app durante il caricamento guest per evitare flash del layout normale
    const appEl = document.getElementById('app');
    if (appEl) appEl.style.visibility = 'hidden';
  }

  setupLayout();
  initOfflineBanner();
  initLandscapeHint();
  if (!isGuestPath) initSupportWidget();
  initRouter();

  // Demo scaduta: intercetta hash #demo-scaduta
  if (window.location.hash === '#demo-scaduta') {
    window.location.hash = '';
    window.YFM.navigateTo('demoExpired');
    return;
  }
  if (window.location.hash === '#sospeso') {
    window.location.hash = '';
    window.YFM.navigateTo('workspaceSospeso');
    return;
  }

  if (isGuestPath) {
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
        // Fetch workspace info una sola volta (evita doppia chiamata /auth/workspaces)
        const workspaces = await apiFetch('/auth/workspaces').catch(() => []);
        const ws = workspaces.find(w => w.id === user.workspace_id) || workspaces[0];
        if (ws) {
          window.YFM.workspaceInfo = ws;
          window.YFM.activeWorkspaceId = ws.id;
        }
        // Refresh profilo in background (non bloccante)
        apiFetch('/auth/me').then(freshUser => {
          if (freshUser?.id) window.YFM.setUser(freshUser);
        }).catch(() => {});
        // loadWorkspaceInfo skipà la fetch (ws già settato), loadSquadre usa ws in memoria
        await Promise.all([loadWorkspaceInfo(), loadSquadre()]);
      }
      
      await window.YFM.navigateTo('dashboard');
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

function checkDemoBanner() {
  const user = window.YFM.getUser();
  if (!user || user.is_superadmin) return;
  const ws = window.YFM.workspaceInfo;
  // Rimuovi banner se non più necessario
  if (!ws?.demo_scadenza) { document.getElementById('demoBanner')?.remove(); return; }
  const diffMs = new Date(ws.demo_scadenza) - new Date();
  if (diffMs <= 0) { document.getElementById('demoBanner')?.remove(); return; }
  const diffGiorni = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffGiorni > 3) { document.getElementById('demoBanner')?.remove(); return; }
  if (document.getElementById('demoBanner')) return;
  const banner = document.createElement('div');
  banner.id = 'demoBanner';
  // Inietta stile responsive una sola volta
  if (!document.getElementById('demoBannerStyle')) {
    const s = document.createElement('style');
    s.id = 'demoBannerStyle';
    s.textContent = `
      #demoBanner{position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:9000;background:linear-gradient(145deg,#FBBF24,#F59E0B);color:#1F2937;padding:6px 16px;border-radius:20px;font-size:12px;font-weight:600;box-shadow:0 4px 14px rgba(245,158,11,0.5),inset 0 1px 0 rgba(255,255,255,0.4);white-space:nowrap;pointer-events:auto;display:flex;align-items:center;gap:6px;}
      #demoBanner a{color:#1F2937;text-decoration:none;font-size:15px;}
      #demoBanner button{background:none;border:none;cursor:pointer;font-size:13px;color:#1F2937;opacity:0.6;padding:0;line-height:1;flex-shrink:0;}
      @media(max-width:768px){#demoBanner{top:auto;bottom:calc(20px + env(safe-area-inset-bottom,0px));left:20px;right:76px;transform:none;border-radius:14px;gap:4px;justify-content:center;padding:5px 10px;background:linear-gradient(145deg,#FBBF24,#F59E0B);box-shadow:0 4px 14px rgba(245,158,11,0.5),inset 0 1px 0 rgba(255,255,255,0.4);} #demoBanner a{font-size:16px;padding:4px 6px;display:inline-block;}}
    `;
    document.head.appendChild(s);
  }
  const isMobile = window.innerWidth <= 768;
  const msg = isMobile
    ? (diffGiorni === 1 ? 'Demo scade <strong>domani</strong>' : `Demo: <strong>${diffGiorni}gg</strong>`)
    : (diffGiorni === 1 ? 'Il periodo di prova scade <strong>domani</strong>' : `Periodo di prova: <strong>${diffGiorni} giorni</strong> rimasti`);
  banner.innerHTML = `<span>⏰ ${msg} — Attiva ora: <a href="mailto:youthfootballmanager@gmail.com?subject=Attivazione%20YFM" target="_blank" title="Email">✉️</a> <a href="https://wa.me/393351051147?text=Ciao%2C%20vorrei%20attivare%20YFM" target="_blank" title="WhatsApp">💬</a></span><button onclick="this.closest('#demoBanner').remove()" style="background:none;border:none;cursor:pointer;font-size:13px;color:#1F2937;opacity:0.6;padding:0 0 0 10px;line-height:1;flex-shrink:0;">✕</button>`;
  document.body.appendChild(banner);
}
window._checkDemoBanner = checkDemoBanner;

function initOfflineBanner() {
  const banner = document.createElement('div');
  banner.id = 'offlineBanner';
  banner.style.cssText = 'display:none;position:fixed;top:0;left:0;right:0;z-index:9999;padding:6px 16px;font-size:12px;font-weight:600;text-align:center;transition:transform 0.3s,opacity 0.3s;';
  document.body.prepend(banner);

  const show = (msg, bg, color) => {
    banner.textContent = msg;
    banner.style.background = bg;
    banner.style.color = color;
    banner.style.display = 'block';
    banner.style.opacity = '1';
    banner.style.transform = 'translateY(0)';
  };
  const hide = () => {
    banner.style.opacity = '0';
    banner.style.transform = 'translateY(-100%)';
    setTimeout(() => { banner.style.display = 'none'; }, 300);
  };

  window.addEventListener('offline', () => {
    show('⚠️ Connessione assente — i dati vengono salvati localmente', '#fef3c7', '#92400e');
  });
  window.addEventListener('online', () => {
    show('✅ Connessione ripristinata', '#d1fae5', '#065f46');
    setTimeout(hide, 3000);
  });

  // Show immediately if already offline
  if (!navigator.onLine) {
    show('⚠️ Connessione assente — i dati vengono salvati localmente', '#fef3c7', '#92400e');
  }
}

function initLandscapeHint() {
  if (!('ontouchstart' in window)) return; // solo dispositivi touch
  let hintShown = false;
  const check = () => {
    const isLandscape = window.innerWidth > window.innerHeight && window.innerWidth < 900;
    if (isLandscape && !hintShown) {
      hintShown = true;
      const toast = document.createElement('div');
      toast.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:rgba(10,28,58,0.9);color:white;padding:10px 20px;border-radius:10px;font-size:12px;z-index:9999;display:flex;align-items:center;gap:8px;animation:fadeIn 0.3s;';
      toast.innerHTML = '📱 Per una migliore esperienza usa il formato verticale';
      document.body.appendChild(toast);
      setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.3s'; setTimeout(() => toast.remove(), 300); }, 4000);
    }
    if (!isLandscape) hintShown = false;
  };
  window.addEventListener('orientationchange', () => setTimeout(check, 100));
  window.addEventListener('resize', check);
}
