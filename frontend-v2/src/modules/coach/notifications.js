import { apiFetch } from '../../services/api.js';

export default async function loadNotifications() {
  const c = document.getElementById('pageContent');
  const teamId = window.YFM.squadraId;
  c.innerHTML = '<div class="loading"><div class="spinner"></div>Caricamento...</div>';

  try {
    const [absences, comms] = await Promise.all([
      apiFetch('/absence/team/' + teamId).catch(() => []),
      apiFetch('/notifications').catch(() => [])
    ]);
    renderPage(c, absences || [], comms || [], teamId);
  } catch (e) {
    c.innerHTML = '<div class="error-box">Errore: ' + e.message + '</div>';
  }
}

function renderPage(c, absences, comms, teamId) {
  const unreadAbs = absences.filter(n => !n.letto).length;
  const unreadComms = comms.filter(n => !n.letto).length;

  let html = `<style>
    .notif-tabs { display:flex; gap:0; margin-bottom:16px; border-bottom:2px solid #eee; }
    .notif-tab { padding:10px 16px; cursor:pointer; font-size:13px; font-weight:600; color:#888; border-bottom:2px solid transparent; margin-bottom:-2px; transition:all 0.2s; }
    .notif-tab.active { color:#667eea; border-bottom-color:#667eea; }
    .notif-tab .tab-badge { background:#E74C3C; color:white; font-size:9px; padding:1px 5px; border-radius:8px; margin-left:6px; }
    .notif-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(280px, 1fr)); gap:10px; }
    .notif-card { background:white; border-radius:10px; padding:12px; box-shadow:0 2px 6px rgba(0,0,0,0.05); border-left:4px solid #667eea; display:flex; align-items:center; gap:10px; transition:all 0.3s ease; }
    .notif-card.read { border-left-color:#ddd; background:#fafafa; }
    .notif-card.absence { border-left-color:#F39C12; }
    .notif-card.marking { opacity:0.4; transform:scale(0.97); }
    .notif-avatar { width:32px; height:32px; border-radius:50%; background:linear-gradient(135deg, #667eea, #764ba2); color:white; display:flex; align-items:center; justify-content:center; font-size:13px; flex-shrink:0; }
    .notif-body { flex:1; min-width:0; }
    .notif-name { font-weight:700; font-size:13px; color:#1a1a2e; }
    .notif-meta { font-size:11px; color:#999; margin-top:2px; }
    .notif-msg { font-size:11px; color:#666; margin-top:3px; font-style:italic; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .notif-mark { width:28px; height:28px; border-radius:50%; border:2px solid #ccc; background:none; cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:14px; transition:all 0.2s; flex-shrink:0; color:#ccc; }
    .notif-mark:hover { border-color:#27AE60; color:#27AE60; background:#f0fff4; }
    .notif-done { width:28px; height:28px; border-radius:50%; background:#27AE60; color:white; display:flex; align-items:center; justify-content:center; font-size:14px; flex-shrink:0; }
    .notif-action { background:#667eea; color:white; border:none; padding:6px 12px; border-radius:8px; cursor:pointer; font-size:11px; font-weight:600; flex-shrink:0; }
    @media(max-width:600px) { .notif-grid { grid-template-columns:1fr; } }
  </style>`;

  html += `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
    <h1 class="page-title">🔔 Centro Notifiche</h1>
  </div>`;

  html += `<div class="notif-tabs">
    <div class="notif-tab active" data-tab="comms">📋 Comunicazioni${unreadComms > 0 ? `<span class="tab-badge">${unreadComms}</span>` : ''}</div>
    <div class="notif-tab" data-tab="absences">🏋️ Assenze${unreadAbs > 0 ? `<span class="tab-badge">${unreadAbs}</span>` : ''}</div>
  </div>`;

  html += `<div id="tabComms">${renderCommsTab(comms)}</div>`;
  html += `<div id="tabAbsences" style="display:none;">${renderAbsencesTab(absences)}</div>`;

  c.innerHTML = html;

  // Tab switching
  c.querySelectorAll('.notif-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      c.querySelectorAll('.notif-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const isComms = tab.dataset.tab === 'comms';
      document.getElementById('tabComms').style.display = isComms ? '' : 'none';
      document.getElementById('tabAbsences').style.display = isComms ? 'none' : '';
    });
  });

  // Mark comm read
  c.querySelectorAll('[data-mark-comm]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const card = btn.closest('.notif-card');
      if (card) card.classList.add('marking');
      await apiFetch('/notifications/' + btn.dataset.markComm + '/read', { method: 'PUT' });
      setTimeout(() => loadNotifications(), 300);
      updateNotifBadge(teamId);
    });
  });

  // Open convocazione
  c.querySelectorAll('[data-open-conv]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.openConv;
      const notifId = btn.dataset.notifId;
      if (notifId) await apiFetch('/notifications/' + notifId + '/read', { method: 'PUT' }).catch(() => {});
      window.YFM.openConvocation(id, true);
      updateNotifBadge(teamId);
    });
  });

  // Mark absence read
  c.querySelectorAll('[data-mark-abs]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const card = btn.closest('.notif-card');
      if (card) card.classList.add('marking');
      await apiFetch('/absence/' + btn.dataset.markAbs + '/read', { method: 'PUT' });
      setTimeout(() => loadNotifications(), 300);
      updateNotifBadge(teamId);
    });
  });

  // Mark all absences read
  document.getElementById('markAllAbsRead')?.addEventListener('click', async () => {
    await apiFetch('/absence/read-all/' + teamId, { method: 'PUT' });
    updateNotifBadge(teamId);
    loadNotifications();
  });
}

function renderCommsTab(comms) {
  if (comms.length === 0) return '<div style="text-align:center;padding:24px;color:#999;">✅ Nessuna comunicazione</div>';
  const unread = comms.filter(n => !n.letto);
  const read = comms.filter(n => n.letto);
  let html = '';
  if (unread.length > 0) {
    html += '<div class="notif-grid">';
    unread.forEach(n => { html += renderCommCard(n, false); });
    html += '</div>';
  }
  if (read.length > 0) {
    html += `<details style="margin-top:16px;"><summary style="cursor:pointer;font-size:12px;color:#888;">📜 Già lette (${read.length})</summary><div class="notif-grid" style="margin-top:8px;">`;
    read.forEach(n => { html += renderCommCard(n, true); });
    html += '</div></details>';
  }
  return html;
}

function renderCommCard(n, isRead) {
  const icon = n.tipo === 'convocazione' ? '📋' : '📢';
  const actionBtn = n.tipo === 'convocazione' && n.riferimento_id
    ? `<button class="notif-action" data-open-conv="${n.riferimento_id}" data-notif-id="${n.id}">📄 Apri</button>`
    : '';
  const markBtn = isRead
    ? '<div class="notif-done">✓</div>'
    : `<button class="notif-mark" data-mark-comm="${n.id}" title="Segna come letta">○</button>`;

  return `<div class="notif-card ${isRead ? 'read' : ''}">
    <div class="notif-avatar">${icon}</div>
    <div class="notif-body">
      <div class="notif-name">${n.titolo}</div>
      <div class="notif-meta">${timeAgo(n.created_at)}</div>
      ${n.messaggio ? `<div class="notif-msg">${n.messaggio}</div>` : ''}
    </div>
    ${actionBtn}${markBtn}
  </div>`;
}

function renderAbsencesTab(absences) {
  const unread = absences.filter(n => !n.letto);
  const read = absences.filter(n => n.letto);
  if (absences.length === 0) return '<div style="text-align:center;padding:24px;color:#999;">✅ Nessuna segnalazione assenza</div>';

  let html = '';
  if (unread.length > 0) {
    html += `<div style="display:flex;justify-content:flex-end;margin-bottom:8px;"><button class="btn btn-secondary btn-small" id="markAllAbsRead">✓ Segna tutte lette</button></div>`;
    html += '<div class="notif-grid">';
    unread.forEach(n => { html += renderAbsCard(n, false); });
    html += '</div>';
  }
  if (read.length > 0) {
    html += `<details style="margin-top:16px;"><summary style="cursor:pointer;font-size:12px;color:#888;">📜 Già lette (${read.length})</summary><div class="notif-grid" style="margin-top:8px;">`;
    read.forEach(n => { html += renderAbsCard(n, true); });
    html += '</div></details>';
  }
  return html;
}

function renderAbsCard(n, isRead) {
  const player = n.player || {};
  const initials = ((player.nome?.[0] || '') + (player.cognome?.[0] || '')).toUpperCase();
  const name = `${player.cognome || ''} ${player.nome || ''}`.trim() || 'Giocatore';
  const date = new Date(n.data_allenamento).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' });
  const markBtn = isRead
    ? '<div class="notif-done">✓</div>'
    : `<button class="notif-mark" data-mark-abs="${n.id}" title="Segna come letta">○</button>`;

  return `<div class="notif-card absence ${isRead ? 'read' : ''}">
    <div class="notif-avatar">${initials}</div>
    <div class="notif-body">
      <div class="notif-name">${name}</div>
      <div class="notif-meta">🏋️ ${date} • ${n.motivo || ''} • ${timeAgo(n.created_at)}</div>
      ${n.messaggio ? `<div class="notif-msg">"${n.messaggio}"</div>` : ''}
    </div>
    ${markBtn}
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

// Exported: aggiorna badge notifiche nella header (combina assenze + comunicazioni)
export async function updateNotifBadge(teamId) {
  try {
    const tid = teamId || window.YFM.squadraId;
    const [absRes, commRes] = await Promise.all([
      tid ? apiFetch('/absence/unread/' + tid).catch(() => ({ unread: 0, weekTotal: 0 })) : { unread: 0, weekTotal: 0 },
      apiFetch('/notifications/unread').catch(() => ({ unread: 0 }))
    ]);
    const totalUnread = (absRes.unread || 0) + (commRes.unread || 0);
    const badge = document.getElementById('notifBadge');
    const count = document.getElementById('notifCount');
    if (badge && count) {
      badge.style.display = 'inline-block';
      if (totalUnread > 0) {
        count.style.display = 'flex';
        count.textContent = totalUnread;
        count.style.background = '#E74C3C';
      } else if (absRes.weekTotal > 0) {
        count.style.display = 'flex';
        count.textContent = '0/' + absRes.weekTotal;
        count.style.background = '#888';
      } else {
        count.style.display = 'none';
      }
    }
  } catch (e) { /* silent */ }
}
