/**
 * Workspace Switcher - Solo per SUPERADMIN
 * Permette di passare tra più società/workspace
 */

import { apiFetch } from '../../services/api.js';

let cachedWorkspaces = null;

/**
 * Carica la lista dei workspace accessibili all'utente
 */
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

/**
 * Salva il workspace corrente in localStorage
 */
export function saveCurrentWorkspace(workspaceId) {
  localStorage.setItem('yfm_active_workspace', workspaceId);
  cachedWorkspaces = null;
}

/**
 * Recupera il workspace salvato in localStorage
 */
export function getSavedWorkspaceId() {
  return localStorage.getItem('yfm_active_workspace');
}

/**
 * Verifica se l'utente è superadmin
 */
export function isSuperAdmin(user) {
  return user?.is_superadmin === true;
}

/**
 * Mostra un modal per selezionare il workspace iniziale (al login)
 * Torna il workspace selezionato
 */
export async function showWorkspaceSelectorModal() {
  const workspaces = await loadAvailableWorkspaces();
  
  if (workspaces.length === 0) {
    return null;
  }
  
  if (workspaces.length === 1) {
    const ws = workspaces[0];
    saveCurrentWorkspace(ws.id);
    return ws;
  }
  
  // Crea modal di selezione
  return new Promise((resolve) => {
    // CSS
    const style = document.createElement('style');
    style.textContent = `
      .ws-modal-overlay {
        position:fixed;top:0;left:0;right:0;bottom:0;
        background:rgba(0,0,0,0.6);z-index:10000;
        display:flex;align-items:center;justify-content:center;
      }
      .ws-modal {
        background:white;border-radius:16px;padding:32px;
        max-width:480px;width:90%;max-height:80vh;overflow-y:auto;
        box-shadow:0 20px 60px rgba(0,0,0,0.3);
      }
      .ws-modal h2 { margin:0 0 8px 0; color:#333; }
      .ws-modal p { color:#666; margin:0 0 24px 0; font-size:14px; }
      .ws-option {
        padding:16px 20px;border:2px solid #e0e0e0;border-radius:12px;
        margin-bottom:12px;cursor:pointer;transition:all 0.2s;
      }
      .ws-option:hover { border-color:#667eea; background:#f8f7ff; }
      .ws-option-name { font-weight:600;font-size:16px;color:#333; }
      .ws-option-city { font-size:13px;color:#888;margin-top:4px; }
      .ws-option-email { font-size:12px;color:#aaa;margin-top:2px; }
      .ws-option-icon { 
        display:inline-flex;align-items:center;justify-content:center;
        width:40px;height:40px;background:#667eea;color:white;
        border-radius:10px;font-size:18px;margin-right:12px;
        vertical-align:middle;
      }
    `;
    document.head.appendChild(style);
    
    const overlay = document.createElement('div');
    overlay.className = 'ws-modal-overlay';
    
    let html = `
      <div class="ws-modal">
        <h2>🏢 Seleziona Società</h2>
        <p>Come superadmin, scegli quale società gestire:</p>
        <div class="ws-options">
    `;
    
    workspaces.forEach(ws => {
      const city = ws.città || ws.citta || '';
      const email = ws.email || '';
      const initial = (ws.nome || 'S')[0].toUpperCase();
      html += `
        <div class="ws-option" data-ws-id="${ws.id}">
          <span class="ws-option-icon">${initial}</span>
          <div style="display:inline-block;vertical-align:middle;">
            <div class="ws-option-name">${ws.nome || 'Senza nome'}</div>
            ${city ? `<div class="ws-option-city">📍 ${city}</div>` : ''}
            ${email ? `<div class="ws-option-email">${email}</div>` : ''}
          </div>
        </div>
      `;
    });
    
    html += '</div></div>';
    overlay.innerHTML = html;
    document.body.appendChild(overlay);
    
    // Click handler
    overlay.addEventListener('click', (e) => {
      const option = e.target.closest('.ws-option');
      if (option) {
        const wsId = option.dataset.wsId;
        const ws = workspaces.find(w => w.id === wsId);
        saveCurrentWorkspace(wsId);
        overlay.remove();
        resolve(ws);
      }
    });
  });
}

/**
 * Crea e aggiunge il dropdown switcher nella sidebar
 */
export async function initWorkspaceSwitcherInSidebar() {
  const user = window.YFM.getUser();
  if (!user || !isSuperAdmin(user)) return;
  
  const workspaces = await loadAvailableWorkspaces();
  
  // Se c'è solo 1 workspace, non mostrare lo switcher
  if (workspaces.length <= 1) return;
  
  // Usa il workspace già impostato in window.YFM, altrimenti quello salvato, altrimenti il primo
  const savedWsId = getSavedWorkspaceId();
  let currentWs = window.YFM.workspaceInfo;
  
  if (!currentWs) {
    const currentWsId = savedWsId || workspaces[0]?.id;
    currentWs = workspaces.find(w => w.id === currentWsId) || workspaces[0];
  }
  
  if (!currentWs) return;
  
  // Sincronizza: assicura che window.YFM abbia il workspace corrente
  window.YFM.workspaceInfo = currentWs;
  window.YFM.activeWorkspaceId = currentWs.id;
  if (!savedWsId) {
    saveCurrentWorkspace(currentWs.id);
  }
  
  // Crea il selettore nella sidebar
  const sidebarInfo = document.querySelector('.sidebar-info');
  if (!sidebarInfo) return;
  
  // CSS per dropdown
  const style = document.createElement('style');
  style.textContent = `
    .ws-sidebar-switcher {
      margin-top:12px;padding:8px 12px;
      background:rgba(255,255,255,0.1);border-radius:8px;
      cursor:pointer;transition:background 0.2s;
    }
    .ws-sidebar-switcher:hover { background:rgba(255,255,255,0.15); }
    .ws-dropdown {
      display:none;position:absolute;left:12px;right:12px;
      background:white;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);
      z-index:1000;max-height:300px;overflow-y:auto;
    }
    .ws-dd-option {
      padding:12px 16px;cursor:pointer;border-bottom:1px solid #f0f0f0;
    }
    .ws-dd-option:last-child { border-bottom:none; }
    .ws-dd-option:hover { background:#f5f5f5; }
    .ws-dd-option.active { background:#e8f0fe; }
    .ws-dd-name { font-weight:600;font-size:13px;color:#333; }
    .ws-dd-city { font-size:11px;color:#888;margin-top:2px; }
    .ws-dd-check { float:right;color:#4CAF50; }
  `;
  document.head.appendChild(style);
  
  const switcherHtml = `
    <div class="ws-sidebar-switcher" id="wsSidebarSwitcher" style="position:relative;">
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <span style="font-size:10px;color:rgba(255,255,255,0.6);text-transform:uppercase;">🏢 Società</span>
        <span style="font-size:12px;">▼</span>
      </div>
      <div id="wsSidebarName" style="font-size:13px;font-weight:600;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
        ${currentWs.nome || 'Seleziona...'}
      </div>
      <div id="wsSidebarDropdown" class="ws-dropdown"></div>
    </div>
  `;
  
  sidebarInfo.insertAdjacentHTML('afterend', switcherHtml);
  
  // Popola dropdown
  const dropdown = document.getElementById('wsSidebarDropdown');
  workspaces.forEach(ws => {
    const isActive = ws.id === currentWs.id;
    const city = ws.città || ws.citta || '';
    dropdown.insertAdjacentHTML('beforeend', `
      <div class="ws-dd-option ${isActive ? 'active' : ''}" data-ws-id="${ws.id}">
        ${isActive ? '<span class="ws-dd-check">✓</span>' : ''}
        <div class="ws-dd-name">${ws.nome || 'Senza nome'}</div>
        ${city ? `<div class="ws-dd-city">📍 ${city}</div>` : ''}
      </div>
    `);
  });
  
  // Toggle dropdown
  const switcher = document.getElementById('wsSidebarSwitcher');
  switcher.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = dropdown.style.display === 'block';
    dropdown.style.display = isOpen ? 'none' : 'block';
    switcher.querySelector('span:last-child').textContent = isOpen ? '▼' : '▲';
  });
  
  document.addEventListener('click', () => {
    dropdown.style.display = 'none';
    switcher.querySelector('span:last-child').textContent = '▼';
  });
  
  // Cambio workspace
  dropdown.addEventListener('click', async (e) => {
    const option = e.target.closest('.ws-dd-option');
    if (!option) return;
    
    const newWsId = option.dataset.wsId;
    if (newWsId === currentWs.id) return;
    
    await switchToWorkspace(newWsId);
  });
}

/**
 * Cambia workspace e ricarica i dati
 */
export async function switchToWorkspace(workspaceId) {
  const workspaces = cachedWorkspaces || await loadAvailableWorkspaces();
  const ws = workspaces.find(w => w.id === workspaceId);
  
  if (!ws) {
    alert('Workspace non trovato');
    return;
  }
  
  console.log('[WorkspaceSwitcher] Cambio a:', ws.nome);
  
  saveCurrentWorkspace(ws.id);
  window.YFM.workspaceInfo = ws;
  window.YFM.activeWorkspaceId = ws.id;
  
  // Aggiorna UI
  document.getElementById('workspaceName').textContent = ws.nome;
  const headerName = document.getElementById('headerSocName');
  if (headerName) headerName.textContent = ws.nome;
  const logo = document.getElementById('headerLogo');
  if (logo) {
    logo.src = ws.logo_url || '';
    logo.style.display = ws.logo_url ? 'block' : 'none';
  }
  
  // Aggiorna nome nel switcher sidebar
  const sidebarName = document.getElementById('wsSidebarName');
  if (sidebarName) sidebarName.textContent = ws.nome;
  
  // Resetta dati
  window.YFM.allSquadre = [];
  window.YFM.allPlayers = [];
  window.YFM.allMatches = [];
  window.YFM.squadraId = null;
  
  // Ricarica
  if (window.YFM.loadSquadre) {
    await window.YFM.loadSquadre();
  }
  window.YFM.navigateTo(window.YFM.currentPage);
  
  // Toast
  const toast = document.createElement('div');
  toast.style.cssText = `
    position:fixed;bottom:20px;left:50%;transform:translateX(-50%);
    background:#333;color:white;padding:12px 24px;border-radius:8px;
    font-size:14px;z-index:10000;
  `;
  toast.textContent = `✓ Società: ${ws.nome}`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2000);
}

/**
 * Resetta la cache (da chiamare dopo logout)
 */
export function resetWorkspaceCache() {
  cachedWorkspaces = null;
  localStorage.removeItem('yfm_active_workspace');
}
