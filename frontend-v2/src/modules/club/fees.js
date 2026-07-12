import { apiFetch } from '../../services/api';
import { showLoading, hideLoading } from '../../utils/ui';

function showToast(msg, type = 'info') {
  const colors = { success: '#27AE60', error: '#E74C3C', warning: '#F39C12', info: '#667eea' };
  const t = document.createElement('div');
  t.textContent = msg;
  t.style.cssText = `position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:${colors[type] || colors.info};color:white;padding:10px 20px;border-radius:8px;font-size:13px;z-index:9999;box-shadow:0 4px 12px rgba(0,0,0,0.2);`;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

const STATI_COLORS = { da_pagare: '#E74C3C', parziale: '#F39C12', pagata: '#27AE60' };
const STATI_LABELS = { da_pagare: 'Da pagare', parziale: 'Parziale', pagata: 'Pagata' };

// Stesso giorno del mese successivo (clamp a fine mese se non esiste)
function nextMonthSameDay(dateStr) {
  const d = new Date(dateStr);
  const day = d.getDate();
  const nextMonth = d.getMonth() + 1;
  const year = d.getFullYear() + (nextMonth > 11 ? 1 : 0);
  const month = nextMonth % 12;
  // Ultimo giorno del mese target
  const lastDay = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(day, lastDay)).toISOString().split('T')[0];
}

let feesList = [];
let feeConfigs = [];
let rosterMap = {};
let categoryId = null;

export default async function loadFees() {
  const c = document.getElementById('pageContent');
  const isAdmin = window.YFM.canWrite('rosa');
  const seasonId = window.YFM.currentSeasonId;
  const workspaceId = window.YFM.activeWorkspaceId;

  if (!seasonId) {
    c.innerHTML = '<div class="error-box">Nessuna stagione selezionata.</div>';
    return;
  }

  showLoading('Caricamento quote...');
  try {
    // Ricava category_id dalla squadra corrente
    const squadra = window.YFM.getSquadra();
    categoryId = squadra?.category_id || null;

    const [fees, configs, roster] = await Promise.all([
      apiFetch('/fees?team_id=' + window.YFM.squadraId + '&season_id=' + seasonId),
      apiFetch('/fee-configs?workspace_id=' + workspaceId),
      apiFetch('/squadre/' + window.YFM.squadraId + '/calciatori')
    ]);
    feesList = fees || [];
    feeConfigs = configs || [];
    rosterMap = {};
    (roster || []).forEach(p => { rosterMap[p.player_id || p.id] = p; });
  } catch (e) {
    hideLoading();
    c.innerHTML = '<div class="error-box">Errore caricamento quote</div>';
    return;
  }
  hideLoading();
  render(c, isAdmin);

  // Check scadenze (fire & forget)
  apiFetch('/fees/check-scadenze', { method: 'POST', body: JSON.stringify({
    workspace_id: window.YFM.activeWorkspaceId,
    team_id: window.YFM.squadraId
  })}).catch(() => {});
}

function render(c, isAdmin) {
  const totDovuto = feesList.reduce((s, f) => s + parseFloat(f.importo_totale), 0);
  const totPagato = feesList.reduce((s, f) => {
    return s + (f.fee_installment || []).filter(i => i.stato === 'pagata').reduce((ps, i) => ps + parseFloat(i.importo), 0);
  }, 0);
  const pendenti = feesList.filter(f => f.stato !== 'pagata').length;

  c.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px;">
      <h1 class="page-title">💰 Quote</h1>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        ${isAdmin ? '<button class="btn btn-primary" id="btnConfigFee" style="font-size:13px;">⚙️ Configura Quote</button>' : ''}
      </div>
    </div>
    <div style="display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap;">
      <div style="padding:10px 16px;background:#f0fdf4;border-radius:10px;font-size:13px;">Totale: <strong>€${totDovuto.toFixed(2)}</strong></div>
      <div style="padding:10px 16px;background:#eef2ff;border-radius:10px;font-size:13px;">Incassato: <strong>€${totPagato.toFixed(2)}</strong></div>
      <div style="padding:10px 16px;background:#fef2f2;border-radius:10px;font-size:13px;">Pendenti: <strong style="color:#E74C3C;">${pendenti}</strong></div>
    </div>
    <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;">
      <style>.btn-filter.active{background:#667eea!important;color:white!important;border-color:#667eea!important;}
      @media(max-width:500px){.fee-row{padding:8px 10px!important;}.fee-row-name{font-size:12px!important;}.fee-row-rate{font-size:11px!important;}.fee-group-header{padding:10px 12px!important;}}</style>
      <button class="btn btn-secondary btn-filter active" data-filter="all" style="font-size:12px;padding:6px 12px;">Tutte</button>
      <button class="btn btn-secondary btn-filter" data-filter="da_pagare" style="font-size:12px;padding:6px 12px;">Da pagare</button>
      <button class="btn btn-secondary btn-filter" data-filter="scadute" style="font-size:12px;padding:6px 12px;">⚠️ Scadute</button>
      <button class="btn btn-secondary btn-filter" data-filter="in_scadenza" style="font-size:12px;padding:6px 12px;">⏳ In scadenza</button>
      <button class="btn btn-secondary btn-filter" data-filter="parziale" style="font-size:12px;padding:6px 12px;">Parziali</button>
      <button class="btn btn-secondary btn-filter" data-filter="pagata" style="font-size:12px;padding:6px 12px;">Pagate</button>
    </div>
    <div id="feesTableContainer"></div>
  `;

  renderTable('all', isAdmin);

  c.querySelectorAll('.btn-filter').forEach(btn => {
    btn.addEventListener('click', () => {
      c.querySelectorAll('.btn-filter').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderTable(btn.dataset.filter, isAdmin);
    });
  });

  c.querySelector('#btnConfigFee')?.addEventListener('click', showConfigModal);
}

function renderTable(filter, isAdmin) {
  const container = document.getElementById('feesTableContainer');
  const today = new Date().toISOString().slice(0, 10);
  const in7days = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

  // Filtri
  let filtered;
  if (filter === 'all') filtered = feesList;
  else if (filter === 'scadute') filtered = feesList.filter(f => (f.fee_installment || []).some(i => i.stato !== 'pagata' && i.scadenza && i.scadenza.slice(0, 10) < today));
  else if (filter === 'in_scadenza') filtered = feesList.filter(f => (f.fee_installment || []).some(i => i.stato !== 'pagata' && i.scadenza && i.scadenza.slice(0, 10) >= today && i.scadenza.slice(0, 10) <= in7days));
  else filtered = feesList.filter(f => f.stato === filter);

  if (!filtered.length) {
    container.innerHTML = '<p style="color:var(--gray);font-size:13px;margin-top:12px;">Nessuna quota trovata.</p>';
    return;
  }

  // Raggruppa per fee_config_id
  const groups = {};
  filtered.forEach(f => {
    const key = f.fee_config_id || 'other';
    if (!groups[key]) groups[key] = [];
    groups[key].push(f);
  });
  const configNames = {};
  feeConfigs.forEach(cfg => { configNames[cfg.id] = cfg.nome; });

  let html = '';
  Object.entries(groups).forEach(([cfgId, fees]) => {
    const groupName = configNames[cfgId] || 'Altro';
    const groupTot = fees.reduce((s, f) => s + parseFloat(f.importo_totale), 0);
    const groupPagato = fees.reduce((s, f) => s + (f.fee_installment || []).filter(i => i.stato === 'pagata').reduce((ps, i) => ps + parseFloat(i.importo), 0), 0);
    const allInsts = fees.flatMap(f => f.fee_installment || []);
    const nScadute = allInsts.filter(i => i.stato !== 'pagata' && i.scadenza && i.scadenza.slice(0, 10) < today).length;
    const nInScadenza = allInsts.filter(i => i.stato !== 'pagata' && i.scadenza && i.scadenza.slice(0, 10) >= today && i.scadenza.slice(0, 10) <= in7days).length;
    const nSaldati = fees.filter(f => f.stato === 'pagata').length;

    html += `<div style="margin-bottom:16px;background:white;border-radius:12px;border:1px solid #eee;overflow:hidden;">
      <div class="fee-group-header" data-cfg="${cfgId}" style="padding:12px 16px;background:linear-gradient(135deg,#f0f4ff,#e8eeff);cursor:pointer;user-select:none;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div style="display:flex;align-items:center;gap:8px;">
            <span class="fee-group-chevron" style="font-size:12px;transition:transform 0.2s;">▶</span>
            <span style="font-weight:700;font-size:14px;color:#4338ca;">${groupName}</span>
            ${(() => {
              const nonPagate = allInsts.filter(i => i.stato !== 'pagata' && i.scadenza).sort((a, b) => a.scadenza.localeCompare(b.scadenza));
              const scaduta = nonPagate.find(i => i.scadenza.slice(0, 10) < today);
              const inScad = nonPagate.find(i => i.scadenza.slice(0, 10) >= today && i.scadenza.slice(0, 10) <= in7days);
              const prossima = nonPagate.find(i => i.scadenza.slice(0, 10) >= today);
              if (scaduta) {
                const label = scaduta.scadenza_label || 'Rata ' + scaduta.numero_rata;
                const dt = new Date(scaduta.scadenza).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
                return `<span style="font-size:11px;color:#E74C3C;font-weight:500;">(⚠️ ${label} scaduta ${dt})</span>`;
              } else if (inScad) {
                const label = inScad.scadenza_label || 'Rata ' + inScad.numero_rata;
                const diff = Math.ceil((new Date(inScad.scadenza) - new Date()) / 86400000);
                return `<span style="font-size:11px;color:#d97706;font-weight:500;">(⏳ ${label} tra ${diff}g)</span>`;
              } else if (prossima) {
                const label = prossima.scadenza_label || 'Rata ' + prossima.numero_rata;
                const dt = new Date(prossima.scadenza).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
                return `<span style="font-size:11px;color:#888;">(📅 ${label} — ${dt})</span>`;
              }
              return '';
            })()}
          </div>
          <span style="font-size:12px;color:#555;font-weight:600;">€${groupPagato.toFixed(0)} / €${groupTot.toFixed(0)}</span>
        </div>
        <div style="display:flex;gap:10px;margin-top:6px;margin-left:20px;font-size:11px;color:#666;flex-wrap:wrap;">
          <span>✅ ${nSaldati} saldati</span>
          ${nScadute > 0 ? `<span style="color:#E74C3C;font-weight:600;">⚠️ ${nScadute} scadut${nScadute === 1 ? 'a' : 'e'}</span>` : ''}
          ${nInScadenza > 0 ? `<span style="color:#F39C12;font-weight:600;">⏳ ${nInScadenza} in scadenza</span>` : ''}
        </div>
      </div>
      <div class="fee-group-body" data-cfg="${cfgId}" style="display:none;border-top:1px solid #e0e7ff;">
        ${isAdmin ? `<div class="fee-select-bar" data-cfg="${cfgId}" style="display:flex;align-items:center;justify-content:space-between;padding:6px 16px;background:#f8f9fa;border-bottom:1px solid #eee;">
          <button class="btn-fee-select-toggle" data-cfg="${cfgId}" style="font-size:11px;padding:4px 10px;background:white;border:1px solid #ddd;border-radius:6px;cursor:pointer;">☑️ Seleziona</button>
          <button class="btn-fee-del-selected" data-cfg="${cfgId}" style="display:none;font-size:11px;padding:4px 10px;background:#fef2f2;border:1px solid #fecaca;border-radius:6px;cursor:pointer;color:#E74C3C;font-weight:600;">🗑️ Elimina selezionati</button>
        </div>` : ''}
        ${fees.map(f => {
          const p = rosterMap[f.player_id];
          const nome = p ? `${p.cognome || ''} ${p.nome || ''}`.trim() : '—';
          const insts = (f.fee_installment || []).sort((a, b) => a.numero_rata - b.numero_rata);
          const pagate = insts.filter(i => i.stato === 'pagata').length;
          const hasScaduta = insts.some(i => i.stato !== 'pagata' && i.scadenza && i.scadenza.slice(0, 10) < today);
          const hasInScad = insts.some(i => i.stato !== 'pagata' && i.scadenza && i.scadenza.slice(0, 10) >= today && i.scadenza.slice(0, 10) <= in7days);
          let dot = '⚪';
          if (f.stato === 'pagata') dot = '🟢';
          else if (hasScaduta) dot = '🔴';
          else if (hasInScad) dot = '🟡';
          const tooltip = insts.map(i => {
            const st = i.stato === 'pagata' ? '✅' : (i.scadenza && i.scadenza.slice(0, 10) < today ? '⚠️ SCADUTA' : '⬜');
            const dt = i.scadenza ? new Date(i.scadenza).toLocaleDateString('it-IT') : 'N/D';
            return `${i.scadenza_label || 'Rata ' + i.numero_rata}: \u20ac${parseFloat(i.importo).toFixed(0)} - ${dt} ${st}`;
          }).join('\n');
          let badge = '';
          if (f.stato === 'pagata') badge = '<span style="font-size:10px;padding:2px 6px;border-radius:6px;background:#d1fae5;color:#27AE60;font-weight:600;">Saldato</span>';
          else if (hasScaduta) badge = '<span style="font-size:10px;padding:2px 6px;border-radius:6px;background:#fee2e2;color:#E74C3C;font-weight:600;">Scaduta</span>';
          else if (hasInScad) badge = '<span style="font-size:10px;padding:2px 6px;border-radius:6px;background:#fef3c7;color:#d97706;font-weight:600;">In scadenza</span>';
          return `<div class="fee-row" data-id="${f.id}" title="${tooltip}" style="display:flex;align-items:center;justify-content:space-between;padding:10px 16px;border-bottom:1px solid #f5f5f5;cursor:pointer;transition:background 0.15s;" onmouseover="this.style.background='#fafafa'" onmouseout="this.style.background=''">
            <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:0;">
              <input type="checkbox" class="fee-sel-cb" data-id="${f.id}" style="display:none;width:16px;height:16px;accent-color:#667eea;flex-shrink:0;">
              <span style="font-size:12px;">${dot}</span>
              <span class="fee-row-name" style="font-size:13px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${nome}</span>
            </div>
            <div style="display:flex;align-items:center;gap:10px;flex-shrink:0;">
              <span class="fee-row-rate" style="font-size:12px;color:#888;">${pagate}/${insts.length} rate</span>
              <span style="font-size:13px;font-weight:600;min-width:50px;text-align:right;">€${parseFloat(f.importo_totale).toFixed(0)}</span>
              ${badge}
              ${isAdmin ? `<button class="btn-fee-del" data-id="${f.id}" style="font-size:10px;padding:3px 6px;background:#eee;border:none;border-radius:6px;cursor:pointer;margin-left:4px;">🗑️</button>` : ''}
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>`;
  });

  container.innerHTML = html;

  // Toggle expand/collapse
  container.querySelectorAll('.fee-group-header').forEach(header => {
    header.addEventListener('click', () => {
      const cfg = header.dataset.cfg;
      const body = container.querySelector(`.fee-group-body[data-cfg="${cfg}"]`);
      const chevron = header.querySelector('.fee-group-chevron');
      const open = body.style.display !== 'none';
      body.style.display = open ? 'none' : 'block';
      chevron.style.transform = open ? '' : 'rotate(90deg)';
    });
  });

  // Click riga → dettaglio rate
  container.querySelectorAll('.fee-row').forEach(row => {
    row.addEventListener('click', (e) => {
      if (e.target.closest('.btn-fee-del') || e.target.classList.contains('fee-sel-cb')) return;
      const fee = feesList.find(f => f.id === row.dataset.id);
      if (fee) showInstallmentsModal(fee, isAdmin);
    });
  });

  // Elimina
  container.querySelectorAll('.btn-fee-del').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!confirm('Eliminare questa quota e tutte le rate?')) return;
      try {
        await apiFetch('/fees/' + btn.dataset.id, { method: 'DELETE' });
        loadFees();
      } catch (err) { alert(err.message); }
    });
  });

  // Modalità selezione multipla
  container.querySelectorAll('.btn-fee-select-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const cfg = btn.dataset.cfg;
      const body = container.querySelector(`.fee-group-body[data-cfg="${cfg}"]`);
      const cbs = body.querySelectorAll('.fee-sel-cb');
      const active = cbs[0]?.style.display !== 'none';
      cbs.forEach(cb => { cb.style.display = active ? 'none' : 'inline-block'; cb.checked = false; });
      const delBtn = body.querySelector('.btn-fee-del-selected');
      delBtn.style.display = active ? 'none' : 'inline-block';
      btn.textContent = active ? '☑️ Seleziona' : '❌ Annulla';
    });
  });

  container.querySelectorAll('.btn-fee-del-selected').forEach(btn => {
    btn.addEventListener('click', async () => {
      const cfg = btn.dataset.cfg;
      const body = container.querySelector(`.fee-group-body[data-cfg="${cfg}"]`);
      const ids = [...body.querySelectorAll('.fee-sel-cb:checked')].map(cb => cb.dataset.id);
      if (!ids.length) { showToast('⚠️ Seleziona almeno un giocatore', 'warning'); return; }
      if (!confirm(`Eliminare ${ids.length} quote selezionate?`)) return;
      try {
        await apiFetch('/fees-batch', { method: 'DELETE', body: JSON.stringify({ ids }) });
        showToast(`✅ ${ids.length} quote eliminate`, 'success');
        loadFees();
      } catch (err) { showToast(err.message, 'error'); }
    });
  });
}

// ═══════════════════════════════════════════
// MODAL: Dettaglio rate di una quota
// ═══════════════════════════════════════════
function showInstallmentsModal(fee, isAdmin) {
  const p = rosterMap[fee.player_id];
  const nome = p ? `${p.cognome || ''} ${p.nome || ''}`.trim() : '—';
  const insts = (fee.fee_installment || []).sort((a, b) => a.numero_rata - b.numero_rata);
  // Stato locale per tracciare le modifiche
  const statoLocale = insts.map(inst => ({ id: inst.id, pagata: inst.stato === 'pagata' }));

  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:2000;display:flex;align-items:center;justify-content:center;';

  function renderModal() {
    const tuttePagate = statoLocale.every(s => s.pagata);
    const pagato = parseFloat(fee.importo_pagato) || 0;
    const residuo = parseFloat(fee.importo_totale) - pagato;
    overlay.innerHTML = `<div style="background:white;border-radius:16px;padding:24px;max-width:420px;width:95%;box-shadow:0 20px 60px rgba(0,0,0,0.3);max-height:90vh;overflow-y:auto;">
      <div style="font-size:16px;font-weight:600;margin-bottom:4px;">💰 ${nome}</div>
      <div style="display:flex;gap:12px;align-items:center;font-size:12px;color:#666;margin-bottom:12px;">
        <span>Totale: <strong>€${parseFloat(fee.importo_totale).toFixed(2)}</strong></span>
        <span style="color:#27AE60;">Pagato: <strong>€${pagato.toFixed(2)}</strong></span>
        <span style="color:${residuo > 0 ? '#E74C3C' : '#27AE60'};">Residuo: <strong>€${residuo.toFixed(2)}</strong></span>
      </div>
      ${isAdmin ? `<label style="display:flex;align-items:center;gap:8px;margin-bottom:12px;padding:8px 12px;background:#f8f9fa;border-radius:8px;cursor:pointer;font-size:13px;">
        <input type="checkbox" id="checkAll" ${tuttePagate ? 'checked' : ''} style="width:18px;height:18px;accent-color:#27AE60;"> Segna tutte come pagate
      </label>` : ''}
      <div style="display:grid;gap:6px;">
        ${insts.map((inst, i) => {
          const pagata = statoLocale[i].pagata;
          return `<label style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:${pagata ? '#f0fdf4' : inst.stato === 'parziale' ? '#fefce8' : '#fafafa'};border-radius:10px;border:1px solid ${pagata ? '#bbf7d0' : inst.stato === 'parziale' ? '#fde68a' : '#eee'};cursor:${isAdmin ? 'pointer' : 'default'};">
            ${isAdmin ? `<input type="checkbox" class="inst-check" data-idx="${i}" ${pagata ? 'checked' : ''} style="width:18px;height:18px;accent-color:#27AE60;">` : `<span style="font-size:16px;">${pagata ? '✅' : inst.stato === 'parziale' ? '🟡' : '⬜'}</span>`}
            <div style="flex:1;">
              <div style="font-size:13px;font-weight:500;">${inst.scadenza_label || 'Rata ' + inst.numero_rata}</div>
              <div style="font-size:11px;color:#888;">${inst.scadenza ? new Date(inst.scadenza).toLocaleDateString('it-IT') : ''}</div>
              ${inst.note ? `<div style="font-size:11px;color:#d97706;font-weight:500;margin-top:2px;">💳 ${inst.note}</div>` : ''}
            </div>
            <span style="font-weight:600;font-size:13px;">€${parseFloat(inst.importo).toFixed(2)}</span>
          </label>`;
        }).join('')}
      </div>
      <div style="display:flex;gap:10px;margin-top:16px;justify-content:flex-end;">
        <button class="btn btn-secondary" id="closeInstModal">Annulla</button>
        ${isAdmin ? '<button class="btn btn-primary" id="saveInstModal" style="background:#27AE60;">Salva</button>' : ''}
      </div>
    </div>`;
    bindEvents();
  }

  function bindEvents() {
    const close = () => overlay.remove();
    overlay.querySelector('#closeInstModal').addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

    // Checkbox singole
    overlay.querySelectorAll('.inst-check').forEach(cb => {
      cb.addEventListener('change', () => {
        statoLocale[+cb.dataset.idx].pagata = cb.checked;
        renderModal();
      });
    });

    // Seleziona tutto
    overlay.querySelector('#checkAll')?.addEventListener('change', (e) => {
      statoLocale.forEach(s => s.pagata = e.target.checked);
      renderModal();
    });

    // Salva
    overlay.querySelector('#saveInstModal')?.addEventListener('click', async () => {
      try {
        showLoading('Salvataggio...');
        const promises = statoLocale.map(s => {
          const orig = insts.find(i => i.id === s.id);
          const wasP = orig.stato === 'pagata';
          if (s.pagata && !wasP) return apiFetch('/fee-installments/' + s.id + '/pay', { method: 'PUT', body: JSON.stringify({}) });
          if (!s.pagata && wasP) return apiFetch('/fee-installments/' + s.id + '/unpay', { method: 'PUT', body: JSON.stringify({}) });
          return null;
        }).filter(Boolean);
        if (promises.length) await Promise.all(promises);
        overlay.remove();
        hideLoading();
        loadFees();
      } catch (err) { hideLoading(); alert(err.message); }
    });
  }

  document.body.appendChild(overlay);
  renderModal();
}

// ═══════════════════════════════════════════
// MODAL: Configura quote categoria
// ═══════════════════════════════════════════
function showConfigModal() {
  const workspaceId = window.YFM.activeWorkspaceId;
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:2000;display:flex;align-items:center;justify-content:center;';

  const existingConfigs = feeConfigs.map(cfg => {
    const catLabel = cfg.category_id ? '(categoria specifica)' : '(tutte le categorie)';
    const nPlayers = Object.keys(rosterMap).length;
    return `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;background:#f8f9fa;border-radius:8px;margin-bottom:6px;">
      <div><strong style="font-size:13px;">${cfg.nome}</strong> <span style="font-size:11px;color:#888;">${catLabel}</span><br><span style="font-size:12px;">€${parseFloat(cfg.importo_totale).toFixed(2)} in ${cfg.rate.length} rat${cfg.rate.length === 1 ? 'a' : 'e'}</span></div>
      <div style="display:flex;gap:4px;">
        <button class="btn-edit-cfg" data-id="${cfg.id}" style="padding:4px 8px;background:#f0f4ff;border:1px solid #c7d2fe;border-radius:6px;font-size:11px;cursor:pointer;color:#4338ca;" title="Modifica">✏️</button>
        <button class="btn-dup-cfg" data-id="${cfg.id}" style="padding:4px 8px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;font-size:11px;cursor:pointer;color:#16a34a;" title="Duplica come nuova">📋</button>
        <button class="btn-regen-cfg" data-id="${cfg.id}" style="padding:4px 8px;background:#fef7ed;border:1px solid #fed7aa;border-radius:6px;font-size:11px;cursor:pointer;color:#d97706;" title="Rigenera quote esistenti dalla config">🔄</button>
        <button class="btn-apply-cfg" data-id="${cfg.id}" style="padding:4px 8px;background:#667eea;color:white;border:none;border-radius:6px;font-size:11px;cursor:pointer;" title="Applica a nuovi giocatori">▶</button>
        <button class="btn-del-cfg" data-id="${cfg.id}" style="padding:4px 8px;background:#fef2f2;border:1px solid #fecaca;border-radius:6px;font-size:11px;cursor:pointer;color:#E74C3C;">✕</button>
      </div>
    </div>`;
  }).join('');

  overlay.innerHTML = `<div style="background:white;border-radius:16px;padding:24px;max-width:460px;width:95%;box-shadow:0 20px 60px rgba(0,0,0,0.3);max-height:90vh;overflow-y:auto;">
    <div style="font-size:16px;font-weight:600;margin-bottom:16px;">⚙️ Configura quote categoria</div>
    ${existingConfigs ? `<div style="margin-bottom:16px;">${existingConfigs}</div><hr style="border:none;border-top:1px solid #eee;margin:16px 0;">` : ''}
    <div style="font-size:13px;font-weight:600;margin-bottom:12px;">Nuova configurazione</div>
    <div style="display:grid;gap:12px;">
      <div><label style="font-size:12px;color:#666;">Nome *</label><input id="cfgNome" placeholder="es. Quota annuale" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:8px;box-sizing:border-box;"></div>
      <div><label style="font-size:12px;color:#666;">Categoria</label><select id="cfgCategory" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:8px;">
        <option value="">Tutte le categorie</option>
      </select></div>
      <div><label style="font-size:12px;color:#666;">Importo totale (€) *</label><input id="cfgImporto" type="number" step="0.01" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:8px;box-sizing:border-box;"></div>
      <div>
        <label style="font-size:12px;color:#666;">Modalità pagamento</label>
        <div style="display:flex;gap:8px;margin-top:6px;">
          <label style="display:flex;align-items:center;gap:4px;font-size:13px;cursor:pointer;"><input type="radio" name="cfgModalita" value="unica" checked> Rata unica</label>
          <label style="display:flex;align-items:center;gap:4px;font-size:13px;cursor:pointer;"><input type="radio" name="cfgModalita" value="rate"> Più rate</label>
        </div>
      </div>
      <div id="cfgRateConfig" style="display:none;">
        <label style="font-size:12px;color:#666;">Numero rate</label>
        <input id="cfgNumRate" type="number" min="2" max="12" value="3" style="width:80px;padding:8px;border:1px solid #ddd;border-radius:8px;margin-top:4px;">
      </div>
      <div id="cfgRateList" style="margin-top:8px;"></div>
      <div id="cfgTotaleCheck" style="font-size:12px;color:#888;"></div>
    </div>
    <div style="display:flex;gap:10px;margin-top:16px;justify-content:flex-end;">
      <button class="btn btn-secondary" id="cfgCancelBtn">Chiudi</button>
      <button class="btn btn-primary" id="cfgSaveBtn" style="background:#667eea;">Salva</button>
    </div>
  </div>`;
  document.body.appendChild(overlay);

  // Popola categorie
  const catSelect = overlay.querySelector('#cfgCategory');
  const squadre = window.YFM.allSquadre || [];
  const seen = new Set();
  squadre.forEach(s => {
    const catId = s.category_id || s.category?.id;
    const catNome = s.category?.nome || '';
    if (catId && !seen.has(catId)) {
      seen.add(catId);
      catSelect.innerHTML += `<option value="${catId}">${catNome || catId}</option>`;
    }
  });

  let rate = [];
  const rateList = overlay.querySelector('#cfgRateList');
  const rateConfig = overlay.querySelector('#cfgRateConfig');
  const totaleCheck = overlay.querySelector('#cfgTotaleCheck');
  const radios = overlay.querySelectorAll('input[name="cfgModalita"]');
  const numRateInput = overlay.querySelector('#cfgNumRate');
  const importoInput = overlay.querySelector('#cfgImporto');

  function buildRate() {
    const modalita = overlay.querySelector('input[name="cfgModalita"]:checked').value;
    const importo = parseFloat(importoInput.value) || 0;
    const oldRate = [...rate];
    if (modalita === 'unica') {
      rate = [{ importo: importo, scadenza_label: oldRate[0]?.scadenza_label || 'Iscrizione', scadenza: oldRate[0]?.scadenza || '' }];
    } else {
      const n = parseInt(numRateInput.value) || 3;
      const perRata = Math.floor((importo / n) * 100) / 100;
      const resto = Math.round((importo - perRata * n) * 100) / 100;
      rate = [];
      for (let i = 0; i < n; i++) {
        if (i < oldRate.length) {
          rate.push({ importo: i === 0 ? perRata + resto : perRata, scadenza_label: oldRate[i].scadenza_label || (i === 0 ? 'Iscrizione' : (i + 1) + 'ª rata'), scadenza: oldRate[i].scadenza || '' });
        } else {
          let nextDate = '';
          const lastDate = rate[i - 1]?.scadenza || oldRate[oldRate.length - 1]?.scadenza;
          if (lastDate) nextDate = nextMonthSameDay(lastDate);
          rate.push({ importo: perRata, scadenza_label: (i + 1) + 'ª rata', scadenza: nextDate });
        }
      }
    }
    renderRate();
  }

  function renderRate() {
    if (!rate.length) { rateList.innerHTML = ''; totaleCheck.innerHTML = ''; return; }
    rateList.innerHTML = `<div style="font-size:12px;font-weight:600;color:#666;margin-bottom:8px;">Dettaglio rate</div>` +
      rate.map((r, i) => `<div style="display:flex;gap:6px;align-items:center;margin-bottom:6px;">
        <input class="rata-label" data-idx="${i}" value="${r.scadenza_label || ''}" placeholder="Label" style="width:100px;padding:6px;border:1px solid #ddd;border-radius:6px;font-size:12px;">
        <input class="rata-importo" data-idx="${i}" type="number" step="0.01" value="${r.importo || ''}" style="width:75px;padding:6px;border:1px solid #ddd;border-radius:6px;font-size:12px;">
        <input class="rata-scadenza" data-idx="${i}" type="date" value="${r.scadenza || ''}" style="flex:1;padding:6px;border:1px solid #ddd;border-radius:6px;font-size:12px;">
      </div>`).join('');
    // Totale check
    const sum = rate.reduce((s, r) => s + (parseFloat(r.importo) || 0), 0);
    const importo = parseFloat(importoInput.value) || 0;
    const ok = Math.abs(sum - importo) < 0.01;
    totaleCheck.innerHTML = `Totale rate: €${sum.toFixed(2)} ${ok ? '✅' : `<span style="color:#E74C3C;">≠ €${importo.toFixed(2)}</span>`}`;
    // Bind edits
    rateList.querySelectorAll('.rata-importo').forEach(inp => inp.addEventListener('input', () => { rate[+inp.dataset.idx].importo = parseFloat(inp.value) || 0; updateTotale(); }));
    rateList.querySelectorAll('.rata-label').forEach(inp => inp.addEventListener('input', () => { rate[+inp.dataset.idx].scadenza_label = inp.value; }));
    rateList.querySelectorAll('.rata-scadenza').forEach(inp => inp.addEventListener('input', () => {
      const idx = +inp.dataset.idx;
      rate[idx].scadenza = inp.value;
      if (inp.value) {
        for (let j = idx + 1; j < rate.length; j++) {
          if (!rate[j].scadenza) {
            rate[j].scadenza = nextMonthSameDay(rate[j - 1].scadenza || inp.value);
          }
        }
        renderRate();
      }
    }));
  }

  function updateTotale() {
    const sum = rate.reduce((s, r) => s + (parseFloat(r.importo) || 0), 0);
    const importo = parseFloat(importoInput.value) || 0;
    const ok = Math.abs(sum - importo) < 0.01;
    totaleCheck.innerHTML = `Totale rate: €${sum.toFixed(2)} ${ok ? '✅' : `<span style="color:#E74C3C;">≠ €${importo.toFixed(2)}</span>`}`;
  }

  // Toggle rata unica / più rate
  radios.forEach(r => r.addEventListener('change', () => {
    rateConfig.style.display = r.value === 'rate' && r.checked ? 'block' : 'none';
    if (importoInput.value) buildRate();
  }));
  numRateInput.addEventListener('change', () => { if (importoInput.value) buildRate(); });
  importoInput.addEventListener('input', () => { if (importoInput.value) buildRate(); });

  const close = () => overlay.remove();
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  overlay.querySelector('#cfgCancelBtn').addEventListener('click', close);

  // Elimina config esistente
  overlay.querySelectorAll('.btn-del-cfg').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Eliminare questa configurazione e TUTTE le quote già assegnate ai giocatori?')) return;
      try {
        await apiFetch('/fee-configs/' + btn.dataset.id, { method: 'DELETE' });
        showToast('✅ Configurazione e quote eliminate', 'success');
        close();
        loadFees();
      } catch (err) { showToast(err.message, 'error'); }
    });
  });

  overlay.querySelectorAll('.btn-edit-cfg').forEach(btn => {
    btn.addEventListener('click', () => {
      const cfg = feeConfigs.find(c => c.id === btn.dataset.id);
      if (!cfg) return;
      showEditConfigModal(cfg, async () => { close(); await loadFees(); showConfigModal(); });
    });
  });

  overlay.querySelectorAll('.btn-dup-cfg').forEach(btn => {
    btn.addEventListener('click', async () => {
      const cfg = feeConfigs.find(c => c.id === btn.dataset.id);
      if (!cfg) return;
      try {
        await apiFetch('/fee-configs', { method: 'POST', body: JSON.stringify({
          workspace_id: workspaceId,
          category_id: cfg.category_id,
          nome: cfg.nome + ' (copia)',
          importo_totale: cfg.importo_totale,
          rate: cfg.rate
        })});
        close(); loadFees();
        showToast('✅ Configurazione duplicata', 'success');
      } catch (err) { showToast(err.message, 'error'); }
    });
  });

  overlay.querySelectorAll('.btn-regen-cfg').forEach(btn => {
    btn.addEventListener('click', async () => {
      const cfg = feeConfigs.find(c => c.id === btn.dataset.id);
      if (!cfg) return;
      try {
        showLoading('Rigenerazione quote...');
        const res = await apiFetch('/fee-configs/' + btn.dataset.id + '/rigenera', { method: 'POST' });
        hideLoading();
        showToast(`✅ ${res.rigenerati} quote rigenerate`, 'success');
        close(); loadFees();
      } catch (err) { hideLoading(); showToast(err.message, 'error'); }
    });
  });

  overlay.querySelectorAll('.btn-apply-cfg').forEach(btn => {
    btn.addEventListener('click', async () => {
      await applyConfigToTeam(btn.dataset.id);
      close();
    });
  });

  // Salva
  overlay.querySelector('#cfgSaveBtn').addEventListener('click', async () => {
    const nome = overlay.querySelector('#cfgNome').value.trim();
    const importo_totale = importoInput.value;
    const cat = overlay.querySelector('#cfgCategory').value || null;
    if (!nome || !importo_totale || !rate.length) { alert('Compila nome, importo e configura le rate'); return; }
    const sum = rate.reduce((s, r) => s + (parseFloat(r.importo) || 0), 0);
    if (Math.abs(sum - parseFloat(importo_totale)) > 0.01) { alert('Il totale delle rate non corrisponde all\'importo totale'); return; }
    try {
      const created = await apiFetch('/fee-configs', { method: 'POST', body: JSON.stringify({
        workspace_id: workspaceId,
        category_id: cat,
        nome,
        importo_totale,
        rate: rate.map(r => ({ importo: parseFloat(r.importo), scadenza_label: r.scadenza_label || null, scadenza: r.scadenza || null }))
      })});
      close();
      // Chiedi se applicare subito
      if (created?.id && confirm(`Quota "${nome}" salvata. Applicare subito a tutti i giocatori della rosa?`)) {
        await applyConfigToTeam(created.id);
      } else {
        loadFees();
      }
    } catch (err) { alert(err.message); }
  });
}

// ═══════════════════════════════════════════
// MODAL: Modifica configurazione quota
// ═══════════════════════════════════════════
function showEditConfigModal(cfg, onDone) {
  const ov = document.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:2100;display:flex;align-items:center;justify-content:center;';

  const squadre = window.YFM.allSquadre || [];
  const catOptions = [...new Map(squadre.filter(s => s.category_id || s.category?.id).map(s => [s.category_id || s.category?.id, s.category?.nome || ''])).entries()]
    .map(([id, nome]) => `<option value="${id}" ${id === cfg.category_id ? 'selected' : ''}>${nome || id}</option>`).join('');

  const isMultiRate = cfg.rate.length > 1;
  ov.innerHTML = `<div style="background:white;border-radius:16px;padding:24px;max-width:460px;width:95%;box-shadow:0 20px 60px rgba(0,0,0,0.3);max-height:90vh;overflow-y:auto;">
    <div style="font-size:15px;font-weight:600;margin-bottom:16px;">✏️ Modifica: ${cfg.nome}</div>
    <div style="display:grid;gap:12px;">
      <div><label style="font-size:12px;color:#666;">Nome *</label><input id="editNome" value="${cfg.nome.replace(/"/g, '&quot;')}" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:8px;box-sizing:border-box;"></div>
      <div><label style="font-size:12px;color:#666;">Categoria</label><select id="editCategory" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:8px;"><option value="">Tutte le categorie</option>${catOptions}</select></div>
      <div><label style="font-size:12px;color:#666;">Importo totale (€) *</label><input id="editImporto" type="number" step="0.01" value="${cfg.importo_totale}" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:8px;box-sizing:border-box;"></div>
      <div>
        <label style="font-size:12px;color:#666;">Modalità pagamento</label>
        <div style="display:flex;gap:8px;margin-top:6px;">
          <label style="display:flex;align-items:center;gap:4px;font-size:13px;cursor:pointer;"><input type="radio" name="editModalita" value="unica" ${!isMultiRate ? 'checked' : ''}> Rata unica</label>
          <label style="display:flex;align-items:center;gap:4px;font-size:13px;cursor:pointer;"><input type="radio" name="editModalita" value="rate" ${isMultiRate ? 'checked' : ''}> Più rate</label>
        </div>
      </div>
      <div id="editRateConfig" style="display:${isMultiRate ? 'block' : 'none'};">
        <label style="font-size:12px;color:#666;">Numero rate</label>
        <input id="editNumRate" type="number" min="2" max="12" value="${cfg.rate.length}" style="width:80px;padding:8px;border:1px solid #ddd;border-radius:8px;margin-top:4px;">
      </div>
      <div id="editRateList"></div>
      <div id="editTotaleCheck" style="font-size:12px;color:#888;"></div>
    </div>
    <div style="display:flex;gap:10px;margin-top:16px;justify-content:flex-end;">
      <button class="btn btn-secondary" id="editCancelBtn">Annulla</button>
      <button class="btn btn-primary" id="editSaveBtn" style="background:#667eea;">Salva modifiche</button>
    </div>
  </div>`;
  document.body.appendChild(ov);

  let rate = JSON.parse(JSON.stringify(cfg.rate));
  const rateList = ov.querySelector('#editRateList');
  const totaleCheck = ov.querySelector('#editTotaleCheck');
  const importoInput = ov.querySelector('#editImporto');
  const numRateInput = ov.querySelector('#editNumRate');
  const rateConfig = ov.querySelector('#editRateConfig');

  function renderRate() {
    if (!rate.length) { rateList.innerHTML = ''; totaleCheck.innerHTML = ''; return; }
    rateList.innerHTML = `<div style="font-size:12px;font-weight:600;color:#666;margin-bottom:8px;">Dettaglio rate</div>` +
      rate.map((r, i) => `<div style="display:flex;gap:6px;align-items:center;margin-bottom:6px;">
        <input class="er-label" data-idx="${i}" value="${r.scadenza_label || ''}" placeholder="Label" style="width:100px;padding:6px;border:1px solid #ddd;border-radius:6px;font-size:12px;">
        <input class="er-importo" data-idx="${i}" type="number" step="0.01" value="${r.importo || ''}" style="width:75px;padding:6px;border:1px solid #ddd;border-radius:6px;font-size:12px;">
        <input class="er-scadenza" data-idx="${i}" type="date" value="${r.scadenza || ''}" style="flex:1;padding:6px;border:1px solid #ddd;border-radius:6px;font-size:12px;">
      </div>`).join('');
    updateTotale();
    rateList.querySelectorAll('.er-importo').forEach(inp => inp.addEventListener('input', () => { rate[+inp.dataset.idx].importo = parseFloat(inp.value) || 0; updateTotale(); }));
    rateList.querySelectorAll('.er-label').forEach(inp => inp.addEventListener('input', () => { rate[+inp.dataset.idx].scadenza_label = inp.value; }));
    rateList.querySelectorAll('.er-scadenza').forEach(inp => inp.addEventListener('input', () => {
      const idx = +inp.dataset.idx;
      rate[idx].scadenza = inp.value;
      if (inp.value) {
        for (let j = idx + 1; j < rate.length; j++) {
          if (!rate[j].scadenza) {
            rate[j].scadenza = nextMonthSameDay(rate[j - 1].scadenza || inp.value);
          }
        }
        renderRate();
      }
    }));
  }

  function updateTotale() {
    const sum = rate.reduce((s, r) => s + (parseFloat(r.importo) || 0), 0);
    const importo = parseFloat(importoInput.value) || 0;
    const ok = Math.abs(sum - importo) < 0.01;
    totaleCheck.innerHTML = `Totale rate: €${sum.toFixed(2)} ${ok ? '✅' : `<span style="color:#E74C3C;">≠ €${importo.toFixed(2)}</span>`}`;
  }

  function buildRate() {
    const modalita = ov.querySelector('input[name="editModalita"]:checked').value;
    const importo = parseFloat(importoInput.value) || 0;
    const oldRate = [...rate];
    if (modalita === 'unica') {
      rate = [{ importo, scadenza_label: oldRate[0]?.scadenza_label || 'Iscrizione', scadenza: oldRate[0]?.scadenza || '' }];
    } else {
      const n = parseInt(numRateInput.value) || 3;
      const perRata = Math.floor((importo / n) * 100) / 100;
      const resto = Math.round((importo - perRata * n) * 100) / 100;
      rate = [];
      for (let i = 0; i < n; i++) {
        if (i < oldRate.length) {
          // Mantieni label e data esistenti, ricalcola solo importo
          rate.push({ importo: i === 0 ? perRata + resto : perRata, scadenza_label: oldRate[i].scadenza_label, scadenza: oldRate[i].scadenza || '' });
        } else {
          // Nuova rata: label default, data = mese dopo l'ultima
          let nextDate = '';
          const lastDate = rate[i - 1]?.scadenza || oldRate[oldRate.length - 1]?.scadenza;
          if (lastDate) nextDate = nextMonthSameDay(lastDate);
          rate.push({ importo: perRata, scadenza_label: (i + 1) + 'ª rata', scadenza: nextDate });
        }
      }
    }
    renderRate();
  }

  ov.querySelectorAll('input[name="editModalita"]').forEach(r => r.addEventListener('change', () => {
    rateConfig.style.display = r.value === 'rate' && r.checked ? 'block' : 'none';
    buildRate();
  }));
  numRateInput.addEventListener('change', buildRate);
  importoInput.addEventListener('input', () => { if (rate.length) updateTotale(); });

  renderRate();

  const closeEdit = () => ov.remove();
  ov.addEventListener('click', e => { if (e.target === ov) closeEdit(); });
  ov.querySelector('#editCancelBtn').addEventListener('click', closeEdit);
  ov.querySelector('#editSaveBtn').addEventListener('click', async () => {
    const nome = ov.querySelector('#editNome').value.trim();
    const importo_totale = parseFloat(importoInput.value);
    const category_id = ov.querySelector('#editCategory').value || null;
    if (!nome || !importo_totale || !rate.length) return;
    const sum = rate.reduce((s, r) => s + (parseFloat(r.importo) || 0), 0);
    if (Math.abs(sum - importo_totale) > 0.01) { showToast('⚠️ Il totale delle rate non corrisponde all\'importo', 'warning'); return; }
    try {
      await apiFetch('/fee-configs/' + cfg.id, { method: 'PUT', body: JSON.stringify({
        nome, importo_totale, category_id,
        rate: rate.map(r => ({ importo: parseFloat(r.importo), scadenza_label: r.scadenza_label || null, scadenza: r.scadenza || null }))
      })});
      showToast('✅ Configurazione aggiornata', 'success');
      closeEdit();
      if (onDone) onDone();
    } catch (err) { showToast(err.message, 'error'); }
  });
}

// ═══════════════════════════════════════════
// Applica config alla squadra
// ═══════════════════════════════════════════
async function applyConfigToTeam(cfgId) {
  const players = Object.values(rosterMap);
  if (!players.length) { alert('Nessun giocatore nella rosa'); return; }
  try {
    showLoading('Generazione quote...');
    await apiFetch('/fees-generate', { method: 'POST', body: JSON.stringify({
      fee_config_id: cfgId,
      team_id: window.YFM.squadraId,
      season_id: window.YFM.currentSeasonId,
      player_ids: players.map(p => p.player_id || p.id)
    })});
    hideLoading();
    loadFees();
  } catch (err) {
    hideLoading();
    alert(err.message);
  }
}
