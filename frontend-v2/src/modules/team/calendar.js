import { apiFetch } from '../../services/api';
import { formatDate, formatDateShort, formatDateCompact } from '../../utils/formatters';
import { showLoading, hideLoading } from '../../utils/ui';

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
    // Chiamate in parallelo (3 invece di 5 sequenziali)
    const [convResp, formResp, eventiResp] = await Promise.all([
      apiFetch('/squadre/' + window.YFM.squadraId + '/partite/' + matchId + '/convocati').catch(() => null),
      apiFetch('/squadre/' + window.YFM.squadraId + '/partite/' + matchId + '/formazione').catch(() => null),
      apiFetch('/squadre/' + window.YFM.squadraId + '/partite/' + matchId + '/eventi').catch(() => null)
    ]);
    const hasConvocazione = convResp && Array.isArray(convResp) && convResp.length > 0;
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
    const labels = { convocazione: 'Conv', formazione: 'Form', risultato: 'Ris', eventi: 'Ev' };
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
  
  // Separa future e passate
  const futureMatches = matches
    .filter(m => new Date(m.data_ora) >= now)
    .sort((a, b) => new Date(a.data_ora) - new Date(b.data_ora));
  
  const pastMatches = matches
    .filter(m => new Date(m.data_ora) < now)
    .sort((a, b) => new Date(b.data_ora) - new Date(a.data_ora));

  // Prossima partita (la prima delle future)
  const nextMatch = futureMatches.length > 0 ? futureMatches[0] : null;
  const otherFutureMatches = futureMatches.slice(1);

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
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;">
      <div><h1 class="page-title">Calendario ${window.YFM.getSquadraName()}</h1></div>
      <div style="display:flex;gap:8px;">
        <button class="btn btn-primary" id="btnAdd">+ Nuova</button>
        <button class="btn btn-secondary" id="btnImport" style="font-size:13px;">📥 Importa CSV</button>
      </div>
    </div>`;

  // PROSSIMA PARTITA in evidenza
  if (nextMatch) {
    html += `
      <div class="card" style="margin-bottom:20px;border-left:4px solid #28a745;background:linear-gradient(135deg, #E8F8F0 0%, #D4F1E0 100%);">
        <div style="display:flex;align-items:center;margin-bottom:8px;">
          <span style="background:#28a745;color:white;padding:2px 10px;border-radius:10px;font-size:12px;">🟢 PROSSIMA</span>
        </div>
        ${renderMatchCard(nextMatch, stats, true)}
      </div>`;
  }

  // ALTRE PARTITE FUTURE
  if (otherFutureMatches.length > 0) {
    html += `<div style="margin:20px 0 12px 0;"><span style="background:#D1ECF1;color:#0C5460;padding:2px 10px;border-radius:10px;font-size:12px;font-weight:600;">📅 IN ARRIVO</span></div>`;
    otherFutureMatches.forEach(m => {
      html += `<div class="card" style="margin-bottom:12px;">${renderMatchCard(m, stats)}</div>`;
    });
  }

  // PARTITE GIOCATE
  if (pastMatches.length > 0) {
    html += `<div style="margin:20px 0 12px 0;"><span style="background:#E9ECEF;color:#495057;padding:2px 10px;border-radius:10px;font-size:12px;font-weight:600;">🏆 GIOCATE</span></div>`;
    pastMatches.forEach(m => {
      html += `<div class="card" style="margin-bottom:12px;">${renderMatchCard(m, stats)}</div>`;
    });
  }

  c.innerHTML = html;

  document.getElementById('btnAdd').addEventListener('click', () => openMatchForm());
  document.getElementById('btnImport').addEventListener('click', openImportCSV);
  attachCardListeners();
}

function attachCardListeners() {
  // Desktop actions (in position absolute)
  document.querySelectorAll('.desktop-actions .btn-editm').forEach(b => {
  b.addEventListener('click', (e) => { e.stopPropagation(); openMatchForm(b.dataset.mid); });
  });
  document.querySelectorAll('.desktop-actions .btn-del').forEach(b => {
  b.addEventListener('click', (e) => { e.stopPropagation(); deleteMatch(b.dataset.mid); });
  });
}

export function renderMatchCard(m, stats, isNext = false) {
  const r = (stats?.risultati || []).find(x => x.id === m.id);
  const hasResult = !!(r || (m.gol_casa !== undefined && m.gol_trasferta !== undefined && m.stato === 'Terminata'));
  const isPast = new Date(m.data_ora) < new Date();
  const isArchiviata = m.archiviata === true || m.archiviata === 'true';

  const golFatti = r?.golFatti ?? (m.stato === 'Terminata' ? m.gol_casa : null) ?? null;
  const golSubiti = r?.golSubiti ?? (m.stato === 'Terminata' ? m.gol_ospite : null) ?? null;

  // === BORDO SINISTRO COLORATO PER ESITO ===
  let borderColor = '#dee2e6';
  if (isArchiviata) {
    borderColor = '#8B7355';
  } else if (isPast && hasResult && golFatti !== null && golSubiti !== null) {
    if (golFatti > golSubiti) borderColor = '#28a745';
    else if (golFatti < golSubiti) borderColor = '#dc3545';
    else borderColor = '#ffc107';
  } else if (!isPast && isNext) {
    borderColor = '#28a745';
  } else if (!isPast) {
    borderColor = '#667eea';
  }

  const cardStyle = `border-left:4px solid ${borderColor};${isArchiviata ? 'opacity:0.7;background:#F9F8F6;' : ''}`;

  // === BADGE ===
  const luogoBadge = m.luogo === 'Casa'
    ? '<span class="match-badge badge-casa">🏠 Casa</span>'
    : '<span class="match-badge badge-trasferta">✈️ Trasferta</span>';
  const compBadge = m.competizione ? `<span class="match-badge badge-section">${m.competizione}</span>` : '';
  const giornBadge = m.giornata ? `<span class="match-badge badge-section">⚽ G.${m.giornata}</span>` : '';
  const archivedBadge = isArchiviata ? '<span class="match-badge" style="background:#8B7355;color:white;">📦 Archiviata</span>' : '';

  // === RISULTATO ===
  let resultHtml = '';
  if (!isPast && hasResult && golFatti !== null && golSubiti !== null) {
    const color = golFatti > golSubiti ? '#27AE60' : golFatti === golSubiti ? '#F39C12' : '#E74C3C';
    resultHtml = `<span style="display:inline-flex;align-items:center;gap:8px;cursor:pointer;" onclick="event.stopPropagation();window.YFM.openMatchDetail('${m.id}')">`
      + `<span class="live-dot" style="background:#E74C3C;"></span>`
      + `<span class="live-text" style="color:#E74C3C;font-size:10px;font-weight:bold;">LIVE</span>`
      + `<span style="font-size:20px;font-weight:bold;color:${color};">${golFatti} - ${golSubiti}</span>`
      + `</span>`;
  } else if (hasResult && golFatti !== null && golSubiti !== null) {
    let cls, icon;
    if (golFatti > golSubiti) { cls = 'result-victory'; icon = '✅'; }
    else if (golFatti < golSubiti) { cls = 'result-defeat'; icon = '❌'; }
    else { cls = 'result-draw'; icon = '🤝'; }
    resultHtml = `<span class="result-badge ${cls}" style="cursor:pointer;" onclick="event.stopPropagation();window.YFM.openMatchDetail('${m.id}')"><span class="result-score">${golFatti} - ${golSubiti}</span>${icon}</span>`;
  } else if (!isPast) {
    resultHtml = `<button class="btn btn-primary btn-small" onclick="event.stopPropagation();window.YFM.openResultForm('${m.id}')">⚽ Risultato</button>`;
  }

  // === PROGRESS DOTS (placeholder, aggiornati in background) ===
  const progressHtml = (!isPast && !isArchiviata) ? `<div class="match-progress" data-mid="${m.id}"></div>` : '';

  // === PULSANTI AZIONE ===
  let actionsHtml = '';
  if (!isPast && !isArchiviata) {
    actionsHtml += makeBtn('📋 Convoca', `window.YFM.openConvocation('${m.id}',false)`, false);
    actionsHtml += makeBtn('🏟️ Formazione', `window.YFM.openFormazioneForm('${m.id}')`, false);
    actionsHtml += makeBtn('📄 Distinta', `window.YFM.openDistinta('${m.id}')`, false);
    actionsHtml += makeBtn('📝 Note', `window.YFM.openNoteAvversario('${m.id}')`, false);
    if (hasResult) {
      actionsHtml += makeBtn('✏️ Eventi', `window.YFM.openResultForm('${m.id}')`, false);
    }
  } else if (isPast && hasResult && !isArchiviata) {
    actionsHtml += makeBtn('📋 Conv.', `window.YFM.openConvocation('${m.id}',true)`, false);
    actionsHtml += makeBtn('🏟️ Formazione', `window.YFM.openFormazioneForm('${m.id}')`, false);
    actionsHtml += makeBtn('📄 Distinta', `window.YFM.openDistinta('${m.id}')`, false);
    actionsHtml += makeBtn('📝 Note', `window.YFM.openNoteAvversario('${m.id}')`, false);
    actionsHtml += makeBtn('✏️ Eventi', `window.YFM.openResultForm('${m.id}')`, false);
  } else if (isPast && !hasResult) {
    actionsHtml += makeBtn('📋 Conv.', `window.YFM.openConvocation('${m.id}',true)`, false);
    actionsHtml += makeBtn('🏟️ Formazione', `window.YFM.openFormazioneForm('${m.id}')`, false);
    actionsHtml += makeBtn('📄 Distinta', `window.YFM.openDistinta('${m.id}')`, false);
    actionsHtml += makeBtn('📝 Note', `window.YFM.openNoteAvversario('${m.id}')`, false);
  } else {
    actionsHtml += makeBtn('📋 Conv.', `window.YFM.openConvocation('${m.id}',true)`, false);
    actionsHtml += makeBtn('🏟️ Formazione', `window.YFM.openFormazioneForm('${m.id}')`, false);
    actionsHtml += makeBtn('📄 Distinta', `window.YFM.openDistinta('${m.id}')`, false);
    actionsHtml += makeBtn('📝 Note', `window.YFM.openNoteAvversario('${m.id}')`, false);
  }

  // === EDIT/DELETE/ARCHIVIA ===
  let editBtns = '';
  if (!isArchiviata) {
    const archBtn = (isPast && hasResult) ? `<button class="btn btn-secondary btn-small" style="color:#856404;" onclick="event.stopPropagation();archiveMatch('${m.id}')" title="Archivia">📦</button>` : '';
    editBtns = `${archBtn}<button class="btn btn-secondary btn-small btn-editm" data-mid="${m.id}" title="Modifica">✏️</button><button class="btn btn-secondary btn-small btn-danger btn-del" data-mid="${m.id}" title="Elimina">🗑️</button>`;
  } else {
    editBtns = `<button class="btn btn-secondary btn-small" style="background:#6B5B4F;color:white;border-color:#6B5B4F;" onclick="event.stopPropagation();unarchiveMatch('${m.id}')" title="Sblocca">🔓</button>`;
  }

  return `<div class="match-card-inner" data-mid="${m.id}" style="${cardStyle}padding-left:12px;">
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;">
      <div style="flex:1;min-width:0;">
        <div class="match-badges" style="margin-bottom:6px;">${luogoBadge}${compBadge}${giornBadge}${archivedBadge}</div>
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
          <span class="match-opponent">${m.avversario}</span>
          ${resultHtml}
        </div>
        <div class="match-date-compact">📅 ${formatDateCompact(m.data_ora)}</div>
        ${progressHtml}
      </div>
      <div class="match-card-actions">${editBtns}</div>
    </div>
    <button class="match-actions-toggle" onclick="event.stopPropagation();this.nextElementSibling.classList.toggle('expanded');this.textContent=this.nextElementSibling.classList.contains('expanded')?'▲ Chiudi':'⋯ Azioni'">⋯ Azioni</button>
    <div class="match-actions-row">${actionsHtml}</div>
  </div>`;
}

// Funzioni globali per archivia/sblocca
window.archiveMatch = async function(id) {
  if (!confirm('Archiviare questa partita? La partita verrà spostata nelle partite giocate e non sarà più possibile modificare eventi, formazione e convocazioni.')) return;
  showLoading();
  try {
    await apiFetch('/partite/' + id + '/archivia', { method: 'PUT' });
    loadCalendar();
  } catch (e) { alert(e.message); }
  finally { hideLoading(); }
};

window.unarchiveMatch = async function(id) {
  if (!confirm('Sbloccare questa partita? Sarà possibile modificare eventi, formazione e convocazioni.')) return;
  showLoading();
  try {
    await apiFetch('/partite/' + id + '/sblocca', { method: 'PUT' });
    loadCalendar();
  } catch (e) { alert(e.message); }
  finally { hideLoading(); }
};

export function openMatchForm(mid) {
  const m = mid ? allMatches.find(x => x.id === mid) : null;
  const content = `
  <div class="form-group" style="margin-bottom:12px;"><label>Data e Ora</label><input id="mfD" type="datetime-local" value="${m ? new Date(m.data_ora).toISOString().slice(0, 16) : ''}"></div>
  <div class="form-group" style="margin-bottom:12px;"><label>Avversario</label><input id="mfA" value="${m ? m.avversario || '' : ''}"></div>
  <div class="form-group" style="margin-bottom:12px;"><label>Luogo</label><select id="mfL"><option ${m && m.luogo === 'Casa' ? 'selected' : ''}>Casa</option><option ${m && m.luogo === 'Trasferta' ? 'selected' : ''}>Trasferta</option></select></div>
  <div class="form-group" style="margin-bottom:12px;"><label>Competizione</label><input id="mfC" value="${m ? m.competizione || '' : ''}"></div>
  <div class="form-group"><label>Giornata</label><input id="mfG" type="number" value="${m ? m.giornata || '' : ''}" style="width:80px;"></div>`;
  const footer = '<button class="btn btn-secondary" id="modalCancel">Annulla</button><button class="btn btn-primary" id="saveBtn">Salva</button>';
  const modal = createModal(m ? 'Modifica' : 'Nuova Partita', content, footer, '500px');
  document.getElementById('saveBtn').addEventListener('click', async () => {
  const d = {
    dataOra: new Date(document.getElementById('mfD').value).toISOString(),
    avversario: document.getElementById('mfA').value,
    luogo: document.getElementById('mfL').value,
    competizione: document.getElementById('mfC').value,
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
  if (!confirm('Eliminare?')) return;
  await apiFetch('/partite/' + id, { method: 'DELETE' });
  loadCalendar();
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

function createModal(title, content, footer, maxW = '600px') {
  const existing = document.getElementById('currentModal');
  if (existing) existing.remove();
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'currentModal';
  modal.innerHTML = '<div class="modal-content" style="max-width:' + maxW + ';"><div class="modal-header"><h2>' + title + '</h2><button class="modal-close-btn" id="modalCloseX">×</button></div><div class="modal-body">' + content + '</div>' + (footer ? '<div class="modal-footer">' + footer + '</div>' : '') + '</div>';
  document.body.appendChild(modal);
  const close = () => { const m = document.getElementById('currentModal'); if (m) m.remove(); };
  document.getElementById('modalCloseX').addEventListener('click', close);
  modal.addEventListener('click', e => { if (e.target === modal) close(); });
  const cancelBtn = document.getElementById('modalCancel');
  if (cancelBtn) cancelBtn.addEventListener('click', close);
  return { modal, closeModal: close, close };
}
