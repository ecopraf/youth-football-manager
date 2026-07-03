// Rilevamento automatico dell'ambiente
export const API_BASE = (() => {
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') return 'http://localhost:3002/api';
  if (host.includes('app.github.dev')) return window.location.origin.replace(/-8080\./, '-3001.') + '/api';
  return 'https://youth-football-manager-backend.vercel.app/api';
})();

// Warmup: ping al backend all'avvio
let warmed = false;
export async function warmup() {
  if (warmed) return;
  try {
    await fetch(`${API_BASE}/health`, { timeout: 5000 }).catch(() => {});
    warmed = true;
  } catch(e) {}
}
// Avvia warmup in background
warmup();

// ── AUTH HELPERS ──

// Verifica se utente è loggato
export function isAuthenticated() {
  return !!localStorage.getItem('yfm_token');
}

// Verifica se utente è admin
export function isAdmin() {
  const user = getCurrentUser();
  if (!user) return false;
  return user.is_superadmin === true || user.ruolo === 'admin';
}

// Verifica se utente ha un ruolo specifico
export function hasRole(role) {
  const user = getCurrentUser();
  if (!user) return false;
  if (user.is_superadmin === true) return true;
  return user.ruolo === role || (user.ruoli && user.ruoli.includes(role));
}

// Verifica se utente ha accesso a una squadra
export function hasAccessToSquadra(squadraId) {
  const user = getCurrentUser();
  if (!user) return false;
  if (user.is_superadmin === true) return true;
  if (user.ruolo === 'admin') return true;
  if (user.squadre_accesso && user.squadre_accesso.includes(squadraId)) return true;
  return false;
}

// Ottieni utente corrente
export function getCurrentUser() {
  const userStr = localStorage.getItem('yfm_user');
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

// Imposta utente corrente
export function setCurrentUser(user) {
  localStorage.setItem('yfm_user', JSON.stringify(user));
}

// ── FUNZIONE API ──

// Funzione per chiamate API con timeout e gestione errori
export async function apiFetch(endpoint, options = {}) {
  const controller = new AbortController();
  const timeoutMs = options.timeout || 30000;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  
  // Recupera token se presente
  const token = localStorage.getItem('yfm_token');
  const authHeaders = token ? { 'Authorization': 'Bearer ' + token } : {};
  
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: { 'Content-Type': 'application/json', ...authHeaders, ...options.headers },
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeout);
    
    // Gestisci 401 per richieste non-auth
    if (response.status === 401 && !endpoint.includes('/auth/')) {
      if (window.YFM && window.YFM.logout) window.YFM.logout();
      throw new Error('Sessione scaduta, effettua il login');
    }
    
    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
      throw new Error(err.error || `HTTP ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    clearTimeout(timeout);
    if (error.name === 'AbortError') throw new Error('Timeout del server');
    throw error;
  }
}

// ── GUEST ACCESS ──

// Verifica token guest
export async function verifyGuestToken(token) {
  return apiFetch(`/guest/${token}`);
}

// Salva sessione guest
export function setGuestSession(guestData) {
  localStorage.setItem('yfm_guest', JSON.stringify(guestData));
  localStorage.removeItem('yfm_token');
  localStorage.removeItem('yfm_user');
}

// Ottieni sessione guest
export function getGuestSession() {
  const guestStr = localStorage.getItem('yfm_guest');
  if (!guestStr) return null;
  try {
    return JSON.parse(guestStr);
  } catch {
    return null;
  }
}

// Verifica se è sessione guest
export function isGuest() {
  return !!localStorage.getItem('yfm_guest') && !localStorage.getItem('yfm_token');
}
