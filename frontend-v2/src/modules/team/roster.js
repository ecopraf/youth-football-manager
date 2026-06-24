import { apiFetch } from '../../services/api';
import { formatDateShort, getAvatarColor } from '../../utils/formatters';
import { showLoading, hideLoading } from '../../utils/ui';

export { openPlayerForm, filterRoster, updateRosterGrid };

let allPlayers = [];
let selectedPlayers = new Set();
let isSelectionMode = false;
let isAdminMode = false;

export default async function loadRoster() {
  const c = document.getElementById('pageContent');
  isAdminMode = window.YFM.isAdmin && window.YFM.isAdmin();
  
  try {
    const [players, scadenze, allSquadre] = await Promise.all([
      apiFetch('/squadre/' + window.YFM.squadraId + '/calciatori'),
      apiFetch('/squadre/' + window.YFM.squadraId + '/scadenze-mediche').catch(() => []),
      apiFetch('/squadre').catch(() => [])
    ]);
    allPlayers = players;
    window.YFM.allPlayers = players;
    window.YFM.allSquadreForMove = allSquadre;
    selectedPlayers.clear();
    isSelectionMode = false;
    renderRoster(c, players, scadenze);
  } catch (e) {
    c.innerHTML = '<div class="error-box">' + e.message + '</div>';
  }
}

function renderRoster(c, players, scadenze) {
  const ruoli = ['Portiere', 'Difensore', 'Centrocampista', 'Attaccante'];
  const plur = { Portiere: 'Portieri', Difensore: 'Difensori', Centrocampista: 'Centrocampisti', Attaccante: 'Attaccanti' };
  const byRole = {};
  ruoli.forEach(r => byRole[r] = players.filter(p => p.ruolo === r));

  let toolbarHtml = '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px;"><div><h1 class="page-title">Rosa ' + window.YFM.getSquadraName() + '</h1><p class="page-subtitle">' + players.length + ' calciatori</p></div><div style="display:flex;gap:8px;flex-wrap:wrap;">';
  
  if (isAdminMode) {
    toolbarHtml += '<button class="btn btn-secondary" id="btnSelectMode">' + (isSelectionMode ? '✓ Selezione Attiva' : '☐ Seleziona') + '</button>';
    if (isSelectionMode) {
      toolbarHtml += '<button class="btn btn-secondary" id="btnCancelSelect">Annulla</button>';
      toolbarHtml += '<button class="btn btn-danger" id="btnDeleteSelected" ' + (selectedPlayers.size === 0 ? 'disabled' : '') + '>🗑️ Elimina (' + selectedPlayers.size + ')</button>';
      toolbarHtml += '<button class="btn btn-primary" id="btnMoveSelected" ' + (selectedPlayers.size === 0 ? 'disabled' : '') + '>↗️ Sposta (' + selectedPlayers.size + ')</button>';
    }
  }
  
  toolbarHtml += '<button class="btn btn-primary" id="btnAdd">+ Aggiungi</button></div></div>';

  let scadenzeHtml = scadenze.length > 0 ? '<div class="card" style="margin-bottom:20px;border-left:4px solid #F39C12;"><h3>⚠️ Certificati in scadenza</h3>' + scadenze.map(x => '<div>' + x.nome + ' ' + x.cognome + ' - ' + formatDateShort(x.scadenza) + ' (' + x.giorniRimanenti + 'gg)</div>').join('') + '</div>' : '';

  let gridsHtml = '';
  ruoli.forEach(r => {
    gridsHtml += '<div style="margin-bottom:20px;"><h3 style="font-size:16px;font-weight:600;color:var(--blue);margin-bottom:12px;padding-bottom:8px;border-bottom:2px solid var(--green);">' + plur[r] + ' (' + byRole[r].length + ')</h3><div class="roster-grid" id="grid' + r + '">' + renderPlayerCards(byRole[r].sort((a, b) => a.cognome.localeCompare(b.cognome))) + '</div></div>';
  });

  c.innerHTML = toolbarHtml + scadenzeHtml + '<div class="roster-toolbar"><input class="search-bar" placeholder="Cerca giocatore..." id="sInput"><select class="filter-select" id="fRuolo"><option value="">Tutti i ruoli</option>' + ruoli.map(r => '<option value="' + r + '">' + plur[r] + '</option>').join('') + '</select><select class="filter-select" id="fStato"><option value="">Tutti gli stati</option><option value="Attivo">Attivo</option><option value="Infortunato">Infortunato</option></select></div>' + gridsHtml;

  document.getElementById('btnAdd')?.addEventListener('click', () => openPlayerForm());
  document.getElementById('sInput')?.addEventListener('input', filterRoster);
  document.getElementById('fRuolo')?.addEventListener('change', filterRoster);
  document.getElementById('fStato')?.addEventListener('change', filterRoster);
  
  if (isAdminMode) {
    document.getElementById('btnSelectMode')?.addEventListener('click', toggleSelectionMode);
    document.getElementById('btnCancelSelect')?.addEventListener('click', cancelSelection);
    document.getElementById('btnDeleteSelected')?.addEventListener('click', deleteSelectedPlayers);
    document.getElementById('btnMoveSelected')?.addEventListener('click', moveSelectedPlayers);
  }
  
  attachCardListeners();
}

function renderPlayerCards(players) {
  if (players.length === 0) return '<p style="color:var(--gray);grid-column:1/-1;">Nessun calciatore</p>';
  return players.map(p => {
    let card = '<div class="card player-card ' + (isSelectionMode && selectedPlayers.has(p.id) ? 'selected' : '') + '" data-pid="' + p.id + '" style="position:relative;">';
    if (isSelectionMode && isAdminMode) {
      card += '<div class="selection-indicator" style="position:absolute;top:8px;left:8px;width:24px;height:24px;background:var(--primary,#667eea);color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:bold;">' + (selectedPlayers.has(p.id) ? '✓' : '') + '</div>';
    }
    if (isAdminMode) {
      card += '<div class="card-actions" style="position:absolute;top:8px;right:8px;display:flex;gap:4px;opacity:0.8;">';
      card += '<button class="player-move-btn" data-pid="' + p.id + '" title="Sposta categoria" style="background:white;border:1px solid #ddd;border-radius:4px;padding:4px 6px;cursor:pointer;">↗️</button>';
      card += '<button class="player-edit-btn" data-pid="' + p.id + '" title="Modifica" style="background:white;border:1px solid #ddd;border-radius:4px;padding:4px 6px;cursor:pointer;">✏️</button>';
      card += '<button class="player-delete-btn" data-pid="' + p.id + '" title="Elimina" style="background:white;border:1px solid #ddd;border-radius:4px;padding:4px 6px;cursor:pointer;color:#E74C3C;">🗑️</button>';
      card += '</div>';
    }
    card += '<div class="player-avatar" style="background:' + getAvatarColor(p.nome || '') + '">' + (p.nome || '')[0] + (p.cognome || '')[0] + '</div>';
    card += '<div class="player-info"><div class="player-name">' + p.nome + ' ' + p.cognome + '</div><div class="player-role">' + (p.ruolo || '-') + ' · #' + (p.numero_maglia || '-') + '</div>';
    card += '<div style="margin-top:6px;"><span class="badge ' + (p.stato === 'Attivo' ? 'badge-green' : 'badge-red') + '">' + (p.stato || 'Attivo') + '</span></div></div></div>';
    return card;
  }).join('');
}

function attachCardListeners() {
  document.querySelectorAll('.roster-grid .player-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.player-move-btn') || e.target.closest('.player-edit-btn') || e.target.closest('.player-delete-btn')) return;
      const pid = card.dataset.pid;
      if (isSelectionMode && isAdminMode) {
        e.stopPropagation();
        togglePlayerSelection(pid, card);
      } else {
        window.YFM?.openPlayerDetail?.(pid) || openPlayerForm(pid);
      }
    });
  });
  
  document.querySelectorAll('.player-edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => { e.stopPropagation(); openPlayerForm(btn.dataset.pid); });
  });
  
  document.querySelectorAll('.player-delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm('Eliminare questo giocatore dalla rosa?')) {
        deletePlayer(btn.dataset.pid);
      }
    });
  });
  
  document.querySelectorAll('.player-move-btn').forEach(btn => {
    btn.addEventListener('click', (e) => { e.stopPropagation(); openMoveModal(btn.dataset.pid); });
  });
}

function toggleSelectionMode() {
  isSelectionMode = !isSelectionMode;
  selectedPlayers.clear();
  loadRoster();
}

function cancelSelection() {
  isSelectionMode = false;
  selectedPlayers.clear();
  loadRoster();
}

function togglePlayerSelection(pid, card) {
  if (selectedPlayers.has(pid)) {
    selectedPlayers.delete(pid);
    card.classList.remove('selected');
  } else {
    selectedPlayers.add(pid);
    card.classList.add('selected');
  }
  updateBulkButtons();
}

function updateBulkButtons() {
  const deleteBtn = document.getElementById('btnDeleteSelected');
  const moveBtn = document.getElementById('btnMoveSelected');
  if (deleteBtn) {
    deleteBtn.innerHTML = '🗑️ Elimina (' + selectedPlayers.size + ')';
    deleteBtn.disabled = selectedPlayers.size === 0;
  }
  if (moveBtn) {
    moveBtn.innerHTML = '↗️ Sposta (' + selectedPlayers.size + ')';
    moveBtn.disabled = selectedPlayers.size === 0;
  }
}

async function deletePlayer(pid) {
  showLoading();
  try {
    await apiFetch('/squadre/' + window.YFM.squadraId + '/calciatori/' + pid, { method: 'DELETE' });
    loadRoster();
  } catch (e) {
    alert('Errore: ' + e.message);
  } finally {
    hideLoading();
  }
}

async function deleteSelectedPlayers() {
  if (selectedPlayers.size === 0) return;
  if (!confirm('Eliminare ' + selectedPlayers.size + ' giocatori dalla rosa?')) return;
  showLoading();
  try {
    for (const pid of selectedPlayers) {
      await apiFetch('/squadre/' + window.YFM.squadraId + '/calciatori/' + pid, { method: 'DELETE' });
    }
    selectedPlayers.clear();
    isSelectionMode = false;
    loadRoster();
  } catch (e) {
    alert('Errore: ' + e.message);
  } finally {
    hideLoading();
  }
}

function openMoveModal(pids) {
  const playerIds = Array.isArray(pids) ? pids : [pids];
  const squadre = window.YFM.allSquadreForMove || [];
  const currentSquadraId = window.YFM.squadraId;
  const otherSquadre = squadre.filter(s => s.id !== currentSquadraId);
  
  if (otherSquadre.length === 0) {
    alert('Non ci sono altre categorie disponibili');
    return;
  }
  
  const playerNames = playerIds.map(pid => {
    const p = allPlayers.find(x => x.id === pid);
    return p ? p.nome + ' ' + p.cognome : pid;
  }).join(', ');
  
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.style = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:1000;';
  modal.innerHTML = '<div style="background:white;border-radius:12px;max-width:400px;width:90%;"><div style="padding:16px 20px;border-bottom:1px solid #eee;display:flex;justify-content:space-between;align-items:center;"><h2 style="margin:0;">↗️ Sposta Giocatori</h2><button id="moveModalClose" style="background:none;border:none;font-size:24px;cursor:pointer;">×</button></div><div style="padding:20px;"><p style="margin-bottom:12px;"><strong>' + playerIds.length + ' giocatore(i):</strong></p><p style="color:#666;font-size:12px;margin-bottom:16px;">' + playerNames + '</p><div style="display:flex;flex-direction:column;gap:4px;"><label style="font-size:12px;font-weight:600;color:#666;">Sposta nella categoria:</label><select id="targetSquadra" style="padding:8px 12px;border:1px solid #ddd;border-radius:6px;font-size:14px;">' + otherSquadre.map(s => '<option value="' + s.id + '">' + s.nome + '</option>').join('') + '</select></div></div><div style="padding:16px 20px;border-top:1px solid #eee;display:flex;justify-content:flex-end;gap:12px;"><button id="moveModalCancel" class="btn btn-secondary" style="padding:10px 16px;border-radius:8px;cursor:pointer;">Annulla</button><button id="confirmMoveBtn" class="btn btn-primary" style="padding:10px 16px;border-radius:8px;cursor:pointer;background:var(--primary,#667eea);color:white;border:none;">Sposta</button></div></div>';
  document.body.appendChild(modal);
  
  document.getElementById('moveModalClose').addEventListener('click', () => modal.remove());
  document.getElementById('moveModalCancel').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
  
  document.getElementById('confirmMoveBtn').addEventListener('click', async () => {
    const targetSquadraId = document.getElementById('targetSquadra').value;
    showLoading();
    try {
      for (const pid of playerIds) {
        await apiFetch('/calciatori/' + pid + '/move', {
          method: 'POST',
          body: JSON.stringify({ fromSquadraId: currentSquadraId, toSquadraId: targetSquadraId })
        });
      }
      modal.remove();
      if (Array.isArray(pids) && pids.length > 1) cancelSelection();
      loadRoster();
    } catch (e) {
      alert('Errore: ' + e.message);
    } finally {
      hideLoading();
    }
  });
}

async function moveSelectedPlayers() {
  if (selectedPlayers.size === 0) return;
  openMoveModal(Array.from(selectedPlayers));
}

function filterRoster() {
  const s = (document.getElementById('sInput')?.value || '').toLowerCase();
  const ruolo = document.getElementById('fRuolo')?.value || '';
  const stato = document.getElementById('fStato')?.value || '';
  let f = allPlayers;
  if (s) f = f.filter(p => (p.nome + ' ' + p.cognome).toLowerCase().includes(s));
  if (ruolo) f = f.filter(p => p.ruolo === ruolo);
  if (stato) f = f.filter(p => p.stato === stato);
  
  ['Portiere', 'Difensore', 'Centrocampista', 'Attaccante'].forEach(r => {
    const grid = document.getElementById('grid' + r);
    if (grid) {
      const filtered = f.filter(p => p.ruolo === r).sort((a, b) => a.cognome.localeCompare(b.cognome));
      grid.innerHTML = renderPlayerCards(filtered);
    }
  });
  
  attachCardListeners();
}

function updateRosterGrid(players) {
  allPlayers = players;
  window.YFM.allPlayers = players;
  filterRoster();
}

function openPlayerForm(pid) {
  const p = pid ? allPlayers.find(x => x.id === pid) : null;
  
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.style = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:1000;';
  modal.innerHTML = '<div style="background:white;border-radius:12px;max-width:650px;width:90%;"><div style="padding:16px 20px;border-bottom:1px solid #eee;display:flex;justify-content:space-between;align-items:center;"><h2 style="margin:0;">' + (p ? 'Modifica' : 'Nuovo') + ' Calciatore</h2><button id="modalCloseX" style="background:none;border:none;font-size:24px;cursor:pointer;">×</button></div><div style="padding:20px;"><div style="display:grid;grid-template-columns:repeat(2,1fr);gap:16px;"><div><label style="font-size:12px;font-weight:600;color:#666;">Nome</label><input id="pfN" value="' + (p ? p.nome : '') + '" style="width:100%;padding:8px 12px;border:1px solid #ddd;border-radius:6px;"></div><div><label style="font-size:12px;font-weight:600;color:#666;">Cognome</label><input id="pfC" value="' + (p ? p.cognome : '') + '" style="width:100%;padding:8px 12px;border:1px solid #ddd;border-radius:6px;"></div><div><label style="font-size:12px;font-weight:600;color:#666;">Data Nascita</label><input id="pfD" type="date" value="' + (p && p.data_nascita ? p.data_nascita.split('T')[0] : '') + '" style="width:100%;padding:8px 12px;border:1px solid #ddd;border-radius:6px;"></div><div><label style="font-size:12px;font-weight:600;color:#666;">Telefono</label><input id="pfTel" value="' + (p ? p.telefono || '' : '') + '" style="width:100%;padding:8px 12px;border:1px solid #ddd;border-radius:6px;"></div><div><label style="font-size:12px;font-weight:600;color:#666;">Data Visita Medica</label><input id="pfVM" type="date" value="' + (p && p.data_visita_medica ? p.data_visita_medica.split('T')[0] : '') + '" style="width:100%;padding:8px 12px;border:1px solid #ddd;border-radius:6px;"></div><div><label style="font-size:12px;font-weight:600;color:#666;">Ruolo</label><select id="pfR" style="width:100%;padding:8px 12px;border:1px solid #ddd;border-radius:6px;"><option value="Portiere"' + (p?.ruolo === 'Portiere' ? ' selected' : '') + '>Portiere</option><option value="Difensore"' + (p?.ruolo === 'Difensore' ? ' selected' : '') + '>Difensore</option><option value="Centrocampista"' + (p?.ruolo === 'Centrocampista' ? ' selected' : '') + '>Centrocampista</option><option value="Attaccante"' + (p?.ruolo === 'Attaccante' ? ' selected' : '') + '>Attaccante</option></select></div><div><label style="font-size:12px;font-weight:600;color:#666;">N. Maglia</label><input id="pfM" type="number" value="' + (p ? p.numero_maglia || '' : '') + '" style="width:100%;padding:8px 12px;border:1px solid #ddd;border-radius:6px;"></div><div><label style="font-size:12px;font-weight:600;color:#666;">Matricola FIGC</label><input id="pfFigc" value="' + (p ? p.matricola_figc || '' : '') + '" style="width:100%;padding:8px 12px;border:1px solid #ddd;border-radius:6px;"></div><div><label style="font-size:12px;font-weight:600;color:#666;">Tipo Doc</label><input id="pfTD" value="' + (p ? p.tipo_documento || '' : '') + '" style="width:100%;padding:8px 12px;border:1px solid #ddd;border-radius:6px;"></div><div><label style="font-size:12px;font-weight:600;color:#666;">N. Doc</label><input id="pfND" value="' + (p ? p.numero_documento || '' : '') + '" style="width:100%;padding:8px 12px;border:1px solid #ddd;border-radius:6px;"></div><div><label style="font-size:12px;font-weight:600;color:#666;">Rilasciato</label><input id="pfRD" value="' + (p ? p.rilasciato_da || '' : '') + '" style="width:100%;padding:8px 12px;border:1px solid #ddd;border-radius:6px;"></div></div></div><div style="padding:16px 20px;border-top:1px solid #eee;display:flex;justify-content:flex-end;gap:12px;"><button id="btnCancelForm" class="btn btn-secondary" style="padding:10px 16px;border-radius:8px;cursor:pointer;background:#f0f0f0;border:none;">Annulla</button><button id="saveBtn" class="btn btn-primary" style="padding:10px 16px;border-radius:8px;cursor:pointer;background:var(--primary,#667eea);color:white;border:none;">Salva</button></div></div>';
  document.body.appendChild(modal);
  
  const closeModal = () => modal.remove();
  
  document.getElementById('modalCloseX').addEventListener('click', closeModal);
  document.getElementById('btnCancelForm').addEventListener('click', closeModal);
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
  
  document.getElementById('saveBtn').addEventListener('click', async () => {
    const d = {
      nome: document.getElementById('pfN').value,
      cognome: document.getElementById('pfC').value,
      data_nascita: document.getElementById('pfD').value,
      telefono: document.getElementById('pfTel').value,
      data_visita_medica: document.getElementById('pfVM').value,
      ruolo: document.getElementById('pfR').value,
      numero_maglia: parseInt(document.getElementById('pfM').value) || 1,
      matricola_figc: document.getElementById('pfFigc').value,
      tipo_documento: document.getElementById('pfTD').value,
      numero_documento: document.getElementById('pfND').value,
      rilasciato_da: document.getElementById('pfRD').value
    };
    showLoading();
    try {
      if (p) {
        await apiFetch('/calciatori/' + p.id, { method: 'PUT', body: JSON.stringify(d) });
      } else {
        await apiFetch('/squadre/' + window.YFM.squadraId + '/calciatori', { method: 'POST', body: JSON.stringify(d) });
      }
      closeModal();
      loadRoster();
    } catch (e) {
      alert('Errore: ' + e.message);
    } finally {
      hideLoading();
    }
  });
}

window.YFM = window.YFM || {};
window.YFM.openPlayerForm = openPlayerForm;
