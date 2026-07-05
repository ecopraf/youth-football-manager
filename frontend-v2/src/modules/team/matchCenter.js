import { apiFetch } from '../../services/api.js';
import { formatDate } from '../../utils/formatters.js';
import { showLoading, hideLoading } from '../../utils/ui.js';
import { invalidateDashboardCache } from './dashboard.js';
import { invalidateStatsCache } from '../performance/stats.js';

let match = null;
let eventi = [];
let giocatori = [];
let isReadOnly = false;
let liveInterval = null;

export default async function loadMatchCenter() {
  const c = document.getElementById('pageContent');
  const mid = window.YFM.pageParams?.matchId;
  if (!mid) { c.innerHTML = '<div class="error-box">Partita non specificata</div>'; return; }

  c.innerHTML = '<div class="loading"><div class="spinner"></div>Caricamento Match Center...</div>';

  try {
    // Load match data + events
    const det = await apiFetch('/partite/' + mid + '/dettaglio');
    match = det.match;
    if (!match) throw new Error('Partita non trovata');
    eventi = (det.eventi || []).map(e => ({
      ...e, tipo: e.tipo_evento || e.tipo,
      principale: e.player_name || '', principale_id: e.player_id || null,
      assist_name: e.player_name_secondary || '', assist_id: e.player_id_secondario || null,
      autogol: e.autogol || false, rigore: e.rigore || false,
      minuto: e.minuto || ''
    }));

    // Load players: formazione → convocati → rosa
    giocatori = await loadGiocatori(mid);

    // Check read-only
    const isGuest = !!(window.YFM.guestSquadreAccesso?.length);
    isReadOnly = isGuest || match.archiviata === true;

    render(c, mid);
  } catch (err) {
    c.innerHTML = '<div class="error-box">Errore: ' + err.message + '</div>';
  }
}

async function loadGiocatori(mid) {
  let list = [];
  try {
    const res = await apiFetch('/partite/' + mid + '/formazione');
    const arr = res?.formazione || (Array.isArray(res) ? res : []);
    if (arr.length > 0) {
      const ids = arr.map(f => f.calciatoreId || f.player_id).filter(Boolean);
      const rosa = await apiFetch('/squadre/' + window.YFM.squadraId + '/calciatori').catch(() => []);
      const map = {}; (rosa || []).forEach(g => { map[g.id] = g; });
      list = ids.map(id => ({ calciatoreId: id, nome: map[id]?.nome || '', cognome: map[id]?.cognome || '' }));
    }
  } catch(e) {}
  if (list.length === 0) {
    try {
      const conv = await apiFetch('/partite/' + mid + '/convocazioni');
      const arr = (Array.isArray(conv) ? conv : []).filter(c => c.presente);
      if (arr.length > 0) {
        const rosa = await apiFetch('/squadre/' + window.YFM.squadraId + '/calciatori').catch(() => []);
        const map = {}; (rosa || []).forEach(g => { map[g.id] = g; });
        list = arr.map(c => ({ calciatoreId: c.calciatoreId, nome: map[c.calciatoreId]?.nome || '', cognome: map[c.calciatoreId]?.cognome || '' }));
      }
    } catch(e) {}
  }
  if (list.length === 0) {
    try {
      const rosa = await apiFetch('/squadre/' + window.YFM.squadraId + '/calciatori');
      list = (rosa || []).map(g => ({ calciatoreId: g.id, nome: g.nome || '', cognome: g.cognome || '' }));
    } catch(e) {}
  }
  return list.sort((a, b) => (a.cognome || '').localeCompare(b.cognome || ''));
}

function render(c, mid) {
  if (liveInterval) { clearInterval(liveInterval); liveInterval = null; }
  c.innerHTML = getStyles() + getHeader(mid) + getTabs() + getBody(mid) + getDrawer();
  bindEvents(mid);
  startLiveInterval();
}

// ── LIVE MODE UTILITIES ──
function getHalfDuration() {
  // Detect from category name: U14/U15=35, U16=40, default=45
  const cat = (window.YFM.categoryName || '').toLowerCase();
  if (cat.includes('14') || cat.includes('15')) return 35;
  if (cat.includes('16')) return 40;
  return 45;
}

function calcLiveMinute() {
  const meta = match?.live_meta;
  if (!meta) return null;
  const half = getHalfDuration();
  const now = Date.now();
  if (meta.stato === '1t' && meta.start_1t) {
    const elapsed = Math.floor((now - new Date(meta.start_1t).getTime()) / 60000) + 1;
    return Math.min(elapsed, half + 5); // max half+5 (recupero)
  }
  if (meta.stato === 'intervallo') return half; // fisso al minuto fine 1T
  if (meta.stato === '2t' && meta.start_2t) {
    const elapsed = Math.floor((now - new Date(meta.start_2t).getTime()) / 60000) + half + 1;
    return Math.min(elapsed, half * 2 + 5);
  }
  if (meta.stato === 'fine') return half * 2; // 70/80/90
  return null;
}

function getLiveStateLabel() {
  const meta = match?.live_meta;
  if (!meta?.stato) return { label: '▶️ Inizio 1°T', action: 'start_1t' };
  if (meta.stato === '1t') return { label: '⏸️ Fine 1°T', action: 'end_1t' };
  if (meta.stato === 'intervallo') return { label: '▶️ Inizio 2°T', action: 'start_2t' };
  if (meta.stato === '2t') return { label: '🏁 Fine Partita', action: 'end_match' };
  return { label: '✅ Terminata', action: null };
}

function startLiveInterval() {
  const meta = match?.live_meta;
  if (!meta || meta.stato === 'fine' || meta.stato === 'intervallo') return;
  if (meta.stato === '1t' || meta.stato === '2t') {
    updateMinuteBadge();
    liveInterval = setInterval(updateMinuteBadge, 10000);
  }
}

function updateMinuteBadge() {
  const el = document.getElementById('mcLiveMin');
  if (!el) return;
  const min = calcLiveMinute();
  el.textContent = min ? min + "'" : '';
  el.style.display = min ? 'inline-block' : 'none';
}

function getTabs() {
  const count = eventi.length;
  return `<div class="mc-tabs">
    <button class="mc-tab active" data-tab="events">📋 Eventi${count ? ' <span class="mc-tab-badge">' + count + '</span>' : ''}</button>
    <button class="mc-tab" data-tab="overview">📊 Panoramica</button>
    <button class="mc-tab" data-tab="details">ℹ️ Dettagli</button>
  </div>`;
}

function getBody(mid) {
  return `<div class="mc-body">
    <div class="mc-col-left">${getTimeline(mid)}</div>
    <div class="mc-col-right">${getQuickActions(mid)}${getSaveButton()}</div>
  </div>`;
}

function getSaveButton() {
  if (isReadOnly) return '';
  return '<button class="mc-save-result" id="mcSave">💾 Salva Risultato ed Eventi</button>';
}

// ── STYLES ──
function getStyles() {
  return `<style>
.mc{max-width:800px;margin:0 auto;padding:0 12px;}
.mc-back{display:inline-flex;align-items:center;gap:6px;color:#667eea;font-size:13px;font-weight:600;cursor:pointer;margin-bottom:16px;padding:6px 0;}
.mc-back:hover{text-decoration:underline;}
.mc-header{background:white;border-radius:16px;padding:24px 20px;text-align:center;margin-bottom:0;box-shadow:0 2px 12px rgba(0,0,0,0.06);border:1px solid #eee;}
.mc-teams{display:flex;align-items:center;justify-content:center;gap:20px;}
.mc-team-block{display:flex;flex-direction:column;align-items:center;gap:6px;min-width:100px;}
.mc-team-logo{width:48px;height:48px;border-radius:50%;background:#f0f0f0;display:flex;align-items:center;justify-content:center;font-size:24px;overflow:hidden;}
.mc-team-logo img{width:100%;height:100%;object-fit:contain;}
.mc-team-name{font-size:14px;font-weight:700;color:#1a1a2e;max-width:120px;text-align:center;line-height:1.2;}
.mc-team-bar{width:60px;height:4px;border-radius:2px;margin-top:4px;}
.mc-score-block{display:flex;flex-direction:column;align-items:center;gap:4px;}
.mc-score{display:flex;align-items:center;gap:8px;}
.mc-score-num{font-size:42px;font-weight:800;color:#1a1a2e;line-height:1;}
.mc-score-sep{font-size:28px;color:#ccc;}
.mc-score-btn{width:24px;height:24px;border-radius:50%;border:1px solid #ddd;background:white;color:#333;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;}
.mc-score-btn:hover{background:#f0f4ff;border-color:#667eea;}
.mc-badge{display:inline-block;padding:4px 12px;border-radius:12px;font-size:11px;font-weight:700;}
.mc-badge-live{background:#27AE60;color:white;animation:blink-live 1.5s ease-in-out infinite;}
@keyframes blink-live{0%,100%{opacity:1;}50%{opacity:0.4;}}
.mc-badge-arch{background:#8B7355;color:white;}
.mc-meta{font-size:12px;color:#888;margin-top:10px;}
.mc-qa-card{background:white;border-radius:12px;padding:16px;border:1px solid #eee;margin-bottom:12px;}
.mc-qa-title{font-size:13px;font-weight:700;color:#333;margin-bottom:12px;}
.mc-qa{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;}
.mc-qa-btn{display:flex;flex-direction:column;align-items:center;gap:6px;padding:14px 8px;border-radius:12px;border:1px solid #eee;background:#fafafa;cursor:pointer;transition:all 0.15s;}
.mc-qa-btn:hover{transform:translateY(-2px);box-shadow:0 4px 12px rgba(0,0,0,0.1);background:white;}
.mc-qa-btn .qa-icon{font-size:26px;}
.mc-qa-btn .qa-label{font-size:11px;font-weight:600;color:#333;text-align:center;}
.mc-tl-title{font-size:13px;font-weight:700;color:#333;margin-bottom:12px;}
.mc-tl-empty{text-align:center;padding:40px 20px;color:#aaa;font-size:14px;}
.mc-tl-item{display:flex;align-items:flex-start;gap:12px;padding:12px;background:white;border-radius:10px;margin-bottom:8px;border:1px solid #f0f0f0;position:relative;transition:all 0.2s;}
.mc-tl-item:hover{box-shadow:0 2px 8px rgba(0,0,0,0.06);}
.mc-tl-min{min-width:36px;font-size:13px;font-weight:700;color:#667eea;text-align:center;padding-top:2px;}
.mc-tl-icon{font-size:20px;}
.mc-tl-body{flex:1;}
.mc-tl-player{font-size:14px;font-weight:600;color:#222;}
.mc-tl-sub{font-size:12px;color:#888;margin-top:2px;}
.mc-tl-score{font-size:12px;font-weight:700;color:#667eea;margin-top:2px;}
.mc-tl-badge{display:inline-block;padding:1px 5px;border-radius:4px;font-size:9px;font-weight:700;margin-left:6px;vertical-align:middle;}
.mc-tl-badge-rig{background:#3498DB20;color:#3498DB;border:1px solid #3498DB;}
.mc-tl-badge-aut{background:#E74C3C20;color:#E74C3C;border:1px solid #E74C3C;}
.mc-tl-menu{position:absolute;top:8px;right:8px;cursor:pointer;font-size:16px;color:#ccc;padding:4px;}
.mc-tl-menu:hover{color:#333;}
.mc-tl-dropdown{position:absolute;top:28px;right:8px;background:white;border:1px solid #eee;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.12);z-index:10;display:none;}
.mc-tl-dropdown.open{display:block;}
.mc-tl-dropdown button{display:block;width:100%;padding:8px 16px;border:none;background:none;text-align:left;font-size:12px;cursor:pointer;}
.mc-tl-dropdown button:hover{background:#f5f5f5;}
.mc-drawer-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.4);z-index:1000;display:none;justify-content:flex-end;}
.mc-drawer-overlay.open{display:flex;}
.mc-drawer{width:360px;max-width:90vw;background:white;height:100%;overflow-y:auto;padding:24px 20px;box-shadow:-4px 0 20px rgba(0,0,0,0.15);animation:slideIn 0.2s ease-out;}
@keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}
.mc-drawer-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;}
.mc-drawer-head h3{margin:0;font-size:18px;}
.mc-drawer-close{border:none;background:none;font-size:24px;cursor:pointer;color:#888;padding:4px;}
.mc-drawer-tabs{display:flex;gap:4px;margin-bottom:16px;border-bottom:1px solid #eee;padding-bottom:8px;}
.mc-drawer-tab{padding:6px 14px;border:none;background:none;font-size:12px;font-weight:600;color:#888;cursor:pointer;border-radius:6px;}
.mc-drawer-tab.active{background:#667eea;color:white;}
.mc-tipo-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;}
.mc-tipo-card{display:flex;flex-direction:column;align-items:center;gap:3px;padding:10px 4px;border-radius:10px;border:2px solid #eee;cursor:pointer;font-size:20px;transition:all 0.15s;}
.mc-tipo-card span{font-size:9px;font-weight:600;color:#666;}
.mc-tipo-card:hover{border-color:#667eea;background:#f0f4ff;}
.mc-tipo-card.selected{border-color:#667eea;background:#667eea15;box-shadow:0 0 0 2px #667eea40;}
.mc-min-row{display:flex;align-items:center;gap:8px;}
.mc-min-row input{width:60px;text-align:center;padding:8px;border:1px solid #ddd;border-radius:8px;font-size:16px;font-weight:700;}
.mc-min-btn{width:32px;height:32px;border-radius:50%;border:1px solid #ddd;background:white;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;}
.mc-min-btn:hover{background:#f0f4ff;border-color:#667eea;}
.mc-recup{display:flex;align-items:center;gap:4px;font-size:11px;color:#666;margin-left:8px;cursor:pointer;}
.mc-recup input{width:auto;}
.mc-drawer .form-group{margin-bottom:14px;}
.mc-drawer .form-group label{display:block;font-size:12px;color:#666;margin-bottom:4px;font-weight:600;}
.mc-drawer .form-group select{width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:13px;}
.mc-drawer-actions{display:flex;gap:8px;margin-top:20px;}
.mc-drawer-actions .btn{flex:1;}
.mc-save-result{width:100%;margin-top:16px;padding:12px;border-radius:10px;border:none;background:#27AE60;color:white;font-size:14px;font-weight:600;cursor:pointer;}
.mc-save-result:hover{background:#219a52;}
.mc-live-btn{padding:10px 24px;border:none;border-radius:10px;color:white;font-size:13px;font-weight:700;cursor:pointer;transition:opacity 0.15s;}
.mc-live-btn:hover{opacity:0.85;}
.mc-tabs{display:flex;gap:4px;padding:12px 0;border-bottom:1px solid #eee;margin-bottom:16px;overflow-x:auto;}
.mc-tab{padding:8px 16px;border:none;background:none;font-size:13px;font-weight:600;color:#888;cursor:pointer;border-radius:8px;white-space:nowrap;}
.mc-tab:hover{background:#f5f5f5;color:#333;}
.mc-tab.active{background:#667eea;color:white;}
.mc-tab-badge{background:white;color:#667eea;padding:1px 6px;border-radius:8px;font-size:10px;margin-left:4px;}
.mc-body{display:grid;grid-template-columns:1fr 280px;gap:20px;}
.mc-col-left{min-width:0;}
.mc-col-right{}
@media(max-width:768px){
  .mc-body{grid-template-columns:1fr;}
  .mc-col-right{order:-1;}
}
@media(max-width:639px){
  .mc-qa{grid-template-columns:repeat(2,1fr);}
  .mc-teams{gap:10px;}
  .mc-team-name{font-size:13px;max-width:90px;}
  .mc-score-num{font-size:36px;}
  .mc-drawer{width:100%;max-width:100vw;}
}
</style>`;
}

// ── HEADER ──
function getHeader(mid) {
  const teamName = window.YFM.getSocietaName();
  const teamLogo = window.YFM.getWorkspaceLogo();
  // Score SEMPRE calcolato dagli eventi (fonte di verità)
  // Se nessun evento ma risultato salvato in DB, usa quello
  const hasEventiGol = eventi.some(e => e.tipo === 'GOAL' || e.tipo === 'SUBITO' || e.tipo === 'AUTOGOL');
  const golCasa = hasEventiGol ? eventi.filter(e => e.tipo === 'GOAL' || e.tipo === 'AUTOGOL').length : (match.gol_casa ?? 0);
  const golOspite = hasEventiGol ? eventi.filter(e => e.tipo === 'SUBITO').length : (match.gol_ospite ?? 0);
  const isCasa = (match.luogo || '').toLowerCase() === 'casa';
  const leftName = isCasa ? teamName : match.avversario;
  const rightName = isCasa ? match.avversario : teamName;
  const leftScore = isCasa ? golCasa : golOspite;
  const rightScore = isCasa ? golOspite : golCasa;
  const leftLogo = isCasa ? (teamLogo ? `<img src="${teamLogo}">` : '🏠') : (match.logo ? `<img src="${match.logo}">` : '⚽');
  const rightLogo = isCasa ? (match.logo ? `<img src="${match.logo}">` : '⚽') : (teamLogo ? `<img src="${teamLogo}">` : '🏠');

  // Barra colore: verde chi vince, rossa chi perde, gialla pari
  const leftWinning = leftScore > rightScore;
  const rightWinning = rightScore > leftScore;
  const leftBar = leftWinning ? '#27AE60' : (rightWinning ? '#E74C3C' : '#F39C12');
  const rightBar = rightWinning ? '#27AE60' : (leftWinning ? '#E74C3C' : '#F39C12');

  const liveMin = calcLiveMinute();
  let badge = '';
  if (match.archiviata) badge = '<span class="mc-badge mc-badge-arch">📦 Archiviata</span>';
  else if (match.live_meta?.stato === 'fine' || match.stato === 'Terminata') badge = '<span class="mc-badge" style="background:#27AE60;color:white;">✅ Terminata</span>';
  else if (match.live_meta?.stato === '1t' || match.live_meta?.stato === '2t') badge = `<span class="mc-badge mc-badge-live">Live</span><span class="mc-badge mc-badge-live" id="mcLiveMin" style="margin-left:4px;">${liveMin ? liveMin + "'" : ''}</span>`;
  else if (match.live_meta?.stato === 'intervallo') badge = '<span class="mc-badge" style="background:#F39C12;color:white;">⏸️ Intervallo</span>';
  else badge = '';

  const btnL = isReadOnly ? '' : `<button class="mc-score-btn" data-action="dec-left">−</button><button class="mc-score-btn" data-action="inc-left">+</button>`;
  const btnR = isReadOnly ? '' : `<button class="mc-score-btn" data-action="dec-right">−</button><button class="mc-score-btn" data-action="inc-right">+</button>`;

  return `<div class="mc">
  <div class="mc-back" id="mcBack">← Calendario</div>
  <div class="mc-header">
    <div class="mc-teams">
      <div class="mc-team-block">
        <div class="mc-team-logo">${leftLogo}</div>
        <div class="mc-team-name">${leftName}</div>
        <div class="mc-team-bar" style="background:${leftBar}"></div>
      </div>
      <div class="mc-score-block">
        <div class="mc-score">${btnL}<span class="mc-score-num" id="scoreLeft">${leftScore}</span><span class="mc-score-sep">-</span><span class="mc-score-num" id="scoreRight">${rightScore}</span>${btnR}</div>
        ${badge}
      </div>
      <div class="mc-team-block">
        <div class="mc-team-logo">${rightLogo}</div>
        <div class="mc-team-name">${rightName}</div>
        <div class="mc-team-bar" style="background:${rightBar}"></div>
      </div>
    </div>
    <div class="mc-meta">📅 ${formatDate(match.data_ora)}${match.competizione ? ' · 🏆 ' + match.competizione : ''}${match.giornata ? ' · G.' + match.giornata : ''} · ${match.luogo || ''}</div>
    ${!isReadOnly ? getLiveButton() : ''}
  </div>`;
}

// ── QUICK ACTIONS ──
function getLiveButton() {
  const { label, action } = getLiveStateLabel();
  if (!action) return '<div style="margin-top:12px;"><span class="mc-badge" style="background:#27AE60;color:white;">✅ Partita terminata</span></div>';
  const colors = { start_1t: '#667eea', end_1t: '#F39C12', start_2t: '#667eea', end_match: '#E74C3C' };
  return `<div style="margin-top:12px;"><button class="mc-live-btn" id="mcLiveBtn" data-action="${action}" style="background:${colors[action]};">${label}</button></div>`;
}

function getQuickActions(mid) {
  if (isReadOnly) return '';
  const actions = [
    { icon: '⚽', label: 'Gol', tipo: 'GOAL' },
    { icon: '🟨', label: 'Ammonizione', tipo: 'YELLOW' },
    { icon: '🟥', label: 'Espulsione', tipo: 'RED' },
    { icon: '🔄', label: 'Sostituzione', tipo: 'SUB' },
    { icon: '🥅', label: 'Rigore', tipo: 'RIGORE' },
    { icon: '🧤', label: 'Autogol', tipo: 'AUTOGOL' }
  ];
  const btns = actions.map(a => `<div class="mc-qa-btn" data-tipo="${a.tipo}"><span class="qa-icon">${a.icon}</span><span class="qa-label">${a.label}</span></div>`).join('');
  return `<div class="mc-qa-card"><div class="mc-qa-title">Azioni rapide</div><div class="mc-qa">${btns}</div></div>`;
}

// ── TIMELINE ──
function getTimeline(mid) {
  const sorted = [...eventi].sort((a, b) => (parseInt(a.minuto) || 0) - (parseInt(b.minuto) || 0));
  let html = '<div class="mc-tl-title">📋 Timeline Eventi</div>';
  if (sorted.length === 0) {
    html += '<div class="mc-tl-empty">Nessun evento registrato.<br>Usa le azioni rapide per aggiungere.</div>';
  } else {
    // Calcola score progressivo
    let runCasa = 0, runOspite = 0;
    sorted.forEach((e, i) => {
      if (e.tipo === 'GOAL') runCasa++;
      if (e.tipo === 'SUBITO') runOspite++;
      const cfg = EVT_CONFIG[e.tipo] || { icon: '●', label: e.tipo };
      const menuHtml = isReadOnly ? '' : `<span class="mc-tl-menu" data-idx="${i}">⋮</span><div class="mc-tl-dropdown" id="tldd${i}"><button data-edit="${i}">✏️ Modifica</button><button data-del="${i}">🗑️ Elimina</button></div>`;
      let subLine = '';
      if (e.assist_name) subLine = `<div class="mc-tl-sub">🅰️ ${e.assist_name}</div>`;
      if (e.tipo === 'SUB' && e.sub_in) subLine = `<div class="mc-tl-sub">⬅️ Entra: ${e.sub_in}</div>`;
      let badges = '';
      if (e.rigore) badges += '<span class="mc-tl-badge mc-tl-badge-rig">RIG</span>';
      if (e.autogol || e.tipo === 'AUTOGOL') badges += '<span class="mc-tl-badge mc-tl-badge-aut">AUT</span>';
      html += `<div class="mc-tl-item">
        <div class="mc-tl-min">${e.minuto ? e.minuto + "'" : '—'}</div>
        <div class="mc-tl-icon">${cfg.icon}</div>
        <div class="mc-tl-body">
          <div class="mc-tl-player">${e.principale || cfg.label} ${badges}</div>
          ${subLine}
          ${e.tipo === 'GOAL' || e.tipo === 'SUBITO' ? `<div class="mc-tl-score">${runCasa} - ${runOspite}</div>` : ''}
        </div>
        ${menuHtml}
      </div>`;
    });
  }

  const saveBtn = '';
  html += saveBtn + '</div>';
  return html;
}

// ── DRAWER ──
function getDrawer() {
  const options = giocatori.map(g => `<option value="${g.calciatoreId}">${g.cognome} ${g.nome}</option>`).join('');
  return `<div class="mc-drawer-overlay" id="mcDrawerOverlay">
  <div class="mc-drawer">
    <div class="mc-drawer-head"><h3 id="drawerTitle">Aggiungi Evento</h3><button class="mc-drawer-close" id="drClose">×</button></div>
    <div class="mc-drawer-tabs">
      <button class="mc-drawer-tab active" data-dtab="evento">⚽ Evento</button>
      <button class="mc-drawer-tab" data-dtab="sostituzione">🔄 Sostituzione</button>
    </div>
    <div id="drPanelEvento">
      <div class="form-group"><label>Tipo evento</label>
        <div class="mc-tipo-grid" id="drTipoGrid">
          <div class="mc-tipo-card selected" data-t="GOAL">⚽<span>Gol</span></div>
          <div class="mc-tipo-card" data-t="YELLOW">🟨<span>Amm.</span></div>
          <div class="mc-tipo-card" data-t="RED">🟥<span>Esp.</span></div>
          <div class="mc-tipo-card" data-t="SUBITO">🥅<span>Subito</span></div>
          <div class="mc-tipo-card" data-t="AUTOGOL">🧤<span>Autogol</span></div>
        </div>
      </div>
      <div class="form-group"><label>Minuto</label>
        <div class="mc-min-row"><button class="mc-min-btn" id="drMinDec">−</button><input type="number" id="drMin" min="1" max="120" placeholder="0"><button class="mc-min-btn" id="drMinInc">+</button><label class="mc-recup"><input type="checkbox" id="drRecup"> Rec.</label></div>
      </div>
      <div class="form-group"><label>Giocatore</label><select id="drPlayer"><option value="">-- Seleziona --</option>${options}</select></div>
      <div class="form-group" id="drAssistGroup" style="display:none;"><label>Assist</label><select id="drAssist"><option value="">-- Nessuno --</option>${options}</select></div>
      <div class="form-group" id="drFlagsGroup" style="display:none;"><label class="mc-recup"><input type="checkbox" id="drRigore"> Rigore</label></div>
    </div>
    <div id="drPanelSostituzione" style="display:none;">
      <div class="form-group"><label>Minuto</label>
        <div class="mc-min-row"><button class="mc-min-btn" id="drMinDec2">−</button><input type="number" id="drMin2" min="1" max="120" placeholder="0"><button class="mc-min-btn" id="drMinInc2">+</button></div>
      </div>
      <div class="form-group"><label>➡️ Esce</label><select id="drSubOut"><option value="">-- Seleziona --</option>${options}</select></div>
      <div class="form-group"><label>⬅️ Entra</label><select id="drSubIn"><option value="">-- Seleziona --</option>${options}</select></div>
    </div>
    <input type="hidden" id="drTipo" value="GOAL">
    <input type="hidden" id="drEditIdx" value="-1">
    <div class="mc-drawer-actions">
      <button class="btn btn-secondary" id="drCancel">Annulla</button>
      <button class="btn btn-primary" id="drSave">Salva Evento</button>
    </div>
  </div>
</div>`;
}

// ── EVENT CONFIG ──
const EVT_CONFIG = {
  'GOAL': { icon: '⚽', label: 'Gol', color: '#27AE60' },
  'SUBITO': { icon: '🥅', label: 'Gol Subito', color: '#E74C3C' },
  'YELLOW': { icon: '🟨', label: 'Ammonizione', color: '#F39C12' },
  'RED': { icon: '🟥', label: 'Espulsione', color: '#E74C3C' },
  'ASSIST': { icon: '🅰️', label: 'Assist', color: '#3498DB' },
  'SUB': { icon: '🔄', label: 'Sostituzione', color: '#9B59B6' },
  'IN': { icon: '⬅️', label: 'Entrata', color: '#1ABC9C' },
  'OUT': { icon: '➡️', label: 'Uscita', color: '#9B59B6' }
};

// ── BIND EVENTS ──
function bindEvents(mid) {
  // Back button
  document.getElementById('mcBack')?.addEventListener('click', () => window.YFM.navigateTo('calendar'));

  // Score +/- buttons
  document.querySelectorAll('.mc-score-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      const leftEl = document.getElementById('scoreLeft');
      const rightEl = document.getElementById('scoreRight');
      let l = parseInt(leftEl.textContent) || 0;
      let r = parseInt(rightEl.textContent) || 0;
      if (action === 'inc-left') l++;
      if (action === 'dec-left' && l > 0) l--;
      if (action === 'inc-right') r++;
      if (action === 'dec-right' && r > 0) r--;
      leftEl.textContent = l;
      rightEl.textContent = r;
    });
  });

  // Quick actions → open drawer
  document.querySelectorAll('.mc-qa-btn').forEach(btn => {
    btn.addEventListener('click', () => openDrawer(btn.dataset.tipo));
  });

  // Drawer cancel/close
  document.getElementById('drCancel')?.addEventListener('click', closeDrawer);
  document.getElementById('drClose')?.addEventListener('click', closeDrawer);
  document.getElementById('mcDrawerOverlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'mcDrawerOverlay') closeDrawer();
  });

  // Drawer tabs
  document.querySelectorAll('.mc-drawer-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.mc-drawer-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const panel = tab.dataset.dtab;
      document.getElementById('drPanelEvento').style.display = panel === 'evento' ? 'block' : 'none';
      document.getElementById('drPanelSostituzione').style.display = panel === 'sostituzione' ? 'block' : 'none';
    });
  });

  // Tipo cards
  document.querySelectorAll('.mc-tipo-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.mc-tipo-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      document.getElementById('drTipo').value = card.dataset.t;
      const isGoal = card.dataset.t === 'GOAL';
      document.getElementById('drAssistGroup').style.display = isGoal ? 'block' : 'none';
      document.getElementById('drFlagsGroup').style.display = isGoal ? 'block' : 'none';
    });
  });

  // Minute +/- buttons
  const bindMinBtn = (decId, incId, inputId) => {
    document.getElementById(decId)?.addEventListener('click', () => {
      const el = document.getElementById(inputId);
      el.value = Math.max(1, (parseInt(el.value) || 0) - 1);
    });
    document.getElementById(incId)?.addEventListener('click', () => {
      const el = document.getElementById(inputId);
      el.value = (parseInt(el.value) || 0) + 1;
    });
  };
  bindMinBtn('drMinDec', 'drMinInc', 'drMin');
  bindMinBtn('drMinDec2', 'drMinInc2', 'drMin2');

  // Drawer save
  document.getElementById('drSave')?.addEventListener('click', () => saveEventFromDrawer(mid));

  // Timeline menu ⋮
  document.querySelectorAll('.mc-tl-menu').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = el.dataset.idx;
      document.querySelectorAll('.mc-tl-dropdown').forEach(d => d.classList.remove('open'));
      document.getElementById('tldd' + idx)?.classList.toggle('open');
    });
  });

  // Edit/Delete from dropdown
  document.querySelectorAll('[data-edit]').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.edit);
      openDrawerForEdit(idx);
    });
  });
  document.querySelectorAll('[data-del]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const idx = parseInt(btn.dataset.del);
      if (!await confirm('Eliminare questo evento?')) return;
      eventi.splice(idx, 1);
      render(document.getElementById('pageContent'), mid);
      showToast('Evento rimosso — salva per confermare');
    });
  });

  // Save result button
  document.getElementById('mcSave')?.addEventListener('click', () => saveAll(mid));

  // Live button
  document.getElementById('mcLiveBtn')?.addEventListener('click', async () => {
    const action = document.getElementById('mcLiveBtn').dataset.action;
    const confirmMsg = action === 'end_match' ? 'Confermi Fine Partita?' : null;
    if (confirmMsg && !await confirm(confirmMsg)) return;
    try {
      const res = await apiFetch('/partite/' + mid + '/live-action', { method: 'PUT', body: JSON.stringify({ action }) });
      match.live_meta = res.live_meta;
      if (action === 'end_match') match.stato = 'Terminata';
      render(document.getElementById('pageContent'), mid);
    } catch (err) { alert('Errore: ' + err.message); }
  });

  // Close dropdowns on outside click
  document.addEventListener('click', () => {
    document.querySelectorAll('.mc-tl-dropdown').forEach(d => d.classList.remove('open'));
  });
}

// ── DRAWER LOGIC ──
function openDrawer(tipo, editIdx = -1) {
  const isSub = tipo === 'SUB';
  document.getElementById('drTipo').value = isSub ? 'SUB' : tipo;
  document.getElementById('drEditIdx').value = editIdx;
  document.getElementById('drawerTitle').textContent = editIdx >= 0 ? 'Modifica Evento' : 'Aggiungi Evento';

  // Activate correct tab
  document.querySelectorAll('.mc-drawer-tab').forEach(t => t.classList.remove('active'));
  document.querySelector(`.mc-drawer-tab[data-dtab="${isSub ? 'sostituzione' : 'evento'}"]`)?.classList.add('active');
  document.getElementById('drPanelEvento').style.display = isSub ? 'none' : 'block';
  document.getElementById('drPanelSostituzione').style.display = isSub ? 'block' : 'none';

  // Select tipo card
  if (!isSub) {
    const effectiveTipo = tipo === 'RIGORE' ? 'GOAL' : tipo;
    document.querySelectorAll('.mc-tipo-card').forEach(c => c.classList.toggle('selected', c.dataset.t === effectiveTipo));
    document.getElementById('drTipo').value = effectiveTipo;
    document.getElementById('drAssistGroup').style.display = effectiveTipo === 'GOAL' ? 'block' : 'none';
    document.getElementById('drFlagsGroup').style.display = effectiveTipo === 'GOAL' ? 'block' : 'none';
    if (tipo === 'RIGORE') document.getElementById('drRigore').checked = true;
  }

  // Pre-fill live minute
  const liveMin = calcLiveMinute();
  if (editIdx < 0 && liveMin) {
    document.getElementById(isSub ? 'drMin2' : 'drMin').value = liveMin;
  }

  document.getElementById('mcDrawerOverlay').classList.add('open');
  setTimeout(() => document.getElementById(isSub ? 'drMin2' : 'drMin')?.focus(), 100);
}

function openDrawerForEdit(idx) {
  const e = eventi[idx];
  if (!e) return;
  openDrawer(e.tipo, idx);
  document.getElementById('drMin').value = e.minuto || '';
  document.getElementById('drPlayer').value = e.principale_id || '';
}

function closeDrawer() {
  document.getElementById('mcDrawerOverlay').classList.remove('open');
  document.getElementById('drMin').value = '';
  document.getElementById('drMin2').value = '';
  document.getElementById('drPlayer').value = '';
  document.getElementById('drAssist').value = '';
  document.getElementById('drSubOut').value = '';
  document.getElementById('drSubIn').value = '';
  document.getElementById('drRigore').checked = false;
  document.getElementById('drEditIdx').value = '-1';
}

function saveEventFromDrawer(mid) {
  const activeTab = document.querySelector('.mc-drawer-tab.active')?.dataset.dtab;
  const editIdx = parseInt(document.getElementById('drEditIdx').value);

  let evento;

  if (activeTab === 'sostituzione') {
    const minuto = parseInt(document.getElementById('drMin2').value) || null;
    const outId = document.getElementById('drSubOut').value;
    const inId = document.getElementById('drSubIn').value;
    if (!minuto) { alert('Inserisci il minuto'); return; }
    if (!outId || !inId) { alert('Seleziona chi esce e chi entra'); return; }
    const gOut = giocatori.find(x => x.calciatoreId === outId);
    const gIn = giocatori.find(x => x.calciatoreId === inId);
    evento = {
      tipo: 'SUB', minuto,
      principale: gOut ? gOut.cognome + ' ' + gOut.nome : '', principale_id: outId,
      sub_in: gIn ? gIn.cognome + ' ' + gIn.nome : '', sub_in_id: inId,
      assist_name: '', assist_id: null, autogol: false
    };
  } else {
    const tipo = document.getElementById('drTipo').value;
    const minuto = parseInt(document.getElementById('drMin').value) || null;
    const playerId = document.getElementById('drPlayer').value;
    const assistId = document.getElementById('drAssist')?.value || '';
    if (!minuto) { alert('Inserisci il minuto'); return; }

    let principale = '', principale_id = null;
    let assist_name = '', assist_id = null;

    if (tipo === 'SUBITO') {
      principale = 'Avversario';
    } else if (playerId) {
      const g = giocatori.find(x => x.calciatoreId === playerId);
      principale = g ? g.cognome + ' ' + g.nome : '';
      principale_id = playerId;
    }
    if (assistId) {
      const a = giocatori.find(x => x.calciatoreId === assistId);
      assist_name = a ? a.cognome + ' ' + a.nome : '';
      assist_id = assistId;
    }
    evento = { tipo: tipo === 'AUTOGOL' ? 'GOAL' : tipo, minuto, principale, principale_id: principale_id || null, assist_name, assist_id: assist_id || null, autogol: tipo === 'AUTOGOL', rigore: (tipo === 'GOAL' && document.getElementById('drRigore')?.checked) || false };
  }

  if (editIdx >= 0) eventi[editIdx] = evento;
  else eventi.push(evento);

  closeDrawer();
  render(document.getElementById('pageContent'), mid);
}

function showToast(msg) {
  const t = document.createElement('div');
  t.textContent = msg;
  Object.assign(t.style, { position:'fixed',bottom:'24px',left:'50%',transform:'translateX(-50%)',background:'#333',color:'white',padding:'10px 20px',borderRadius:'8px',fontSize:'13px',fontWeight:'600',zIndex:'9999',opacity:'0',transition:'opacity 0.3s' });
  document.body.appendChild(t);
  requestAnimationFrame(() => t.style.opacity = '1');
  setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 3000);
}

// ── SAVE ALL ──
async function saveAll(mid) {
  showLoading();
  try {
    // Save events
    await apiFetch('/partite/' + mid + '/eventi-batch', {
      method: 'POST',
      body: JSON.stringify({ eventi })
    });

    // Save result from events count (or manual score if no goal events)
    const hasEventiGol = eventi.some(e => e.tipo === 'GOAL' || e.tipo === 'SUBITO' || e.tipo === 'AUTOGOL');
    const isCasa = (match.luogo || '').toLowerCase() === 'casa';
    let golCasa, golOspite;
    if (hasEventiGol) {
      golCasa = eventi.filter(e => e.tipo === 'GOAL' || e.tipo === 'AUTOGOL').length;
      golOspite = eventi.filter(e => e.tipo === 'SUBITO').length;
    } else {
      const leftScore = parseInt(document.getElementById('scoreLeft')?.textContent) || 0;
      const rightScore = parseInt(document.getElementById('scoreRight')?.textContent) || 0;
      golCasa = isCasa ? leftScore : rightScore;
      golOspite = isCasa ? rightScore : leftScore;
    }

    const updateBody = { golCasa, golOspite };
    // Non forzare 'Terminata' — lo stato lo gestisce il bottone Live
    if (match.live_meta?.stato === 'fine' || match.stato === 'Terminata') updateBody.stato = 'Terminata';
    await apiFetch('/partite/' + mid, {
      method: 'PUT',
      body: JSON.stringify(updateBody)
    });

    hideLoading();
    invalidateDashboardCache();
    invalidateStatsCache();
    alert('✅ Risultato e eventi salvati!');
    window.YFM.navigateTo('calendar');
  } catch (err) {
    hideLoading();
    alert('Errore: ' + err.message);
  }
}
