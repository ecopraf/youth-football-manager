/**
 * Workspace Switcher - Solo per SUPERADMIN
 * Usa un <select> nella sidebar per cambiare workspace
 */

import { apiFetch } from '../../services/api.js';

let cachedWorkspaces = null;

export async function loadAvailableWorkspaces() {
  if (cachedWorkspaces) return cachedWorkspaces;
  try {
    const ws = await apiFetch('/auth/workspaces');
    cachedWorkspaces = ws || [];
    return cachedWorkspaces;
  } catch (e) {
    console.error('Errore caricamento workspaces:', e);
    return [];
  }
}

export function saveCurrentWorkspace(workspaceId) {
  localStorage.setItem('yfm_active_workspace', workspaceId);
}

export function getSavedWorkspaceId() {
  return localStorage.getItem('yfm_active_workspace');
}

export function isSuperAdmin(user) {
  return user?.is_superadmin === true;
}

export function resetWorkspaceCache() {
  cachedWorkspaces = null;
  localStorage.removeItem('yfm_active_workspace');
}

/**
 * Popola il <select id="workspaceSelect"> nella sidebar (solo superadmin)
 * e gestisce il cambio workspace
 */
export function wsSortKey(nome) {
  return nome.replace(/^(A\.?S\.?D\.?|S\.?S\.?D\.?|U\.?S\.?D?\.?|F\.?C\.?|A\.?C\.?|N\.?)\s+/i, '').toLowerCase();
}

export function populateWorkspaceSelect(workspaces) {
  const sel = document.getElementById('workspaceSelect');
  if (!sel || !workspaces || workspaces.length === 0) return;

  const sorted = [...workspaces].sort((a, b) => wsSortKey(a.nome).localeCompare(wsSortKey(b.nome)));
  const currentId = window.YFM.activeWorkspaceId || getSavedWorkspaceId();
  sel.innerHTML = sorted.map(ws =>
    `<option value="${ws.id}" ${ws.id === currentId ? 'selected' : ''}>${ws.nome}</option>`
  ).join('');

  sel.onchange = async (e) => {
    const wsId = e.target.value;
    const ws = workspaces.find(w => w.id === wsId);
    if (!ws) return;

    saveCurrentWorkspace(wsId);
    window.YFM.workspaceInfo = ws;
    window.YFM.activeWorkspaceId = wsId;
    window.YFM.workspaceId = wsId;
    window.YFM.allSquadre = [];
    window.YFM.allPlayers = [];
    window.YFM.allMatches = [];
    window.YFM.squadraId = null;

    // Aggiorna header
    const hn = document.getElementById('headerSocName');
    if (hn) hn.textContent = ws.nome;
    const logo = document.getElementById('headerLogo');
    if (logo) { logo.src = ws.logo_url || ''; logo.style.display = ws.logo_url ? 'block' : 'none'; }

    // Ricarica facility
    try { window.YFM.facility = await apiFetch('/workspaces/' + wsId + '/facility'); } catch(e) { window.YFM.facility = null; }

    // Ricarica squadre e naviga
    if (window.YFM.loadSquadre) await window.YFM.loadSquadre();
    // Aggiorna badge notifiche per il nuovo workspace/squadra
    import('../coach/notifications.js').then(m => m.updateNotifBadge()).catch(() => {});
    window.YFM.navigateTo(window.YFM.currentPage);
  };
}

// Legacy exports (kept for compatibility but no-ops)
export async function showWorkspaceSelectorModal() { return null; }
export async function initWorkspaceSwitcherInSidebar() {}
export async function switchToWorkspace(workspaceId) {
  const workspaces = cachedWorkspaces || await loadAvailableWorkspaces();
  const ws = workspaces.find(w => w.id === workspaceId);
  if (!ws) return;
  saveCurrentWorkspace(ws.id);
  window.YFM.workspaceInfo = ws;
  window.YFM.activeWorkspaceId = ws.id;
  const sel = document.getElementById('workspaceSelect');
  if (sel) sel.value = ws.id;
}
