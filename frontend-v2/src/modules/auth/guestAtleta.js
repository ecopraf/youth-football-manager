/**
 * guestAtleta.js — Home Atleta (guest tipo=atleta)
 * Sezioni: notifiche, prossima convocazione, comunica indisponibilità,
 * calendario allenamenti, partite, stats personali
 */
import { apiFetch } from '../../services/api.js';
import { showLoading, hideLoading } from '../../utils/ui.js';

export default async function loadGuestAtleta() {
  const c = document.getElementById('pageContent');
  const playerId = window.YFM.guestPlayerId;
  const teamId = window.YFM.guestTeamId || window.YFM.squadraId;
  const playerName = window.YFM.guestPlayerName || 'Atleta';

  if (!playerId || !teamId) {
    c.innerHTML = '<div class="error-box">Link non associato a un giocatore o squadra.</div>';
    return;
  }

  c.innerHTML = '<div class="loading"><div class="spinner"></div>Caricamento...</div>';

  try {
    const [notifications, futureMatches, trainings, stats, absences, fees] = await Promise.all([
      apiFetch(`/notifications/team/${teamId}?destinatario_tipo=atleta`).catch(() => []),
      apiFetch(`/squadre/${teamId}/partite-future`).catch(() => []),
      apiFetch(`/squadre/${teamId}/allenamenti-futuri`).catch(() => []),
      apiFetch(`/statistiche/giocatore/${playerId}?team_id=${teamId}`).catch(() => null),
      apiFetch(`/absence/player/${playerId}`).catch(() => []),
      apiFetch(`/fees?player_id=${playerId}&team_id=${teamId}`).catch(() => [])
    ]);
    const motivi = ['Infortunio', 'Malattia', 'Impegni scolastici', 'Motivi familiari', 'Altro'];

    // Prossima partita (già ordinata asc dal backend)
    const nextMatch = (futureMatches || [])
      .filter(m => m.stato !== 'Archiviata' && m.stato !== 'Terminata' && m.live_meta?.stato !== 'fine')[0] || null;
    let myConvocation = null;
    let convocationPublished = false;
    if (nextMatch) {
      try {
        const convs = await apiFetch(`/partite/${nextMatch.id}/convocazioni`);
        myConvocation = (convs || []).find(c => c.calciatoreId === playerId && c.presente);
        // Verifica se la convocazione è stata pubblicata (esiste notifica convocazione per questa partita)
        convocationPublished = (notifications || []).some(n => n.tipo === 'convocazione' && n.riferimento_id === nextMatch.id);
      } catch(e) { /* silent */ }
    }

    // Salva date assenze in sessionStorage
    const absDates = (absences || []).map(a => a.data_allenamento).filter(Boolean);
    sessionStorage.setItem('yfm_abs_dates', JSON.stringify(absDates));

    render(c, { playerName, playerId, teamId, notifications, trainings, stats, motivi, myConvocation, nextMatch, convocationPublished, fees });
  } catch (e) {
    c.innerHTML = `<div class="error-box">Errore: ${e.message}</div>`;
  }
}

function render(c, { playerName, playerId, teamId, notifications, trainings, stats, motivi, myConvocation, nextMatch, convocationPublished, fees }) {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const absDates = new Set(JSON.parse(sessionStorage.getItem('yfm_abs_dates') || '[]'));


  // Prossimi allenamenti (max 5)
  const nextTrainings = (trainings || []).slice(0, 5);

  // Notifiche non lette (per questo guest)
  const unread = (notifications || []).filter(n => !isReadByGuest(n));

  let html = `<style>
    .ga-container { max-width:600px; margin:0 auto; padding:16px; }
    .ga-header { text-align:center; margin-bottom:20px; }
    .ga-header h1 { font-size:20px; margin:0; color:#1a1a2e; }
    .ga-header p { color:#666; font-size:13px; margin:4px 0 0; }
    .ga-section { background:white; border-radius:12px; padding:16px; margin-bottom:12px; border:1px solid #eee; }
    .ga-section-title { font-size:14px; font-weight:700; margin-bottom:12px; color:#333; }
    .ga-notif { padding:8px 12px; border-radius:8px; background:#f8f9fa; margin-bottom:6px; font-size:13px; border-left:3px solid #667eea; }
    .ga-notif.unread { background:#eef2ff; border-left-color:#667eea; font-weight:600; }
    .ga-match-card { display:flex; align-items:center; justify-content:space-between; padding:10px 12px; border-radius:8px; background:#f8f9fa; margin-bottom:6px; }
    .ga-match-team { font-weight:600; font-size:13px; }
    .ga-match-meta { font-size:11px; color:#888; }
    .ga-match-result { font-weight:700; font-size:14px; }
    .ga-train-item { display:flex; align-items:center; gap:8px; padding:8px 12px; border-radius:8px; background:#f0fdf4; margin-bottom:6px; }
    .ga-train-date { font-weight:600; font-size:13px; flex:1; }
    .ga-train-time { font-size:12px; color:#666; }
    .ga-stat { display:inline-flex; align-items:center; gap:4px; padding:6px 12px; border-radius:8px; background:#f8f9fa; margin:4px; font-size:13px; }
    .ga-stat-val { font-weight:700; }
    .ga-abs-inline { background:none; border:none; font-size:16px; cursor:pointer; padding:4px 8px; border-radius:6px; opacity:0.6; transition:all 0.15s; }
    .ga-abs-inline:hover { opacity:1; background:#fee2e2; }
  </style>`;

  html += `<div class="ga-container">`;

  // Header
  html += `<div class="ga-header">
    <p>Benvenuto nell'area riservata. Qui trovi convocazioni, comunicazioni e situazione quote.</p>
  </div>`;

  // Notifiche — card sempre visibile
  html += `<div class="ga-section">
    <div class="ga-section-title">🔔 Comunicazioni${unread.length > 0 ? ` (${unread.length} nuove)` : ''}</div>
    ${unread.length === 0 ? '<p style="color:#999;font-size:13px;margin:0;">Nessuna comunicazione al momento</p>' :
      unread.slice(0, 5).map(n => `<div class="ga-notif unread" style="cursor:pointer;" data-notif-id="${n.id}">
        <div>${priorityBadge(n.priorita)}<strong>${n.titolo || 'Comunicazione'}</strong></div>
        <div class="ga-notif-body" style="display:none;margin-top:6px;font-weight:400;font-size:12px;color:#444;">${n.messaggio || ''}</div>
      </div>`).join('')}
    ${unread.length > 5 ? `<p style="font-size:12px;color:#667eea;margin:8px 0 0;">+ altre ${unread.length - 5}</p>` : ''}
  </div>`;

  // Prossima partita / convocazione
  if (nextMatch) {
    const d = new Date(nextMatch.data_ora);
    const dateStr = d.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' });
    const timeStr = d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    html += `<div class="ga-section" style="border-left:3px solid #667eea;">
      <div class="ga-section-title">⚽ Prossima Partita</div>
      <div class="ga-match-card" style="background:#eef2ff;">
        <div style="flex:1;">
          <div class="ga-match-team">${nextMatch.avversario || 'Da definire'}</div>
          <div class="ga-match-meta">${dateStr} • ${timeStr}${nextMatch.luogo ? ' • ' + nextMatch.luogo : ''}</div>
        </div>
        <span style="font-size:20px;">${nextMatch.luogo === 'Casa' ? '🏠' : '✈️'}</span>
        ${!convocationPublished ? `<button class="ga-abs-inline" data-date="${nextMatch.data_ora.slice(0,10)}" data-tipo="partita" data-extra="${nextMatch.avversario || ''}" ${absDates.has(nextMatch.data_ora.slice(0,10)) ? 'disabled style="opacity:1;"' : ''} title="Segnala indisponibilità">${absDates.has(nextMatch.data_ora.slice(0,10)) ? '✅' : '❌'}</button>` : ''}
      </div>
      ${convocationPublished ? renderConvocationStatus(myConvocation, nextMatch) : ''}
    </div>`;
  }

  // Prossimi allenamenti
  if (nextTrainings.length > 0) {
    html += `<div class="ga-section">
      <div class="ga-section-title">🏋️ Prossimi Allenamenti</div>
      ${nextTrainings.map(t => {
        const d = new Date(t.data_ora);
        const dateStr = d.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' });
        const timeStr = d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
        const cancelled = t.annullato;
        return `<div class="ga-train-item" style="${cancelled ? 'background:#fee2e2;text-decoration:line-through;opacity:0.7;' : ''}">
          <span class="ga-train-date">${cancelled ? '❌ ' : ''}${dateStr}</span>
          <span class="ga-train-time">${cancelled ? 'Annullato' : `⏰ ${timeStr}${t.luogo ? ' • ' + t.luogo : ''}`}</span>
          ${!cancelled ? `<button class="ga-abs-inline" data-date="${t.data_ora.slice(0,10)}" data-tipo="allenamento" ${absDates.has(t.data_ora.slice(0,10)) ? 'disabled style="opacity:1;"' : ''} title="Segnala indisponibilità">${absDates.has(t.data_ora.slice(0,10)) ? '✅' : '❌'}</button>` : ''}
        </div>`;
      }).join('')}
    </div>`;
  }


  // Stats personali
  if (stats) {
    const s = stats;
    html += `<div class="ga-section">
      <div class="ga-section-title">📊 Le Mie Statistiche</div>
      <div style="display:flex;flex-wrap:wrap;gap:4px;">
        ${statBadge('⚽', 'Gol', s.gol || s.goals || 0)}
        ${statBadge('🅰️', 'Assist', s.assist || s.assists || 0)}
        ${statBadge('📋', 'Presenze', s.presenze || s.appearances || 0)}
        ${statBadge('🟡', 'Amm.', s.ammonizioni || s.yellow_cards || 0)}
        ${statBadge('⏱️', 'Minuti', s.minuti || s.minutes || 0)}
      </div>
    </div>`;
  }

  // Situazione Quote (raggruppate per tipologia)
  if (fees && fees.length > 0) {
    const today = new Date().toISOString().slice(0, 10);
    const allInstallments = fees.flatMap(f => f.fee_installment || []);
    const totale = allInstallments.reduce((s, i) => s + (parseFloat(i.importo) || 0), 0);
    const pagato = allInstallments.filter(i => i.stato === 'pagata').reduce((s, i) => s + (parseFloat(i.importo) || 0), 0);
    const scaduteCount = allInstallments.filter(i => i.stato !== 'pagata' && i.scadenza && i.scadenza.slice(0, 10) < today).length;
    html += `<div class="ga-section">
      <div class="ga-section-title">💰 Situazione Quote</div>
      <div style="font-size:13px;color:#333;margin-bottom:8px;">Pagato: <strong>€${pagato.toFixed(0)}</strong> / €${totale.toFixed(0)}</div>
      ${scaduteCount > 0 ? `<div style="font-size:12px;color:#E74C3C;font-weight:600;margin-bottom:8px;">⚠️ ${scaduteCount} rat${scaduteCount === 1 ? 'a scaduta' : 'e scadute'}</div>` : ''}
      ${fees.map(fee => {
        const installments = (fee.fee_installment || []).sort((a, b) => (a.numero_rata || 0) - (b.numero_rata || 0));
        const feePagato = installments.filter(i => i.stato === 'pagata').reduce((s, i) => s + (parseFloat(i.importo) || 0), 0);
        const feeTotale = installments.reduce((s, i) => s + (parseFloat(i.importo) || 0), 0);
        return `<div style="margin-bottom:10px;">
          <div style="font-size:12px;font-weight:700;color:#555;margin-bottom:4px;">${fee.fee_config?.nome || 'Quota'} <span style="font-weight:400;color:#888;">€${feePagato.toFixed(0)}/${feeTotale.toFixed(0)}</span></div>
          <div style="display:flex;flex-direction:column;gap:3px;">
            ${installments.map(i => {
              const isPagata = i.stato === 'pagata';
              const scad = i.scadenza ? new Date(i.scadenza).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }) : '';
              const isScaduta = !isPagata && i.scadenza && i.scadenza.slice(0, 10) < today;
              const label = i.scadenza_label || `Rata ${i.numero_rata}`;
              return `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 10px;border-radius:8px;background:${isPagata ? '#d1fae5' : isScaduta ? '#fee2e2' : '#f8f9fa'};font-size:12px;">
                <span>${isPagata ? '✅' : isScaduta ? '⚠️' : '⬜'} ${label} — €${parseFloat(i.importo || 0).toFixed(0)}</span>
                <span style="color:#888;">${scad}</span>
              </div>`;
            }).join('')}
          </div>
        </div>`;
      }).join('')}
    </div>`;
  }

  html += `</div>`; // ga-container

  // Modal indisponibilità
  html += absenceModal(motivi);

  // Modal rifiuto convocazione
  html += `<div id="gaConvDeclineModal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:2000;align-items:center;justify-content:center;">
    <div style="background:white;border-radius:16px;padding:24px;max-width:340px;width:95%;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
      <div style="text-align:center;font-size:28px;margin-bottom:8px;">❌</div>
      <div style="text-align:center;font-weight:700;font-size:15px;margin-bottom:16px;">Motivo indisponibilità</div>
      <select id="gaConvDeclineMotivo" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;margin-bottom:16px;">
        ${motivi.map(m => `<option value="${m}">${m}</option>`).join('')}
      </select>
      <div style="display:flex;gap:8px;">
        <button class="btn btn-secondary" id="gaConvDeclineCancel" style="flex:1;">Annulla</button>
        <button class="btn btn-primary" id="gaConvDeclineConfirm" style="flex:1;background:#dc2626;border-color:#dc2626;">Invia</button>
      </div>
    </div>
  </div>`;

  c.innerHTML = html;
  bindEvents(c, playerId, teamId, motivi);
}

function renderConvocationStatus(conv, match) {
  const d = new Date(match.data_ora);
  const dateStr = d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const timeStr = d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  const ritrovo = new Date(d.getTime() - 75 * 60000);
  const ritrovoStr = ritrovo.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  const societa = window.YFM.getSocietaName ? window.YFM.getSocietaName() : '';
  const campoCasa = window.YFM.facility ? [window.YFM.facility.nome, window.YFM.facility.indirizzo].filter(Boolean).join(' - ') : 'Campo di casa';
  const campoInfo = match.luogo === 'Trasferta' ? (match.indirizzo_campo || 'Trasferta') : campoCasa;

  const detailsHtml = `<div style="font-size:12px;color:#333;line-height:1.8;margin:10px 0;">
    <div>⚽ <strong>${societa.toUpperCase()} - ${(match.avversario || 'TBD').toUpperCase()}</strong></div>
    <div>🏟️ Campo: <strong>${campoInfo}</strong></div>
    <div>🗓️ Alle ore <strong>${timeStr}</strong> del giorno <strong>${dateStr}</strong></div>
    <div>🚌 Ritrovo alle ore <strong>${ritrovoStr}</strong> al Campo di Giuoco</div>
  </div>`;

  const viewBtn = `<button class="btn btn-secondary" id="gaConvView" data-match-id="${match.id}" style="font-size:12px;padding:6px 12px;margin-top:8px;">📄 Vedi Convocazione</button>`;

  // Non convocato
  if (!conv) {
    return `<div style="margin-top:10px;padding:10px 12px;border-radius:8px;background:#f8f9fa;border:1px solid #e5e7eb;">
      ${detailsHtml}
      <div style="font-size:13px;color:#666;">📋 Non sei stato convocato per questa partita</div>
      ${viewBtn}
    </div>`;
  }

  // Convocato ma ha segnalato indisponibilità
  if (conv.risposta === 'indisponibile') {
    return `<div style="margin-top:8px;padding:10px 12px;border-radius:8px;background:#fee2e2;">
      ${detailsHtml}
      <div style="font-size:13px;">❌ Hai comunicato la tua indisponibilità${conv.risposta_motivo ? ' — ' + conv.risposta_motivo : ''}</div>
      ${viewBtn}
    </div>`;
  }

  // Convocato e disponibile
  return `<div style="margin-top:10px;padding:10px 12px;border-radius:8px;background:#d1fae5;border:1px solid #a7f3d0;">
    ${detailsHtml}
    <div style="font-size:13px;font-weight:600;margin-bottom:8px;">📋 Sei convocato!</div>
    <button class="btn btn-secondary" id="gaConvDecline" data-conv-id="${conv.id}" data-match-id="${match.id}" style="font-size:12px;padding:6px 12px;background:#fee2e2;border-color:#fca5a5;color:#dc2626;">❌ Ho un imprevisto, non posso esserci</button>
    ${viewBtn}
  </div>`;
}

function statBadge(icon, label, val) {
  return `<span class="ga-stat">${icon} <span class="ga-stat-val">${val}</span> ${label}</span>`;
}

function priorityBadge(priorita) {
  if (!priorita || priorita === 'info') return '';
  const map = { importante: '🟡', urgente: '🔴' };
  return `<span style="margin-right:4px;">${map[priorita] || ''}</span>`;
}

function absenceModal(motivi, nextTrainings, upcomingMatches) {
  return `<div id="gaAbsModal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:2000;align-items:center;justify-content:center;">
    <div style="background:white;border-radius:16px;padding:24px;max-width:360px;width:95%;box-shadow:0 20px 60px rgba(0,0,0,0.3);animation:scale-in 0.2s;">
      <div style="text-align:center;font-size:32px;margin-bottom:8px;">📋</div>
      <div style="text-align:center;font-weight:700;font-size:16px;margin-bottom:4px;">Segnala Indisponibilità</div>
      <div id="gaAbsDateLabel" style="text-align:center;font-size:13px;color:#667eea;font-weight:600;margin-bottom:16px;"></div>
      <input type="hidden" id="gaAbsDate" />
      <div style="margin-bottom:12px;">
        <label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">Motivo *</label>
        <select id="gaAbsMotivo" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;">
          ${motivi.map(m => `<option value="${m}">${m}</option>`).join('')}
        </select>
      </div>
      <div style="margin-bottom:16px;">
        <label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">Messaggio (opzionale)</label>
        <textarea id="gaAbsMsg" rows="2" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;resize:none;box-sizing:border-box;" placeholder="es. Torno giovedì..."></textarea>
      </div>
      <div style="display:flex;gap:8px;">
        <button class="btn btn-secondary" id="gaAbsCancel" style="flex:1;">Annulla</button>
        <button class="btn btn-primary" id="gaAbsConfirm" style="flex:1;">✅ Invia</button>
      </div>
    </div>
  </div>`;
}

function bindEvents(c, playerId, teamId, motivi) {
  const modal = document.getElementById('gaAbsModal');
  const dateInput = document.getElementById('gaAbsDate');
  const dateLabel = document.getElementById('gaAbsDateLabel');

  // Click-to-expand notifiche
  c.querySelectorAll('[data-notif-id]').forEach(el => {
    el.addEventListener('click', () => {
      const body = el.querySelector('.ga-notif-body');
      if (body) body.style.display = body.style.display === 'none' ? 'block' : 'none';
    });
  });

  // Aggiorna campanella nel header
  updateGuestBell(teamId);

  // Vedi Convocazione button
  document.getElementById('gaConvView')?.addEventListener('click', async (e) => {
    const matchId = e.target.dataset.matchId;
    showLoading('Caricamento...');
    try {
      const convs = await apiFetch(`/squadre/${teamId}/partite/${matchId}/convocati`);
      const players = await apiFetch(`/squadre/${teamId}/calciatori`);
      hideLoading();
      const list = (convs || []).map(c => {
        const p = (players || []).find(pl => pl.id === c.calciatoreId);
        return p ? `${p.cognome} ${p.nome}` : '?';
      }).sort();
      // Modal lista convocati
      const overlay = document.createElement('div');
      overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:2000;display:flex;align-items:center;justify-content:center;';
      overlay.innerHTML = `<div style="background:white;border-radius:16px;padding:24px;max-width:360px;width:95%;max-height:80vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
        <div style="text-align:center;font-weight:700;font-size:16px;margin-bottom:16px;">📋 Convocati (${list.length})</div>
        <div style="display:flex;flex-direction:column;gap:6px;">
          ${list.map((name, i) => `<div style="padding:6px 10px;border-radius:8px;background:#f8f9fa;font-size:13px;">${i + 1}. ${name}</div>`).join('')}
        </div>
        <button class="btn btn-secondary" style="width:100%;margin-top:16px;" id="gaConvViewClose">Chiudi</button>
      </div>`;
      document.body.appendChild(overlay);
      overlay.addEventListener('click', (ev) => { if (ev.target === overlay) overlay.remove(); });
      overlay.querySelector('#gaConvViewClose').addEventListener('click', () => overlay.remove());
    } catch(err) { hideLoading(); }
  });

  // Convocation decline button
  document.getElementById('gaConvDecline')?.addEventListener('click', async (e) => {
    const convId = e.target.dataset.convId;
    const matchId = e.target.dataset.matchId;
    // Apri modal motivo
    const modal = document.getElementById('gaConvDeclineModal');
    if (modal) {
      modal.dataset.convId = convId;
      modal.dataset.matchId = matchId;
      modal.style.display = 'flex';
    }
  });

  // Decline modal
  const declineModal = document.getElementById('gaConvDeclineModal');
  document.getElementById('gaConvDeclineCancel')?.addEventListener('click', () => { declineModal.style.display = 'none'; });
  declineModal?.addEventListener('click', (e) => { if (e.target === declineModal) declineModal.style.display = 'none'; });
  document.getElementById('gaConvDeclineConfirm')?.addEventListener('click', async () => {
    const convId = declineModal.dataset.convId;
    const matchId = declineModal.dataset.matchId;
    const motivo = document.getElementById('gaConvDeclineMotivo').value;
    showLoading('Invio...');
    try {
      await apiFetch(`/partite/${matchId}/convocazioni/${convId}/risposta`, {
        method: 'POST', body: JSON.stringify({ risposta: 'indisponibile', motivo })
      });
      hideLoading();
      declineModal.style.display = 'none';
      // Update UI
      const card = c.querySelector('div[style*="d1fae5"]');
      if (card) card.innerHTML = `<div style="padding:8px 12px;border-radius:8px;background:#fee2e2;font-size:13px;">❌ Hai comunicato la tua indisponibilità${motivo ? ' — ' + motivo : ''}</div>`;
    } catch(err) { hideLoading(); alert('Errore: ' + err.message); }
  });

  // Inline absence buttons (su allenamenti e partita)
  c.querySelectorAll('.ga-abs-inline').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const date = btn.dataset.date;
      const tipo = btn.dataset.tipo;
      const extra = btn.dataset.extra || '';
      const d = new Date(date + 'T12:00:00');
      const label = d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
      const tipoLabel = tipo === 'partita' ? `⚽ Partita vs ${extra}` : '🏋️ Allenamento';
      if (dateInput) dateInput.value = date;
      if (dateLabel) dateLabel.textContent = `${tipoLabel} — ${label}`;
      modal.style.display = 'flex';
    });
  });

  document.getElementById('gaAbsCancel')?.addEventListener('click', () => {
    modal.style.display = 'none';
  });

  modal?.addEventListener('click', (e) => {
    if (e.target === modal) modal.style.display = 'none';
  });

  document.getElementById('gaAbsConfirm')?.addEventListener('click', async () => {
    const data_allenamento = dateInput.value;
    const motivo = document.getElementById('gaAbsMotivo').value;
    const messaggio = document.getElementById('gaAbsMsg').value.trim();

    if (!data_allenamento || !motivo) return;

    showLoading('Invio...');
    try {
      await apiFetch('/absence', {
        method: 'POST',
        body: JSON.stringify({ player_id: playerId, team_id: teamId, data_allenamento, motivo, messaggio })
      });
      hideLoading();
      modal.style.display = 'none';
      // Reset form
      document.getElementById('gaAbsMotivo').selectedIndex = 0;
      document.getElementById('gaAbsMsg').value = '';
      // Persist in sessionStorage
      const stored = JSON.parse(sessionStorage.getItem('yfm_abs_dates') || '[]');
      if (!stored.includes(data_allenamento)) { stored.push(data_allenamento); sessionStorage.setItem('yfm_abs_dates', JSON.stringify(stored)); }
      // Feedback: disabilita il bottone cliccato
      const clickedBtn = c.querySelector(`.ga-abs-inline[data-date="${data_allenamento}"]`);
      if (clickedBtn) {
        clickedBtn.textContent = '✅';
        clickedBtn.disabled = true;
        clickedBtn.style.opacity = '1';
      }
    } catch (err) {
      hideLoading();
      alert('Errore: ' + err.message);
    }
  });
}

/** Campanella notifiche guest — aggiorna badge e gestisce panel + polling 60s */
let bellInterval = null;

export function isReadByGuest(notif) {
  const token = window.YFM.guestToken;
  const tipo = sessionStorage.getItem('guest_tipo');
  if (tipo === 'genitore') {
    const seen = JSON.parse(sessionStorage.getItem('yfm_notif_seen') || '[]');
    return seen.includes(notif.id);
  }
  // Atleta: controlla letto_da nel DB
  if (!token) return notif.letto;
  return !!(notif.letto_da && notif.letto_da[token]);
}

export async function updateGuestBell(teamId) {
  const tipo = window.YFM.guestPlayerId ? 'atleta' : 'genitore';
  const tid = teamId || window.YFM.guestTeamId || window.YFM.squadraId;
  if (!tid) return;

  const wrap = document.getElementById('guestBellWrap');
  const badge = document.getElementById('guestBellBadge');
  if (!wrap || !badge) return;

  async function fetchAndUpdate() {
    try {
      const notifs = await apiFetch(`/notifications/team/${tid}?destinatario_tipo=${tipo}`).catch(() => []);
      const unread = (notifs || []).filter(n => !isReadByGuest(n));
      wrap.style.display = 'block';
      if (unread.length > 0) {
        badge.textContent = unread.length > 9 ? '9+' : unread.length;
        badge.style.display = 'flex';
      } else {
        badge.style.display = 'none';
      }
      wrap._notifs = notifs || [];
    } catch(e) { /* silent */ }
  }

  await fetchAndUpdate();

  // Polling 60s
  if (!bellInterval) {
    bellInterval = setInterval(fetchAndUpdate, 60000);
  }

  // Bind click (once)
  if (!wrap.dataset.bound) {
    wrap.dataset.bound = '1';
    wrap.addEventListener('click', () => showBellPanel(wrap._notifs || []));
  }
}

function showBellPanel(notifs) {
  // Remove existing
  document.getElementById('guestBellPanel')?.remove();

  const panel = document.createElement('div');
  panel.id = 'guestBellPanel';
  panel.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:2000;display:flex;align-items:flex-start;justify-content:center;padding-top:60px;';
  const items = notifs.slice(0, 10);
  panel.innerHTML = `<div style="background:white;border-radius:12px;padding:16px;max-width:380px;width:92%;max-height:70vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
      <strong style="font-size:15px;">🔔 Comunicazioni</strong>
      <span id="guestBellClose" style="cursor:pointer;font-size:18px;color:#999;">✕</span>
    </div>
    ${items.length === 0 ? '<p style="color:#999;font-size:13px;text-align:center;padding:20px 0;">Nessuna comunicazione</p>' :
      items.map(n => {
        const read = isReadByGuest(n);
        return `<div style="padding:10px 12px;border-radius:8px;background:${read ? '#f8f9fa' : '#eef2ff'};margin-bottom:6px;border-left:3px solid ${read ? '#ddd' : '#667eea'};">
          <div style="font-size:13px;font-weight:${read ? '400' : '600'};">${priorityBadge(n.priorita)}${n.titolo || 'Comunicazione'}</div>
          ${n.messaggio ? `<div style="font-size:12px;color:#555;margin-top:4px;">${n.messaggio}</div>` : ''}
          <div style="font-size:10px;color:#aaa;margin-top:4px;">${n.created_at ? new Date(n.created_at).toLocaleDateString('it-IT', {day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}) : ''}</div>
        </div>`;
      }).join('')}
  </div>`;

  document.body.appendChild(panel);
  panel.addEventListener('click', (e) => { if (e.target === panel) panel.remove(); });
  panel.querySelector('#guestBellClose').addEventListener('click', () => panel.remove());

  // Segna come lette
  const unreadIds = items.filter(n => !isReadByGuest(n)).map(n => n.id);
  if (unreadIds.length > 0) {
    const tipo = sessionStorage.getItem('guest_tipo');
    if (tipo === 'genitore') {
      // Genitore: solo sessionStorage
      const seen = JSON.parse(sessionStorage.getItem('yfm_notif_seen') || '[]');
      unreadIds.forEach(id => { if (!seen.includes(id)) seen.push(id); });
      sessionStorage.setItem('yfm_notif_seen', JSON.stringify(seen));
    } else {
      // Atleta: salva nel DB via endpoint
      const guestToken = window.YFM.guestToken;
      if (guestToken) {
        apiFetch('/notifications/guest-read', {
          method: 'PUT',
          body: JSON.stringify({ ids: unreadIds, guest_token: guestToken })
        }).catch(() => {});
      }
    }
    const badge = document.getElementById('guestBellBadge');
    if (badge) badge.style.display = 'none';
  }
}
