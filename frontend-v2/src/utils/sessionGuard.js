/**
 * Session Guard — gestione sessioni stale e inattività
 * 
 * 1. Visibility check: quando la tab torna visibile dopo >5min,
 *    verifica token JWT e ricarica la pagina corrente
 * 2. Inactivity timer: dopo 30min senza interazione,
 *    mostra banner "sessione inattiva"
 */

const VISIBILITY_THRESHOLD = 5 * 60 * 1000; // 5 min
const INACTIVITY_TIMEOUT = 30 * 60 * 1000;  // 30 min

let lastVisibleAt = Date.now();
let inactivityTimer = null;

// Decode JWT exp senza librerie
function getTokenExp() {
  const token = localStorage.getItem('yfm_token');
  if (!token) return 0;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return (payload.exp || 0) * 1000; // ms
  } catch { return 0; }
}

function isTokenExpired() {
  return Date.now() > getTokenExp();
}

// ── VISIBILITY CHANGE ──

function onVisibilityChange() {
  if (document.hidden) {
    lastVisibleAt = Date.now();
    return;
  }
  // Tab tornata visibile
  const away = Date.now() - lastVisibleAt;
  if (away < VISIBILITY_THRESHOLD) return;

  // Token scaduto → logout
  if (isTokenExpired()) {
    if (window.YFM?.handleLogout) window.YFM.handleLogout();
    return;
  }

  // Token valido ma dati stale → ricarica pagina corrente
  reloadCurrentPage();
}

function reloadCurrentPage() {
  // Invalida cache in-memory prima di ricaricare
  import('../modules/team/dashboard.js').then(m => m.invalidateDashboardCache()).catch(() => {});
  import('../modules/performance/stats.js').then(m => m.invalidateStatsCache()).catch(() => {});
  if (window.YFM?.navigateTo && window.YFM.currentPage) {
    window.YFM.navigateTo(window.YFM.currentPage);
  }
}

// ── INACTIVITY TIMER ──

function resetInactivityTimer() {
  hideBanner();
  clearTimeout(inactivityTimer);
  inactivityTimer = setTimeout(onInactive, INACTIVITY_TIMEOUT);
}

function onInactive() {
  if (!localStorage.getItem('yfm_token')) return;
  if (isTokenExpired()) {
    if (window.YFM?.handleLogout) window.YFM.handleLogout();
    return;
  }
  showBanner();
}

// ── BANNER UI ──

function showBanner() {
  if (document.getElementById('yfm-stale-banner')) return;
  const banner = document.createElement('div');
  banner.id = 'yfm-stale-banner';
  banner.innerHTML = `
    <div style="position:fixed;top:0;left:0;right:0;z-index:9999;background:#f59e0b;color:#78350f;
      padding:10px 16px;display:flex;align-items:center;justify-content:center;gap:12px;
      font-size:14px;font-weight:500;box-shadow:0 2px 8px rgba(0,0,0,0.15);">
      <span>⏸️ Sessione inattiva da 30 minuti — i dati potrebbero non essere aggiornati</span>
      <button onclick="document.getElementById('yfm-stale-banner').remove();window.YFM._sessionGuard.refresh()"
        style="background:#78350f;color:white;border:none;border-radius:8px;padding:6px 14px;
        cursor:pointer;font-size:13px;font-weight:600;">Aggiorna</button>
    </div>`;
  document.body.prepend(banner);
}

function hideBanner() {
  document.getElementById('yfm-stale-banner')?.remove();
}

// ── PUBLIC API ──

export function initSessionGuard() {
  // Non attivare per guest
  if (sessionStorage.getItem('yfm_guest')) return;
  if (!localStorage.getItem('yfm_token')) return;

  document.addEventListener('visibilitychange', onVisibilityChange);

  // Inactivity: ascolta interazioni utente
  const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
  events.forEach(e => document.addEventListener(e, resetInactivityTimer, { passive: true }));
  resetInactivityTimer();

  // Esponi refresh per il banner
  window.YFM._sessionGuard = { refresh: reloadCurrentPage };
}

export function destroySessionGuard() {
  document.removeEventListener('visibilitychange', onVisibilityChange);
  clearTimeout(inactivityTimer);
  hideBanner();
}
