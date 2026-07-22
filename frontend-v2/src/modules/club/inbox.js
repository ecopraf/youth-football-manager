import { apiFetch } from '../../services/api.js';
import { showToast } from '../../utils/ui.js';

let allItems = [];
let filtroTipo = 'all';
let filtroSquadra = '';
let filtroDays = 30;
let soloNonLetti = false;
let offset = 0;
const LIMIT = 20;
let contatori = {};
let squadreList = [];

export default async function loadInbox() {
  const c = document.getElementById('pageContent');
  const user = window.YFM.getUser();
  const workspaceId = window.YFM.activeWorkspaceId;

  squadreList = window.YFM.allSquadre || [];
  filtroSquadra = window.YFM.squadraId || '';

  c.innerHTML = `
    <style>
      .ib-tab-bar { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:12px; }
      .ib-tab { padding:5px 12px; border-radius:20px; border:1.5px solid #e5e7eb; background:white; cursor:pointer; font-size:12px; font-weight:600; color:#555; position:relative; }
      .ib-tab.active { background:#667eea; color:white; border-color:#667eea; }
      .ib-badge { display:inline-block; background:#E74C3C; color:white; border-radius:10px; font-size:10px; padding:1px 5px; margin-left:4px; font-weight:700; }
      .ib-tab.active .ib-badge { background:rgba(255,255,255,0.3); }
      .ib-item { background:white; border-radius:10px; box-shadow:0 1px 3px rgba(0,0,0,0.07); margin-bottom:8px; overflow:hidden; transition:box-shadow 0.15s; }
      .ib-item.non-letto { border-left:3px solid #667eea; background:#fafbff; }
      .ib-item-header { display:flex; align-items:flex-start; gap:10px; padding:12px 14px; cursor:pointer; }
      .ib-item-header:hover { background:#f9f9f9; }
      .ib-icon { font-size:20px; flex-shrink:0; margin-top:1px; }
      .ib-content { flex:1; min-width:0; }
      .ib-title { font-size:13px; font-weight:600; color:#222; margin-bottom:2px; }
      .ib-preview { font-size:12px; color:#888; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .ib-meta { display:flex; align-items:center; gap:6px; flex-shrink:0; flex-direction:column; align-items:flex-end; }
      .ib-time { font-size:11px; color:#bbb; white-space:nowrap; }
      .ib-new { font-size:10px; background:#667eea; color:white; border-radius:6px; padding:1px 6px; font-weight:700; }
      .ib-body { padding:0 14px 14px; border-top:1px solid #f0f0f0; }
      .ib-body-text { font-size:13px; color:#444; margin:10px 0; white-space:pre-wrap; }
      .ib-actions { display:flex; gap:6px; flex-wrap:wrap; margin-top:8px; }
      .ib-cat { font-size:11px; color:#aaa; }
      .ib-archivio { margin-top:20px; }
      .ib-archivio-header { display:flex; align-items:center; gap:8px; cursor:pointer; padding:8px 0; color:#aaa; font-size:13px; font-weight:600; }
      .ib-empty { text-align:center; color:#aaa; padding:40px; font-size:14px; }
      @media(max-width:500px) { .ib-meta { flex-direction:row; } }
    </style>
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:8px;">
      <h2 style="margin:0;font-size:18px;">📬 Inbox</h2>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
        <select id="ib-days-filter" style="font-size:12px;padding:5px 8px;border:1px solid #ddd;border-radius:8px;">
          <option value="7"${filtroDays===7?' selected':''}>Ultima settimana</option>
          <option value="30"${filtroDays===30?' selected':''}>Ultimo mese</option>
          <option value="9999"${filtroDays===9999?' selected':''}>Tutte</option>
        </select>
        <button id="ib-unread-toggle" style="font-size:12px;padding:5px 10px;border-radius:8px;border:1.5px solid ${soloNonLetti?'#667eea':'#ddd'};background:${soloNonLetti?'#667eea':'white'};color:${soloNonLetti?'white':'#555'};cursor:pointer;font-weight:600;">Solo non letti</button>
        <button id="ib-mark-all" class="btn btn-secondary" style="font-size:12px;padding:5px 12px;">✓ Segna tutti letti</button>
      </div>
    </div>
    <div class="ib-tab-bar" id="ibTabBar">
      <button class="ib-tab active" data-tipo="all">Tutti</button>
      <button class="ib-tab" data-tipo="convocazioni">📋 Convocazioni</button>
      <button class="ib-tab" data-tipo="bonifici">💰 Bonifici</button>
      <button class="ib-tab" data-tipo="avvisi">📢 Avvisi</button>
    </div>
    <div id="ibList"></div>
    <div id="ibLoadMore" style="text-align:center;margin-top:12px;display:none;">
      <button class="btn btn-secondary" id="btnLoadMore" style="font-size:13px;">Carica altri</button>
    </div>
  `;

  document.querySelectorAll('.ib-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.ib-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      filtroTipo = btn.dataset.tipo;
      offset = 0; allItems = [];
      loadData();
    });
  });

  document.getElementById('ib-mark-all')?.addEventListener('click', markAllRead);
  document.getElementById('ib-unread-toggle')?.addEventListener('click', () => {
    soloNonLetti = !soloNonLetti;
    offset = 0; allItems = [];
    loadData();
  });
  document.getElementById('ib-days-filter')?.addEventListener('change', e => {
    filtroDays = parseInt(e.target.value);
    offset = 0; allItems = [];
    loadData();
  });
  document.getElementById('btnLoadMore')?.addEventListener('click', () => loadData(true));

  await loadData();
}

async function loadData(append = false) {
  const c = document.getElementById('pageContent');
  const list = document.getElementById('ibList');
  if (!list) return;

  if (!append) list.innerHTML = '<div class="ib-empty">⏳ Caricamento...</div>';

  const params = new URLSearchParams({
    workspace_id: window.YFM.activeWorkspaceId,
    tipo: filtroTipo,
    limit: LIMIT,
    offset,
    letto: soloNonLetti ? 'false' : 'all',
    days: filtroDays
  });
  if (filtroSquadra) params.set('team_id', filtroSquadra);

  const res = await apiFetch(`/inbox?${params}`);
  if (document.getElementById('pageContent') !== c) return;
  if (!res.success) { list.innerHTML = '<div class="ib-empty">Errore caricamento</div>'; return; }

  contatori = res.contatori || {};
  updateTabBadges();

  if (append) allItems = [...allItems, ...res.data];
  else allItems = res.data;

  offset += res.data.length;

  renderList();

  const loadMoreEl = document.getElementById('ibLoadMore');
  if (loadMoreEl) loadMoreEl.style.display = offset < res.total ? 'block' : 'none';
}

function updateTabBadges() {
  const map = { all: contatori.non_letti, convocazioni: contatori.convocazioni_non_lette, bonifici: contatori.bonifici_non_letti, avvisi: contatori.avvisi_non_letti };
  document.querySelectorAll('.ib-tab').forEach(btn => {
    const tipo = btn.dataset.tipo;
    const count = map[tipo] || 0;
    const existing = btn.querySelector('.ib-badge');
    if (existing) existing.remove();
    if (count > 0) btn.insertAdjacentHTML('beforeend', `<span class="ib-badge">${count}</span>`);
  });
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'ora';
  if (min < 60) return `${min}min fa`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h fa`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}g fa`;
  return new Date(dateStr).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
}

const TIPO_ICON = { convocazione: '📣', bonifico: '💰', avviso: '📢', ricevuta_caricata: '📎' };
let expandedId = null;

function renderList() {
  const list = document.getElementById('ibList');
  if (!list) return;

  const recenti = allItems.filter(i => {
    const age = (Date.now() - new Date(i.created_at).getTime()) / (1000 * 60 * 60 * 24);
    return age <= 30 || !i.letto;
  });
  const archivio = allItems.filter(i => {
    const age = (Date.now() - new Date(i.created_at).getTime()) / (1000 * 60 * 60 * 24);
    return age > 30 && i.letto;
  });

  if (!recenti.length && !archivio.length) {
    list.innerHTML = '<div class="ib-empty">📭 Nessun messaggio</div>';
    return;
  }

  list.innerHTML = recenti.map(item => renderItem(item)).join('') +
    (archivio.length ? `
      <div class="ib-archivio">
        <div class="ib-archivio-header" id="archivioToggle">
          <span id="archivioArrow">▶</span>
          <span>Archivio (${archivio.length} messaggi letti oltre 30 giorni fa)</span>
        </div>
        <div id="archivioContent" style="display:none;">
          ${archivio.map(item => renderItem(item)).join('')}
        </div>
      </div>` : '');

  // Archivio toggle
  document.getElementById('archivioToggle')?.addEventListener('click', () => {
    const content = document.getElementById('archivioContent');
    const arrow = document.getElementById('archivioArrow');
    const open = content.style.display === 'block';
    content.style.display = open ? 'none' : 'block';
    arrow.textContent = open ? '▶' : '▼';
  });

  // Item expand
  list.querySelectorAll('.ib-item-header').forEach(h => {
    h.addEventListener('click', () => {
      const id = h.closest('.ib-item').dataset.id;
      expandedId = expandedId === id ? null : id;
      renderList();
      // Segna letto
      const item = allItems.find(i => i.id === id);
      if (item && !item.letto) markRead(item);
    });
  });

  // Azioni
  list.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const action = btn.dataset.action;
      const id = btn.dataset.id;
      const source = btn.dataset.source;
      const refId = btn.dataset.ref;
      if (action === 'vai-partita') { const mid = btn.dataset.ref; if (mid) window.YFM.openConvocation(mid, true); else window.YFM.navigateTo('calendar'); }
      else if (action === 'conferma-bonifico') confermaBonifico(refId, id, source, true);
      else if (action === 'rifiuta-bonifico') confermaBonifico(refId, id, source, false);
    });
  });
}

function renderItem(item) {
  const isOpen = expandedId === item.id;
  const icon = TIPO_ICON[item.tipo] || '📋';
  const nonLetto = !item.letto;

  const actions = getActions(item);

  const bodyHtml = isOpen ? `
    <div class="ib-body">
      ${item.categoria_nome ? `<div class="ib-cat">📂 ${item.categoria_nome}</div>` : ''}
      <div class="ib-body-text">${(item.messaggio || '').replace(/</g, '&lt;')}</div>
      ${item.data_allenamento ? `<div style="font-size:12px;color:#888;">📅 ${new Date(item.data_allenamento).toLocaleDateString('it-IT')}</div>` : ''}
      ${actions ? `<div class="ib-actions">${actions}</div>` : ''}
    </div>` : '';

  return `<div class="ib-item${nonLetto ? ' non-letto' : ''}" data-id="${item.id}">
    <div class="ib-item-header">
      <div class="ib-icon">${icon}</div>
      <div class="ib-content">
        <div class="ib-title">${item.titolo.replace(/</g, '&lt;')}</div>
        <div class="ib-preview">${(item.messaggio || '').replace(/</g, '&lt;')}</div>
      </div>
      <div class="ib-meta">
        <span class="ib-time">${timeAgo(item.created_at)}</span>
        ${nonLetto ? '<span class="ib-new">Nuovo</span>' : ''}
      </div>
    </div>
    ${bodyHtml}
  </div>`;
}

function getActions(item) {
  if (item.tipo === 'convocazione')
    return `<button class="btn btn-secondary" style="font-size:12px;" data-action="vai-partita" data-id="${item.id}" data-source="${item.source}" data-ref="${item.riferimento_id || ''}">👁 Vedi convocazione</button>`;
  if (item.tipo === 'bonifico' && item.riferimento_id) {
    if (item.stato_rata === 'pagata')
      return `<span style="font-size:12px;color:#065F46;font-weight:600;">✅ Confermato</span>`;
    if (!item.ricevuta_path)
      return `<span style="font-size:12px;color:#991B1B;font-weight:600;">❌ Rifiutato</span>`;
    return `<button class="btn" style="font-size:12px;background:#D1FAE5;color:#065F46;" data-action="conferma-bonifico" data-id="${item.id}" data-source="${item.source}" data-ref="${item.riferimento_id}">✅ Conferma</button>
            <button class="btn" style="font-size:12px;background:#FEE2E2;color:#991B1B;" data-action="rifiuta-bonifico" data-id="${item.id}" data-source="${item.source}" data-ref="${item.riferimento_id}">❌ Rifiuta</button>`;
  }
  return '';
}

async function markRead(item) {
  item.letto = true;
  await apiFetch('/inbox/mark-read', {
    method: 'PUT',
    body: JSON.stringify({ ids: [item.id], source: item.source })
  });
  contatori.non_letti = Math.max(0, (contatori.non_letti || 0) - 1);
  updateTabBadges();
}

async function markAllRead() {
  const btn = document.getElementById('ib-mark-all');
  if (btn) { btn.disabled = true; btn.innerHTML = '⏳'; }
  await apiFetch('/inbox/mark-all-read', {
    method: 'PUT',
    body: JSON.stringify({ workspace_id: window.YFM.activeWorkspaceId, team_id: filtroSquadra || undefined, tipo: filtroTipo })
  });
  offset = 0; allItems = [];
  await loadData();
  if (btn) { btn.disabled = false; btn.innerHTML = '✓ Segna tutti letti'; }
  showToast('Tutti i messaggi segnati come letti', 'success');
}

async function confermaBonifico(installmentId, itemId, source, conferma) {
  const endpoint = conferma ? `/fee-installments/${installmentId}/conferma-pagamento` : null;
  if (!conferma) { showToast('Funzione rifiuta disponibile dalla pagina Quote', 'info'); return; }
  const res = await apiFetch(endpoint, { method: 'PUT', body: JSON.stringify({}) });
  if (res.success) {
    showToast('✅ Bonifico confermato', 'success');
    const item = allItems.find(i => i.id === itemId);
    if (item) { item.letto = true; }
    await apiFetch('/inbox/mark-read', { method: 'PUT', body: JSON.stringify({ ids: [itemId], source }) });
    offset = 0; allItems = []; loadData();
  } else showToast('Errore conferma bonifico', 'error');
}
