import { apiFetch } from '../../services/api.js';
import { showLoading, hideLoading } from '../../utils/ui.js';

function showToast(msg, type = 'info') {
  if (window.showToast) { window.showToast(msg, type); return; }
  alert(msg);
}

let checklistData = [];
let templateItems = [];
let rosterMap = {};
let filterItem = 'all';

export default async function loadChecklist() {
  const c = document.getElementById('pageContent');
  const teamId = window.YFM.squadraId;
  const seasonId = window.YFM.currentSeasonId;
  const workspaceId = window.YFM.activeWorkspaceId;

  if (!teamId) { c.innerHTML = '<div class="error-box">Nessuna squadra selezionata.</div>'; return; }

  showLoading('Caricamento checklist...');
  try {
    const [chk, tmpl, roster] = await Promise.all([
      apiFetch('/checklist?team_id=' + teamId + '&season_id=' + seasonId),
      apiFetch('/checklist-template?workspace_id=' + workspaceId),
      apiFetch('/squadre/' + teamId + '/calciatori')
    ]);
    checklistData = chk || [];
    templateItems = tmpl || [];
    rosterMap = {};
    (roster || []).forEach(p => { rosterMap[p.id] = p; });
  } catch (e) { hideLoading(); c.innerHTML = '<div class="error-box">Errore caricamento</div>'; return; }
  hideLoading();
  render(c);
}

function render(c) {
  const isAdmin = window.YFM.canWrite('rosa') || window.YFM.isAdmin();
  const teamId = window.YFM.squadraId;
  const seasonId = window.YFM.currentSeasonId;
  const workspaceId = window.YFM.activeWorkspaceId;

  // Build player list with checklist status
  const players = Object.values(rosterMap).sort((a, b) => `${a.cognome} ${a.nome}`.localeCompare(`${b.cognome} ${b.nome}`));
  const playerChk = players.map(p => {
    const chk = checklistData.find(ch => ch.player_id === p.id);
    const items = chk?.items || templateItems.map(i => ({ ...i, done: false }));
    const pct = items.length ? Math.round(items.filter(i => i.done).length / items.length * 100) : 0;
    return { player: p, items, pct, id: chk?.id };
  });

  // Filter
  let filtered = playerChk;
  if (filterItem === 'incompleti') filtered = playerChk.filter(pc => pc.pct < 100);
  else if (filterItem === 'completi') filtered = playerChk.filter(pc => pc.pct === 100);
  else if (filterItem !== 'all') filtered = playerChk.filter(pc => !pc.items.find(i => i.key === filterItem)?.done);

  // Stats
  const totPlayers = playerChk.length;
  const complete = playerChk.filter(pc => pc.pct === 100).length;
  const avgPct = totPlayers ? Math.round(playerChk.reduce((s, pc) => s + pc.pct, 0) / totPlayers) : 0;

  // Filter buttons from template items
  const itemFilters = templateItems.map(i =>
    `<button class="btn btn-secondary btn-chk-filter${filterItem === i.key ? ' active' : ''}" data-filter="${i.key}" style="font-size:11px;padding:4px 10px;">${i.label}</button>`
  ).join('');

  c.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:12px;">
      <h1 class="page-title">📋 Checklist Stagione</h1>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        ${isAdmin && !checklistData.length ? `<button class="btn btn-primary" id="btnGenChecklist" style="font-size:12px;">🔄 Genera per tutti</button>` : ''}
        ${isAdmin ? `<button class="btn btn-secondary" id="btnConfigChecklist" style="font-size:12px;">⚙️ Template</button>` : ''}
      </div>
    </div>
    <style>.btn-chk-filter.active{background:#667eea!important;color:white!important;border-color:#667eea!important;}</style>
    <div style="display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap;">
      <button class="btn btn-secondary btn-chk-filter${filterItem === 'all' ? ' active' : ''}" data-filter="all" style="font-size:11px;padding:4px 10px;">Tutti</button>
      <button class="btn btn-secondary btn-chk-filter${filterItem === 'incompleti' ? ' active' : ''}" data-filter="incompleti" style="font-size:11px;padding:4px 10px;">Incompleti</button>
      <button class="btn btn-secondary btn-chk-filter${filterItem === 'completi' ? ' active' : ''}" data-filter="completi" style="font-size:11px;padding:4px 10px;">Completi</button>
      <span style="border-left:1px solid #ddd;margin:0 2px;"></span>
      ${itemFilters}
    </div>
    <div style="background:white;border-radius:12px;border:1px solid #eee;padding:14px;margin-bottom:16px;">
      <div style="display:flex;justify-content:space-between;align-items:center;font-size:13px;">
        <span><strong>${complete}/${totPlayers}</strong> completi</span>
        <span>Media: <strong>${avgPct}%</strong></span>
      </div>
      <div style="margin-top:8px;height:8px;background:#f0f0f0;border-radius:4px;overflow:hidden;">
        <div style="height:100%;width:${avgPct}%;background:${avgPct === 100 ? '#27AE60' : '#667eea'};border-radius:4px;transition:width 0.3s;"></div>
      </div>
    </div>
    <div id="checklistList"></div>
  `;

  // Render player rows
  const list = document.getElementById('checklistList');
  list.innerHTML = filtered.map(pc => {
    const p = pc.player;
    const nome = `${p.cognome || ''} ${p.nome || ''}`.trim();
    const dots = pc.items.map(i => `<span title="${i.label}" style="width:10px;height:10px;border-radius:50%;background:${i.done ? '#27AE60' : '#e0e0e0'};display:inline-block;flex-shrink:0;"></span>`).join('');
    return `<div class="chk-row" data-player="${p.id}" style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:white;border:1px solid #eee;border-radius:10px;margin-bottom:6px;cursor:pointer;" onmouseover="this.style.borderColor='#667eea'" onmouseout="this.style.borderColor='#eee'">
      <span style="font-size:13px;font-weight:500;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${nome}</span>
      <div style="display:flex;align-items:center;gap:3px;flex-shrink:0;">${dots}</div>
      <span style="font-size:11px;color:${pc.pct === 100 ? '#27AE60' : pc.pct > 50 ? '#d97706' : '#E74C3C'};font-weight:600;min-width:30px;text-align:right;flex-shrink:0;">${pc.pct}%</span>
    </div>`;
  }).join('') || '<p style="color:#888;font-size:13px;padding:12px;">Nessun giocatore trovato.</p>';

  // Events
  c.querySelectorAll('.btn-chk-filter').forEach(btn => {
    btn.addEventListener('click', () => { filterItem = btn.dataset.filter; render(c); });
  });

  list.querySelectorAll('.chk-row').forEach(row => {
    row.addEventListener('click', () => showPlayerChecklist(row.dataset.player, c));
  });

  document.getElementById('btnGenChecklist')?.addEventListener('click', async () => {
    showLoading('Generazione...');
    try {
      const res = await apiFetch('/checklist-generate', { method: 'POST', body: JSON.stringify({ team_id: teamId, season_id: seasonId, workspace_id: workspaceId }) });
      showToast(`Checklist generate per ${res.created} giocatori`, 'success');
      await loadChecklist();
    } catch (e) { showToast(e.message, 'error'); }
    hideLoading();
  });

  document.getElementById('btnConfigChecklist')?.addEventListener('click', () => showTemplateConfig(c));

  import('../../components/PageHelp.js').then(m => m.injectPageHelp('checklist')).catch(() => {});
}

function showPlayerChecklist(playerId, container) {
  const player = rosterMap[playerId];
  if (!player) return;
  const chk = checklistData.find(ch => ch.player_id === playerId);
  const items = chk?.items || templateItems.map(i => ({ ...i, done: false }));
  const nome = `${player.cognome || ''} ${player.nome || ''}`.trim();

  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:2000;display:flex;align-items:center;justify-content:center;';
  overlay.innerHTML = `<div style="background:white;border-radius:16px;padding:24px;max-width:400px;width:95%;box-shadow:0 20px 60px rgba(0,0,0,0.3);max-height:90vh;overflow-y:auto;">
    <div style="font-size:16px;font-weight:600;margin-bottom:16px;">📋 ${nome}</div>
    <div id="chkItems" style="display:grid;gap:8px;">
      ${items.map((item, i) => `<label style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:${item.done ? '#f0fdf4' : '#fafafa'};border:1px solid ${item.done ? '#bbf7d0' : '#eee'};border-radius:8px;cursor:pointer;">
        <input type="checkbox" class="chk-item" data-idx="${i}" ${item.done ? 'checked' : ''} style="width:18px;height:18px;accent-color:#27AE60;">
        <span style="font-size:13px;${item.done ? 'text-decoration:line-through;color:#888;' : ''}">${item.label}</span>
      </label>`).join('')}
    </div>
    <div style="display:flex;gap:10px;margin-top:16px;justify-content:flex-end;">
      <button class="btn btn-secondary" id="chkClose">Chiudi</button>
      <button class="btn btn-primary" id="chkSave">Salva</button>
    </div>
  </div>`;
  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  overlay.querySelector('#chkClose').addEventListener('click', close);

  overlay.querySelector('#chkSave').addEventListener('click', async () => {
    const updated = items.map((item, i) => ({
      ...item,
      done: overlay.querySelector(`.chk-item[data-idx="${i}"]`).checked
    }));
    try {
      await apiFetch('/checklist/' + playerId, { method: 'PUT', body: JSON.stringify({
        team_id: window.YFM.squadraId, season_id: window.YFM.currentSeasonId, items: updated
      })});
      showToast('Checklist aggiornata', 'success');
      close();
      await loadChecklist();
    } catch (e) { showToast(e.message, 'error'); }
  });
}

function showTemplateConfig(container) {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:2000;display:flex;align-items:center;justify-content:center;';
  const itemsHtml = templateItems.map((item, i) => `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;">
    <input class="tmpl-label" data-idx="${i}" value="${item.label}" style="flex:1;padding:6px 10px;border:1px solid #ddd;border-radius:6px;font-size:13px;">
    <button class="tmpl-rm" data-idx="${i}" style="background:none;border:none;cursor:pointer;color:#E74C3C;font-size:14px;">✕</button>
  </div>`).join('');

  overlay.innerHTML = `<div style="background:white;border-radius:16px;padding:24px;max-width:420px;width:95%;box-shadow:0 20px 60px rgba(0,0,0,0.3);max-height:90vh;overflow-y:auto;">
    <div style="font-size:16px;font-weight:600;margin-bottom:16px;">⚙️ Template Checklist</div>
    <div id="tmplItems">${itemsHtml}</div>
    <div style="margin-top:8px;display:flex;gap:6px;">
      <input id="tmplNew" placeholder="Nuovo item..." style="flex:1;padding:6px 10px;border:1px solid #ddd;border-radius:6px;font-size:12px;">
      <button id="tmplAdd" class="btn btn-secondary" style="font-size:12px;padding:5px 12px;">+ Aggiungi</button>
    </div>
    <div style="display:flex;gap:10px;margin-top:16px;justify-content:flex-end;">
      <button class="btn btn-secondary" id="tmplClose">Annulla</button>
      <button class="btn btn-primary" id="tmplSave">Salva</button>
    </div>
  </div>`;
  document.body.appendChild(overlay);

  let items = [...templateItems];

  function rebind() {
    overlay.querySelectorAll('.tmpl-rm').forEach(btn => {
      btn.addEventListener('click', () => {
        items.splice(+btn.dataset.idx, 1);
        rerender();
      });
    });
  }
  function rerender() {
    const cont = overlay.querySelector('#tmplItems');
    cont.innerHTML = items.map((item, i) => `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;">
      <input class="tmpl-label" data-idx="${i}" value="${item.label}" style="flex:1;padding:6px 10px;border:1px solid #ddd;border-radius:6px;font-size:13px;">
      <button class="tmpl-rm" data-idx="${i}" style="background:none;border:none;cursor:pointer;color:#E74C3C;font-size:14px;">✕</button>
    </div>`).join('');
    rebind();
  }
  rebind();

  overlay.querySelector('#tmplAdd').addEventListener('click', () => {
    const inp = overlay.querySelector('#tmplNew');
    const v = inp.value.trim();
    if (!v) return;
    const key = v.toLowerCase().replace(/[^a-z0-9]/g, '_');
    items.push({ key, label: v });
    inp.value = '';
    rerender();
  });

  const close = () => overlay.remove();
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  overlay.querySelector('#tmplClose').addEventListener('click', close);

  overlay.querySelector('#tmplSave').addEventListener('click', async () => {
    // Read labels from inputs
    overlay.querySelectorAll('.tmpl-label').forEach(inp => {
      const i = +inp.dataset.idx;
      if (items[i]) items[i].label = inp.value.trim();
    });
    items = items.filter(i => i.label);
    try {
      await apiFetch('/checklist-template', { method: 'PUT', body: JSON.stringify({
        workspace_id: window.YFM.activeWorkspaceId, items
      })});
      templateItems = items;
      showToast('Template salvato', 'success');
      close();
      render(document.getElementById('pageContent'));
    } catch (e) { showToast(e.message, 'error'); }
  });
}
