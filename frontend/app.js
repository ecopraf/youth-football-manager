// ============================================
// YOUTH FOOTBALL MANAGER v2.6
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
  document.getElementById('menuBtn').addEventListener('click', () => document.getElementById('sidebar').classList.toggle('open'));
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
    headers: { 'Content-Type': 'application/json', ...options.headers }, ...options
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function getAvatarColor(n) {
  const colors = ['#1A365D','#2ECC71','#E74C3C','#F39C12','#2980B9','#8E44AD','#16A085','#D35400'];
  let h = 0; for (let i = 0; i < (n||'').length; i++) h = n.charCodeAt(i) + ((h << 5) - h);
  return colors[Math.abs(h) % colors.length];
}

function formatDate(d) { if(!d) return ''; return new Date(d).toLocaleDateString('it-IT', {weekday:'long',day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'}); }
function formatDateShort(d) { if(!d) return ''; return new Date(d).toLocaleDateString('it-IT'); }
function formatTime(t) { if(!t) return ''; return t.slice(0,5); }

function createModal(title, content, footer, maxWidth = '600px') {
  const existing = document.getElementById('currentModal'); if (existing) existing.remove();
  const modal = document.createElement('div'); modal.className = 'modal-overlay'; modal.id = 'currentModal';
  modal.innerHTML = `<div class="modal-content" style="max-width:${maxWidth};"><div class="modal-header"><h2>${title}</h2><button class="modal-close-btn" id="modalCloseX">×</button></div><div class="modal-body">${content}</div>${footer?`<div class="modal-footer">${footer}</div>`:''}</div>`;
  document.body.appendChild(modal);
  const close = () => { const m = document.getElementById('currentModal'); if(m) m.remove(); };
  document.getElementById('modalCloseX').addEventListener('click', close);
  modal.addEventListener('click', (e) => { if(e.target === modal) close(); });
  window._closeModal = close;
  return { modal, closeModal: close };
}

async function loadSquadre() {
  try {
    allSquadre = await apiFetch(`/stagioni/${STAGIONE_ID}/squadre`);
    const select = document.getElementById('squadraSelect');
    if (select) {
      select.innerHTML = allSquadre.map(s => `<option value="${s.id}" ${s.id===squadraId?'selected':''}>${s.nome}</option>`).join('');
      select.addEventListener('change', (e) => { squadraId = e.target.value; allPlayers=[]; allMatches=[]; navigateTo(currentPage); });
    }
    if (allSquadre.length > 0 && !allSquadre.find(s => s.id === squadraId)) squadraId = allSquadre[0].id;
  } catch (err) { console.error(err); }
}

async function loadWorkspaceInfo() {
  try { const w = await apiFetch('/workspaces'); if(w?.length) document.getElementById('workspaceName').textContent = w[0].nome; }
  catch(e) { document.getElementById('workspaceName').textContent = 'ASD Albalonga'; }
}

function getSquadraName() { const s = allSquadre.find(s => s.id === squadraId); return s ? s.nome : 'Squadra'; }
function getSquadra() { return allSquadre.find(s => s.id === squadraId) || {}; }

// ── DASHBOARD ──
async function loadDashboard() {
  const c = document.getElementById('pageContent');
  try {
    const [stats, players, matches] = await Promise.all([
      apiFetch(`/squadre/${squadraId}/statistiche`).catch(()=>({partiteGiocate:0,calciatoriInRosa:0})),
      apiFetch(`/squadre/${squadraId}/calciatori`).catch(()=>[]),
      apiFetch(`/squadre/${squadraId}/partite`).catch(()=>[])
    ]);
    allPlayers = players; allMatches = matches;
    const next = matches.find(m => new Date(m.data_ora) > new Date());
    c.innerHTML = `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;flex-wrap:wrap;gap:12px;"><div><h1 class="page-title">Dashboard</h1><p class="page-subtitle">${getSquadraName()} · Riepilogo</p></div><button class="btn btn-primary" id="btnNewMatch">+ Nuova Partita</button></div>
    <div class="widgets">
      <div class="card widget"><div class="widget-icon">📊</div><div class="widget-value">${stats.partiteGiocate}</div><div class="widget-label">Partite</div></div>
      <div class="card widget"><div class="widget-icon">✅</div><div class="widget-value" style="color:#27AE60;">7</div><div class="widget-label">Vittorie</div></div>
      <div class="card widget"><div class="widget-icon">🤝</div><div class="widget-value" style="color:#F39C12;">3</div><div class="widget-label">Pareggi</div></div>
      <div class="card widget"><div class="widget-icon">❌</div><div class="widget-value" style="color:#E74C3C;">2</div><div class="widget-label">Sconfitte</div></div>
    </div>
    <div class="grid-2">
      <div class="card"><h3 class="section-title">⚽ Prossima Partita</h3>${next?`<div style="background:#F8F9FA;border-radius:8px;padding:20px;"><div style="font-size:14px;color:var(--gray);">${formatDate(next.data_ora)}</div><div style="font-size:22px;font-weight:bold;color:var(--blue);margin:4px 0;">vs ${next.avversario}</div><span class="badge ${next.luogo==='Casa'?'badge-green':'badge-blue'}">${next.luogo}</span></div>`:'<p style="text-align:center;padding:20px;color:var(--gray);">Nessuna partita</p>'}</div>
      <div class="card"><h3 class="section-title">👥 Staff</h3>${renderStaffCard()}</div>
    </div>`;
    document.getElementById('btnNewMatch').addEventListener('click', () => openMatchForm());
  } catch(err) { c.innerHTML = `<div class="error-box">${err.message}</div>`; }
}

function renderStaffCard() {
  const s = getSquadra();
  return `<div style="padding:8px 0;"><p><strong>Allenatore:</strong> ${s.allenatore||'N/D'}</p><p><strong>Dirigente:</strong> ${s.dirigente||'N/D'}</p><p><strong>Prep. Atletico:</strong> ${s.preparatore_atletico||'N/D'}</p><p><strong>All. Portieri:</strong> ${s.allenatore_portieri||'N/D'}</p></div>`;
}

// ── ROSA ──
async function loadRoster() {
  const c = document.getElementById('pageContent');
  try { allPlayers = await apiFetch(`/squadre/${squadraId}/calciatori`); renderRoster(c, allPlayers); }
  catch(err) { c.innerHTML = `<div class="error-box">${err.message}</div>`; }
}

function renderRoster(c, players) {
  c.innerHTML = `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px;"><div><h1 class="page-title">Rosa</h1><p class="page-subtitle">${getSquadraName()} · ${players.length} calciatori</p></div><button class="btn btn-primary" id="btnAdd">+ Aggiungi</button></div>
  <div class="roster-toolbar"><input type="text" class="search-bar" placeholder="Cerca..." id="searchInput"><select class="filter-select" id="ruoloFilter"><option value="">Ruoli</option><option>Portiere</option><option>Difensore</option><option>Centrocampista</option><option>Attaccante</option></select><select class="filter-select" id="statoFilter"><option value="">Stati</option><option>Attivo</option><option>Infortunato</option></select></div>
  <div class="roster-grid" id="rosterGrid"></div>`;
  document.getElementById('btnAdd').addEventListener('click', () => openPlayerForm());
  document.getElementById('searchInput').addEventListener('input', filterRoster);
  document.getElementById('ruoloFilter').addEventListener('change', filterRoster);
  document.getElementById('statoFilter').addEventListener('change', filterRoster);
  updateRosterGrid(players);
}

function updateRosterGrid(players) {
  const g = document.getElementById('rosterGrid'); if(!g) return;
  if(players.length===0) { g.innerHTML='<div class="empty-state"><div class="empty-state-icon">👥</div><div class="empty-state-title">Vuoto</div></div>'; return; }
  g.innerHTML = players.map(p => `<div class="card player-card" data-pid="${p.id}"><div class="player-avatar" style="background:${getAvatarColor(p.nome)}">${p.nome[0]}${p.cognome[0]}</div><div class="player-info"><div class="player-name">${p.nome} ${p.cognome}</div><div class="player-role">${p.ruolo} · #${p.numeroMaglia}</div><div style="margin-top:6px;"><span class="badge ${p.stato==='Attivo'?'badge-green':'badge-red'}">${p.stato}</span></div></div></div>`).join('');
  g.querySelectorAll('.player-card').forEach(card => card.addEventListener('click', () => openPlayerForm(card.dataset.pid)));
}

function filterRoster() {
  const s = (document.getElementById('searchInput')?.value||'').toLowerCase();
  const r = document.getElementById('ruoloFilter')?.value||'';
  const st = document.getElementById('statoFilter')?.value||'';
  let f = allPlayers;
  if(s) f = f.filter(p => `${p.nome} ${p.cognome}`.toLowerCase().includes(s));
  if(r) f = f.filter(p => p.ruolo===r);
  if(st) f = f.filter(p => p.stato===st);
  updateRosterGrid(f);
}

function openPlayerForm(pid = null) {
  const p = pid ? allPlayers.find(x => x.id===pid) : null;
  const content = `<div class="form-grid">
    <div class="form-group"><label>Nome *</label><input id="pfNome" value="${p?.nome||''}"></div>
    <div class="form-group"><label>Cognome *</label><input id="pfCognome" value="${p?.cognome||''}"></div>
    <div class="form-group"><label>Data Nascita</label><input id="pfData" type="date" value="${p?.dataNascita?new Date(p.dataNascita).toISOString().split('T')[0]:''}"></div>
    <div class="form-group"><label>Luogo Nascita</label><input id="pfLuogo" value="${p?.luogoNascita||''}"></div>
    <div class="form-group"><label>Ruolo</label><select id="pfRuolo"><option>Attaccante</option><option>Centrocampista</option><option>Difensore</option><option>Portiere</option></select></div>
    <div class="form-group"><label>Numero Maglia</label><input id="pfNumero" type="number" value="${p?.numeroMaglia||''}"></div>
    <div class="form-group"><label>Matricola FIGC</label><input id="pfMatricola" value="${p?.matricolaFigc||''}"></div>
    <div class="form-group"><label>Tipo Doc</label><input id="pfTipoDoc" value="${p?.tipoDocumento||''}" placeholder="Tess."></div>
    <div class="form-group"><label>Numero Doc</label><input id="pfNumDoc" value="${p?.numeroDocumento||''}"></div>
    <div class="form-group"><label>Rilasciato da</label><input id="pfRilasciato" value="${p?.rilasciatoDa||''}" placeholder="FIGC"></div>
  </div>`;
  const footer = `<button class="btn btn-secondary" onclick="window._closeModal()">Annulla</button><button class="btn btn-primary" id="saveBtn">Salva</button>`;
  const { closeModal } = createModal(p?'Modifica':'Nuovo Calciatore', content, footer);
  if(p) document.getElementById('pfRuolo').value = p.ruolo;
  document.getElementById('saveBtn').addEventListener('click', async () => {
    const d = { nome: document.getElementById('pfNome').value, cognome: document.getElementById('pfCognome').value, dataNascita: document.getElementById('pfData').value, luogoNascita: document.getElementById('pfLuogo').value, ruolo: document.getElementById('pfRuolo').value, numeroMaglia: parseInt(document.getElementById('pfNumero').value)||1, matricolaFigc: document.getElementById('pfMatricola').value, tipoDocumento: document.getElementById('pfTipoDoc').value, numeroDocumento: document.getElementById('pfNumDoc').value, rilasciatoDa: document.getElementById('pfRilasciato').value };
    try {
      if(p) await apiFetch(`/calciatori/${p.id}`, { method:'PUT', body:JSON.stringify(d) });
      else await apiFetch(`/squadre/${squadraId}/calciatori`, { method:'POST', body:JSON.stringify(d) });
      closeModal(); loadRoster();
    } catch(err) { alert('Errore: '+err.message); }
  });
}

// ── CALENDARIO ──
async function loadCalendar() {
  const c = document.getElementById('pageContent');
  try { allMatches = await apiFetch(`/squadre/${squadraId}/partite`); renderCalendar(c, allMatches); }
  catch(err) { c.innerHTML = `<div class="error-box">${err.message}</div>`; }
}

function renderCalendar(c, matches) {
  c.innerHTML = `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;flex-wrap:wrap;gap:12px;"><div><h1 class="page-title">Calendario</h1><p class="page-subtitle">${getSquadraName()} · Partite</p></div><button class="btn btn-primary" id="btnAdd">+ Nuova</button></div><div id="matchList"></div>`;
  document.getElementById('btnAdd').addEventListener('click', () => openMatchForm());
  updateMatchList(matches);
}

function updateMatchList(matches) {
  const l = document.getElementById('matchList'); if(!l) return;
  if(matches.length===0) { l.innerHTML='<div class="empty-state"><div class="empty-state-icon">📅</div><div class="empty-state-title">Nessuna partita</div></div>'; return; }
  l.innerHTML = matches.map(m => `<div class="card match-card-item"><div style="flex:1;min-width:200px;"><div class="match-date">${formatDate(m.data_ora)}</div><div class="match-teams">${getSquadraName()} vs ${m.avversario}</div><div class="match-info">${m.competizione} · ${m.luogo}</div></div><div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;"><button class="btn btn-secondary btn-small btn-conv" data-mid="${m.id}">📋 Convoca</button><button class="btn btn-secondary btn-small btn-dist" data-mid="${m.id}">📄 Distinta</button><button class="btn btn-secondary btn-small btn-editm" data-mid="${m.id}">✏️</button><button class="btn btn-secondary btn-small btn-danger btn-del" data-mid="${m.id}">🗑️</button></div></div>`).join('');
  l.querySelectorAll('.btn-conv').forEach(b => b.addEventListener('click', () => openConvocation(b.dataset.mid)));
  l.querySelectorAll('.btn-dist').forEach(b => b.addEventListener('click', () => openDistinta(b.dataset.mid)));
  l.querySelectorAll('.btn-editm').forEach(b => b.addEventListener('click', () => openMatchForm(b.dataset.mid)));
  l.querySelectorAll('.btn-del').forEach(b => b.addEventListener('click', () => deleteMatch(b.dataset.mid)));
}

function openMatchForm(mid = null) {
  const m = mid ? allMatches.find(x => x.id===mid) : null;
  const content = `<div class="form-group" style="margin-bottom:16px;"><label>Data e Ora</label><input id="mfDataOra" type="datetime-local" value="${m?new Date(m.data_ora).toISOString().slice(0,16):''}"></div><div class="form-group" style="margin-bottom:16px;"><label>Avversario *</label><input id="mfAvv" value="${m?.avversario||''}"></div><div class="form-group" style="margin-bottom:16px;"><label>Luogo</label><select id="mfLuogo"><option ${m?.luogo==='Casa'?'selected':''}>Casa</option><option ${m?.luogo==='Trasferta'?'selected':''}>Trasferta</option></select></div><div class="form-group" style="margin-bottom:16px;"><label>Competizione</label><input id="mfComp" value="${m?.competizione||''}"></div><div class="form-group"><label>Note</label><textarea id="mfNote" rows="2">${m?.note||''}</textarea></div>`;
  const footer = `<button class="btn btn-secondary" onclick="window._closeModal()">Annulla</button><button class="btn btn-primary" id="saveBtn">Salva</button>`;
  const { closeModal } = createModal(m?'Modifica':'Nuova Partita', content, footer, '500px');
  document.getElementById('saveBtn').addEventListener('click', async () => {
    const d = { dataOra: new Date(document.getElementById('mfDataOra').value).toISOString(), avversario: document.getElementById('mfAvv').value, luogo: document.getElementById('mfLuogo').value, competizione: document.getElementById('mfComp').value, note: document.getElementById('mfNote').value };
    try {
      if(m) await apiFetch(`/partite/${m.id}`, { method:'PUT', body:JSON.stringify(d) });
      else await apiFetch(`/squadre/${squadraId}/partite`, { method:'POST', body:JSON.stringify(d) });
      closeModal(); loadCalendar();
    } catch(err) { alert('Errore: '+err.message); }
  });
}

async function deleteMatch(id) { if(confirm('Eliminare?')) { await apiFetch(`/partite/${id}`, { method:'DELETE' }); loadCalendar(); } }

// ── CONVOCAZIONI / DISTINTA ──
async function openConvocation(matchId) {
  const match = allMatches.find(m => m.id===matchId) || {};
  const [conv, gioc] = await Promise.all([apiFetch(`/partite/${matchId}/convocazioni`).catch(()=>[]), apiFetch(`/squadre/${squadraId}/calciatori`)]);
  const ids = conv.map(c => c.calciatoreId);
  const content = `<p style="margin-bottom:16px;color:var(--gray);">${formatDate(match.data_ora)}</p>${gioc.map(g => `<div class="convocation-item"><input type="checkbox" ${ids.includes(g.id)?'checked':''} data-pid="${g.id}" style="width:20px;height:20px;cursor:pointer;accent-color:var(--green);"><div class="player-avatar" style="width:32px;height:32px;font-size:12px;background:${getAvatarColor(g.nome)};">${g.nome[0]}${g.cognome[0]}</div><span style="flex:1;">${g.nome} ${g.cognome}</span><span style="color:var(--gray);font-size:13px;">${g.ruolo} · #${g.numeroMaglia}</span></div>`).join('')}`;
  const footer = `<button class="btn btn-secondary" onclick="window._closeModal()">Chiudi</button><button class="btn btn-primary" id="saveBtn">💾 Salva</button>`;
  const { closeModal } = createModal(`📋 Convocazioni - vs ${match.avversario||'...'}`, content, footer);
  document.getElementById('saveBtn').addEventListener('click', async () => {
    for (const cb of document.querySelectorAll('#currentModal input[type=checkbox]')) {
      await apiFetch(`/partite/${matchId}/convocazioni`, { method:'POST', body:JSON.stringify({ calciatoreId: cb.dataset.pid, presente: cb.checked }) }).catch(()=>{});
    }
    closeModal(); alert('✅ Salvate!');
  });
}

async function openDistinta(matchId) {
  const content = '<div id="distintaInner"><div class="loading"><div class="spinner"></div>Caricamento...</div></div>';
  const footer = `<button class="btn btn-secondary" onclick="window._closeModal()">Chiudi</button><button class="btn btn-primary" id="printBtn">🖨️ Stampa</button>`;
  createModal('📄 Distinta Gara', content, footer, '950px');
  document.getElementById('printBtn').addEventListener('click', () => {
    const el = document.getElementById('distintaInner');
    if(el) {
      const w = window.open('', '_blank', 'width=1000,height=800');
      w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Distinta</title><style>@page{margin:8mm;size:A4 portrait}body{font-family:'Courier New',monospace;font-size:12px;margin:0;padding:10mm}.distinta-header{text-align:center;margin-bottom:20px}h2{font-size:16px}h3{font-size:14px}.distinta-table{width:100%;border-collapse:collapse}.distinta-table th,.distinta-table td{border:1px solid #333;padding:6px 8px;text-align:center;font-size:11px}th{background:#f0f0f0}.capitano{background:#FFF9C4}.vice{background:#E8F5E9}@media print{body{padding:0}}</style></head><body>${el.innerHTML}<script>window.onload=function(){window.print();setTimeout(function(){window.close()},500)}<\/script></body></html>`);
      w.document.close();
    }
  });
  try { renderDistinta(await apiFetch(`/partite/${matchId}/distinta`)); }
  catch(err) { document.getElementById('distintaInner').innerHTML = '<div class="error-box"><p>Formazione non disponibile</p></div>'; }
}

function renderDistinta(data) {
  const c = document.getElementById('distintaInner'); if(!c) return;
  const tutti = data.formazione || [];
  if(tutti.length===0) { c.innerHTML='<div class="empty-state"><div class="empty-state-icon">📋</div><div class="empty-state-title">Nessun giocatore</div></div>'; return; }
  const d = new Date(data.partita.dataOra);
  c.innerHTML = `<div class="distinta"><div class="distinta-header"><h2>DISTINTA DEI PARTECIPANTI ALLA GARA</h2><h3>${data.societa} - ${data.partita.avversario}</h3><p><strong>Campionato:</strong> ${data.partita.competizione}</p><p><strong>Data:</strong> ${d.toLocaleDateString('it-IT')} · <strong>Ore:</strong> ${d.toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'})}</p><p><strong>Luogo:</strong> ${data.partita.luogo==='Casa'?'Casa':'Trasferta'}</p></div><table class="distinta-table"><thead><tr><th>N.</th><th>Data Nascita</th><th>Cognome e Nome</th><th>Cap/V.Cap</th><th>Matricola FIGC</th><th colspan="3">Documento</th><th>Esp.</th><th>Amm.</th></tr><tr><th></th><th></th><th></th><th></th><th></th><th>Tipo</th><th>Numero</th><th>Rilasciato</th><th></th><th></th></tr></thead><tbody>${tutti.map(f => `<tr class="${f.capitano?'capitano':f.viceCapitano?'vice':''}"><td>${f.numeroMaglia||'-'}</td><td>${f.dataNascita?formatDateShort(f.dataNascita):'-'}</td><td style="text-align:left;">${f.cognome||''} ${f.nome||''}</td><td>${f.capitano?'CAP':f.viceCapitano?'V.CAP':''}</td><td>${f.matricolaFigc||'-'}</td><td>${f.tipoDocumento||'-'}</td><td>${f.numeroDocumento||'-'}</td><td>${f.rilasciatoDa||'-'}</td><td></td><td></td></tr>`).join('')}</tbody></table></div>`;
}

// ── ALLENAMENTI ──
async function loadTraining() {
  const c = document.getElementById('pageContent');
  try {
    const [config, presenze, giocatori, summary] = await Promise.all([
      apiFetch(`/squadre/${squadraId}/allenamenti/config`).catch(()=>[]),
      apiFetch(`/squadre/${squadraId}/allenamenti/presenze`).catch(()=>[]),
      apiFetch(`/squadre/${squadraId}/calciatori`).catch(()=>[]),
      apiFetch(`/squadre/${squadraId}/allenamenti/summary`).catch(()=>({}))
    ]);
    allPlayers = giocatori;
    renderTraining(c, config, presenze, giocatori, summary);
  } catch(err) { c.innerHTML = `<div class="error-box">${err.message}</div>`; }
}

function renderTraining(c, config, presenze, giocatori, summary) {
  const giorni = ['Dom','Lun','Mar','Mer','Gio','Ven','Sab'];
  const oggi = new Date().toISOString().split('T')[0];
  
  c.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;flex-wrap:wrap;gap:12px;">
      <div><h1 class="page-title">Allenamenti</h1><p class="page-subtitle">${getSquadraName()} · Configurazione e presenze</p></div>
      <button class="btn btn-primary" id="btnAdd">+ Configura</button>
    </div>
    
    <div class="grid-2" style="margin-bottom:20px;">
      <div class="card">
        <h3 class="section-title">📅 Settimana Tipo</h3>
        <div id="trainConfig">${config.length===0?'<p style="color:var(--gray);">Nessun allenamento</p>':config.map(c => `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);">
            <div><strong>${giorni[c.giorno_settimana]}</strong> · ${formatTime(c.ora_inizio)}-${formatTime(c.ora_fine)}</div>
            <div style="font-size:13px;color:var(--gray);">${c.luogo||''}</div>
            <button class="btn btn-secondary btn-small btn-del" data-tid="${c.id}">🗑️</button>
          </div>`).join('')}</div>
      </div>
      
      <div class="card">
        <h3 class="section-title">📋 Presenze Oggi (${formatDateShort(oggi)})</h3>
        <p style="margin-bottom:12px;">Segna gli <span style="color:#E74C3C;font-weight:600;">ASSENTI</span>:</p>
        <div id="presenzeList">${giocatori.map(g => {
          const p = presenze.find(x => x.calciatoreId===g.id && x.data===oggi);
          return `<div class="convocation-item">
            <input type="checkbox" ${p&&!p.presente?'checked':''} data-pid="${g.id}" style="width:20px;height:20px;cursor:pointer;accent-color:#E74C3C;">
            <div class="player-avatar" style="width:32px;height:32px;font-size:12px;background:${getAvatarColor(g.nome)};">${g.nome[0]}${g.cognome[0]}</div>
            <span style="flex:1;">${g.nome} ${g.cognome}</span>
            <span style="color:var(--gray);font-size:13px;">${g.ruolo} · #${g.numeroMaglia}</span>
          </div>`;
        }).join('')}</div>
        <button class="btn btn-primary" id="btnSavePres" style="margin-top:12px;">💾 Salva</button>
      </div>
    </div>
    
    <div class="card">
      <h3 class="section-title">📊 Riepilogo Presenze</h3>
      <div style="overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead><tr style="background:#F8F9FA;"><th style="padding:8px;text-align:left;">Calciatore</th><th style="padding:8px;">Totale</th><th style="padding:8px;">Presenti</th><th style="padding:8px;">Assenti</th><th style="padding:8px;">% Presenze</th><th style="padding:8px;color:#E74C3C;">Assenti Sett.</th></tr></thead>
          <tbody>${giocatori.map(g => {
            const s = summary[g.id] || { totali:0, presenti:0, assenti:0, settimanali:0, presentiSett:0, assentiSett:0 };
            const perc = s.totali > 0 ? Math.round((s.presenti/s.totali)*100) : 0;
            return `<tr style="border-bottom:1px solid var(--border);">
              <td style="padding:8px;font-weight:500;">${g.nome} ${g.cognome}</td>
              <td style="padding:8px;text-align:center;">${s.totali}</td>
              <td style="padding:8px;text-align:center;color:#27AE60;">${s.presenti}</td>
              <td style="padding:8px;text-align:center;color:#E74C3C;">${s.assenti}</td>
              <td style="padding:8px;text-align:center;">${perc}%</td>
              <td style="padding:8px;text-align:center;color:#E74C3C;font-weight:600;">${s.assentiSett}</td>
            </tr>`;
          }).join('')}</tbody>
        </table>
      </div>
      <p style="font-size:11px;color:var(--gray);margin-top:8px;">* Settimana corrente (da lunedì a oggi)</p>
    </div>`;
  
  document.getElementById('btnAdd').addEventListener('click', () => openTrainingForm());
  document.querySelectorAll('.btn-del').forEach(b => b.addEventListener('click', async () => {
    await apiFetch(`/allenamenti/config/${b.dataset.tid}`, { method:'DELETE' }); loadTraining();
  }));
  document.getElementById('btnSavePres').addEventListener('click', async () => {
    for (const cb of document.querySelectorAll('#presenzeList input[type=checkbox]')) {
      await apiFetch(`/squadre/${squadraId}/allenamenti/presenze`, { method:'POST', body:JSON.stringify({ calciatoreId: cb.dataset.pid, data: oggi, presente: !cb.checked, note: cb.checked?'Assente':null }) }).catch(()=>{});
    }
    alert('✅ Presenze salvate!'); loadTraining();
  });
}

function openTrainingForm() {
  const giorni = ['Domenica','Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato'];
  const content = `<div class="form-group" style="margin-bottom:16px;"><label>Giorno</label><select id="tfGiorno">${giorni.map((g,i) => `<option value="${i}">${g}</option>`).join('')}</select></div><div class="form-grid"><div class="form-group"><label>Ora Inizio</label><input id="tfInizio" type="time"></div><div class="form-group"><label>Ora Fine</label><input id="tfFine" type="time"></div></div><div class="form-group" style="margin-top:16px;"><label>Luogo</label><input id="tfLuogo" placeholder="Campo Comunale"></div>`;
  const footer = `<button class="btn btn-secondary" onclick="window._closeModal()">Annulla</button><button class="btn btn-primary" id="saveBtn">Salva</button>`;
  const { closeModal } = createModal('Configura Allenamento', content, footer, '500px');
  document.getElementById('saveBtn').addEventListener('click', async () => {
    await apiFetch(`/squadre/${squadraId}/allenamenti/config`, { method:'POST', body:JSON.stringify({ giorno_settimana: parseInt(document.getElementById('tfGiorno').value), ora_inizio: document.getElementById('tfInizio').value, ora_fine: document.getElementById('tfFine').value, luogo: document.getElementById('tfLuogo').value }) });
    closeModal(); loadTraining();
  });
}

// ── REPORT ──
function loadReports() { document.getElementById('pageContent').innerHTML = `<h1 class="page-title">Report</h1><p class="page-subtitle">${getSquadraName()} · In sviluppo</p>`; }

// ── IMPOSTAZIONI ──
async function loadSettings() {
  const c = document.getElementById('pageContent');
  const s = getSquadra();
  
  c.innerHTML = `
    <h1 class="page-title">Impostazioni</h1><p class="page-subtitle">${getSquadraName()} · Gestione</p>
    
    <div class="card" style="margin-bottom:20px;">
      <h3 class="section-title">⚙️ Modifica Categoria</h3>
      <div class="form-grid">
        <div class="form-group"><label>Nome</label><input id="sNome" value="${s.nome||''}"></div>
        <div class="form-group"><label>Categoria</label><input id="sCat" value="${s.categoria||''}"></div>
        <div class="form-group"><label>Allenatore</label><input id="sAll" value="${s.allenatore||''}"></div>
        <div class="form-group"><label>Dirigente</label><input id="sDir" value="${s.dirigente||''}"></div>
        <div class="form-group"><label>Prep. Atletico</label><input id="sPrep" value="${s.preparatore_atletico||''}"></div>
        <div class="form-group"><label>All. Portieri</label><input id="sPort" value="${s.allenatore_portieri||''}"></div>
      </div>
      <div style="display:flex;gap:12px;margin-top:16px;">
        <button class="btn btn-primary" id="btnSave">💾 Salva</button>
        <button class="btn btn-danger" id="btnDelete" style="background:#E74C3C;color:white;">🗑️ Elimina Categoria</button>
      </div>
    </div>
    
    <div class="card">
      <h3 class="section-title">➕ Nuova Categoria</h3>
      <div class="form-grid">
        <div class="form-group"><label>Nome</label><input id="nNome" placeholder="es. Under 15 Regionale"></div>
        <div class="form-group"><label>Categoria</label><input id="nCat" placeholder="es. Under 15"></div>
        <div class="form-group"><label>Allenatore</label><input id="nAll"></div>
        <div class="form-group"><label>Dirigente</label><input id="nDir"></div>
        <div class="form-group"><label>Prep. Atletico</label><input id="nPrep"></div>
        <div class="form-group"><label>All. Portieri</label><input id="nPort"></div>
      </div>
      <button class="btn btn-primary" id="btnNew" style="margin-top:16px;">➕ Crea</button>
    </div>`;
  
  document.getElementById('btnSave').addEventListener('click', async () => {
    await apiFetch(`/squadre/${squadraId}`, { method:'PUT', body:JSON.stringify({
      nome: document.getElementById('sNome').value, categoria: document.getElementById('sCat').value,
      allenatore: document.getElementById('sAll').value, dirigente: document.getElementById('sDir').value,
      preparatore_atletico: document.getElementById('sPrep').value, allenatore_portieri: document.getElementById('sPort').value
    })});
    await loadSquadre(); alert('✅ Aggiornato!'); loadSettings();
  });
  
  document.getElementById('btnDelete').addEventListener('click', async () => {
    if(!confirm(`⚠️ Eliminare ${getSquadraName()}? Tutti i dati saranno persi!`)) return;
    if(!confirm('Sei SICURO? Questa azione è irreversibile.')) return;
    await apiFetch(`/squadre/${squadraId}`, { method:'DELETE' });
    await loadSquadre();
    if(allSquadre.length > 0) { squadraId = allSquadre[0].id; navigateTo('dashboard'); }
    else alert('Tutte le categorie eliminate. Creane una nuova.');
  });
  
  document.getElementById('btnNew').addEventListener('click', async () => {
    await apiFetch(`/stagioni/${STAGIONE_ID}/squadre`, { method:'POST', body:JSON.stringify({
      nome: document.getElementById('nNome').value, categoria: document.getElementById('nCat').value,
      allenatore: document.getElementById('nAll').value, dirigente: document.getElementById('nDir').value,
      preparatore_atletico: document.getElementById('nPrep').value, allenatore_portieri: document.getElementById('nPort').value
    })});
    await loadSquadre(); alert('✅ Creata!'); loadSettings();
  });
}
