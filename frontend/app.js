// ============================================
// YOUTH FOOTBALL MANAGER v2.5 - Multi-Categoria
// ============================================

const API_BASE = 'https://youth-football-manager.vercel.app/api';
const WS_ID = '11111111-1111-1111-1111-111111111111';
const STAGIONE_ID = '22222222-2222-2222-2222-222222222222';
let squadraId = '33333333-3333-3333-3333-333333333333';
let allSquadre = [];
let currentPage = 'dashboard';
let allPlayers = [];
let allMatches = [];

document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  setupMobileMenu();
  loadSquadre().then(() => loadDashboard());
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
    case 'training': loadTraining(); break;
    case 'reports': loadReports(); break;
    case 'settings': loadSettings(); break;
    default: loadDashboard();
  }
}

async function apiFetch(endpoint, options = {}) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

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

function createModal(title, content, footer, maxWidth = '600px') {
  const existing = document.getElementById('currentModal');
  if (existing) existing.remove();
  
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'currentModal';
  modal.innerHTML = `
    <div class="modal-content" style="max-width:${maxWidth};">
      <div class="modal-header"><h2>${title}</h2><button class="modal-close-btn" id="modalCloseX">×</button></div>
      <div class="modal-body">${content}</div>
      ${footer ? `<div class="modal-footer">${footer}</div>` : ''}
    </div>`;
  document.body.appendChild(modal);
  
  const closeModal = () => { const m = document.getElementById('currentModal'); if (m) m.remove(); };
  document.getElementById('modalCloseX').addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  window._closeModal = closeModal;
  return { modal, closeModal };
}

// ── CARICAMENTO SQUADRE ──
async function loadSquadre() {
  try {
    allSquadre = await apiFetch(`/stagioni/${STAGIONE_ID}/squadre`);
    const select = document.getElementById('squadraSelect');
    if (select) {
      select.innerHTML = allSquadre.map(s => `<option value="${s.id}" ${s.id === squadraId ? 'selected' : ''}>${s.nome}</option>`).join('');
      select.addEventListener('change', (e) => {
        squadraId = e.target.value;
        allPlayers = [];
        allMatches = [];
        navigateTo(currentPage);
      });
    }
    if (allSquadre.length > 0 && !allSquadre.find(s => s.id === squadraId)) {
      squadraId = allSquadre[0].id;
    }
  } catch (err) { console.error('Errore caricamento squadre:', err); }
}

async function loadWorkspaceInfo() {
  try {
    const workspaces = await apiFetch('/workspaces');
    if (workspaces?.length > 0) document.getElementById('workspaceName').textContent = workspaces[0].nome;
  } catch (err) { document.getElementById('workspaceName').textContent = 'ASD Albalonga'; }
}

function getSquadraName() {
  const s = allSquadre.find(s => s.id === squadraId);
  return s ? s.nome : 'Squadra';
}

// ── DASHBOARD ──
async function loadDashboard() {
  const container = document.getElementById('pageContent');
  try {
    const [stats, players, matches] = await Promise.all([
      apiFetch(`/squadre/${squadraId}/statistiche`).catch(() => ({ partiteGiocate: 0, calciatoriInRosa: 0 })),
      apiFetch(`/squadre/${squadraId}/calciatori`).catch(() => []),
      apiFetch(`/squadre/${squadraId}/partite`).catch(() => [])
    ]);
    allPlayers = players;
    allMatches = matches;
    const nextMatch = matches.find(m => new Date(m.data_ora) > new Date());
    
    container.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;flex-wrap:wrap;gap:12px;">
        <div><h1 class="page-title">Dashboard</h1><p class="page-subtitle">${getSquadraName()} · Riepilogo stagione</p></div>
        <button class="btn btn-primary" id="btnNewMatch">+ Nuova Partita</button>
      </div>
      <div class="widgets">
        <div class="card widget"><div class="widget-icon">📊</div><div class="widget-value">${stats.partiteGiocate}</div><div class="widget-label">Partite Giocate</div></div>
        <div class="card widget"><div class="widget-icon">✅</div><div class="widget-value" style="color:#27AE60;">7</div><div class="widget-label">Vittorie</div></div>
        <div class="card widget"><div class="widget-icon">🤝</div><div class="widget-value" style="color:#F39C12;">3</div><div class="widget-label">Pareggi</div></div>
        <div class="card widget"><div class="widget-icon">❌</div><div class="widget-value" style="color:#E74C3C;">2</div><div class="widget-label">Sconfitte</div></div>
      </div>
      <div class="grid-2">
        <div class="card"><h3 class="section-title">⚽ Prossima Partita</h3>${nextMatch ? `<div style="background:#F8F9FA;border-radius:8px;padding:20px;"><div style="font-size:14px;color:var(--gray);">${formatDate(nextMatch.data_ora)}</div><div style="font-size:22px;font-weight:bold;color:var(--blue);margin:4px 0;">vs ${nextMatch.avversario}</div><span class="badge ${nextMatch.luogo==='Casa'?'badge-green':'badge-blue'}">${nextMatch.luogo}</span></div>` : '<p style="text-align:center;padding:20px;color:var(--gray);">Nessuna partita</p>'}</div>
        <div class="card"><h3 class="section-title">🏆 Top Player</h3><div class="top-player"><span class="top-player-rank">🥇</span><div class="top-player-avatar">M</div><span class="top-player-name">Marco Rossi</span><span class="top-player-stat">11 Gol</span></div><div class="top-player"><span class="top-player-rank">🥈</span><div class="top-player-avatar">L</div><span class="top-player-name">Luca Bianchi</span><span class="top-player-stat">8 Assist</span></div><div class="top-player"><span class="top-player-rank">🥉</span><div class="top-player-avatar">D</div><span class="top-player-name">Davide Marrone</span><span class="top-player-stat">7 Gol</span></div></div>
      </div>
    `;
    document.getElementById('btnNewMatch').addEventListener('click', () => openMatchForm());
  } catch (err) { container.innerHTML = `<div class="error-box">Errore: ${err.message}</div>`; }
}

// ── ROSA ──
async function loadRoster() {
  const container = document.getElementById('pageContent');
  try {
    const players = await apiFetch(`/squadre/${squadraId}/calciatori`);
    allPlayers = players;
    renderRoster(container, players);
  } catch (err) { container.innerHTML = `<div class="error-box">Errore: ${err.message}</div>`; }
}

function renderRoster(container, players) {
  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px;">
      <div><h1 class="page-title">Rosa Calciatori</h1><p class="page-subtitle">${getSquadraName()} · ${players.length} calciatori</p></div>
      <button class="btn btn-primary" id="btnAddPlayer">+ Aggiungi</button>
    </div>
    <div class="roster-toolbar">
      <input type="text" class="search-bar" placeholder="Cerca giocatore..." id="searchInput">
      <select class="filter-select" id="ruoloFilter"><option value="">Tutti i ruoli</option><option>Portiere</option><option>Difensore</option><option>Centrocampista</option><option>Attaccante</option></select>
      <select class="filter-select" id="statoFilter"><option value="">Tutti gli stati</option><option>Attivo</option><option>Infortunato</option></select>
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
  if (players.length === 0) { grid.innerHTML = '<div class="empty-state"><div class="empty-state-icon">👥</div><div class="empty-state-title">Nessun calciatore</div></div>'; return; }
  grid.innerHTML = players.map(p => `
    <div class="card player-card" data-player-id="${p.id}">
      <div class="player-avatar" style="background:${getAvatarColor(p.nome)}">${p.nome.charAt(0)}${p.cognome.charAt(0)}</div>
      <div class="player-info"><div class="player-name">${p.nome} ${p.cognome}</div><div class="player-role">${p.ruolo} · #${p.numeroMaglia}</div><div style="margin-top:6px;"><span class="badge ${p.stato==='Attivo'?'badge-green':'badge-red'}">${p.stato}</span></div></div>
    </div>
  `).join('');
  grid.querySelectorAll('.player-card').forEach(card => card.addEventListener('click', () => openPlayerForm(card.dataset.playerId)));
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
    </div>`;
  const footer = `<button class="btn btn-secondary" onclick="window._closeModal()">Annulla</button><button class="btn btn-primary" id="savePlayerBtn">Salva</button>`;
  const { closeModal } = createModal(player ? 'Modifica Calciatore' : 'Nuovo Calciatore', content, footer);
  
  if (player) document.getElementById('pfRuolo').value = player.ruolo;
  
  document.getElementById('savePlayerBtn').addEventListener('click', async () => {
    const data = {
      nome: document.getElementById('pfNome').value, cognome: document.getElementById('pfCognome').value,
      dataNascita: document.getElementById('pfData').value, luogoNascita: document.getElementById('pfLuogo').value,
      ruolo: document.getElementById('pfRuolo').value, numeroMaglia: parseInt(document.getElementById('pfNumero').value) || 1,
      matricolaFigc: document.getElementById('pfMatricola').value, tipoDocumento: document.getElementById('pfTipoDoc').value,
      numeroDocumento: document.getElementById('pfNumDoc').value, rilasciatoDa: document.getElementById('pfRilasciato').value
    };
    try {
      if (player) { await apiFetch(`/calciatori/${player.id}`, { method: 'PUT', body: JSON.stringify(data) }); }
      else { await apiFetch(`/squadre/${squadraId}/calciatori`, { method: 'POST', body: JSON.stringify(data) }); }
      closeModal(); loadRoster();
    } catch (err) { alert('Errore: ' + err.message); }
  });
}

// ── CALENDARIO ──
async function loadCalendar() {
  const container = document.getElementById('pageContent');
  try {
    const matches = await apiFetch(`/squadre/${squadraId}/partite`);
    allMatches = matches;
    renderCalendar(container, matches);
  } catch (err) { container.innerHTML = `<div class="error-box">Errore: ${err.message}</div>`; }
}

function renderCalendar(container, matches) {
  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;flex-wrap:wrap;gap:12px;">
      <div><h1 class="page-title">Calendario</h1><p class="page-subtitle">${getSquadraName()} · Partite della stagione</p></div>
      <button class="btn btn-primary" id="btnAddMatch">+ Nuova Partita</button>
    </div>
    <div id="matchList"></div>`;
  document.getElementById('btnAddMatch').addEventListener('click', () => openMatchForm());
  updateMatchList(matches);
}

function updateMatchList(matches) {
  const list = document.getElementById('matchList');
  if (!list) return;
  if (matches.length === 0) { list.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📅</div><div class="empty-state-title">Nessuna partita</div></div>'; return; }
  list.innerHTML = matches.map(m => `
    <div class="card match-card-item">
      <div style="flex:1;min-width:200px;"><div class="match-date">${formatDate(m.data_ora)}</div><div class="match-teams">${getSquadraName()} vs ${m.avversario}</div><div class="match-info">${m.competizione} · ${m.luogo}</div></div>
      <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
        <button class="btn btn-secondary btn-small btn-conv" data-mid="${m.id}">📋 Convoca</button>
        <button class="btn btn-secondary btn-small btn-dist" data-mid="${m.id}">📄 Distinta</button>
        <button class="btn btn-secondary btn-small btn-editm" data-mid="${m.id}">✏️</button>
        <button class="btn btn-secondary btn-small btn-danger btn-del" data-mid="${m.id}">🗑️</button>
      </div>
    </div>`).join('');
  list.querySelectorAll('.btn-conv').forEach(b => b.addEventListener('click', () => openConvocation(b.dataset.mid)));
  list.querySelectorAll('.btn-dist').forEach(b => b.addEventListener('click', () => openDistinta(b.dataset.mid)));
  list.querySelectorAll('.btn-editm').forEach(b => b.addEventListener('click', () => openMatchForm(b.dataset.mid)));
  list.querySelectorAll('.btn-del').forEach(b => b.addEventListener('click', () => deleteMatch(b.dataset.mid)));
}

function openMatchForm(matchId = null) {
  const match = matchId ? allMatches.find(m => m.id === matchId) : null;
  const content = `
    <div class="form-group" style="margin-bottom:16px;"><label>Data e Ora</label><input id="mfDataOra" type="datetime-local" value="${match ? new Date(match.data_ora).toISOString().slice(0,16) : ''}"></div>
    <div class="form-group" style="margin-bottom:16px;"><label>Avversario *</label><input id="mfAvversario" value="${match?.avversario || ''}"></div>
    <div class="form-group" style="margin-bottom:16px;"><label>Luogo</label><select id="mfLuogo"><option ${match?.luogo==='Casa'?'selected':''}>Casa</option><option ${match?.luogo==='Trasferta'?'selected':''}>Trasferta</option></select></div>
    <div class="form-group" style="margin-bottom:16px;"><label>Competizione</label><input id="mfCompetizione" value="${match?.competizione || ''}"></div>
    <div class="form-group"><label>Note</label><textarea id="mfNote" rows="2">${match?.note || ''}</textarea></div>`;
  const footer = `<button class="btn btn-secondary" onclick="window._closeModal()">Annulla</button><button class="btn btn-primary" id="saveMatchBtn">Salva</button>`;
  const { closeModal } = createModal(match ? 'Modifica Partita' : 'Nuova Partita', content, footer, '500px');
  document.getElementById('saveMatchBtn').addEventListener('click', async () => {
    const data = {
      dataOra: new Date(document.getElementById('mfDataOra').value).toISOString(),
      avversario: document.getElementById('mfAvversario').value,
      luogo: document.getElementById('mfLuogo').value,
      competizione: document.getElementById('mfCompetizione').value,
      note: document.getElementById('mfNote').value
    };
    try {
      if (match) { await apiFetch(`/partite/${match.id}`, { method: 'PUT', body: JSON.stringify(data) }); }
      else { await apiFetch(`/squadre/${squadraId}/partite`, { method: 'POST', body: JSON.stringify(data) }); }
      closeModal(); loadCalendar();
    } catch (err) { alert('Errore: ' + err.message); }
  });
}

async function deleteMatch(id) {
  if (!confirm('Eliminare questa partita?')) return;
  await apiFetch(`/partite/${id}`, { method: 'DELETE' }); loadCalendar();
}

// ── CONVOCAZIONI ──
async function openConvocation(matchId) {
  const match = allMatches.find(m => m.id === matchId) || {};
  const [convocazioni, giocatori] = await Promise.all([
    apiFetch(`/partite/${matchId}/convocazioni`).catch(() => []),
    apiFetch(`/squadre/${squadraId}/calciatori`)
  ]);
  const convocatiIds = convocazioni.map(c => c.calciatoreId);
  const content = `
    <p style="margin-bottom:16px;color:var(--gray);">${formatDate(match.data_ora)} · ${match.competizione || ''}</p>
    <p style="margin-bottom:12px;font-weight:600;">Seleziona giocatori convocati:</p>
    ${giocatori.map(g => `
      <div class="convocation-item">
        <input type="checkbox" ${convocatiIds.includes(g.id)?'checked':''} data-pid="${g.id}" style="width:20px;height:20px;cursor:pointer;accent-color:var(--green);">
        <div class="player-avatar" style="width:32px;height:32px;font-size:12px;background:${getAvatarColor(g.nome)};">${g.nome.charAt(0)}${g.cognome.charAt(0)}</div>
        <span style="flex:1;">${g.nome} ${g.cognome}</span>
        <span style="color:var(--gray);font-size:13px;">${g.ruolo} · #${g.numeroMaglia}</span>
      </div>`).join('')}`;
  const footer = `<button class="btn btn-secondary" onclick="window._closeModal()">Chiudi</button><button class="btn btn-primary" id="saveConvBtn">💾 Salva</button>`;
  const { closeModal } = createModal(`📋 Convocazioni - vs ${match.avversario || '...'}`, content, footer);
  document.getElementById('saveConvBtn').addEventListener('click', async () => {
    const checkboxes = document.querySelectorAll('#currentModal input[type=checkbox]');
    for (const cb of checkboxes) {
      await apiFetch(`/partite/${matchId}/convocazioni`, { method: 'POST', body: JSON.stringify({ calciatoreId: cb.dataset.pid, presente: cb.checked }) }).catch(() => {});
    }
    closeModal(); alert('✅ Convocazioni salvate!');
  });
}

// ── DISTINTA ──
async function openDistinta(matchId) {
  const content = '<div id="distintaInner"><div class="loading"><div class="spinner"></div>Caricamento...</div></div>';
  const footer = `<button class="btn btn-secondary" onclick="window._closeModal()">Chiudi</button><button class="btn btn-primary" id="printDistBtn">🖨️ Stampa</button>`;
  createModal('📄 Distinta Gara', content, footer, '950px');
  document.getElementById('printDistBtn').addEventListener('click', () => {
    const el = document.getElementById('distintaInner');
    if (el) {
      const w = window.open('', '_blank', 'width=1000,height=800');
      w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Distinta</title><style>@page{margin:8mm;size:A4 portrait}body{font-family:'Courier New',monospace;font-size:12px;margin:0;padding:10mm}.distinta-header{text-align:center;margin-bottom:20px}h2{font-size:16px}h3{font-size:14px}.distinta-table{width:100%;border-collapse:collapse}.distinta-table th,.distinta-table td{border:1px solid #333;padding:6px 8px;text-align:center;font-size:11px}th{background:#f0f0f0}.capitano{background:#FFF9C4}.vice{background:#E8F5E9}@media print{body{padding:0}}</style></head><body>${el.innerHTML}<script>window.onload=function(){window.print();setTimeout(function(){window.close()},500)}<\/script></body></html>`);
      w.document.close();
    }
  });
  try {
    const distinta = await apiFetch(`/partite/${matchId}/distinta`);
    renderDistinta(distinta);
  } catch (err) {
    document.getElementById('distintaInner').innerHTML = '<div class="error-box"><p><strong>Formazione non disponibile</strong></p><p>Usa il pulsante Convoca per aggiungere giocatori.</p></div>';
  }
}

function renderDistinta(data) {
  const c = document.getElementById('distintaInner');
  if (!c) return;
  const tutti = data.formazione || [];
  if (tutti.length === 0) { c.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📋</div><div class="empty-state-title">Nessun giocatore in formazione</div></div>'; return; }
  const d = new Date(data.partita.dataOra);
  c.innerHTML = `<div class="distinta"><div class="distinta-header"><h2>DISTINTA DEI PARTECIPANTI ALLA GARA</h2><h3>${data.societa} - ${data.partita.avversario}</h3><p><strong>Campionato:</strong> ${data.partita.competizione}</p><p><strong>Data:</strong> ${d.toLocaleDateString('it-IT')} · <strong>Ore:</strong> ${d.toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'})}</p><p><strong>Luogo:</strong> ${data.partita.luogo==='Casa'?'Casa':'Trasferta'}</p></div><table class="distinta-table"><thead><tr><th>N.</th><th>Data Nascita</th><th>Cognome e Nome</th><th>Cap/V.Cap</th><th>Matricola FIGC</th><th colspan="3">Documento</th><th>Esp.</th><th>Amm.</th></tr><tr><th></th><th></th><th></th><th></th><th></th><th>Tipo</th><th>Numero</th><th>Rilasciato</th><th></th><th></th></tr></thead><tbody>${tutti.map(f => `<tr class="${f.capitano?'capitano':f.viceCapitano?'vice':''}"><td>${f.numeroMaglia||'-'}</td><td>${f.dataNascita?formatDateShort(f.dataNascita):'-'}</td><td style="text-align:left;">${f.cognome||''} ${f.nome||''}</td><td>${f.capitano?'CAP':f.viceCapitano?'V.CAP':''}</td><td>${f.matricolaFigc||'-'}</td><td>${f.tipoDocumento||'-'}</td><td>${f.numeroDocumento||'-'}</td><td>${f.rilasciatoDa||'-'}</td><td></td><td></td></tr>`).join('')}</tbody></table></div>`;
}

// ── ALLENAMENTI ──
async function loadTraining() {
  const container = document.getElementById('pageContent');
  try {
    const [config, presenze, giocatori] = await Promise.all([
      apiFetch(`/squadre/${squadraId}/allenamenti/config`).catch(() => []),
      apiFetch(`/squadre/${squadraId}/allenamenti/presenze`).catch(() => []),
      apiFetch(`/squadre/${squadraId}/calciatori`).catch(() => [])
    ]);
    allPlayers = giocatori;
    renderTraining(container, config, presenze, giocatori);
  } catch (err) { container.innerHTML = `<div class="error-box">Errore: ${err.message}</div>`; }
}

function renderTraining(container, config, presenze, giocatori) {
  const giorni = ['Domenica','Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato'];
  
  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;flex-wrap:wrap;gap:12px;">
      <div><h1 class="page-title">Allenamenti</h1><p class="page-subtitle">${getSquadraName()} · Presenze e configurazione</p></div>
      <button class="btn btn-primary" id="btnAddTraining">+ Configura Allenamento</button>
    </div>
    
    <div class="grid-2">
      <div class="card">
        <h3 class="section-title">📅 Configurazione Settimanale</h3>
        <div id="trainingConfig">
          ${config.length === 0 ? '<p style="color:var(--gray);">Nessun allenamento configurato</p>' : config.map(c => `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);">
              <div><strong>${giorni[c.giorno_settimana]}</strong> · ${c.ora_inizio?.slice(0,5)} - ${c.ora_fine?.slice(0,5)}</div>
              <div style="font-size:13px;color:var(--gray);">${c.luogo || ''}</div>
              <button class="btn btn-secondary btn-small btn-del-train" data-tid="${c.id}">🗑️</button>
            </div>
          `).join('')}
        </div>
      </div>
      
      <div class="card">
        <h3 class="section-title">📋 Presenze Ultimo Allenamento</h3>
        <p style="margin-bottom:12px;font-weight:600;">Segna gli <span style="color:#E74C3C;">ASSENTI</span> del ${presenze.length > 0 ? formatDateShort(presenze[0].data) : 'giorno corrente'}:</p>
        <div id="presenzeList">
          ${giocatori.map(g => {
            const oggi = new Date().toISOString().split('T')[0];
            const presenza = presenze.find(p => p.calciatoreId === g.id && p.data === oggi);
            return `
              <div class="convocation-item">
                <input type="checkbox" ${presenza && !presenza.presente ? 'checked' : ''} data-pid="${g.id}" style="width:20px;height:20px;cursor:pointer;accent-color:#E74C3C;">
                <div class="player-avatar" style="width:32px;height:32px;font-size:12px;background:${getAvatarColor(g.nome)};">${g.nome.charAt(0)}${g.cognome.charAt(0)}</div>
                <span style="flex:1;">${g.nome} ${g.cognome}</span>
                <span style="color:var(--gray);font-size:13px;">${g.ruolo} · #${g.numeroMaglia}</span>
              </div>`;
          }).join('')}
        </div>
        <button class="btn btn-primary" id="btnSavePresenze" style="margin-top:12px;">💾 Salva Presenze</button>
      </div>
    </div>
  `;
  
  document.getElementById('btnAddTraining').addEventListener('click', () => openTrainingForm());
  document.querySelectorAll('.btn-del-train').forEach(b => b.addEventListener('click', async () => {
    await apiFetch(`/allenamenti/config/${b.dataset.tid}`, { method: 'DELETE' });
    loadTraining();
  }));
  
  document.getElementById('btnSavePresenze').addEventListener('click', async () => {
    const oggi = new Date().toISOString().split('T')[0];
    const checkboxes = document.querySelectorAll('#presenzeList input[type=checkbox]');
    for (const cb of checkboxes) {
      await apiFetch(`/squadre/${squadraId}/allenamenti/presenze`, {
        method: 'POST',
        body: JSON.stringify({ calciatoreId: cb.dataset.pid, data: oggi, presente: !cb.checked, note: cb.checked ? 'Assente' : null })
      }).catch(() => {});
    }
    alert('✅ Presenze salvate! (I selezionati sono assenti)');
    loadTraining();
  });
}

function openTrainingForm() {
  const giorni = ['Domenica','Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato'];
  const content = `
    <div class="form-group" style="margin-bottom:16px;"><label>Giorno</label><select id="tfGiorno">${giorni.map((g,i) => `<option value="${i}">${g}</option>`).join('')}</select></div>
    <div class="form-grid">
      <div class="form-group"><label>Ora Inizio</label><input id="tfInizio" type="time"></div>
      <div class="form-group"><label>Ora Fine</label><input id="tfFine" type="time"></div>
    </div>
    <div class="form-group" style="margin-top:16px;"><label>Luogo</label><input id="tfLuogo" placeholder="es. Campo Comunale A"></div>`;
  const footer = `<button class="btn btn-secondary" onclick="window._closeModal()">Annulla</button><button class="btn btn-primary" id="saveTrainingBtn">Salva</button>`;
  const { closeModal } = createModal('Configura Allenamento', content, footer, '500px');
  document.getElementById('saveTrainingBtn').addEventListener('click', async () => {
    const data = {
      giorno_settimana: parseInt(document.getElementById('tfGiorno').value),
      ora_inizio: document.getElementById('tfInizio').value,
      ora_fine: document.getElementById('tfFine').value,
      luogo: document.getElementById('tfLuogo').value
    };
    try {
      await apiFetch(`/squadre/${squadraId}/allenamenti/config`, { method: 'POST', body: JSON.stringify(data) });
      closeModal(); loadTraining();
    } catch (err) { alert('Errore: ' + err.message); }
  });
}

// ── REPORT ──
function loadReports() {
  document.getElementById('pageContent').innerHTML = `<h1 class="page-title">Report</h1><p class="page-subtitle">${getSquadraName()} · In sviluppo</p>`;
}

// ── IMPOSTAZIONI ──
async function loadSettings() {
  const container = document.getElementById('pageContent');
  const s = allSquadre.find(s => s.id === squadraId) || {};
  
  container.innerHTML = `
    <h1 class="page-title">Impostazioni</h1>
    <p class="page-subtitle">${getSquadraName()} · Gestione categoria</p>
    
    <div class="card" style="margin-bottom:20px;">
      <h3 class="section-title">⚙️ Dati Categoria</h3>
      <div class="form-grid">
        <div class="form-group"><label>Nome Squadra</label><input id="setNome" value="${s.nome || ''}"></div>
        <div class="form-group"><label>Categoria (es. Under 14, Provinciale/Regionale)</label><input id="setCat" value="${s.categoria || ''}"></div>
        <div class="form-group"><label>Allenatore</label><input id="setAllenatore" value="${s.allenatore || ''}"></div>
        <div class="form-group"><label>Dirigente</label><input id="setDirigente" value="${s.dirigente || ''}"></div>
      </div>
      <button class="btn btn-primary" id="btnSaveSquadra" style="margin-top:16px;">💾 Salva Modifiche</button>
    </div>
    
    <div class="card">
      <h3 class="section-title">➕ Nuova Categoria</h3>
      <div class="form-grid">
        <div class="form-group"><label>Nome</label><input id="newNome" placeholder="es. Under 15 Regionale"></div>
        <div class="form-group"><label>Categoria</label><input id="newCat" placeholder="es. Under 15"></div>
        <div class="form-group"><label>Allenatore</label><input id="newAllenatore"></div>
        <div class="form-group"><label>Dirigente</label><input id="newDirigente"></div>
      </div>
      <button class="btn btn-primary" id="btnAddSquadra" style="margin-top:16px;">➕ Crea Categoria</button>
    </div>
  `;
  
  document.getElementById('btnSaveSquadra').addEventListener('click', async () => {
    const data = {
      nome: document.getElementById('setNome').value,
      categoria: document.getElementById('setCat').value,
      allenatore: document.getElementById('setAllenatore').value,
      dirigente: document.getElementById('setDirigente').value
    };
    await apiFetch(`/squadre/${squadraId}`, { method: 'PUT', body: JSON.stringify(data) });
    await loadSquadre();
    alert('✅ Categoria aggiornata!');
  });
  
  document.getElementById('btnAddSquadra').addEventListener('click', async () => {
    const data = {
      nome: document.getElementById('newNome').value,
      categoria: document.getElementById('newCat').value,
      allenatore: document.getElementById('newAllenatore').value,
      dirigente: document.getElementById('newDirigente').value
    };
    await apiFetch(`/stagioni/${STAGIONE_ID}/squadre`, { method: 'POST', body: JSON.stringify(data) });
    await loadSquadre();
    alert('✅ Nuova categoria creata!');
    loadSettings();
  });
}
