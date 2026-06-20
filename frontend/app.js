// ============================================
// YOUTH FOOTBALL MANAGER - Frontend App v2.1
// ============================================

const API_BASE = 'https://youth-football-manager.vercel.app/api';
const WS_ID = '11111111-1111-1111-1111-111111111111';
const STAGIONE_ID = '22222222-2222-2222-2222-222222222222';
const SQUADRA_ID = '33333333-3333-3333-3333-333333333333';

let currentPage = 'dashboard';
let allPlayers = [];
let allMatches = [];

// ============================================
// INIZIALIZZAZIONE
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
  document.addEventListener('click', (e) => {
    const sidebar = document.getElementById('sidebar');
    const menuBtn = document.getElementById('menuBtn');
    if (!sidebar.contains(e.target) && e.target !== menuBtn) {
      sidebar.classList.remove('open');
    }
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
// WORKSPACE INFO
// ============================================
async function loadWorkspaceInfo() {
  try {
    const workspaces = await apiFetch('/workspaces');
    if (workspaces && workspaces.length > 0) {
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

    const nextMatch = matches.find(m => new Date(m.data_ora) > new Date());
    
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
      
      <div class="card">
        <h3 class="section-title">📈 Statistiche Stagione</h3>
        <div class="stats-row">
          <div class="stat-card"><div class="stat-card-value">28</div><div class="stat-card-label">Gol Fatti</div></div>
          <div class="stat-card"><div class="stat-card-value">14</div><div class="stat-card-label">Gol Subiti</div></div>
          <div class="stat-card"><div class="stat-card-value">2.3</div><div class="stat-card-label">Media Gol/Partita</div></div>
          <div class="stat-card"><div class="stat-card-value">${players.length}</div><div class="stat-card-label">Calciatori in Rosa</div></div>
        </div>
      </div>
    `;
    
    // Event listener per pulsante Nuova Partita
    document.getElementById('btnNewMatch').addEventListener('click', () => openMatchForm());
  } catch (err) {
    container.innerHTML = `<div class="error-box">Errore: ${err.message}</div>`;
  }
}

// ============================================
// ROSA CALCIATORI
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
    <div class="roster-grid" id="rosterGrid">${renderPlayerCards(players)}</div>
  `;
  
  document.getElementById('btnAddPlayer').addEventListener('click', () => openPlayerForm());
  document.getElementById('searchInput').addEventListener('input', filterRoster);
  document.getElementById('ruoloFilter').addEventListener('change', filterRoster);
  document.getElementById('statoFilter').addEventListener('change', filterRoster);
}

function renderPlayerCards(players) {
  if (players.length === 0) {
    return '<div class="empty-state"><div class="empty-state-icon">👥</div><div class="empty-state-title">Nessun calciatore</div><button class="btn btn-primary" id="btnAddPlayerEmpty">+ Aggiungi Calciatore</button></div>';
  }
  return players.map(p => `
    <div class="card player-card card-clickable" data-player-id="${p.id}">
      <div class="player-avatar" style="background:${getAvatarColor(p.nome)}">${p.nome.charAt(0)}${p.cognome.charAt(0)}</div>
      <div class="player-info">
        <div class="player-name">${p.nome} ${p.cognome}</div>
        <div class="player-role">${p.ruolo} · #${p.numeroMaglia}</div>
        <div style="margin-top:6px;"><span class="badge ${p.stato === 'Attivo' ? 'badge-green' : 'badge-red'}">${p.stato}</span></div>
      </div>
    </div>
  `).join('');
}

function filterRoster() {
  const search = document.getElementById('searchInput')?.value.toLowerCase() || '';
  const ruolo = document.getElementById('ruoloFilter')?.value || '';
  const stato = document.getElementById('statoFilter')?.value || '';
  let filtered = allPlayers;
  if (search) filtered = filtered.filter(p => `${p.nome} ${p.cognome}`.toLowerCase().includes(search));
  if (ruolo) filtered = filtered.filter(p => p.ruolo === ruolo);
  if (stato) filtered = filtered.filter(p => p.stato === stato);
  document.getElementById('rosterGrid').innerHTML = renderPlayerCards(filtered);
  
  // Riattacca event listener
  document.querySelectorAll('.player-card').forEach(card => {
    card.addEventListener('click', () => openPlayerForm(card.dataset.playerId));
  });
  const emptyBtn = document.getElementById('btnAddPlayerEmpty');
  if (emptyBtn) emptyBtn.addEventListener('click', () => openPlayerForm());
}

function openPlayerForm(playerId = null) {
  const player = playerId ? allPlayers.find(p => p.id === playerId) : null;
  const title = player ? 'Modifica Calciatore' : 'Nuovo Calciatore';
  
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content" style="max-width:600px;">
      <div class="modal-header">
        <h2>${title}</h2>
        <button class="modal-close" style="background:none;border:none;font-size:24px;cursor:pointer;">×</button>
      </div>
      <div class="modal-body">
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
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary modal-close">Annulla</button>
        <button class="btn btn-primary" id="savePlayerBtn">Salva</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  if (player) document.getElementById('pfRuolo').value = player.ruolo;
  
  // Chiudi modale
  modal.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => modal.remove());
  });
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
  
  // Salva
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
      modal.remove();
      loadRoster();
    } catch (err) {
      alert('Errore nel salvataggio: ' + err.message);
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
    <div id="matchList">
      ${matches.length > 0 ? matches.map(m => renderMatchCard(m)).join('') : '<div class="empty-state"><div class="empty-state-icon">📅</div><div class="empty-state-title">Nessuna partita</div><button class="btn btn-primary" id="btnAddMatchEmpty">+ Nuova Partita</button></div>'}
    </div>
  `;
  
  document.getElementById('btnAddMatch')?.addEventListener('click', () => openMatchForm());
  document.getElementById('btnAddMatchEmpty')?.addEventListener('click', () => openMatchForm());
  
  // Attacca event listener ai pulsanti delle partite
  document.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const matchId = btn.dataset.matchId;
      const action = btn.dataset.action;
      if (action === 'edit') openMatchForm(matchId);
      if (action === 'convocation') openConvocation(matchId);
      if (action === 'distinta') openDistinta(matchId);
      if (action === 'delete') deleteMatch(matchId);
    });
  });
}

function renderMatchCard(m) {
  const d = new Date(m.data_ora);
  return `
    <div class="card" style="margin-bottom:12px;padding:16px;">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
        <div style="flex:1;min-width:200px;">
          <div class="match-date">${formatDate(m.data_ora)}</div>
          <div class="match-teams">ASD Albalonga vs ${m.avversario}</div>
          <div class="match-info">${m.competizione} · ${m.luogo}</div>
        </div>
        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
          <button class="btn btn-secondary btn-small" data-action="convocation" data-match-id="${m.id}">📋 Convoca</button>
          <button class="btn btn-secondary btn-small" data-action="distinta" data-match-id="${m.id}">📄 Distinta</button>
          <button class="btn btn-secondary btn-small" data-action="edit" data-match-id="${m.id}">✏️</button>
          <button class="btn btn-secondary btn-small" data-action="delete" data-match-id="${m.id}" style="color:#E74C3C;">🗑️</button>
        </div>
      </div>
    </div>
  `;
}

function openMatchForm(matchId = null) {
  const match = matchId ? allMatches.find(m => m.id === matchId) : null;
  
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content" style="max-width:500px;">
      <div class="modal-header">
        <h2>${match ? 'Modifica' : 'Nuova'} Partita</h2>
        <button class="modal-close" style="background:none;border:none;font-size:24px;cursor:pointer;">×</button>
      </div>
      <div class="modal-body">
        <div class="form-group" style="margin-bottom:12px;"><label>Data e Ora</label><input id="mfDataOra" type="datetime-local" value="${match ? new Date(match.data_ora).toISOString().slice(0,16) : ''}"></div>
        <div class="form-group" style="margin-bottom:12px;"><label>Avversario *</label><input id="mfAvversario" value="${match?.avversario || ''}"></div>
        <div class="form-group" style="margin-bottom:12px;"><label>Luogo</label><select id="mfLuogo"><option ${match?.luogo === 'Casa' ? 'selected' : ''}>Casa</option><option ${match?.luogo === 'Trasferta' ? 'selected' : ''}>Trasferta</option></select></div>
        <div class="form-group" style="margin-bottom:12px;"><label>Competizione</label><input id="mfCompetizione" value="${match?.competizione || ''}" placeholder="es. Campionato Provinciale"></div>
        <div class="form-group" style="margin-bottom:12px;"><label>Note</label><textarea id="mfNote" rows="2">${match?.note || ''}</textarea></div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary modal-close">Annulla</button>
        <button class="btn btn-primary" id="saveMatchBtn">Salva</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  modal.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => modal.remove());
  });
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
  
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
      modal.remove();
      loadCalendar();
    } catch (err) { alert('Errore: ' + err.message); }
  });
}

async function deleteMatch(id) {
  if (confirm('Eliminare questa partita?')) {
    try {
      await apiFetch(`/partite/${id}`, { method: 'DELETE' });
      loadCalendar();
    } catch (err) { alert('Errore: ' + err.message); }
  }
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
  
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content" style="max-width:600px;">
      <div class="modal-header">
        <h2>📋 Convocazioni - vs ${match.avversario || '...'}</h2>
        <button class="modal-close" style="background:none;border:none;font-size:24px;cursor:pointer;">×</button>
      </div>
      <div class="modal-body">
        <p style="margin-bottom:16px;color:var(--gray);">${formatDate(match.data_ora)} · ${match.competizione || ''}</p>
        <p style="margin-bottom:12px;font-weight:600;">Seleziona i giocatori convocati:</p>
        <div id="convocationList">
          ${giocatori.map(g => `
            <div class="convocation-item">
              <input type="checkbox" ${convocatiIds.includes(g.id) ? 'checked' : ''} data-player-id="${g.id}" style="width:20px;height:20px;cursor:pointer;accent-color:var(--green);">
              <div class="player-avatar" style="width:32px;height:32px;font-size:12px;background:${getAvatarColor(g.nome)};">${g.nome.charAt(0)}${g.cognome.charAt(0)}</div>
              <span style="flex:1;">${g.nome} ${g.cognome}</span>
              <span style="color:var(--gray);font-size:13px;">${g.ruolo} · #${g.numeroMaglia}</span>
            </div>
          `).join('')}
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary modal-close">Chiudi</button>
        <button class="btn btn-primary" id="saveConvocationBtn">💾 Salva Convocazioni</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  modal.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => modal.remove());
  });
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
  
  document.getElementById('saveConvocationBtn').addEventListener('click', async () => {
    const checkboxes = document.querySelectorAll('#convocationList input[type=checkbox]');
    for (const cb of checkboxes) {
      const calciatoreId = cb.dataset.playerId;
      await apiFetch(`/partite/${matchId}/convocazioni`, {
        method: 'POST',
        body: JSON.stringify({ calciatoreId, presente: cb.checked, note: null })
      }).catch(() => {});
    }
    modal.remove();
    alert('✅ Convocazioni salvate!');
  });
}

// ============================================
// DISTINTA GARA
// ============================================
async function openDistinta(matchId) {
  const match = allMatches.find(m => m.id === matchId) || {};
  
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content" style="max-width:950px;">
      <div class="modal-header">
        <h2>📄 Distinta Gara</h2>
        <button class="modal-close" style="background:none;border:none;font-size:24px;cursor:pointer;">×</button>
      </div>
      <div class="modal-body" id="distintaContent">
        <div class="loading"><div class="spinner"></div>Caricamento distinta...</div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary modal-close">Chiudi</button>
        <button class="btn btn-primary" id="printDistintaBtn">🖨️ Stampa</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  modal.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => modal.remove());
  });
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
  
  document.getElementById('printDistintaBtn').addEventListener('click', () => window.print());
  
  try {
    const distinta = await apiFetch(`/partite/${matchId}/distinta`);
    renderDistinta(distinta, match);
  } catch (err) {
    document.getElementById('distintaContent').innerHTML = `
      <div class="error-box">
        <p><strong>Nessuna formazione disponibile</strong></p>
        <p>Per generare la distinta, devi prima salvare la formazione della partita.</p>
        <p style="font-size:13px;margin-top:8px;">Errore: ${err.message}</p>
      </div>`;
  }
}

function renderDistinta(data, match) {
  const d = new Date(data.partita.dataOra);
  const titolari = (data.formazione || []).filter(f => f.posizione === 'Titolare');
  const panchina = (data.formazione || []).filter(f => f.posizione === 'Panchina');
  const tutti = [...titolari, ...panchina];
  
  if (tutti.length === 0) {
    document.getElementById('distintaContent').innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📋</div>
        <div class="empty-state-title">Nessun giocatore in formazione</div>
        <div class="empty-state-text">Aggiungi giocatori alla formazione per generare la distinta.</div>
      </div>`;
    return;
  }
  
  document.getElementById('distintaContent').innerHTML = `
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
          <tr>
            <th>N.</th>
            <th>Data di Nascita</th>
            <th>Cognome e Nome</th>
            <th>Cap/V.Cap</th>
            <th>N. Matricola FIGC</th>
            <th colspan="3">Documento di Identificazione</th>
            <th>Esp.</th>
            <th>Amm.</th>
          </tr>
          <tr>
            <th></th><th></th><th></th><th></th><th></th>
            <th>Tipo</th><th>Numero</th><th>Rilasciato</th>
            <th></th><th></th>
          </tr>
        </thead>
        <tbody>
          ${tutti.map(f => `
            <tr class="${f.capitano ? 'capitano' : f.viceCapitano ? 'vice' : ''}">
              <td>${f.numeroMaglia || '-'}</td>
              <td>${f.dataNascita ? new Date(f.dataNascita).toLocaleDateString('it-IT') : '-'}</td>
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
      
      <p style="font-size:10px;margin-top:8px;">Legenda: CAP = Capitano, V.CAP = Vice Capitano, Esp. = Espulsi, Amm. = Ammoniti</p>
      <p style="font-size:10px;margin-top:16px;color:var(--gray);">📝 Per modificare la formazione, usa la funzione dedicata nella Pagina Partita.</p>
    </div>
  `;
}

// ============================================
// REPORT
// ============================================
function loadReports() {
  const container = document.getElementById('pageContent');
  container.innerHTML = `
    <h1 class="page-title">Report</h1>
    <p class="page-subtitle">Genera e scarica report della stagione</p>
    <div class="grid-2">
      <div class="card" style="text-align:center;padding:40px 20px;">
        <div style="font-size:48px;margin-bottom:16px;">📄</div>
        <h3>Report Stagionale</h3>
        <p style="color:var(--gray);margin-bottom:20px;">Classifica marcatori, assist, presenze.</p>
        <button class="btn btn-primary">Scarica PDF</button>
      </div>
      <div class="card" style="text-align:center;padding:40px 20px;">
        <div style="font-size:48px;margin-bottom:16px;">👤</div>
        <h3>Report Giocatore</h3>
        <p style="color:var(--gray);margin-bottom:20px;">Scheda personale con statistiche.</p>
        <select class="filter-select" style="margin-bottom:12px;"><option>Seleziona giocatore...</option></select><br>
        <button class="btn btn-primary">Scarica PDF</button>
      </div>
    </div>
  `;
}

// ============================================
// IMPOSTAZIONI
// ============================================
function loadSettings() {
  const container = document.getElementById('pageContent');
  container.innerHTML = `
    <h1 class="page-title">Impostazioni</h1>
    <p class="page-subtitle">Configura il workspace</p>
    <div class="card" style="margin-bottom:20px;">
      <h3>📆 Stagioni</h3>
      <p>2025/26 - Attiva</p>
      <button class="btn btn-secondary btn-small">+ Nuova Stagione</button>
    </div>
    <div class="card" style="margin-bottom:20px;">
      <h3>⚽ Squadre</h3>
      <p>Under 14 Provinciale</p>
      <button class="btn btn-secondary btn-small">+ Nuova Squadra</button>
    </div>
    <div class="card"><h3>💾 Backup</h3><button class="btn btn-secondary">Esporta Dati</button></div>
  `;
}

// ============================================
// UTILS
// ============================================
function getAvatarColor(name) {
  const colors = ['#1A365D','#2ECC71','#E74C3C','#F39C12','#2980B9','#8E44AD','#16A085','#D35400'];
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('it-IT', {weekday:'long', day:'numeric', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit'});
}

// Riattacca event listener alle card giocatore (chiamato dopo il render)
document.addEventListener('click', (e) => {
  const card = e.target.closest('.player-card');
  if (card && card.dataset.playerId) {
    openPlayerForm(card.dataset.playerId);
  }
});
