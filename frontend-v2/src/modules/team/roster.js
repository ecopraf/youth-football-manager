import { apiFetch, API_BASE } from '../../services/api';
import { formatDateShort, getAvatarColor } from '../../utils/formatters';
import { showLoading, hideLoading } from '../../utils/ui';
import { loadNewPlayerForm } from './playerDetail.js';
import { calcolaCodiceFiscale, cercaComune } from '../../utils/codiceFiscale.js';
import { calcCertificatiStatus, renderCertificatiCard, bindCertificatiToggle } from '../../utils/certificati.js';

export { openPlayerForm, filterRoster, updateRosterGrid };

let allPlayers = [];
let svincolati = [];
let selectedPlayers = new Set();
let isSelectionMode = false;
let isAdminMode = false;

export default async function loadRoster() {
  const c = document.getElementById('pageContent');
  const wasAdmin = isAdminMode;
  isAdminMode = window.YFM.isAdmin && window.YFM.isAdmin();
  
  if (wasAdmin !== isAdminMode) {
    selectedPlayers.clear();
    isSelectionMode = false;
  }
  
  let players = [];
  let scadenze = [];
  let allSquadre = [];
  
  try {
    let svincolatiData = [];
    [players, scadenze, allSquadre, svincolatiData] = await Promise.all([
      apiFetch('/squadre/' + window.YFM.squadraId + '/calciatori'),
      apiFetch('/squadre/' + window.YFM.squadraId + '/scadenze-mediche').catch(() => []),
      apiFetch('/squadre').catch(() => []),
      apiFetch('/squadre/' + window.YFM.squadraId + '/calciatori?includi_svincolati=1').catch(() => [])
    ]);
    svincolati = svincolatiData.filter(p => p.stato === 'Svincolato');
    allPlayers = players;
    window.YFM.allPlayers = players;
    window.YFM.allSquadreForMove = allSquadre;
    renderRoster(c, players, scadenze);
  } catch (e) {
    c.innerHTML = '<div class="error-box">' + e.message + '</div>';
  }
}

function renderRoster(c, players, scadenze) {
  const ruoli = ['Portiere', 'Difensore', 'Centrocampista', 'Attaccante'];
  const shortRole = { Portiere: 'POR', Difensore: 'DIF', Centrocampista: 'CEN', Attaccante: 'ATT' };
  const plur = { Portiere: 'Portieri', Difensore: 'Difensori', Centrocampista: 'Centrocampisti', Attaccante: 'Attaccanti' };
  const byRole = {};
  ruoli.forEach(r => byRole[r] = players.filter(p => p.ruolo === r));
  const noRole = players.filter(p => !p.ruolo || !ruoli.includes(p.ruolo));

  // Count by role for subtitle
  const roleCount = ruoli.map(r => byRole[r].length + ' ' + shortRole[r]).join(' · ');
  let toolbarHtml = '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px;"><div><h1 class="page-title">Rosa</h1><p class="page-subtitle" style="color:#666;font-size:14px;">' + players.length + ' calciatori <span style="color:#999;">(' + roleCount + ')</span></p></div><div style="display:flex;gap:8px;flex-wrap:wrap;">';
  
  if (isAdminMode) {
    toolbarHtml += '<button class="btn btn-secondary" id="btnSelectMode">' + (isSelectionMode ? '✓ Selezione Attiva' : '☐ Seleziona') + '</button>';
    if (isSelectionMode) {
      toolbarHtml += '<button class="btn btn-secondary" id="btnSelectAll">☑ Tutti</button>';
      toolbarHtml += '<button class="btn btn-secondary" id="btnCancelSelect">Annulla</button>';
      toolbarHtml += '<button class="btn btn-danger" id="btnDeleteSelected" ' + (selectedPlayers.size === 0 ? 'disabled' : '') + '>🗑️ Elimina (' + selectedPlayers.size + ')</button>';
      toolbarHtml += '<button class="btn btn-secondary" id="btnSvincolaSelected" style="background:#F39C12;color:white;border:none;" data-help="roster.btnSvincola" ' + (selectedPlayers.size === 0 ? 'disabled' : '') + '>📋 Svincola (' + selectedPlayers.size + ')</button>';
      toolbarHtml += '<button class="btn btn-primary" id="btnMoveSelected" ' + (selectedPlayers.size === 0 ? 'disabled' : '') + '>↗️ Sposta (' + selectedPlayers.size + ')</button>';
    }
  }
  
  toolbarHtml += '<button class="btn btn-secondary" id="btnImportXls" title="Importa rosa da file Excel" data-help="roster.btnAggiungi">📥 XLS</button>';
  toolbarHtml += '<button class="btn btn-secondary" id="btnImportTc" title="Importa rosa da copia-incolla (Tuttocampo o simili)">📋 Import Manuale</button>';
  toolbarHtml += '<button class="btn btn-primary" id="btnAdd" data-help="roster.btnAggiungi">+ Aggiungi</button></div></div>';


  const certStatus = calcCertificatiStatus(players);
  const certHtml = renderCertificatiCard(certStatus);
  const scadenzeHtml = certHtml ? `<div class="card" style="margin-bottom:12px;padding:16px;">${certHtml}</div>` : '';

  let gridsHtml = '';
  if (noRole.length > 0) {
    gridsHtml += '<div style="margin-bottom:20px;"><h3 style="font-size:16px;font-weight:600;color:#F39C12;margin-bottom:12px;padding-bottom:8px;border-bottom:2px solid #F39C12;">⚠️ Ruolo non assegnato (' + noRole.length + ')</h3><div class="roster-grid" id="gridNoRole">' + renderPlayerCards(noRole.sort((a, b) => a.cognome.localeCompare(b.cognome))) + '</div></div>';
  }
  ruoli.forEach(r => {
    gridsHtml += '<div style="margin-bottom:20px;"><h3 style="font-size:16px;font-weight:600;color:var(--blue);margin-bottom:12px;padding-bottom:8px;border-bottom:2px solid var(--green);">' + plur[r] + ' (' + byRole[r].length + ')</h3><div class="roster-grid" id="grid' + r + '">' + renderPlayerCards(byRole[r].sort((a, b) => a.cognome.localeCompare(b.cognome))) + '</div></div>';
  });

  c.innerHTML = toolbarHtml + scadenzeHtml + '<div class="roster-toolbar"><input class="search-bar" placeholder="Cerca giocatore..." id="sInput" data-help="roster.cerca"><select class="filter-select" id="fRuolo" data-help="roster.filtroRuolo"><option value="">Tutti i ruoli</option>' + ruoli.map(r => '<option value="' + r + '">' + plur[r] + '</option>').join('') + '</select><select class="filter-select" id="fStato" data-help="roster.filtroStato"><option value="">Stato: Tutti</option><option value="Attivo">Attivo</option><option value="Aggregato">Aggregato</option><option value="Infortunato">Infortunato</option></select></div>' + gridsHtml + renderSvincolatiSection();

  // Bind toggle certificati
  bindCertificatiToggle(c);

  document.getElementById('btnAdd')?.addEventListener('click', () => {
    const c = document.getElementById('pageContent');
    if (c) loadNewPlayerForm(c);
  });
  document.getElementById('btnImportXls')?.addEventListener('click', () => openImportXlsModal());
  document.getElementById('btnImportTc')?.addEventListener('click', () => openImportTcModal());
  document.getElementById('sInput')?.addEventListener('input', filterRoster);
  document.getElementById('fRuolo')?.addEventListener('change', filterRoster);
  document.getElementById('fStato')?.addEventListener('change', filterRoster);
  
  if (isAdminMode) {
    document.getElementById('btnSelectMode')?.addEventListener('click', toggleSelectionMode);
    document.getElementById('btnSelectAll')?.addEventListener('click', selectAllPlayers);
    document.getElementById('btnCancelSelect')?.addEventListener('click', cancelSelection);
    document.getElementById('btnDeleteSelected')?.addEventListener('click', deleteSelectedPlayers);
    document.getElementById('btnMoveSelected')?.addEventListener('click', moveSelectedPlayers);
    document.getElementById('btnSvincolaSelected')?.addEventListener('click', svincolaSelectedPlayers);
    document.getElementById('btnToggleSvincolati')?.addEventListener('click', () => {
      const sec = document.getElementById('svincolatiContent');
      const arrow = document.getElementById('svincolatiArrow');
      if (sec.style.display === 'none') { sec.style.display = 'block'; arrow.textContent = '▼'; }
      else { sec.style.display = 'none'; arrow.textContent = '▶'; }
    });
    document.getElementById('btnRecuperaSvincolato')?.addEventListener('click', openRecuperaModal);
    document.getElementById('btnAggregaPlayer')?.addEventListener('click', openAggregaModal);
    // Riattiva buttons
    document.querySelectorAll('.btn-riattiva').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const pid = btn.dataset.pid;
        showLoading();
        try {
          await apiFetch('/squadre/' + window.YFM.squadraId + '/riattiva', { method: 'POST', body: JSON.stringify({ playerIds: [pid] }) });
          loadRoster();
        } catch (err) { alert('Errore: ' + err.message); }
        finally { hideLoading(); }
      });
    });
  }
  
  attachCardListeners();
}

function renderPlayerCards(players) {
  if (players.length === 0) return '<p style="color:var(--gray);grid-column:1/-1;">Nessun calciatore</p>';
  return players.map(p => {
    const isSelected = isSelectionMode && selectedPlayers.has(p.id);
    let card = '<div class="card player-card" data-pid="' + p.id + '" onclick="' + (isSelectionMode ? '' : 'window.YFM && window.YFM.openPlayerDetail && window.YFM.openPlayerDetail(\'' + p.id + '\')') + '" style="padding:16px;display:flex;align-items:center;gap:16px;cursor:pointer;border:2px solid ' + (isSelected ? 'var(--primary,#667eea)' : 'transparent') + ';background:' + (isSelected ? 'rgba(102,126,234,0.1)' : 'white') + ';transition:all 0.2s;">';
    
    // Avatar
    if (isSelectionMode) {
      card += '<div class="sel-checkbox" style="width:24px;height:24px;border-radius:4px;border:2px solid ' + (isSelected ? 'var(--primary,#667eea)' : '#ccc') + ';background:' + (isSelected ? 'var(--primary,#667eea)' : 'white') + ';display:flex;align-items:center;justify-content:center;flex-shrink:0;">' + (isSelected ? '<span style="color:white;font-size:14px;">✓</span>' : '') + '</div>';
    }
    card += '<div class="player-avatar" style="background:' + getAvatarColor(p.nome || '') + ';flex-shrink:0;width:50px;height:50px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:600;color:white;">' + (p.nome || '')[0] + (p.cognome || '')[0] + '</div>';
    
    // Info giocatore
    card += '<div class="player-info" style="flex:1;min-width:0;">';
    card += '<div class="player-name" style="font-weight:600;font-size:15px;">' + p.nome + ' ' + p.cognome + '</div>';
    card += '<div class="player-role" style="color:#666;font-size:13px;margin-top:2px;">' + (p.ruolo || '-') + ' · #' + (p.numero_maglia || '-') + '</div>';
    card += '</div>';
    
    // Badge stato
    const badgeClass = p.aggregato ? '' : (p.stato === 'Attivo' ? 'badge-green' : 'badge-red');
    const badgeStyle = p.aggregato ? 'background:#F39C12;color:white;' : '';
    const badgeText = p.aggregato ? 'AGG' : (p.stato || 'Attivo');
    card += '<span class="badge ' + badgeClass + '" style="font-size:11px;padding:4px 10px;border-radius:12px;' + badgeStyle + '">' + badgeText + '</span>';
    
    // Bottone rimanda per aggregati (solo admin)
    if (p.aggregato && isAdminMode && !isSelectionMode) {
      card += '<button class="btn-disaggrega" data-pid="' + p.id + '" style="font-size:10px;padding:4px 8px;background:#E74C3C;color:white;border:none;border-radius:6px;cursor:pointer;margin-left:4px;" title="Rimanda alla categoria originale">✕</button>';
    }
    
    card += '</div>';
    return card;
  }).join('');
}

function attachCardListeners() {
  // Click apertura scheda ora gestito da onclick inline nella card HTML
  // Qui solo logica selezione multipla admin
  document.querySelectorAll('.roster-grid .player-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.tagName === 'BUTTON') return;
      if (e.target.closest('.btn-disaggrega')) return;
      if (isSelectionMode && isAdminMode) {
        e.stopPropagation();
        togglePlayerSelection(card.dataset.pid, card);
      }
    });
  });
  // Disaggrega buttons
  document.querySelectorAll('.btn-disaggrega').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const pid = btn.dataset.pid;
      const p = allPlayers.find(x => x.id === pid);
      if (!await confirm('Rimandare ' + (p ? p.nome + ' ' + p.cognome : '') + ' alla categoria originale?')) return;
      showLoading();
      try {
        await apiFetch('/squadre/' + window.YFM.squadraId + '/disaggrega', { method: 'POST', body: JSON.stringify({ playerIds: [pid] }) });
        loadRoster();
      } catch (err) { alert('Errore: ' + err.message); }
      finally { hideLoading(); }
    });
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

function selectAllPlayers() {
  const activePlayers = allPlayers.filter(p => (p.stato || 'Attivo') !== 'Svincolato');
  if (selectedPlayers.size === activePlayers.length) {
    selectedPlayers.clear();
  } else {
    activePlayers.forEach(p => selectedPlayers.add(p.id));
  }
  loadRoster();
}

function togglePlayerSelection(pid, card) {
  if (selectedPlayers.has(pid)) {
    selectedPlayers.delete(pid);
    card.style.border = '2px solid transparent';
    card.style.background = 'white';
    const cb = card.querySelector('.sel-checkbox');
    if (cb) { cb.style.border = '2px solid #ccc'; cb.style.background = 'white'; cb.innerHTML = ''; }
  } else {
    selectedPlayers.add(pid);
    card.style.border = '2px solid var(--primary,#667eea)';
    card.style.background = 'rgba(102,126,234,0.1)';
    const cb = card.querySelector('.sel-checkbox');
    if (cb) { cb.style.border = '2px solid var(--primary,#667eea)'; cb.style.background = 'var(--primary,#667eea)'; cb.innerHTML = '<span style="color:white;font-size:14px;">✓</span>'; }
  }
  updateBulkButtons();
}

function updateBulkButtons() {
  const deleteBtn = document.getElementById('btnDeleteSelected');
  const moveBtn = document.getElementById('btnMoveSelected');
  const svincolaBtn = document.getElementById('btnSvincolaSelected');
  if (deleteBtn) {
    deleteBtn.innerHTML = '🗑️ Elimina (' + selectedPlayers.size + ')';
    deleteBtn.disabled = selectedPlayers.size === 0;
  }
  if (moveBtn) {
    moveBtn.innerHTML = '↗️ Sposta (' + selectedPlayers.size + ')';
    moveBtn.disabled = selectedPlayers.size === 0;
  }
  if (svincolaBtn) {
    svincolaBtn.innerHTML = '📋 Svincola (' + selectedPlayers.size + ')';
    svincolaBtn.disabled = selectedPlayers.size === 0;
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
  if (!await confirm('Eliminare ' + selectedPlayers.size + ' giocatori dalla rosa?')) return;
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

async function svincolaSelectedPlayers() {
  if (selectedPlayers.size === 0) return;
  if (!await confirm('Svincolare ' + selectedPlayers.size + ' giocatori? Resteranno nello storico e potranno essere riattivati.')) return;
  showLoading();
  try {
    await apiFetch('/squadre/' + window.YFM.squadraId + '/svincola', {
      method: 'POST',
      body: JSON.stringify({ playerIds: Array.from(selectedPlayers) })
    });
    selectedPlayers.clear();
    isSelectionMode = false;
    loadRoster();
  } catch (e) {
    alert('Errore: ' + e.message);
  } finally {
    hideLoading();
  }
}

function renderSvincolatiSection() {
  if (!isAdminMode) return '';
  const cards = svincolati.sort((a, b) => a.cognome.localeCompare(b.cognome)).map(p => {
    return '<div class="card" style="padding:12px 16px;display:flex;align-items:center;gap:12px;opacity:0.7;">' +
      '<div style="background:#999;width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:600;color:white;">' + (p.nome || '')[0] + (p.cognome || '')[0] + '</div>' +
      '<div style="flex:1;min-width:0;"><div style="font-weight:600;font-size:14px;">' + p.nome + ' ' + p.cognome + '</div><div style="font-size:12px;color:#888;">' + (p.ruolo || '-') + '</div></div>' +
      '<button class="btn btn-secondary btn-riattiva" data-pid="' + p.id + '" style="font-size:11px;padding:6px 12px;">\u21A9 Riattiva</button>' +
      '</div>';
  }).join('');
  return '<div style="margin-top:30px;border-top:2px dashed #ddd;padding-top:20px;">' +
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">' +
    '<div id="btnToggleSvincolati" style="cursor:pointer;display:flex;align-items:center;gap:8px;">' +
    '<span id="svincolatiArrow" style="font-size:12px;color:#888;">\u25B6</span>' +
    '<h3 style="font-size:15px;font-weight:600;color:#888;margin:0;">Svincolati (' + svincolati.length + ')</h3></div>' +
    '<button class="btn btn-secondary" id="btnRecuperaSvincolato" data-help="roster.btnRiattiva" style="font-size:12px;padding:6px 12px;">\uD83D\uDD0D Recupera</button>' +
    '<button class="btn btn-secondary" id="btnAggregaPlayer" data-help="roster.btnAggrega" style="font-size:12px;padding:6px 12px;background:#F39C12;color:white;border:none;">\u2795 Aggrega</button></div>' +
    (svincolati.length > 0 ? '<div id="svincolatiContent" style="display:none;"><div class="roster-grid">' + cards + '</div></div>' : '<div id="svincolatiContent" style="display:none;"><p style="color:#888;font-size:13px;">Nessuno svincolato in questa stagione</p></div>') +
    '</div>';
}

async function openAggregaModal() {
  showLoading('Ricerca giocatori aggregabili...');
  let disponibili = [];
  try {
    disponibili = await apiFetch('/squadre/' + window.YFM.squadraId + '/aggregabili');
  } catch (e) {
    alert('Errore: ' + e.message);
    hideLoading();
    return;
  }
  hideLoading();

  if (disponibili.length === 0) {
    alert('Nessun giocatore disponibile per aggregazione (servono giocatori pi\u00F9 giovani in altre categorie della stessa stagione).');
    return;
  }

  // Ordina per ruolo poi cognome
  const ruoloOrd = { Portiere: 0, Difensore: 1, Centrocampista: 2, Attaccante: 3, '-': 4 };
  disponibili.sort((a, b) => {
    const ra = ruoloOrd[a.ruolo] ?? 4;
    const rb = ruoloOrd[b.ruolo] ?? 4;
    if (ra !== rb) return ra - rb;
    return a.cognome.localeCompare(b.cognome);
  });

  let sortMode = 'ruolo'; // 'ruolo' o 'alfa'
  const sortDisponibili = () => {
    if (sortMode === 'ruolo') {
      disponibili.sort((a, b) => {
        const ra = ruoloOrd[a.ruolo] ?? 4;
        const rb = ruoloOrd[b.ruolo] ?? 4;
        if (ra !== rb) return ra - rb;
        return a.cognome.localeCompare(b.cognome);
      });
    } else {
      disponibili.sort((a, b) => a.cognome.localeCompare(b.cognome));
    }
  };

  const modal = document.createElement('div');
  modal.style = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:1000;';
  modal.innerHTML = '<div style="background:white;border-radius:12px;max-width:500px;width:90%;max-height:80vh;display:flex;flex-direction:column;">' +
    '<div style="padding:16px 20px;border-bottom:1px solid #eee;"><h2 style="margin:0;font-size:18px;">\u2795 Aggrega Giocatore</h2><p style="margin:4px 0 0;font-size:12px;color:#888;">Giocatori da categorie inferiori della stessa stagione</p>' +
    '<div style="margin-top:10px;display:flex;gap:6px;"><button class="aggSortBtn" data-sort="ruolo" style="padding:4px 10px;border-radius:6px;font-size:11px;cursor:pointer;border:1px solid #667eea;background:#667eea;color:white;">Per Ruolo</button><button class="aggSortBtn" data-sort="alfa" style="padding:4px 10px;border-radius:6px;font-size:11px;cursor:pointer;border:1px solid #ddd;background:white;color:#333;">A-Z</button></div></div>' +
    '<div id="aggListContainer" style="padding:16px 20px;overflow-y:auto;flex:1;"></div>' +
    '<div style="padding:12px 20px;border-top:1px solid #eee;display:flex;justify-content:flex-end;gap:10px;">' +
    '<button id="aggCancel" class="btn btn-secondary" style="padding:10px 16px;">Annulla</button>' +
    '<button id="aggConfirm" class="btn btn-primary" style="padding:10px 16px;background:#F39C12;color:white;border:none;" disabled>Aggrega</button></div></div>';
  document.body.appendChild(modal);

  const renderAggList = () => {
    const container = modal.querySelector('#aggListContainer');
    container.innerHTML = disponibili.map(p => {
      const nascita = p.data_nascita ? p.data_nascita.split('T')[0].split('-').reverse().join('/') : '-';
      return '<label style="display:flex;align-items:center;gap:10px;padding:10px;border-radius:8px;cursor:pointer;margin-bottom:4px;background:#f8f9fa;">' +
        '<input type="checkbox" class="aggCheck" value="' + p.id + '">' +
        '<div style="flex:1;"><div style="font-weight:600;font-size:14px;">' + p.cognome + ' ' + p.nome + '</div>' +
        '<div style="font-size:11px;color:#888;">' + nascita + ' \u2022 ' + p.ruolo + ' \u2022 ' + p.categoria_origine + '</div></div></label>';
    }).join('');
    container.querySelectorAll('.aggCheck').forEach(cb => {
      cb.addEventListener('change', () => {
        document.getElementById('aggConfirm').disabled = !modal.querySelector('.aggCheck:checked');
      });
    });
  };
  renderAggList();

  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  document.getElementById('aggCancel').addEventListener('click', () => modal.remove());

  // Sort toggle
  modal.querySelectorAll('.aggSortBtn').forEach(btn => {
    btn.addEventListener('click', () => {
      // Salva selezioni correnti
      const checked = new Set([...modal.querySelectorAll('.aggCheck:checked')].map(c => c.value));
      sortMode = btn.dataset.sort;
      sortDisponibili();
      renderAggList();
      // Ripristina selezioni
      modal.querySelectorAll('.aggCheck').forEach(cb => { if (checked.has(cb.value)) cb.checked = true; });
      document.getElementById('aggConfirm').disabled = !modal.querySelector('.aggCheck:checked');
      modal.querySelectorAll('.aggSortBtn').forEach(b => {
        const active = b.dataset.sort === sortMode;
        b.style.background = active ? '#667eea' : 'white';
        b.style.color = active ? 'white' : '#333';
        b.style.border = active ? '1px solid #667eea' : '1px solid #ddd';
      });
    });
  });

  document.getElementById('aggConfirm').addEventListener('click', async () => {
    const ids = [...modal.querySelectorAll('.aggCheck:checked')].map(c => c.value);
    if (!ids.length) return;
    showLoading();
    try {
      await apiFetch('/squadre/' + window.YFM.squadraId + '/aggrega', {
        method: 'POST',
        body: JSON.stringify({ playerIds: ids })
      });
      modal.remove();
      loadRoster();
    } catch (e) {
      alert('Errore: ' + e.message);
    } finally {
      hideLoading();
    }
  });
}

async function openRecuperaModal() {
  showLoading('Ricerca svincolati...');
  let disponibili = [];
  try {
    disponibili = await apiFetch('/squadre/' + window.YFM.squadraId + '/svincolati-workspace');
  } catch (e) {
    alert('Errore: ' + e.message);
    hideLoading();
    return;
  }
  hideLoading();

  if (disponibili.length === 0) {
    alert('Nessun giocatore svincolato disponibile da recuperare.');
    return;
  }

  const modal = document.createElement('div');
  modal.style = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:1000;';
  modal.innerHTML = '<div style="background:white;border-radius:12px;max-width:500px;width:90%;max-height:80vh;display:flex;flex-direction:column;">' +
    '<div style="padding:16px 20px;border-bottom:1px solid #eee;"><h2 style="margin:0;font-size:18px;">\uD83D\uDD0D Recupera Giocatore Svincolato</h2><p style="margin:4px 0 0;font-size:12px;color:#888;">Giocatori svincolati da altre stagioni/categorie</p></div>' +
    '<div style="padding:16px 20px;overflow-y:auto;flex:1;">' +
    disponibili.map(p => {
      const nascita = p.data_nascita ? p.data_nascita.split('T')[0].split('-').reverse().join('/') : '-';
      return '<label style="display:flex;align-items:center;gap:10px;padding:10px;border-radius:8px;cursor:pointer;margin-bottom:4px;background:#f8f9fa;">' +
        '<input type="checkbox" class="recCheck" value="' + p.id + '">' +
        '<div style="flex:1;"><div style="font-weight:600;font-size:14px;">' + p.cognome + ' ' + p.nome + '</div>' +
        '<div style="font-size:11px;color:#888;">' + nascita + ' \u2022 ex ' + p.ultima_squadra + '</div></div></label>';
    }).join('') +
    '</div>' +
    '<div style="padding:12px 20px;border-top:1px solid #eee;display:flex;justify-content:flex-end;gap:10px;">' +
    '<button id="recCancel" class="btn btn-secondary" style="padding:10px 16px;">Annulla</button>' +
    '<button id="recConfirm" class="btn btn-primary" style="padding:10px 16px;background:#667eea;color:white;border:none;" disabled>Recupera</button></div></div>';
  document.body.appendChild(modal);

  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  document.getElementById('recCancel').addEventListener('click', () => modal.remove());

  modal.querySelectorAll('.recCheck').forEach(cb => {
    cb.addEventListener('change', () => {
      document.getElementById('recConfirm').disabled = !modal.querySelector('.recCheck:checked');
    });
  });

  document.getElementById('recConfirm').addEventListener('click', async () => {
    const ids = [...modal.querySelectorAll('.recCheck:checked')].map(c => c.value);
    if (!ids.length) return;
    showLoading();
    try {
      await apiFetch('/squadre/' + window.YFM.squadraId + '/recupera', {
        method: 'POST',
        body: JSON.stringify({ playerIds: ids })
      });
      modal.remove();
      loadRoster();
    } catch (e) {
      alert('Errore: ' + e.message);
    } finally {
      hideLoading();
    }
  });
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
  modal.innerHTML = '<div style="background:white;border-radius:12px;max-width:400px;width:90%;"><div style="padding:16px 20px;border-bottom:1px solid #eee;display:flex;justify-content:space-between;align-items:center;"><h2 style="margin:0;">↗️ Sposta Giocatori</h2><button id="moveModalClose" style="background:none;border:none;font-size:24px;cursor:pointer;">×</button></div><div style="padding:20px;"><p style="margin-bottom:12px;"><strong>' + playerIds.length + ' giocatore(i):</strong></p><p style="color:#666;font-size:12px;margin-bottom:16px;">' + playerNames + '</p><div style="display:flex;flex-direction:column;gap:4px;"><label style="font-size:12px;font-weight:600;color:#666;">Sposta nella categoria:</label><select id="targetSquadra" style="padding:8px 12px;border:1px solid #ddd;border-radius:6px;font-size:14px;">' + otherSquadre.map(s => '<option value="' + s.id + '">' + (s.category?.nome || s.nome) + (s._stagione ? ' (' + s._stagione + ')' : '') + '</option>').join('') + '</select></div></div><div style="padding:16px 20px;border-top:1px solid #eee;display:flex;justify-content:flex-end;gap:12px;"><button id="moveModalCancel" class="btn btn-secondary" style="padding:10px 16px;border-radius:8px;cursor:pointer;">Annulla</button><button id="confirmMoveBtn" class="btn btn-primary" style="padding:10px 16px;border-radius:8px;cursor:pointer;background:var(--primary,#667eea);color:white;border:none;">Sposta</button></div></div>';
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
  if (stato === 'Aggregato') f = f.filter(p => p.aggregato);
  else if (stato) f = f.filter(p => p.stato === stato && !p.aggregato);
  
  const ruoli = ['Portiere', 'Difensore', 'Centrocampista', 'Attaccante'];
  ruoli.forEach(r => {
    const grid = document.getElementById('grid' + r);
    if (grid) {
      const filtered = f.filter(p => p.ruolo === r).sort((a, b) => a.cognome.localeCompare(b.cognome));
      grid.innerHTML = renderPlayerCards(filtered);
    }
  });
  // Also update gridNoRole
  const gridNoRole = document.getElementById('gridNoRole');
  if (gridNoRole) {
    const noRoleFiltered = f.filter(p => !p.ruolo || !ruoli.includes(p.ruolo)).sort((a, b) => a.cognome.localeCompare(b.cognome));
    gridNoRole.innerHTML = renderPlayerCards(noRoleFiltered);
  }
  
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
  modal.innerHTML = '<div style="background:white;border-radius:12px;max-width:650px;width:90%;max-height:90vh;overflow-y:auto;"><div style="padding:16px 20px;border-bottom:1px solid #eee;display:flex;justify-content:space-between;align-items:center;"><h2 style="margin:0;">' + (p ? 'Modifica' : 'Nuovo') + ' Calciatore</h2><button id="modalCloseX" style="background:none;border:none;font-size:24px;cursor:pointer;">×</button></div><div style="padding:20px;">' +
    '<div style="font-size:12px;font-weight:700;color:#667eea;margin-bottom:8px;">👥 SQUADRA</div>' +
    '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-bottom:20px;">' +
    '<div><label style="font-size:12px;font-weight:600;color:#666;">Ruolo</label><select id="pfR" style="width:100%;padding:8px 12px;border:1px solid #ddd;border-radius:6px;"><option value=""' + (!p?.ruolo ? ' selected' : '') + '>-- Seleziona --</option><option value="Portiere"' + (p?.ruolo === 'Portiere' ? ' selected' : '') + '>Portiere</option><option value="Difensore"' + (p?.ruolo === 'Difensore' ? ' selected' : '') + '>Difensore</option><option value="Centrocampista"' + (p?.ruolo === 'Centrocampista' ? ' selected' : '') + '>Centrocampista</option><option value="Attaccante"' + (p?.ruolo === 'Attaccante' ? ' selected' : '') + '>Attaccante</option></select></div>' +
    '<div><label style="font-size:12px;font-weight:600;color:#666;">N. Maglia</label><input id="pfM" type="number" value="' + (p ? p.numero_maglia || '' : '') + '" style="width:100%;padding:8px 12px;border:1px solid #ddd;border-radius:6px;"></div></div>' +
    '<div style="font-size:12px;font-weight:700;color:#667eea;margin-bottom:8px;">👤 DATI PERSONALI</div>' +
    '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-bottom:20px;">' +
    '<div><label style="font-size:12px;font-weight:600;color:#666;">Nome *</label><input id="pfN" value="' + (p ? p.nome : '') + '" style="width:100%;padding:8px 12px;border:1px solid #ddd;border-radius:6px;"></div>' +
    '<div><label style="font-size:12px;font-weight:600;color:#666;">Cognome *</label><input id="pfC" value="' + (p ? p.cognome : '') + '" style="width:100%;padding:8px 12px;border:1px solid #ddd;border-radius:6px;"></div>' +
    '<div><label style="font-size:12px;font-weight:600;color:#666;">Data Nascita</label><input id="pfD" type="date" value="' + (p && p.data_nascita ? p.data_nascita.split('T')[0] : '') + '" style="width:100%;padding:8px 12px;border:1px solid #ddd;border-radius:6px;"></div>' +
    '<div><label style="font-size:12px;font-weight:600;color:#666;">Luogo Nascita</label><div style="position:relative;"><input id="pfLN" value="' + (p ? p.luogo_nascita || '' : '') + '" placeholder="Digita comune..." autocomplete="off" style="width:100%;padding:8px 12px;border:1px solid #ddd;border-radius:6px;"><div id="pfLNList" style="display:none;position:absolute;top:100%;left:0;right:0;background:white;border:1px solid #ddd;border-radius:0 0 6px 6px;max-height:150px;overflow-y:auto;z-index:10;box-shadow:0 4px 12px rgba(0,0,0,0.1);"></div></div></div>' +
    '<div><label style="font-size:12px;font-weight:600;color:#666;">Telefono</label><input id="pfTel" value="' + (p ? p.telefono || '' : '') + '" style="width:100%;padding:8px 12px;border:1px solid #ddd;border-radius:6px;"></div>' +
    '<div><label style="font-size:12px;font-weight:600;color:#666;">Email Atleta</label><input id="pfEmail" type="email" value="' + (p ? p.email || '' : '') + '" placeholder="email@esempio.it" style="width:100%;padding:8px 12px;border:1px solid #ddd;border-radius:6px;"></div>' +
    '<div><label style="font-size:12px;font-weight:600;color:#666;">Data Visita Medica</label><input id="pfVM" type="date" value="' + (p && p.data_visita_medica ? p.data_visita_medica.split('T')[0] : '') + '" style="width:100%;padding:8px 12px;border:1px solid #ddd;border-radius:6px;"></div>' +
    '<div><label style="font-size:12px;font-weight:600;color:#666;">Matricola FIGC</label><input id="pfFigc" value="' + (p ? p.matricola_figc || '' : '') + '" style="width:100%;padding:8px 12px;border:1px solid #ddd;border-radius:6px;"></div>' +
    '<div style="grid-column:1/-1;"><label style="font-size:12px;font-weight:600;color:#666;">Codice Fiscale</label><div style="display:flex;gap:8px;"><input id="pfCF" value="' + (p ? p.codice_fiscale || '' : '') + '" maxlength="16" style="flex:1;padding:8px 12px;border:1px solid #ddd;border-radius:6px;text-transform:uppercase;font-family:monospace;"><button type="button" id="pfCalcCF" style="padding:8px 12px;background:#667eea;color:white;border:none;border-radius:6px;cursor:pointer;font-size:11px;white-space:nowrap;">Calcola</button></div></div></div>' +
    '<div style="font-size:12px;font-weight:700;color:#667eea;margin-bottom:8px;margin-top:20px;">👨‍👩‍👦 CONTATTI GENITORI</div>' +
    '<div id="contattiGenitori"></div>' +
    '<button type="button" id="addContatto" style="margin-top:8px;padding:6px 12px;border:1px dashed #667eea;background:none;color:#667eea;border-radius:6px;cursor:pointer;font-size:12px;">+ Aggiungi contatto</button>' +
    '<div style="font-size:12px;font-weight:700;color:#667eea;margin-bottom:8px;margin-top:20px;">📄 DOCUMENTAZIONE</div>' +
    '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;">' +
    '<div><label style="font-size:12px;font-weight:600;color:#666;">Tipo Doc</label><input id="pfTD" value="' + (p ? p.tipo_documento || '' : '') + '" style="width:100%;padding:8px 12px;border:1px solid #ddd;border-radius:6px;"></div>' +
    '<div><label style="font-size:12px;font-weight:600;color:#666;">N. Doc</label><input id="pfND" value="' + (p ? p.numero_documento || '' : '') + '" style="width:100%;padding:8px 12px;border:1px solid #ddd;border-radius:6px;"></div>' +
    '<div style="grid-column:1/-1;"><label style="font-size:12px;font-weight:600;color:#666;">Rilasciato Da</label><input id="pfRD" value="' + (p ? p.rilasciato_da || '' : '') + '" style="width:100%;padding:8px 12px;border:1px solid #ddd;border-radius:6px;"></div></div>' +
    '</div><div style="padding:16px 20px;border-top:1px solid #eee;display:flex;justify-content:flex-end;gap:12px;"><button id="btnCancelForm" class="btn btn-secondary" style="padding:10px 16px;border-radius:8px;cursor:pointer;background:#f0f0f0;border:none;">Annulla</button><button id="saveBtn" class="btn btn-primary" style="padding:10px 16px;border-radius:8px;cursor:pointer;background:var(--primary,#667eea);color:white;border:none;">Salva</button></div></div>';
  document.body.appendChild(modal);
  
  // --- Contatti genitori logic ---
  const contattiContainer = document.getElementById('contattiGenitori');
  const existingContatti = (p && p.contatti_genitori) || [];
  function addContattoRow(c = {}) {
    const row = document.createElement('div');
    row.style = 'display:grid;grid-template-columns:auto 1fr 1fr 1fr auto;gap:8px;align-items:center;margin-bottom:8px;';
    row.innerHTML = `<select class="cg-tipo" style="padding:8px;border:1px solid #ddd;border-radius:6px;font-size:12px;"><option value="Padre" ${c.tipo === 'Padre' ? 'selected' : ''}>Padre</option><option value="Madre" ${c.tipo === 'Madre' ? 'selected' : ''}>Madre</option><option value="Tutore" ${c.tipo === 'Tutore' ? 'selected' : ''}>Tutore</option></select><input class="cg-nome" placeholder="Nome" value="${c.nome || ''}" style="padding:8px 12px;border:1px solid #ddd;border-radius:6px;"><input class="cg-tel" placeholder="Cellulare" value="${c.telefono || ''}" style="padding:8px 12px;border:1px solid #ddd;border-radius:6px;"><input class="cg-email" placeholder="Email" value="${c.email || ''}" type="email" style="padding:8px 12px;border:1px solid #ddd;border-radius:6px;"><button type="button" style="background:none;border:none;color:#E74C3C;font-size:18px;cursor:pointer;">×</button>`;
    row.querySelector('button').onclick = () => row.remove();
    contattiContainer.appendChild(row);
  }
  existingContatti.forEach(c => addContattoRow(c));
  document.getElementById('addContatto').onclick = () => addContattoRow();
  function getContatti() {
    return [...contattiContainer.querySelectorAll('div')].map(row => {
      const tipo = row.querySelector('.cg-tipo')?.value;
      const nome = row.querySelector('.cg-nome')?.value?.trim();
      const telefono = row.querySelector('.cg-tel')?.value?.trim();
      const email = row.querySelector('.cg-email')?.value?.trim();
      return (nome || telefono || email) ? { tipo, nome, telefono, email } : null;
    }).filter(Boolean);
  }
  // --- Fine contatti genitori ---
  
  // --- Autocomplete luogo nascita + calcolo CF ---
  let selectedBelfiore = '';
  const lnInput = document.getElementById('pfLN');
  const lnList = document.getElementById('pfLNList');
  let lnTimeout = null;
  lnInput.addEventListener('input', () => {
    clearTimeout(lnTimeout);
    selectedBelfiore = '';
    lnTimeout = setTimeout(async () => {
      const results = await cercaComune(lnInput.value);
      if (results.length === 0) { lnList.style.display = 'none'; return; }
      lnList.innerHTML = results.map(c => `<div data-codice="${c.codice}" style="padding:8px 12px;cursor:pointer;font-size:12px;border-bottom:1px solid #f5f5f5;">${c.nome} (${c.provincia})</div>`).join('');
      lnList.style.display = 'block';
      lnList.querySelectorAll('div').forEach(el => el.addEventListener('click', () => {
        lnInput.value = el.textContent;
        selectedBelfiore = el.dataset.codice;
        lnList.style.display = 'none';
      }));
    }, 200);
  });
  document.addEventListener('click', e => { if (!lnInput.contains(e.target) && !lnList.contains(e.target)) lnList.style.display = 'none'; });

  document.getElementById('pfCalcCF').addEventListener('click', async () => {
    const nome = document.getElementById('pfN').value.trim();
    const cognome = document.getElementById('pfC').value.trim();
    const data = document.getElementById('pfD').value;
    if (!nome || !cognome || !data) { alert('Compila Nome, Cognome e Data Nascita per calcolare il CF'); return; }
    let codice = selectedBelfiore;
    if (!codice) {
      const results = await cercaComune(lnInput.value);
      if (results.length > 0) { codice = results[0].codice; lnInput.value = results[0].nome + ' (' + results[0].provincia + ')'; selectedBelfiore = codice; }
    }
    if (!codice) { alert('Seleziona il Luogo di Nascita per calcolare il CF'); return; }
    const cf = calcolaCodiceFiscale(cognome, nome, data, 'M', codice);
    document.getElementById('pfCF').value = cf;
  });
  // --- Fine CF ---

  const closeModal = () => modal.remove();
  
  document.getElementById('modalCloseX').addEventListener('click', closeModal);
  document.getElementById('btnCancelForm').addEventListener('click', closeModal);
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
  
  document.getElementById('saveBtn').addEventListener('click', async () => {
    let nome = document.getElementById('pfN').value.trim().replace(/\s+/g, ' ');
    let cognome = document.getElementById('pfC').value.trim().replace(/\s+/g, ' ');
    if (!nome || !cognome) { alert('Nome e Cognome sono obbligatori'); return; }
    // Normalizza: prima lettera maiuscola
    nome = nome.replace(/\b\w+/g, w => w[0].toUpperCase() + w.slice(1).toLowerCase());
    cognome = cognome.replace(/\b\w+/g, w => w[0].toUpperCase() + w.slice(1).toLowerCase());
    // Validazione anno nascita rispetto alla categoria
    const dataNascita = document.getElementById('pfD').value || null;
    if (dataNascita) {
      const year = parseInt(dataNascita.split('-')[0]);
      const squadra = window.YFM.getSquadra();
      const annoDa = squadra?.category?.anno_da;
      if (annoDa && (year < annoDa || year > annoDa + 2)) {
        alert(`Anno di nascita ${year} non compatibile con ${squadra.category.nome} (${annoDa}-${annoDa + 2})`);
        return;
      }
    }
    const d = {
      nome,
      cognome,
      data_nascita: dataNascita,
      luogo_nascita: document.getElementById('pfLN').value || null,
      codice_fiscale: document.getElementById('pfCF').value.toUpperCase() || null,
      telefono: document.getElementById('pfTel').value || null,
      email: document.getElementById('pfEmail').value || null,
      data_visita_medica: document.getElementById('pfVM').value || null,
      ruolo: document.getElementById('pfR').value || null,
      numero_maglia: document.getElementById('pfM').value ? parseInt(document.getElementById('pfM').value) : null,
      matricola_figc: document.getElementById('pfFigc').value || null,
      tipo_documento: document.getElementById('pfTD').value || null,
      numero_documento: document.getElementById('pfND').value || null,
      rilasciato_da: document.getElementById('pfRD').value || null,
      contatti_genitori: getContatti()
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
window.YFM.openImportXlsModal = openImportXlsModal;

// === IMPORT ROSA DA XLS ===
async function openImportXlsModal() {
  const isAdmin = window.YFM.isAdmin();
  const allSquadre = window.YFM.allSquadre || [];
  
  // Build team selector (admin vede tutte, allenatore solo la sua)
  let teamOptions = '';
  if (isAdmin && allSquadre.length > 1) {
    teamOptions = allSquadre.map(s => {
      const label = s.category?.nome || s.nome;
      const stagione = s._stagione ? ` (${s._stagione})` : '';
      return `<option value="${s.id}" ${s.id === window.YFM.squadraId ? 'selected' : ''}>${label}${stagione}</option>`;
    }).join('');
  }

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'importXlsModal';
  modal.innerHTML = `
    <div class="modal-content" style="max-width:800px;max-height:90vh;overflow-y:auto;">
      <div class="modal-header"><h2>📥 Importa Rosa da XLS</h2><button class="modal-close" id="closeImportXls">&times;</button></div>
      <div class="modal-body">
        <div id="importStep1">
          <p style="margin-bottom:12px;color:#666;">Carica il tabulato atleti in formato Excel (.xlsx). I giocatori verranno raggruppati per anno di nascita.</p>
          <input type="file" id="xlsFileInput" accept=".xlsx,.xls" style="display:none;">
          <div id="xlsDropZone" style="border:2px dashed #667eea;border-radius:12px;padding:32px 20px;text-align:center;cursor:pointer;background:#f8f9ff;transition:all .2s;margin-bottom:16px;">
            <div style="font-size:36px;margin-bottom:8px;">📂</div>
            <div style="font-size:14px;font-weight:600;color:#333;">Clicca o trascina il file qui</div>
            <div style="font-size:12px;color:#888;margin-top:4px;">Formato accettato: .xlsx / .xls</div>
            <div id="xlsFileName" style="display:none;margin-top:12px;padding:8px 12px;background:#e8f5e9;border-radius:8px;font-size:12px;color:#2e7d32;font-weight:500;"></div>
          </div>
          ${teamOptions ? `<div style="margin-bottom:16px;"><label style="font-weight:600;">Squadra destinazione:</label><select id="importTeamSelect" class="filter-select" style="margin-top:4px;">${teamOptions}</select></div>` : ''}
          <button class="btn btn-primary" id="btnParseXls" disabled>Analizza file</button>
        </div>
        <div id="importStep2" style="display:none;"></div>
      </div>
    </div>`;
  document.body.appendChild(modal);

  document.getElementById('closeImportXls').onclick = () => modal.remove();
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

  const fileInput = document.getElementById('xlsFileInput');
  const btnParse = document.getElementById('btnParseXls');
  const dropZone = document.getElementById('xlsDropZone');
  const fileNameEl = document.getElementById('xlsFileName');

  dropZone.addEventListener('click', () => fileInput.click());
  dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.style.borderColor = '#4338ca'; dropZone.style.background = '#eef2ff'; });
  dropZone.addEventListener('dragleave', () => { dropZone.style.borderColor = '#667eea'; dropZone.style.background = '#f8f9ff'; });
  dropZone.addEventListener('drop', e => { e.preventDefault(); dropZone.style.borderColor = '#667eea'; dropZone.style.background = '#f8f9ff'; if (e.dataTransfer.files.length) { fileInput.files = e.dataTransfer.files; fileInput.dispatchEvent(new Event('change')); } });
  fileInput.onchange = () => {
    btnParse.disabled = !fileInput.files.length;
    if (fileInput.files.length) { fileNameEl.textContent = '✅ ' + fileInput.files[0].name; fileNameEl.style.display = 'block'; }
    else { fileNameEl.style.display = 'none'; }
  };

  btnParse.onclick = async () => {
    const file = fileInput.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);

    btnParse.disabled = true;
    btnParse.textContent = 'Analisi in corso...';
    try {
      const resp = await fetch(API_BASE + '/roster/parse-xls', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + (localStorage.getItem('yfm_token') || '') },
        body: formData
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Errore parsing');
      renderImportPreview(data, modal);
    } catch (e) {
      alert('Errore: ' + e.message);
      btnParse.disabled = false;
      btnParse.textContent = 'Analizza file';
    }
  };
}

function renderImportPreview(data, modal) {
  const step2 = document.getElementById('importStep2');
  document.getElementById('importStep1').style.display = 'none';
  step2.style.display = 'block';

  const years = Object.keys(data.byYear).filter(y => y !== 'sconosciuto').sort();
  
  // Calcola anno fine stagione: dalla stagione selezionata o dalla data corrente
  // Stagione calcistica: 01/07 → 30/06. Dopo il 30/06 si è già nella nuova stagione.
  let seasonEndYear;
  const squadra = window.YFM.getSquadra();
  const seasonName = squadra._stagione || ((window.YFM.accessibleSeasons || []).find(s => s.id === window.YFM.currentSeasonId) || {}).nome || '';
  const yearMatch = seasonName.match(/(\d{4})\/(\d{2,4})/);
  if (yearMatch) {
    seasonEndYear = yearMatch[2].length === 2 ? 2000 + parseInt(yearMatch[2]) : parseInt(yearMatch[2]);
  } else {
    // Fallback: se oggi >= 01/07, siamo nella stagione che finisce l'anno prossimo
    const now = new Date();
    seasonEndYear = now.getMonth() >= 6 ? now.getFullYear() + 1 : now.getFullYear();
  }
  const suggestCategory = (year) => {
    const age = seasonEndYear - parseInt(year);
    return `Under ${age}`;
  };

  let html = `<p style="margin-bottom:12px;"><strong>${data.total}</strong> giocatori trovati, raggruppati per anno di nascita:</p>`;
  html += `<div style="margin-bottom:16px;">`;
  
  years.forEach(y => {
    const count = data.byYear[y].length;
    const cat = suggestCategory(y);
    html += `<label style="display:flex;align-items:center;gap:8px;padding:8px;border-radius:8px;cursor:pointer;margin-bottom:4px;background:#f8f9fa;">
      <input type="checkbox" class="yearCheck" value="${y}"> 
      <strong>${y}</strong> — ${count} giocatori <span style="color:#667eea;">(${cat})</span>
    </label>`;
  });
  html += `</div>`;
  
  html += `<div id="importPreviewTable" style="margin-bottom:16px;"></div>`;
  html += `<div style="display:flex;gap:8px;justify-content:flex-end;">
    <button class="btn btn-secondary" id="btnBackStep1">← Indietro</button>
    <button class="btn btn-primary" id="btnConfirmImport" disabled>Importa selezionati</button>
  </div>`;
  
  step2.innerHTML = html;

  // Show preview when years are checked
  const checkboxes = step2.querySelectorAll('.yearCheck');
  checkboxes.forEach(cb => {
    cb.onchange = () => {
      const selected = [...step2.querySelectorAll('.yearCheck:checked')].map(c => c.value);
      const players = selected.flatMap(y => data.byYear[y]);
      document.getElementById('btnConfirmImport').disabled = players.length === 0;
      
      if (players.length > 0) {
        let table = `<div style="max-height:300px;overflow-y:auto;border:1px solid #eee;border-radius:8px;"><table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead><tr style="background:#f0f0f0;position:sticky;top:0;"><th style="padding:6px;text-align:left;">Cognome</th><th style="padding:6px;text-align:left;">Nome</th><th style="padding:6px;">Nascita</th><th style="padding:6px;">CF</th><th style="padding:6px;">Matricola</th></tr></thead><tbody>`;
        players.forEach(p => {
          const cfBadge = p.codice_fiscale ? `<span title="${p.codice_fiscale}" style="color:#27AE60;font-weight:600;">✓</span>` : '<span style="color:#ccc;">—</span>';
          table += `<tr style="border-bottom:1px solid #f0f0f0;"><td style="padding:6px;">${p.cognome}</td><td style="padding:6px;">${p.nome}</td><td style="padding:6px;text-align:center;">${p.data_nascita || '-'}</td><td style="padding:6px;text-align:center;">${cfBadge}</td><td style="padding:6px;text-align:center;">${p.matricola || '-'}</td></tr>`;
        });
        table += `</tbody></table></div>`;
        const withCF = players.filter(p => p.codice_fiscale).length;
        const cfNote = withCF > 0 ? `<span style="color:#27AE60;font-size:12px;"> · ${withCF} con CF (matching univoco)</span>` : '';
        document.getElementById('importPreviewTable').innerHTML = `<p style="margin-bottom:8px;"><strong>${players.length}</strong> giocatori da importare${cfNote}:</p>` + table;
      } else {
        document.getElementById('importPreviewTable').innerHTML = '';
      }
    };
  });

  document.getElementById('btnBackStep1').onclick = () => {
    step2.style.display = 'none';
    document.getElementById('importStep1').style.display = 'block';
  };

  document.getElementById('btnConfirmImport').onclick = async () => {
    const selected = [...step2.querySelectorAll('.yearCheck:checked')].map(c => c.value);
    const players = selected.flatMap(y => data.byYear[y]);
    const teamId = document.getElementById('importTeamSelect')?.value || window.YFM.squadraId;

    const btn = document.getElementById('btnConfirmImport');
    btn.disabled = true;
    btn.textContent = 'Importazione...';
    
    try {
      const resp = await apiFetch('/roster/import-xls', {
        method: 'POST',
        body: JSON.stringify({ players, teamId })
      });
      modal.remove();
      alert(`✅ Importazione completata!\n${resp.imported} importati, ${resp.skipped} già presenti/saltati`);
      loadRoster();
    } catch (e) {
      alert('Errore: ' + e.message);
      btn.disabled = false;
      btn.textContent = 'Importa selezionati';
    }
  };
}

function openImportTcModal() {
  const teamId = window.YFM.squadraId;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-content" style="max-width:600px;max-height:90vh;overflow-y:auto;">
      <h2 style="margin-bottom:16px;">📋 Import Rosa</h2>
      <div style="padding:14px;background:#f0f7ff;border-radius:10px;border:1px solid #b3d4fc;">
        <p style="font-size:13px;font-weight:600;margin:0 0 8px 0;">Come funziona</p>
        <ol style="font-size:12px;color:#444;margin:0 0 12px 16px;line-height:1.8;">
          <li>Apri la pagina Rosa della squadra su Tuttocampo (o sito simile)</li>
          <li>Seleziona la tabella giocatori e copia (Ctrl+C)</li>
          <li>Incolla qui sotto (Ctrl+V)</li>
        </ol>
        <div style="font-size:11px;color:#666;background:#fff;border-radius:8px;padding:10px;border:1px solid #e0e0e0;margin-bottom:12px;">
          <p style="margin:0 0 4px;font-weight:600;">Formato riconosciuto:</p>
          <code style="font-size:10px;line-height:1.6;display:block;white-space:pre;overflow-x:auto;">Cognome Nome  [Cognome Nome(num)]  DD-MM-YYYY  POR/DIF/CEN/ATT  [Gol  Pres  Gialli  Rossi]</code>
          <p style="margin:6px 0 0;font-size:10px;color:#888;">I campi tra [ ] sono opzionali. Separatori: tab o spazi multipli.</p>
        </div>
        <textarea id="tcTextFallback" rows="6" placeholder="Incolla qui il testo copiato dalla pagina Rosa..." style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:12px;resize:vertical;font-family:monospace;box-sizing:border-box;"></textarea>
        <button id="tcParseTextBtn" class="btn btn-primary" style="margin-top:10px;width:100%;">🔍 Analizza testo</button>
      </div>
      <div id="tcPreview" style="margin-top:12px;"></div>
      <div style="display:flex;gap:10px;margin-top:16px;">
        <button class="btn btn-secondary" id="tcCloseBtn" style="flex:1;">Chiudi</button>
        <button class="btn btn-primary" id="tcImportBtn" style="flex:1;display:none;">Importa selezionati</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  document.getElementById('tcCloseBtn').onclick = () => overlay.remove();
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

  let fetchedPlayers = [];

  document.getElementById('tcParseTextBtn').onclick = async () => {
    const text = document.getElementById('tcTextFallback').value.trim();
    if (!text || text.length < 20) { alert('Testo troppo corto. Copia più contenuto dalla pagina.'); return; }
    const btn = document.getElementById('tcParseTextBtn');
    btn.disabled = true; btn.textContent = '⏳ Analisi...';
    try {
      const isHtml = text.includes('<') && text.includes('>');
      const endpoint = isHtml ? 'parse-html-tuttocampo' : 'parse-text-tuttocampo';
      const resp = await fetch(`${API_BASE}/roster/${endpoint}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('yfm_token')}` },
        body: JSON.stringify(isHtml ? { html: text } : { text })
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error);
      fetchedPlayers = data.players;
      const hs = data.hasStats;

      document.getElementById('tcPreview').innerHTML = `<p style="font-weight:600;margin-bottom:8px;">📋 ${fetchedPlayers.length} giocatori trovati</p>
        <div style="max-height:300px;overflow-y:auto;border:1px solid #eee;border-radius:8px;padding:8px;">
        <table style="width:100%;font-size:12px;border-collapse:collapse;">
          <thead><tr style="border-bottom:2px solid #eee;text-align:left;">
            <th style="padding:4px;"></th><th style="padding:4px;">Giocatore</th><th style="padding:4px;">Nascita</th><th style="padding:4px;">Ruolo</th>
            ${hs ? '<th style="padding:4px;color:#888;">G</th><th style="padding:4px;color:#888;">P</th>' : ''}
          </tr></thead><tbody>
          ${fetchedPlayers.map((p, i) => `<tr style="border-bottom:1px solid #f5f5f5;">
            <td style="padding:4px;"><input type="checkbox" checked data-idx="${i}"></td>
            <td style="padding:4px;font-weight:500;">${p.cognome} ${p.nome}${p.numero_maglia ? ` <span style="color:#888;font-size:10px;">(${p.numero_maglia})</span>` : ''}</td>
            <td style="padding:4px;color:#888;">${p.data_nascita || '-'}</td>
            <td style="padding:4px;color:#888;">${p.ruolo || '?'}</td>
            ${hs ? `<td style="padding:4px;color:#aaa;">${p.gol ?? '-'}</td><td style="padding:4px;color:#aaa;">${p.presenze ?? '-'}</td>` : ''}
          </tr>`).join('')}
          </tbody></table>
        </div>
        ${hs ? '<p style="font-size:11px;color:#999;margin-top:6px;">ℹ️ Gol e presenze mostrati come riferimento — le statistiche reali vengono tracciate dal Match Center.</p>' : ''}`;
      document.getElementById('tcImportBtn').style.display = 'block';
    } catch (e) {
      alert('❌ ' + e.message);
    }
    btn.disabled = false; btn.textContent = '🔍 Analizza testo';
  };

  document.getElementById('tcImportBtn').onclick = async () => {
    const checked = [...document.querySelectorAll('#tcPreview input[type=checkbox]:checked')].map(c => parseInt(c.dataset.idx));
    const selected = checked.map(i => {
      const { cognome, nome, data_nascita, ruolo, numero_maglia } = fetchedPlayers[i];
      return { cognome, nome, data_nascita, ruolo, numero_maglia };
    });
    if (!selected.length) return;
    const btn = document.getElementById('tcImportBtn');
    btn.disabled = true; btn.textContent = '⏳ Importazione...';
    try {
      const resp = await fetch(`${API_BASE}/roster/import-tuttocampo`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('yfm_token')}` },
        body: JSON.stringify({ players: selected, teamId })
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error);
      alert(`✅ Importati: ${data.imported}, Già presenti: ${data.skipped}`);
      overlay.remove();
      loadRoster();
    } catch (err) {
      alert('❌ Errore: ' + err.message);
      btn.disabled = false; btn.textContent = 'Importa selezionati';
    }
  };
}
