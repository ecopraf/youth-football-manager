// Rilevamento automatico dell'ambiente
export const API_BASE = (() => {
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') return 'http://localhost:3001/api';
  if (host.includes('app.github.dev')) return window.location.origin.replace(/-8080\./, '-3001.') + '/api';
  return 'https://youth-football-manager-backend.vercel.app/api';
})();

// Funzione per chiamate API con timeout e gestione errori
export async function apiFetch(endpoint, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  
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
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    clearTimeout(timeout);
    if (error.name === 'AbortError') throw new Error('Timeout del server');
    throw error;
  }
}
