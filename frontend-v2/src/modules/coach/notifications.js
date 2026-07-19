import { apiFetch } from '../../services/api.js';

export default async function loadNotifications() {
  const c = document.getElementById('pageContent');
  const teamId = window.YFM.squadraId;
  c.innerHTML = '<div class="loading"><div class="spinner"></div>Caricamento...</div>';

  try {
    const days = window._notifDays || 7;
    const [absences, comms] = await Promise.all([
      apiFetch('/absence/team/' + teamId).catch(() => []),
      apiFetch('/notifications?days=' + days).catch(() => [])
    ]);
    renderPage(c, absences || [], comms || [], teamId);
  } catch (e) {
    c.innerHTML = '<div class="error-box">Errore: ' + e.message + '</div>';
  }
}

function renderPage(c, absences, comms, teamId) {
  const userId = window.YFM.getUser()?.id;
  const sent = comms.filter(n => n.created_by === userId && n.titolo !== '⚠️ Convocato indisponibile');
  const indisponibili = comms.filter(n => n.titolo === '⚠️ Convocato indisponibile');
  const received = comms.filter(n => n.created_by !== userId && n.titolo !== '⚠️ Convocato indisponibile');
  const unreadAbs = absences.filter(n => !n.letto).length + indisponibili.filter(n => !n.letto).length + received.filter(n => !n.letto).length;
  const unreadComms = sent.filter(n => !n.letto).length;

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

  html += `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:8px;">
    <h1 class="page-title">🔔 Centro Notifiche</h1>
    <div style="display:flex;gap:8px;align-items:center;">
      <select id="notifDaysFilter" style="padding:6px 10px;border:1px solid #ddd;border-radius:8px;font-size:12px;">
        <option value="7"${(window._notifDays||7)===7?' selected':''}>Ultima settimana</option>
        <option value="30"${window._notifDays===30?' selected':''}>Ultimo mese</option>
        <option value="9999"${window._notifDays===9999?' selected':''}>Tutte</option>
      </select>
      <button class="btn btn-primary" id="newCommBtn" style="font-size:13px;padding:8px 14px;">➕ Nuova</button>
    </div>
  </div>`;

  html += `<div class="notif-tabs" data-help="notifications.tabs">
    <div class="notif-tab active" data-tab="comms">📤 Inviate${unreadComms > 0 ? `<span class="tab-badge">${unreadComms}</span>` : ''}</div>
    <div class="notif-tab" data-tab="absences">📥 Ricevute${unreadAbs > 0 ? `<span class="tab-badge">${unreadAbs}</span>` : ''}</div>
  </div>`;

  html += `<div id="tabComms">${renderCommsTab(sent)}</div>`;
  // Ricevute: unisci assenze + indisponibilità convocati + notifiche ricevute da altri
  html += `<div id="tabAbsences" style="display:none;">${renderRicevuteTab(absences, [...indisponibili, ...received])}</div>`;

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

  // Receipts panel
  c.querySelectorAll('[data-receipts]').forEach(btn => {
    btn.addEventListener('click', () => showReceiptsPanel(btn.dataset.receipts));
  });

  // Delete notification
  c.querySelectorAll('[data-del-notif]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Eliminare questa comunicazione?')) return;
      await apiFetch('/notifications/' + btn.dataset.delNotif, { method: 'DELETE' }).catch(() => {});
      loadNotifications();
    });
  });

  // Edit notification
  c.querySelectorAll('[data-edit-notif]').forEach(btn => {
    btn.addEventListener('click', () => {
      showEditCommModal(btn.dataset.editNotif, btn.dataset.titolo, btn.dataset.msg, btn.dataset.priorita);
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

  // Reply to absence
  c.querySelectorAll('.notif-reply').forEach(btn => {
    btn.addEventListener('click', () => {
      showReplyModal(btn.dataset.replyPlayer, btn.dataset.replyName, teamId);
    });
  });

  // Mark all absences read
  document.getElementById('markAllAbsRead')?.addEventListener('click', async () => {
    await apiFetch('/absence/read-all/' + teamId, { method: 'PUT' });
    updateNotifBadge(teamId);
    loadNotifications();
  });

  // New communication modal
  document.getElementById('newCommBtn')?.addEventListener('click', () => showNewCommModal(teamId));

  // Filtro periodo
  document.getElementById('notifDaysFilter')?.addEventListener('change', (e) => {
    window._notifDays = parseInt(e.target.value);
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
  const pBadge = n.priorita === 'urgente' ? '🔴 ' : n.priorita === 'importante' ? '🟡 ' : '';
  const actionBtn = n.tipo === 'convocazione' && n.riferimento_id
    ? `<button class="notif-action" data-open-conv="${n.riferimento_id}" data-notif-id="${n.id}">📄 Apri</button>`
    : '';
  const markBtn = isRead
    ? '<div class="notif-done">✓</div>'
    : `<button class="notif-mark" data-mark-comm="${n.id}" title="Segna come letta">○</button>`;
  const isIndividual = !!n.destinatario_player_id;
  const hasAtleti = n.destinatario_tipo && n.destinatario_tipo.includes('atleta');
  const lettoDa = n.letto_da || {};
  const isReadByDest = Object.keys(lettoDa).length > 0;
  let receiptsBtn = '';
  if (isIndividual) {
    receiptsBtn = isReadByDest
      ? `<span style="font-size:10px;color:#27AE60;font-weight:600;" title="Letta dal destinatario">✅ Letta</span>`
      : `<span style="font-size:10px;color:#F39C12;font-weight:600;" title="Non ancora letta">⏳ Non letta</span>`;
  } else if (hasAtleti) {
    receiptsBtn = `<button class="notif-action" data-receipts="${n.id}" title="Conferme di lettura" style="font-size:11px;">👁</button>`;
  }
  const isAvviso = n.tipo === 'avviso';
  const editBtn = isAvviso ? `<button class="notif-action" data-edit-notif="${n.id}" data-titolo="${(n.titolo||'').replace(/"/g,'&quot;')}" data-msg="${(n.messaggio||'').replace(/"/g,'&quot;')}" data-priorita="${n.priorita||'info'}" title="Modifica" style="font-size:11px;background:#F39C12;">✏️</button>` : '';
  const delBtn = isAvviso ? `<button class="notif-action" data-del-notif="${n.id}" title="Elimina" style="font-size:11px;background:#E74C3C;">🗑️</button>` : '';

  return `<div class="notif-card ${isRead ? 'read' : ''}">
    <div class="notif-avatar">${icon}</div>
    <div class="notif-body">
      <div class="notif-name">${pBadge}${n.titolo}</div>
      <div class="notif-meta">${timeAgo(n.created_at)}</div>
      ${n.messaggio ? `<div class="notif-msg">${n.messaggio}</div>` : ''}
    </div>
    <div style="display:flex;gap:4px;flex-shrink:0;align-items:center;">${receiptsBtn}${editBtn}${delBtn}${actionBtn}${markBtn}</div>
  </div>`;
}

function renderRicevuteTab(absences, indisponibili) {
  // Unifica in lista cronologica
  const items = [];
  (absences || []).forEach(a => items.push({ type: 'absence', data: a, date: a.created_at }));
  (indisponibili || []).forEach(n => items.push({ type: 'indisponibile', data: n, date: n.created_at }));
  items.sort((a, b) => new Date(b.date) - new Date(a.date));

  if (items.length === 0) return '<div style="text-align:center;padding:24px;color:#999;">✅ Nessuna segnalazione ricevuta</div>';

  const unread = items.filter(i => !i.data.letto);
  const read = items.filter(i => i.data.letto);

  let html = '';
  if (unread.length > 0) {
    html += `<div style="display:flex;justify-content:flex-end;margin-bottom:8px;"><button class="btn btn-secondary btn-small" id="markAllAbsRead">✓ Segna tutte lette</button></div>`;
    html += '<div class="notif-grid">';
    unread.forEach(i => { html += renderRicevutaCard(i, false); });
    html += '</div>';
  }
  if (read.length > 0) {
    html += `<details style="margin-top:16px;"><summary style="cursor:pointer;font-size:12px;color:#888;">📜 Già lette (${read.length})</summary><div class="notif-grid" style="margin-top:8px;">`;
    read.forEach(i => { html += renderRicevutaCard(i, true); });
    html += '</div></details>';
  }
  return html;
}

function renderRicevutaCard(item, isRead) {
  if (item.type === 'absence') {
    const n = item.data;
    const player = n.player || {};
    const initials = ((player.nome?.[0] || '') + (player.cognome?.[0] || '')).toUpperCase();
    const name = `${player.cognome || ''} ${player.nome || ''}`.trim() || 'Giocatore';
    const date = new Date(n.data_allenamento).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' });
    const markBtn = isRead
      ? '<div class="notif-done">✓</div>'
      : `<button class="notif-mark" data-mark-abs="${n.id}" title="Segna come letta">○</button>`;
    const replyBtn = n.player_id ? `<button class="notif-action notif-reply" data-reply-player="${n.player_id}" data-reply-name="${name}" title="Rispondi" style="font-size:11px;">💬</button>` : '';

    return `<div class="notif-card absence ${isRead ? 'read' : ''}">
      <div class="notif-avatar">${initials}</div>
      <div class="notif-body">
        <div class="notif-name">🏋️ ${name}</div>
        <div class="notif-meta">${date} • ${n.motivo || ''} • ${timeAgo(n.created_at)}</div>
        ${n.messaggio ? `<div class="notif-msg">"${n.messaggio}"</div>` : ''}
      </div>
      <div style="display:flex;gap:4px;flex-shrink:0;align-items:center;">${replyBtn}${markBtn}</div>
    </div>`;
  }

  // Indisponibilità convocazione o altra notifica ricevuta
  const n = item.data;
  const markBtn = isRead
    ? '<div class="notif-done">✓</div>'
    : `<button class="notif-mark" data-mark-comm="${n.id}" title="Segna come letta">○</button>`;
  const isIndisponibile = n.titolo === '⚠️ Convocato indisponibile';
  const icon = isIndisponibile ? '❌' : '📩';
  const title = n.titolo || '⚠️ Convocato indisponibile';
  return `<div class="notif-card absence ${isRead ? 'read' : ''}">
    <div class="notif-avatar">${icon}</div>
    <div class="notif-body">
      <div class="notif-name">${title}</div>
      <div class="notif-meta">${timeAgo(n.created_at)}</div>
      ${n.messaggio ? `<div class="notif-msg">${n.messaggio}</div>` : ''}
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
    const guestSession = sessionStorage.getItem('yfm_guest');
    if (guestSession) {
      try { const g = JSON.parse(guestSession); if (g.tipo !== 'famiglia') return; } catch(e) {}
    }
    const tid = teamId || window.YFM.squadraId;
    const isUuid = tid && /^[0-9a-f]{8}-/.test(tid);
    const [absRes, commRes] = await Promise.all([
      isUuid ? apiFetch('/absence/unread/' + tid).catch(() => ({ unread: 0, weekTotal: 0 })) : { unread: 0, weekTotal: 0 },
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

function showNewCommModal(teamId) {
  const existing = document.getElementById('newCommModal');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'newCommModal';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:2000;display:flex;align-items:center;justify-content:center;';
  overlay.innerHTML = `<div style="background:white;border-radius:16px;padding:24px;max-width:400px;width:95%;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
    <div style="text-align:center;font-size:28px;margin-bottom:8px;">📢</div>
    <div style="text-align:center;font-weight:700;font-size:16px;margin-bottom:16px;">Nuova Comunicazione</div>
    <div style="margin-bottom:12px;">
      <label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">Titolo *</label>
      <input type="text" id="ncTitolo" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;box-sizing:border-box;" placeholder="es. Cambio orario allenamento" />
    </div>
    <div style="margin-bottom:12px;">
      <label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">Messaggio</label>
      <textarea id="ncMessaggio" rows="3" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;resize:none;box-sizing:border-box;" placeholder="Dettagli..."></textarea>
    </div>
    <div style="margin-bottom:12px;">
      <label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">Priorità</label>
      <select id="ncPriorita" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;">
        <option value="info">🔵 Normale</option>
        <option value="importante">🟡 Importante</option>
        <option value="urgente">🔴 Urgente</option>
      </select>
    </div>
    <div style="margin-bottom:16px;">
      <label style="font-size:13px;font-weight:600;display:block;margin-bottom:6px;">Destinatari *</label>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <label style="display:flex;align-items:center;gap:4px;font-size:13px;cursor:pointer;padding:6px 10px;border:1px solid #ddd;border-radius:8px;">
          <input type="checkbox" value="atleta" class="nc-dest" checked /> 🏃 Atleti
        </label>
        <label style="display:flex;align-items:center;gap:4px;font-size:13px;cursor:pointer;padding:6px 10px;border:1px solid #ddd;border-radius:8px;">
          <input type="checkbox" value="genitore" class="nc-dest" checked /> 👨👩👦 Genitori
        </label>
        <label style="display:flex;align-items:center;gap:4px;font-size:13px;cursor:pointer;padding:6px 10px;border:1px solid #ddd;border-radius:8px;">
          <input type="checkbox" value="staff" class="nc-dest" /> 👔 Staff
        </label>
      </div>
    </div>
    <div style="display:flex;gap:8px;">
      <button class="btn btn-secondary" id="ncCancel" style="flex:1;">Annulla</button>
      <button class="btn btn-primary" id="ncConfirm" style="flex:1;">📤 Invia</button>
    </div>
  </div>`;

  document.body.appendChild(overlay);

  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  document.getElementById('ncCancel').addEventListener('click', () => overlay.remove());
  document.getElementById('ncConfirm').addEventListener('click', async () => {
    const titolo = document.getElementById('ncTitolo').value.trim();
    const messaggio = document.getElementById('ncMessaggio').value.trim();
    const priorita = document.getElementById('ncPriorita').value;
    const destinatario_tipo = [...document.querySelectorAll('.nc-dest:checked')].map(cb => cb.value);

    if (!titolo) { document.getElementById('ncTitolo').style.borderColor = '#E74C3C'; return; }
    if (destinatario_tipo.length === 0) return;

    try {
      await apiFetch('/notifications', {
        method: 'POST',
        body: JSON.stringify({ team_id: teamId, titolo, messaggio, priorita, destinatario_tipo })
      });
      overlay.remove();
      loadNotifications();
    } catch (err) {
      overlay.querySelector('#ncConfirm').textContent = '❌ ' + err.message;
      setTimeout(() => { overlay.querySelector('#ncConfirm').textContent = '📤 Invia'; }, 3000);
    }
  });

  document.getElementById('ncTitolo').focus();
}

async function showReceiptsPanel(notifId) {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:2000;display:flex;align-items:center;justify-content:center;';
  overlay.innerHTML = `<div style="background:white;border-radius:16px;padding:24px;max-width:400px;width:92%;max-height:80vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
    <div style="text-align:center;"><div class="spinner"></div><p style="color:#666;font-size:13px;">Caricamento...</p></div>
  </div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

  try {
    const data = await apiFetch(`/notifications/${notifId}/receipts`);
    const card = overlay.querySelector('div > div');
    if (!data.receipts || data.receipts.length === 0) {
      card.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
        <strong style="font-size:15px;">👁 Conferme di lettura</strong>
        <span style="cursor:pointer;font-size:18px;color:#999;" id="rcClose">✕</span>
      </div>
      <p style="color:#999;font-size:13px;text-align:center;">Nessun link atleta attivo per questa categoria.</p>`;
    } else {
      card.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
        <strong style="font-size:15px;">👁 Conferme di lettura</strong>
        <span style="cursor:pointer;font-size:18px;color:#999;" id="rcClose">✕</span>
      </div>
      <div style="margin-bottom:12px;padding:8px 12px;background:#f0f4ff;border-radius:8px;font-size:13px;">
        <strong>${data.read}</strong>/${data.total} atleti hanno letto
        <div style="margin-top:6px;height:4px;background:#e0e0e0;border-radius:2px;overflow:hidden;">
          <div style="height:100%;background:#27AE60;width:${data.total > 0 ? Math.round(data.read/data.total*100) : 0}%;border-radius:2px;"></div>
        </div>
      </div>
      ${data.receipts.map(r => `<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f0f0f0;">
        <span style="font-size:13px;font-weight:${r.letto ? '400' : '600'};">${r.cognome} ${r.nome}</span>
        <span style="font-size:12px;color:${r.letto ? '#27AE60' : '#E74C3C'};">${r.letto ? '✅ ' + new Date(r.letto_at).toLocaleDateString('it-IT', {day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}) : '❌ Non letto'}</span>
      </div>`).join('')}`;
    }
    card.querySelector('#rcClose')?.addEventListener('click', () => overlay.remove());
  } catch (err) {
    overlay.querySelector('div > div').innerHTML = `<p style="color:#E74C3C;text-align:center;">Errore: ${err.message}</p>`;
  }
}

function showReplyModal(playerId, playerName, teamId) {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:2000;display:flex;align-items:center;justify-content:center;';
  overlay.innerHTML = `<div style="background:white;border-radius:16px;padding:24px;max-width:380px;width:95%;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
    <div style="text-align:center;font-size:28px;margin-bottom:8px;">💬</div>
    <div style="text-align:center;font-weight:700;font-size:15px;margin-bottom:4px;">Rispondi a ${playerName}</div>
    <div style="text-align:center;font-size:12px;color:#666;margin-bottom:16px;">Il messaggio sarà visibile all'atleta nella sua home</div>
    <textarea id="replyMsg" rows="3" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;resize:none;box-sizing:border-box;" placeholder="es. OK ricevuto, guarisci presto!"></textarea>
    <div style="display:flex;gap:8px;margin-top:12px;">
      <button class="btn btn-secondary" id="replyCancel" style="flex:1;">Annulla</button>
      <button class="btn btn-primary" id="replyConfirm" style="flex:1;">📤 Invia</button>
    </div>
  </div>`;

  document.body.appendChild(overlay);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  overlay.querySelector('#replyCancel').addEventListener('click', () => overlay.remove());
  overlay.querySelector('#replyMsg').focus();

  overlay.querySelector('#replyConfirm').addEventListener('click', async () => {
    const messaggio = overlay.querySelector('#replyMsg').value.trim();
    if (!messaggio) { overlay.querySelector('#replyMsg').style.borderColor = '#E74C3C'; return; }
    const btn = overlay.querySelector('#replyConfirm');
    btn.disabled = true;
    btn.textContent = '...';
    try {
      await apiFetch('/notifications/reply', {
        method: 'POST',
        body: JSON.stringify({ player_id: playerId, team_id: teamId, messaggio })
      });
      overlay.remove();
    } catch (err) {
      btn.textContent = '❌ ' + err.message;
      btn.disabled = false;
    }
  });
}

function showEditCommModal(id, titolo, messaggio, priorita) {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:2000;display:flex;align-items:center;justify-content:center;';
  overlay.innerHTML = `<div style="background:white;border-radius:16px;padding:24px;max-width:400px;width:92%;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
    <div style="font-weight:700;font-size:16px;margin-bottom:16px;">✏️ Modifica Comunicazione</div>
    <div style="margin-bottom:12px;">
      <label style="font-size:12px;font-weight:600;display:block;margin-bottom:4px;">Titolo</label>
      <input id="ecTitolo" type="text" value="${titolo.replace(/"/g, '&quot;')}" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;box-sizing:border-box;" />
    </div>
    <div style="margin-bottom:12px;">
      <label style="font-size:12px;font-weight:600;display:block;margin-bottom:4px;">Messaggio</label>
      <textarea id="ecMsg" rows="3" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;resize:none;box-sizing:border-box;">${messaggio}</textarea>
    </div>
    <div style="margin-bottom:16px;">
      <label style="font-size:12px;font-weight:600;display:block;margin-bottom:4px;">Priorità</label>
      <select id="ecPriorita" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;">
        <option value="info"${priorita==='info'?' selected':''}>ℹ️ Info</option>
        <option value="importante"${priorita==='importante'?' selected':''}>🟡 Importante</option>
        <option value="urgente"${priorita==='urgente'?' selected':''}>🔴 Urgente</option>
      </select>
    </div>
    <div style="display:flex;gap:8px;">
      <button class="btn btn-secondary" id="ecCancel" style="flex:1;">Annulla</button>
      <button class="btn btn-primary" id="ecConfirm" style="flex:1;">💾 Salva</button>
    </div>
  </div>`;

  document.body.appendChild(overlay);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  document.getElementById('ecCancel').addEventListener('click', () => overlay.remove());
  document.getElementById('ecTitolo').focus();

  document.getElementById('ecConfirm').addEventListener('click', async () => {
    const newTitolo = document.getElementById('ecTitolo').value.trim();
    const newMsg = document.getElementById('ecMsg').value.trim();
    const newPriorita = document.getElementById('ecPriorita').value;
    if (!newTitolo) return;

    const btn = document.getElementById('ecConfirm');
    btn.disabled = true;
    btn.textContent = '...';
    try {
      await apiFetch('/notifications/' + id, {
        method: 'PUT',
        body: JSON.stringify({ titolo: newTitolo, messaggio: newMsg, priorita: newPriorita })
      });
      overlay.remove();
      loadNotifications();
    } catch (err) {
      btn.textContent = '❌ ' + err.message;
      btn.disabled = false;
    }
  });
}
