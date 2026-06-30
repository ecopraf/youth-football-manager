import { apiFetch } from '../../services/api';
import { formatDate, formatDateShort } from '../../utils/formatters';
import { showLoading, hideLoading } from '../../utils/ui';

let allMatches = [];
let matchSteps = {};

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
  // Aggiorna step badge (pallino + label nella sezione PROSSIMA/IN ARRIVO)
  document.querySelectorAll('.step-badge[data-mid]').forEach(el => {
    const mid = el.dataset.mid;
    const nextStep = matchSteps[mid];
    if (!nextStep) { el.innerHTML = ''; return; }
    const info = stepColors[nextStep];
    if (info) {
      el.innerHTML = `<span class="pallino-blink"></span><span style="color:${info.color};font-size:12px;font-weight:600;">${info.icon} ${info.label}</span>`;
    }
  });
  // Aggiorna bordo sinistro per card con azione pendente
  document.querySelectorAll('.step-badge[data-mid]').forEach(el => {
    const mid = el.dataset.mid;
    const nextStep = matchSteps[mid];
    if (nextStep) {
      const card = el.closest('.card');
      if (card && !card.style.borderLeft.includes('#28a745')) {
        card.style.borderLeft = '3px solid #007bff';
      }
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
    
    /* === LAYOUT MOBILE (< 640px) === */
    @media (max-width: 639px) {
      .match-card-wrapper {
        padding-top: 32px !important;
      }
      .desktop-actions {
        top: 4px !important;
        right: 4px !important;
      }
      .action-buttons {
        display: grid !important;
        grid-template-columns: repeat(3, 1fr) !important;
        gap: 4px !important;
      }
      .action-buttons button {
        font-size: 11px !important;
        padding: 6px 4px !important;
        text-align: center !important;
        white-space: nowrap !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
      }
      .match-teams {
        max-width: 160px !important;
        font-size: 13px !important;
      }
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
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;flex-wrap:wrap;gap:8px;">
          <h3 style="margin:0;color:#155724;">
            <span style="background:#28a745;color:white;padding:2px 10px;border-radius:10px;font-size:12px;margin-right:8px;">🟢 PROSSIMA</span>
          </h3>
          <span class="step-badge" data-mid="${nextMatch.id}"></span>
        </div>
        ${renderMatchCard(nextMatch, stats, true)}
      </div>`;
  }

  // ALTRE PARTITE FUTURE
  if (otherFutureMatches.length > 0) {
    html += `<div style="margin:20px 0 12px 0;"><span style="background:#D1ECF1;color:#0C5460;padding:2px 10px;border-radius:10px;font-size:12px;font-weight:600;">📅 IN ARRIVO</span></div>`;
    otherFutureMatches.forEach(m => {
      html += `<div class="card" style="margin-bottom:12px;"><span class="step-badge" data-mid="${m.id}"></span>${renderMatchCard(m, stats)}</div>`;
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

export function renderMatchCard(m, stats, isNext = false, nextStep = null) {
  // Cerca risultato in stats o usa dati diretti dalla partita (demo mode)
  const r = (stats?.risultati || []).find(x => x.id === m.id);
  const hasResult = !!(r || (m.gol_casa !== undefined && m.gol_trasferta !== undefined));
  const isPast = new Date(m.data_ora) < new Date();
  const isArchiviata = m.archiviata === true || m.archiviata === 'true';
  
  // Stile per partite archiviate
  const archivedStyle = isArchiviata ? 'opacity:0.75;border-left:4px solid #8B7355 !important;background:#F5F5F0 !important;' : '';
  const archivedIcon = isArchiviata ? '📦' : '';

  // Estrai gol (da stats o da dati diretti partita)
  const golFatti = r?.golFatti ?? m.gol_casa ?? null;
  const golSubiti = r?.golSubiti ?? m.gol_trasferta ?? null;

  // Badge Risultato con icona
  let resultBadge = '';
  if (!isPast && hasResult && golFatti !== null && golSubiti !== null) {
    // Partita futura con risultato = IN CORSO / LIVE
    const color = golFatti > golSubiti ? '#27AE60' : golFatti === golSubiti ? '#F39C12' : '#E74C3C';
    resultBadge = `<span style="display:inline-flex;align-items:center;gap:8px;cursor:pointer;" onclick="event.stopPropagation();window.YFM.openMatchDetail('${m.id}')">`+
      `<span class="live-dot" style="background:#E74C3C;"></span>` +
      `<span class="live-text" style="color:#E74C3C;font-size:10px;font-weight:bold;">LIVE</span>` +
      `<span style="font-size:16px;font-weight:bold;color:${color};">${golFatti} - ${golSubiti}</span>` +
      `</span>`;
  } else if (hasResult && golFatti !== null && golSubiti !== null) {
    let icon, color, bgColor;
    if (golFatti > golSubiti) {
      icon = '✅'; color = '#27AE60'; bgColor = '#e8f5e9';
    } else if (golFatti < golSubiti) {
      icon = '❌'; color = '#E74C3C'; bgColor = '#ffebee';
    } else {
      icon = '🤝'; color = '#F39C12'; bgColor = '#fff8e1';
    }
    resultBadge = `<span style="background:${bgColor};color:${color};padding:2px 8px;border-radius:6px;font-weight:bold;font-size:14px;border:1px solid ${color};cursor:pointer;" onclick="event.stopPropagation();window.YFM.openMatchDetail('${m.id}')">${golFatti} - ${golSubiti} ${icon}</span>`;
  }

  // Badge Casa/Trasferta
  const luogoBadge = m.luogo === 'Casa' 
    ? '<span style="background:#D4EDDA;color:#155724;padding:1px 6px;border-radius:6px;font-size:11px;">🏠 Casa</span>'
    : '<span style="background:#FFF3CD;color:#856404;padding:1px 6px;border-radius:6px;font-size:11px;">✈️ Trasferta</span>';
  
  // Badge Giornata e Competizione
  const giornataBadge = m.giornata ? `<span style="background:#E9ECEF;padding:1px 6px;border-radius:6px;font-size:11px;">${m.giornata}</span>` : '';
  const compBadge = m.competizione ? `<span style="background:#E9ECEF;padding:1px 6px;border-radius:6px;font-size:11px;">${m.competizione}</span>` : '';
  
  // === LAYOUT DESKTOP ===
  // Riga 1: Data + Badge Giornata + Badge Competizione + Badge Luogo
  // Riga 2: Nome Squadre + Result Badge (stessa riga)
  // Riga 3: Tutti i pulsanti azione (stessa riga)
  // Riga 4: Edit/Delete in alto a destra (piccoli)
  
  let desktopHTML = `
  <div class="match-date">${archivedIcon ? archivedIcon + ' ' : ''}${formatDate(m.data_ora)}</div>
  <div style="display:flex;align-items:center;flex-wrap:wrap;gap:6px;margin-bottom:4px;">
    ${giornataBadge} ${compBadge} ${luogoBadge}
  </div>
  <div style="display:flex;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:8px;">
    <span class="match-teams" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:300px;">${window.YFM.getSocietaName()} vs ${m.avversario}</span>
    ${resultBadge}
  </div>
  ${!isPast && !isArchiviata ? `<div class="match-progress" data-mid="${m.id}" style="display:flex;gap:12px;margin-bottom:8px;padding:6px 0;"></div>` : ''}
  <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;" class="action-buttons">`;

  // === PULSANTI AZIONE ===
  // Future: Convocazione, Formazione, Distinta, Eventi (se ha risultato), Note
  // Giocate: Convocazione, Formazione, Distinta, Archivia (se con risultato), Note
  // Archiviate: Convocazione, Formazione, Distinta, Sblocca, Note
  
  if (!isPast) {
    // Partite future
    desktopHTML += `<button class="btn btn-secondary btn-small" onclick="event.stopPropagation();window.YFM.openConvocation('${m.id}',false)">📋 Convocazione</button>`;
    desktopHTML += `<button class="btn btn-secondary btn-small" onclick="event.stopPropagation();window.YFM.openFormazioneForm('${m.id}')">🏟️ Formazione</button>`;
    desktopHTML += `<button class="btn btn-secondary btn-small" onclick="event.stopPropagation();window.YFM.openDistinta('${m.id}')">📄 Distinta</button>`;
    if (hasResult) {
      desktopHTML += `<button class="btn btn-primary btn-small" onclick="event.stopPropagation();window.YFM.openResultForm('${m.id}')">⚽ Eventi</button>`;
    }
    desktopHTML += `<button class="btn btn-secondary btn-small" onclick="event.stopPropagation();window.YFM.openNoteAvversario('${m.id}')">📝 Note</button>`;
  } else if (isPast && !isArchiviata) {
    // Partite giocate (non archiviate)
    desktopHTML += `<button class="btn btn-secondary btn-small" onclick="event.stopPropagation();window.YFM.openConvocation('${m.id}',true)">📋 Convocazione</button>`;
    desktopHTML += `<button class="btn btn-secondary btn-small" onclick="event.stopPropagation();window.YFM.openFormazioneForm('${m.id}')">🏟️ Formazione</button>`;
    desktopHTML += `<button class="btn btn-secondary btn-small" onclick="event.stopPropagation();window.YFM.openDistinta('${m.id}')">📄 Distinta</button>`;
    if (hasResult) {
      desktopHTML += `<button class="btn btn-secondary btn-small" style="background:#8B7355;color:white;border-color:#8B7355;" onclick="event.stopPropagation();archiveMatch('${m.id}')">📦 Archivia</button>`;
    }
    desktopHTML += `<button class="btn btn-secondary btn-small" onclick="event.stopPropagation();window.YFM.openNoteAvversario('${m.id}')">📝 Note</button>`;
  } else {
    // Partite archiviate
    desktopHTML += `<button class="btn btn-secondary btn-small" onclick="event.stopPropagation();window.YFM.openConvocation('${m.id}',true)">📋 Convocazione</button>`;
    desktopHTML += `<button class="btn btn-secondary btn-small" onclick="event.stopPropagation();window.YFM.openFormazioneForm('${m.id}')">🏟️ Formazione</button>`;
    desktopHTML += `<button class="btn btn-secondary btn-small" onclick="event.stopPropagation();window.YFM.openDistinta('${m.id}')">📄 Distinta</button>`;
    desktopHTML += `<button class="btn btn-secondary btn-small" style="background:#6B5B4F;color:white;border-color:#6B5B4F;" onclick="event.stopPropagation();unarchiveMatch('${m.id}')">🔓 Sblocca</button>`;
    desktopHTML += `<button class="btn btn-secondary btn-small" onclick="event.stopPropagation();window.YFM.openNoteAvversario('${m.id}')">📝 Note</button>`;
  }
  
  desktopHTML += `</div>`;

  // === PULSANTI EDIT/DELETE (DESKTOP - piccoli in alto a destra) ===
  let actionButtons = '';
  if (!isArchiviata) {
    actionButtons = `
    <div class="desktop-actions" style="position:absolute;top:8px;right:8px;display:flex;gap:4px;">
      <button class="btn btn-secondary btn-small btn-editm" data-mid="${m.id}" title="Modifica" style="padding:4px 8px;">✏️</button>
      <button class="btn btn-secondary btn-small btn-danger btn-del" data-mid="${m.id}" title="Elimina" style="padding:4px 8px;">🗑️</button>
    </div>`;
  }

  return `<div class="match-card-wrapper" style="position:relative;${archivedStyle}">
    ${actionButtons}
    ${desktopHTML}
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
