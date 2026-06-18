// ============================================
// YOUTH FOOTBALL MANAGER - Frontend App
// ============================================

// Configurazione
const API_BASE = "https://youth-football-manager.vercel.app/api";
const WS_ID = '11111111-1111-1111-1111-111111111111';
const STAGIONE_ID = '22222222-2222-2222-2222-222222222222';
const SQUADRA_ID = '33333333-3333-3333-3333-333333333333';

// Stato
let currentPage = 'dashboard';
let allPlayers = [];

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
  
  // Chiudi sidebar quando clicchi fuori
  document.addEventListener('click', (e) => {
    const sidebar = document.getElementById('sidebar');
    const menuBtn = document.getElementById('menuBtn');
    if (!sidebar.contains(e.target) && e.target !== menuBtn) {
      sidebar.classList.remove('open');
    }
  });
}

// ============================================
// NAVIGAZIONE
// ============================================
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
async function apiFetch(endpoint) {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('API Error:', err);
    throw err;
  }
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
    const [stats, players] = await Promise.all([
      apiFetch(`/squadre/${SQUADRA_ID}/statistiche`).catch(() => ({ partiteGiocate: 0, calciatoriInRosa: 0 })),
      apiFetch(`/squadre/${SQUADRA_ID}/calciatori`).catch(() => [])
    ]);
    
    const vittorie = 7, pareggi = 3, sconfitte = 2;
    
    container.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;flex-wrap:wrap;gap:12px;">
        <div>
          <h1 class="page-title">Dashboard</h1>
          <p class="page-subtitle">Benvenuto! Ecco il riepilogo della stagione.</p>
        </div>
        <button class="btn btn-primary" onclick="navigateTo('calendar')">+ Nuova Partita</button>
      </div>
      
      <div class="widgets">
        <div class="card widget">
          <div class="widget-icon">📊</div>
          <div class="widget-value">${stats.partiteGiocate || 12}</div>
          <div class="widget-label">Partite Giocate</div>
        </div>
        <div class="card widget">
          <div class="widget-icon">✅</div>
          <div class="widget-value" style="color:#27AE60;">${vittorie}</div>
          <div class="widget-label">Vittorie</div>
        </div>
        <div class="card widget">
          <div class="widget-icon">🤝</div>
          <div class="widget-value" style="color:#F39C12;">${pareggi}</div>
          <div class="widget-label">Pareggi</div>
        </div>
        <div class="card widget">
          <div class="widget-icon">❌</div>
          <div class="widget-value" style="color:#E74C3C;">${sconfitte}</div>
          <div class="widget-label">Sconfitte</div>
        </div>
      </div>
      
      <div class="grid-2">
        <div class="card">
          <h3 class="section-title">⚽ Prossima Partita</h3>
          <div style="background:#F8F9FA;border-radius:8px;padding:20px;">
            <div style="font-size:14px;color:var(--gray);">Sabato 24 Giugno 2026</div>
            <div style="font-size:22px;font-weight:bold;color:var(--blue);margin:4px 0;">vs ASD Torrino</div>
            <div style="display:flex;align-items:center;gap:8px;margin-top:8px;">
              <span class="badge badge-green">Casa</span>
              <span style="font-size:13px;color:var(--gray);">Campionato Provinciale</span>
            </div>
          </div>
        </div>
        
        <div class="card">
          <h3 class="section-title">🏆 Top Player</h3>
          <div id="topPlayers">
            <div class="top-player">
              <span class="top-player-rank">🥇</span>
              <div class="top-player-avatar">M</div>
              <span class="top-player-name">Marco Rossi</span>
              <span class="top-player-stat">11 Gol</span>
            </div>
            <div class="top-player">
              <span class="top-player-rank">🥈</span>
              <div class="top-player-avatar">L</div>
              <span class="top-player-name">Luca Bianchi</span>
              <span class="top-player-stat">8 Assist</span>
            </div>
            <div class="top-player">
              <span class="top-player-rank">🥉</span>
              <div class="top-player-avatar">D</div>
              <span class="top-player-name">Davide Marrone</span>
              <span class="top-player-stat">7 Gol</span>
            </div>
          </div>
        </div>
      </div>
      
      <div class="card">
        <h3 class="section-title">📈 Statistiche Stagione</h3>
        <div class="stats-row">
          <div class="stat-card">
            <div class="stat-card-value">28</div>
            <div class="stat-card-label">Gol Fatti</div>
          </div>
          <div class="stat-card">
            <div class="stat-card-value">14</div>
            <div class="stat-card-label">Gol Subiti</div>
          </div>
          <div class="stat-card">
            <div class="stat-card-value">2.3</div>
            <div class="stat-card-label">Media Gol/Partita</div>
          </div>
          <div class="stat-card">
            <div class="stat-card-value">4</div>
            <div class="stat-card-label">Clean Sheet</div>
          </div>
          <div class="stat-card">
            <div class="stat-card-value">${players.length || stats.calciatoriInRosa || 0}</div>
            <div class="stat-card-label">Calciatori in Rosa</div>
          </div>
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="error-box">Errore nel caricamento: ${err.message}</div>`;
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
    container.innerHTML = `
      <div class="error-box">Errore nel caricamento della rosa: ${err.message}</div>
      <p style="text-align:center;margin-top:16px;">Verifica che il backend sia in esecuzione e il database configurato.</p>
    `;
  }
}

function renderRoster(container, players) {
  const ruoli = ['Portiere', 'Difensore', 'Centrocampista', 'Attaccante'];
  
  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px;">
      <div>
        <h1 class="page-title">Rosa Calciatori</h1>
        <p class="page-subtitle">Under 14 Provinciale · ${players.length} calciatori</p>
      </div>
      <button class="btn btn-primary" onclick="alert('Funzionalità in arrivo nello Sprint 2')">+ Aggiungi</button>
    </div>
    
    <div class="roster-toolbar">
      <input type="text" class="search-bar" placeholder="Cerca giocatore..." id="searchInput" oninput="filterRoster()">
      <select class="filter-select" id="ruoloFilter" onchange="filterRoster()">
        <option value="">Tutti i ruoli</option>
        ${ruoli.map(r => `<option value="${r}">${r}</option>`).join('')}
      </select>
      <select class="filter-select" id="statoFilter" onchange="filterRoster()">
        <option value="">Tutti gli stati</option>
        <option value="Attivo">Attivo</option>
        <option value="Infortunato">Infortunato</option>
        <option value="In prestito">In prestito</option>
      </select>
    </div>
    
    <div class="roster-grid" id="rosterGrid">
      ${players.map(p => `
        <div class="card player-card card-clickable" onclick="showPlayerDetail('${p.id}')">
          <div class="player-avatar" style="background:${getAvatarColor(p.nome)}">${p.nome.charAt(0)}${p.cognome.charAt(0)}</div>
          <div class="player-info">
            <div class="player-name">${p.nome} ${p.cognome}</div>
            <div class="player-role">${p.ruolo} · #${p.numeroMaglia}</div>
            <div style="margin-top:6px;">
              <span class="badge ${p.stato === 'Attivo' ? 'badge-green' : p.stato === 'Infortunato' ? 'badge-red' : 'badge-orange'}">${p.stato}</span>
            </div>
          </div>
          <div class="player-stats">
            <div class="player-stat-item">
              <div class="player-stat-value">--</div>
              <div class="player-stat-label">Presenze</div>
            </div>
            <div class="player-stat-item">
              <div class="player-stat-value">--</div>
              <div class="player-stat-label">Gol</div>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
    
    ${players.length === 0 ? `
      <div class="empty-state">
        <div class="empty-state-icon">👥</div>
        <div class="empty-state-title">Nessun calciatore in rosa</div>
        <div class="empty-state-text">Aggiungi il primo calciatore per iniziare</div>
        <button class="btn btn-primary">+ Aggiungi Calciatore</button>
      </div>
    ` : ''}
  `;
}

function filterRoster() {
  const search = document.getElementById('searchInput')?.value.toLowerCase() || '';
  const ruolo = document.getElementById('ruoloFilter')?.value || '';
  const stato = document.getElementById('statoFilter')?.value || '';
  
  let filtered = allPlayers;
  if (search) filtered = filtered.filter(p => `${p.nome} ${p.cognome}`.toLowerCase().includes(search));
  if (ruolo) filtered = filtered.filter(p => p.ruolo === ruolo);
  if (stato) filtered = filtered.filter(p => p.stato === stato);
  
  document.getElementById('rosterGrid').innerHTML = filtered.map(p => `
    <div class="card player-card card-clickable" onclick="showPlayerDetail('${p.id}')">
      <div class="player-avatar" style="background:${getAvatarColor(p.nome)}">${p.nome.charAt(0)}${p.cognome.charAt(0)}</div>
      <div class="player-info">
        <div class="player-name">${p.nome} ${p.cognome}</div>
        <div class="player-role">${p.ruolo} · #${p.numeroMaglia}</div>
        <div style="margin-top:6px;">
          <span class="badge ${p.stato === 'Attivo' ? 'badge-green' : p.stato === 'Infortunato' ? 'badge-red' : 'badge-orange'}">${p.stato}</span>
        </div>
      </div>
    </div>
  `).join('');
}

function showPlayerDetail(id) {
  alert(`Dettaglio giocatore ${id} - Disponibile nello Sprint 4`);
}

function getAvatarColor(name) {
  const colors = ['#1A365D', '#2ECC71', '#E74C3C', '#F39C12', '#2980B9', '#8E44AD', '#16A085', '#D35400'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

// ============================================
// CALENDARIO
// ============================================
function loadCalendar() {
  const container = document.getElementById('pageContent');
  
  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;">
      <div>
        <h1 class="page-title">Calendario</h1>
        <p class="page-subtitle">Partite e allenamenti della stagione</p>
      </div>
      <button class="btn btn-primary">+ Evento</button>
    </div>
    
    <div class="card" style="margin-bottom:20px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
        <button class="btn btn-secondary btn-small">← Giugno</button>
        <span style="font-weight:600;">Giugno 2026</span>
        <button class="btn btn-secondary btn-small">Luglio →</button>
      </div>
      
      <div class="match-card" style="margin-bottom:12px;">
        <div>
          <div class="match-date">Sabato 24 Giugno 2026 · 17:30</div>
          <div class="match-teams">ASD Albalonga vs ASD Torrino</div>
          <div class="match-info">Campionato Provinciale</div>
        </div>
        <div style="display:flex;align-items:center;gap:12px;">
          <span class="badge badge-green">Casa</span>
          <button class="btn btn-secondary btn-small">Dettagli</button>
        </div>
      </div>
      
      <div class="match-card">
        <div>
          <div class="match-date">Mercoledì 21 Giugno 2026 · 18:00</div>
          <div class="match-teams">Allenamento</div>
          <div class="match-info">Campo Sportivo Comunale</div>
        </div>
        <span class="badge badge-blue">Allenamento</span>
      </div>
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
        <h3 class="section-title">Report Stagionale Squadra</h3>
        <p style="color:var(--gray);margin-bottom:20px;">Riepilogo completo: classifica marcatori, assist, presenze, disciplina.</p>
        <button class="btn btn-primary">Scarica PDF</button>
      </div>
      
      <div class="card" style="text-align:center;padding:40px 20px;">
        <div style="font-size:48px;margin-bottom:16px;">👤</div>
        <h3 class="section-title">Report Giocatore</h3>
        <p style="color:var(--gray);margin-bottom:20px;">Scheda personale con statistiche e storico carriera.</p>
        <select class="filter-select" style="margin-bottom:12px;">
          <option>Seleziona giocatore...</option>
        </select>
        <br>
        <button class="btn btn-primary">Scarica PDF</button>
      </div>
    </div>
    
    <div style="text-align:center;margin-top:40px;color:var(--gray);">
      ⏳ I report avanzati saranno disponibili nello Sprint 5
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
    <p class="page-subtitle">Configura il workspace e gestisci stagioni e squadre</p>
    
    <div class="card" style="margin-bottom:20px;">
      <h3 class="section-title">📆 Stagione Attiva</h3>
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div>
          <div style="font-weight:600;">2025/26</div>
          <div style="font-size:13px;color:var(--gray);">1 Luglio 2025 - 30 Giugno 2026</div>
        </div>
        <span class="badge badge-green">Attiva</span>
      </div>
    </div>
    
    <div class="card" style="margin-bottom:20px;">
      <h3 class="section-title">⚽ Squadre</h3>
      <div style="padding:12px;background:var(--gray-light);border-radius:8px;margin-bottom:8px;">
        <span style="font-weight:500;">Under 14 Provinciale</span>
        <span class="badge badge-blue" style="margin-left:8px;">Under 14</span>
      </div>
      <button class="btn btn-secondary btn-small">+ Nuova Squadra</button>
    </div>
    
    <div class="card">
      <h3 class="section-title">💾 Backup Dati</h3>
      <p style="font-size:14px;color:var(--gray);margin-bottom:12px;">Esporta tutti i dati del workspace in formato CSV.</p>
      <button class="btn btn-secondary">Esporta Dati</button>
    </div>
  `;
}