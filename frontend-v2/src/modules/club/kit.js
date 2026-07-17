import { apiFetch } from '../../services/api';
import { showLoading, hideLoading } from '../../utils/ui';
import { injectPageHelp } from '../../components/PageHelp.js';

function showToast(msg, type = 'info') {
  if (window.showToast) { window.showToast(msg, type); return; }
  alert(msg);
}

const TAGLIE_SC = ['116','122','128','134','140','146','152','158','XS Adulto'];
const TAGLIE_SG = ['XS','S','M','L','XL','XXL'];

let templates = [];
let stock = [];
let bundles = [];
let assignments = [];
let staffAssignments = [];
let rosterMap = {};
let staffMap = {};
let currentFilter = 'all';
let isAdmin = false;
let expandedTmpls = new Set();

// Modal conferma riutilizzabile
function confirmModal(msg, onConfirm, { danger = true, confirmLabel } = {}) {
  const label = confirmLabel || (danger ? 'Elimina' : 'Conferma');
  const ov = document.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:3000;display:flex;align-items:center;justify-content:center;';
  ov.classList.add('modal-overlay');
  ov.innerHTML = `<div style="background:white;border-radius:16px;padding:24px;max-width:320px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.3);text-align:center;">
    <div style="font-size:32px;margin-bottom:12px;">${danger ? '🗑️' : '⚠️'}</div>
    <div style="font-size:14px;color:#333;margin-bottom:20px;line-height:1.5;">${msg}</div>
    <div style="display:flex;gap:10px;justify-content:center;">
      <button id="cmNo" style="padding:8px 20px;border:1px solid #ddd;border-radius:8px;background:white;cursor:pointer;font-size:13px;">Annulla</button>
      <button id="cmSi" style="padding:8px 20px;border:none;border-radius:8px;background:${danger ? '#E74C3C' : '#667eea'};color:white;cursor:pointer;font-size:13px;font-weight:600;">${label}</button>
    </div>
  </div>`;
  document.body.appendChild(ov);
  ov.querySelector('#cmNo').addEventListener('click', () => ov.remove());
  ov.querySelector('#cmSi').addEventListener('click', () => { ov.remove(); onConfirm(); });
  ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
}

export default async function loadKit() {
  const c = document.getElementById('pageContent');
  const workspaceId = window.YFM.activeWorkspaceId;
  const teamId = window.YFM.squadraId;
  const seasonId = window.YFM.currentSeasonId;

  if (!teamId) { c.innerHTML = '<div class="error-box">Nessuna squadra selezionata.</div>'; return; }

  showLoading('Caricamento kit...');
  try {
    const [tmpls, bdls, assignsData, roster, staffList] = await Promise.all([
      apiFetch('/kit-templates?workspace_id=' + workspaceId),
      apiFetch('/kit-bundles?workspace_id=' + workspaceId),
      apiFetch('/kit-assignments?team_id=' + teamId + '&season_id=' + seasonId),
      apiFetch('/squadre/' + teamId + '/calciatori'),
      apiFetch('/squadre/' + teamId + '/staff-completo')
    ]);
    const TIPO_ORDER = { portiere: 0, squadra: 1, staff: 2 };
    templates = (tmpls || []).sort((a, b) => (TIPO_ORDER[a.tipo] ?? 1) - (TIPO_ORDER[b.tipo] ?? 1));
    stock = [];
    bundles = bdls || [];
    // Nuova struttura: {players: [...], staff: [...]}
    assignments = assignsData?.players || assignsData || [];
    staffAssignments = assignsData?.staff || [];
    rosterMap = {};
    (roster || []).forEach(p => { rosterMap[p.id] = p; });
    staffMap = {};
    (staffList || []).forEach(s => { staffMap[s.id] = { ...s, ruolo: s.ruolo_squadra || s.ruolo || '' }; });
  } catch (e) { hideLoading(); c.innerHTML = '<div class="error-box">Errore caricamento</div>'; return; }
  hideLoading();
  render(c);
}

// Stato tab attive per ogni sezione
let activeAssegnazioniTab = null; // template_id
let activeMagazzinoTab = null;    // template_id
let activeOrdiniTab = 'da_ordinare'; // 'da_ordinare' | 'in_attesa'
let assegnazioniFilter = 'all';

function render(c) {
  isAdmin = window.YFM.canWrite('kit') || window.YFM.getUser()?.ruolo === 'admin' || window.YFM.getUser()?.is_superadmin;
  const attivi = templates.filter(t => t.attivo !== false);
  if (!activeAssegnazioniTab || !attivi.find(t => t.id === activeAssegnazioniTab))
    activeAssegnazioniTab = attivi[0]?.id || null;
  if (!activeMagazzinoTab || !attivi.find(t => t.id === activeMagazzinoTab))
    activeMagazzinoTab = attivi[0]?.id || null;

  c.innerHTML = `
    <style>
      .kit-tab-bar { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:12px; }
      .kit-tab { font-size:12px; padding:5px 12px; border:1px solid #ddd; border-radius:20px; background:white; cursor:pointer; color:#555; white-space:nowrap; }
      .kit-tab.active { background:#667eea; color:white; border-color:#667eea; }
      .kit-filter-bar { display:flex; gap:6px; margin-bottom:10px; flex-wrap:wrap; }
      .kit-filter { font-size:11px; padding:3px 10px; border:1px solid #ddd; border-radius:12px; background:white; cursor:pointer; color:#666; }
      .kit-filter.active { background:#667eea; color:white; border-color:#667eea; }
      .kit-ordini-tab { font-size:12px; padding:5px 14px; border:none; border-bottom:2px solid transparent; background:none; cursor:pointer; color:#888; }
      .kit-ordini-tab.active { color:#667eea; border-bottom-color:#667eea; font-weight:600; }
      .kit-page-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
      @media(max-width:768px) { .kit-page-grid { grid-template-columns:1fr; } }
      @media(max-width:500px) { .kit-row { padding:8px 10px!important; } }
    </style>
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px;">
      <h1 class="page-title">👕 Kit Sportivo</h1>
      ${isAdmin ? '<button class="btn btn-primary" id="btnConfigKit" style="font-size:13px;" data-help="kit.config">⚙️ Configura kit</button>' : ''}
    </div>
    ${!attivi.length ? '<p style="color:#888;font-size:13px;">Nessun template kit configurato. Clicca "⚙️ Configura kit" per iniziare.</p>' : `
    <!-- SEZIONE ASSEGNAZIONI -->
    <div style="background:white;border-radius:12px;border:1px solid #eee;padding:16px;margin-bottom:16px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
        <span style="font-weight:700;font-size:14px;color:#374151;">📋 Assegnazioni</span>
        <div class="kit-filter-bar" id="kitAssegnazioniFilters" data-help="kit.filtri">
          <button class="kit-filter${assegnazioniFilter==='all'?' active':''}" data-f="all">Tutti</button>
          <button class="kit-filter${assegnazioniFilter==='incompleto'?' active':''}" data-f="incompleto">Incompleti</button>
          <button class="kit-filter${assegnazioniFilter==='completo'?' active':''}" data-f="completo">Completi</button>
        </div>
      </div>
      <div class="kit-tab-bar" id="kitAssegnazioniTabs">
        ${attivi.map(t => `<button class="kit-tab${t.id===activeAssegnazioniTab?' active':''}" data-tmpl="${t.id}">${getKitIcon(t)} ${t.nome}</button>`).join('')}
      </div>
      <div id="kitAssegnazioniBody"></div>
    </div>
    <!-- GRID MAGAZZINO + ORDINI -->
    <div class="kit-page-grid">
      <!-- MAGAZZINO -->
      <div style="background:white;border-radius:12px;border:1px solid #eee;padding:16px;">
        <div style="font-weight:700;font-size:14px;color:#374151;margin-bottom:12px;">📦 Magazzino</div>
        <div class="kit-tab-bar" id="kitMagazzinoTabs">
          ${attivi.map(t => `<button class="kit-tab${t.id===activeMagazzinoTab?' active':''}" data-tmpl="${t.id}">${getKitIcon(t)} ${t.nome}</button>`).join('')}
        </div>
        <div id="kitMagazzinoBody"></div>
      </div>
      <!-- ORDINI -->
      <div style="background:white;border-radius:12px;border:1px solid #eee;padding:16px;">
        <div style="font-weight:700;font-size:14px;color:#374151;margin-bottom:8px;">🛒 Ordini</div>
        <div style="display:flex;border-bottom:1px solid #eee;margin-bottom:12px;">
          <button class="kit-ordini-tab${activeOrdiniTab==='da_ordinare'?' active':''}" data-tab="da_ordinare">Da ordinare</button>
          <button class="kit-ordini-tab${activeOrdiniTab==='in_attesa'?' active':''}" data-tab="in_attesa">In attesa fornitore</button>
        </div>
        <div id="kitOrdiniBody"></div>
      </div>
    </div>
    `}
  `;

  if (!attivi.length) {
    c.querySelector('#btnConfigKit')?.addEventListener('click', showConfigModal);
    return;
  }

  renderAssegnazioniTab();
  renderMagazzinoTab();
  renderOrdiniTab();

  // Handler tab Assegnazioni
  c.querySelector('#kitAssegnazioniTabs').addEventListener('click', e => {
    const btn = e.target.closest('.kit-tab');
    if (!btn) return;
    activeAssegnazioniTab = btn.dataset.tmpl;
    c.querySelectorAll('#kitAssegnazioniTabs .kit-tab').forEach(b => b.classList.toggle('active', b.dataset.tmpl === activeAssegnazioniTab));
    renderAssegnazioniTab();
  });

  // Handler filtri Assegnazioni
  c.querySelector('#kitAssegnazioniFilters').addEventListener('click', e => {
    const btn = e.target.closest('.kit-filter');
    if (!btn) return;
    assegnazioniFilter = btn.dataset.f;
    c.querySelectorAll('#kitAssegnazioniFilters .kit-filter').forEach(b => b.classList.toggle('active', b.dataset.f === assegnazioniFilter));
    renderAssegnazioniTab();
  });

  // Handler tab Magazzino
  c.querySelector('#kitMagazzinoTabs').addEventListener('click', e => {
    const btn = e.target.closest('.kit-tab');
    if (!btn) return;
    activeMagazzinoTab = btn.dataset.tmpl;
    c.querySelectorAll('#kitMagazzinoTabs .kit-tab').forEach(b => b.classList.toggle('active', b.dataset.tmpl === activeMagazzinoTab));
    renderMagazzinoTab();
  });

  // Handler tab Ordini
  c.querySelectorAll('.kit-ordini-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      activeOrdiniTab = btn.dataset.tab;
      c.querySelectorAll('.kit-ordini-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === activeOrdiniTab));
      renderOrdiniTab();
    });
  });

  c.querySelector('#btnConfigKit')?.addEventListener('click', showConfigModal);
  injectPageHelp('kit');
}

function renderAssegnazioniTab() {
  const body = document.getElementById('kitAssegnazioniBody');
  if (!body) return;
  body.setAttribute('data-help', 'kit.lista');
  const tmpl = templates.find(t => t.id === activeAssegnazioniTab);
  if (!tmpl) { body.innerHTML = '<p style="color:#888;font-size:13px;">Nessun template.</p>'; return; }

  const rosterPlayers = Object.values(rosterMap).sort((a, b) =>
    `${a.cognome} ${a.nome}`.localeCompare(`${b.cognome} ${b.nome}`));
  const tmplAssigns = assignments.filter(a => a.kit_stock?.template_id === tmpl.id);
  const articoli = tmpl.articoli || [];
  const totArticoli = articoli.reduce((s, a) => s + (a.qty || 1), 0);

  const playerStatus = rosterPlayers.map(p => {
    const playerAssigns = tmplAssigns.filter(a => a.player_id === p.id);
    const assigned = articoli.reduce((s, a) => s + Math.min(playerAssigns.filter(x => x.kit_stock?.articolo === a.nome).length, a.qty || 1), 0);
    return { player: p, assigned, total: totArticoli, complete: assigned >= totArticoli };
  });

  const portiereTemplateIds = new Set(templates.filter(t => t.tipo === 'portiere' || t.is_portiere).map(t => t.id));
  let baseList = playerStatus;
  if (tmpl.tipo === 'portiere' || tmpl.is_portiere) {
    baseList = playerStatus.filter(ps => ps.player.ruolo_principale === 'Portiere');
  } else if (tmpl.tipo !== 'staff') {
    const portieriCoperti = new Set(
      assignments.filter(a => portiereTemplateIds.has(a.kit_stock?.template_id)).map(a => a.player_id)
    );
    baseList = playerStatus.filter(ps =>
      ps.player.ruolo_principale !== 'Portiere' || !portieriCoperti.has(ps.player.id)
    );
  }

  let filtered = baseList;
  if (assegnazioniFilter === 'incompleto') filtered = baseList.filter(ps => !ps.complete);
  else if (assegnazioniFilter === 'completo') filtered = baseList.filter(ps => ps.complete);

  const nComplete = baseList.filter(ps => ps.complete).length;
  const nNone = baseList.filter(ps => ps.assigned === 0).length;
  const nIncomplete = baseList.filter(ps => !ps.complete && ps.assigned > 0).length;
  const tmplBundles = bundles.filter(b => b.template_id === tmpl.id);
  const totPezziKit = articoli.reduce((s, a) => s + (a.qty || 1), 0);
  const kitDisponibili = tmplBundles.filter(b => b.pezzi_disponibili > 0 && b.pezzi_disponibili === (b.tot_pezzi || totPezziKit)).length;

  // Summary header
  const summaryHtml = `<div style="display:flex;gap:12px;margin-bottom:10px;font-size:11px;color:#666;flex-wrap:wrap;padding:8px 12px;background:#f8fafc;border-radius:8px;">
    <span>✅ ${nComplete}/${baseList.length} completi</span>
    ${nNone > 0 ? `<span style="color:#E74C3C;">🔴 ${nNone} senza kit</span>` : ''}
    ${nIncomplete > 0 ? `<span style="color:#d97706;">🟡 ${nIncomplete} incompleti</span>` : ''}
    <span>📦 ${kitDisponibili} kit disponibili</span>
    ${isAdmin ? `<button class="btn-auto-assign" data-tmpl="${tmpl.id}" data-help="kit.auto" style="margin-left:auto;font-size:11px;padding:2px 8px;background:#eef2ff;border:1px solid #c7d2fe;border-radius:5px;cursor:pointer;color:#4338ca;">🎯 Auto-assegna</button>` : ''}
  </div>`;

  let rowsHtml = '';

  if (tmpl.tipo === 'staff') {
    const tmplStaffAssigns = staffAssignments.filter(a => a.kit_stock?.template_id === tmpl.id);
    const teamStaffList = Object.values(staffMap).sort((a, b) => `${a.cognome} ${a.nome}`.localeCompare(`${b.cognome} ${b.nome}`));
    if (!teamStaffList.length) {
      rowsHtml = '<p style="color:#888;font-size:13px;padding:8px 0;">Nessuno staff assegnato a questa squadra.</p>';
    } else {
      rowsHtml = teamStaffList.map(s => {
        const nome = `${s.cognome || ''} ${s.nome || ''}`.trim();
        const sAssigns = tmplStaffAssigns.filter(a => a.staff_id === s.id);
        const nAss = sAssigns.length;
        const tot = (tmpl.articoli || []).reduce((sum, a) => sum + (a.qty || 1), 0);
        const complete = nAss >= tot && tot > 0;
        const dot = complete ? '🟢' : nAss > 0 ? '🟡' : '🔴';
        const tagliaLabel = sAssigns[0]?.kit_stock?.taglia || s.taglia || '';
        const altroTeam = sAssigns.length > 0 && sAssigns[0].team_id !== window.YFM.squadraId;
        return `<div class="kit-row-staff" data-staff="${s.id}" data-tmpl="${tmpl.id}" style="display:flex;align-items:center;justify-content:space-between;padding:9px 12px;border-bottom:1px solid #f5f5f5;cursor:pointer;" onmouseover="this.style.background='#fafafa'" onmouseout="this.style.background=''">
          <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:0;">
            <span>${dot}</span>
            <span style="font-size:13px;font-weight:500;">${nome}</span>
            <span style="font-size:11px;color:#888;">${s.ruolo || ''}</span>
            ${tagliaLabel ? `<span style="font-size:10px;color:#4338ca;background:#eef2ff;padding:1px 5px;border-radius:4px;">${tagliaLabel}</span>` : ''}
            ${altroTeam ? `<span style="font-size:10px;color:#059669;background:#d1fae5;padding:1px 5px;border-radius:4px;">✓ altra cat.</span>` : ''}
            ${s.da_ordinare_kit && !complete ? `<span style="font-size:10px;color:#d97706;background:#fef9ec;border:1px solid #fde68a;padding:1px 5px;border-radius:4px;">🛒 da ordinare${s.taglia ? ' ' + s.taglia : ''}</span>` : ''}
          </div>
          <div style="display:flex;align-items:center;gap:6px;">
            <span style="font-size:12px;color:#888;">${nAss}/${tot}</span>
            ${isAdmin && !complete ? `<button class="btn-assign-staff" data-staff="${s.id}" data-tmpl="${tmpl.id}" style="font-size:10px;padding:3px 8px;background:#667eea;color:white;border:none;border-radius:5px;cursor:pointer;">Assegna</button>` : ''}
          </div>
        </div>`;
      }).join('');
    }
  } else if (!filtered.length) {
    rowsHtml = '<p style="color:#888;font-size:13px;padding:8px 0;">Nessun giocatore trovato.</p>';
  } else {
    rowsHtml = filtered.map(ps => {
      const p = ps.player;
      const nome = `${p.cognome || ''} ${p.nome || ''}`.trim();
      const dot = ps.complete ? '🟢' : ps.assigned > 0 ? '🟡' : '🔴';
      const kitTaglia = tmplAssigns.find(a => a.player_id === p.id)?.kit_stock?.taglia;
      const tagliaLabel = kitTaglia || p.taglia;
      const daOrdinare = p.da_ordinare_kit && !ps.complete;
      return `<div class="kit-row" data-player="${p.id}" data-tmpl="${tmpl.id}" style="display:flex;align-items:center;justify-content:space-between;padding:9px 12px;border-bottom:1px solid #f5f5f5;cursor:pointer;" onmouseover="this.style.background='#fafafa'" onmouseout="this.style.background=''">
        <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:0;">
          <span>${dot}</span>
          <span style="font-size:13px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${nome}</span>
          ${tagliaLabel ? `<span style="font-size:10px;color:${kitTaglia ? '#4338ca' : '#888'};background:${kitTaglia ? '#eef2ff' : '#f0f0f0'};padding:1px 5px;border-radius:4px;">${tagliaLabel}</span>` : ''}
          ${daOrdinare ? `<span style="font-size:10px;color:#d97706;background:#fef9ec;border:1px solid #fde68a;padding:1px 5px;border-radius:4px;">🛒 da ordinare${p.taglia ? ' ' + p.taglia : ''}</span>` : ''}
        </div>
        <div style="display:flex;align-items:center;gap:6px;">
          <span style="font-size:12px;color:#888;">${ps.assigned}/${ps.total}</span>
          ${isAdmin && !ps.complete ? `<button class="btn-quick-assign" data-player="${p.id}" data-tmpl="${tmpl.id}" style="font-size:10px;padding:3px 8px;background:#667eea;color:white;border:none;border-radius:5px;cursor:pointer;white-space:nowrap;">Assegna</button>` : ''}
        </div>
      </div>`;
    }).join('');
  }

  body.innerHTML = summaryHtml + `<div style="border:1px solid #f0f0f0;border-radius:8px;overflow:hidden;">${rowsHtml}</div>`;

  // Bind eventi
  body.querySelectorAll('.kit-row').forEach(row => {
    row.addEventListener('click', e => {
      if (e.target.closest('.btn-quick-assign')) return;
      const t = templates.find(x => x.id === row.dataset.tmpl);
      const player = rosterMap[row.dataset.player];
      if (t && player) showAssignModal(t, player);
    });
  });
  body.querySelectorAll('.btn-quick-assign').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const t = templates.find(x => x.id === btn.dataset.tmpl);
      const player = rosterMap[btn.dataset.player];
      if (t && player) showAssignModal(t, player);
    });
  });
  body.querySelectorAll('.btn-assign-staff, .kit-row-staff').forEach(el => {
    el.addEventListener('click', e => {
      e.stopPropagation();
      const tmplId = el.dataset.tmpl || e.target.closest('[data-tmpl]')?.dataset.tmpl;
      const staffId = el.dataset.staff || e.target.closest('[data-staff]')?.dataset.staff;
      const t = templates.find(x => x.id === tmplId);
      const staff = staffMap[staffId];
      if (t && staff) showAssignStaffModal(t, staff);
    });
  });
  body.querySelectorAll('.btn-auto-assign').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const t = templates.find(x => x.id === btn.dataset.tmpl);
      if (t) autoAssign(t);
    });
  });
}

function renderCards(filter) {
  const container = document.getElementById('kitContainer');
  if (!container) return;
  container.setAttribute('data-help', 'kit.lista');
  if (!templates.length) {
    container.innerHTML = '<p style="color:#888;font-size:13px;">Nessun template kit configurato. Clicca "⚙️ Configura kit" per iniziare.</p>';
    return;
  }

  const teamId = window.YFM.squadraId;
  const rosterPlayers = Object.values(rosterMap).sort((a, b) =>
    `${a.cognome} ${a.nome}`.localeCompare(`${b.cognome} ${b.nome}`));

  let html = '';
  templates.filter(t => t.attivo !== false).forEach(tmpl => {
    const tmplAssigns = assignments.filter(a => a.kit_stock?.template_id === tmpl.id);
    const articoli = tmpl.articoli || [];
    const totArticoli = articoli.reduce((s, a) => s + (a.qty || 1), 0);

    // Per ogni giocatore: quanti pezzi assegnati (rispettando qty per articolo)
    const playerStatus = rosterPlayers.map(p => {
      const playerAssigns = tmplAssigns.filter(a => a.player_id === p.id);
      const assigned = articoli.reduce((s, a) => s + Math.min(playerAssigns.filter(x => x.kit_stock?.articolo === a.nome).length, a.qty || 1), 0);
      return { player: p, assigned, total: totArticoli, complete: assigned >= totArticoli };
    });

    // Filtro portiere: kit portiere mostra solo portieri; kit normale esclude portieri con kit portiere già assegnato
    const portiereTemplateIds = new Set(templates.filter(t => t.tipo === 'portiere' || t.is_portiere).map(t => t.id));
    let baseList = playerStatus;
    if (tmpl.tipo === 'portiere' || tmpl.is_portiere) {
      // Solo portieri
      baseList = playerStatus.filter(ps => ps.player.ruolo_principale === 'Portiere');
    } else {
      // Escludi portieri che hanno già un kit portiere assegnato
      const portieriCoperti = new Set(
        assignments.filter(a => portiereTemplateIds.has(a.kit_stock?.template_id)).map(a => a.player_id)
      );
      baseList = playerStatus.filter(ps =>
        ps.player.ruolo_principale !== 'Portiere' || !portieriCoperti.has(ps.player.id)
      );
    }
    // Filtro
    let filtered = baseList;
    if (filter === 'incompleto') filtered = baseList.filter(ps => !ps.complete);
    else if (filter === 'completo') filtered = baseList.filter(ps => ps.complete);

    const nComplete = baseList.filter(ps => ps.complete).length;
    const nIncomplete = baseList.filter(ps => !ps.complete && ps.assigned > 0).length;
    const nNone = baseList.filter(ps => ps.assigned === 0).length;
    const nArticoli = totArticoli || 1;
    // Kit disponibile = bundle con TUTTI i pezzi disponibili
    const tmplBundles = bundles.filter(b => b.template_id === tmpl.id);
    const totPezziKit = tmpl.articoli ? tmpl.articoli.reduce((s, a) => s + (a.qty || 1), 0) : 0;
    const pezziDisponibili = tmplBundles.reduce((s, b) => s + (b.pezzi_disponibili || 0), 0);
    const kitDisponibili = tmplBundles.filter(b => b.pezzi_disponibili > 0 && b.pezzi_disponibili === (b.tot_pezzi || totPezziKit)).length;

    // Alert
    let alert = '';
    if (nNone > 0) alert = `<span style="font-size:11px;color:#E74C3C;">(⚠️ ${nNone} senza kit)</span>`;
    else if (nIncomplete > 0) alert = `<span style="font-size:11px;color:#d97706;">(⏳ ${nIncomplete} incompleti)</span>`;

    html += `<div style="margin-bottom:16px;background:white;border-radius:12px;border:1px solid #eee;overflow:hidden;">
      <div class="kit-group-header" data-tmpl="${tmpl.id}" style="padding:12px 16px;background:linear-gradient(135deg,#f0fdf4,#e6f9ed);cursor:pointer;user-select:none;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div style="display:flex;align-items:center;gap:8px;">
            <span class="kit-chevron" style="font-size:12px;transition:transform 0.2s;${expandedTmpls.has(tmpl.id) ? 'transform:rotate(90deg);' : ''}">▶</span>
            <span style="font-weight:700;font-size:14px;color:#166534;">${getKitIcon(tmpl)} ${tmpl.nome}</span>
            ${alert}
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
          </div>
        </div>
        <div style="display:flex;gap:10px;margin-top:6px;margin-left:20px;font-size:11px;color:#666;flex-wrap:wrap;">
          <span>✅ ${nComplete}/${baseList.length} assegnati</span>
          <span>📦 ${kitDisponibili} kit (${pezziDisponibili} pezzi)</span>
          <span>📋 ${totArticoli} articoli</span>
          <span>${tmpl.settore === 'scuola_calcio' ? '⚽ Scuola Calcio' : '🏟️ Settore Giovanile'}</span>
        </div>
      </div>
      <div class="kit-group-body" data-tmpl="${tmpl.id}" style="display:${expandedTmpls.has(tmpl.id) ? 'block' : 'none'};border-top:1px solid #e0e7ff;">
        ${tmpl.tipo === 'staff' ? (() => {
          // Vista staff
          const tmplStaffAssigns = staffAssignments.filter(a => a.kit_stock?.template_id === tmpl.id);
          const assignedStaffIds = new Set(tmplStaffAssigns.map(a => a.staff_id));
          const teamStaffList = Object.values(staffMap).sort((a,b) => `${a.cognome} ${a.nome}`.localeCompare(`${b.cognome} ${b.nome}`));
          if (!teamStaffList.length) return '<p style="padding:12px 16px;color:#888;font-size:13px;margin:0;">Nessuno staff assegnato a questa squadra.</p>';
          return teamStaffList.map(s => {
            const nome = `${s.cognome || ''} ${s.nome || ''}`.trim();
            const sAssigns = tmplStaffAssigns.filter(a => a.staff_id === s.id);
            const nAssegnati = sAssigns.length;
            const totArticoli = (tmpl.articoli || []).reduce((sum, a) => sum + (a.qty || 1), 0);
            const complete = nAssegnati >= totArticoli && totArticoli > 0;
            const dot = complete ? '🟢' : nAssegnati > 0 ? '🟡' : '🔴';
            const tagliaLabel = sAssigns[0]?.kit_stock?.taglia || s.taglia || '';
            const altroTeam = sAssigns.length > 0 && sAssigns[0].team_id !== window.YFM.squadraId;
            return `<div class="kit-row-staff" data-staff="${s.id}" data-tmpl="${tmpl.id}" style="display:flex;align-items:center;justify-content:space-between;padding:10px 16px;border-bottom:1px solid #f5f5f5;cursor:pointer;" onmouseover="this.style.background='#fafafa'" onmouseout="this.style.background=''">
              <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:0;">
                <span style="font-size:12px;">${dot}</span>
                <span style="font-size:13px;font-weight:500;">${nome}</span>
                <span style="font-size:11px;color:#888;">${s.ruolo || ''}</span>
                ${tagliaLabel ? `<span style="font-size:10px;color:#4338ca;background:#eef2ff;padding:1px 5px;border-radius:4px;">${tagliaLabel}</span>` : ''}
                ${altroTeam ? `<span style="font-size:10px;color:#059669;background:#d1fae5;padding:1px 5px;border-radius:4px;" title="Assegnato in altra categoria">✓ altra cat.</span>` : ''}
                ${s.da_ordinare_kit && !complete ? `<span style="font-size:10px;color:#d97706;background:#fef9ec;border:1px solid #fde68a;padding:1px 5px;border-radius:4px;">🛒 da ordinare${s.taglia ? ' ' + s.taglia : ''}</span>` : ''}
              </div>
              <div style="display:flex;align-items:center;gap:6px;">
                <span style="font-size:12px;color:#888;">${nAssegnati}/${totArticoli}</span>
                ${isAdmin && !complete ? `<button class="btn-assign-staff" data-staff="${s.id}" data-tmpl="${tmpl.id}" style="font-size:10px;padding:3px 8px;background:#667eea;color:white;border:none;border-radius:5px;cursor:pointer;">Assegna</button>` : ''}
              </div>
            </div>`;
          }).join('');
        })() : filtered.length === 0 ? '<p style="padding:12px 16px;color:#888;font-size:13px;margin:0;">Nessun giocatore trovato.</p>' :
          filtered.map(ps => {
            const p = ps.player;
            const nome = `${p.cognome || ''} ${p.nome || ''}`.trim();
            let dot = '⚪';
            if (ps.complete) dot = '🟢';
            else if (ps.assigned > 0) dot = '🟡';
            else dot = '🔴';
            const kitTaglia = tmplAssigns.find(a => a.player_id === p.id)?.kit_stock?.taglia;
            const tagliaLabel = kitTaglia || p.taglia;
            const daOrdinare = p.da_ordinare_kit && !ps.complete;
            return `<div class="kit-row" data-player="${p.id}" data-tmpl="${tmpl.id}" style="display:flex;align-items:center;justify-content:space-between;padding:10px 16px;border-bottom:1px solid #f5f5f5;cursor:pointer;" onmouseover="this.style.background='#fafafa'" onmouseout="this.style.background=''">
              <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:0;">
                <span style="font-size:12px;">${dot}</span>
                <span style="font-size:13px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${nome}</span>
                ${tagliaLabel ? `<span style="font-size:10px;color:${kitTaglia ? '#4338ca' : '#888'};background:${kitTaglia ? '#eef2ff' : '#f0f0f0'};padding:1px 5px;border-radius:4px;">${tagliaLabel}</span>` : ''}
                ${daOrdinare ? `<span style="font-size:10px;color:#d97706;background:#fef9ec;border:1px solid #fde68a;padding:1px 5px;border-radius:4px;">🛒 da ordinare${p.taglia ? ' ' + p.taglia : ' <span style="color:#E74C3C;">(taglia mancante)</span>'}</span>` : ''}
              </div>
              <div style="display:flex;align-items:center;gap:6px;">
                <span style="font-size:12px;color:#888;">${ps.assigned}/${ps.total}</span>
                ${isAdmin && !ps.complete ? `<button class="btn-quick-assign" data-player="${p.id}" data-tmpl="${tmpl.id}" style="font-size:10px;padding:3px 8px;background:#667eea;color:white;border:none;border-radius:5px;cursor:pointer;white-space:nowrap;">Assegna kit</button>` : ''}
              </div>
            </div>`;
          }).join('')}
      </div>
    </div>`;
  });

  container.innerHTML = html;

  // Toggle expand/collapse
  container.querySelectorAll('.kit-group-header').forEach(header => {
    header.addEventListener('click', (e) => {
      if (e.target.closest('.btn-gen-stock') || e.target.closest('.btn-del-tmpl') || e.target.closest('.btn-auto-assign')) return;
      const id = header.dataset.tmpl;
      const body = container.querySelector(`.kit-group-body[data-tmpl="${id}"]`);
      const chevron = header.querySelector('.kit-chevron');
      const open = body.style.display !== 'none';
      body.style.display = open ? 'none' : 'block';
      chevron.style.transform = open ? '' : 'rotate(90deg)';
      if (open) expandedTmpls.delete(id); else expandedTmpls.add(id);
    });
  });

  // Click row → assegnazione (click su nome, non su bottone)
  container.querySelectorAll('.kit-row').forEach(row => {
    row.addEventListener('click', (e) => {
      if (e.target.closest('.btn-quick-assign')) return;
      const tmpl = templates.find(t => t.id === row.dataset.tmpl);
      const player = rosterMap[row.dataset.player];
      if (tmpl && player) showAssignModal(tmpl, player);
    });
  });

  // Quick assign button (same as row click but explicit)
  container.querySelectorAll('.btn-quick-assign').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const tmpl = templates.find(t => t.id === btn.dataset.tmpl);
      const player = rosterMap[btn.dataset.player];
      if (tmpl && player) showAssignModal(tmpl, player);
    });
  });

  // Assegna kit staff
  container.querySelectorAll('.btn-assign-staff, .kit-row-staff').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target.closest('.btn-assign-staff') || el.classList.contains('kit-row-staff')) {
        e.stopPropagation();
        const tmplId = el.dataset.tmpl || e.target.closest('[data-tmpl]')?.dataset.tmpl;
        const staffId = el.dataset.staff || e.target.closest('[data-staff]')?.dataset.staff;
        const tmpl = templates.find(t => t.id === tmplId);
        const staff = staffMap[staffId];
        if (tmpl && staff) showAssignStaffModal(tmpl, staff);
      }
    });
  });

  // Auto-assign batch
  container.querySelectorAll('.btn-auto-assign').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const tmpl = templates.find(t => t.id === btn.dataset.tmpl);
      if (tmpl) autoAssign(tmpl);
    });
  });

  // Genera stock
  container.querySelectorAll('.btn-gen-stock').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const tmpl = templates.find(t => t.id === btn.dataset.tmpl);
      if (tmpl) showGenerateStockModal(tmpl);
    });
  });

  // Elimina template
  container.querySelectorAll('.btn-del-tmpl').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      confirmModal('Eliminare questo template kit?<br><small style="color:#888;">Verranno eliminati anche tutti i bundle e lo stock associati.</small>', async () => {
        await apiFetch('/kit-templates/' + btn.dataset.tmpl, { method: 'DELETE' });
        loadKit();
      });
    });
  });
}

// ═══════════════════════════════════════════
// RENDER MAGAZZINO TAB (nuova sezione)
// ═══════════════════════════════════════════
function renderMagazzinoTab() {
  const body = document.getElementById('kitMagazzinoBody');
  if (!body) return;
  body.setAttribute('data-help', 'kit.magazzino');
  const tmpl = templates.find(t => t.id === activeMagazzinoTab);
  if (!tmpl) { body.innerHTML = '<p style="color:#888;font-size:13px;">Nessun template.</p>'; return; }

  const STATO_BADGE = {
    integro:       { bg: '#dcfce7', color: '#166534', label: 'Integro' },
    saccheggiato:  { bg: '#fef9ec', color: '#92400e', label: 'Saccheggiato' },
    assegnato:     { bg: '#eef2ff', color: '#4338ca', label: 'Assegnato' },
    parziale:      { bg: '#fff7ed', color: '#c2410c', label: 'Parziale' },
    incompleto:    { bg: '#fef2f2', color: '#E74C3C', label: 'Incompleto' },
    da_riordinare: { bg: '#fef2f2', color: '#E74C3C', label: 'Da riordinare' }
  };

  const tmplBundles = bundles.filter(b => b.template_id === tmpl.id);
  const taglie = tmpl.taglie || (tmpl.settore === 'scuola_calcio' ? TAGLIE_SC : TAGLIE_SG);
  const totPezziKit = (tmpl.articoli || []).reduce((s, a) => s + (a.qty || 1), 0);

  const nIntegri      = tmplBundles.filter(b => b.stato === 'integro').length;
  const nAssegnati    = tmplBundles.filter(b => b.stato === 'assegnato').length;
  const nIncompleti   = tmplBundles.filter(b => b.stato === 'incompleto').length;
  const nSaccheggiati = tmplBundles.filter(b => b.stato === 'saccheggiato').length;
  const nRiordino     = tmplBundles.filter(b => b.stato === 'da_riordinare').length;
  const nParziali     = tmplBundles.filter(b => b.stato === 'parziale').length;

  // Summary badges
  const summaryHtml = `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;font-size:11px;">
    ${nIntegri > 0      ? `<span style="background:#dcfce7;color:#166534;padding:2px 8px;border-radius:10px;">✅ ${nIntegri} disponibili</span>` : ''}
    ${nAssegnati > 0    ? `<span style="background:#e0e7ff;color:#3730a3;padding:2px 8px;border-radius:10px;">👕 ${nAssegnati} assegnati</span>` : ''}
    ${nIncompleti > 0   ? `<span style="background:#fef2f2;color:#E74C3C;padding:2px 8px;border-radius:10px;">⚠️ ${nIncompleti} incompleti</span>` : ''}
    ${nSaccheggiati > 0 ? `<span style="background:#fef9ec;color:#92400e;padding:2px 8px;border-radius:10px;">🔓 ${nSaccheggiati} saccheggiati</span>` : ''}
    ${nRiordino > 0     ? `<span style="background:#fef2f2;color:#E74C3C;padding:2px 8px;border-radius:10px;">🔴 ${nRiordino} da riordinare</span>` : ''}
    ${nParziali > 0     ? `<span style="background:#fff7ed;color:#c2410c;padding:2px 8px;border-radius:10px;">📦 ${nParziali} in attesa</span>` : ''}
    ${!tmplBundles.length ? '<span style="color:#888;">Nessuno stock generato</span>' : ''}
  </div>`;

  // Raggruppa per taglia
  const bundlePerTaglia = {};
  tmplBundles.forEach(b => {
    if (!bundlePerTaglia[b.taglia]) bundlePerTaglia[b.taglia] = [];
    bundlePerTaglia[b.taglia].push(b);
  });

  const taglieHtml = taglie.map(taglia => {
    const tagliBundles = (bundlePerTaglia[taglia] || []).sort((a, b) => a.numero_kit - b.numero_kit);
    if (!tagliBundles.length) return '';
    const nI = tagliBundles.filter(b => b.stato === 'integro').length;
    const nA = tagliBundles.filter(b => b.stato === 'assegnato').length;
    const nP = tagliBundles.filter(b => b.stato === 'parziale').length;
    const nIn = tagliBundles.filter(b => b.stato === 'incompleto').length;
    const nS = tagliBundles.filter(b => b.stato === 'saccheggiato').length;
    const summaryParts = [];
    if (nI > 0)  summaryParts.push(`<span style="color:#166534;">${nI} disp.</span>`);
    if (nA > 0)  summaryParts.push(`<span style="color:#3730a3;">${nA} ass.</span>`);
    if (nP > 0)  summaryParts.push(`<span style="color:#c2410c;">${nP} att.</span>`);
    if (nIn > 0) summaryParts.push(`<span style="color:#E74C3C;">${nIn} incompl.</span>`);
    if (nS > 0)  summaryParts.push(`<span style="color:#92400e;">${nS} sacch.</span>`);
    const tagliaKey = tmpl.id + '_' + taglia;
    const bundleRows = tagliBundles.map(b => {
      const badge = STATO_BADGE[b.stato] || STATO_BADGE.integro;
      const disp = b.pezzi_disponibili || 0;
      const ass  = b.pezzi_assegnati  || 0;
      const persi = b.pezzi_mancanti  || 0;
      const tot  = b.tot_pezzi || totPezziKit;
      const kitCompleto = disp > 0 && disp === tot;
      const kitLabel = kitCompleto
        ? `<span style="color:#166534;font-size:11px;">✅ completo</span>`
        : ass > 0 && persi === 0
          ? `<span style="color:#4338ca;font-size:11px;">${ass}/${tot} ass.</span>`
          : `<span style="color:#666;font-size:11px;">${disp} disp.${ass > 0 ? ' · ' + ass + ' ass.' : ''}${persi > 0 ? ' · <span style="color:#E74C3C;">' + persi + ' persi</span>' : ''}</span>`;
      const canDelete = isAdmin && b.stato !== 'assegnato';
      return `<div style="padding:6px 12px 6px 24px;border-bottom:1px solid #f5f5f5;font-size:12px;display:flex;align-items:center;gap:8px;">
        <span style="font-weight:600;min-width:46px;color:#555;">${b.numero_maglia != null ? 'n°' + b.numero_maglia : 'Kit #' + b.numero_kit}</span>
        <span style="background:${badge.bg};color:${badge.color};padding:1px 7px;border-radius:10px;font-size:11px;">${badge.label}</span>
        <span style="flex:1;">${kitLabel}</span>
        ${canDelete ? `<button class="btn-delete-bundle" data-id="${b.id}" title="Elimina" style="background:none;border:none;cursor:pointer;font-size:13px;color:#ccc;padding:1px 3px;" onmouseover="this.style.color='#E74C3C'" onmouseout="this.style.color='#ccc'">🗑️</button>` : ''}
      </div>`;
    }).join('');
    return `<div style="border:1px solid #f0f0f0;border-radius:8px;overflow:hidden;margin-bottom:6px;">
      <div class="kb-taglia-header" data-key="${tagliaKey}" style="display:flex;align-items:center;justify-content:space-between;padding:7px 12px;background:#f8fafc;cursor:pointer;user-select:none;">
        <div style="display:flex;align-items:center;gap:8px;">
          <span class="kb-chevron" style="font-size:10px;transition:transform 0.2s;">▶</span>
          <span style="font-size:12px;font-weight:600;color:#374151;">Taglia ${taglia}</span>
          <span style="font-size:11px;color:#888;">${tagliBundles.length} kit — ${summaryParts.join(', ')}</span>
        </div>
      </div>
      <div class="kb-taglia-body" data-key="${tagliaKey}" style="display:none;">${bundleRows}</div>
    </div>`;
  }).join('');

  const actionsHtml = isAdmin ? `<div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;">
    <button class="btn-restock" data-tmpl="${tmpl.id}" style="font-size:11px;padding:5px 12px;background:#eef2ff;border:1px solid #c7d2fe;border-radius:6px;cursor:pointer;color:#4338ca;">+ Ordina stock</button>
  </div>` : '';

  body.innerHTML = summaryHtml + (taglieHtml || '<p style="color:#888;font-size:12px;">Nessun bundle. Genera stock per iniziare.</p>') + actionsHtml;

  // Toggle taglia
  body.querySelectorAll('.kb-taglia-header').forEach(header => {
    header.addEventListener('click', () => {
      const key = header.dataset.key;
      const b = body.querySelector(`.kb-taglia-body[data-key="${key}"]`);
      const ch = header.querySelector('.kb-chevron');
      const open = b.style.display !== 'none';
      b.style.display = open ? 'none' : 'block';
      ch.style.transform = open ? '' : 'rotate(90deg)';
    });
  });
  body.querySelectorAll('.btn-restock').forEach(btn => {
    btn.addEventListener('click', () => {
      const t = templates.find(x => x.id === btn.dataset.tmpl);
      if (t) showGenerateStockModal(t);
    });
  });
  body.querySelectorAll('.btn-delete-bundle').forEach(btn => {
    btn.addEventListener('click', () => {
      confirmModal('Eliminare questo kit dallo stock?', async () => {
        try {
          showLoading('Eliminazione...');
          await apiFetch('/kit-bundles/' + btn.dataset.id, { method: 'DELETE' });
          hideLoading(); showToast('Kit eliminato', 'success'); loadKit();
        } catch (err) { hideLoading(); showToast(err.message, 'error'); }
      });
    });
  });
}

// ═══════════════════════════════════════════
// RENDER ORDINI TAB (nuova sezione)
// ═══════════════════════════════════════════
function renderOrdiniTab() {
  const body = document.getElementById('kitOrdiniBody');
  if (!body) return;

  if (activeOrdiniTab === 'da_ordinare') {
    // ── Da ordinare ──────────────────────────────
    const bundleToTmplGlobal = {};
    bundles.forEach(b => { bundleToTmplGlobal[b.id] = b.template_id; });

    const daOrdinareList = [
      ...Object.values(rosterMap)
        .filter(p => p.da_ordinare_kit)
        .map(p => {
          const tmplMancante = templates.filter(t => t.attivo !== false && t.tipo !== 'staff').find(t => {
            const hasAssignment = assignments.some(a => a.player_id === p.id && (bundleToTmplGlobal[a.bundle_id_originale] === t.id || a.kit_stock?.template_id === t.id));
            return !hasAssignment && (t.tipo !== 'portiere' || p.ruolo_principale === 'Portiere');
          });
          return { ...p, tmpl_nome: tmplMancante?.nome || null, tmpl_id: tmplMancante?.id || null, _tipo: 'giocatore' };
        }),
      ...Object.values(staffMap)
        .filter(s => s.da_ordinare_kit)
        .map(s => {
          const tmplMancante = templates.filter(t => t.attivo !== false && t.tipo === 'staff').find(t =>
            !staffAssignments.some(a => a.staff_id === s.id && (bundleToTmplGlobal[a.bundle_id_originale] === t.id || a.kit_stock?.template_id === t.id))
          );
          return { ...s, tmpl_nome: tmplMancante?.nome || null, tmpl_id: tmplMancante?.id || null, _tipo: 'staff' };
        })
    ].sort((a, b) => {
      const ta = a.taglia || 'ZZZ', tb = b.taglia || 'ZZZ';
      if (ta !== tb) return ta.localeCompare(tb);
      return `${a.cognome} ${a.nome}`.localeCompare(`${b.cognome} ${b.nome}`);
    });

    const inAttesaList = [];
    assignments.forEach(a => {
      (a.sostituzioni || []).filter(s => s.stato === 'in_attesa').forEach(s => {
        const p = Object.values(rosterMap).find(r => r.id === a.player_id);
        if (p) inAttesaList.push({ cognome: p.cognome, nome: p.nome, taglia: a.kit_stock?.taglia || p.taglia, articolo: s.articolo });
      });
    });

    if (!daOrdinareList.length && !inAttesaList.length) {
      body.innerHTML = '<p style="color:#888;font-size:13px;padding:8px 0;">Nessun ordine in attesa. 🎉</p>';
      return;
    }

    const righeKit = daOrdinareList.map((item, idx) =>
      `<div style="padding:8px 10px;border-bottom:1px solid #f5f5f5;display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;">
        <div style="display:flex;align-items:center;gap:6px;flex:1;min-width:0;">
          <span style="font-size:12px;font-weight:600;color:#92400e;min-width:32px;">${item.taglia || '—'}</span>
          <span style="font-size:12px;color:#555;">${item._tipo === 'staff' ? '🦺 ' : ''}${item.cognome} ${item.nome}</span>
          ${item.tmpl_nome ? `<span style="font-size:10px;color:#aaa;">(${item.tmpl_nome})</span>` : ''}
        </div>
        <button class="btn-gestisci-ordine-kit" data-idx="${idx}" style="font-size:11px;padding:3px 8px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;cursor:pointer;color:#166534;white-space:nowrap;flex-shrink:0;">📦 Gestisci</button>
      </div>`
    ).join('');

    const righeSost = inAttesaList.map((s, idx) =>
      `<div style="padding:8px 10px;border-bottom:1px solid #f5f5f5;display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;">
        <div style="display:flex;align-items:center;gap:6px;flex:1;min-width:0;">
          <span style="font-size:10px;background:#fef2f2;color:#E74C3C;padding:1px 5px;border-radius:4px;border:1px solid #fecaca;flex-shrink:0;">sost.</span>
          <span style="font-size:12px;font-weight:600;color:#92400e;min-width:32px;">${s.taglia || '—'}</span>
          <span style="font-size:12px;color:#555;">${s.cognome} ${s.nome}</span>
          <span style="font-size:11px;color:#888;">— ${s.articolo}</span>
        </div>
        <button class="btn-gestisci-ordine-pezzi" data-idx="${idx}" style="font-size:11px;padding:3px 8px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;cursor:pointer;color:#166534;white-space:nowrap;flex-shrink:0;">📦 Gestisci</button>
      </div>`
    ).join('');

    const hasSep = daOrdinareList.length > 0 && inAttesaList.length > 0;
    body.innerHTML = `<div style="border:1px solid #fde68a;border-radius:8px;overflow:hidden;">
      ${righeKit}
      ${hasSep ? '<div style="padding:4px 10px;background:#fef9ec;font-size:11px;color:#92400e;font-weight:600;">Sostituzioni in attesa</div>' : ''}
      ${righeSost}
    </div>`;

    body.querySelectorAll('.btn-gestisci-ordine-kit').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = daOrdinareList[parseInt(btn.dataset.idx)];
        const tmpl = templates.find(t => t.id === item.tmpl_id) ||
          templates.find(t => t.tipo !== 'staff' && t.attivo !== false);
        if (tmpl) showGestisciOrdineKitModal(item, tmpl);
      });
    });
    body.querySelectorAll('.btn-gestisci-ordine-pezzi').forEach(btn => {
      btn.addEventListener('click', () => showGestisciOrdinePezziModal(inAttesaList[parseInt(btn.dataset.idx)]));
    });

  } else {
    // ── In attesa dal fornitore ───────────────────
    const allParziali = bundles.filter(b => b.stato === 'parziale' && b.pezzi_in_attesa?.length);
    if (!allParziali.length) {
      body.innerHTML = '<p style="color:#888;font-size:13px;padding:8px 0;">Nessun kit parziale in attesa. 🎉</p>';
      return;
    }

    const perTemplateTaglia = {};
    allParziali.forEach(b => {
      const tmpl = templates.find(t => t.id === b.template_id);
      if (!tmpl) return;
      const key = b.template_id + '|' + b.taglia;
      if (!perTemplateTaglia[key]) perTemplateTaglia[key] = { tmpl, taglia: b.taglia, bundles: [] };
      perTemplateTaglia[key].bundles.push(b);
    });

    const righe = Object.values(perTemplateTaglia).map(({ tmpl, taglia, bundles: bList }) => {
      const artCount = {};
      bList.forEach(b => (b.pezzi_in_attesa || []).forEach(a => { artCount[a] = (artCount[a] || 0) + 1; }));
      const artHtml = Object.entries(artCount)
        .map(([art, n]) => `<span style="font-size:11px;background:#fff7ed;color:#c2410c;padding:1px 5px;border-radius:4px;border:1px solid #fed7aa;">${art} ×${n}</span>`)
        .join(' ');
      const destinatari = bList.map(b => {
        const pa = assignments.find(a => a.bundle_id_originale === b.id);
        if (pa) { const p = Object.values(rosterMap).find(r => r.id === pa.player_id); return p ? p.cognome + ' ' + p.nome : null; }
        const sa = staffAssignments.find(a => a.bundle_id_originale === b.id);
        if (sa) { const s = staffMap[sa.staff_id]; return s ? '🦺 ' + s.cognome + ' ' + s.nome : null; }
        return null;
      }).filter(Boolean);
      return `<div style="padding:8px 10px;border-bottom:1px solid #f5f5f5;display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;">
        <div style="flex:1;min-width:0;">
          <div style="font-size:12px;font-weight:600;color:#374151;">${tmpl.nome} — ${taglia} <span style="font-size:11px;color:#888;">(${bList.length} kit)</span></div>
          ${destinatari.length ? `<div style="font-size:11px;color:#555;margin-top:2px;">👤 ${destinatari.join(', ')}</div>` : ''}
          <div style="margin-top:4px;display:flex;flex-wrap:wrap;gap:3px;">${artHtml}</div>
        </div>
        <button class="btn-segna-arrivati" data-tmpl="${tmpl.id}" data-taglia="${taglia}" style="font-size:11px;padding:4px 10px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;cursor:pointer;color:#166534;white-space:nowrap;flex-shrink:0;">✅ Segna arrivati</button>
      </div>`;
    }).join('');

    body.innerHTML = `<div style="border:1px solid #fed7aa;border-radius:8px;overflow:hidden;">${righe}</div>`;

    body.querySelectorAll('.btn-segna-arrivati').forEach(btn => {
      btn.addEventListener('click', () => {
        const tmpl = templates.find(t => t.id === btn.dataset.tmpl);
        const taglia = btn.dataset.taglia;
        const bParziali = allParziali.filter(b => b.template_id === btn.dataset.tmpl && b.taglia === taglia);
        if (tmpl) showSegnaArrivatiModal(tmpl, taglia, bParziali);
      });
    });
  }
}

// ═══════════════════════════════════════════
// VISTA MAGAZZINO
// ═══════════════════════════════════════════
function renderMagazzino() {
  const container = document.getElementById('kitContainer');
  if (!container) return;
  container.setAttribute('data-help', 'kit.magazzino');
  if (!templates.length) {
    container.innerHTML = '<p style="color:#888;font-size:13px;">Nessun template configurato.</p>';
    return;
  }

  const STATO_BADGE = {
    integro:       { bg: '#dcfce7', color: '#166534', label: 'Integro' },
    saccheggiato:  { bg: '#fef9ec', color: '#92400e', label: 'Saccheggiato' },
    assegnato:     { bg: '#eef2ff', color: '#4338ca', label: 'Assegnato' },
    parziale:      { bg: '#fff7ed', color: '#c2410c', label: 'Parziale' },
    incompleto:    { bg: '#fef2f2', color: '#E74C3C', label: 'Incompleto' },
    da_riordinare: { bg: '#fef2f2', color: '#E74C3C', label: 'Da riordinare' }
  };

  let html = '';
  templates.filter(t => t.attivo !== false).forEach(tmpl => {
    const tmplBundles = bundles.filter(b => b.template_id === tmpl.id);
    const taglie = tmpl.taglie || (tmpl.settore === 'scuola_calcio' ? TAGLIE_SC : TAGLIE_SG);
    const articoli = (tmpl.articoli || []).map(a => a.nome);

    const nIntegri      = tmplBundles.filter(b => b.stato === 'integro').length;
    const nAssegnati    = tmplBundles.filter(b => b.stato === 'assegnato').length;
    const nIncompleti   = tmplBundles.filter(b => b.stato === 'incompleto').length;
    const nSaccheggiati = tmplBundles.filter(b => b.stato === 'saccheggiato').length;
    const nRiordino     = tmplBundles.filter(b => b.stato === 'da_riordinare').length;
    const nParziali     = tmplBundles.filter(b => b.stato === 'parziale').length;
    // Giocatori da ordinare per questo template (da_ordinare_kit=true E senza kit assegnato per questo template)
    const bundleToTmpl = {}; bundles.forEach(b => { bundleToTmpl[b.id] = b.template_id; });
    const assignedPlayerIds = new Set(assignments.filter(a => bundleToTmpl[a.bundle_id_originale] === tmpl.id || a.kit_stock?.template_id === tmpl.id).map(a => a.player_id));
    const staffDaOrdinare = tmpl.tipo === 'staff'
      ? Object.values(staffMap).filter(s => s.da_ordinare_kit && !staffAssignments.some(a => a.staff_id === s.id && a.kit_stock?.template_id === tmpl.id)).length
      : 0;
    const nDaOrdinare   = tmpl.tipo === 'staff' ? staffDaOrdinare : Object.values(rosterMap).filter(p =>
      p.da_ordinare_kit && !assignedPlayerIds.has(p.id) &&
      (tmpl.tipo !== 'portiere' || p.ruolo_principale === 'Portiere')
    ).length;
    // Sostituzioni in attesa per questo template
    const nInAttesa     = assignments.filter(a => a.kit_stock?.template_id === tmpl.id &&
      (a.sostituzioni || []).some(s => s.stato === 'in_attesa')).length;

    // Raggruppa bundle per taglia
    const bundlePerTaglia = {};
    tmplBundles.forEach(b => {
      if (!bundlePerTaglia[b.taglia]) bundlePerTaglia[b.taglia] = [];
      bundlePerTaglia[b.taglia].push(b);
    });

    html += `<div style="margin-bottom:16px;background:white;border-radius:12px;border:1px solid #eee;overflow:hidden;">
      <div style="padding:12px 16px;background:linear-gradient(135deg,#eef2ff,#e0e7ff);">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
          <span style="font-weight:700;font-size:14px;color:#4338ca;">${getKitIcon(tmpl)} ${tmpl.nome}</span>
          <div style="display:flex;gap:8px;font-size:11px;flex-wrap:wrap;">
            ${nIntegri > 0      ? `<span style="background:#dcfce7;color:#166534;padding:2px 8px;border-radius:10px;">✅ ${nIntegri} disponibili</span>` : ''}
            ${nAssegnati > 0    ? `<span style="background:#e0e7ff;color:#3730a3;padding:2px 8px;border-radius:10px;">👕 ${nAssegnati} assegnati</span>` : ''}
            ${nIncompleti > 0   ? `<span style="background:#fef2f2;color:#E74C3C;padding:2px 8px;border-radius:10px;">⚠️ ${nIncompleti} incompleti</span>` : ''}
            ${nSaccheggiati > 0 ? `<span style="background:#fef9ec;color:#92400e;padding:2px 8px;border-radius:10px;">🔓 ${nSaccheggiati} saccheggiati</span>` : ''}
            ${nRiordino > 0     ? `<span style="background:#fef2f2;color:#E74C3C;padding:2px 8px;border-radius:10px;">🔴 ${nRiordino} da riordinare</span>` : ''}
            ${nParziali > 0     ? `<span style="background:#fff7ed;color:#c2410c;padding:2px 8px;border-radius:10px;">📦 ${nParziali} in attesa fornitore</span>` : ''}
            ${nDaOrdinare > 0   ? `<span style="background:#fef9ec;color:#92400e;padding:2px 8px;border-radius:10px;">🛒 ${nDaOrdinare} da ordinare</span>` : ''}
            ${nInAttesa > 0     ? `<span style="background:#fef2f2;color:#E74C3C;padding:2px 8px;border-radius:10px;">🔄 ${nInAttesa} sost. in attesa</span>` : ''}
          </div>
        </div>
        <div style="font-size:11px;color:#666;margin-top:4px;">Articoli: ${articoli.join(', ')}</div>
      </div>

      ${taglie.map(taglia => {
        const tagliBundles = (bundlePerTaglia[taglia] || []).sort((a, b) => a.numero_kit - b.numero_kit);
        if (!tagliBundles.length) return '';
        const totPK = tmpl.articoli ? tmpl.articoli.reduce((s, a) => s + (a.qty || 1), 0) : 0;
        const nI  = tagliBundles.filter(b => b.stato === 'integro').length;
        const nA  = tagliBundles.filter(b => b.stato === 'assegnato').length;
        const nIn = tagliBundles.filter(b => b.stato === 'incompleto').length;
        const nS  = tagliBundles.filter(b => b.stato === 'saccheggiato').length;
        const nR  = tagliBundles.filter(b => b.stato === 'da_riordinare').length;
        const nP  = tagliBundles.filter(b => b.stato === 'parziale').length;
        const summaryParts = [];
        if (nI > 0)  summaryParts.push(`<span style="color:#166534;">${nI} disponibili</span>`);
        if (nA > 0)  summaryParts.push(`<span style="color:#3730a3;">${nA} assegnati</span>`);
        if (nP > 0)  summaryParts.push(`<span style="color:#c2410c;">${nP} in attesa fornitore</span>`);
        if (nIn > 0) summaryParts.push(`<span style="color:#E74C3C;">${nIn} incompleti</span>`);
        if (nS > 0)  summaryParts.push(`<span style="color:#92400e;">${nS} saccheggiati</span>`);
        if (nR > 0)  summaryParts.push(`<span style="color:#E74C3C;">${nR} da riordinare</span>`);
        const tagliaKey = tmpl.id + '_' + taglia;
        return `<div style="border-top:1px solid #f0f0f0;">
          <div class="kb-taglia-header" data-key="${tagliaKey}" style="display:flex;align-items:center;justify-content:space-between;padding:8px 14px;background:#f8fafc;cursor:pointer;user-select:none;">
            <div style="display:flex;align-items:center;gap:8px;">
              <span class="kb-chevron" style="font-size:11px;transition:transform 0.2s;">▶</span>
              <span style="font-size:12px;font-weight:600;color:#374151;">Taglia ${taglia}</span>
              <span style="font-size:11px;color:#888;">— ${tagliBundles.length} kit — ${summaryParts.join(', ')}</span>
            </div>
          </div>
          <div class="kb-taglia-body" data-key="${tagliaKey}" style="display:none;">
            ${tagliBundles.map(b => {
              const badge = STATO_BADGE[b.stato] || STATO_BADGE.integro;
              const totPK2 = tmpl.articoli ? tmpl.articoli.reduce((s, a) => s + (a.qty || 1), 0) : b.tot_pezzi || 0;
              const disp = b.pezzi_disponibili || 0;
              const ass  = b.pezzi_assegnati  || 0;
              const persi = b.pezzi_mancanti  || 0;
              const tot  = b.tot_pezzi || totPK2;
              const kitCompleto = disp > 0 && disp === tot;
              const isSaccheggiato = b.stato === 'saccheggiato';

              const dettaglioSaccheggio = isSaccheggiato ? `
                <div style="margin-top:4px;padding:6px 10px;background:#fef9ec;border:1px solid #fde68a;border-radius:6px;font-size:11px;">
                  ${disp > 0  ? `<div style="color:#166534;">✅ Presenti: ${disp} pezzi</div>` : ''}
                  ${ass > 0   ? `<div style="color:#4338ca;">📦 Assegnati: ${ass} pezzi</div>` : ''}
                  ${persi > 0 ? `<div style="color:#E74C3C;">❌ Persi/dann.: ${persi} pezzi</div>` : ''}
                </div>` : '';

              const kitLabel = kitCompleto
                ? `<span style="color:#166534;font-size:11px;">✅ Kit completo disponibile</span>`
                : ass > 0 && persi === 0
                  ? `<span style="color:#4338ca;font-size:11px;">${ass}/${tot} pezzi assegnati</span>`
                  : `<span style="color:#666;font-size:11px;">${disp} disp.${ass > 0 ? ' · ' + ass + ' ass.' : ''}${persi > 0 ? ' · <span style="color:#E74C3C;">' + persi + ' persi/dann.</span>' : ''}</span>`;

              const canDelete = isAdmin && b.stato !== 'assegnato';
              return `<div style="padding:7px 14px 7px 28px;border-bottom:1px solid #f5f5f5;font-size:12px;">
                <div style="display:flex;align-items:center;gap:10px;">
                  <span style="font-weight:600;min-width:50px;color:#555;">${b.numero_maglia != null ? 'n°' + b.numero_maglia : 'Kit #' + b.numero_kit}</span>
                  <span style="background:${badge.bg};color:${badge.color};padding:1px 8px;border-radius:10px;font-size:11px;white-space:nowrap;">${badge.label}</span>
                  <span style="flex:1;">${kitLabel}</span>
                  ${canDelete ? `<button class="btn-delete-bundle" data-id="${b.id}" title="Elimina bundle" style="background:none;border:none;cursor:pointer;font-size:14px;color:#ccc;padding:2px 4px;line-height:1;" onmouseover="this.style.color='#E74C3C'" onmouseout="this.style.color='#ccc'">🗑️</button>` : ''}
                </div>
                ${dettaglioSaccheggio}
              </div>`;
            }).join('')}
          </div>
        </div>`;
      }).join('')}

      ${nRiordino > 0 ? `<div style="padding:8px 14px;background:#fef2f2;border-top:1px solid #fecaca;font-size:11px;color:#E74C3C;">🔴 ${nRiordino} kit completamente esauriti — necessario riordino</div>` : ''}
      ${nSaccheggiati > 0 ? `<div style="padding:8px 14px;background:#fef9ec;border-top:1px solid #fde68a;font-size:11px;color:#92400e;">⚠️ ${nSaccheggiati} kit parzialmente saccheggiati — i pezzi mancanti sono stati usati come sostituzione</div>` : ''}
      ${isAdmin ? `<div style="padding:8px 12px;border-top:1px solid #f0f0f0;text-align:right;">
        <button class="btn-restock" data-tmpl="${tmpl.id}" data-help="kit.restock" style="font-size:11px;padding:5px 12px;background:#eef2ff;border:1px solid #c7d2fe;border-radius:6px;cursor:pointer;color:#4338ca;">+ Ordina stock</button>
      </div>` : ''}
    </div>`;
  });

  container.innerHTML = html || '<p style="color:#888;font-size:13px;padding:12px;">Nessun bundle in magazzino. Genera stock per iniziare.</p>';

  // Toggle collasso per taglia
  container.querySelectorAll('.kb-taglia-header').forEach(header => {
    header.addEventListener('click', () => {
      const key = header.dataset.key;
      const body = container.querySelector(`.kb-taglia-body[data-key="${key}"]`);
      const chevron = header.querySelector('.kb-chevron');
      const open = body.style.display !== 'none';
      body.style.display = open ? 'none' : 'block';
      chevron.style.transform = open ? '' : 'rotate(90deg)';
    });
  });

  container.querySelectorAll('.btn-restock').forEach(btn => {
    btn.addEventListener('click', () => {
      const tmpl = templates.find(t => t.id === btn.dataset.tmpl);
      if (tmpl) showGenerateStockModal(tmpl);
    });
  });

  // Elimina bundle
  container.querySelectorAll('.btn-delete-bundle').forEach(btn => {
    btn.addEventListener('click', () => {
      confirmModal('Eliminare questo kit dallo stock? I pezzi verranno rimossi dal magazzino.', async () => {
        try {
          showLoading('Eliminazione...');
          await apiFetch('/kit-bundles/' + btn.dataset.id, { method: 'DELETE' });
          hideLoading();
          showToast('Kit eliminato', 'success');
          loadKit();
        } catch (err) { hideLoading(); showToast(err.message, 'error'); }
      });
    });
  });

  // Sezione Da ordinare
  const bundleToTmplGlobal = {}; bundles.forEach(b => { bundleToTmplGlobal[b.id] = b.template_id; });
  const daOrdinareList = [
    // Giocatori
    ...Object.values(rosterMap)
      .filter(p => p.da_ordinare_kit)
      .map(p => {
        const tmplMancante = templates.filter(t => t.attivo !== false && t.tipo !== 'staff').find(t => {
          const hasAssignment = assignments.some(a => a.player_id === p.id && (bundleToTmplGlobal[a.bundle_id_originale] === t.id || a.kit_stock?.template_id === t.id));
          return !hasAssignment && (t.tipo !== 'portiere' || p.ruolo_principale === 'Portiere');
        });
        return { ...p, tmpl_nome: tmplMancante?.nome || null, _tipo: 'giocatore' };
      }),
    // Staff
    ...Object.values(staffMap)
      .filter(s => s.da_ordinare_kit)
      .map(s => {
        const tmplMancante = templates.filter(t => t.attivo !== false && t.tipo === 'staff').find(t =>
          !staffAssignments.some(a => a.staff_id === s.id && (bundleToTmplGlobal[a.bundle_id_originale] === t.id || a.kit_stock?.template_id === t.id))
        );
        return { ...s, tmpl_nome: tmplMancante?.nome || null, _tipo: 'staff' };
      })
  ].sort((a, b) => {
    const ta = a.taglia || 'ZZZ', tb = b.taglia || 'ZZZ';
    if (ta !== tb) return ta.localeCompare(tb);
    return `${a.cognome} ${a.nome}`.localeCompare(`${b.cognome} ${b.nome}`);
  });

  // Sostituzioni in attesa dagli assignments in memoria
  const inAttesaList = [];
  assignments.forEach(a => {
    (a.sostituzioni || []).filter(s => s.stato === 'in_attesa').forEach(s => {
      const p = Object.values(rosterMap).find(r => r.id === a.player_id);
      if (p) inAttesaList.push({ cognome: p.cognome, nome: p.nome, taglia: a.kit_stock?.taglia || p.taglia, articolo: s.articolo });
    });
  });
  inAttesaList.sort((a, b) => {
    const ta = a.taglia || 'ZZZ', tb = b.taglia || 'ZZZ';
    if (ta !== tb) return ta.localeCompare(tb);
    return `${a.cognome} ${a.nome}`.localeCompare(`${b.cognome} ${b.nome}`);
  });

  if (daOrdinareList.length || inAttesaList.length) {
    // Righe singole per ogni voce (con bottone Gestisci ordine)
    const righeGiocatori = daOrdinareList.map(p => {
      const tmpl = templates.find(t => t.nome === p.tmpl_nome) || templates.find(t => t.tipo !== 'staff' && t.attivo !== false);
      const idx = daOrdinareList.indexOf(p);
      return `<div style="padding:8px 14px;border-bottom:1px solid #f5f5f5;display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;">
        <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:0;">
          <span style="font-size:12px;font-weight:600;color:#92400e;min-width:36px;">${p.taglia || '—'}</span>
          <span style="font-size:12px;color:#555;">${p._tipo === 'staff' ? '🦺 ' : ''}${p.cognome} ${p.nome}</span>
          ${p.tmpl_nome ? `<span style="font-size:10px;color:#aaa;">(${p.tmpl_nome})</span>` : ''}
        </div>
        <button class="btn-gestisci-ordine-kit" data-idx="${idx}"
          style="font-size:11px;padding:4px 10px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;cursor:pointer;color:#166534;white-space:nowrap;flex-shrink:0;">
          📦 Gestisci ordine
        </button>
      </div>`;
    }).join('');

    // Sostituzioni in attesa con bottone Gestisci
    const righeAttesa = inAttesaList.map((s, idx) =>
      `<div style="padding:8px 14px;border-bottom:1px solid #f5f5f5;display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;">
        <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:0;">
          <span style="font-size:11px;background:#fef2f2;color:#E74C3C;padding:1px 6px;border-radius:4px;border:1px solid #fecaca;flex-shrink:0;">sostituzione</span>
          <span style="font-size:12px;font-weight:600;color:#92400e;min-width:36px;">${s.taglia || '—'}</span>
          <span style="font-size:12px;color:#555;">${s.cognome} ${s.nome}</span>
          <span style="font-size:11px;color:#888;">— ${s.articolo}</span>
        </div>
        <button class="btn-gestisci-ordine-pezzi" data-idx="${idx}"
          style="font-size:11px;padding:4px 10px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;cursor:pointer;color:#166534;white-space:nowrap;flex-shrink:0;">
          📦 Gestisci ordine
        </button>
      </div>`
    ).join('');

    const hasSeparator = daOrdinareList.length > 0 && inAttesaList.length > 0;
    const sec = document.createElement('div');
    sec.style.cssText = 'margin-top:16px;background:white;border-radius:12px;border:1px solid #fde68a;overflow:hidden;';
    sec.innerHTML = `
      <div style="padding:10px 16px;background:linear-gradient(135deg,#fef9ec,#fef3c7);display:flex;align-items:center;justify-content:space-between;">
        <span style="font-weight:700;font-size:14px;color:#92400e;" data-help="kit.daOrdinare">🛒 Da ordinare</span>
        <span style="font-size:12px;color:#92400e;">${daOrdinareList.length + inAttesaList.length} voci</span>
      </div>
      ${righeGiocatori}
      ${hasSeparator ? '<div style="padding:4px 14px;background:#fef9ec;font-size:11px;color:#92400e;font-weight:600;">Sostituzioni in attesa</div>' : ''}
      ${righeAttesa}`;
    container.appendChild(sec);

    // Handler bottoni Gestisci ordine — Tipo 1 (kit completo)
    sec.querySelectorAll('.btn-gestisci-ordine-kit').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = daOrdinareList[parseInt(btn.dataset.idx)];
        const tmpl = templates.find(t => t.nome === item.tmpl_nome) ||
          templates.find(t => t.tipo !== 'staff' && t.attivo !== false);
        if (tmpl) showGestisciOrdineKitModal(item, tmpl);
      });
    });

    // Handler bottoni Gestisci ordine — Tipo 2 (pezzi sfusi)
    sec.querySelectorAll('.btn-gestisci-ordine-pezzi').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = inAttesaList[parseInt(btn.dataset.idx)];
        showGestisciOrdinePezziModal(item);
      });
    });
  }

  // Card "In attesa dal fornitore" (bundle parziali)
  const allParziali = bundles.filter(b => b.stato === 'parziale' && b.pezzi_in_attesa?.length);
  if (allParziali.length) {
    // Raggruppa per template → taglia
    const perTemplateTaglia = {};
    allParziali.forEach(b => {
      const tmpl = templates.find(t => t.id === b.template_id);
      if (!tmpl) return;
      const key = b.template_id + '|' + b.taglia;
      if (!perTemplateTaglia[key]) perTemplateTaglia[key] = { tmpl, taglia: b.taglia, bundles: [] };
      perTemplateTaglia[key].bundles.push(b);
    });

    const righeFornitore = Object.values(perTemplateTaglia).map(({ tmpl, taglia, bundles: bList }) => {
      // Articoli in attesa con conteggio
      const artCount = {};
      bList.forEach(b => (b.pezzi_in_attesa || []).forEach(a => { artCount[a] = (artCount[a] || 0) + 1; }));
      const artHtml = Object.entries(artCount)
        .map(([art, n]) => `<span style="font-size:11px;background:#fff7ed;color:#c2410c;padding:1px 6px;border-radius:4px;border:1px solid #fed7aa;">${art} ×${n}</span>`)
        .join(' ');

      // Nomi destinatari per ogni bundle parziale
      const destinatari = bList.map(b => {
        const pa = assignments.find(a => a.bundle_id_originale === b.id);
        if (pa) {
          const p = Object.values(rosterMap).find(r => r.id === pa.player_id);
          return p ? p.cognome + ' ' + p.nome : null;
        }
        const sa = staffAssignments.find(a => a.bundle_id_originale === b.id);
        if (sa) {
          const s = staffMap[sa.staff_id];
          return s ? '🦺 ' + s.cognome + ' ' + s.nome : null;
        }
        return null;
      }).filter(Boolean);
      const destinatariHtml = destinatari.length
        ? `<div style="margin-top:4px;font-size:11px;color:#555;">👤 ${destinatari.join(', ')}</div>`
        : '';

      return `<div style="padding:8px 14px;border-bottom:1px solid #f5f5f5;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px;">
        <div>
          <span style="font-size:12px;font-weight:600;color:#374151;">${tmpl.nome} — Taglia ${taglia}</span>
          <span style="font-size:11px;color:#888;margin-left:6px;">(${bList.length} kit)</span>
          ${destinatariHtml}
          <div style="margin-top:4px;display:flex;flex-wrap:wrap;gap:4px;">${artHtml}</div>
        </div>
        <button class="btn-segna-arrivati" data-tmpl="${tmpl.id}" data-taglia="${taglia}" data-help="kit.segnaArrivati"
          style="font-size:11px;padding:5px 10px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;cursor:pointer;color:#166534;white-space:nowrap;">
          ✅ Segna arrivati
        </button>
      </div>`;
    }).join('');

    const secFornitore = document.createElement('div');
    secFornitore.style.cssText = 'margin-top:16px;background:white;border-radius:12px;border:1px solid #fed7aa;overflow:hidden;';
    secFornitore.innerHTML = `
      <div style="padding:10px 16px;background:linear-gradient(135deg,#fff7ed,#ffedd5);display:flex;align-items:center;justify-content:space-between;">
        <span style="font-weight:700;font-size:14px;color:#c2410c;" data-help="kit.inAttesa">📦 In attesa dal fornitore</span>
        <span style="font-size:12px;color:#c2410c;">${allParziali.length} kit parziali</span>
      </div>
      ${righeFornitore}`;
    container.appendChild(secFornitore);

    secFornitore.querySelectorAll('.btn-segna-arrivati').forEach(btn => {
      btn.addEventListener('click', () => {
        const tmpl = templates.find(t => t.id === btn.dataset.tmpl);
        const taglia = btn.dataset.taglia;
        const bParziali = allParziali.filter(b => b.template_id === btn.dataset.tmpl && b.taglia === taglia);
        if (tmpl) showSegnaArrivatiModal(tmpl, taglia, bParziali);
      });
    });
  }
}

// ═══════════════════════════════════════════
// AUTO-ASSIGN BATCH
// ═══════════════════════════════════════════
async function autoAssign(tmpl) {
  const teamId = window.YFM.squadraId;
  const seasonId = window.YFM.currentSeasonId;
  const rosterPlayers = Object.values(rosterMap);

  // Giocatori con taglia che non hanno già kit completo
  const tmplAssigns = assignments.filter(a => a.kit_stock?.template_id === tmpl.id);
  const totPezzi = (tmpl.articoli || []).reduce((s, a) => s + (a.qty || 1), 0);
  const eligible = rosterPlayers.filter(p => {
    if (!p.taglia) return false;
    const assigned = (tmpl.articoli || []).reduce((s, a) => s + Math.min(tmplAssigns.filter(x => x.player_id === p.id && x.kit_stock?.articolo === a.nome).length, a.qty || 1), 0);
    return assigned < totPezzi;
  });

  if (!eligible.length) {
    showToast('Nessun giocatore idoneo (tutti hanno già kit o manca la taglia)', 'warning');
    return;
  }

  const totPezziKit = tmpl.articoli ? tmpl.articoli.reduce((s, a) => s + (a.qty || 1), 0) : 0;
  const isBundleDisponibile = b => b.pezzi_disponibili > 0 && b.pezzi_disponibili === (b.tot_pezzi || totPezziKit);

  // Per ogni giocatore trova il bundle disponibile (saccheggiati prima)
  const assignmentsPayload = [];
  const skippedNoStock = [];
  const usedBundleIds = new Set();
  for (const p of eligible) {
    const candidati = bundles
      .filter(b => b.template_id === tmpl.id && b.taglia === p.taglia &&
        !usedBundleIds.has(b.id) && isBundleDisponibile(b))
      .sort((a, b) => {
        if (a.stato === b.stato) return a.numero_kit - b.numero_kit;
        return a.stato === 'saccheggiato' ? -1 : 1;
      });
    if (!candidati.length) { skippedNoStock.push(p); continue; }
    const bundle = candidati[0];
    usedBundleIds.add(bundle.id);
    assignmentsPayload.push({ player_id: p.id, bundle_id: bundle.id });
  }

  if (!assignmentsPayload.length) {
    showToast('Nessun kit disponibile per le taglie richieste', 'warning');
    await loadKit(); // ripristina stato bundle in memoria
    return;
  }

  const body = { template_id: tmpl.id, team_id: teamId, season_id: seasonId, assignments: assignmentsPayload };
  showLoading();
  try {
    const res = await apiFetch('/kit-assignments-batch', { method: 'POST', body: JSON.stringify(body) });
    hideLoading();
    const msg = `Assegnati ${res.assigned} kit` + (res.skipped?.length ? ` (${res.skipped.length} saltati per stock insufficiente)` : '');
    showToast(msg, res.assigned > 0 ? 'success' : 'warning');
    await loadKit();
  } catch (err) {
    hideLoading();
    showToast(err.message || 'Errore assegnazione batch', 'error');
  }
}

// ═══════════════════════════════════════════
// MODAL: Configura template kit
// ═══════════════════════════════════════════
const ARTICOLI_PRECOMPILATI = [
  { nome: 'Maglia allenamento', qty: 2 },
  { nome: 'Pantaloncino allenamento', qty: 2 },
  { nome: 'Calzettoni allenamento', qty: 2 },
  { nome: 'Tuta rappresentanza', qty: 1 },
  { nome: 'Tuta allenamento', qty: 1 },
  { nome: 'Polo rappresentanza', qty: 1 },
  { nome: 'Pantaloncino rappresentanza', qty: 1 },
  { nome: 'Giubbotto', qty: 1 },
  { nome: 'K-way', qty: 1 },
  { nome: 'Zaino/Borsone', qty: 1 },
];
const ARTICOLI_PORTIERE = [
  { nome: 'Maglia portiere', qty: 2 },
  { nome: 'Pantaloncino portiere', qty: 2 },
  { nome: 'Calzettoni portiere', qty: 2 },
  { nome: 'Tuta rappresentanza', qty: 1 },
  { nome: 'Tuta allenamento', qty: 1 },
  { nome: 'Polo rappresentanza', qty: 1 },
  { nome: 'Pantaloncino rappresentanza', qty: 1 },
  { nome: 'Giubbotto', qty: 1 },
  { nome: 'K-way', qty: 1 },
  { nome: 'Zaino/Borsone', qty: 1 },
];

function getKitIcon(tmpl) {
  if (tmpl.tipo === 'portiere' || tmpl.is_portiere) return '🧤';
  if (tmpl.tipo === 'staff') return '🦺';
  const n = (tmpl.nome || '').toLowerCase();
  if (/portiere/.test(n)) return '🧤';
  if (/allenamento|training/.test(n)) return '👟';
  if (/gara|partita|match|gioco/.test(n)) return '⚽';
  if (/invernale|freddo|winter/.test(n)) return '🧥';
  if (/staff|tecnico|mister/.test(n)) return '🦺';
  return '👕';
}

function showConfigModal() {
  const workspaceId = window.YFM.activeWorkspaceId;
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:2000;display:flex;align-items:center;justify-content:center;';
  overlay.classList.add('modal-overlay');

  const existingHtml = templates.map(t => `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;background:#f8f9fa;border-radius:8px;margin-bottom:6px;">
    <div><strong style="font-size:13px;">${t.nome}</strong> <span style="font-size:11px;color:#888;">(${t.settore === 'scuola_calcio' ? 'SC' : 'SG'})</span><br><span style="font-size:12px;">${(t.articoli || []).length} articoli • ${t.numerazione || 'nessuna'}</span></div>
    <button class="btn-del-tmpl" data-id="${t.id}" style="padding:4px 8px;background:#fef2f2;border:1px solid #fecaca;border-radius:6px;font-size:11px;cursor:pointer;color:#E74C3C;">✕</button>
  </div>`).join('');

  const articoliCheckboxes = ARTICOLI_PRECOMPILATI.map((a, i) => 
    `<div class="kt-art-row" style="display:flex;align-items:center;gap:8px;padding:4px 0;">
      <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;flex:1;">
        <input type="checkbox" class="kt-art-cb" data-idx="${i}" checked> ${a.nome}
      </label>
      <div style="display:flex;align-items:center;gap:2px;">
        <button class="kt-qty-down" data-idx="${i}" style="width:22px;height:22px;border:1px solid #ddd;border-radius:4px;background:#f8f9fa;cursor:pointer;font-size:12px;line-height:1;">−</button>
        <span class="kt-qty-val" data-idx="${i}" style="font-size:12px;min-width:18px;text-align:center;font-weight:600;">${a.qty}</span>
        <button class="kt-qty-up" data-idx="${i}" style="width:22px;height:22px;border:1px solid #ddd;border-radius:4px;background:#f8f9fa;cursor:pointer;font-size:12px;line-height:1;">+</button>
      </div>
    </div>`
  ).join('');

  overlay.innerHTML = `<div style="background:white;border-radius:16px;padding:24px;max-width:500px;width:95%;box-shadow:0 20px 60px rgba(0,0,0,0.3);max-height:90vh;overflow-y:auto;">
    <div style="font-size:16px;font-weight:600;margin-bottom:16px;">⚙️ Template Kit</div>
    ${existingHtml ? `<div style="margin-bottom:16px;">${existingHtml}</div><hr style="border:none;border-top:1px solid #eee;margin:16px 0;">` : ''}
    <div style="font-size:13px;font-weight:600;margin-bottom:12px;">Nuovo template</div>
    <div style="display:grid;gap:12px;">
      <div><label style="font-size:12px;color:#666;">Nome *</label><input id="ktNome" placeholder="es. Kit Gara Under 15" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:8px;box-sizing:border-box;"></div>
      <div style="padding:8px 12px;background:#f8f9fa;border:1px solid #e5e7eb;border-radius:8px;">
        <div style="font-size:12px;color:#666;margin-bottom:6px;">Tipo kit</div>
        <div style="display:flex;gap:16px;flex-wrap:wrap;">
          <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;"><input type="radio" name="ktTipo" value="squadra" checked> 👕 Squadra</label>
          <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;"><input type="radio" name="ktTipo" value="portiere"> 🧤 Portiere</label>
          <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;"><input type="radio" name="ktTipo" value="staff"> 🦺 Staff</label>
        </div>
        <div id="ktTipoHint" style="font-size:11px;color:#888;margin-top:4px;"></div>
      </div>
      <div><label style="font-size:12px;color:#666;">Settore</label>
        <div style="display:flex;gap:12px;margin-top:4px;">
          <label style="font-size:13px;cursor:pointer;"><input type="radio" name="ktSettore" value="scuola_calcio"> Scuola Calcio (taglie 116-158)</label>
          <label style="font-size:13px;cursor:pointer;"><input type="radio" name="ktSettore" value="settore_giovanile" checked> Settore Giovanile (XS-XXL)</label>
        </div>
      </div>
      <div><label style="font-size:12px;color:#666;">Numerazione maglia</label>
        <div style="display:flex;gap:8px;margin-top:4px;flex-wrap:wrap;">
          <label style="font-size:13px;cursor:pointer;"><input type="radio" name="ktNum" value="nessuna" checked> Nessuna</label>
          <label style="font-size:13px;cursor:pointer;"><input type="radio" name="ktNum" value="libera"> Libera</label>
          <label style="font-size:13px;cursor:pointer;"><input type="radio" name="ktNum" value="sequenziale"> Sequenziale</label>
        </div>
      </div>
      <div id="ktNumStart" style="display:none;"><label style="font-size:12px;color:#666;">Numero iniziale</label><input id="ktStartN" type="number" value="13" style="width:80px;padding:8px;border:1px solid #ddd;border-radius:8px;"></div>
      <div><label style="font-size:12px;color:#666;">Articoli inclusi nel kit *</label>
        <div id="ktArtList" style="margin-top:6px;display:grid;grid-template-columns:1fr;gap:2px;">${articoliCheckboxes}</div>
        <div style="margin-top:8px;display:flex;gap:6px;align-items:center;">
          <input id="ktCustomArt" placeholder="Altro articolo..." style="flex:1;padding:6px;border:1px solid #ddd;border-radius:6px;font-size:12px;">
          <button id="ktAddCustom" style="font-size:12px;padding:5px 10px;background:#eef2ff;border:1px solid #c7d2fe;border-radius:6px;cursor:pointer;color:#4338ca;">+ Aggiungi</button>
        </div>
        <div id="ktCustomList" style="margin-top:6px;"></div>
      </div>
    </div>
    <div style="display:flex;gap:10px;margin-top:16px;justify-content:flex-end;">
      <button class="btn btn-secondary" id="ktCancel">Chiudi</button>
      <button class="btn btn-primary" id="ktSave">Salva</button>
    </div>
  </div>`;
  document.body.appendChild(overlay);

  let customArticoli = [];

  function renderCustom() {
    const cont = overlay.querySelector('#ktCustomList');
    cont.innerHTML = customArticoli.map((nome, i) => `<div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;">
      <span style="font-size:12px;">✓ ${nome}</span>
      <button class="kt-rm-custom" data-idx="${i}" style="background:none;border:none;cursor:pointer;font-size:12px;color:#E74C3C;">✕</button>
    </div>`).join('');
    cont.querySelectorAll('.kt-rm-custom').forEach(btn => btn.addEventListener('click', () => { customArticoli.splice(+btn.dataset.idx, 1); renderCustom(); }));
  }

  overlay.querySelector('#ktAddCustom').addEventListener('click', () => {
    const inp = overlay.querySelector('#ktCustomArt');
    const v = inp.value.trim();
    if (v && !customArticoli.includes(v)) { customArticoli.push(v); inp.value = ''; renderCustom(); }
  });

  // Qty spinners
  const qtys = ARTICOLI_PRECOMPILATI.map(a => a.qty);
  overlay.querySelectorAll('.kt-qty-up').forEach(btn => btn.addEventListener('click', () => {
    const i = +btn.dataset.idx;
    qtys[i] = Math.min(qtys[i] + 1, 10);
    overlay.querySelector(`.kt-qty-val[data-idx="${i}"]`).textContent = qtys[i];
  }));
  overlay.querySelectorAll('.kt-qty-down').forEach(btn => btn.addEventListener('click', () => {
    const i = +btn.dataset.idx;
    qtys[i] = Math.max(qtys[i] - 1, 1);
    overlay.querySelector(`.kt-qty-val[data-idx="${i}"]`).textContent = qtys[i];
  }));

  // Cambio tipo: pre-popola articoli
  let portiereSources = null;
  const ARTICOLI_STAFF_TMPL = [
    { nome: 'Felpa', qty: 1 },
    { nome: 'Pantalone tuta', qty: 1 },
    { nome: 'Maglia tecnica', qty: 1 },
    { nome: 'Pantaloncini', qty: 1 },
    { nome: 'Calzettoni', qty: 1 },
    { nome: 'Giacca a vento', qty: 1 },
    { nome: 'Polo rappresentanza', qty: 1 },
    { nome: 'Borsa/Zaino', qty: 1 },
    { nome: 'Giaccone invernale', qty: 1 },
  ];
  const tipoHints = { squadra: '', portiere: 'Pre-compila con articoli da portiere', staff: 'Taglie adulto (XS-XXL) • Numerazione disabilitata' };
  overlay.querySelectorAll('input[name="ktTipo"]').forEach(r => r.addEventListener('change', function() {
    overlay.querySelector('#ktTipoHint').textContent = tipoHints[this.value] || '';
    portiereSources = this.value === 'portiere' ? ARTICOLI_PORTIERE : this.value === 'staff' ? ARTICOLI_STAFF_TMPL : null;
    if (this.value === 'staff') {
      const sgRadio = overlay.querySelector('input[name="ktSettore"][value="settore_giovanile"]');
      if (sgRadio) { sgRadio.checked = true; overlay.querySelectorAll('input[name="ktSettore"]').forEach(r2 => r2.disabled = true); }
      const nessRadio = overlay.querySelector('input[name="ktNum"][value="nessuna"]');
      if (nessRadio) { nessRadio.checked = true; overlay.querySelectorAll('input[name="ktNum"]').forEach(r2 => r2.disabled = true); }
      overlay.querySelector('#ktNumStart').style.display = 'none';
    } else {
      overlay.querySelectorAll('input[name="ktSettore"], input[name="ktNum"]').forEach(r2 => r2.disabled = false);
    }
    const artList = portiereSources || ARTICOLI_PRECOMPILATI;
    const cont = overlay.querySelector('#ktArtList');
    if (!cont) return;
    cont.style.cssText = "margin-top:6px;display:grid;grid-template-columns:1fr;gap:2px;";
    cont.innerHTML = artList.map((a, i) =>
      `<div class="kt-art-row" style="display:flex;align-items:center;gap:8px;padding:4px 0;">
        <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;flex:1;">
          <input type="checkbox" class="kt-art-cb" data-idx="${i}" checked> ${a.nome}
        </label>
        <div style="display:flex;align-items:center;gap:2px;">
          <button class="kt-qty-down" data-idx="${i}" style="width:22px;height:22px;border:1px solid #ddd;border-radius:4px;background:#f8f9fa;cursor:pointer;font-size:12px;line-height:1;">−</button>
          <span class="kt-qty-val" data-idx="${i}" style="font-size:12px;min-width:18px;text-align:center;font-weight:600;">${a.qty}</span>
          <button class="kt-qty-up" data-idx="${i}" style="width:22px;height:22px;border:1px solid #ddd;border-radius:4px;background:#f8f9fa;cursor:pointer;font-size:12px;line-height:1;">+</button>
        </div>
      </div>`
    ).join('');
    // Re-bind spinners
    artList.forEach((a, i) => { qtys[i] = a.qty; });
    cont.querySelectorAll('.kt-qty-up').forEach(btn => btn.addEventListener('click', () => {
      const i = +btn.dataset.idx; qtys[i] = Math.min(qtys[i] + 1, 10);
      cont.querySelector(`.kt-qty-val[data-idx="${i}"]`).textContent = qtys[i];
    }));
    cont.querySelectorAll('.kt-qty-down').forEach(btn => btn.addEventListener('click', () => {
      const i = +btn.dataset.idx; qtys[i] = Math.max(qtys[i] - 1, 1);
      cont.querySelector(`.kt-qty-val[data-idx="${i}"]`).textContent = qtys[i];
    }));
  }));

  overlay.querySelectorAll('input[name="ktNum"]').forEach(r => r.addEventListener('change', () => {
    overlay.querySelector('#ktNumStart').style.display = r.value === 'sequenziale' && r.checked ? 'block' : 'none';
  }));

  const close = () => overlay.remove();
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  overlay.querySelector('#ktCancel').addEventListener('click', close);

  overlay.querySelectorAll('.btn-del-tmpl').forEach(btn => {
    btn.addEventListener('click', () => {
      confirmModal('Eliminare questo template kit?<br><small style="color:#888;">Verranno eliminati anche tutti i bundle e lo stock associati.</small>', async () => {
        await apiFetch('/kit-templates/' + btn.dataset.id, { method: 'DELETE' });
        close(); loadKit();
      });
    });
  });

  overlay.querySelector('#ktSave').addEventListener('click', async () => {
    const nome = overlay.querySelector('#ktNome').value.trim();
    const settore = overlay.querySelector('input[name="ktSettore"]:checked').value;
    const numerazione = overlay.querySelector('input[name="ktNum"]:checked').value;
    const numerazione_start = parseInt(overlay.querySelector('#ktStartN')?.value) || 13;
    // Raccogli articoli selezionati con quantità
    const artSrc = portiereSources || ARTICOLI_PRECOMPILATI;
    const selected = [];
    overlay.querySelectorAll('.kt-art-cb:checked').forEach(cb => {
      const i = +cb.dataset.idx;
      if (artSrc[i]) selected.push({ nome: artSrc[i].nome, qty: qtys[i] });
    });
    const allArticoli = [...selected, ...customArticoli.map(nome => ({ nome, qty: 1 }))];
    if (!nome || !allArticoli.length) { showToast('Compila nome e seleziona almeno un articolo', 'error'); return; }
    const taglie = settore === 'scuola_calcio' ? TAGLIE_SC : TAGLIE_SG;
    try {
      await apiFetch('/kit-templates', { method: 'POST', body: JSON.stringify({
        workspace_id: workspaceId, nome, settore, articoli: allArticoli, numerazione, numerazione_start, taglie,
        tipo: overlay.querySelector('input[name="ktTipo"]:checked')?.value || 'squadra'
      })});
      close(); loadKit();
      // Prompt per creare fee associata
      showFeePrompt(nome);
    } catch (err) { showToast(err.message, 'error'); }
  });
}

function showFeePrompt(kitNome) {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:2000;display:flex;align-items:center;justify-content:center;';
  overlay.classList.add('modal-overlay');
  overlay.innerHTML = `<div style="background:white;border-radius:16px;padding:24px;max-width:360px;width:95%;box-shadow:0 20px 60px rgba(0,0,0,0.3);text-align:center;">
    <div style="font-size:32px;margin-bottom:12px;">💰</div>
    <div style="font-size:14px;font-weight:600;margin-bottom:8px;">Vuoi creare una quota per questo kit?</div>
    <div style="font-size:12px;color:#666;margin-bottom:16px;">Se il kit viene pagato a parte, puoi creare una quota dedicata dalla sezione Quote.</div>
    <div style="display:flex;gap:10px;justify-content:center;">
      <button id="fpNo" class="btn btn-secondary" style="font-size:13px;">No, grazie</button>
      <button id="fpYes" class="btn btn-primary" style="font-size:13px;">Sì, vai a Quote</button>
    </div>
  </div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  overlay.querySelector('#fpNo').addEventListener('click', () => overlay.remove());
  overlay.querySelector('#fpYes').addEventListener('click', () => {
    overlay.remove();
    window.YFM.navigateTo('fees');
  });
}

// ═══════════════════════════════════════════
// MODAL: Genera Stock
// ═══════════════════════════════════════════
function showGenerateStockModal(tmpl) {
  const taglie = tmpl.taglie || (tmpl.settore === 'scuola_calcio' ? TAGLIE_SC : TAGLIE_SG);

  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:2000;display:flex;align-items:center;justify-content:center;';
  overlay.classList.add('modal-overlay');

  const taglieRows = taglie.map(t => `<div style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;">
    <span style="font-size:13px;font-weight:500;min-width:80px;">${t}</span>
    <div style="display:flex;align-items:center;gap:4px;">
      <button class="gs-down" data-taglia="${t}" style="width:28px;height:28px;border:1px solid #ddd;border-radius:6px;background:#f8f9fa;cursor:pointer;font-size:13px;font-weight:600;">−</button>
      <input class="gs-qty" data-taglia="${t}" type="number" min="0" value="0" style="width:54px;padding:4px;border:1px solid #ddd;border-radius:6px;text-align:center;font-size:13px;">
      <button class="gs-up" data-taglia="${t}" style="width:28px;height:28px;border:1px solid #ddd;border-radius:6px;background:#f8f9fa;cursor:pointer;font-size:13px;font-weight:600;">+</button>
    </div>
  </div>`).join('');

  overlay.innerHTML = `<div style="background:white;border-radius:16px;padding:24px;max-width:400px;width:95%;box-shadow:0 20px 60px rgba(0,0,0,0.3);max-height:90vh;overflow-y:auto;">
    <div style="font-size:16px;font-weight:600;margin-bottom:4px;">${getKitIcon(tmpl)} Genera Kit — ${tmpl.nome}</div>
    <div style="font-size:12px;color:#666;margin-bottom:16px;">Ogni kit include: ${(tmpl.articoli||[]).map(a=>a.nome).join(', ')}.<br>Inserisci quanti kit completi generare per taglia.</div>
    <div style="font-size:12px;font-weight:600;color:#667eea;margin-bottom:8px;">Quanti kit per taglia?</div>
    ${taglieRows}
    <div style="display:flex;gap:10px;margin-top:16px;justify-content:flex-end;">
      <button class="btn btn-secondary" id="gsCancel">Annulla</button>
      <button class="btn btn-primary" id="gsGenerate" style="background:#27AE60;">Genera</button>
    </div>
  </div>`;
  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  overlay.querySelector('#gsCancel').addEventListener('click', close);

  overlay.querySelectorAll('.gs-up').forEach(btn => {
    btn.addEventListener('click', () => {
      const inp = overlay.querySelector(`.gs-qty[data-taglia="${btn.dataset.taglia}"]`);
      inp.value = (parseInt(inp.value) || 0) + 10;
    });
  });
  overlay.querySelectorAll('.gs-down').forEach(btn => {
    btn.addEventListener('click', () => {
      const inp = overlay.querySelector(`.gs-qty[data-taglia="${btn.dataset.taglia}"]`);
      inp.value = Math.max(0, (parseInt(inp.value) || 0) - 10);
    });
  });

  overlay.querySelector('#gsGenerate').addEventListener('click', async () => {
    const inputs = overlay.querySelectorAll('.gs-qty');
    const items = [];
    inputs.forEach(inp => {
      const qty = parseInt(inp.value) || 0;
      if (qty > 0) items.push({ taglia: inp.dataset.taglia, quantita: qty });
    });
    if (!items.length) { showToast('Inserisci almeno una quantità', 'error'); return; }
    try {
      showLoading('Generazione kit...');
      const res = await apiFetch('/kit-stock/generate', { method: 'POST', body: JSON.stringify({
        workspace_id: window.YFM.activeWorkspaceId, template_id: tmpl.id, items
      })});
      hideLoading();
      close();
      showToast(`Generati ${res.bundles} kit (${res.pezzi} pezzi)`, 'success');
      loadKit();
    } catch (err) { hideLoading(); showToast(err.message, 'error'); }
  });
}

// ═══════════════════════════════════════════
// MODAL: Selezione pezzi da assegnare (con deseleziona per pezzi mancanti dal fornitore)
// ═══════════════════════════════════════════
function showPezziSelectionModal(tmpl, taglia, bundle, player, parentOverlay) {
  const articoli = tmpl.articoli || [];
  const nome = `${player.cognome || ''} ${player.nome || ''}`.trim();

  const ov = document.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:2100;display:flex;align-items:center;justify-content:center;';
  ov.classList.add('modal-overlay');

  const rows = articoli.map(art => {
    const qty = art.qty || 1;
    return Array.from({ length: qty }, (_, i) => {
      const key = qty > 1 ? `${art.nome} (${i + 1}/${qty})` : art.nome;
      return `<label style="display:flex;align-items:center;gap:10px;padding:8px 12px;background:#f8f9fa;border-radius:8px;margin-bottom:4px;cursor:pointer;">
        <input type="checkbox" class="pezzi-check" data-articolo="${art.nome}" checked style="width:16px;height:16px;accent-color:#667eea;cursor:pointer;">
        <span style="font-size:13px;">${key}</span>
      </label>`;
    }).join('');
  }).join('');

  ov.innerHTML = `<div style="background:white;border-radius:16px;padding:24px;max-width:380px;width:95%;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
    <div style="font-size:15px;font-weight:600;margin-bottom:4px;">📦 Pezzi da consegnare</div>
    <div style="font-size:12px;color:#666;margin-bottom:14px;">${nome} — Taglia ${taglia} — ${bundle.numero_maglia != null ? 'n°' + bundle.numero_maglia : 'Kit #' + bundle.numero_kit}</div>
    <div style="font-size:12px;color:#888;margin-bottom:10px;">Deseleziona i pezzi non ancora arrivati dal fornitore:</div>
    ${rows}
    <div style="margin-top:6px;padding:8px 10px;background:#fef9ec;border:1px solid #fde68a;border-radius:6px;font-size:11px;color:#92400e;">
      ⚠️ I pezzi deselezionati saranno segnati come <strong>in attesa dal fornitore</strong>
    </div>
    <div style="margin-top:16px;display:flex;gap:8px;justify-content:flex-end;">
      <button id="pezziCancel" class="btn btn-secondary" style="font-size:12px;">Annulla</button>
      <button id="pezziConfirm" class="btn btn-primary" style="font-size:12px;">Assegna kit</button>
    </div>
  </div>`;

  document.body.appendChild(ov);
  ov.querySelector('#pezziCancel').addEventListener('click', () => ov.remove());
  ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });

  ov.querySelector('#pezziConfirm').addEventListener('click', async () => {
    // Raccogli pezzi deselezionati (in attesa)
    const pezziInAttesa = [];
    ov.querySelectorAll('.pezzi-check:not(:checked)').forEach(cb => {
      const art = cb.dataset.articolo;
      if (!pezziInAttesa.includes(art)) pezziInAttesa.push(art);
    });

    try {
      showLoading('Assegnazione kit...');
      const res = await apiFetch('/kit-assignments-batch', { method: 'POST', body: JSON.stringify({
        template_id: tmpl.id, team_id: window.YFM.squadraId, season_id: window.YFM.currentSeasonId,
        assignments: [{ player_id: player.id, bundle_id: bundle.id, pezzi_in_attesa: pezziInAttesa }],
        numero_maglia: tmpl.numerazione === 'libera' ? (parseInt(parentOverlay.querySelector('#kaNumeroMaglia')?.value) || null) : null
      })});
      hideLoading();
      ov.remove();
      if (res.assigned > 0 || res.skipped?.length === 0) {
        if (pezziInAttesa.length) showToast(`Kit assegnato — ${pezziInAttesa.length} pezzi in attesa dal fornitore`, 'warning');
        else showToast('Kit assegnato', 'success');
        parentOverlay.remove();
        loadKit();
      } else {
        showToast('Kit non assegnato: ' + (res.skipped?.[0]?.reason || 'errore'), 'error');
      }
    } catch (err) { hideLoading(); showToast(err.message, 'error'); }
  });
}

// MODAL: Segna arrivati dal fornitore per taglia
// ═══════════════════════════════════════════
// MODAL: Gestisci ordine — Tipo 1 (kit completo da ordinare)
// item: { id, cognome, nome, taglia, tmpl_nome, _tipo, team_player_id?, ... }
// tmpl: kit_template
function showGestisciOrdineKitModal(item, tmpl) {
  const teamId = window.YFM.squadraId;
  const seasonId = window.YFM.currentSeasonId;
  const isStaff = item._tipo === 'staff';
  const nomePersona = `${item.cognome} ${item.nome}`;
  const taglia = item.taglia || '—';
  const articoli = (tmpl.articoli || []).map(a => a.nome);

  const ov = document.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:2100;display:flex;align-items:center;justify-content:center;';

  const checkboxes = articoli.map(a =>
    `<label style="display:flex;align-items:center;gap:8px;padding:6px 0;cursor:pointer;">
      <input type="checkbox" class="art-check" data-art="${a}" checked style="width:15px;height:15px;accent-color:#667eea;">
      <span style="font-size:13px;">${a}</span>
    </label>`
  ).join('');

  ov.innerHTML = `<div style="background:white;border-radius:16px;padding:24px;max-width:380px;width:95%;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
    <div style="font-size:15px;font-weight:600;margin-bottom:4px;">📦 Ordine arrivato</div>
    <div style="font-size:12px;color:#666;margin-bottom:16px;">${isStaff ? '🦺 ' : ''}${nomePersona} — ${tmpl.nome} <strong>${taglia}</strong></div>

    <div style="margin-bottom:14px;">
      <div style="font-size:12px;font-weight:600;color:#374151;margin-bottom:8px;">Articoli arrivati:</div>
      <div id="goArtList">${checkboxes}</div>
      <div style="margin-top:8px;display:flex;gap:8px;">
        <button id="goSelAll" style="font-size:11px;padding:3px 8px;border:1px solid #ddd;border-radius:5px;cursor:pointer;background:#f9f9f9;">Tutti</button>
        <button id="goSelNone" style="font-size:11px;padding:3px 8px;border:1px solid #ddd;border-radius:5px;cursor:pointer;background:#f9f9f9;">Nessuno</button>
      </div>
    </div>

    <div style="margin-bottom:16px;">
      <div style="font-size:12px;font-weight:600;color:#374151;margin-bottom:8px;">Azione:</div>
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin-bottom:6px;">
        <input type="radio" name="goAzione" value="assegna" checked style="accent-color:#667eea;">
        <span style="font-size:13px;">Assegna subito a ${nomePersona}</span>
      </label>
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
        <input type="radio" name="goAzione" value="stock" style="accent-color:#667eea;">
        <span style="font-size:13px;">Solo aggiungi allo stock</span>
      </label>
    </div>

    <div style="display:flex;gap:8px;justify-content:flex-end;">
      <button id="goCancel" class="btn btn-secondary" style="font-size:12px;">Annulla</button>
      <button id="goConfirm" class="btn btn-primary" style="font-size:12px;">Conferma</button>
    </div>
  </div>`;

  document.body.appendChild(ov);
  ov.querySelector('#goCancel').addEventListener('click', () => ov.remove());
  ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
  ov.querySelector('#goSelAll').addEventListener('click', () => ov.querySelectorAll('.art-check').forEach(c => c.checked = true));
  ov.querySelector('#goSelNone').addEventListener('click', () => ov.querySelectorAll('.art-check').forEach(c => c.checked = false));

  ov.querySelector('#goConfirm').addEventListener('click', async () => {
    const arrivati = [...ov.querySelectorAll('.art-check:checked')].map(c => c.dataset.art);
    if (!arrivati.length) { showToast('Seleziona almeno un articolo', 'warning'); return; }
    const assegnaSubito = ov.querySelector('input[name="goAzione"]:checked').value === 'assegna';
    try {
      showLoading('Elaborazione...');
      await apiFetch('/kit-evadi-ordine', { method: 'POST', body: JSON.stringify({
        tipo_ordine: 'kit',
        player_id: isStaff ? undefined : item.id,
        staff_id: isStaff ? item.id : undefined,
        template_id: tmpl.id,
        taglia,
        articoli_arrivati: arrivati,
        assegna_subito: assegnaSubito,
        team_id: teamId,
        season_id: seasonId
      })});
      hideLoading();
      ov.remove();
      const msg = assegnaSubito ? `Kit assegnato a ${nomePersona}` : 'Kit aggiunto allo stock';
      showToast(msg, 'success');
      loadKit();
    } catch (err) { hideLoading(); showToast(err.message, 'error'); }
  });
}

// MODAL: Gestisci ordine — Tipo 2 (pezzi sfusi in attesa sostituzione)
// item: { cognome, nome, taglia, articolo, assignment_id, bundle_id }
function showGestisciOrdinePezziModal(item) {
  // Trova il bundle parziale corrispondente
  const bundleMatch = bundles.find(b =>
    b.stato === 'parziale' &&
    (b.pezzi_in_attesa || []).includes(item.articolo) &&
    b.taglia === item.taglia
  );
  if (!bundleMatch) {
    showToast('Bundle non trovato — ricarica la pagina', 'warning');
    return;
  }

  const pezziInAttesa = bundleMatch.pezzi_in_attesa || [];
  const nomePersona = `${item.cognome} ${item.nome}`;

  const ov = document.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:2100;display:flex;align-items:center;justify-content:center;';

  const checkboxes = pezziInAttesa.map(a =>
    `<label style="display:flex;align-items:center;gap:8px;padding:6px 0;cursor:pointer;">
      <input type="checkbox" class="pz-check" data-art="${a}" ${a === item.articolo ? 'checked' : ''} style="width:15px;height:15px;accent-color:#667eea;">
      <span style="font-size:13px;">${a}</span>
    </label>`
  ).join('');

  ov.innerHTML = `<div style="background:white;border-radius:16px;padding:24px;max-width:380px;width:95%;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
    <div style="font-size:15px;font-weight:600;margin-bottom:4px;">🔄 Pezzi arrivati</div>
    <div style="font-size:12px;color:#666;margin-bottom:4px;">${nomePersona} — Taglia <strong>${item.taglia || '—'}</strong></div>
    <div style="font-size:11px;color:#888;margin-bottom:14px;">Spunta i pezzi arrivati. Quelli non spuntati restano in attesa.</div>
    <div id="pzArtList">${checkboxes}</div>
    <div style="margin-top:16px;display:flex;gap:8px;justify-content:flex-end;">
      <button id="pzCancel" class="btn btn-secondary" style="font-size:12px;">Annulla</button>
      <button id="pzConfirm" class="btn btn-primary" style="font-size:12px;">Conferma</button>
    </div>
  </div>`;

  document.body.appendChild(ov);
  ov.querySelector('#pzCancel').addEventListener('click', () => ov.remove());
  ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });

  ov.querySelector('#pzConfirm').addEventListener('click', async () => {
    const arrivati = [...ov.querySelectorAll('.pz-check:checked')].map(c => c.dataset.art);
    if (!arrivati.length) { showToast('Seleziona almeno un pezzo', 'warning'); return; }
    try {
      showLoading('Elaborazione...');
      await apiFetch('/kit-evadi-ordine', { method: 'POST', body: JSON.stringify({
        tipo_ordine: 'pezzi',
        bundle_id: bundleMatch.id,
        template_id: bundleMatch.template_id,
        taglia: item.taglia,
        articoli_arrivati: arrivati
      })});
      hideLoading();
      ov.remove();
      showToast('Pezzi registrati come arrivati', 'success');
      loadKit();
    } catch (err) { hideLoading(); showToast(err.message, 'error'); }
  });
}

function showSegnaArrivatiModal(tmpl, taglia, bundleParziali) {
  // Raggruppa articoli in attesa con conteggio max per articolo
  const articoliCount = {};
  bundleParziali.forEach(b => {
    (b.pezzi_in_attesa || []).forEach(art => {
      articoliCount[art] = (articoliCount[art] || 0) + 1;
    });
  });
  const articoliList = Object.entries(articoliCount);
  if (!articoliList.length) return;

  const ov = document.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:2100;display:flex;align-items:center;justify-content:center;';
  ov.classList.add('modal-overlay');

  const rows = articoliList.map(([art, maxQty]) =>
    `<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:#f8f9fa;border-radius:8px;margin-bottom:4px;">
      <span style="font-size:13px;">${art}</span>
      <div style="display:flex;align-items:center;gap:8px;">
        <span style="font-size:11px;color:#888;">max ${maxQty}</span>
        <button class="sa-down" data-art="${art}" style="width:26px;height:26px;border:1px solid #ddd;border-radius:6px;background:white;cursor:pointer;font-size:14px;">−</button>
        <span class="sa-val" data-art="${art}" style="min-width:24px;text-align:center;font-weight:600;font-size:13px;">0</span>
        <button class="sa-up" data-art="${art}" data-max="${maxQty}" style="width:26px;height:26px;border:1px solid #ddd;border-radius:6px;background:white;cursor:pointer;font-size:14px;">+</button>
      </div>
    </div>`
  ).join('');

  ov.innerHTML = `<div style="background:white;border-radius:16px;padding:24px;max-width:380px;width:95%;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
    <div style="font-size:15px;font-weight:600;margin-bottom:4px;">✅ Segna arrivati dal fornitore</div>
    <div style="font-size:12px;color:#666;margin-bottom:14px;">Taglia ${taglia} — ${bundleParziali.length} kit in attesa</div>
    <div style="font-size:12px;color:#888;margin-bottom:10px;">Indica quanti pezzi sono arrivati per ogni articolo:</div>
    ${rows}
    <div style="margin-top:16px;display:flex;gap:8px;justify-content:flex-end;">
      <button id="saCancel" class="btn btn-secondary" style="font-size:12px;">Annulla</button>
      <button id="saConfirm" class="btn btn-primary" style="font-size:12px;">Conferma</button>
    </div>
  </div>`;

  document.body.appendChild(ov);
  ov.querySelector('#saCancel').addEventListener('click', () => ov.remove());
  ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });

  // Contatori +/-
  ov.querySelectorAll('.sa-up').forEach(btn => {
    btn.addEventListener('click', () => {
      const art = btn.dataset.art;
      const max = parseInt(btn.dataset.max);
      const valEl = ov.querySelector(`.sa-val[data-art="${art}"]`);
      const cur = parseInt(valEl.textContent);
      if (cur < max) valEl.textContent = cur + 1;
    });
  });
  ov.querySelectorAll('.sa-down').forEach(btn => {
    btn.addEventListener('click', () => {
      const art = btn.dataset.art;
      const valEl = ov.querySelector(`.sa-val[data-art="${art}"]`);
      const cur = parseInt(valEl.textContent);
      if (cur > 0) valEl.textContent = cur - 1;
    });
  });

  ov.querySelector('#saConfirm').addEventListener('click', async () => {
    const articoli_quantita = [];
    ov.querySelectorAll('.sa-val').forEach(el => {
      const q = parseInt(el.textContent);
      if (q > 0) articoli_quantita.push({ articolo: el.dataset.art, quantita: q });
    });
    if (!articoli_quantita.length) { showToast('Nessun pezzo selezionato', 'warning'); return; }
    try {
      showLoading('Aggiornamento...');
      await apiFetch('/kit-bundles/segna-arrivati', { method: 'PUT', body: JSON.stringify({
        template_id: tmpl.id, taglia, articoli_quantita
      })});
      hideLoading();
      ov.remove();
      showToast('Pezzi segnati come arrivati', 'success');
      loadKit();
    } catch (err) { hideLoading(); showToast(err.message, 'error'); }
  });
}

// MODAL: Sostituzione pezzo
// ═══════════════════════════════════════════
function showSostituzioneModal(assignment, tmpl, playerNome, onDone) {
  const articoli = (tmpl.articoli || []).map(a => a.nome);
  // Articoli già assegnati a questo giocatore per questo template
  const playerAssigns = assignments.filter(a => a.player_id === assignment.player_id && a.kit_stock?.template_id === tmpl.id);

  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:3000;display:flex;align-items:center;justify-content:center;';
  overlay.classList.add('modal-overlay');
  overlay.innerHTML = `<div style="background:white;border-radius:16px;padding:24px;max-width:380px;width:95%;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
    <div style="font-size:15px;font-weight:600;margin-bottom:4px;">🔄 Sostituisci pezzo</div>
    <div style="font-size:12px;color:#666;margin-bottom:16px;">${playerNome} — ${tmpl.nome}</div>
    <div style="display:grid;gap:10px;">
      <div>
        <label style="font-size:12px;color:#666;">Articolo da sostituire *</label>
        <select id="sostArt" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:8px;font-size:13px;margin-top:4px;box-sizing:border-box;">
          ${playerAssigns.map(a => `<option value="${a.id}" data-art="${a.kit_stock?.articolo}">${a.kit_stock?.articolo}${a.kit_stock?.taglia ? ' (' + a.kit_stock.taglia + ')' : ''}</option>`).join('')}
        </select>
      </div>
      <div>
        <label style="font-size:12px;color:#666;">Motivo *</label>
        <div style="display:flex;gap:8px;margin-top:4px;">
          <label style="font-size:13px;cursor:pointer;"><input type="radio" name="sostMotivo" value="perso" checked> Perso</label>
          <label style="font-size:13px;cursor:pointer;"><input type="radio" name="sostMotivo" value="danneggiato"> Danneggiato</label>
        </div>
      </div>
      <div>
        <label style="font-size:12px;color:#666;">Costo addebitato (opzionale)</label>
        <input id="sostCosto" type="number" min="0" step="0.01" placeholder="es. 15.00" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:8px;font-size:13px;margin-top:4px;box-sizing:border-box;">
      </div>
      <div>
        <label style="font-size:12px;color:#666;">Note</label>
        <input id="sostNote" placeholder="es. Persa durante trasferta" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:8px;font-size:13px;margin-top:4px;box-sizing:border-box;">
      </div>
    </div>
    <div style="display:flex;gap:10px;margin-top:16px;justify-content:flex-end;">
      <button class="btn btn-secondary" id="sostCancel">Annulla</button>
      <button class="btn btn-primary" id="sostConfirm">🔄 Sostituisci</button>
    </div>
  </div>`;
  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  overlay.querySelector('#sostCancel').addEventListener('click', close);

  overlay.querySelector('#sostConfirm').addEventListener('click', async () => {
    const sel = overlay.querySelector('#sostArt');
    const assignmentId = sel.value;
    const articolo = sel.options[sel.selectedIndex]?.dataset.art;
    const motivo = overlay.querySelector('input[name="sostMotivo"]:checked').value;
    const costo = parseFloat(overlay.querySelector('#sostCosto').value) || null;
    const note = overlay.querySelector('#sostNote').value.trim() || null;
    if (!assignmentId || !articolo) return;
    try {
      showLoading('Sostituzione in corso...');
      const res = await apiFetch('/kit-assignments/' + assignmentId + '/sostituisci', {
        method: 'POST', body: JSON.stringify({ articolo, motivo, note, costo })
      });
      hideLoading();
      close();
      if (res.sostituto) {
        showToast(`✅ Pezzo sostituito${res.bundle_saccheggiato ? ' da ' + res.bundle_saccheggiato : ''}`, 'success');
      } else {
        showToast('⚠️ Nessun pezzo disponibile in magazzino — aggiunto in lista attesa. Vai a Magazzino per riordinare.', 'warning');
      }
      onDone();
    } catch (err) { hideLoading(); showToast(err.message, 'error'); }
  });
}

// ═══════════════════════════════════════════
// MODAL: Assegnazione kit a giocatore
// ═══════════════════════════════════════════
function showAssignModal(tmpl, player) {
  const nome = `${player.cognome || ''} ${player.nome || ''}`.trim();
  const articoli = tmpl.articoli || [];
  const playerAssigns = assignments.filter(a => a.player_id === player.id && a.kit_stock?.template_id === tmpl.id);
  const assignedStockIds = new Set(playerAssigns.map(a => a.kit_stock_id));
  const taglie = tmpl.taglie || (tmpl.settore === 'scuola_calcio' ? TAGLIE_SC : TAGLIE_SG);

  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:2000;display:flex;align-items:center;justify-content:center;';
  overlay.classList.add('modal-overlay');

  function renderModal() {
    const defaultTaglia = player.taglia || '';
    const taglieOpts = taglie.map(t => `<option value="${t}"${t === defaultTaglia ? ' selected' : ''}>${t}</option>`).join('');

    // Per ogni articolo, conta quanti pezzi assegnati vs qty richiesta
    let rows = articoli.map(art => {
      const qty = art.qty || 1;
      const artAssigns = playerAssigns.filter(a => a.kit_stock?.articolo === art.nome);
      const nAssegnati = artAssigns.length;
      const tuttiAssegnati = nAssegnati >= qty;

      if (tuttiAssegnati) {
        const numeri = artAssigns.map(a => a.kit_stock?.numero).filter(Boolean);
        const tagliaLabel = artAssigns[0]?.kit_stock?.taglia ? ` (${artAssigns[0].kit_stock.taglia})` : '';
        const numLabel = numeri.length ? ' #' + numeri.join(', #') : '';
        const removeButtons = isAdmin ? artAssigns.map(a =>
          `<button class="ka-remove" data-id="${a.id}" style="font-size:10px;padding:3px 6px;background:#fee2e2;border:1px solid #fecaca;border-radius:4px;cursor:pointer;color:#dc2626;">✕</button>`
        ).join('') : '';
        return `<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:#d1fae5;border-radius:8px;margin-bottom:4px;">
          <div><span style="font-size:13px;">✅ ${art.nome}</span>${qty > 1 ? ` <span style="font-size:11px;color:#166534;font-weight:600;">x${qty}</span>` : ''}${tagliaLabel ? `<span style="color:#888;font-size:11px;">${tagliaLabel}</span>` : ''}${numLabel ? `<span style="color:#888;font-size:11px;">${numLabel}</span>` : ''}</div>
          <div style="display:flex;gap:4px;">${removeButtons}</div>
        </div>`;
      }
      // Parzialmente assegnato (es. 1/2 maglie)
      if (nAssegnati > 0) {
        return `<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:#fef9ec;border-radius:8px;margin-bottom:4px;">
          <span style="font-size:13px;">⚠️ ${art.nome} <span style="font-size:11px;color:#92400e;">${nAssegnati}/${qty}</span></span>
        </div>`;
      }
      // Non assegnato
      return `<div style="display:flex;align-items:center;padding:8px 12px;background:#f8f9fa;border-radius:8px;margin-bottom:4px;">
        <span style="font-size:13px;color:#888;">⬜ ${art.nome}</span>${qty > 1 ? ` <span style="font-size:11px;color:#aaa;">x${qty}</span>` : ''}
      </div>`;
    }).join('');

    // Kit completo = tutti gli articoli con qty soddisfatta
    const totalePezzi = articoli.reduce((s, a) => s + (a.qty || 1), 0);
    const assegnatiTotali = articoli.reduce((s, a) => s + Math.min(playerAssigns.filter(x => x.kit_stock?.articolo === a.nome).length, a.qty || 1), 0);
    const unassignedCount = totalePezzi - assegnatiTotali;

    // Controlla se i pezzi mancanti sono in attesa dal fornitore (bundle parziale)
    const bundleAssegnato = bundles.find(b =>
      b.template_id === tmpl.id && b.stato === 'parziale' &&
      (b.pezzi_in_attesa || []).length > 0 &&
      playerAssigns.some(a => a.bundle_id_originale === b.id)
    );
    const pezziInAttesaFornitore = bundleAssegnato?.pezzi_in_attesa || [];
    // Pezzi davvero mancanti = non assegnati E non in attesa dal fornitore
    const unassignedReal = unassignedCount - pezziInAttesaFornitore.length;

    const stockInfo = unassignedReal > 0
      ? (() => {
          const taglia = player.taglia || '';
          const totPK = tmpl.articoli ? tmpl.articoli.reduce((s, a) => s + (a.qty || 1), 0) : 0;
          const nDisp = taglia ? bundles.filter(b => b.template_id === tmpl.id && b.taglia === taglia &&
            b.pezzi_disponibili > 0 && b.pezzi_disponibili === (b.tot_pezzi || totPK)).length : null;
          if (nDisp === null) return `<div id="kaStockInfo" style="padding:8px 12px;background:#f8f9fa;border:1px solid #eee;border-radius:8px;margin-bottom:10px;font-size:12px;color:#888;">Seleziona una taglia per vedere la disponibilità</div>`;
          if (nDisp > 0) return `<div id="kaStockInfo" style="padding:8px 12px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;margin-bottom:10px;font-size:12px;color:#166534;">✅ ${nDisp} kit taglia ${taglia} disponibili in magazzino</div>`;
          return `<div id="kaStockInfo" style="padding:8px 12px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;margin-bottom:10px;font-size:12px;color:#E74C3C;">❌ Nessun kit taglia ${taglia} disponibile in magazzino
            ${isAdmin ? `<label style="display:flex;align-items:center;gap:6px;margin-top:6px;cursor:pointer;color:#333;font-size:12px;">
              <input type="checkbox" id="kaOrdinare" ${player.da_ordinare_kit ? 'checked' : ''} style="width:16px;height:16px;accent-color:#667eea;cursor:pointer;">
              Segna da ordinare per questo giocatore
            </label>` : ''}</div>`;
        })()
      : pezziInAttesaFornitore.length > 0
        ? `<div style="padding:8px 12px;background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;margin-bottom:10px;font-size:12px;color:#c2410c;">📦 Kit parziale — in attesa dal fornitore: <strong>${pezziInAttesaFornitore.join(', ')}</strong></div>`
        : '';

    // Mostra bottone assegna solo se ci sono pezzi davvero mancanti (non in attesa fornitore)
    const showAssignBtn = isAdmin && unassignedReal > 0;

    // Storico sostituzioni (da tutti gli assignment del giocatore per questo template)
    const tuttiSost = playerAssigns.flatMap(a => a.sostituzioni || []);
    const sostHtml = tuttiSost.length ? `<div style="margin-top:12px;padding:10px 12px;background:#fef9ec;border:1px solid #fde68a;border-radius:8px;">
      <div style="font-size:11px;font-weight:600;color:#92400e;margin-bottom:6px;">🔄 Storico sostituzioni (${tuttiSost.length})</div>
      ${tuttiSost.map(s => `<div style="font-size:11px;color:#666;padding:2px 0;">
        ${s.data} — <strong>${s.articolo}</strong> ${s.motivo === 'perso' ? 'perso' : 'danneggiato'}
        ${s.stato === 'in_attesa' ? '<span style="color:#E74C3C;"> — in attesa stock</span>' : '<span style="color:#27AE60;"> — sostituito</span>'}
        ${s.costo ? ` — €${s.costo}` : ''}
        ${s.note ? ` — ${s.note}` : ''}
      </div>`).join('')}
    </div>` : '';

    overlay.innerHTML = `<div style="background:white;border-radius:16px;padding:24px;max-width:420px;width:95%;box-shadow:0 20px 60px rgba(0,0,0,0.3);max-height:90vh;overflow-y:auto;">
      <div style="font-size:16px;font-weight:600;margin-bottom:4px;">👕 ${nome}</div>
      <div style="font-size:12px;color:#666;margin-bottom:12px;">${tmpl.nome}${player.taglia ? ' • Taglia: ' + player.taglia : ''}</div>
      ${stockInfo}
      ${showAssignBtn ? `<div style="display:flex;align-items:center;gap:8px;padding:10px 12px;background:#eef2ff;border-radius:8px;margin-bottom:12px;border:1px solid #c7d2fe;">
        <select id="kaGlobalTaglia" style="padding:5px 8px;border:1px solid #c7d2fe;border-radius:6px;font-size:12px;"><option value="">Taglia...</option>${taglieOpts}</select>
        ${tmpl.numerazione === 'libera' ? '<input id="kaNumeroMaglia" type="number" min="1" max="99" placeholder="n\u00b0" title="Numero maglia" style="width:54px;padding:5px 6px;border:1px solid #c7d2fe;border-radius:6px;font-size:12px;text-align:center;">' : ''}
        <button id="kaAssignAll" style="flex:1;padding:6px 12px;background:#667eea;color:white;border:none;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;">Assegna kit</button>
      </div>` : ''}
      ${rows}
      ${sostHtml}
      <div style="margin-top:16px;display:flex;justify-content:space-between;align-items:center;">
        ${isAdmin && playerAssigns.length > 0 ? `<button class="btn btn-secondary" id="kaSostituisci" style="font-size:12px;">🔄 Sostituisci pezzo</button>` : '<span></span>'}
        <button class="btn btn-secondary" id="kaClose">Chiudi</button>
      </div>
    </div>`;

    // Bindings
    overlay.querySelector('#kaClose').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

    // Checkbox da ordinare (handler centralizzato — usato anche dal rebind nel banner)
    const handleDaOrdinare = async (checked) => {
      const taglia = overlay.querySelector('#kaGlobalTaglia')?.value || player.taglia || null;
      try {
        await apiFetch('/kit-da-ordinare', { method: 'PUT', body: JSON.stringify({
          team_player_id: player.team_player_id, da_ordinare: checked, taglia: checked ? taglia : undefined
        })});
        player.da_ordinare_kit = checked;
        if (taglia && checked) player.taglia = taglia;
        if (rosterMap[player.id]) {
          rosterMap[player.id].da_ordinare_kit = checked;
          if (taglia && checked) rosterMap[player.id].taglia = taglia;
        }
        showToast(checked ? '🛒 Giocatore segnato da ordinare' : 'Segnalazione rimossa', checked ? 'success' : 'info');
        if (currentFilter !== 'magazzino') renderCards(currentFilter);
      } catch (err) { showToast(err.message, 'error'); }
    };
    overlay.querySelector('#kaOrdinare')?.addEventListener('change', (e) => handleDaOrdinare(e.target.checked));

    // Bottone sostituzione
    overlay.querySelector('#kaSostituisci')?.addEventListener('click', () => {
      // Passa il primo assignment disponibile (il modale sostituzione sceglie l'articolo)
      showSostituzioneModal(playerAssigns[0], tmpl, nome, () => { overlay.remove(); loadKit(); });
    });

    // Global taglia changes: aggiorna banner stock disponibile
    overlay.querySelector('#kaGlobalTaglia')?.addEventListener('change', (e) => {
      const taglia = e.target.value;
      if (!taglia) return;
      const totPK = tmpl.articoli ? tmpl.articoli.reduce((s, a) => s + (a.qty || 1), 0) : 0;
      const nDisp = bundles.filter(b => b.template_id === tmpl.id && b.taglia === taglia &&
        b.pezzi_disponibili > 0 && b.pezzi_disponibili === (b.tot_pezzi || totPK)).length;
      const banner = overlay.querySelector('#kaStockInfo');
      if (banner) {
        if (nDisp > 0) {
          banner.style.background = '#f0fdf4'; banner.style.borderColor = '#bbf7d0'; banner.style.color = '#166534';
          banner.innerHTML = `✅ ${nDisp} kit taglia ${taglia} disponibili in magazzino`;
        } else {
          banner.style.background = '#fef2f2'; banner.style.borderColor = '#fecaca'; banner.style.color = '#E74C3C';
          banner.innerHTML = `❌ Nessun kit taglia ${taglia} disponibile in magazzino
            ${isAdmin ? `<label style="display:flex;align-items:center;gap:6px;margin-top:6px;cursor:pointer;color:#333;font-size:12px;">
              <input type="checkbox" id="kaOrdinare" ${player.da_ordinare_kit ? 'checked' : ''} style="width:16px;height:16px;accent-color:#667eea;cursor:pointer;">
              Segna da ordinare per questo giocatore
            </label>` : ''}`;
          // Rebind checkbox — semplice toggle senza confirmModal
          banner.querySelector('#kaOrdinare')?.addEventListener('change', (ev) => {
            handleDaOrdinare(ev.target.checked);
          });
        }
      }
    });

    // Assign all unassigned at once — trova bundle dal frontend e passa bundle_id al backend
    overlay.querySelector('#kaAssignAll')?.addEventListener('click', async () => {
      const taglia = overlay.querySelector('#kaGlobalTaglia')?.value || player.taglia;
      if (!taglia) { showToast('Seleziona una taglia', 'error'); return; }
      // Trova primo bundle completo disponibile per la taglia (saccheggiati prima)
      const totPK3 = tmpl.articoli ? tmpl.articoli.reduce((s, a) => s + (a.qty || 1), 0) : 0;
      const candidati = bundles
        .filter(b => b.template_id === tmpl.id && b.taglia === taglia &&
          b.pezzi_disponibili > 0 && b.pezzi_disponibili === (b.tot_pezzi || totPK3))
        .sort((a, b) => {
          if (a.stato === b.stato) return a.numero_kit - b.numero_kit;
          return a.stato === 'saccheggiato' ? -1 : 1;
        });
      if (!candidati.length) {
        // Nessun kit disponibile
        if (isAdmin) {
          const giaSegnato = overlay.querySelector('#kaOrdinare')?.checked || player.da_ordinare_kit;
          if (giaSegnato) {
            overlay.remove();
          } else {
            confirmModal(
              `Nessun kit taglia ${taglia} disponibile in magazzino.<br><br>Vuoi segnare questo giocatore come <strong>da ordinare</strong>?`,
              async () => { await handleDaOrdinare(true); overlay.remove(); },
              { danger: false, confirmLabel: 'Segna da ordinare' }
            );
          }
        } else {
          showToast('Nessun kit completo disponibile per taglia ' + taglia, 'error');
        }
        return;
      }
      const bundle = candidati[0];
      // Mostra modal selezione pezzi (tutti spuntati di default, deseleziona quelli mancanti)
      showPezziSelectionModal(tmpl, taglia, bundle, player, overlay);
    });

    // Remove assegnazione
    overlay.querySelectorAll('.ka-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        confirmModal('Rimuovere questo pezzo dal kit del giocatore?', async () => {
          try {
            showLoading('Rimozione...');
            await apiFetch('/kit-assignments/' + btn.dataset.id, { method: 'DELETE' });
            hideLoading();
            overlay.remove();
            loadKit();
          } catch (err) { hideLoading(); showToast(err.message, 'error'); }
        });
      });
    });
  }

  document.body.appendChild(overlay);
  renderModal();
}

function showAssignStaffModal(tmpl, staff) {
  const nome = `${staff.cognome || ''} ${staff.nome || ''}`.trim();
  const articoli = tmpl.articoli || [];
  const totArticoli = articoli.reduce((s, a) => s + (a.qty || 1), 0);
  const sAssigns = staffAssignments.filter(a => a.staff_id === staff.id && a.kit_stock?.template_id === tmpl.id);
  const taglie = tmpl.taglie || (tmpl.settore === 'scuola_calcio' ? TAGLIE_SC : TAGLIE_SG);
  const teamId = window.YFM.squadraId;
  const seasonId = window.YFM.currentSeasonId;

  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:2000;display:flex;align-items:center;justify-content:center;';
  overlay.classList.add('modal-overlay');

  function renderModal() {
    const defaultTaglia = sAssigns[0]?.kit_stock?.taglia || staff.taglia || '';
    const taglieOpts = taglie.map(t => `<option value="${t}"${t === defaultTaglia ? ' selected' : ''}>${t}</option>`).join('');
    const assegnatiTotali = articoli.reduce((s, a) => s + Math.min(sAssigns.filter(x => x.kit_stock?.articolo === a.nome).length, a.qty || 1), 0);
    const unassigned = totArticoli - assegnatiTotali;

    const rows = articoli.map(art => {
      const qty = art.qty || 1;
      const artAssigns = sAssigns.filter(a => a.kit_stock?.articolo === art.nome);
      const nAss = artAssigns.length;
      if (nAss >= qty) {
        const tagliaLabel = artAssigns[0]?.kit_stock?.taglia ? ` (${artAssigns[0].kit_stock.taglia})` : '';
        const removeButtons = isAdmin ? artAssigns.map(a =>
          `<button class="ka-remove" data-id="${a.id}" style="font-size:10px;padding:3px 6px;background:#fee2e2;border:1px solid #fecaca;border-radius:4px;cursor:pointer;color:#dc2626;">✕</button>`
        ).join('') : '';
        return `<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:#d1fae5;border-radius:8px;margin-bottom:4px;">
          <span style="font-size:13px;">✅ ${art.nome}${tagliaLabel ? `<span style="color:#888;font-size:11px;">${tagliaLabel}</span>` : ''}</span>
          <div style="display:flex;gap:4px;">${removeButtons}</div>
        </div>`;
      }
      if (nAss > 0) return `<div style="padding:8px 12px;background:#fef9ec;border-radius:8px;margin-bottom:4px;font-size:13px;">⚠️ ${art.nome} <span style="font-size:11px;color:#92400e;">${nAss}/${qty}</span></div>`;
      return `<div style="padding:8px 12px;background:#f8f9fa;border-radius:8px;margin-bottom:4px;font-size:13px;color:#888;">⬜ ${art.nome}</div>`;
    }).join('');

    // Stock disponibile per taglia selezionata
    const totPK = totArticoli;
    const nDisp = defaultTaglia ? bundles.filter(b => b.template_id === tmpl.id && b.taglia === defaultTaglia &&
      b.pezzi_disponibili > 0 && b.pezzi_disponibili === (b.tot_pezzi || totPK)).length : null;
    const stockInfo = unassigned > 0 ? (
      nDisp === null ? `<div id="kaStockInfo" style="padding:8px 12px;background:#f8f9fa;border:1px solid #eee;border-radius:8px;margin-bottom:10px;font-size:12px;color:#888;">Seleziona una taglia per vedere la disponibilità</div>` :
      nDisp > 0 ? `<div id="kaStockInfo" style="padding:8px 12px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;margin-bottom:10px;font-size:12px;color:#166534;">✅ ${nDisp} kit taglia ${defaultTaglia} disponibili</div>` :
      `<div id="kaStockInfo" style="padding:8px 12px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;margin-bottom:10px;font-size:12px;color:#E74C3C;">❌ Nessun kit taglia ${defaultTaglia} disponibile
            ${isAdmin ? `<label style="display:flex;align-items:center;gap:6px;margin-top:6px;cursor:pointer;color:#333;font-size:12px;">
              <input type="checkbox" id="kaStaffOrdinare" ${staff.da_ordinare_kit ? 'checked' : ''} style="width:16px;height:16px;accent-color:#667eea;cursor:pointer;">
              Segna da ordinare per questo membro dello staff
            </label>` : ''}</div>`
    ) : '';

    overlay.innerHTML = `<div style="background:white;border-radius:16px;padding:24px;max-width:420px;width:95%;box-shadow:0 20px 60px rgba(0,0,0,0.3);max-height:90vh;overflow-y:auto;">
      <div style="font-size:16px;font-weight:600;margin-bottom:4px;">🦺 ${nome}</div>
      <div style="font-size:12px;color:#666;margin-bottom:12px;">${tmpl.nome} • ${staff.ruolo || 'Staff'}${staff.taglia ? ' • Taglia: ' + staff.taglia : ''}</div>
      ${stockInfo}
      ${isAdmin && unassigned > 0 ? `<div style="display:flex;align-items:center;gap:8px;padding:10px 12px;background:#eef2ff;border-radius:8px;margin-bottom:12px;border:1px solid #c7d2fe;">
        <select id="kaStaffTaglia" style="padding:5px 8px;border:1px solid #c7d2fe;border-radius:6px;font-size:12px;"><option value="">Taglia...</option>${taglieOpts}</select>
        ${tmpl.numerazione === 'libera' ? '<input id="kaStaffNumero" type="number" min="1" max="99" placeholder="n°" style="width:54px;padding:5px 6px;border:1px solid #c7d2fe;border-radius:6px;font-size:12px;text-align:center;">' : ''}
        <button id="kaStaffAssign" style="flex:1;padding:6px 12px;background:#667eea;color:white;border:none;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;">Assegna kit</button>
      </div>` : ''}
      ${rows}
      <div style="margin-top:16px;display:flex;justify-content:flex-end;">
        <button class="btn btn-secondary" id="kaStaffClose">Chiudi</button>
      </div>
    </div>`;

    overlay.querySelector('#kaStaffClose').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

    // Checkbox da ordinare staff
    overlay.querySelector('#kaStaffOrdinare')?.addEventListener('change', async (e) => {
      const taglia = overlay.querySelector('#kaStaffTaglia')?.value || staff.taglia || null;
      try {
        await apiFetch('/kit-da-ordinare', { method: 'PUT', body: JSON.stringify({
          staff_id: staff.id, da_ordinare: e.target.checked, taglia: e.target.checked ? taglia : undefined
        })});
        staff.da_ordinare_kit = e.target.checked;
        if (taglia && e.target.checked) staff.taglia = taglia;
        if (staffMap[staff.id]) { staffMap[staff.id].da_ordinare_kit = e.target.checked; if (taglia && e.target.checked) staffMap[staff.id].taglia = taglia; }
        showToast(e.target.checked ? '🛒 Staff segnato da ordinare' : 'Segnalazione rimossa', e.target.checked ? 'success' : 'info');
        renderCards(currentFilter);
      } catch (err) { showToast(err.message, 'error'); }
    });

    // Aggiorna stock info al cambio taglia
    overlay.querySelector('#kaStaffTaglia')?.addEventListener('change', (e) => {
      const taglia = e.target.value;
      const info = overlay.querySelector('#kaStockInfo');
      if (!info || !taglia) return;
      const n = bundles.filter(b => b.template_id === tmpl.id && b.taglia === taglia &&
        b.pezzi_disponibili > 0 && b.pezzi_disponibili === (b.tot_pezzi || totPK)).length;
      if (n > 0) { info.style.background = '#f0fdf4'; info.style.borderColor = '#bbf7d0'; info.style.color = '#166534'; info.textContent = `✅ ${n} kit taglia ${taglia} disponibili`; }
      else { info.style.background = '#fef2f2'; info.style.borderColor = '#fecaca'; info.style.color = '#E74C3C';
        info.innerHTML = `❌ Nessun kit taglia ${taglia} disponibile
          ${isAdmin ? `<label style="display:flex;align-items:center;gap:6px;margin-top:6px;cursor:pointer;color:#333;font-size:12px;">
            <input type="checkbox" id="kaStaffOrdinare" ${staff.da_ordinare_kit ? 'checked' : ''} style="width:16px;height:16px;accent-color:#667eea;cursor:pointer;">
            Segna da ordinare per questo membro dello staff
          </label>` : ''}`;
        info.querySelector('#kaStaffOrdinare')?.addEventListener('change', async (ev) => {
          try {
            await apiFetch('/kit-da-ordinare', { method: 'PUT', body: JSON.stringify({ staff_id: staff.id, da_ordinare: ev.target.checked, taglia: ev.target.checked ? taglia : undefined }) });
            staff.da_ordinare_kit = ev.target.checked;
            if (staffMap[staff.id]) { staffMap[staff.id].da_ordinare_kit = ev.target.checked; if (taglia && ev.target.checked) staffMap[staff.id].taglia = taglia; }
            showToast(ev.target.checked ? '🛒 Staff segnato da ordinare' : 'Segnalazione rimossa', ev.target.checked ? 'success' : 'info');
            renderCards(currentFilter);
          } catch (err) { showToast(err.message, 'error'); }
        });
      }
    });

    // Assegna kit staff
    overlay.querySelector('#kaStaffAssign')?.addEventListener('click', async () => {
      const taglia = overlay.querySelector('#kaStaffTaglia')?.value;
      const numeroMaglia = overlay.querySelector('#kaStaffNumero')?.value || null;
      if (!taglia) { showToast('Seleziona una taglia', 'error'); return; }
      const totPK2 = totArticoli;
      const bundle = bundles.find(b => b.template_id === tmpl.id && b.taglia === taglia &&
        b.pezzi_disponibili > 0 && b.pezzi_disponibili === (b.tot_pezzi || totPK2));
      if (!bundle) {
        // Se già segnato da ordinare, chiudi con messaggio informativo
        const giaSegnato = overlay.querySelector('#kaStaffOrdinare')?.checked || staff.da_ordinare_kit;
        if (giaSegnato) { showToast('🛒 Segnato da ordinare — kit verrà assegnato quando lo stock sarà disponibile', 'info'); overlay.remove(); return; }
        showToast('Nessun kit disponibile per questa taglia', 'error'); return;
      }
      try {
        showLoading('Assegnazione...');
        await apiFetch('/kit-assignments-batch', { method: 'POST', body: JSON.stringify({
          template_id: tmpl.id, team_id: teamId, season_id: seasonId, is_staff: true,
          numero_maglia: numeroMaglia ? parseInt(numeroMaglia) : null,
          assignments: [{ staff_id: staff.id, bundle_id: bundle.id, taglia }]
        })});
        hideLoading();
        overlay.remove();
        showToast('Kit assegnato a ' + nome, 'success');
        loadKit();
      } catch (err) { hideLoading(); showToast(err.message, 'error'); }
    });

    // Rimuovi pezzo
    overlay.querySelectorAll('.ka-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        confirmModal('Rimuovere questo pezzo dal kit dello staff?', async () => {
          try {
            showLoading('Rimozione...');
            await apiFetch('/kit-assignments/' + btn.dataset.id, { method: 'DELETE' });
            hideLoading();
            overlay.remove();
            loadKit();
          } catch (err) { hideLoading(); showToast(err.message, 'error'); }
        });
      });
    });
  }

  document.body.appendChild(overlay);
  renderModal();
}
