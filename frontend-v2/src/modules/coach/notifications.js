import { apiFetch } from '../../services/api.js';
import { showLoading, hideLoading } from '../../utils/ui.js';

export default async function loadNotifications() {
  const c = document.getElementById('pageContent');
  const teamId = window.YFM.squadraId;

  c.innerHTML = '<div class="loading"><div class="spinner"></div>Caricamento...</div>';

  try {
    const notifications = await apiFetch('/absence/team/' + teamId);
    renderNotifications(c, notifications, teamId);
  } catch (e) {
    c.innerHTML = '<div class="error-box">Errore: ' + e.message + '</div>';
  }
}

function renderNotifications(c, notifications, teamId) {
  const unread = notifications.filter(n => !n.letto);
  const read = notifications.filter(n => n.letto);

  let html = `<style>
    .notif-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(280px, 1fr)); gap:10px; }
    .notif-card { background:white; border-radius:10px; padding:12px; box-shadow:0 2px 6px rgba(0,0,0,0.05); border-left:4px solid #F39C12; display:flex; align-items:center; gap:10px; transition:all 0.3s ease; cursor:default; }
    .notif-card.read { border-left-color:#ddd; background:#fafafa; }
    .notif-card.marking { opacity:0.4; transform:scale(0.97); border-left-color:#27AE60; }
    .notif-avatar { width:32px; height:32px; border-radius:50%; background:linear-gradient(135deg, #667eea, #764ba2); color:white; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:600; flex-shrink:0; }
    .notif-body { flex:1; min-width:0; }
    .notif-top { display:flex; align-items:center; gap:6px; }
    .notif-name { font-weight:700; font-size:13px; color:#1a1a2e; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .notif-meta { font-size:11px; color:#999; }
    .notif-motivo { display:inline-block; background:#FFF3E0; color:#E65100; padding:1px 6px; border-radius:8px; font-size:10px; font-weight:600; }
    .notif-msg { font-size:11px; color:#666; margin-top:3px; font-style:italic; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .notif-mark { width:28px; height:28px; border-radius:50%; border:2px solid #ccc; background:none; cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:14px; transition:all 0.2s; flex-shrink:0; color:#ccc; }
    .notif-mark:hover { border-color:#27AE60; color:#27AE60; background:#f0fff4; }
    .notif-done { width:28px; height:28px; border-radius:50%; background:#27AE60; color:white; display:flex; align-items:center; justify-content:center; font-size:14px; flex-shrink:0; }
    @media(max-width:600px) { .notif-grid { grid-template-columns:1fr; } }
  </style>`;

  html += `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
    <h1 class="page-title">🔔 Notifiche Assenze</h1>
    ${unread.length > 0 ? `<button class="btn btn-secondary btn-small" id="markAllRead">✓ Segna tutte lette</button>` : ''}
  </div>`;

  if (unread.length > 0) {
    html += `<p style="color:#666;font-size:12px;margin-bottom:10px;">${unread.length} nuove segnalazioni</p>`;
    html += '<div class="notif-grid">';
    unread.forEach(n => { html += renderNotifCard(n, false); });
    html += '</div>';
  } else {
    html += '<div style="text-align:center;padding:24px;color:#999;">✅ Nessuna nuova segnalazione</div>';
  }

  if (read.length > 0) {
    // Raggruppa per data_allenamento
    const byDate = {};
    read.forEach(n => {
      const d = n.data_allenamento || 'sconosciuta';
      if (!byDate[d]) byDate[d] = [];
      byDate[d].push(n);
    });
    const sortedDates = Object.keys(byDate).sort().reverse();
    html += `<details style="margin-top:20px;"><summary style="cursor:pointer;font-size:12px;color:#888;">📜 Già lette (${read.length})</summary>`;
    sortedDates.forEach(date => {
      const dateLabel = new Date(date).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
      html += `<div style="margin-top:12px;margin-bottom:4px;font-size:12px;font-weight:600;color:#555;">🏋️ ${dateLabel}</div><div class="notif-grid">`;
      byDate[date].forEach(n => { html += renderNotifCard(n, true); });
      html += '</div>';
    });
    html += '</details>';
  }

  c.innerHTML = html;

  // Mark all read
  document.getElementById('markAllRead')?.addEventListener('click', async () => {
    await apiFetch('/absence/read-all/' + teamId, { method: 'PUT' });
    updateNotifBadge(teamId);
    loadNotifications();
  });

  // Mark single read with animation
  c.querySelectorAll('[data-mark-read]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const card = btn.closest('.notif-card');
      if (card) card.classList.add('marking');
      await apiFetch('/absence/' + btn.dataset.markRead + '/read', { method: 'PUT' });
      updateNotifBadge(teamId);
      setTimeout(() => loadNotifications(), 400);
    });
  });
}

function renderNotifCard(n, isRead) {
  const player = n.player || {};
  const initials = ((player.nome?.[0] || '') + (player.cognome?.[0] || '')).toUpperCase();
  const name = `${player.cognome || ''} ${player.nome || ''}`.trim() || 'Giocatore';
  const date = new Date(n.data_allenamento).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' });
  const ago = timeAgo(n.created_at);

  const actionBtn = isRead
    ? `<div class="notif-done">✓</div>`
    : `<button class="notif-mark" data-mark-read="${n.id}" title="Segna come letta">○</button>`;

  return `<div class="notif-card ${isRead ? 'read' : ''}">
    <div class="notif-avatar">${initials}</div>
    <div class="notif-body">
      <div class="notif-top"><span class="notif-name">${name}</span><span class="notif-motivo">${n.motivo}</span></div>
      <div class="notif-meta">🏋️ ${date} • ${ago}</div>
      ${n.messaggio ? `<div class="notif-msg">"${n.messaggio}"</div>` : ''}
    </div>
    ${actionBtn}
  </div>`;
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}min fa`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h fa`;
  return `${Math.floor(hours / 24)}g fa`;
}

// Exported: aggiorna badge notifiche nella header
export async function updateNotifBadge(teamId) {
  try {
    const tid = teamId || window.YFM.squadraId;
    if (!tid) return;
    const { unread, weekTotal } = await apiFetch('/absence/unread/' + tid);
    const badge = document.getElementById('notifBadge');
    const count = document.getElementById('notifCount');
    if (badge && count) {
      badge.style.display = 'inline-block';
      if (weekTotal > 0) {
        count.style.display = 'flex';
        count.textContent = `${unread}/${weekTotal}`;
        count.style.background = unread > 0 ? '#E74C3C' : '#888';
      } else {
        count.style.display = 'none';
      }
    }
  } catch (e) { /* silent */ }
}
