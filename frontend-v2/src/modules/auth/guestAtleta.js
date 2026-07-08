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
    const [notifications, matches, trainings, stats, motivi, absences] = await Promise.all([
      apiFetch(`/notifications/team/${teamId}?destinatario_tipo=atleta`).catch(() => []),
      apiFetch(`/squadre/${teamId}/partite`).catch(() => []),
      apiFetch(`/squadre/${teamId}/allenamenti-futuri`).catch(() => []),
      apiFetch(`/statistiche/giocatore/${playerId}?team_id=${teamId}`).catch(() => null),
      apiFetch('/absence/motivi').catch(() => ['Infortunio', 'Malattia', 'Impegni scolastici', 'Motivi familiari', 'Altro']),
      apiFetch(`/absence/player/${playerId}`).catch(() => [])
    ]);

    // Salva date assenze in sessionStorage
    const absDates = (absences || []).map(a => a.data_allenamento).filter(Boolean);
    sessionStorage.setItem('yfm_abs_dates', JSON.stringify(absDates));

    render(c, { playerName, playerId, teamId, notifications, matches, trainings, stats, motivi });
  } catch (e) {
    c.innerHTML = `<div class="error-box">Errore: ${e.message}</div>`;
  }
}

function render(c, { playerName, playerId, teamId, notifications, matches, trainings, stats, motivi }) {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const absDates = new Set(JSON.parse(sessionStorage.getItem('yfm_abs_dates') || '[]'));

  // Prossima partita
  const upcoming = (matches || [])
    .filter(m => m.data_ora && m.data_ora.slice(0, 10) >= todayStr && m.stato !== 'Archiviata')
    .sort((a, b) => a.data_ora.localeCompare(b.data_ora));
  const nextMatch = upcoming[0] || null;

  // Ultime partite (max 5)
  const past = (matches || [])
    .filter(m => m.stato === 'Archiviata' || (m.data_ora && m.data_ora.slice(0, 10) < todayStr))
    .sort((a, b) => b.data_ora.localeCompare(a.data_ora))
    .slice(0, 5);

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
    <h1>👋 Ciao ${playerName.split(' ')[0]}!</h1>
    <p>Il tuo spazio personale</p>
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
        <span style="font-size:20px;">${nextMatch.casa ? '🏠' : '✈️'}</span>
        <button class="ga-abs-inline" data-date="${nextMatch.data_ora.slice(0,10)}" data-tipo="partita" data-extra="${nextMatch.avversario || ''}" ${absDates.has(nextMatch.data_ora.slice(0,10)) ? 'disabled style="opacity:1;"' : ''} title="Segnala indisponibilità">${absDates.has(nextMatch.data_ora.slice(0,10)) ? '✅' : '❌'}</button>
      </div>
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

  // Ultime partite
  if (past.length > 0) {
    html += `<div class="ga-section">
      <div class="ga-section-title">📅 Ultime Partite</div>
      ${past.map(m => {
        const d = new Date(m.data_ora);
        const dateStr = d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
        const result = m.gol_casa != null && m.gol_trasferta != null ? `${m.gol_casa}-${m.gol_trasferta}` : '—';
        return `<div class="ga-match-card">
          <div>
            <div class="ga-match-team">${m.avversario || '?'}</div>
            <div class="ga-match-meta">${dateStr}${m.casa ? ' (Casa)' : ' (Trasf.)'}</div>
          </div>
          <span class="ga-match-result">${result}</span>
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

  html += `</div>`; // ga-container

  // Modal indisponibilità
  html += absenceModal(motivi);

  c.innerHTML = html;
  bindEvents(c, playerId, teamId, motivi);
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
