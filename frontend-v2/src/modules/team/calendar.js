import { apiFetch, API_BASE } from '../../services/api';
import { formatDate, formatDateShort, formatDateCompact } from '../../utils/formatters';
import { showLoading, hideLoading } from '../../utils/ui';
import { invalidateDashboardCache } from './dashboard.js';
import { invalidateStatsCache } from '../performance/stats.js';

let allMatches = [];
let matchSteps = {};

// Helper per creare bottone azione con pallino lampeggiante opzionale
function makeBtn(label, onclick, isNextStep) {
  const dot = isNextStep ? '<span class="pallino-blink"></span>' : '';
  return `<button class="btn btn-secondary btn-small" onclick="event.stopPropagation();${onclick}">${dot}${label}</button>`;
}

export default async function loadCalendar() {
  const c = document.getElementById('pageContent');
  
  try {
    const [matches, stats] = await Promise.all([
      apiFetch('/squadre/' + window.YFM.squadraId + '/partite'),
      apiFetch('/squadre/' + window.YFM.squadraId + '/statistiche-complete').catch(() => ({ risultati: [] }))
    ]);
    allMatches = matches;
    window.YFM.allMatches = matches;
    
    // Render IMMEDIATO senza progress dots (non blocca)
    renderCalendarPage(c, matches, stats);
    
    // Carica progress dots in background
    preloadMatchSteps(matches).then(() => updateProgressDots());
  } catch (e) {
    c.innerHTML = '<div class="error-box">' + e.message + '</div>';
  }
}

async function preloadMatchSteps(matches) {
  const now = new Date();
  const futureMatches = matches.filter(m => new Date(m.data_ora) >= now);
  // Tutte in parallelo (non sequenziale)
  await Promise.all(futureMatches.map(async (m) => {
    matchSteps[m.id] = await getNextStep(m.id);
  }));
}

async function getNextStep(matchId) {
  try {
    const [convStato, formResp, eventiResp] = await Promise.all([
      apiFetch('/partite/' + matchId + '/convocazioni-stato').catch(() => ({ published: false })),
      apiFetch('/squadre/' + window.YFM.squadraId + '/partite/' + matchId + '/formazione').catch(() => null),
      apiFetch('/squadre/' + window.YFM.squadraId + '/partite/' + matchId + '/eventi').catch(() => null)
    ]);
    const hasConvocazione = convStato.published === true;
    const hasFormazione = formResp && ((Array.isArray(formResp) && formResp.length > 0) || Object.keys(formResp || {}).length > 0);
    const match = allMatches.find(m => m.id === matchId);
    const hasRisultato = match && match.stato === 'Terminata';
    const hasEventi = eventiResp && Array.isArray(eventiResp) && eventiResp.length > 0;
    
    if (!hasConvocazione) return 'convocazione';
    if (!hasFormazione) return 'formazione';
    if (!hasRisultato) return 'risultato';
    if (!hasEventi) return 'eventi';
    return null;
  } catch (e) {
    return 'convocazione';
  }
}

function updateProgressDots() {
  // Aggiorna progress dots
  document.querySelectorAll('.match-progress[data-mid]').forEach(el => {
    const mid = el.dataset.mid;
    const nextStep = matchSteps[mid];
    if (nextStep === undefined) return;
    const stepOrder = ['convocazione', 'formazione', 'risultato', 'eventi'];
    const currentIdx = nextStep ? stepOrder.indexOf(nextStep) : 4;
    const labels = { convocazione: 'Conv', formazione: 'Form', risultato: 'MC', eventi: 'Ev' };
    el.innerHTML = stepOrder.map((s, i) => {
      const dotClass = i < currentIdx ? 'progress-done' : i === currentIdx ? 'progress-active' : 'progress-pending';
      return `<div class="progress-step ${dotClass}"><span class="progress-dot"></span><span class="progress-label">${labels[s]}</span></div>`;
    }).join('');
  });
  // Aggiorna pallino lampeggiante nel bottone dell'azione corrente
  document.querySelectorAll('.match-card-inner[data-mid]').forEach(card => {
    const mid = card.dataset.mid;
    const nextStep = matchSteps[mid];
    if (!nextStep) return;
    // Mappa step → testo nel bottone
    const stepToLabel = { convocazione: 'Convoca', formazione: 'Formazione', risultato: 'Risultato', eventi: 'Eventi' };
    const label = stepToLabel[nextStep];
    if (!label) return;
    const btns = card.querySelectorAll('.match-actions-row .btn');
    btns.forEach(btn => {
      if (btn.textContent.includes(label) && !btn.querySelector('.pallino-blink')) {
        btn.insertAdjacentHTML('afterbegin', '<span class="pallino-blink"></span>');
      }
    });
    // Aggiorna bordo sinistro card
    const parentCard = card.closest('.card');
    if (parentCard && !parentCard.style.borderLeft?.includes('#28a745')) {
      parentCard.style.borderLeft = '3px solid #007bff';
    }
  });
}

const stepColors = {
  convocazione: { color: '#007bff', icon: '📋', label: 'Convocazione' },
  formazione: { color: '#17a2b8', icon: '👥', label: 'Formazione' },
  distinta: { color: '#fd7e14', icon: '📄', label: 'Distinta' },
  risultato: { color: '#28a745', icon: '📊', label: 'Risultato' },
  eventi: { color: '#6f42c1', icon: '⚽', label: 'Eventi' }
};

function renderCalendarPage(c, matches, stats) {

  const now = new Date();
  const isGuest = !!(window.YFM.guestSquadreAccesso && window.YFM.guestSquadreAccesso.length > 0);
  
  // Separa future e passate
  // Terminata → sempre nelle giocate. Live → sempre nelle future.
  const isMatchLive = (m) => !!(m.live_meta && ['1t','2t','intervallo'].includes(m.live_meta.stato));
  const isPlayed = (m) => m.stato === 'Terminata' || (m.gol_casa !== null && m.stato !== 'Da disputare');
  const futureMatches = matches
    .filter(m => !isPlayed(m) && (new Date(m.data_ora) >= now || isMatchLive(m)))
    .sort((a, b) => {
      if (isMatchLive(a) && !isMatchLive(b)) return -1;
      if (!isMatchLive(a) && isMatchLive(b)) return 1;
      return new Date(a.data_ora) - new Date(b.data_ora);
    });
  
  const pastMatches = matches
    .filter(m => isPlayed(m) || (new Date(m.data_ora) < now && !isMatchLive(m)))
    .sort((a, b) => new Date(b.data_ora) - new Date(a.data_ora));

  // Prossima partita (la prima delle future)
  const nextMatch = futureMatches.length > 0 ? futureMatches[0] : null;
  const otherFutureMatches = futureMatches.slice(1);

  // === GUEST VIEW: solo prossima + giocate con risultato ===
  if (isGuest) {
    renderGuestCalendar(c, nextMatch, pastMatches, stats);
    return;
  }

  // Stili CSS per LIVE e pallino lampeggiante
  let html = `<style>
    @keyframes pulse-live {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(0.8); }
    }
    @keyframes blink-text {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.3; }
    }
    @keyframes blink-pallino {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.3; transform: scale(0.8); }
    }
    @keyframes live-border {
      0%, 100% { border-left-color: #E74C3C; }
      50% { border-left-color: #ff8a80; }
    }
    @keyframes live-btn-glow {
      0%, 100% { box-shadow: 0 0 0 0 rgba(102,126,234,0.6); }
      50% { box-shadow: 0 0 0 4px rgba(102,126,234,0.3); }
    }
    .btn-live-glow {
      animation: live-btn-glow 1.5s ease-in-out infinite;
      border: 2px solid #667eea !important;
    }
    .live-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      animation: pulse-live 1s ease-in-out infinite;
    }
    .live-text {
      animation: blink-text 1s ease-in-out infinite;
    }
    .pallino-blink {
      display: inline-block;
      width: 8px;
      height: 8px;
      background: #007bff;
      border-radius: 50%;
      margin-right: 4px;
      animation: blink-pallino 1s infinite;
      vertical-align: middle;
    }
    .match-progress { display:flex; gap:12px; padding:6px 0; }
    .progress-step { display:flex; align-items:center; gap:4px; }
    .progress-dot { width:10px; height:10px; border-radius:50%; border:2px solid #dee2e6; background:white; }
    .progress-label { font-size:10px; color:#adb5bd; font-weight:500; }
    .progress-done .progress-dot { background:#28a745; border-color:#28a745; }
    .progress-done .progress-label { color:#28a745; }
    .progress-active .progress-dot { background:#667eea; border-color:#667eea; box-shadow:0 0 0 3px rgba(102,126,234,0.3); animation:pulse-live 1.5s ease-in-out infinite; }
    .progress-active .progress-label { color:#667eea; font-weight:700; }
    .progress-pending .progress-dot { background:white; border-color:#dee2e6; }
    
    .match-card-inner { cursor:pointer; transition:background 0.15s; position:relative; }
    .match-card-inner:hover { background:#f8f9fa; }
    .match-opponent { font-size:18px; font-weight:700; color:#1a1a2e; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .match-date-compact { font-size:13px; color:#6c757d; margin-top:4px; }
    .match-badges { display:flex; flex-wrap:wrap; gap:6px; align-items:center; }
    .match-badge { display:inline-flex; align-items:center; gap:4px; padding:3px 8px; border-radius:12px; font-size:11px; font-weight:600; }
    .badge-casa { background:#D4EDDA; color:#155724; }
    .badge-trasferta { background:#FFF3CD; color:#856404; }
    .badge-section { background:#E9ECEF; color:#495057; }
    .result-badge { display:inline-flex; align-items:center; gap:6px; padding:4px 12px; border-radius:16px; font-size:13px; font-weight:600; }
    .result-victory { background:#D4EDDA; color:#155724; }
    .result-defeat { background:#F8D7DA; color:#721C24; }
    .result-draw { background:#FFF3CD; color:#856404; }
    .result-score { font-size:16px; font-weight:700; }
    .match-card-actions { display:flex; gap:4px; align-items:flex-start; flex-shrink:0; }
    .match-card-actions .btn { padding:4px 6px !important; font-size:12px; }
    .match-actions-row { display:flex; align-items:center; gap:6px; flex-wrap:wrap; margin-top:10px; padding-top:10px; border-top:1px solid #f0f0f0; }
    .match-actions-toggle { display:none; width:100%; padding:8px 12px; margin-top:8px; background:#f0f4ff; border:1px solid #dee2e6; border-radius:8px; font-size:12px; font-weight:600; color:#667eea; cursor:pointer; text-align:center; }
    .match-actions-toggle:hover { background:#e0e7ff; }
    
    /* === LAYOUT MOBILE (< 640px) === */
    @media (max-width: 639px) {
      .match-opponent { font-size:15px; }
      .match-date-compact { font-size:12px; }
      .match-badges .match-badge { font-size:10px; padding:2px 6px; }
      .match-progress { gap:8px; }
      .progress-label { font-size:9px; }
      .match-actions-row { display:none; grid-template-columns:repeat(3,1fr); gap:6px; width:100%; }
      .match-actions-row.expanded { display:grid; }
      .match-actions-row .btn { padding:8px 4px !important; font-size:11px; min-height:38px; justify-content:center; }
      .match-actions-toggle { display:block; }
      .result-badge { font-size:11px; padding:3px 8px; gap:4px; }
      .result-score { font-size:14px; }
      .match-card-actions { position:absolute; top:6px; right:6px; }
      .match-card-actions .btn { padding:4px !important; font-size:11px; }
    }
  </style>`;

  html += `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;flex-wrap:wrap;gap:12px;">
      <div><h1 class="page-title">Calendario</h1></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
        ${window.YFM.canWrite('partite') ? `<button class="btn btn-primary" id="btnAdd" data-help="calendar.btnNuova">+ Nuova</button>
        <button class="btn btn-secondary" id="btnImportPdf" data-help="calendar.btnImporta" style="font-size:13px;">📄 PDF</button>
        <select id="calFilterStato" class="filter-select" style="font-size:13px;padding:6px 10px;border-radius:8px;border:1px solid #ddd;">
          <option value="tutte">Tutte</option>
          <option value="prossime">Prossime</option>
          <option value="archiviate">Archiviate</option>
        </select>
        <button class="btn btn-secondary" id="btnCalSelect" style="font-size:13px;">☐ Seleziona</button>` : ''}
      </div>
    </div>
    <div id="calSelActions" style="display:none;margin-bottom:16px;gap:8px;align-items:center;flex-wrap:wrap;">
      <button class="btn btn-secondary" id="btnCalSelAll" style="font-size:12px;">☑ Tutti</button>
      <button class="btn btn-secondary" id="btnCalSelCancel" style="font-size:12px;">Annulla</button>
      <button class="btn btn-secondary" id="btnCalSelArchive" style="font-size:12px;color:#856404;" disabled>📦 Archivia (0)</button>
      <button class="btn btn-danger" id="btnCalSelDelete" style="font-size:12px;" disabled>🗑️ Elimina (0)</button>
    </div>`;

  // Filtro stato (preserva selezione tra render)
  const filterStato = window._calFilterStato || 'tutte';

  // PROSSIMA PARTITA in evidenza
  if (nextMatch && filterStato !== 'archiviate') {
    const nextIsLive = !!(nextMatch.live_meta && ['1t','2t','intervallo'].includes(nextMatch.live_meta.stato));
    const sectionBg = nextIsLive ? 'background:linear-gradient(135deg, #FFEBEE 0%, #FFCDD2 100%);' : 'background:linear-gradient(135deg, #E8F8F0 0%, #D4F1E0 100%);';
    const sectionBorder = nextIsLive ? 'border-left:4px solid #E74C3C;' : 'border-left:4px solid #28a745;';
    const sectionBadge = nextIsLive
      ? '<span style="background:#E74C3C;color:white;padding:2px 10px;border-radius:10px;font-size:12px;animation:blink-text 1.5s infinite;">🟢 IN CORSO</span>'
      : '<span style="background:#28a745;color:white;padding:2px 10px;border-radius:10px;font-size:12px;">🟢 PROSSIMA</span>';
    html += `
      <div class="card cal-match-card" data-mid="${nextMatch.id}" style="margin-bottom:20px;${sectionBorder}${sectionBg}">
        <div style="display:flex;align-items:center;margin-bottom:8px;">
          ${sectionBadge}
        </div>
        ${renderMatchCard(nextMatch, stats, true)}
      </div>`;
  }

  // ALTRE PARTITE FUTURE
  if (otherFutureMatches.length > 0 && filterStato !== 'archiviate') {
    html += `<div style="margin:20px 0 12px 0;"><span style="background:#D1ECF1;color:#0C5460;padding:2px 10px;border-radius:10px;font-size:12px;font-weight:600;">📅 IN ARRIVO</span></div>`;
    otherFutureMatches.forEach(m => {
      html += `<div class="card cal-match-card" data-mid="${m.id}" style="margin-bottom:12px;">${renderMatchCard(m, stats)}</div>`;
    });
  }

  // PARTITE GIOCATE
  if (pastMatches.length > 0 && filterStato !== 'prossime') {
    html += `<div style="margin:20px 0 12px 0;"><span style="background:#E9ECEF;color:#495057;padding:2px 10px;border-radius:10px;font-size:12px;font-weight:600;">🏆 GIOCATE</span></div>`;
    pastMatches.forEach(m => {
      html += `<div class="card cal-match-card" data-mid="${m.id}" style="margin-bottom:12px;">${renderMatchCard(m, stats)}</div>`;
    });
  }

  c.innerHTML = html;

  document.getElementById('btnAdd')?.addEventListener('click', () => openMatchForm());
  document.getElementById('btnImportPdf')?.addEventListener('click', openImportPdf);
  document.getElementById('calFilterStato')?.addEventListener('change', (e) => { window._calFilterStato = e.target.value; loadCalendar(); });
  const filterSel = document.getElementById('calFilterStato');
  if (filterSel) filterSel.value = filterStato;
  bindCalendarSelection();
  attachCardListeners();
}

function renderGuestCalendar(c, nextMatch, pastMatches, stats) {
  let html = `<style>
    .guest-match { background:white; padding:16px; border-radius:12px; margin-bottom:12px; box-shadow:0 2px 10px rgba(0,0,0,0.08); cursor:pointer; transition:transform 0.15s; }
    .guest-match:hover { transform:translateX(4px); }
    .result-badge { display:inline-flex; align-items:center; gap:6px; padding:4px 12px; border-radius:16px; font-size:13px; font-weight:600; }
    .result-victory { background:#D4EDDA; color:#155724; }
    .result-defeat { background:#F8D7DA; color:#721C24; }
    .result-draw { background:#FFF3CD; color:#856404; }
  </style>`;

  html += `<div style="margin-bottom:24px;"><h1 class="page-title">Calendario</h1></div>`;

  // Prossima partita
  if (nextMatch) {
    const luogo = nextMatch.luogo === 'Casa' ? '🏠 Casa' : '✈️ Trasferta';
    const comp = nextMatch.competizione ? ' · 🏆 ' + nextMatch.competizione : ' · ⚽ Amichevole';
    html += `<div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:20px;margin-bottom:24px;color:white;border-radius:16px;">
      <div style="font-size:11px;font-weight:600;opacity:0.9;text-transform:uppercase;margin-bottom:4px;">⏱ Prossima Partita</div>
      <div style="font-size:18px;font-weight:bold;margin-bottom:4px;">${nextMatch.avversario}</div>
      <div style="font-size:12px;opacity:0.9;">📅 ${formatDate(nextMatch.data_ora)} · ${luogo}${comp}</div>
    </div>`;
  } else {
    html += `<div style="padding:16px;margin-bottom:24px;text-align:center;border:2px dashed #ddd;border-radius:12px;"><p style="color:var(--gray);margin:0;">📅 Nessuna partita in programma</p></div>`;
  }

  // Partite giocate con risultato
  const playedWithResult = pastMatches.filter(m => m.stato === 'Terminata' || m.gol_casa !== null);
  if (playedWithResult.length > 0) {
    html += `<div style="margin-bottom:12px;"><span style="background:#E9ECEF;color:#495057;padding:2px 10px;border-radius:10px;font-size:12px;font-weight:600;">🏆 GIOCATE</span></div>`;
    playedWithResult.forEach(m => {
      const r = (stats?.risultati || []).find(x => x.id === m.id);
      const gf = r?.golFatti ?? m.gol_casa ?? null;
      const gs = r?.golSubiti ?? m.gol_ospite ?? null;
      let resultHtml = '';
      if (gf !== null && gs !== null) {
        let cls, icon;
        if (gf > gs) { cls = 'result-victory'; icon = '✅'; }
        else if (gf < gs) { cls = 'result-defeat'; icon = '❌'; }
        else { cls = 'result-draw'; icon = '🤝'; }
        resultHtml = `<span class="result-badge ${cls}"><span style="font-size:16px;font-weight:700;">${gf} - ${gs}</span>${icon}</span>`;
      }
      const luogoBadge = m.luogo === 'Casa' ? '🏠' : '✈️';
      const comp = m.competizione ? `<span style="font-size:11px;color:#888;background:#f5f5f5;padding:2px 6px;border-radius:4px;">${m.competizione}</span>` : '<span style="font-size:11px;color:#888;background:#f5f5f5;padding:2px 6px;border-radius:4px;">Amichevole</span>';
      html += `<div class="guest-match" onclick="window.YFM.openMatchDetail('${m.id}')">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
          <div style="flex:1;min-width:0;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">${comp}</div>
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="font-size:14px;">${luogoBadge}</span>
              <span style="font-size:14px;font-weight:600;">${m.avversario}</span>
            </div>
            <div style="font-size:12px;color:#888;margin-top:4px;">📅 ${formatDateShort(m.data_ora)}</div>
          </div>
          ${resultHtml}
        </div>
      </div>`;
    });
  } else {
    html += `<p style="color:var(--gray);text-align:center;padding:20px;">Nessuna partita disputata</p>`;
  }

  c.innerHTML = html;
}

// ── CALENDAR SELECTION MODE ──
let calSelectedIds = new Set();
let calSelectionMode = false;

function bindCalendarSelection() {
  const btnSelect = document.getElementById('btnCalSelect');
  if (!btnSelect) return;
  btnSelect.addEventListener('click', () => {
    calSelectionMode = !calSelectionMode;
    calSelectedIds.clear();
    toggleCalSelectionUI();
  });
}

function toggleCalSelectionUI() {
  const actionsBar = document.getElementById('calSelActions');
  const btnSelect = document.getElementById('btnCalSelect');
  if (calSelectionMode) {
    if (actionsBar) actionsBar.style.display = 'flex';
    if (btnSelect) { btnSelect.textContent = '\u2713 Selezione'; btnSelect.style.background = '#667eea'; btnSelect.style.color = 'white'; }
    document.querySelectorAll('.cal-match-card').forEach(card => {
      card.style.cursor = 'pointer';
      card.addEventListener('click', calCardClickHandler);
    });
  } else {
    if (actionsBar) actionsBar.style.display = 'none';
    if (btnSelect) { btnSelect.textContent = '\u2610 Seleziona'; btnSelect.style.background = ''; btnSelect.style.color = ''; }
    document.querySelectorAll('.cal-match-card').forEach(card => {
      card.style.border = '';
      card.style.background = '';
      card.removeEventListener('click', calCardClickHandler);
    });
  }
  updateCalSelButtons();
  // Bind action buttons
  document.getElementById('btnCalSelAll')?.addEventListener('click', () => {
    const all = document.querySelectorAll('.cal-match-card');
    if (calSelectedIds.size === all.length) { calSelectedIds.clear(); }
    else { all.forEach(c => calSelectedIds.add(c.dataset.mid)); }
    highlightCalSelected();
    updateCalSelButtons();
  });
  document.getElementById('btnCalSelCancel')?.addEventListener('click', () => {
    calSelectionMode = false;
    calSelectedIds.clear();
    toggleCalSelectionUI();
  });
  document.getElementById('btnCalSelArchive')?.addEventListener('click', archiveSelected);
  document.getElementById('btnCalSelDelete')?.addEventListener('click', deleteSelected);
}

function calCardClickHandler(e) {
  if (!calSelectionMode) return;
  e.stopPropagation();
  e.preventDefault();
  const card = e.currentTarget;
  const mid = card.dataset.mid;
  if (calSelectedIds.has(mid)) calSelectedIds.delete(mid);
  else calSelectedIds.add(mid);
  highlightCalSelected();
  updateCalSelButtons();
}

function highlightCalSelected() {
  document.querySelectorAll('.cal-match-card').forEach(card => {
    const sel = calSelectedIds.has(card.dataset.mid);
    card.style.border = sel ? '2px solid #667eea' : '';
    card.style.background = sel ? 'rgba(102,126,234,0.05)' : '';
  });
}

function updateCalSelButtons() {
  const n = calSelectedIds.size;
  const archBtn = document.getElementById('btnCalSelArchive');
  const delBtn = document.getElementById('btnCalSelDelete');
  if (archBtn) { archBtn.disabled = n === 0; archBtn.textContent = `\ud83d\udce6 Archivia (${n})`; }
  if (delBtn) { delBtn.disabled = n === 0; delBtn.textContent = `\ud83d\uddd1\ufe0f Elimina (${n})`; }
}

async function archiveSelected() {
  if (calSelectedIds.size === 0) return;
  if (!await confirm(`Archiviare ${calSelectedIds.size} partite?`)) return;
  showLoading();
  try {
    for (const mid of calSelectedIds) {
      await apiFetch('/partite/' + mid, { method: 'PUT', body: JSON.stringify({ archiviata: true }) });
    }
    calSelectedIds.clear();
    calSelectionMode = false;
    hideLoading();
    loadCalendar();
  } catch (e) { hideLoading(); alert('Errore: ' + e.message); }
}

async function deleteSelected() {
  if (calSelectedIds.size === 0) return;
  if (!await confirm(`Eliminare ${calSelectedIds.size} partite? Questa azione \u00e8 irreversibile.`)) return;
  showLoading();
  try {
    for (const mid of calSelectedIds) {
      await apiFetch('/partite/' + mid, { method: 'DELETE' });
    }
    calSelectedIds.clear();
    calSelectionMode = false;
    hideLoading();
    loadCalendar();
  } catch (e) { hideLoading(); alert('Errore: ' + e.message); }
}

function attachCardListeners() {
  // Desktop actions (in position absolute)
  document.querySelectorAll('.match-card-actions .btn-editm').forEach(b => {
  b.addEventListener('click', (e) => { e.stopPropagation(); openMatchForm(b.dataset.mid); });
  });
  document.querySelectorAll('.match-card-actions .btn-del').forEach(b => {
  b.addEventListener('click', (e) => { e.stopPropagation(); deleteMatch(b.dataset.mid); });
  });
}

export function renderMatchCard(m, stats, isNext = false) {
  const r = (stats?.risultati || []).find(x => x.id === m.id);
  const isLive = !!(m.live_meta && ['1t','2t','intervallo'].includes(m.live_meta.stato));
  const hasResult = !!(r || (m.gol_casa != null && m.gol_ospite != null) || m.stato === 'Terminata' || isLive);
  const isPast = new Date(m.data_ora) < new Date();
  const isArchiviata = m.archiviata === true || m.archiviata === 'true';
  const pastUnmanaged = isPast && !isLive && !isArchiviata && !m.live_meta && m.stato !== 'Terminata' && (Date.now() - new Date(m.data_ora).getTime()) > 12 * 3600000;
  const missingResult = !isLive && !isArchiviata && !m.live_meta && (
    (m.stato === 'Terminata' && m.gol_casa == null && !r) || pastUnmanaged
  );

  const golFatti = r?.golFatti ?? ((!missingResult && (m.stato === 'Terminata' || isLive)) ? (m.gol_casa ?? 0) : null);
  const golSubiti = r?.golSubiti ?? ((!missingResult && (m.stato === 'Terminata' || isLive)) ? (m.gol_ospite ?? 0) : null);

  // === BORDO SINISTRO COLORATO PER ESITO ===
  let borderColor = '#dee2e6';
  if (isLive) {
    borderColor = '#E74C3C'; // rosso pulsante per live
  } else if (isArchiviata) {
    borderColor = '#8B7355';
  } else if (missingResult) {
    borderColor = '#F39C12';
  } else if (isPast && hasResult && golFatti !== null && golSubiti !== null) {
    if (golFatti > golSubiti) borderColor = '#28a745';
    else if (golFatti < golSubiti) borderColor = '#dc3545';
    else borderColor = '#ffc107';
  } else if (!isPast && isNext) {
    borderColor = '#28a745';
  } else if (!isPast) {
    borderColor = '#667eea';
  }

  const cardStyle = `border-left:4px solid ${borderColor};${isArchiviata ? 'opacity:0.7;background:#F9F8F6;' : ''}${isLive ? 'animation:live-border 1.5s ease-in-out infinite;' : ''}`;

  // === BADGE ===
  const luogoBadge = m.luogo === 'Casa'
    ? '<span class="match-badge badge-casa">🏠 Casa</span>'
    : '<span class="match-badge badge-trasferta">✈️ Trasferta</span>';
  const compBadge = m.competizione ? `<span class="match-badge badge-section">${m.competizione}</span>` : '<span class="match-badge badge-section">Amichevole</span>';
  const giornBadge = m.giornata ? `<span class="match-badge badge-section">⚽ G.${m.giornata}</span>` : '';
  const archivedBadge = isArchiviata ? '<span title="Archiviata" style="font-size:14px;">🔒</span>' : '';

  // === RISULTATO ===
  let resultHtml = '';
  if (isLive && golFatti !== null && golSubiti !== null) {
    const color = golFatti > golSubiti ? '#27AE60' : golFatti === golSubiti ? '#F39C12' : '#E74C3C';
    resultHtml = `<span style="display:inline-flex;align-items:center;gap:8px;cursor:pointer;" onclick="event.stopPropagation();window.YFM.openMatchCenter('${m.id}')">`
      + `<span class="live-dot" style="background:#E74C3C;"></span>`
      + `<span class="live-text" style="color:#E74C3C;font-size:10px;font-weight:bold;">LIVE</span>`
      + `<span style="font-size:20px;font-weight:bold;color:${color};">${golFatti} - ${golSubiti}</span>`
      + `</span>`;
  } else if (missingResult) {
    resultHtml = `<span class="result-badge" style="background:#FFF3CD;color:#856404;border:1px solid #F39C12;cursor:pointer;font-size:12px;" onclick="event.stopPropagation();window.YFM.openMatchCenter('${m.id}')">⚠️ Inserisci risultato</span>`;
  } else if (hasResult && golFatti !== null && golSubiti !== null) {
    let cls, icon;
    if (golFatti > golSubiti) { cls = 'result-victory'; icon = '✅'; }
    else if (golFatti < golSubiti) { cls = 'result-defeat'; icon = '❌'; }
    else { cls = 'result-draw'; icon = '🤝'; }
    resultHtml = `<span class="result-badge ${cls}" style="cursor:pointer;" onclick="event.stopPropagation();window.YFM.openMatchDetail('${m.id}')"><span class="result-score">${golFatti} - ${golSubiti}</span>${icon}</span>`;
  } else if (!isPast) {
    resultHtml = '';
  }

  // === PROGRESS DOTS (placeholder, aggiornati in background) ===
  const progressHtml = (!isPast && !isArchiviata) ? `<div class="match-progress" data-help="calendar.pallini" data-mid="${m.id}"></div>` : '';

  // === PULSANTI AZIONE ===
  let actionsHtml = '';
  const convLabel = isPast ? '📋 Conv.' : '📋 Convoca';
  if (!isArchiviata) {
    actionsHtml += makeBtn(convLabel, `window.YFM.openConvocation('${m.id}',${isPast})`, false);
    actionsHtml += makeBtn('📄 Distinta', `window.YFM.openDistinta('${m.id}')`, false);
    const mcGlow = isLive ? ' btn-live-glow' : '';
    actionsHtml += `<button class="btn btn-secondary btn-small${mcGlow}" onclick="event.stopPropagation();window.YFM.openMatchCenter('${m.id}')">${isLive ? '<span class="pallino-blink"></span>' : ''}⚽ Match Center</button>`;
  } else {
    actionsHtml += makeBtn('📋 Conv.', `window.YFM.openConvocation('${m.id}',true)`, false);
    actionsHtml += makeBtn('📄 Distinta', `window.YFM.openDistinta('${m.id}')`, false);
    actionsHtml += `<button class="btn btn-secondary btn-small" onclick="event.stopPropagation();window.YFM.openMatchCenter('${m.id}')">⚽ Match Center</button>`;
  }

  // === EDIT/DELETE/ARCHIVIA (solo admin) ===
  let editBtns = '';
  const _isAdmin = window.YFM.canWrite('partite');
  if (_isAdmin && !isArchiviata) {
    const archBtn = (isPast && hasResult) ? `<button class="btn btn-secondary btn-small" data-help="calendar.archivia" style="color:#856404;" onclick="event.stopPropagation();archiveMatch('${m.id}')" title="Archivia">📦</button>` : '';
    editBtns = `${archBtn}<button class="btn btn-secondary btn-small btn-editm" data-mid="${m.id}" title="Modifica">✏️</button><button class="btn btn-secondary btn-small btn-danger btn-del" data-mid="${m.id}" title="Elimina">🗑️</button>`;
  } else if (_isAdmin && isArchiviata) {
    editBtns = `<button class="btn btn-secondary btn-small" style="background:#6B5B4F;color:white;border-color:#6B5B4F;" onclick="event.stopPropagation();unarchiveMatch('${m.id}')" title="Sblocca">🔓</button>`;
  }

  return `<div class="match-card-inner" data-mid="${m.id}" style="${cardStyle}padding-left:12px;">
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;">
      <div style="flex:1;min-width:0;">
        <div class="match-badges" style="margin-bottom:6px;">${luogoBadge}${compBadge}${giornBadge}${archivedBadge}</div>
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
          ${m.logo ? `<img src="${m.logo}" alt="${m.avversario}" style="width:24px;height:24px;border-radius:50%;object-fit:contain;" onerror="this.style.display='none'">` : ''}<span class="match-opponent">${m.avversario}</span>
          ${resultHtml}
        </div>
        <div class="match-date-compact">📅 ${formatDateCompact(m.data_ora)}</div>
        ${progressHtml}
      </div>
      <div class="match-card-actions">${editBtns}</div>
    </div>
    <button class="match-actions-toggle" onclick="event.stopPropagation();this.nextElementSibling.classList.toggle('expanded');this.textContent=this.nextElementSibling.classList.contains('expanded')?'▲ Chiudi':'⋯ Azioni'">⋯ Azioni</button>
    <div class="match-actions-row" data-help="calendar.flussoOperativo">${actionsHtml}</div>
  </div>`;
}

// Funzioni globali per archivia/sblocca
window.archiveMatch = async function(id) {
  if (!await confirm('Archiviare questa partita? La partita verrà spostata nelle partite giocate e non sarà più possibile modificare eventi, formazione e convocazioni.')) return;
  showLoading();
  try {
    await apiFetch('/partite/' + id + '/archivia', { method: 'PUT' });
    invalidateDashboardCache(); invalidateStatsCache();
    loadCalendar();
  } catch (e) { alert(e.message); }
  finally { hideLoading(); }
};

window.unarchiveMatch = async function(id) {
  if (!await confirm('Sbloccare questa partita? Sarà possibile modificare eventi, formazione e convocazioni.')) return;
  showLoading();
  try {
    await apiFetch('/partite/' + id + '/sblocca', { method: 'PUT' });
    invalidateDashboardCache(); invalidateStatsCache();
    loadCalendar();
  } catch (e) { alert(e.message); }
  finally { hideLoading(); }
};

export async function openMatchForm(mid) {
  const m = mid ? allMatches.find(x => x.id === mid) : null;
  const editDate = m && m.data_ora ? m.data_ora.slice(0, 16) : '';
  
  // Dropdown 4 tipologie fisse
  const editComp = m?.tipo_competizione || m?.competizione || '';
  const selectedType = !editComp ? '' : editComp === 'Campionato' ? 'campionato' : editComp === 'Coppa' ? 'coppa' : editComp.toLowerCase().includes('torneo') ? 'torneo' : 'campionato';
  const compOptions = `<option value="" ${selectedType === '' ? 'selected' : ''}>Amichevole</option>
    <option value="campionato" ${selectedType === 'campionato' ? 'selected' : ''}>Campionato</option>
    <option value="coppa" ${selectedType === 'coppa' ? 'selected' : ''}>Coppa</option>
    <option value="torneo" ${selectedType === 'torneo' ? 'selected' : ''}>Torneo</option>`;

  // Carica squadre del girone se configurato
  let gironeTeams = [];
  const sq = window.YFM.getSquadra();
  if (sq?.classifica_url) {
    try {
      const clData = await apiFetch('/gr/classifica/' + window.YFM.squadraId);
      if (clData?.classifica) {
        const teamName = (sq.nome || '').toLowerCase();
        gironeTeams = clData.classifica
          .filter(r => !r.nome.toLowerCase().includes(teamName) && !teamName.includes(r.nome.toLowerCase()))
          .map(r => ({ nome: r.nome, logo: r.logo || null }));
      }
    } catch(e) {}
  }

  const gironeChipsHtml = gironeTeams.length > 0
    ? `<div style="margin-bottom:8px;">
        <label style="font-size:11px;color:#888;display:block;margin-bottom:4px;">🏆 Squadre del tuo girone</label>
        <div id="mfGironeChips" style="display:flex;flex-wrap:wrap;gap:6px;">
          ${gironeTeams.map(t => `<button type="button" class="mf-chip" data-nome="${t.nome}" style="display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border:1px solid #ddd;border-radius:16px;background:#f8f9fa;font-size:12px;cursor:pointer;transition:all .15s;">${t.logo ? `<img src="${t.logo}" style="width:16px;height:16px;border-radius:50%;object-fit:contain;">` : ''}${t.nome}</button>`).join('')}
        </div>
      </div>`
    : '';

  const content = `
  <div class="form-group" style="margin-bottom:12px;"><label>Data e Ora</label><input id="mfD" type="datetime-local" value="${editDate}"></div>
  <div class="form-group" style="margin-bottom:12px;">
    <label>Avversario</label>
    ${gironeChipsHtml}
    <div style="position:relative;">
      <input id="mfA" value="${m ? m.avversario || '' : ''}" placeholder="Digita 2+ lettere per cercare..." autocomplete="off">
      <div id="mfAResults" style="display:none;position:absolute;top:100%;left:0;right:0;background:white;border:1px solid #ddd;border-top:none;border-radius:0 0 8px 8px;max-height:200px;overflow-y:auto;z-index:100;box-shadow:0 4px 12px rgba(0,0,0,0.1);"></div>
    </div>
  </div>
  <div class="form-group" style="margin-bottom:12px;"><label>Luogo</label><select id="mfL"><option ${m && m.luogo === 'Casa' ? 'selected' : ''}>Casa</option><option ${m && m.luogo === 'Trasferta' ? 'selected' : ''}>Trasferta</option></select></div>
  <div class="form-group" style="margin-bottom:12px;"><label>Competizione</label><select id="mfC">${compOptions}</select></div>
  <div class="form-group" id="mfTorneoGroup" style="margin-bottom:12px;display:none;"><label>Nome torneo</label><input id="mfTorneo" placeholder="es. Torneo Città di Roma" value="${selectedType === 'torneo' ? editComp : ''}"></div>
  <div class="form-group"><label>Giornata</label><input id="mfG" type="number" value="${m ? m.giornata || '' : ''}" style="width:80px;"></div>`;
  const footer = '<button class="btn btn-secondary" id="modalCancel">Annulla</button><button class="btn btn-primary" id="saveBtn">Salva</button>';
  const modal = createModal(m ? 'Modifica' : 'Nuova Partita', content, footer, '500px', { closeOnOverlay: false });
  
  // --- Chiudi picker data/ora dopo selezione ---
  document.getElementById('mfD').addEventListener('change', (e) => { e.target.blur(); });

  // --- Chip girone: click per selezionare ---
  document.querySelectorAll('.mf-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.getElementById('mfA').value = chip.dataset.nome;
      document.querySelectorAll('.mf-chip').forEach(c => { c.style.background = '#f8f9fa'; c.style.borderColor = '#ddd'; c.style.color = ''; });
      chip.style.background = '#667eea'; chip.style.borderColor = '#667eea'; chip.style.color = 'white';
      document.getElementById('mfAResults').style.display = 'none';
    });
  });

  // --- Ricerca live da team_logo ---
  let searchTimeout = null;
  const mfAInput = document.getElementById('mfA');
  const mfAResults = document.getElementById('mfAResults');
  mfAInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    const q = mfAInput.value.trim();
    if (q.length < 2) { mfAResults.style.display = 'none'; return; }
    searchTimeout = setTimeout(async () => {
      try {
        const results = await apiFetch('/teams/search?q=' + encodeURIComponent(q));
        if (results.length === 0) { mfAResults.style.display = 'none'; return; }
        mfAResults.innerHTML = results.map(r => `
          <div class="mf-search-item" data-nome="${r.nome}" style="display:flex;align-items:center;gap:8px;padding:8px 12px;cursor:pointer;border-bottom:1px solid #f0f0f0;font-size:13px;">
            ${r.logo_path ? `<img src="${r.logo_path}" style="width:20px;height:20px;border-radius:50%;object-fit:contain;">` : '<span style="width:20px;"></span>'}
            ${r.nome}
          </div>
        `).join('');
        mfAResults.style.display = 'block';
        mfAResults.querySelectorAll('.mf-search-item').forEach(item => {
          item.addEventListener('click', () => {
            mfAInput.value = item.dataset.nome;
            mfAResults.style.display = 'none';
          });
          item.addEventListener('mouseenter', () => { item.style.background = '#f0f4ff'; });
          item.addEventListener('mouseleave', () => { item.style.background = ''; });
        });
      } catch(e) { mfAResults.style.display = 'none'; }
    }, 300);
  });
  // Chiudi risultati se click fuori
  document.addEventListener('click', (e) => {
    if (!mfAInput.contains(e.target) && !mfAResults.contains(e.target)) mfAResults.style.display = 'none';
  }, { once: false });

  // Mostra campo torneo solo se tipo = torneo
  const compSel = document.getElementById('mfC');
  const torneoGroup = document.getElementById('mfTorneoGroup');
  const toggleTorneo = () => { torneoGroup.style.display = compSel.value === 'torneo' ? 'block' : 'none'; };
  compSel.addEventListener('change', toggleTorneo);
  toggleTorneo();
  document.getElementById('saveBtn').addEventListener('click', async () => {
  const rawDate = document.getElementById('mfD').value;
  const compType = document.getElementById('mfC').value;
  const torneoValue = document.getElementById('mfTorneo')?.value?.trim() || '';
  // Risolvi tipo → nome competizione
  let tipoCompetizione = null;
  if (compType === 'campionato') tipoCompetizione = 'Campionato';
  else if (compType === 'coppa') tipoCompetizione = 'Coppa';
  else if (compType === 'torneo') tipoCompetizione = torneoValue || 'Torneo';
  const d = {
    dataOra: rawDate ? rawDate + ':00' : null,
    avversario: document.getElementById('mfA').value,
    luogo: document.getElementById('mfL').value,
    tipoCompetizione,
    giornata: parseInt(document.getElementById('mfG').value) || null
  };
  showLoading();
  try {
    if (m) await apiFetch('/partite/' + m.id, { method: 'PUT', body: JSON.stringify(d) });
    else await apiFetch('/squadre/' + window.YFM.squadraId + '/partite', { method: 'POST', body: JSON.stringify(d) });
    modal.close();
    loadCalendar();
  } catch (e) { alert(e.message); }
  finally { hideLoading(); }
  });
}

async function deleteMatch(id) {
  if (!await confirm('Eliminare?')) return;
  await apiFetch('/partite/' + id, { method: 'DELETE' });
  invalidateDashboardCache(); invalidateStatsCache();
  loadCalendar();
}

function openImportTuttocampo() {
  const content = `
  <p style="margin-bottom:12px;">Importa il calendario direttamente da <strong>Tuttocampo.it</strong></p>
  <div class="form-group" style="margin-bottom:12px;">
    <label>URL del girone su Tuttocampo</label>
    <input id="tcUrl" placeholder="https://www.tuttocampo.it/2025-26/Lazio/GiovanissimiRegionaliU15/GironeE/Calendario" style="font-size:12px;">
    <small style="color:#888;">Vai su Tuttocampo, trova il tuo girone e copia l'URL della pagina Calendario</small>
  </div>
  <div class="form-group" style="margin-bottom:12px;">
    <label>Nome squadra (come appare su Tuttocampo)</label>
    <input id="tcTeamName" placeholder="es. Dreaming Football Academy">
  </div>
  <div style="display:flex;gap:12px;margin-bottom:12px;flex-wrap:wrap;">
    <label style="display:flex;align-items:center;gap:6px;cursor:pointer;"><input type="checkbox" id="tcImportResults" checked> Importa risultati</label>
    <label style="display:flex;align-items:center;gap:6px;cursor:pointer;"><input type="checkbox" id="tcImportEvents"> Importa marcatori</label>
    <label style="display:flex;align-items:center;gap:6px;cursor:pointer;"><input type="checkbox" id="tcImportFormations"> Importa formazioni</label>
    <label style="display:flex;align-items:center;gap:6px;cursor:pointer;"><input type="checkbox" id="tcImportLogos" checked> Importa loghi</label>
    <label style="display:flex;align-items:center;gap:6px;cursor:pointer;"><input type="checkbox" id="tcArchive" checked> Archivia giocate</label>
  </div>
  <div id="tcEventsNote" style="display:none;background:#FFF3CD;padding:8px 12px;border-radius:8px;margin-bottom:12px;font-size:12px;color:#856404;">\u26a0\ufe0f I marcatori verranno importati solo se Tuttocampo li mostra nella pagina di dettaglio. Il matching con la rosa avviene per cognome.</div>
  <div id="tcResult" style="margin-top:16px;"></div>`;
  const footer = '<button class="btn btn-secondary" id="modalCancel">Annulla</button><button class="btn btn-primary" id="tcSearch">\ud83d\udd0d Cerca</button>';
  const modal = createModal('Importa da Tuttocampo', content, footer, '700px');

  document.getElementById('tcSearch').addEventListener('click', async () => {
    const url = document.getElementById('tcUrl').value.trim();
    const teamName = document.getElementById('tcTeamName').value.trim();
    if (!url || !teamName) { alert('Inserisci URL e nome squadra'); return; }

    // Toggle note marcatori
    const eventsCheckbox = document.getElementById('tcImportEvents');
    eventsCheckbox.addEventListener('change', () => {
      document.getElementById('tcEventsNote').style.display = eventsCheckbox.checked ? 'block' : 'none';
    });

    const resultDiv = document.getElementById('tcResult');
    resultDiv.innerHTML = '<div class="loading"><div class="spinner"></div>Scaricamento da Tuttocampo... (pu\u00f2 richiedere 20-30 secondi)</div>';

    try {
      const importResults = document.getElementById('tcImportResults').checked;
      const archiveCompleted = document.getElementById('tcArchive').checked;
      const data = await apiFetch('/calendario/import-tuttocampo', {
        method: 'POST',
        body: JSON.stringify({ url, teamName, squadraId: window.YFM.squadraId, importResults, archiveCompleted, importEvents: document.getElementById('tcImportEvents').checked, importLogos: document.getElementById('tcImportLogos').checked })
      });

      if (!data.partite || data.partite.length === 0) {
        resultDiv.innerHTML = '<div style="color:#c00;padding:12px;background:#fee;border-radius:8px;">\u274c Nessuna partita trovata.</div>';
        return;
      }

      const played = data.partite.filter(p => p.hasResult).length;
      const future = data.partite.length - played;
      const noDate = data.partite.filter(p => !p.dataOra).length;
      const eventsCount = data.partite.reduce((sum, p) => sum + (p.marcatori ? p.marcatori.length : 0), 0);
      const rows = data.partite.map(p => {
        const d = p.dataOra ? new Date(p.dataOra) : null;
        const dateStr = d ? d.toLocaleDateString('it-IT', { day:'2-digit', month:'2-digit', year:'2-digit' }) : '<span style="color:#c00;">?</span>';
        const timeStr = d ? d.toLocaleTimeString('it-IT', { hour:'2-digit', minute:'2-digit' }) : '';
        const icon = p.luogo === 'Casa' ? '\ud83c\udfe0' : '\u2708\ufe0f';
        const score = p.hasResult ? `<span style="font-weight:700;">${p.golCasa}-${p.golOspite}</span>` : '<span style="color:#888;">-</span>';
        const marcatoriStr = p.marcatori && p.marcatori.length > 0
          ? `<span style="font-size:10px;color:#27AE60;" title="${p.marcatori.map(m => m.minuto + "' " + m.nome).join(', ')}">\u26bd${p.marcatori.filter(m=>m.tipo==='GOAL').length}</span>`
          : '';
        return `<tr><td style="padding:4px 8px;font-size:12px;text-align:center;">${p.giornata}</td><td style="padding:4px 8px;font-size:12px;">${dateStr} ${timeStr}</td><td style="padding:4px 8px;font-size:12px;">${icon} ${p.avversario}</td><td style="padding:4px 8px;font-size:12px;text-align:center;">${importResults ? score : '-'}</td><td style="padding:4px 8px;font-size:12px;text-align:center;">${marcatoriStr}</td></tr>`;
      }).join('');

      let eventsInfo = '';
      if (eventsCount > 0) eventsInfo = `<br><small style="color:#27AE60;">\u26bd ${eventsCount} eventi (marcatori/cartellini) trovati</small>`;
      let noDateInfo = '';
      if (noDate > 0) noDateInfo = `<br><small style="color:#c00;">\u26a0\ufe0f ${noDate} partite senza data (verranno importate senza data/ora)</small>`;
      let logosInfo = '';
      if (data.logos && data.logos.downloaded > 0) logosInfo = `<br><small style="color:#667eea;">\ud83c\udfa8 ${data.logos.downloaded} loghi squadre scaricati</small>`;

      resultDiv.innerHTML = `
        <div style="background:#e8f5e9;padding:10px 12px;border-radius:8px;margin-bottom:12px;">
          \u2705 <strong>${data.partite.length}</strong> partite trovate (${played} giocate, ${future} da giocare)${eventsInfo}${noDateInfo}${logosInfo}
          <br><small style="color:#555;">${data.info.categoria} - ${data.info.girone} - ${data.info.anno}</small>
        </div>
        <div style="max-height:280px;overflow-y:auto;border:1px solid #eee;border-radius:8px;">
          <table style="width:100%;border-collapse:collapse;"><thead><tr style="background:#f5f5f5;"><th style="padding:6px 8px;font-size:11px;">G</th><th style="padding:6px 8px;font-size:11px;text-align:left;">Data</th><th style="padding:6px 8px;font-size:11px;text-align:left;">Partita</th><th style="padding:6px 8px;font-size:11px;">Ris</th><th style="padding:6px 8px;font-size:11px;">Ev</th></tr></thead><tbody>${rows}</tbody></table>
        </div>
        <div class="form-group" style="margin-top:12px;"><label>Competizione (opzionale)</label><input id="tcComp" placeholder="es. Campionato Regionale Lazio"></div>
        <button class="btn btn-primary" id="tcConfirm" style="margin-top:12px;width:100%;">\u2705 Conferma e Importa (${data.partite.length} partite)</button>`;

      window._tcPartite = data.partite;

      document.getElementById('tcConfirm').addEventListener('click', async () => {
        showLoading('Importazione...');
        try {
          const importEvents = document.getElementById('tcImportEvents').checked;
          const importFormations = document.getElementById('tcImportFormations').checked;
          const resp = await apiFetch('/calendario/confirm-tuttocampo', {
            method: 'POST',
            body: JSON.stringify({
              squadraId: window.YFM.squadraId,
              partite: window._tcPartite,
              importResults: document.getElementById('tcImportResults').checked,
              archiveCompleted: document.getElementById('tcArchive').checked,
              competizione: document.getElementById('tcComp').value.trim(),
              importEvents,
              importFormations,
              teamName: document.getElementById('tcTeamName').value.trim()
            })
          });
          hideLoading();
          modal.close();
          let msg = `\u2705 Importate ${resp.inserite} nuove partite da Tuttocampo!`;
          if (resp.aggiornate > 0) msg += `\n\ud83d\udd04 ${resp.aggiornate} partite aggiornate (risultati/link).`;
          if (resp.eventiImportati > 0) msg += `\n\u26bd ${resp.eventiImportati} eventi (marcatori) importati.`;
          if (resp.formazioniImportate > 0) msg += `\n\ud83d\udccb ${resp.formazioniImportate} formazioni importate.`;
          alert(msg);
          loadCalendar();
        } catch (err) {
          hideLoading();
          alert('Errore: ' + err.message);
        }
      });
    } catch (err) {
      resultDiv.innerHTML = `<div style="color:#c00;padding:12px;background:#fee;border-radius:8px;">\u274c ${err.message}</div>`;
    }
  });
}
function openImportCSV() {
  const content = `
  <p style="margin-bottom:12px;">Incolla i dati CSV (una riga per partita):</p>
  <p style="font-size:12px;color:var(--gray);margin-bottom:8px;">Formato: <strong>Data, Ora, Avversario, Luogo, Competizione, Giornata</strong></p>
  <textarea id="csvData" rows="10" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:8px;font-family:monospace;font-size:13px;" placeholder="2025-09-14,10:00,ASD Torrino,Casa,Campionato U14 Prov.,1&#10;2025-09-21,11:30,Pol. San Lorenzo,Trasferta,Campionato U14 Prov.,2"></textarea>`;
  const footer = '<button class="btn btn-secondary" id="modalCancel">Annulla</button><button class="btn btn-primary" id="doImport">📥 Importa</button>';
  const modal = createModal('Importa Calendario CSV', content, footer, '600px');
  document.getElementById('doImport').addEventListener('click', async () => {
  const raw = document.getElementById('csvData').value.trim();
  if (!raw) { alert('Nessun dato.'); return; }
  const lines = raw.split('\n').filter(l => l.trim());
  const csvData = lines.map(l => l.split(',').map(c => c.trim()));
  showLoading();
  try {
    const res = await apiFetch('/squadre/' + window.YFM.squadraId + '/importa-calendario', { method: 'POST', body: JSON.stringify({ csvData }) });
    hideLoading();
    modal.close();
    alert('✅ Importate ' + res.inserite + ' partite!');
    loadCalendar();
  } catch (e) { hideLoading(); alert('Errore: ' + e.message); }
  });
}

async function archiveAllPlayed() {
  const played = allMatches.filter(m => (m.stato === 'Terminata' || m.gol_casa != null) && !m.archiviata);
  if (played.length === 0) { alert('Nessuna partita giocata da archiviare'); return; }
  if (!await confirm(`Archiviare ${played.length} partite giocate? Non sarà più possibile modificare eventi, formazione e convocazioni.`)) return;
  showLoading('Archiviazione...');
  try {
    await Promise.all(played.map(m => apiFetch('/partite/' + m.id + '/archivia', { method: 'PUT' })));
    hideLoading();
    alert(`✅ ${played.length} partite archiviate`);
    invalidateDashboardCache(); invalidateStatsCache();
    loadCalendar();
  } catch (err) { hideLoading(); alert('Errore: ' + err.message); }
}

async function deleteAllMatches() {
  const count = window.YFM.allMatches ? window.YFM.allMatches.length : 0;
  if (count === 0) { alert('Nessuna partita da eliminare'); return; }
  if (!await confirm(`⚠️ Eliminare TUTTE le ${count} partite del calendario?\n\nQuesta azione è irreversibile.`)) return;
  if (!await confirm('Sei davvero sicuro? Verranno eliminate tutte le partite, eventi, convocazioni e formazioni associate.')) return;
  
  showLoading('Eliminazione...');
  try {
    const resp = await apiFetch(`/squadre/${window.YFM.squadraId}/partite-all`, { method: 'DELETE' });
    hideLoading();
    alert(`✅ Eliminate ${resp.eliminate || count} partite`);
    invalidateDashboardCache(); invalidateStatsCache();
    loadCalendar();
  } catch (err) {
    hideLoading();
    alert('Errore: ' + err.message);
  }
}

function openImportPdf() {
  const content = `
  <p style="margin-bottom:12px;">Carica il PDF del calendario SGS/LND e inserisci il nome della squadra come riportato nel file.</p>
  <div class="form-group" style="margin-bottom:12px;"><label>File PDF</label><input id="pdfFile" type="file" accept=".pdf"></div>
  <div class="form-group" style="margin-bottom:12px;"><label>Nome squadra nel PDF</label><input id="pdfTeamName" placeholder="es. DREAMING FOOTBALL ACADEMY"></div>
  <div id="pdfResult" style="margin-top:16px;"></div>`;
  const footer = '<button class="btn btn-secondary" id="modalCancel">Annulla</button><button class="btn btn-primary" id="pdfSearch">🔍 Cerca</button>';
  const modal = createModal('Importa Calendario da PDF', content, footer, '700px');
  
  document.getElementById('pdfSearch').addEventListener('click', async () => {
    const file = document.getElementById('pdfFile').files[0];
    const name = document.getElementById('pdfTeamName').value.trim();
    if (!file || !name) { alert('Seleziona un PDF e inserisci il nome squadra'); return; }
    
    const resultDiv = document.getElementById('pdfResult');
    resultDiv.innerHTML = '<div class="loading"><div class="spinner"></div>Analisi PDF...</div>';
    
    const formData = new FormData();
    formData.append('pdf', file);
    formData.append('searchName', name);
    
    try {
      const token = localStorage.getItem('yfm_token');
      const resp = await fetch(`${API_BASE}/calendario/parse-pdf`, {
        method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error);
      
      if (data.categorie.length === 0) {
        const sugg = data.suggestions.length > 0 ? `<p style="margin-top:8px;">Suggerimenti: <strong>${data.suggestions.join(', ')}</strong></p>` : '';
        resultDiv.innerHTML = `<div style="color:#c00;padding:12px;background:#fee;border-radius:8px;">❌ Squadra non trovata nel PDF.${sugg}</div>`;
        return;
      }
      
      // Mostra categorie trovate con checkbox
      const isAdmin = window.YFM.canWrite('partite');
      const checkboxes = data.categorie.map((c, i) => `
        <label style="display:flex;align-items:center;gap:8px;padding:10px;background:#f8f9ff;border-radius:8px;margin-bottom:8px;cursor:pointer;">
          <input type="checkbox" name="pdfCat" value="${i}" data-cat="${c.categoria}" data-gir="${c.girone}" ${!isAdmin && i === 0 ? 'checked' : ''}>
          <span style="font-weight:600;">${c.categoria}</span> <span style="color:#666;">Girone ${c.girone}</span>
        </label>`).join('');
      
      resultDiv.innerHTML = `
        <div style="background:#e8f5e9;padding:12px;border-radius:8px;margin-bottom:12px;">✅ Trovata in ${data.categorie.length} categorie</div>
        <p style="font-weight:600;margin-bottom:8px;">Seleziona le categorie da importare:</p>
        ${checkboxes}
        <button class="btn btn-primary" id="pdfExtract" style="margin-top:12px;">📥 Estrai Calendario</button>`;
      
      document.getElementById('pdfExtract').addEventListener('click', () => extractAndPreview(file, name, modal));
    } catch (err) {
      resultDiv.innerHTML = `<div style="color:#c00;">${err.message}</div>`;
    }
  });
}

async function extractAndPreview(file, searchName, modal) {
  const checked = document.querySelectorAll('input[name="pdfCat"]:checked');
  if (checked.length === 0) { alert('Seleziona almeno una categoria'); return; }
  
  const resultDiv = document.getElementById('pdfResult');
  resultDiv.innerHTML = '<div class="loading"><div class="spinner"></div>Estrazione calendario...</div>';
  
  const token = localStorage.getItem('yfm_token');
  let allPartite = [];
  
  for (const cb of checked) {
    const formData = new FormData();
    formData.append('pdf', file);
    formData.append('searchName', searchName);
    formData.append('categoria', cb.dataset.cat);
    formData.append('girone', cb.dataset.gir);
    
    const resp = await fetch(`${API_BASE}/calendario/extract`, {
      method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData
    });
    const data = await resp.json();
    if (!resp.ok) { resultDiv.innerHTML = `<div style="color:#c00;">${data.error}</div>`; return; }
    allPartite = allPartite.concat(data.partite.map(p => ({ ...p, _cat: cb.dataset.cat + ' G.' + cb.dataset.gir })));
  }
  
  // Mostra anteprima
  const rows = allPartite.map(p => {
    const d = new Date(p.data);
    const dateStr = d.toLocaleDateString('it-IT', { day:'2-digit', month:'2-digit', year:'2-digit' });
    const timeStr = d.toLocaleTimeString('it-IT', { hour:'2-digit', minute:'2-digit' });
    const icon = p.luogo === 'Casa' ? '🏠' : '✈️';
    return `<tr><td style="padding:4px 8px;font-size:12px;">${p.giornata}</td><td style="padding:4px 8px;font-size:12px;">${dateStr} ${timeStr}</td><td style="padding:4px 8px;font-size:12px;">${icon} ${p.avversario}</td><td style="padding:4px 8px;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:150px;" title="${p.indirizzo_campo || ''}">${p.indirizzo_campo ? '📍' : ''}</td></tr>`;
  }).join('');
  
  resultDiv.innerHTML = `
    <div style="background:#e8f5e9;padding:8px 12px;border-radius:8px;margin-bottom:12px;">✅ ${allPartite.length} partite estratte</div>
    <div style="max-height:300px;overflow-y:auto;border:1px solid #eee;border-radius:8px;">
      <table style="width:100%;border-collapse:collapse;"><thead><tr style="background:#f5f5f5;"><th style="padding:6px 8px;font-size:11px;text-align:left;">G</th><th style="padding:6px 8px;font-size:11px;text-align:left;">Data</th><th style="padding:6px 8px;font-size:11px;text-align:left;">Partita</th><th style="padding:6px 8px;font-size:11px;">📍</th></tr></thead><tbody>${rows}</tbody></table>
    </div>
    <button class="btn btn-primary" id="pdfConfirm" style="margin-top:12px;width:100%;">✅ Conferma e Importa (${allPartite.length} partite)</button>`;
  
  document.getElementById('pdfConfirm').addEventListener('click', async () => {
    showLoading('Importazione...');
    try {
      const resp = await fetch(`${API_BASE}/calendario/import`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ squadraId: window.YFM.squadraId, partite: allPartite })
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error);
      hideLoading();
      modal.close();
      alert(`✅ Importate ${data.inserite} partite!`);
      loadCalendar();
    } catch (err) {
      hideLoading();
      alert('Errore: ' + err.message);
    }
  });
}

function createModal(title, content, footer, maxW = '600px', { closeOnOverlay = true } = {}) {
  const existing = document.getElementById('currentModal');
  if (existing) existing.remove();
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'currentModal';
  modal.innerHTML = '<div class="modal-content" style="max-width:' + maxW + ';"><div class="modal-header"><h2>' + title + '</h2><button class="modal-close-btn" id="modalCloseX">×</button></div><div class="modal-body">' + content + '</div>' + (footer ? '<div class="modal-footer">' + footer + '</div>' : '') + '</div>';
  document.body.appendChild(modal);
  const close = () => { const m = document.getElementById('currentModal'); if (m) m.remove(); };
  document.getElementById('modalCloseX').addEventListener('click', close);
  if (closeOnOverlay) modal.addEventListener('click', e => { if (e.target === modal) close(); });
  const cancelBtn = document.getElementById('modalCancel');
  if (cancelBtn) cancelBtn.addEventListener('click', close);
  return { modal, closeModal: close, close };
}
