// ============================================
// YOUTH FOOTBALL MANAGER - Frontend App v2.2
// ============================================

const API_BASE = 'https://youth-football-manager.vercel.app/api';
const WS_ID = '11111111-1111-1111-1111-111111111111';
const SQUADRA_ID = '33333333-3333-3333-3333-333333333333';

let currentPage = 'dashboard';
let allPlayers = [];
let allMatches = [];

// ============================================
// INIT
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  setupMobileMenu();
  loadDashboard();
  loadWorkspaceInfo();
});

function setupNavigation() {
  document.querySelectorAll('.sidebar-nav a').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelectorAll('.sidebar-nav a').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      currentPage = link.dataset.page;
      navigateTo(currentPage);
    });
  });
}

function setupMobileMenu() {
  document.getElementById('menuBtn').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });
}

function navigateTo(page) {
  const container = document.getElementById('pageContent');
  container.innerHTML = '<div class="loading"><div class="spinner"></div>Caricamento...</div>';
  switch(page) {
    case 'dashboard': loadDashboard(); break;
    case 'roster': loadRoster(); break;
    case 'calendar': loadCalendar(); break;
    case 'reports': loadReports(); break;
    case 'settings': loadSettings(); break;
    default: loadDashboard();
  }
}

// ============================================
// API HELPER
// ============================================
async function apiFetch(endpoint, options = {}) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ============================================
// HELPERS
// ============================================
function getAvatarColor(name) {
  const colors = ['#1A365D','#2ECC71','#E74C3C','#F39C12','#2980B9','#8E44AD','#16A085','#D35400'];
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('it-IT', {weekday:'long', day:'numeric', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit'});
}

function formatDateShort(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('it-IT');
}

// ============================================
// MODAL HELPER
// ============================================
function createModal(title, content, footer, maxWidth = '600px') {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content" style="max-width:${maxWidth};">
      <div class="modal-header">
        <h2>${title}</h2>
        <button class="modal-close-btn">×</button>
      </div>
      <div class="modal-body">${content}</div>
      ${footer ? `<div class="modal-footer">${footer}</div>` : ''}
    </div>
  `;
  document.body.appendChild(modal);
  
  const closeModal = () => modal.remove();
  modal.querySelector('.modal-close-btn').addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  
  return { modal, closeModal };
}

// ============================================
// WORKSPACE INFO
// ============================================
async function loadWorkspaceInfo() {
  try {
    const workspaces = await apiFetch('/workspaces');
    if (workspaces?.length > 0) {
      document.getElementById('workspaceName').textContent = workspaces[0].nome;
    }
  } catch (err) {
    document.getElementById('workspaceName').textContent = 'ASD Albalonga';
  }
}

// ============================================
// DASHBOARD
// ============================================
async function loadDashboard() {
  const container = document.getElementById('pageContent');
  try {
    const [stats, players, matches] = await Promise.all([
      apiFetch(`/squadre/${SQUADRA_ID}/statistiche`).catch(() => ({ partiteGiocate: 0, calciatoriInRosa: 0 })),
      apiFetch(`/squadre/${SQUADRA_ID}/calciatori`).catch(() => []),
      apiFetch(`/squadre/${SQUADRA_ID}/partite`).catch(() => [])
    ]);
    allPlayers = players;
    allMatches = matches;

    const now = new Date();
    const nextMatch = matches.find(m => new Date(m.data_ora) > now);
    
    container.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;flex-wrap:wrap;gap:12px;">
        <div>
          <h1 class="page-title">Dashboard</h1>
          <p class="page-subtitle">Benvenuto! Ecco il riepilogo della stagione.</p>
        </div>
        <button class="btn btn-primary" id="btnNewMatch">+ Nuova Partita</button>
      </div>
      
      <div class="widgets">
        <div class="card widget"><div class="widget-icon">📊</div><div class="widget-value">${stats.partiteGiocate}</div><div class="widget-label">Partite Giocate</div></div>
        <div class="card widget"><div class="widget-icon">✅</div><div class="widget-value" style="color:#27AE60;">7</div><div class="widget-label">Vittorie</div></div>
        <div class="card widget"><div class="widget-icon">🤝</div><div class="widget-value" style="color:#F39C12;">3</div><div class="widget-label">Pareggi</div></div>
        <div class="card widget"><div class="widget-icon">❌</div><div class="widget-value" style="color:#E74C3C;">2</div><div class="widget-label">Sconfitte</div></div>
      </div>
      
      <div class="grid-2">
        <div class="card">
          <h3 class="section-title">⚽ Prossima Partita</h3>
          ${nextMatch ? `
            <div style="background:#F8F9FA;border-radius:8px;padding:20px;">
              <div style="font-size:14px;color:var(--gray);">${formatDate(nextMatch.data_ora)}</div>
              <div style="font-size:22px;font-weight:bold;color:var(--blue);margin:4px 0;">vs ${nextMatch.avversario}</div>
              <span class="badge ${nextMatch.luogo === 'Casa' ? 'badge-green' : 'badge-blue'}">${nextMatch.luogo}</span>
              <span style="font-size:13px;color:var(--gray);margin-left:8px;">${nextMatch.competizione}</span>
            </div>
          ` : '<p style="color:var(--gray);text-align:center;padding:20px;">Nessuna partita in programma</p>'}
        </div>
        
        <div class="card">
          <h3 class="section-title">🏆 Top Player</h3>
          <div class="top-player"><span class="top-player-rank">🥇</span><div class="top-player-avatar">M</div><span class="top-player-name">Marco Rossi</span><span class="top-player-stat">11 Gol</span></div>
          <div class="top-player"><span class="top-player-rank">🥈</span><div class="top-player-avatar">L</div><span class="top-player-name">Luca Bianchi</span><span class="top-player-stat">8 Assist</span></div>
          <div class="top-player"><span class="top-player-rank">🥉</span><div class="top-player-avatar">D</div><span class="top-player-name">Davide Marrone</span><span class="top-player-stat">7 Gol</span></div>
        </div>
      </div>
    `;
    
    document.getElementById('btnNewMatch').addEventListener('click', () => openMatchForm());
  } catch (err) {
    container.innerHTML = `<div class="error-box">Errore: ${err.message}</div>`;
  }
}

// ============================================
// ROSA
// ============================================
async function loadRoster() {
  const container = document.getElementById('pageContent');
  try {
    const players = await apiFetch(`/squadre/${SQUADRA_ID}/calciatori`);
    allPlayers = players;
    renderRoster(container, players);
  } catch (err) {
    container.innerHTML = `<div class="error-box">Errore: ${err.message}</div>`;
  }
}

function renderRoster(container, players) {
  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px;">
      <div><h1 class="page-title">Rosa Calciatori</h1><p class="page-subtitle">Under 14 Provinciale · ${players.length} calciatori</p></div>
      <button class="btn btn-primary" id="btnAddPlayer">+ Aggiungi</button>
    </div>
    <div class="roster-toolbar">
      <input type="text" class="search-bar" placeholder="Cerca giocatore..." id="searchInput">
      <select class="filter-select" id="ruoloFilter">
        <option value="">Tutti i ruoli</option>
        <option value="Portiere">Portiere</option><option value="Difensore">Difensore</option>
        <option value="Centrocampista">Centrocampista</option><option value="Attaccante">Attaccante</option>
      </select>
      <select class="filter-select" id="statoFilter">
        <option value="">Tutti gli stati</option>
        <option value="Attivo">Attivo</option><option value="Infortunato">Infortunato</option>
      </select>
    </div>
    <div class="roster-grid" id="rosterGrid"></div>
  `;
  
  document.getElementById('btnAddPlayer').addEventListener('click', () => openPlayerForm());
  document.getElementById('searchInput').addEventListener('input', filterRoster);
  document.getElementById('ruoloFilter').addEventListener('change', filterRoster);
  document.getElementById('statoFilter').addEventListener('change', filterRoster);
  
  updateRosterGrid(players);
}

function updateRosterGrid(players) {
  const grid = document.getElementById('rosterGrid');
  if (!grid) return;
  
  if (players.length === 0) {
    grid.innerHTML = '<div class="empty-state"><div class="empty-state-icon">👥</div><div class="empty-state-title">Nessun calciatore</div></div>';
    return;
  }
  
  grid.innerHTML = players.map(p => `
    <div class="card player-card" data-player-id="${p.id}">
      <div class="player-avatar" style="background:${getAvatarColor(p.nome)}">${p.nome.charAt(0)}${p.cognome.charAt(0)}</div>
      <div class="player-info">
        <div class="player-name">${p.nome} ${p.cognome}</div>
        <div class="player-role">${p.ruolo} · #${p.numeroMaglia}</div>
        <div style="margin-top:6px;"><span class="badge ${p.stato === 'Attivo' ? 'badge-green' : 'badge-red'}">${p.stato}</span></div>
      </div>
    </div>
  `).join('');
  
  document.querySelectorAll('#rosterGrid .player-card').forEach(card => {
    card.addEventListener('click', () => openPlayerForm(card.dataset.playerId));
  });
}

function filterRoster() {
  const search = (document.getElementById('searchInput')?.value || '').toLowerCase();
  const ruolo = document.getElementById('ruoloFilter')?.value || '';
  const stato = document.getElementById('statoFilter')?.value || '';
  let filtered = allPlayers;
  if (search) filtered = filtered.filter(p => `${p.nome} ${p.cognome}`.toLowerCase().includes(search));
  if (ruolo) filtered = filtered.filter(p => p.ruolo === ruolo);
  if (stato) filtered = filtered.filter(p => p.stato === stato);
  updateRosterGrid(filtered);
}

function openPlayerForm(playerId = null) {
  const player = playerId ? allPlayers.find(p => p.id === playerId) : null;
  
  const content = `
    <div class="form-grid">
      <div class="form-group"><label>Nome *</label><input id="pfNome" value="${player?.nome || ''}"></div>
      <div class="form-group"><label>Cognome *</label><input id="pfCognome" value="${player?.cognome || ''}"></div>
      <div class="form-group"><label>Data Nascita</label><input id="pfData" type="date" value="${player?.dataNascita ? new Date(player.dataNascita).toISOString().split('T')[0] : ''}"></div>
      <div class="form-group"><label>Luogo Nascita</label><input id="pfLuogo" value="${player?.luogoNascita || ''}"></div>
      <div class="form-group"><label>Ruolo</label><select id="pfRuolo"><option>Attaccante</option><option>Centrocampista</option><option>Difensore</option><option>Portiere</option></select></div>
      <div class="form-group"><label>Numero Maglia</label><input id="pfNumero" type="number" value="${player?.numeroMaglia || ''}"></div>
      <div class="form-group"><label>Matricola FIGC</label><input id="pfMatricola" value="${player?.matricolaFigc || ''}"></div>
      <div class="form-group"><label>Tipo Documento</label><input id="pfTipoDoc" value="${player?.tipoDocumento || ''}" placeholder="es. Tess."></div>
      <div class="form-group"><label>Numero Documento</label><input id="pfNumDoc" value="${player?.numeroDocumento || ''}"></div>
      <div class="form-group"><label>Rilasciato da</label><input id="pfRilasciato" value="${player?.rilasciatoDa || ''}" placeholder="es. FIGC"></div>
    </div>
  `;
  
  const footer = `
    <button class="btn btn-secondary modal-close-btn">Annulla</button>
    <button class="btn btn-primary" id="savePlayerBtn">Salva</button>
  `;
  
  const { modal, closeModal } = createModal(player ? 'Modifica Calciatore' : 'Nuovo Calciatore', content, footer);
  
  if (player) document.getElementById('pfRuolo').value = player.ruolo;
  
  document.getElementById('savePlayerBtn').addEventListener('click', async () => {
    const data = {
      nome: document.getElementById('pfNome').value,
      cognome: document.getElementById('pfCognome').value,
      dataNascita: document.getElementById('pfData').value,
      luogoNascita: document.getElementById('pfLuogo').value,
      ruolo: document.getElementById('pfRuolo').value,
      numeroMaglia: parseInt(document.getElementById('pfNumero').value) || 1,
      matricolaFigc: document.getElementById('pfMatricola').value,
      tipoDocumento: document.getElementById('pfTipoDoc').value,
      numeroDocumento: document.getElementById('pfNumDoc').value,
      rilasciatoDa: document.getElementById('pfRilasciato').value
    };
    try {
      if (player) {
        await apiFetch(`/calciatori/${player.id}`, { method: 'PUT', body: JSON.stringify(data) });
      } else {
        await apiFetch(`/squadre/${SQUADRA_ID}/calciatori`, { method: 'POST', body: JSON.stringify(data) });
      }
      closeModal();
      loadRoster();
    } catch (err) {
      alert('Errore: ' + err.message);
    }
  });
}

// ============================================
// CALENDARIO
// ============================================
async function loadCalendar() {
  const container = document.getElementById('pageContent');
  try {
    const matches = await apiFetch(`/squadre/${SQUADRA_ID}/partite`);
    allMatches = matches;
    renderCalendar(container, matches);
  } catch (err) {
    container.innerHTML = `<div class="error-box">Errore: ${err.message}</div>`;
  }
}

function renderCalendar(container, matches) {
  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;flex-wrap:wrap;gap:12px;">
      <div><h1 class="page-title">Calendario</h1><p class="page-subtitle">Partite della stagione</p></div>
      <button class="btn btn-primary" id="btnAddMatch">+ Nuova Partita</button>
    </div>
    <div id="matchList"></div>
  `;
  
  document.getElementById('btnAddMatch').addEventListener('click', () => openMatchForm());
  updateMatchList(matches);
}

function updateMatchList(matches) {
  const list = document.getElementById('matchList');
  if (!list) return;
  
  if (matches.length === 0) {
    list.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📅</div><div class="empty-state-title">Nessuna partita</div></div>';
    return;
  }
  
  list.innerHTML = matches.map(m => {
    const d = new Date(m.data_ora);
    return `
      <div class="card match-card-item">
        <div style="flex:1;min-width:200px;">
          <div class="match-date">${formatDate(m.data_ora)}</div>
          <div class="match-teams">ASD Albalonga vs ${m.avversario}</div>
          <div class="match-info">${m.competizione} · ${m.luogo}</div>
        </div>
        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
          <button class="btn btn-secondary btn-small btn-convocation" data-match-id="${m.id}">📋 Convoca</button>
          <button class="btn btn-secondary btn-small btn-distinta" data-match-id="${m.id}">📄 Distinta</button>
          <button class="btn btn-secondary btn-small btn-edit" data-match-id="${m.id}">✏️</button>
          <button class="btn btn-secondary btn-small btn-danger btn-delete" data-match-id="${m.id}">🗑️</button>
        </div>
      </div>
    `;
  }).join('');
  
  list.querySelectorAll('.btn-convocation').forEach(b => b.addEventListener('click', () => openConvocation(b.dataset.matchId)));
  list.querySelectorAll('.btn-distinta').forEach(b => b.addEventListener('click', () => openDistinta(b.dataset.matchId)));
  list.querySelectorAll('.btn-edit').forEach(b => b.addEventListener('click', () => openMatchForm(b.dataset.matchId)));
  list.querySelectorAll('.btn-delete').forEach(b => b.addEventListener('click', () => deleteMatch(b.dataset.matchId)));
}

function openMatchForm(matchId = null) {
  const match = matchId ? allMatches.find(m => m.id === matchId) : null;
  
  const content = `
    <div class="form-group" style="margin-bottom:16px;"><label>Data e Ora</label><input id="mfDataOra" type="datetime-local" value="${match ? new Date(match.data_ora).toISOString().slice(0,16) : ''}"></div>
    <div class="form-group" style="margin-bottom:16px;"><label>Avversario *</label><input id="mfAvversario" value="${match?.avversario || ''}"></div>
    <div class="form-group" style="margin-bottom:16px;"><label>Luogo</label><select id="mfLuogo"><option ${match?.luogo === 'Casa' ? 'selected' : ''}>Casa</option><option ${match?.luogo === 'Trasferta' ? 'selected' : ''}>Trasferta</option></select></div>
    <div class="form-group" style="margin-bottom:16px;"><label>Competizione</label><input id="mfCompetizione" value="${match?.competizione || ''}" placeholder="es. Campionato Provinciale"></div>
    <div class="form-group"><label>Note</label><textarea id="mfNote" rows="2">${match?.note || ''}</textarea></div>
  `;
  
  const footer = `<button class="btn btn-secondary modal-close-btn">Annulla</button><button class="btn btn-primary" id="saveMatchBtn">Salva</button>`;
  const { modal, closeModal } = createModal(match ? 'Modifica Partita' : 'Nuova Partita', content, footer, '500px');
  
  document.getElementById('saveMatchBtn').addEventListener('click', async () => {
    const data = {
      dataOra: new Date(document.getElementById('mfDataOra').value).toISOString(),
      avversario: document.getElementById('mfAvversario').value,
      luogo: document.getElementById('mfLuogo').value,
      competizione: document.getElementById('mfCompetizione').value,
      note: document.getElementById('mfNote').value
    };
    try {
      if (match) {
        await apiFetch(`/partite/${match.id}`, { method: 'PUT', body: JSON.stringify(data) });
      } else {
        await apiFetch(`/squadre/${SQUADRA_ID}/partite`, { method: 'POST', body: JSON.stringify(data) });
      }
      closeModal();
      loadCalendar();
    } catch (err) { alert('Errore: ' + err.message); }
  });
}

async function deleteMatch(id) {
  if (!confirm('Eliminare questa partita?')) return;
  try {
    await apiFetch(`/partite/${id}`, { method: 'DELETE' });
    loadCalendar();
  } catch (err) { alert('Errore: ' + err.message); }
}

// ============================================
// CONVOCAZIONI
// ============================================
async function openConvocation(matchId) {
  const match = allMatches.find(m => m.id === matchId) || {};
  
  const [convocazioni, giocatori] = await Promise.all([
    apiFetch(`/partite/${matchId}/convocazioni`).catch(() => []),
    apiFetch(`/squadre/${SQUADRA_ID}/calciatori`)
  ]);
  
  const convocatiIds = convocazioni.map(c => c.calciatoreId);
  
  const content = `
    <p style="margin-bottom:16px;color:var(--gray);">${formatDate(match.data_ora)} · ${match.competizione || ''}</p>
    <p style="margin-bottom:12px;font-weight:600;">Seleziona i giocatori convocati:</p>
    ${giocatori.map(g => `
      <div class="convocation-item">
        <input type="checkbox" ${convocatiIds.includes(g.id) ? 'checked' : ''} data-player-id="${g.id}" style="width:20px;height:20px;cursor:pointer;accent-color:var(--green);">
        <div class="player-avatar" style="width:32px;height:32px;font-size:12px;background:${getAvatarColor(g.nome)};">${g.nome.charAt(0)}${g.cognome.charAt(0)}</div>
        <span style="flex:1;">${g.nome} ${g.cognome}</span>
        <span style="color:var(--gray);font-size:13px;">${g.ruolo} · #${g.numeroMaglia}</span>
      </div>
    `).join('')}
  `;
  
  const footer = `<button class="btn btn-secondary modal-close-btn">Chiudi</button><button class="btn btn-primary" id="saveConvBtn">💾 Salva</button>`;
  const { modal, closeModal } = createModal(`📋 Convocazioni - vs ${match.avversario || '...'}`, content, footer);
  
  document.getElementById('saveConvBtn').addEventListener('click', async () => {
    const checkboxes = document.querySelectorAll('#convocationList input[type=checkbox], .modal-body input[type=checkbox]');
    for (const cb of checkboxes) {
      await apiFetch(`/partite/${matchId}/convocazioni`, {
        method: 'POST',
        body: JSON.stringify({ calciatoreId: cb.dataset.playerId, presente: cb.checked, note: null })
      }).catch(() => {});
    }
    closeModal();
    alert('✅ Convocazioni salvate!');
  });
}

// ============================================
// DISTINTA GARA
// ============================================
async function openDistinta(matchId) {
  const match = allMatches.find(m => m.id === matchId) || {};
  
  const content = '<div id="distintaInner"><div class="loading"><div class="spinner"></div>Caricamento distinta...</div></div>';
  const footer = `<button class="btn btn-secondary modal-close-btn">Chiudi</button><button class="btn btn-primary" id="printDistintaBtn">🖨️ Stampa</button>`;
  const { modal } = createModal('📄 Distinta Gara', content, footer, '950px');
  
  document.getElementById('printDistintaBtn').addEventListener('click', () => window.print());
  
  try {
    const distinta = await apiFetch(`/partite/${matchId}/distinta`);
    renderDistinta(distinta);
  } catch (err) {
    document.getElementById('distintaInner').innerHTML = `
      <div class="error-box">
        <p><strong>Formazione non disponibile</strong></p>
        <p>Per generare la distinta, salva prima la formazione della partita.</p>
      </div>`;
  }
}

function renderDistinta(data) {
  const container = document.getElementById('distintaInner');
  if (!container) return;
  
  const d = new Date(data.partita.dataOra);
  const tutti = data.formazione || [];
  
  if (tutti.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📋</div><div class="empty-state-title">Nessun giocatore in formazione</div></div>';
    return;
  }
  
  container.innerHTML = `
    <div class="distinta">
      <div class="distinta-header">
        <h2>DISTINTA DEI PARTECIPANTI ALLA GARA</h2>
        <h3>${data.societa} - ${data.partita.avversario}</h3>
        <p><strong>Campionato:</strong> ${data.partita.competizione}</p>
        <p><strong>Data:</strong> ${d.toLocaleDateString('it-IT')} · <strong>Ore:</strong> ${d.toLocaleTimeString('it-IT', {hour:'2-digit',minute:'2-digit'})}</p>
        <p><strong>Luogo:</strong> ${data.partita.luogo === 'Casa' ? 'Casa' : 'Trasferta'}</p>
      </div>
      <table class="distinta-table">
        <thead>
          <tr><th>N.</th><th>Data di Nascita</th><th>Cognome e Nome</th><th>Cap/V.Cap</th><th>N. Matricola FIGC</th><th colspan="3">Documento Identificazione</th><th>Esp.</th><th>Amm.</th></tr>
          <tr><th></th><th></th><th></th><th></th><th></th><th>Tipo</th><th>Numero</th><th>Rilasciato</th><th></th><th></th></tr>
        </thead>
        <tbody>
          ${tutti.map(f => `
            <tr class="${f.capitano ? 'capitano' : f.viceCapitano ? 'vice' : ''}">
              <td>${f.numeroMaglia || '-'}</td>
              <td>${f.dataNascita ? formatDateShort(f.dataNascita) : '-'}</td>
              <td style="text-align:left;">${f.cognome || ''} ${f.nome || ''}</td>
              <td>${f.capitano ? 'CAP' : f.viceCapitano ? 'V.CAP' : ''}</td>
              <td>${f.matricolaFigc || '-'}</td>
              <td>${f.tipoDocumento || '-'}</td>
              <td>${f.numeroDocumento || '-'}</td>
              <td>${f.rilasciatoDa || '-'}</td>
              <td></td><td></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <p style="font-size:10px;">CAP = Capitano, V.CAP = Vice Capitano, Esp. = Espulsi, Amm. = Ammoniti</p>
    </div>
  `;
}

// ============================================
// REPORT
// ============================================
function loadReports() {
  document.getElementById('pageContent').innerHTML = `
    <h1 class="page-title">Report</h1>
    <p class="page-subtitle">Genera e scarica report della stagione</p>
    <div class="grid-2">
      <div class="card" style="text-align:center;padding:40px 20px;">
        <div style="font-size:48px;margin-bottom:16px;">📄</div>
        <h3>Report Stagionale</h3><p style="color:var(--gray);margin-bottom:20px;">In sviluppo</p>
        <button class="btn btn-primary" disabled>Disponibile a breve</button>
      </div>
      <div class="card" style="text-align:center;padding:40px 20px;">
        <div style="font-size:48px;margin-bottom:16px;">👤</div>
        <h3>Report Giocatore</h3><p style="color:var(--gray);margin-bottom:20px;">In sviluppo</p>
        <button class="btn btn-primary" disabled>Disponibile a breve</button>
      </div>
    </div>
  `;
}

// ============================================
// IMPOSTAZIONI
// ============================================
function loadSettings() {
  document.getElementById('pageContent').innerHTML = `
    <h1 class="page-title">Impostazioni</h1>
    <p class="page-subtitle">Configura il workspace</p>
    <div class="card" style="margin-bottom:20px;"><h3>📆 Stagioni</h3><p>2025/26 - Attiva</p></div>
    <div class="card" style="margin-bottom:20px;"><h3>⚽ Squadre</h3><p>Under 14 Provinciale</p></div>
    <div class="card"><h3>💾 Backup</h3><button class="btn btn-secondary">Esporta Dati</button></div>
  `;
}
