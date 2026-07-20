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
let completiExpanded = false;

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

    // Sync automatico item auto per tutti i giocatori con checklist esistente
    // Nota: gli items nel DB non hanno campo 'tipo' — sync su tutti
    const AUTO_KEYS = ['certificato', 'kit', 'quota'];
    const syncPromises = checklistData
      .filter(c => c.items?.some(i => AUTO_KEYS.includes(i.key)))
      .map(c => syncPlayerChecklist(c.player_id));
    await Promise.all(syncPromises);
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
  const isItemFilter = filterItem !== 'all' && filterItem !== 'incompleti' && filterItem !== 'completi';
  let filtered = playerChk;
  let completiGroup = [];
  if (filterItem === 'incompleti') filtered = playerChk.filter(pc => pc.pct < 100);
  else if (filterItem === 'completi') filtered = playerChk.filter(pc => pc.pct === 100);
  else if (isItemFilter) {
    filtered = playerChk.filter(pc => !pc.items.find(i => i.key === filterItem)?.done);
    completiGroup = playerChk.filter(pc => pc.items.find(i => i.key === filterItem)?.done);
  }

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
        ${isAdmin ? `<button class="btn btn-secondary" id="btnConfigChecklist" style="font-size:12px;">⚙️ Personalizza checklist</button>` : ''}
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

  function renderRow(pc) {
    const p = pc.player;
    const nome = `${p.cognome || ''} ${p.nome || ''}`.trim();
    const dots = pc.items.map(i => {
      const isActive = isItemFilter && i.key === filterItem;
      return `<span title="${i.label}" style="width:${isActive ? '12px' : '10px'};height:${isActive ? '12px' : '10px'};border-radius:50%;background:${i.done ? '#27AE60' : '#e0e0e0'};display:inline-block;flex-shrink:0;${isActive ? 'box-shadow:0 0 0 2px #667eea44;' : ''}"></span>`;
    }).join('');
    return `<div class="chk-row" data-player="${p.id}" style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:white;border:1px solid #eee;border-radius:10px;margin-bottom:6px;cursor:pointer;" onmouseover="this.style.borderColor='#667eea'" onmouseout="this.style.borderColor='#eee'">
      <span style="font-size:13px;font-weight:500;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${nome}</span>
      <div style="display:flex;align-items:center;gap:3px;flex-shrink:0;">${dots}</div>
      <span style="font-size:11px;color:${pc.pct === 100 ? '#27AE60' : pc.pct > 50 ? '#d97706' : '#E74C3C'};font-weight:600;min-width:30px;text-align:right;flex-shrink:0;">${pc.pct}%</span>
    </div>`;
  }

  let html = filtered.map(renderRow).join('') || '<p style="color:#888;font-size:13px;padding:12px;">Nessun giocatore trovato.</p>';

  if (isItemFilter && completiGroup.length > 0) {
    const itemLabel = templateItems.find(i => i.key === filterItem)?.label || filterItem;
    html += `<div style="margin-top:12px;">
      <button id="btnToggleCompleti" style="display:flex;align-items:center;gap:8px;width:100%;padding:10px 14px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;cursor:pointer;font-size:13px;color:#166534;font-weight:600;text-align:left;">
        <span style="flex:1;">✅ ${itemLabel} completato — ${completiGroup.length} giocator${completiGroup.length === 1 ? 'e' : 'i'}</span>
        <span id="completiChevron" style="font-size:11px;color:#888;transition:transform 0.2s;${completiExpanded ? 'transform:rotate(180deg)' : ''}">${completiExpanded ? '▲' : '▼'}</span>
      </button>
      <div id="completiList" style="display:${completiExpanded ? 'block' : 'none'};margin-top:4px;">
        ${completiGroup.map(pc => {
          const p = pc.player;
          const nome = `${p.cognome || ''} ${p.nome || ''}`.trim();
          const dots = pc.items.map(i => {
            const isActive = i.key === filterItem;
            return `<span title="${i.label}" style="width:${isActive ? '12px' : '10px'};height:${isActive ? '12px' : '10px'};border-radius:50%;background:${i.done ? '#27AE60' : '#e0e0e0'};display:inline-block;flex-shrink:0;${isActive ? 'box-shadow:0 0 0 2px #27AE6044;' : ''}"></span>`;
          }).join('');
          return `<div class="chk-row" data-player="${p.id}" style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:#f9fefb;border:1px solid #dcfce7;border-radius:10px;margin-bottom:6px;cursor:pointer;opacity:0.85;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.85'">
            <span style="font-size:13px;font-weight:500;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#555;">${nome}</span>
            <div style="display:flex;align-items:center;gap:3px;flex-shrink:0;">${dots}</div>
            <span style="font-size:11px;color:${pc.pct === 100 ? '#27AE60' : pc.pct > 50 ? '#d97706' : '#E74C3C'};font-weight:600;min-width:30px;text-align:right;flex-shrink:0;">${pc.pct}%</span>
          </div>`;
        }).join('')}
      </div>
    </div>`;
  }

  list.innerHTML = html;

  // Events
  c.querySelectorAll('.btn-chk-filter').forEach(btn => {
    btn.addEventListener('click', () => { filterItem = btn.dataset.filter; render(c); });
  });

  list.querySelectorAll('.chk-row').forEach(row => {
    row.addEventListener('click', () => showPlayerChecklist(row.dataset.player, c));
  });

  document.getElementById('btnToggleCompleti')?.addEventListener('click', () => {
    completiExpanded = !completiExpanded;
    const listEl = document.getElementById('completiList');
    const chevron = document.getElementById('completiChevron');
    if (listEl) listEl.style.display = completiExpanded ? 'block' : 'none';
    if (chevron) { chevron.textContent = completiExpanded ? '▲' : '▼'; chevron.style.transform = completiExpanded ? 'rotate(180deg)' : ''; }
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

function renderItemRow(item, idx) {
  const isAuto = item.tipo === 'auto';
  const bg = item.done ? '#f0fdf4' : '#fafafa';
  const border = item.done ? '#bbf7d0' : '#eee';
  if (isAuto) {
    const badge = item.done
      ? `<span style="font-size:11px;background:#dcfce7;color:#166534;border:1px solid #bbf7d0;border-radius:10px;padding:1px 7px;">✅ Completato</span>`
      : `<span style="font-size:11px;background:#fef2f2;color:#E74C3C;border:1px solid #fecaca;border-radius:10px;padding:1px 7px;">⏳ Non completato</span>`;
    const link = item.link
      ? `<a href="#" data-nav="${item.link}" style="font-size:11px;color:#667eea;text-decoration:none;white-space:nowrap;">→ Vai alla pagina</a>`
      : '';
    return `<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:${bg};border:1px solid ${border};border-radius:8px;">
      <span style="font-size:16px;">🔄</span>
      <span style="font-size:13px;flex:1;${item.done ? 'color:#888;' : ''}">${item.label}</span>
      ${badge}
      ${link}
    </div>`;
  }
  return `<label style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:${bg};border:1px solid ${border};border-radius:8px;cursor:pointer;">
    <input type="checkbox" class="chk-item" data-idx="${idx}" ${item.done ? 'checked' : ''} style="width:18px;height:18px;accent-color:#27AE60;">
    <span style="font-size:13px;${item.done ? 'text-decoration:line-through;color:#888;' : ''}">${item.label}</span>
  </label>`;
}

async function syncPlayerChecklist(playerId) {
  try {
    const updated = await apiFetch('/checklist/' + playerId + '/sync', {
      method: 'POST',
      body: JSON.stringify({ team_id: window.YFM.squadraId, season_id: window.YFM.currentSeasonId })
    });
    // Aggiorna checklistData in memoria
    const idx = checklistData.findIndex(c => c.player_id === playerId);
    if (idx >= 0) checklistData[idx] = updated;
    else checklistData.push(updated);
  } catch (e) { /* sync silenzioso */ }
}

function showPlayerChecklist(playerId, container) {
  const player = rosterMap[playerId];
  if (!player) return;
  const chk = checklistData.find(ch => ch.player_id === playerId);
  const items = chk?.items || templateItems.map(i => ({ ...i, done: false }));
  const nome = `${player.cognome || ''} ${player.nome || ''}`.trim();

  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:2000;display:flex;align-items:center;justify-content:center;';
  overlay.innerHTML = `<div style="background:white;border-radius:16px;padding:24px;max-width:420px;width:95%;box-shadow:0 20px 60px rgba(0,0,0,0.3);max-height:90vh;overflow-y:auto;">
    <div style="font-size:16px;font-weight:600;margin-bottom:4px;">📋 ${nome}</div>
    <div style="font-size:11px;color:#888;margin-bottom:16px;">🔄 = aggiornato automaticamente &nbsp;|&nbsp; ☑ = spunta manuale</div>
    <div id="chkItems" style="display:grid;gap:8px;">
      ${items.map((item, i) => renderItemRow(item, i)).join('')}
    </div>
    <div style="display:flex;gap:10px;margin-top:16px;justify-content:flex-end;">
      <button class="btn btn-secondary" id="chkClose">Chiudi</button>
      <button class="btn btn-primary" id="chkSave">Salva</button>
    </div>
  </div>`;
  document.body.appendChild(overlay);

  // Link navigazione pagine dedicate
  overlay.querySelectorAll('[data-nav]').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      overlay.remove();
      window.YFM.navigateTo(a.dataset.nav.replace('/', ''));
    });
  });

  const close = () => overlay.remove();
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  overlay.querySelector('#chkClose').addEventListener('click', close);

  overlay.querySelector('#chkSave').addEventListener('click', async () => {
    // Aggiorna solo item manual (auto non hanno checkbox)
    const updated = items.map((item, i) => {
      if (item.tipo === 'auto') return item;
      const cb = overlay.querySelector(`.chk-item[data-idx="${i}"]`);
      return { ...item, done: cb ? cb.checked : item.done };
    });
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
    <div style="font-size:16px;font-weight:600;margin-bottom:16px;">⚙️ Personalizza checklist</div>
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
