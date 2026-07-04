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
    .notif-card { background:white; border-radius:12px; padding:16px; margin-bottom:10px; box-shadow:0 2px 8px rgba(0,0,0,0.06); border-left:4px solid #F39C12; display:flex; align-items:flex-start; gap:12px; }
    .notif-card.read { border-left-color:#ddd; opacity:0.7; }
    .notif-avatar { width:36px; height:36px; border-radius:50%; background:linear-gradient(135deg, #667eea, #764ba2); color:white; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:600; flex-shrink:0; }
    .notif-body { flex:1; }
    .notif-name { font-weight:700; font-size:14px; color:#1a1a2e; }
    .notif-meta { font-size:12px; color:#888; margin-top:2px; }
    .notif-motivo { display:inline-block; background:#FFF3E0; color:#E65100; padding:2px 8px; border-radius:10px; font-size:11px; font-weight:600; margin-top:4px; }
    .notif-msg { font-size:13px; color:#555; margin-top:6px; font-style:italic; background:#f9f9f9; padding:6px 10px; border-radius:6px; }
    .notif-actions { flex-shrink:0; }
  </style>`;

  html += `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
    <h1 class="page-title">🔔 Notifiche Assenze</h1>
    ${unread.length > 0 ? `<button class="btn btn-secondary btn-small" id="markAllRead">✓ Segna tutte lette</button>` : ''}
  </div>`;

  if (unread.length > 0) {
    html += `<p style="color:#666;font-size:13px;margin-bottom:16px;">${unread.length} nuove segnalazioni</p>`;
    unread.forEach(n => { html += renderNotifCard(n, false); });
  } else {
    html += '<div style="text-align:center;padding:24px;color:#999;">✅ Nessuna nuova segnalazione</div>';
  }

  if (read.length > 0) {
    html += `<details style="margin-top:24px;"><summary style="cursor:pointer;font-size:13px;color:#888;">📜 Già lette (${read.length})</summary><div style="margin-top:12px;">`;
    read.forEach(n => { html += renderNotifCard(n, true); });
    html += '</div></details>';
  }

  c.innerHTML = html;

  // Mark all read
  document.getElementById('markAllRead')?.addEventListener('click', async () => {
    await apiFetch('/absence/read-all/' + teamId, { method: 'PUT' });
    updateNotifBadge(teamId);
    loadNotifications();
  });

  // Mark single read
  c.querySelectorAll('[data-mark-read]').forEach(btn => {
    btn.addEventListener('click', async () => {
      await apiFetch('/absence/' + btn.dataset.markRead + '/read', { method: 'PUT' });
      updateNotifBadge(teamId);
      loadNotifications();
    });
  });
}

function renderNotifCard(n, isRead) {
  const player = n.player || {};
  const initials = ((player.nome?.[0] || '') + (player.cognome?.[0] || '')).toUpperCase();
  const name = `${player.cognome || ''} ${player.nome || ''}`.trim() || 'Giocatore';
  const date = new Date(n.data_allenamento).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' });
  const ago = timeAgo(n.created_at);

  return `<div class="notif-card ${isRead ? 'read' : ''}">
    <div class="notif-avatar">${initials}</div>
    <div class="notif-body">
      <div class="notif-name">${name}</div>
      <div class="notif-meta">🏋️ ${date} • ${ago}</div>
      <span class="notif-motivo">${n.motivo}</span>
      ${n.messaggio ? `<div class="notif-msg">"${n.messaggio}"</div>` : ''}
    </div>
    <div class="notif-actions">
      ${!isRead ? `<button class="btn btn-small" data-mark-read="${n.id}" title="Segna come letta">✓</button>` : ''}
    </div>
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
