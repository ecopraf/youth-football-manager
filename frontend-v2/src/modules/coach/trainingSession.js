/**
 * trainingSession.js - Dettaglio seduta di allenamento (presenze + programma)
 */

import { getAvatarColor } from '../../utils/formatters';
import { showLoading, hideLoading } from '../../utils/ui';
import { apiFetch } from '../../services/api';

const MOTIVI_ASSENZA = [
  { value: '', label: 'Nessun motivo' },
  { value: 'Impegni Scolastici', label: '📚 Impegni Scolastici' },
  { value: 'Motivi Familiari', label: '👨‍👩‍👧 Motivi Familiari' },
  { value: 'Infortunio', label: '🏥 Infortunio' },
  { value: 'Malattia', label: '🤒 Malattia' }
];

export function renderSession(date, trainingData) {
  if (!date) {
    return `<div style="text-align:center;padding:40px;color:#6c757d;">
      <p style="font-size:16px;">📅 Seleziona un giorno dal calendario</p>
      <p style="font-size:13px;">Clicca su un giorno con il pallino verde per vedere il dettaglio</p>
    </div>`;
  }

  const { presenze, giocatori } = trainingData;
  const giorni = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
  const d = new Date(date);
  const dayLabel = giorni[d.getDay()] + ' ' + d.getDate() + '/' + (d.getMonth() + 1) + '/' + d.getFullYear();

  // Presenze per questa data
  const presenzeData = (presenze || []).filter(p => p.data === date);
  const assentiIds = presenzeData.filter(p => !p.presente).map(p => p.calciatore_id);
  const hasData = presenzeData.length > 0;

  const sorted = [...(giocatori || [])].sort((a, b) => a.cognome.localeCompare(b.cognome));
  const presentiCount = sorted.length - assentiIds.length;
  const assentiCount = assentiIds.length;

  let html = `<style>
    .session-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; flex-wrap:wrap; gap:8px; }
    .session-title { font-size:15px; font-weight:600; color:#1a1a2e; }
    .session-badge { font-size:11px; padding:4px 10px; border-radius:12px; font-weight:600; }
    .session-badge.registered { background:#d1fae5; color:#065f46; }
    .session-badge.new { background:#fef3c7; color:#92400e; }
    .presenze-summary { display:flex; gap:16px; margin-bottom:12px; font-size:13px; }
    .session-actions { display:flex; gap:8px; margin-top:16px; flex-wrap:wrap; }
  </style>`;

  html += `<div class="session-header">
    <div><div class="session-title">📋 ${dayLabel}</div></div>
    <span class="session-badge ${hasData ? 'registered' : 'new'}">${hasData ? '✅ Registrata' : '🆕 Nuova seduta'}</span>
  </div>`;

  // Presenze
  html += `<div>
    <h4 style="margin:0 0 12px 0;font-size:14px;color:#334155;display:flex;align-items:center;gap:8px;">
      👥 Presenze
      <span style="font-size:12px;color:#6c757d;font-weight:normal;">(${presentiCount}/${sorted.length} presenti)</span>
    </h4>
    <div class="presenze-summary">
      <span style="color:#22c55e;">✅ ${presentiCount} presenti</span>
      <span style="color:#ef4444;">❌ ${assentiCount} assenti</span>
    </div>
    <p style="margin-bottom:8px;font-size:12px;color:#6c757d;">Segna <span style="color:#E74C3C;font-weight:600;">ASSENTE</span>:</p>
    <div id="sessionPresenzeList">`;

  sorted.forEach(g => {
    const isAssente = assentiIds.includes(g.id);
    const presRecord = presenzeData.find(p => p.calciatore_id === g.id);
    const motivo = presRecord?.motivo_assenza || '';

    html += `<div class="convocation-item" style="flex-wrap:wrap;gap:8px;">
      <div style="display:flex;align-items:center;gap:8px;min-width:200px;">
        <input type="checkbox" ${isAssente ? 'checked' : ''} data-pid="${g.id}" class="session-pres-check" style="width:20px;height:20px;cursor:pointer;accent-color:#E74C3C;">
        <div class="player-avatar" style="width:28px;height:28px;font-size:11px;background:${getAvatarColor(g.nome)};">${g.nome[0]}${g.cognome[0]}</div>
        <span style="font-size:13px;">${g.nome} ${g.cognome}</span>
      </div>
      <select data-pid="${g.id}" class="session-motivo-select" style="padding:4px 8px;border-radius:6px;border:1px solid #e2e8f0;font-size:11px;${isAssente ? '' : 'opacity:0.4;'}" ${isAssente ? '' : 'disabled'}>
        ${MOTIVI_ASSENZA.map(m => `<option value="${m.value}" ${m.value === motivo ? 'selected' : ''}>${m.label}</option>`).join('')}
      </select>
    </div>`;
  });

  html += `</div></div>`;

  html += `<div class="session-actions">
    <button class="btn btn-primary" id="btnSaveSession">💾 Salva Presenze</button>
  </div>`;

  return html;
}

export function attachSessionListeners(date, trainingData, onSave) {
  // Toggle motivo assenza
  document.querySelectorAll('.session-pres-check').forEach(cb => {
    cb.addEventListener('change', () => {
      const pid = cb.dataset.pid;
      const select = document.querySelector(`.session-motivo-select[data-pid="${pid}"]`);
      if (select) {
        select.disabled = !cb.checked;
        select.style.opacity = cb.checked ? '1' : '0.4';
      }
    });
  });

  // Salva presenze
  document.getElementById('btnSaveSession')?.addEventListener('click', async () => {
    if (!date) return;
    const presenzeToSave = [];
    document.querySelectorAll('.session-pres-check').forEach(cb => {
      const isAssente = cb.checked;
      const pid = cb.dataset.pid;
      const select = document.querySelector(`.session-motivo-select[data-pid="${pid}"]`);
      const motivo = isAssente && select ? select.value : null;
      presenzeToSave.push({ calciatoreId: pid, data: date, presente: !isAssente, note: motivo });
    });

    showLoading();
    try {
      for (const p of presenzeToSave) {
        await apiFetch('/squadre/' + window.YFM.squadraId + '/allenamenti/presenze', {
          method: 'POST',
          body: JSON.stringify(p)
        });
      }
      hideLoading();
      alert('✅ Presenze salvate!');
      if (onSave) onSave();
    } catch (e) {
      hideLoading();
      alert('Errore: ' + e.message);
    }
  });
}
