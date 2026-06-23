import { apiFetch } from '../../services/api';
import { formatDate, formatDateShort } from '../../utils/formatters';
import { showLoading, hideLoading } from '../../utils/ui';

let allMatches = [];

export default async function loadCalendar() {
  const c = document.getElementById('pageContent');
  try {
    const [matches, stats] = await Promise.all([
      apiFetch('/squadre/' + window.YFM.squadraId + '/partite'),
      apiFetch('/squadre/' + window.YFM.squadraId + '/statistiche-complete').catch(() => ({ risultati: [] }))
    ]);
    allMatches = matches;
    window.YFM.allMatches = matches;

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

    let html = `
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
        <div class="card" style="margin-bottom:20px;border-left:4px solid var(--green);background:#E8F8F0;">
          <h3 class="section-title">⚽ PROSSIMA PARTITA</h3>
          ${renderMatchCard(nextMatch, stats, true)}
        </div>`;
    }

    // ALTRE PARTITE FUTURE
    if (otherFutureMatches.length > 0) {
      html += `<h3 class="section-title" style="margin:20px 0 12px 0;">📅 Prossime Partite</h3>`;
      otherFutureMatches.forEach(m => {
        html += `<div class="card" style="margin-bottom:12px;">${renderMatchCard(m, stats)}</div>`;
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
  } catch (e) {
    c.innerHTML = '<div class="error-box">' + e.message + '</div>';
  }
}

function attachCardListeners() {
  document.querySelectorAll('.btn-editm').forEach(b => {
    b.addEventListener('click', (e) => { e.stopPropagation(); openMatchForm(b.dataset.mid); });
  });
  document.querySelectorAll('.btn-del').forEach(b => {
    b.addEventListener('click', (e) => { e.stopPropagation(); deleteMatch(b.dataset.mid); });
  });
}

export function renderMatchCard(m, stats, isNext = false) {
  const r = (stats?.risultati || []).find(x => x.id === m.id);
  const hasResult = !!r;
  const isPast = new Date(m.data_ora) < new Date();

  let L = `
    <div class="match-date">${formatDate(m.data_ora)}</div>
    <div class="match-teams">${window.YFM.getSocietaName()} vs ${m.avversario}</div>
    <div class="match-info">${m.giornata ? 'Giornata ' + m.giornata + ' - ' : ''}${m.competizione} · ${m.luogo}</div>`;

  let R = '';
  
  if (hasResult) {
    const color = r.golFatti > r.golSubiti ? '#27AE60' : r.golFatti === r.golSubiti ? '#F39C12' : '#E74C3C';
    const liveIcon = !isPast ? '<span style="color:#E74C3C;font-size:10px;">●</span> ' : '';
    R += `<div style="font-size:22px;font-weight:bold;color:${color};cursor:pointer;min-width:50px;text-align:center;" onclick="event.stopPropagation();window.YFM.openMatchDetail('${m.id}')" title="Dettaglio">${liveIcon}${r.golFatti} - ${r.golSubiti}</div>`;
    if (!isPast) R += `<div style="font-size:10px;color:#E74C3C;text-align:center;">LIVE</div>`;
  } else if (!isPast) {
    R += `<button class="btn btn-primary btn-small" onclick="event.stopPropagation();window.YFM.openResultForm('${m.id}')">📊 Risultato</button>`;
  } else {
    R += `<span style="color:var(--gray);cursor:pointer;" onclick="event.stopPropagation();window.YFM.openMatchDetail('${m.id}')">Dettaglio</span>`;
  }

  R += `<button class="btn btn-secondary btn-small" onclick="event.stopPropagation();window.YFM.openConvocation('${m.id}',${isPast})">📋 ${isPast ? 'Conv.' : 'Convoca'}</button>`;
  R += `<button class="btn btn-secondary btn-small" onclick="event.stopPropagation();window.YFM.openDistinta('${m.id}')">📄 ${isPast ? 'Dist.' : 'Distinta'}</button>`;
  if (hasResult) {
    R += `<button class="btn btn-primary btn-small" onclick="event.stopPropagation();window.YFM.openFormazioneForm('${m.id}')">👥 Formazione</button>`;
  }
  
  if (!isPast) {
    R += `<button class="btn btn-secondary btn-small" onclick="event.stopPropagation();window.YFM.openFormazioneForm('${m.id}')">👥 Formazione</button>`;
    R += `<button class="btn btn-secondary btn-small" onclick="event.stopPropagation();window.YFM.openNoteAvversario('${m.id}')">📝 Note</button>`;
  }
  
  R += `<button class="btn btn-secondary btn-small btn-editm" data-mid="${m.id}">✏️</button>`;
  R += `<button class="btn btn-secondary btn-small btn-danger btn-del" data-mid="${m.id}">🗑️</button>`;

  return `<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
    <div style="flex:1;min-width:220px;">${L}</div>
    <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">${R}</div>
  </div>`;
}

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
