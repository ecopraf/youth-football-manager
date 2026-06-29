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
    
    await preloadMatchSteps(matches);
    renderCalendarPage(c, matches, stats);
  } catch (e) {
    c.innerHTML = '<div class="error-box">' + e.message + '</div>';
  }
}

async function preloadMatchSteps(matches) {
  const now = new Date();
  const futureMatches = matches.filter(m => new Date(m.data_ora) >= now);
  for (const m of futureMatches) {
    matchSteps[m.id] = await getNextStep(m.id);
  }
}

async function getNextStep(matchId) {
  try {
    const convResp = await apiFetch('/squadre/' + window.YFM.squadraId + '/partite/' + matchId + '/convocati').catch(() => null);
    const hasConvocazione = convResp && Array.isArray(convResp) && convResp.length > 0;
    
    const formResp = await apiFetch('/squadre/' + window.YFM.squadraId + '/partite/' + matchId + '/formazione').catch(() => null);
    const hasFormazione = formResp && Object.keys(formResp).length > 0;
    
    const distResp = await apiFetch('/squadre/' + window.YFM.squadraId + '/partite/' + matchId + '/distinta').catch(() => null);
    const hasDistinta = distResp && Array.isArray(distResp) && distResp.length > 0;
    
    const match = allMatches.find(m => m.id === matchId);
    const hasRisultato = match && match.gol_casa !== null && match.gol_casa !== undefined;
    
    const eventiResp = await apiFetch('/squadre/' + window.YFM.squadraId + '/partite/' + matchId + '/eventi').catch(() => null);
    const hasEventi = eventiResp && Array.isArray(eventiResp) && eventiResp.length > 0;
    
    if (!hasConvocazione) return 'convocazione';
    if (!hasFormazione) return 'formazione';
    if (!hasDistinta) return 'distinta';
    if (!hasRisultato) return 'risultato';
    if (!hasEventi) return 'eventi';
    return null;
  } catch (e) {
    console.warn('Errore getNextStep:', e);
    return 'convocazione';
  }
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
    const nextStep = matchSteps[nextMatch.id];
    const stepInfo = nextStep ? stepColors[nextStep] : null;
    const stepBadge = stepInfo ? `<span class="pallino-blink"></span><span style="color:${stepInfo.color};font-size:12px;font-weight:600;">${stepInfo.icon} ${stepInfo.label}</span>` : '';
    
    html += `
      <div class="card" style="margin-bottom:20px;border-left:4px solid var(--green);background:#E8F8F0;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
          <h3 class="section-title" style="margin:0;">⚽ PROSSIMA PARTITA</h3>
          ${stepBadge}
        </div>
        ${renderMatchCard(nextMatch, stats, true, nextStep)}
      </div>`;
  }

  // ALTRE PARTITE FUTURE
  if (otherFutureMatches.length > 0) {
    html += `<h3 class="section-title" style="margin:20px 0 12px 0;">📅 Prossime Partite</h3>`;
    otherFutureMatches.forEach(m => {
      const step = matchSteps[m.id];
      const hasAction = step !== null && step !== undefined;
      const stepInfo = step ? stepColors[step] : null;
      const stepBadge = stepInfo ? `<span class="pallino-blink"></span><span style="color:${stepInfo.color};font-size:11px;font-weight:600;">${stepInfo.icon}</span>` : '';
      const highlightStyle = hasAction ? 'border-left:3px solid #007bff;' : '';
      
      html += `<div class="card" style="margin-bottom:12px;${highlightStyle}">${stepBadge}${renderMatchCard(m, stats, false, step)}</div>`;
    });
  }

  // PARTITE GIOCATE
  if (pastMatches.length > 0) {
    html += `<h3 class="section-title" style="margin:20px 0 12px 0;">🏆 Partite Giocate</h3>`;
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
  document.querySelectorAll('.btn-editm').forEach(b => {
  b.addEventListener('click', (e) => { e.stopPropagation(); openMatchForm(b.dataset.mid); });
  });
  document.querySelectorAll('.btn-del').forEach(b => {
  b.addEventListener('click', (e) => { e.stopPropagation(); deleteMatch(b.dataset.mid); });
  });
}

export function renderMatchCard(m, stats, isNext = false, nextStep = null) {
  // Cerca risultato in stats o usa dati diretti dalla partita (demo mode)
  const r = (stats?.risultati || []).find(x => x.id === m.id);
  const hasResult = !!(r || (m.gol_casa !== undefined && m.gol_trasferta !== undefined));
  const isPast = new Date(m.data_ora) < new Date();
  const isArchiviata = m.archiviata === true || m.archiviata === 'true';
  
  // Stile per partite archiviate (elegante grigio/marrone) - SOLO icona 📦
  const archivedStyle = isArchiviata ? 'opacity:0.75;border-left:4px solid #8B7355 !important;background:#F5F5F0 !important;' : '';
  const archivedIcon = isArchiviata ? '📦 ' : '';

  // Estrai gol (da stats o da dati diretti partita)
  const golFatti = r?.golFatti ?? m.gol_casa ?? null;
  const golSubiti = r?.golSubiti ?? m.gol_trasferta ?? null;

  let L = `
  <div class="match-date">${archivedIcon}${formatDate(m.data_ora)}</div>
  <div class="match-teams">${window.YFM.getSocietaName()} vs ${m.avversario}</div>
  <div class="match-info">${m.giornata ? 'Giornata ' + m.giornata + ' - ' : ''}${m.competizione} · ${m.luogo}</div>`;

  let R = '';
  
  // ===== PARTE SINISTRA: Risultato/Dettaglio =====
  if (hasResult && golFatti !== null && golSubiti !== null) {
  const color = golFatti > golSubiti ? '#27AE60' : golFatti === golSubiti ? '#F39C12' : '#E74C3C';
  // Pallino e LIVE lampeggianti per partite in corso
  const liveIndicator = !isPast ? `
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
      <span class="live-dot" style="background:#E74C3C;"></span>
      <span class="live-text" style="color:#E74C3C;font-size:10px;font-weight:bold;">LIVE</span>
    </div>` : '';
  R += `<div style="text-align:center;cursor:pointer;" onclick="event.stopPropagation();window.YFM.openMatchDetail('${m.id}')" title="Dettaglio">${liveIndicator}<div style="font-size:22px;font-weight:bold;color:${color};">${golFatti} - ${golSubiti}</div></div>`;
  } else if (!isPast) {
  // Partita futura senza risultato: mostra pulsante Risultato
  R += `<button class="btn btn-primary btn-small" onclick="event.stopPropagation();window.YFM.openResultForm('${m.id}')">📊 Risultato</button>`;
  } else {
  // Partita passata senza risultato: mostra dettaglio
  R += `<span style="color:var(--gray);cursor:pointer;" onclick="event.stopPropagation();window.YFM.openMatchDetail('${m.id}')">Dettaglio</span>`;
  }

  // ===== PULSANTI: Logica corretta =====
  
  // Partite future: tutti i pulsanti modificabili
  if (!isPast) {
  // Formazione - UN SOLO pulsante
  R += `<button class="btn btn-secondary btn-small" onclick="event.stopPropagation();window.YFM.openFormazioneForm('${m.id}')">👥 Formazione</button>`;
  R += `<button class="btn btn-secondary btn-small" onclick="event.stopPropagation();window.YFM.openNoteAvversario('${m.id}')">📝 Note</button>`;
  R += `<button class="btn btn-secondary btn-small" onclick="event.stopPropagation();window.YFM.openConvocation('${m.id}',false)">📋 Convoca</button>`;
  R += `<button class="btn btn-secondary btn-small" onclick="event.stopPropagation();window.YFM.openDistinta('${m.id}')">📄 Distinta</button>`;
  
  // Se ha già un risultato ma non è archiviata: mostra pulsante per modificare eventi
  if (hasResult && !isArchiviata) {
    R += `<button class="btn btn-primary btn-small" onclick="event.stopPropagation();window.YFM.openResultForm('${m.id}')">✏️ Eventi</button>`;
  }
  
  } else if (isPast && hasResult && !isArchiviata) {
  // Partita passata con risultato ma non archiviata: mostra pulsante Archivia
  R += `<button class="btn btn-secondary btn-small" onclick="event.stopPropagation();window.YFM.openFormazioneForm('${m.id}')">👥 Formazione</button>`;
  R += `<button class="btn btn-secondary btn-small" onclick="event.stopPropagation();window.YFM.openConvocation('${m.id}',true)">📋 Conv.</button>`;
  R += `<button class="btn btn-secondary btn-small" onclick="event.stopPropagation();window.YFM.openDistinta('${m.id}')">📄 Dist.</button>`;
  R += `<button class="btn btn-secondary btn-small" style="background:#8B7355;color:white;border-color:#8B7355;" onclick="event.stopPropagation();archiveMatch('${m.id}')">📦 Archivia</button>`;
  
  } else if (isPast && !hasResult) {
  // Partita passata senza risultato
  R += `<button class="btn btn-secondary btn-small" onclick="event.stopPropagation();window.YFM.openFormazioneForm('${m.id}')">👥 Formazione</button>`;
  R += `<button class="btn btn-secondary btn-small" onclick="event.stopPropagation();window.YFM.openConvocation('${m.id}',true)">📋 Conv.</button>`;
  R += `<button class="btn btn-secondary btn-small" onclick="event.stopPropagation();window.YFM.openDistinta('${m.id}')">📄 Dist.</button>`;
  } else {
  // Partite archiviate: solo consultazione
  R += `<button class="btn btn-secondary btn-small" onclick="event.stopPropagation();window.YFM.openFormazioneForm('${m.id}')">👥 Formazione</button>`;
  R += `<button class="btn btn-secondary btn-small" onclick="event.stopPropagation();window.YFM.openConvocation('${m.id}',true)">📋 Conv.</button>`;
  R += `<button class="btn btn-secondary btn-small" onclick="event.stopPropagation();window.YFM.openDistinta('${m.id}')">📄 Dist.</button>`;
  }
  
  // Edit e Elimina - nascondi SOLO per partite archiviate
  if (!isArchiviata) {
  R += `<button class="btn btn-secondary btn-small btn-editm" data-mid="${m.id}">✏️</button>`;
  R += `<button class="btn btn-secondary btn-small btn-danger btn-del" data-mid="${m.id}">🗑️</button>`;
  } else {
  // Partita archiviata: mostra solo pulsante Sblocca
  R += `<button class="btn btn-secondary btn-small" style="background:#6B5B4F;color:white;border-color:#6B5B4F;" onclick="event.stopPropagation();unarchiveMatch('${m.id}')">🔓 Sblocca</button>`;
  }

  return `<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;${archivedStyle}">
  <div style="flex:1;min-width:220px;">${L}</div>
  <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">${R}</div>
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
