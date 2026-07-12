import { apiFetch } from '../../services/api';
import { showLoading, hideLoading } from '../../utils/ui';

const STATI_COLORS = { da_pagare: '#E74C3C', parziale: '#F39C12', pagata: '#27AE60' };
const STATI_LABELS = { da_pagare: 'Da pagare', parziale: 'Parziale', pagata: 'Pagata' };

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
        ${isAdmin ? '<button class="btn btn-primary" id="btnConfigFee" style="font-size:13px;">⚙️ Configura e applica quote</button>' : ''}
      </div>
    </div>
    <div style="display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap;">
      <div style="padding:10px 16px;background:#f0fdf4;border-radius:10px;font-size:13px;">Totale: <strong>€${totDovuto.toFixed(2)}</strong></div>
      <div style="padding:10px 16px;background:#eef2ff;border-radius:10px;font-size:13px;">Incassato: <strong>€${totPagato.toFixed(2)}</strong></div>
      <div style="padding:10px 16px;background:#fef2f2;border-radius:10px;font-size:13px;">Pendenti: <strong style="color:#E74C3C;">${pendenti}</strong></div>
    </div>
    <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;">
      <button class="btn btn-secondary btn-filter active" data-filter="all" style="font-size:12px;padding:6px 12px;">Tutte</button>
      <button class="btn btn-secondary btn-filter" data-filter="da_pagare" style="font-size:12px;padding:6px 12px;">Da pagare</button>
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
  const filtered = filter === 'all' ? feesList : feesList.filter(f => f.stato === filter);

  if (!filtered.length) {
    container.innerHTML = '<p style="color:var(--gray);font-size:13px;margin-top:12px;">Nessuna quota trovata.</p>';
    return;
  }

  container.innerHTML = `
    <div style="overflow-x:auto;-webkit-overflow-scrolling:touch;">
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead><tr style="background:#F8F9FA;">
          <th style="padding:8px 6px;text-align:left;">Giocatore</th>
          <th style="padding:8px 6px;text-align:right;">Totale</th>
          <th style="padding:8px 6px;text-align:center;">Rate</th>
          <th style="padding:8px 6px;text-align:center;">Stato</th>
          ${isAdmin ? '<th style="padding:8px 6px;text-align:center;">Azioni</th>' : ''}
        </tr></thead>
        <tbody>${filtered.map(f => {
          const p = rosterMap[f.player_id];
          const nome = p ? `${p.cognome || ''} ${p.nome || ''}`.trim() : '—';
          const insts = f.fee_installment || [];
          const pagate = insts.filter(i => i.stato === 'pagata').length;
          const color = STATI_COLORS[f.stato] || '#888';
          return `<tr style="border-bottom:1px solid #f0f0f0;cursor:pointer;" class="fee-row" data-id="${f.id}">
            <td style="padding:8px 6px;font-weight:500;">${nome}</td>
            <td style="padding:8px 6px;text-align:right;">€${parseFloat(f.importo_totale).toFixed(2)}</td>
            <td style="padding:8px 6px;text-align:center;">${pagate}/${insts.length}</td>
            <td style="padding:8px 6px;text-align:center;"><span style="padding:3px 8px;border-radius:8px;font-size:11px;background:${color}20;color:${color};">${STATI_LABELS[f.stato] || f.stato}</span></td>
            ${isAdmin ? `<td style="padding:8px 6px;text-align:center;"><button class="btn-fee-del" data-id="${f.id}" style="font-size:10px;padding:3px 6px;background:#eee;border:none;border-radius:6px;cursor:pointer;">🗑️</button></td>` : ''}
          </tr>`;
        }).join('')}</tbody>
      </table>
    </div>`;

  // Click riga → dettaglio rate
  container.querySelectorAll('.fee-row').forEach(row => {
    row.addEventListener('click', (e) => {
      if (e.target.closest('.btn-fee-del')) return;
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
    overlay.innerHTML = `<div style="background:white;border-radius:16px;padding:24px;max-width:420px;width:95%;box-shadow:0 20px 60px rgba(0,0,0,0.3);max-height:90vh;overflow-y:auto;">
      <div style="font-size:16px;font-weight:600;margin-bottom:4px;">💰 ${nome}</div>
      <div style="font-size:12px;color:#666;margin-bottom:12px;">Totale: €${parseFloat(fee.importo_totale).toFixed(2)}</div>
      ${isAdmin ? `<label style="display:flex;align-items:center;gap:8px;margin-bottom:12px;padding:8px 12px;background:#f8f9fa;border-radius:8px;cursor:pointer;font-size:13px;">
        <input type="checkbox" id="checkAll" ${tuttePagate ? 'checked' : ''} style="width:18px;height:18px;accent-color:#27AE60;"> Segna tutte come pagate
      </label>` : ''}
      <div style="display:grid;gap:6px;">
        ${insts.map((inst, i) => {
          const pagata = statoLocale[i].pagata;
          return `<label style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:${pagata ? '#f0fdf4' : '#fafafa'};border-radius:10px;border:1px solid ${pagata ? '#bbf7d0' : '#eee'};cursor:${isAdmin ? 'pointer' : 'default'};">
            ${isAdmin ? `<input type="checkbox" class="inst-check" data-idx="${i}" ${pagata ? 'checked' : ''} style="width:18px;height:18px;accent-color:#27AE60;">` : `<span style="font-size:16px;">${pagata ? '✅' : '⬜'}</span>`}
            <div style="flex:1;">
              <div style="font-size:13px;font-weight:500;">${inst.scadenza_label || 'Rata ' + inst.numero_rata}</div>
              <div style="font-size:11px;color:#888;">${inst.scadenza ? new Date(inst.scadenza).toLocaleDateString('it-IT') : ''}</div>
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
        <button class="btn-apply-cfg" data-id="${cfg.id}" style="padding:4px 8px;background:#667eea;color:white;border:none;border-radius:6px;font-size:11px;cursor:pointer;" title="Applica a ${nPlayers} giocatori">▶ Applica</button>
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
    if (modalita === 'unica') {
      rate = [{ importo: importo, scadenza_label: 'Iscrizione', scadenza: '' }];
    } else {
      const n = parseInt(numRateInput.value) || 3;
      const perRata = Math.floor((importo / n) * 100) / 100;
      const resto = Math.round((importo - perRata * n) * 100) / 100;
      rate = [];
      for (let i = 0; i < n; i++) {
        rate.push({
          importo: i === 0 ? perRata + resto : perRata,
          scadenza_label: i === 0 ? 'Iscrizione' : (i + 1) + 'ª rata',
          scadenza: ''
        });
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
      // Auto-avanza mese successivo per le rate seguenti senza data
      if (inp.value) {
        for (let j = idx + 1; j < rate.length; j++) {
          if (!rate[j].scadenza) {
            const prev = new Date(rate[j - 1].scadenza || inp.value);
            const next = new Date(prev);
            next.setMonth(next.getMonth() + 1);
            rate[j].scadenza = next.toISOString().split('T')[0];
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
      try {
        await apiFetch('/fee-configs/' + btn.dataset.id, { method: 'DELETE' });
        close();
        loadFees();
      } catch (err) { alert(err.message); }
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
      await apiFetch('/fee-configs', { method: 'POST', body: JSON.stringify({
        workspace_id: workspaceId,
        category_id: cat,
        nome,
        importo_totale,
        rate: rate.map(r => ({ importo: parseFloat(r.importo), scadenza_label: r.scadenza_label || null, scadenza: r.scadenza || null }))
      })});
      close();
      loadFees();
    } catch (err) { alert(err.message); }
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
