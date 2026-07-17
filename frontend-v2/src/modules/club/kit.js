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
let rosterMap = {};
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
    const [tmpls, bdls, assigns, roster] = await Promise.all([
      apiFetch('/kit-templates?workspace_id=' + workspaceId),
      apiFetch('/kit-bundles?workspace_id=' + workspaceId),
      apiFetch('/kit-assignments?team_id=' + teamId + '&season_id=' + seasonId),
      apiFetch('/squadre/' + teamId + '/calciatori')
    ]);
    templates = tmpls || [];
    stock = []; // non più usato — i pezzi sono dentro bundles[].pezzi
    bundles = bdls || [];
    assignments = assigns || [];
    rosterMap = {};
    (roster || []).forEach(p => { rosterMap[p.id] = p; });
  } catch (e) { hideLoading(); c.innerHTML = '<div class="error-box">Errore caricamento</div>'; return; }
  hideLoading();
  render(c);
}

function render(c) {
  isAdmin = window.YFM.canWrite('kit') || window.YFM.getUser()?.ruolo === 'admin' || window.YFM.getUser()?.is_superadmin;

  c.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px;">
      <h1 class="page-title">👕 Kit Sportivo</h1>
      ${isAdmin ? '<button class="btn btn-primary" id="btnConfigKit" style="font-size:13px;" data-help="kit.config">⚙️ Configura template</button>' : ''}
    </div>
    <style>.btn-kit-filter.active{background:#667eea!important;color:white!important;border-color:#667eea!important;}
    @media(max-width:500px){.kit-row{padding:8px 10px!important;}.kit-group-header{padding:10px 12px!important;}}</style>
    <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;" data-help="kit.filtri">
      <button class="btn btn-secondary btn-kit-filter active" data-filter="all" style="font-size:12px;padding:6px 12px;">Tutti</button>
      <button class="btn btn-secondary btn-kit-filter" data-filter="incompleto" style="font-size:12px;padding:6px 12px;">Incompleti</button>
      <button class="btn btn-secondary btn-kit-filter" data-filter="completo" style="font-size:12px;padding:6px 12px;">Completi</button>
      <span style="border-left:1px solid #ddd;margin:0 4px;"></span>
      <button class="btn btn-secondary btn-kit-filter" data-filter="magazzino" style="font-size:12px;padding:6px 12px;">📦 Magazzino</button>
    </div>
    <div id="kitContainer" data-help="kit.lista"></div>
  `;

  renderCards('all');

  c.querySelectorAll('.btn-kit-filter').forEach(btn => {
    btn.addEventListener('click', () => {
      c.querySelectorAll('.btn-kit-filter').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      if (btn.dataset.filter === 'magazzino') { renderMagazzino(); injectPageHelp('kitMagazzino'); }
      else { renderCards(btn.dataset.filter); injectPageHelp('kit'); }
    });
  });

  c.querySelector('#btnConfigKit')?.addEventListener('click', showConfigModal);
}

function renderCards(filter) {
  const container = document.getElementById('kitContainer');
  container.setAttribute('data-help', 'kit.lista');
  if (!templates.length) {
    container.innerHTML = '<p style="color:#888;font-size:13px;">Nessun template kit configurato. Clicca "⚙️ Configura template" per iniziare.</p>';
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

    // Filtro
    let filtered = playerStatus;
    if (filter === 'incompleto') filtered = playerStatus.filter(ps => !ps.complete);
    else if (filter === 'completo') filtered = playerStatus.filter(ps => ps.complete);

    const nComplete = playerStatus.filter(ps => ps.complete).length;
    const nIncomplete = playerStatus.filter(ps => !ps.complete && ps.assigned > 0).length;
    const nNone = playerStatus.filter(ps => ps.assigned === 0).length;
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
            <span style="font-weight:700;font-size:14px;color:#166534;">${tmpl.nome}</span>
            ${tmpl.is_portiere ? '<span style="font-size:11px;background:#eff6ff;color:#1d4ed8;padding:1px 7px;border-radius:10px;border:1px solid #bfdbfe;">🧤 Portiere</span>' : ''}
            ${alert}
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            ${isAdmin ? `<button class="btn-auto-assign" data-tmpl="${tmpl.id}" data-help="kit.auto" style="font-size:11px;padding:4px 8px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;cursor:pointer;color:#166534;" title="Assegna automaticamente a chi ha taglia">🎯 Auto</button><button class="btn-gen-stock" data-tmpl="${tmpl.id}" data-help="kit.stock" style="font-size:11px;padding:4px 8px;background:#eef2ff;border:1px solid #c7d2fe;border-radius:6px;cursor:pointer;color:#4338ca;" title="Genera stock">+ Stock</button><button class="btn-del-tmpl" data-tmpl="${tmpl.id}" style="font-size:11px;padding:4px 8px;background:#fef2f2;border:1px solid #fecaca;border-radius:6px;cursor:pointer;color:#E74C3C;" title="Elimina template">✕</button>` : ''}
          </div>
        </div>
        <div style="display:flex;gap:10px;margin-top:6px;margin-left:20px;font-size:11px;color:#666;flex-wrap:wrap;">
          <span>✅ ${nComplete}/${rosterPlayers.length} assegnati</span>
          <span>📦 ${kitDisponibili} kit (${pezziDisponibili} pezzi)</span>
          <span>📋 ${totArticoli} articoli</span>
          <span>${tmpl.settore === 'scuola_calcio' ? '⚽ Scuola Calcio' : '🏟️ Settore Giovanile'}</span>
        </div>
      </div>
      <div class="kit-group-body" data-tmpl="${tmpl.id}" style="display:${expandedTmpls.has(tmpl.id) ? 'block' : 'none'};border-top:1px solid #e0e7ff;">
        ${filtered.length === 0 ? '<p style="padding:12px 16px;color:#888;font-size:13px;margin:0;">Nessun giocatore trovato.</p>' :
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
// VISTA MAGAZZINO
// ═══════════════════════════════════════════
function renderMagazzino() {
  const container = document.getElementById('kitContainer');
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
    // Giocatori da ordinare per questo template (da_ordinare_kit=true)
    const nDaOrdinare   = Object.values(rosterMap).filter(p => p.da_ordinare_kit).length;
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
          <span style="font-weight:700;font-size:14px;color:#4338ca;">📦 ${tmpl.nome}${tmpl.is_portiere ? ' <span style="font-size:11px;background:#eff6ff;color:#1d4ed8;padding:1px 7px;border-radius:10px;border:1px solid #bfdbfe;">🧤 Portiere</span>' : ''}</span>
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

              return `<div style="padding:7px 14px 7px 28px;border-bottom:1px solid #f5f5f5;font-size:12px;">
                <div style="display:flex;align-items:center;gap:10px;">
                  <span style="font-weight:600;min-width:50px;color:#555;">${b.numero_maglia != null ? 'n°' + b.numero_maglia : 'Kit #' + b.numero_kit}</span>
                  <span style="background:${badge.bg};color:${badge.color};padding:1px 8px;border-radius:10px;font-size:11px;white-space:nowrap;">${badge.label}</span>
                  <span style="flex:1;">${kitLabel}</span>
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

  // Sezione Da ordinare
  const daOrdinareList = Object.values(rosterMap)
    .filter(p => p.da_ordinare_kit)
    .sort((a, b) => {
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
    // Raggruppa giocatori da ordinare per taglia
    const perTaglia = {};
    daOrdinareList.forEach(p => {
      const t = p.taglia || '—';
      if (!perTaglia[t]) perTaglia[t] = [];
      perTaglia[t].push(p);
    });
    const righeGiocatori = Object.entries(perTaglia).map(([taglia, players]) =>
      `<div style="padding:6px 14px;border-bottom:1px solid #f5f5f5;">
        <span style="font-size:12px;font-weight:600;color:#92400e;min-width:40px;display:inline-block;">${taglia}</span>
        <span style="font-size:12px;color:#555;">${players.map(p => `${p.cognome} ${p.nome}`).join(', ')}</span>
        <span style="font-size:11px;color:#aaa;margin-left:6px;">(${players.length})</span>
      </div>`
    ).join('');

    // Sostituzioni in attesa
    const righeAttesa = inAttesaList.map(s =>
      `<div style="padding:6px 14px;border-bottom:1px solid #f5f5f5;display:flex;align-items:center;gap:8px;">
        <span style="font-size:11px;background:#fef2f2;color:#E74C3C;padding:1px 6px;border-radius:4px;border:1px solid #fecaca;">sostituzione</span>
        <span style="font-size:12px;font-weight:600;color:#92400e;min-width:40px;">${s.taglia || '—'}</span>
        <span style="font-size:12px;color:#555;">${s.cognome} ${s.nome}</span>
        <span style="font-size:11px;color:#888;">— ${s.articolo}</span>
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
      return `<div style="padding:8px 14px;border-bottom:1px solid #f5f5f5;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px;">
        <div>
          <span style="font-size:12px;font-weight:600;color:#374151;">${tmpl.nome} — Taglia ${taglia}</span>
          <span style="font-size:11px;color:#888;margin-left:6px;">(${bList.length} kit)</span>
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
      <div style="display:flex;align-items:center;gap:10px;padding:8px 12px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;">
        <label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer;">
          <input type="checkbox" id="ktPortiere" style="width:16px;height:16px;cursor:pointer;"> 🧤 Kit Portiere
        </label>
        <span style="font-size:11px;color:#1d4ed8;">Pre-compila con articoli da portiere</span>
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
        <div style="margin-top:6px;display:grid;gap:2px;">${articoliCheckboxes}</div>
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

  // Toggle portiere: pre-popola articoli
  let portiereSources = null; // null = usa ARTICOLI_PRECOMPILATI
  overlay.querySelector('#ktPortiere').addEventListener('change', function() {
    portiereSources = this.checked ? ARTICOLI_PORTIERE : null;
    const artList = portiereSources || ARTICOLI_PRECOMPILATI;
    const cont = overlay.querySelector('.kt-art-row')?.closest('div');
    if (!cont) return;
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
  });

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
        is_portiere: overlay.querySelector('#ktPortiere').checked
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
    <div style="font-size:16px;font-weight:600;margin-bottom:4px;">📦 Genera Kit — ${tmpl.nome}</div>
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
        assignments: [{ player_id: player.id, bundle_id: bundle.id, pezzi_in_attesa: pezziInAttesa }]
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
