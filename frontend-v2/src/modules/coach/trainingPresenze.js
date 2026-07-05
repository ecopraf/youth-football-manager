/**
 * trainingPresenze.js - Pagina "✅ Presenze"
 * Calendario + gestione presenze/assenze batch + riepilogo stagionale
 */

import { apiFetch } from '../../services/api';
import { showLoading, hideLoading } from '../../utils/ui';
import { getAvatarColor, formatDateShort } from '../../utils/formatters';
import { renderCalendar, attachCalendarListeners, setOnDateSelect, selectTodayIfTraining, getSelectedDate } from './trainingCalendar';
import { loadTrainingData } from './trainingData';

const MOTIVI_ASSENZA = [
  { value: '', label: 'Nessun motivo' },
  { value: 'Impegni Scolastici', label: '📚 Impegni Scolastici' },
  { value: 'Motivi Familiari', label: '👪 Motivi Familiari' },
  { value: 'Infortunio', label: '🏥 Infortunio' },
  { value: 'Malattia', label: '🤒 Malattia' }
];

let _trainingData = null;
let _absenceNotifications = [];

export default async function loadTrainingPresenze() {
  const c = document.getElementById('pageContent');
  c.innerHTML = '<div class="loading"><div class="spinner"></div>Caricamento...</div>';

  _trainingData = await loadTrainingData();
  if (!_trainingData) return;

  // Carica notifiche assenza per indicatore
  try {
    _absenceNotifications = await apiFetch('/absence/team/' + window.YFM.squadraId);
  } catch(e) { _absenceNotifications = []; }

  const { config, presenze, partite, giocatori, summary, settimana } = _trainingData;
  selectTodayIfTraining(config, presenze);

  setOnDateSelect((date) => {
    const container = document.getElementById('presenzeDetail');
    if (!container) return;
    container.innerHTML = renderPresenzeDetail(date);
    attachPresenzeListeners(date);
  });

  window._trainingRefreshCalendar = () => {
    const calEl = document.getElementById('trainingCalendar');
    if (calEl) { calEl.innerHTML = renderCalendar(config, presenze, partite); attachCalendarListeners(); }
  };

  c.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
      <h1 class="page-title">🙋 Presenze - ${window.YFM.getSquadraName()}</h1>
    </div>
    <div class="card" style="margin-bottom:16px;"><div id="trainingCalendar">${renderCalendar(config, presenze, partite)}</div></div>
    <div class="card" style="margin-bottom:16px;" id="presenzeDetail">${renderPresenzeDetail(getSelectedDate())}</div>
    ${renderSummary(giocatori, summary, settimana)}
  `;

  attachCalendarListeners();
  attachPresenzeListeners(getSelectedDate());
}

function renderPresenzeDetail(date) {
  if (!date) return `<div style="text-align:center;padding:40px;color:#6c757d;"><p style="font-size:16px;">📅 Seleziona un giorno dal calendario</p></div>`;

  const { presenze, giocatori } = _trainingData;
  const giorni = ['Domenica','Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato'];
  const d = new Date(date);
  const dayLabel = giorni[d.getDay()] + ' ' + d.getDate() + '/' + (d.getMonth()+1) + '/' + d.getFullYear();

  const presenzeData = (presenze || []).filter(p => p.data === date);
  const assentiIds = presenzeData.filter(p => !p.presente).map(p => p.calciatore_id);
  const hasData = presenzeData.length > 0;
  const sorted = [...(giocatori || [])].sort((a, b) => a.cognome.localeCompare(b.cognome));
  const presentiCount = sorted.length - assentiIds.length;
  const assentiCount = assentiIds.length;

  // Notifiche assenza per questa data
  const absForDate = _absenceNotifications.filter(a => a.data_allenamento === date);
  const absPlayerIds = new Set(absForDate.map(a => a.player_id));

  let html = `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
    <div style="font-size:15px;font-weight:600;color:#1a1a2e;">👥 ${dayLabel}</div>
    <span style="font-size:11px;padding:4px 10px;border-radius:12px;font-weight:600;${hasData ? 'background:#d1fae5;color:#065f46;' : 'background:#fef3c7;color:#92400e;'}">${hasData ? '✅ Registrata' : '🆕 Da compilare'}</span>
  </div>`;

  html += `<div style="display:flex;gap:16px;margin-bottom:12px;font-size:13px;">
    <span style="color:#22c55e;">✅ ${presentiCount} presenti</span>
    <span style="color:#ef4444;">❌ ${assentiCount} assenti</span>
    <span style="color:#6c757d;">👥 ${sorted.length} totali</span>
    ${absForDate.length > 0 ? `<span style="color:#F39C12;">⚠️ ${absForDate.length} segnalate</span>` : ''}
  </div>`;

  html += `<p style="margin-bottom:8px;font-size:12px;color:#6c757d;">Segna <span style="color:#E74C3C;font-weight:600;">ASSENTE</span>:</p><div id="presenzeList">`;

  sorted.forEach(g => {
    const isAssente = assentiIds.includes(g.id);
    const presRecord = presenzeData.find(p => (p.calciatore_id || p.calciatoreId) === g.id);
    const motivo = presRecord?.motivo_assenza || '';
    const absNotif = absForDate.find(a => a.player_id === g.id);

    html += `<div class="convocation-item" style="flex-wrap:wrap;gap:8px;">
      <div style="display:flex;align-items:center;gap:8px;min-width:200px;">
        <input type="checkbox" ${isAssente ? 'checked' : ''} data-pid="${g.id}" class="pres-check" style="width:20px;height:20px;cursor:pointer;accent-color:#E74C3C;">
        <div class="player-avatar" style="width:28px;height:28px;font-size:11px;background:${getAvatarColor(g.nome)};">${g.nome[0]}${g.cognome[0]}</div>
        <span style="font-size:13px;">${g.nome} ${g.cognome}</span>
        ${absNotif ? `<span title="${absNotif.motivo}${absNotif.messaggio ? ': ' + absNotif.messaggio : ''}" style="font-size:11px;color:#F39C12;font-weight:600;cursor:help;">⚠️ Assenza segnalata</span>` : ''}
      </div>
      <select data-pid="${g.id}" class="pres-motivo" style="padding:4px 8px;border-radius:6px;border:1px solid #e2e8f0;font-size:11px;${isAssente ? '' : 'opacity:0.4;'}" ${isAssente ? '' : 'disabled'}>
        ${MOTIVI_ASSENZA.map(m => `<option value="${m.value}" ${m.value === motivo ? 'selected' : ''}>${m.label}</option>`).join('')}
      </select>
    </div>`;
  });

  html += `</div><div style="margin-top:16px;"><button class="btn btn-primary" id="btnSavePresenze" data-help="presenze.salva">💾 Salva Presenze</button></div>`;
  return html;
}

function attachPresenzeListeners(date) {
  if (!date) return;
  document.querySelectorAll('.pres-check').forEach(cb => {
    cb.addEventListener('change', () => {
      const select = document.querySelector(`.pres-motivo[data-pid="${cb.dataset.pid}"]`);
      if (select) { select.disabled = !cb.checked; select.style.opacity = cb.checked ? '1' : '0.4'; }
    });
  });

  document.getElementById('btnSavePresenze')?.addEventListener('click', async () => {
    const presenzeList = [];
    document.querySelectorAll('.pres-check').forEach(cb => {
      const isAssente = cb.checked;
      const select = document.querySelector(`.pres-motivo[data-pid="${cb.dataset.pid}"]`);
      presenzeList.push({ calciatoreId: cb.dataset.pid, presente: !isAssente, note: isAssente && select ? select.value : null });
    });

    showLoading();
    try {
      await apiFetch('/squadre/' + window.YFM.squadraId + '/allenamenti/presenze-batch', {
        method: 'POST', body: JSON.stringify({ data: presenzeList, date })
      });
      hideLoading(); alert('✅ Presenze salvate!');
      loadTrainingPresenze();
    } catch(e) { hideLoading(); alert('Errore: ' + e.message); }
  });
}

function renderSummary(giocatori, summary, settimana) {
  const sorted = [...giocatori].sort((a, b) => a.cognome.localeCompare(b.cognome));
  const isActive = settimana.attiva !== false;
  const rangeLabel = isActive
    ? `${settimana.da ? formatDateShort(settimana.da) : ''} - ${settimana.a ? formatDateShort(settimana.a) : ''}`
    : `Stagione: ${settimana.da ? formatDateShort(settimana.da) : ''} - ${settimana.a ? formatDateShort(settimana.a) : ''}`;
  let html = `<div class="card" data-help="presenze.riepilogo" style="margin-bottom:20px;">
    <h3 class="section-title">📊 Riepilogo Presenze <span style="font-size:12px;color:var(--gray);font-weight:normal;">(${rangeLabel})</span></h3>
    <div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:13px;">
      <thead><tr style="background:#F8F9FA;">
        <th style="padding:8px;text-align:center;">#</th><th style="padding:8px;text-align:left;">Calciatore</th>
        <th style="padding:8px;text-align:center;">Tot.</th><th style="padding:8px;text-align:center;color:#27AE60;">Pres.</th>
        <th style="padding:8px;text-align:center;color:#E74C3C;">Ass.</th><th style="padding:8px;text-align:right;">%</th>
        ${isActive ? '<th style="padding:8px;text-align:center;color:#E74C3C;">Ass.Sett.</th>' : ''}
      </tr></thead><tbody>${sorted.map((g, i) => {
        const s = summary[g.id] || { totali:0, presenti:0, assenti:0, assentiSett:0 };
        const perc = s.totali > 0 ? Math.round((s.presenti / s.totali) * 100) : 0;
        const percColor = perc >= 80 ? '#22c55e' : perc >= 60 ? '#f59e0b' : '#ef4444';
        return `<tr style="border-bottom:1px solid #f8f8f8;">
          <td style="padding:8px;text-align:center;color:var(--gray);">${i+1}</td>
          <td style="padding:8px;">${g.nome} ${g.cognome}</td>
          <td style="padding:8px;text-align:center;">${s.totali}</td>
          <td style="padding:8px;text-align:center;color:#27AE60;font-weight:600;">${s.presenti}</td>
          <td style="padding:8px;text-align:center;color:#E74C3C;font-weight:600;">${s.assenti}</td>
          <td style="padding:8px;text-align:right;"><span style="color:${percColor};font-weight:600;">${perc}%</span></td>
          ${isActive ? `<td style="padding:8px;text-align:center;color:#E74C3C;">${s.assentiSett||0}</td>` : ''}
        </tr>`;
      }).join('')}</tbody></table></div></div>`;
  return html;
}
