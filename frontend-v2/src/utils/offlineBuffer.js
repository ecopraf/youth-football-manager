/**
 * Offline Buffer per Match Center e Presenze
 * Salva dati in localStorage come fallback quando la rete è instabile.
 * Al ritorno online, esegue sync automatico.
 */

const BUFFER_PREFIX = 'mc_buffer_';
const META_PREFIX = 'mc_meta_';

let _isOnline = navigator.onLine;
let _onSyncCallback = null;
let _statusCallback = null;
let _onlineListeners = [];

// --- Status ---
export function isOnline() { return _isOnline; }

export function initOfflineBuffer(onSync, onStatusChange) {
  _onSyncCallback = onSync;
  _statusCallback = onStatusChange;

  window.addEventListener('online', _handleOnline);
  window.addEventListener('offline', _handleOffline);
}

function _handleOnline() {
  _isOnline = true;
  _statusCallback?.(_isOnline);
  _onlineListeners.forEach(fn => fn());
  autoSync();
}

function _handleOffline() {
  _isOnline = false;
  _statusCallback?.(_isOnline);
}

export function destroyOfflineBuffer() {
  _onSyncCallback = null;
  _statusCallback = null;
  window.removeEventListener('online', _handleOnline);
  window.removeEventListener('offline', _handleOffline);
}

/** Register a callback to run when connection comes back */
export function onBackOnline(fn) {
  _onlineListeners.push(fn);
  return () => { _onlineListeners = _onlineListeners.filter(f => f !== fn); };
}

// --- Buffer CRUD ---
export function saveToBuffer(matchId, eventi, meta) {
  try {
    localStorage.setItem(BUFFER_PREFIX + matchId, JSON.stringify(eventi));
    if (meta) localStorage.setItem(META_PREFIX + matchId, JSON.stringify(meta));
  } catch (e) { /* localStorage full — silent */ }
}

export function loadFromBuffer(matchId) {
  try {
    const raw = localStorage.getItem(BUFFER_PREFIX + matchId);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}

export function loadMetaFromBuffer(matchId) {
  try {
    const raw = localStorage.getItem(META_PREFIX + matchId);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}

export function clearBuffer(matchId) {
  localStorage.removeItem(BUFFER_PREFIX + matchId);
  localStorage.removeItem(META_PREFIX + matchId);
}

export function hasBufferedData(matchId) {
  return !!localStorage.getItem(BUFFER_PREFIX + matchId);
}

// --- Auto-sync ---
async function autoSync() {
  if (!_onSyncCallback) return;
  // Find all buffered matches
  const keys = Object.keys(localStorage).filter(k => k.startsWith(BUFFER_PREFIX));
  for (const key of keys) {
    const matchId = key.replace(BUFFER_PREFIX, '');
    try {
      await _onSyncCallback(matchId);
      clearBuffer(matchId);
    } catch (e) { /* retry next time */ }
  }
}
