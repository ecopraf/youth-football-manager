import { apiFetch } from '../../services/api';
import { showLoading, hideLoading } from '../../utils/ui';

function showToast(msg, type = 'info') {
  if (window.showToast) { window.showToast(msg, type); return; }
  alert(msg);
}

const TAGLIE_SC = ['116','122','128','134','140','146','152','158','XS Adulto'];
const TAGLIE_SG = ['XS','S','M','L','XL','XXL'];

let templates = [];
let stock = [];
let assignments = [];
let rosterMap = {};
let isAdmin = false;
let expandedTmpls = new Set();

export default async function loadKit() {
  const c = document.getElementById('pageContent');
  const workspaceId = window.YFM.activeWorkspaceId;
  const teamId = window.YFM.squadraId;
  const seasonId = window.YFM.currentSeasonId;

  if (!teamId) { c.innerHTML = '<div class="error-box">Nessuna squadra selezionata.</div>'; return; }

  showLoading('Caricamento kit...');
  try {
    const [tmpls, stk, assigns, roster] = await Promise.all([
      apiFetch('/kit-templates?workspace_id=' + workspaceId),
      apiFetch('/kit-stock?workspace_id=' + workspaceId),
      apiFetch('/kit-assignments?team_id=' + teamId + '&season_id=' + seasonId),
      apiFetch('/squadre/' + teamId + '/calciatori')
    ]);
    templates = tmpls || [];
    stock = stk || [];
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
      ${isAdmin ? '<button class="btn btn-primary" id="btnConfigKit" style="font-size:13px;">⚙️ Configura template</button>' : ''}
    </div>
    <style>.btn-kit-filter.active{background:#667eea!important;color:white!important;border-color:#667eea!important;}
    @media(max-width:500px){.kit-row{padding:8px 10px!important;}.kit-group-header{padding:10px 12px!important;}}</style>
    <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;">
      <button class="btn btn-secondary btn-kit-filter active" data-filter="all" style="font-size:12px;padding:6px 12px;">Tutti</button>
      <button class="btn btn-secondary btn-kit-filter" data-filter="incompleto" style="font-size:12px;padding:6px 12px;">Incompleti</button>
      <button class="btn btn-secondary btn-kit-filter" data-filter="completo" style="font-size:12px;padding:6px 12px;">Completi</button>
      <span style="border-left:1px solid #ddd;margin:0 4px;"></span>
      <button class="btn btn-secondary btn-kit-filter" data-filter="magazzino" style="font-size:12px;padding:6px 12px;">📦 Magazzino</button>
    </div>
    <div id="kitContainer"></div>
  `;

  renderCards('all');

  c.querySelectorAll('.btn-kit-filter').forEach(btn => {
    btn.addEventListener('click', () => {
      c.querySelectorAll('.btn-kit-filter').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      if (btn.dataset.filter === 'magazzino') renderMagazzino();
      else renderCards(btn.dataset.filter);
    });
  });

  c.querySelector('#btnConfigKit')?.addEventListener('click', showConfigModal);
}

function renderCards(filter) {
  const container = document.getElementById('kitContainer');
  if (!templates.length) {
    container.innerHTML = '<p style="color:#888;font-size:13px;">Nessun template kit configurato. Clicca "⚙️ Configura template" per iniziare.</p>';
    return;
  }

  const teamId = window.YFM.squadraId;
  const rosterPlayers = Object.values(rosterMap);

  let html = '';
  templates.filter(t => t.attivo !== false).forEach(tmpl => {
    const tmplStock = stock.filter(s => s.template_id === tmpl.id);
    const tmplAssigns = assignments.filter(a => a.kit_stock?.template_id === tmpl.id);
    const articoli = tmpl.articoli || [];
    const totArticoli = articoli.length;

    // Per ogni giocatore: quanti articoli assegnati
    const playerStatus = rosterPlayers.map(p => {
      const playerAssigns = tmplAssigns.filter(a => a.player_id === p.id);
      const assignedArticoli = new Set(playerAssigns.map(a => a.kit_stock?.articolo));
      return { player: p, assigned: assignedArticoli.size, total: totArticoli, complete: assignedArticoli.size >= totArticoli };
    });

    // Filtro
    let filtered = playerStatus;
    if (filter === 'incompleto') filtered = playerStatus.filter(ps => !ps.complete);
    else if (filter === 'completo') filtered = playerStatus.filter(ps => ps.complete);

    const nComplete = playerStatus.filter(ps => ps.complete).length;
    const nIncomplete = playerStatus.filter(ps => !ps.complete && ps.assigned > 0).length;
    const nNone = playerStatus.filter(ps => ps.assigned === 0).length;
    const nArticoli = totArticoli || 1;
    const pezziDisponibili = tmplStock.filter(s => s.stato === 'disponibile').length;
    const kitDisponibili = Math.floor(pezziDisponibili / nArticoli);

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
            ${alert}
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            ${isAdmin ? `<button class="btn-auto-assign" data-tmpl="${tmpl.id}" style="font-size:11px;padding:4px 8px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;cursor:pointer;color:#166534;" title="Assegna automaticamente a chi ha taglia">🎯 Auto</button><button class="btn-gen-stock" data-tmpl="${tmpl.id}" style="font-size:11px;padding:4px 8px;background:#eef2ff;border:1px solid #c7d2fe;border-radius:6px;cursor:pointer;color:#4338ca;" title="Genera stock">+ Stock</button><button class="btn-del-tmpl" data-tmpl="${tmpl.id}" style="font-size:11px;padding:4px 8px;background:#fef2f2;border:1px solid #fecaca;border-radius:6px;cursor:pointer;color:#E74C3C;" title="Elimina template">✕</button>` : ''}
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
            return `<div class="kit-row" data-player="${p.id}" data-tmpl="${tmpl.id}" style="display:flex;align-items:center;justify-content:space-between;padding:10px 16px;border-bottom:1px solid #f5f5f5;cursor:pointer;" onmouseover="this.style.background='#fafafa'" onmouseout="this.style.background=''">
              <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:0;">
                <span style="font-size:12px;">${dot}</span>
                <span style="font-size:13px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${nome}</span>
                ${tagliaLabel ? `<span style="font-size:10px;color:${kitTaglia ? '#4338ca' : '#888'};background:${kitTaglia ? '#eef2ff' : '#f0f0f0'};padding:1px 5px;border-radius:4px;">${tagliaLabel}</span>` : ''}
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
      if (!confirm('Eliminare questo template kit?')) return;
      await apiFetch('/kit-templates/' + btn.dataset.tmpl, { method: 'DELETE' });
      loadKit();
    });
  });
}

// ═══════════════════════════════════════════
// VISTA MAGAZZINO
// ═══════════════════════════════════════════
function renderMagazzino() {
  const container = document.getElementById('kitContainer');
  if (!templates.length) {
    container.innerHTML = '<p style="color:#888;font-size:13px;">Nessun template configurato.</p>';
    return;
  }

  let html = '';
  templates.filter(t => t.attivo !== false).forEach(tmpl => {
    const tmplStock = stock.filter(s => s.template_id === tmpl.id);
    const taglie = tmpl.taglie || (tmpl.settore === 'scuola_calcio' ? TAGLIE_SC : TAGLIE_SG);
    const articoli = (tmpl.articoli || []).map(a => a.nome);

    // Griglia: per ogni taglia, conteggio kit completi disponibili/assegnati
    const rows = taglie.map(t => {
      const byTaglia = tmplStock.filter(s => s.taglia === t);
      const nArt = articoli.length || 1;
      // Kit assegnati = giocatori con TUTTI gli articoli assegnati per questa taglia
      const assignsByTaglia = assignments.filter(a => a.kit_stock?.template_id === tmpl.id && a.kit_stock?.taglia === t);
      const playerArtMap = {};
      assignsByTaglia.forEach(a => {
        const pid = a.player_id;
        if (!playerArtMap[pid]) playerArtMap[pid] = new Set();
        playerArtMap[pid].add(a.kit_stock?.articolo);
      });
      const kitAssegnati = Object.values(playerArtMap).filter(arts => arts.size >= nArt).length;
      const kitParziali = Object.values(playerArtMap).filter(arts => arts.size > 0 && arts.size < nArt).length;
      // Kit disponibili = floor(pezzi disponibili / nArticoli)
      const pezziDisp = byTaglia.filter(s => s.stato === 'disponibile').length;
      const kitDisponibili = Math.floor(pezziDisp / nArt);
      const pezziExtra = pezziDisp % nArt; // pezzi sfusi non sufficienti per un kit completo
      const esaurito = kitDisponibili === 0 && byTaglia.length > 0;
      return { taglia: t, kitDisponibili, kitAssegnati, kitParziali, pezziExtra, totale: byTaglia.length, esaurito };
    });

    const totDisp = rows.reduce((s, r) => s + r.kitDisponibili, 0);
    const totAss = rows.reduce((s, r) => s + r.kitAssegnati, 0);
    const totParz = rows.reduce((s, r) => s + r.kitParziali, 0);
    const hasEsauriti = rows.some(r => r.esaurito);

    html += `<div style="margin-bottom:16px;background:white;border-radius:12px;border:1px solid #eee;overflow:hidden;">
      <div style="padding:12px 16px;background:linear-gradient(135deg,#eef2ff,#e0e7ff);">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
          <span style="font-weight:700;font-size:14px;color:#4338ca;">📦 ${tmpl.nome}</span>
          <div style="display:flex;gap:10px;font-size:11px;color:#666;">
            <span>✅ ${totAss} kit assegnati</span>
            <span>📦 ${totDisp} kit disponibili</span>
            ${totParz > 0 ? `<span style="color:#d97706;">⚠️ ${totParz} incompleti</span>` : ''}
            ${hasEsauriti ? '<span style="color:#E74C3C;">⚠️ Esauriti</span>' : ''}
          </div>
        </div>
        <div style="font-size:11px;color:#666;margin-top:4px;">Articoli: ${articoli.join(', ')}</div>
      </div>
      <div style="overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;font-size:12px;">
          <thead><tr style="background:#f8fafc;">
            <th style="text-align:left;padding:8px 12px;font-weight:600;color:#374151;">Taglia</th>
            <th style="text-align:right;padding:8px 12px;font-weight:600;color:#374151;">Kit assegnati</th>
            <th style="text-align:right;padding:8px 12px;font-weight:600;color:#374151;">Kit disponibili</th>
            <th style="text-align:right;padding:8px 12px;font-weight:600;color:#374151;">Pezzi sfusi</th>
          </tr></thead>
          <tbody>${rows.filter(r => r.totale > 0).map(r => `<tr style="border-top:1px solid #f0f0f0;${r.esaurito ? 'background:#fef2f2;' : ''}">
            <td style="padding:8px 12px;font-weight:500;">${r.taglia}${r.esaurito ? ' <span style="color:#E74C3C;font-size:10px;">esaurito</span>' : ''}${r.kitParziali > 0 ? ` <span style="color:#d97706;font-size:10px;" title="${r.kitParziali} kit con articoli mancanti">⚠️ incompleti</span>` : ''}</td>
            <td style="text-align:right;padding:8px 12px;">${r.kitAssegnati}</td>
            <td style="text-align:right;padding:8px 12px;color:${r.kitDisponibili > 0 ? '#166534' : '#999'};font-weight:${r.kitDisponibili > 0 ? '600' : '400'};">${r.kitDisponibili}</td>
            <td style="text-align:right;padding:8px 12px;color:${r.pezziExtra > 0 ? '#d97706' : '#ccc'};font-size:11px;" title="Pezzi disponibili non sufficienti per un kit completo">${r.pezziExtra > 0 ? r.pezziExtra + ' pz' : '—'}</td>
          </tr>`).join('')}
          <tr style="border-top:2px solid #e0e7ff;background:#f8fafc;font-weight:600;">
            <td style="padding:8px 12px;">Totale</td>
            <td style="text-align:right;padding:8px 12px;">${totAss}</td>
            <td style="text-align:right;padding:8px 12px;color:#166534;">${totDisp}</td>
            <td style="text-align:right;padding:8px 12px;"></td>
          </tr></tbody>
        </table>
      </div>
      ${totParz > 0 ? `<div style="padding:8px 14px;background:#fef9ec;border-top:1px solid #fde68a;font-size:11px;color:#92400e;">⚠️ ${totParz} kit con articoli mancanti — alcuni kit sono stati parzialmente smontati per fornire pezzi singoli agli atleti.</div>` : ''}
      ${isAdmin ? `<div style="padding:8px 12px;border-top:1px solid #f0f0f0;text-align:right;">
        <button class="btn-restock" data-tmpl="${tmpl.id}" style="font-size:11px;padding:5px 12px;background:#eef2ff;border:1px solid #c7d2fe;border-radius:6px;cursor:pointer;color:#4338ca;">+ Ordina stock</button>
      </div>` : ''}
    </div>`;
  });

  container.innerHTML = html;

  container.querySelectorAll('.btn-restock').forEach(btn => {
    btn.addEventListener('click', () => {
      const tmpl = templates.find(t => t.id === btn.dataset.tmpl);
      if (tmpl) showGenerateStockModal(tmpl);
    });
  });
}

// ═══════════════════════════════════════════
// AUTO-ASSIGN BATCH
// ═══════════════════════════════════════════
async function autoAssign(tmpl) {
  const teamId = window.YFM.squadraId;
  const seasonId = window.YFM.stagioneId;
  const rosterPlayers = Object.values(rosterMap);

  // Giocatori con taglia che non hanno già kit completo
  const tmplAssigns = assignments.filter(a => a.kit_stock?.template_id === tmpl.id);
  const totArticoli = (tmpl.articoli || []).length;
  const eligible = rosterPlayers.filter(p => {
    if (!p.taglia) return false;
    const assigned = tmplAssigns.filter(a => a.player_id === p.id).length;
    return assigned < totArticoli;
  });

  if (!eligible.length) {
    showToast('Nessun giocatore idoneo (tutti hanno già kit o manca la taglia)', 'warning');
    return;
  }

  const body = { template_id: tmpl.id, team_id: teamId, season_id: seasonId, assignments: eligible.map(p => ({ player_id: p.id, taglia: p.taglia })) };
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

function showConfigModal() {
  const workspaceId = window.YFM.activeWorkspaceId;
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:2000;display:flex;align-items:center;justify-content:center;';

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

  overlay.querySelectorAll('input[name="ktNum"]').forEach(r => r.addEventListener('change', () => {
    overlay.querySelector('#ktNumStart').style.display = r.value === 'sequenziale' && r.checked ? 'block' : 'none';
  }));

  const close = () => overlay.remove();
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  overlay.querySelector('#ktCancel').addEventListener('click', close);

  overlay.querySelectorAll('.btn-del-tmpl').forEach(btn => {
    btn.addEventListener('click', async () => {
      await apiFetch('/kit-templates/' + btn.dataset.id, { method: 'DELETE' });
      close(); loadKit();
    });
  });

  overlay.querySelector('#ktSave').addEventListener('click', async () => {
    const nome = overlay.querySelector('#ktNome').value.trim();
    const settore = overlay.querySelector('input[name="ktSettore"]:checked').value;
    const numerazione = overlay.querySelector('input[name="ktNum"]:checked').value;
    const numerazione_start = parseInt(overlay.querySelector('#ktStartN')?.value) || 13;
    // Raccogli articoli selezionati con quantità
    const selected = [];
    overlay.querySelectorAll('.kt-art-cb:checked').forEach(cb => {
      const i = +cb.dataset.idx;
      selected.push({ nome: ARTICOLI_PRECOMPILATI[i].nome, qty: qtys[i] });
    });
    const allArticoli = [...selected, ...customArticoli.map(nome => ({ nome, qty: 1 }))];
    if (!nome || !allArticoli.length) { window.YFM?.showToast?.('Compila nome e seleziona almeno un articolo', 'error') || alert('Compila nome e seleziona almeno un articolo'); return; }
    const taglie = settore === 'scuola_calcio' ? TAGLIE_SC : TAGLIE_SG;
    try {
      await apiFetch('/kit-templates', { method: 'POST', body: JSON.stringify({
        workspace_id: workspaceId, nome, settore, articoli: allArticoli, numerazione, numerazione_start, taglie
      })});
      close(); loadKit();
      // Prompt per creare fee associata
      showFeePrompt(nome);
    } catch (err) { window.YFM?.showToast?.(err.message, 'error') || alert(err.message); }
  });
}

function showFeePrompt(kitNome) {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:2000;display:flex;align-items:center;justify-content:center;';
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

  const taglieRows = taglie.map(t => `<div style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;">
    <span style="font-size:13px;font-weight:500;min-width:80px;">${t}</span>
    <input class="gs-qty" data-taglia="${t}" type="number" min="0" value="0" style="width:70px;padding:6px;border:1px solid #ddd;border-radius:6px;text-align:center;font-size:13px;">
  </div>`).join('');

  overlay.innerHTML = `<div style="background:white;border-radius:16px;padding:24px;max-width:400px;width:95%;box-shadow:0 20px 60px rgba(0,0,0,0.3);max-height:90vh;overflow-y:auto;">
    <div style="font-size:16px;font-weight:600;margin-bottom:4px;">📦 Genera Stock — ${tmpl.nome}</div>
    <div style="font-size:12px;color:#666;margin-bottom:16px;">Ogni kit include: ${(tmpl.articoli||[]).map(a=>a.nome).join(', ')}.<br>${tmpl.numerazione === 'sequenziale' ? 'Numeri assegnati automaticamente da ' + (tmpl.numerazione_start || 13) + '.' : ''}</div>
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

  overlay.querySelector('#gsGenerate').addEventListener('click', async () => {
    const inputs = overlay.querySelectorAll('.gs-qty');
    const items = [];
    const articoli = (tmpl.articoli || []).map(a => a.nome);
    inputs.forEach(inp => {
      const qty = parseInt(inp.value) || 0;
      if (qty > 0) {
        // Genera stock per OGNI articolo del template con questa taglia
        articoli.forEach(art => {
          items.push({ articolo: art, taglia: inp.dataset.taglia, quantita: qty });
        });
      }
    });
    if (!items.length) { window.YFM?.showToast?.('Inserisci almeno una quantità', 'error') || alert('Inserisci almeno una quantità'); return; }
    try {
      showLoading('Generazione stock...');
      await apiFetch('/kit-stock/generate', { method: 'POST', body: JSON.stringify({
        workspace_id: window.YFM.activeWorkspaceId, template_id: tmpl.id, items
      })});
      hideLoading();
      close();
      loadKit();
    } catch (err) { hideLoading(); window.YFM?.showToast?.(err.message, 'error') || alert(err.message); }
  });
}

// ═══════════════════════════════════════════
// MODAL: Assegnazione kit a giocatore
// ═══════════════════════════════════════════
function showAssignModal(tmpl, player) {
  const nome = `${player.cognome || ''} ${player.nome || ''}`.trim();
  const articoli = tmpl.articoli || [];
  const tmplStock = stock.filter(s => s.template_id === tmpl.id);
  const playerAssigns = assignments.filter(a => a.player_id === player.id && a.kit_stock?.template_id === tmpl.id);
  const assignedStockIds = new Set(playerAssigns.map(a => a.kit_stock_id));
  const taglie = tmpl.taglie || (tmpl.settore === 'scuola_calcio' ? TAGLIE_SC : TAGLIE_SG);

  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:2000;display:flex;align-items:center;justify-content:center;';

  function renderModal() {
    const defaultTaglia = player.taglia || '';
    // Taglie disponibili nello stock
    const taglieOpts = taglie.map(t => `<option value="${t}"${t === defaultTaglia ? ' selected' : ''}>${t}</option>`).join('');

    let rows = articoli.map(art => {
      const assigned = playerAssigns.find(a => a.kit_stock?.articolo === art.nome);
      if (assigned) {
        const s = assigned.kit_stock;
        return `<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:#d1fae5;border-radius:8px;margin-bottom:4px;">
          <div><span style="font-size:13px;">✅ ${art.nome}</span>${s.taglia ? ` <span style="color:#888;font-size:11px;">(${s.taglia})</span>` : ''}${s.numero ? ` <span style="color:#888;font-size:11px;">#${s.numero}</span>` : ''}</div>
          ${isAdmin ? `<button class="ka-remove" data-id="${assigned.id}" style="font-size:10px;padding:3px 6px;background:#fee2e2;border:1px solid #fecaca;border-radius:4px;cursor:pointer;color:#dc2626;">✕</button>` : ''}
        </div>`;
      }
      // Non assegnato — mostra select per assegnare singolo
      const available = tmplStock.filter(s => s.articolo === art.nome && s.stato === 'disponibile');
      if (!isAdmin || available.length === 0) {
        return `<div style="display:flex;align-items:center;padding:8px 12px;background:#f8f9fa;border-radius:8px;margin-bottom:4px;">
          <span style="font-size:13px;color:#888;">⬜ ${art.nome}</span>
          ${available.length === 0 ? '<span style="font-size:10px;color:#E74C3C;margin-left:8px;">esaurito</span>' : ''}
        </div>`;
      }
      const options = available.map(s => {
        const label = [s.taglia, s.numero ? '#' + s.numero : ''].filter(Boolean).join(' ');
        const sel = defaultTaglia && s.taglia === defaultTaglia ? 'selected' : '';
        return `<option value="${s.id}" ${sel}>${label || 'N/D'}</option>`;
      });
      return `<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:#fafafa;border-radius:8px;margin-bottom:4px;">
        <span style="font-size:13px;flex:1;">⬜ ${art.nome}</span>
        <select class="ka-select" data-art="${art.nome}" style="padding:4px 8px;border:1px solid #ddd;border-radius:6px;font-size:12px;">${defaultTaglia ? '' : '<option value="">-- taglia --</option>'}${options.join('')}</select>
        <button class="ka-assign" data-art="${art.nome}" style="font-size:11px;padding:4px 8px;background:#27AE60;color:white;border:none;border-radius:6px;cursor:pointer;">Assegna</button>
      </div>`;
    }).join('');

    // Quanti articoli non ancora assegnati
    const unassignedCount = articoli.filter(art => !playerAssigns.find(a => a.kit_stock?.articolo === art.nome)).length;

    overlay.innerHTML = `<div style="background:white;border-radius:16px;padding:24px;max-width:420px;width:95%;box-shadow:0 20px 60px rgba(0,0,0,0.3);max-height:90vh;overflow-y:auto;">
      <div style="font-size:16px;font-weight:600;margin-bottom:4px;">👕 ${nome}</div>
      <div style="font-size:12px;color:#666;margin-bottom:12px;">${tmpl.nome}${player.taglia ? ' • Taglia: ' + player.taglia : ''}</div>
      ${isAdmin && unassignedCount > 0 ? `<div style="display:flex;align-items:center;gap:8px;padding:10px 12px;background:#eef2ff;border-radius:8px;margin-bottom:12px;border:1px solid #c7d2fe;">
        <select id="kaGlobalTaglia" style="padding:5px 8px;border:1px solid #c7d2fe;border-radius:6px;font-size:12px;"><option value="">Taglia...</option>${taglieOpts}</select>
        <button id="kaAssignAll" style="flex:1;padding:6px 12px;background:#667eea;color:white;border:none;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;">Assegna kit</button>
      </div>` : ''}
      ${rows}
      <div style="margin-top:16px;text-align:right;"><button class="btn btn-secondary" id="kaClose">Chiudi</button></div>
    </div>`;

    // Bindings
    overlay.querySelector('#kaClose').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

    // Global taglia changes all selects
    overlay.querySelector('#kaGlobalTaglia')?.addEventListener('change', (e) => {
      const taglia = e.target.value;
      if (!taglia) return;
      overlay.querySelectorAll('.ka-select').forEach(sel => {
        const match = [...sel.options].find(o => o.text.startsWith(taglia));
        if (match) sel.value = match.value;
      });
    });

    // Assign all unassigned at once
    overlay.querySelector('#kaAssignAll')?.addEventListener('click', async () => {
      const taglia = overlay.querySelector('#kaGlobalTaglia')?.value;
      if (!taglia) { window.YFM?.showToast?.('Seleziona una taglia', 'error'); return; }
      const selects = overlay.querySelectorAll('.ka-select');
      const ids = [];
      selects.forEach(sel => { if (sel.value) ids.push(sel.value); });
      if (!ids.length) { window.YFM?.showToast?.('Nessun articolo da assegnare', 'error'); return; }
      try {
        showLoading('Assegnazione kit...');
        for (const stockId of ids) {
          await apiFetch('/kit-assignments', { method: 'POST', body: JSON.stringify({
            kit_stock_id: stockId, player_id: player.id,
            team_id: window.YFM.squadraId, season_id: window.YFM.currentSeasonId
          })});
        }
        hideLoading();
        overlay.remove();
        loadKit();
      } catch (err) { hideLoading(); window.YFM?.showToast?.(err.message, 'error'); }
    });

    // Single assign
    overlay.querySelectorAll('.ka-assign').forEach(btn => {
      btn.addEventListener('click', async () => {
        const art = btn.dataset.art;
        const select = overlay.querySelector(`.ka-select[data-art="${art}"]`);
        const stockId = select?.value;
        if (!stockId) return;
        try {
          showLoading('Assegnazione...');
          await apiFetch('/kit-assignments', { method: 'POST', body: JSON.stringify({
            kit_stock_id: stockId, player_id: player.id,
            team_id: window.YFM.squadraId, season_id: window.YFM.currentSeasonId
          })});
          hideLoading();
          overlay.remove();
          loadKit();
        } catch (err) { hideLoading(); window.YFM?.showToast?.(err.message, 'error'); }
      });
    });

    // Remove
    overlay.querySelectorAll('.ka-remove').forEach(btn => {
      btn.addEventListener('click', async () => {
        try {
          showLoading('Rimozione...');
          await apiFetch('/kit-assignments/' + btn.dataset.id, { method: 'DELETE' });
          hideLoading();
          overlay.remove();
          loadKit();
        } catch (err) { hideLoading(); window.YFM?.showToast?.(err.message, 'error'); }
      });
    });
  }

  document.body.appendChild(overlay);
  renderModal();
}
