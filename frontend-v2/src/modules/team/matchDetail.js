import { apiFetch } from '../../services/api';
import { formatDate } from '../../utils/formatters';

export async function openMatchDetail(mid) {
  const content = '<div id="detailInner"><div class="loading"><div class="spinner"></div>Caricamento...</div></div>';
  const footer = '<button class="btn btn-secondary" id="modalCancel">Chiudi</button>';
  const modal = createModal('📋 Dettaglio Partita', content, footer, '800px');

  try {
    const d = await apiFetch('/partite/' + mid + '/dettaglio');
    const p = d.partita;
    const eventi = d.eventi || [];
    const golCasa = eventi.filter(e => e.tipo === 'GOAL').length;
    const ammonizioni = eventi.filter(e => e.tipo === 'YELLOW').length;
    const espulsioni = eventi.filter(e => e.tipo === 'RED').length;

    let html = `
      <div style="margin-bottom:16px;"><strong style="font-size:18px;">${window.YFM.getSocietaName()} vs ${p.avversario}</strong></div>
      <div style="color:var(--gray);margin-bottom:16px;">${formatDate(p.data_ora)} · ${p.competizione} · ${p.luogo}</div>
      <div style="display:flex;gap:20px;margin-bottom:20px;flex-wrap:wrap;">
        <div class="stat-card"><div class="stat-card-value">${golCasa}</div><div class="stat-card-label">Gol</div></div>
        <div class="stat-card"><div class="stat-card-value">${ammonizioni}</div><div class="stat-card-label">Ammonizioni</div></div>
        <div class="stat-card"><div class="stat-card-value">${espulsioni}</div><div class="stat-card-label">Espulsioni</div></div>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <thead><tr style="background:#F8F9FA;"><th style="padding:10px;">Minuto</th><th style="padding:10px;">Evento</th><th style="padding:10px;">Calciatore</th></tr></thead>
        <tbody>`;

    if (eventi.length === 0) {
      html += '<tr><td colspan="3" style="padding:20px;text-align:center;color:var(--gray);">Nessun evento registrato</td></tr>';
    } else {
      eventi.forEach(e => {
        const icona = e.tipo === 'GOAL' ? '⚽' : e.tipo === 'ASSIST' ? '🅰️' : e.tipo === 'YELLOW' ? '🟨' : '🟥';
        const label = e.tipo === 'GOAL' ? 'Gol' : e.tipo === 'ASSIST' ? 'Assist' : e.tipo === 'YELLOW' ? 'Ammonizione' : 'Espulsione';
        html += `<tr style="border-bottom:1px solid var(--border);">
          <td style="padding:10px;font-weight:bold;">${e.minuto}'</td>
          <td style="padding:10px;">${icona} ${label}</td>
          <td style="padding:10px;">${e.principale}${e.secondario ? ' <span style="color:var(--gray);font-size:12px;">(Assist: ' + e.secondario + ')</span>' : ''}</td>
        </tr>`;
      });
    }
    html += '</tbody></table>';

    // Note avversario se presenti
    if (p.note_avversario) {
      html += `<div style="margin-top:20px;"><h4 style="margin-bottom:8px;">📝 Note sull'avversario</h4><p style="color:var(--gray);white-space:pre-wrap;">${p.note_avversario}</p></div>`;
    }

    document.getElementById('detailInner').innerHTML = html;
  } catch (err) {
    document.getElementById('detailInner').innerHTML = '<div class="error-box">Errore nel caricamento del dettaglio.</div>';
  }
}

function createModal(title, content, footer, maxW = '600px') {
  const existing = document.getElementById('currentModal');
  if (existing) existing.remove();
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'currentModal';
  modal.innerHTML = `
    <div class="modal-content" style="max-width:${maxW};">
      <div class="modal-header"><h2>${title}</h2><button class="modal-close-btn" id="modalCloseX">×</button></div>
      <div class="modal-body">${content}</div>
      ${footer ? '<div class="modal-footer">' + footer + '</div>' : ''}
    </div>`;
  document.body.appendChild(modal);
  const close = () => { const m = document.getElementById('currentModal'); if (m) m.remove(); };
  document.getElementById('modalCloseX').addEventListener('click', close);
  modal.addEventListener('click', e => { if (e.target === modal) close(); });
  const cancelBtn = document.getElementById('modalCancel');
  if (cancelBtn) cancelBtn.addEventListener('click', close);
  return { modal, closeModal: close, close };
}
