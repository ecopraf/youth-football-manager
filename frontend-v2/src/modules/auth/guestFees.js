/**
 * guestFees.js — Pagina Quote per guest tipo=famiglia
 * Mostra tutte le quote raggruppate per config con stato rate, IBAN, upload/preview ricevuta
 */
import { apiFetch, API_BASE } from '../../services/api.js';
import { showLoading, hideLoading } from '../../utils/ui.js';
import { injectPageHelp } from '../../components/PageHelp.js';

export default async function loadGuestFees() {
  const c = document.getElementById('pageContent');
  injectPageHelp('guestFees');

  // Ripristina variabili guest da sessionStorage se perse
  if (!window.YFM.guestPlayerId) {
    const gs = sessionStorage.getItem('yfm_guest');
    if (gs) { try { const d = JSON.parse(gs); window.YFM.guestPlayerId = d.player_id || null; window.YFM.guestTeamId = d.team_id || null; window.YFM.guestPlayerName = d.player_name || null; } catch {} }
  }
  const playerId = window.YFM.guestPlayerId;
  const teamId = window.YFM.guestTeamId || window.YFM.squadraId;

  if (!playerId || !teamId) {
    c.innerHTML = '<div class="error-box">Link non associato a un giocatore.</div>';
    return;
  }

  c.innerHTML = '<div class="loading"><div class="spinner"></div>Caricamento...</div>';
  showLoading('Caricamento quote...');

  try {
    const fees = await apiFetch(`/fees/guest?team_id=${teamId}`).catch(() => null);
    hideLoading();
    if (document.getElementById('pageContent') !== c) return;
    render(c, fees, playerId, teamId);
  } catch (e) {
    hideLoading();
    if (document.getElementById('pageContent') === c)
      c.innerHTML = `<div class="error-box">Errore: ${e.message}</div>`;
  }
}

function render(c, fees, playerId, teamId) {
  const feeList = Array.isArray(fees) ? fees : [];
  const today = new Date().toISOString().slice(0, 10);

  const feeRates = feeList.flatMap(f => (f.fee_installment || []).map(i => ({
    ...i,
    fee_config_id: f.fee_config_id,
    fee_config_nome: f.fee_config?.nome || 'Quota',
    causale: i.causale_compilata || '',
    iban: f.iban || '',
    intestatario: f.intestatario || '',
    nome_banca: f.nome_banca || ''
  })));

  const iban = feeList[0]?.iban || '';
  const intestatario = feeList[0]?.intestatario || '';
  const nomeBanca = feeList[0]?.nome_banca || '';

  const totale = feeRates.reduce((s, i) => s + (parseFloat(i.importo) || 0), 0);
  const pagato = feeRates.filter(i => i.stato === 'pagata').reduce((s, i) => s + (parseFloat(i.importo) || 0), 0);
  const daPagare = totale - pagato;
  const scaduteCount = feeRates.filter(i => i.stato !== 'pagata' && i.scadenza && i.scadenza.slice(0, 10) < today).length;

  // Raggruppa per fee_config
  const byConfig = {};
  feeRates.forEach(r => {
    const k = r.fee_config_id || 'default';
    if (!byConfig[k]) byConfig[k] = { nome: r.fee_config_nome, rates: [] };
    byConfig[k].rates.push(r);
  });

  c.innerHTML = `
    <style>
      .gf-container { max-width:600px; margin:0 auto; padding:16px; }
      .gf-summary { background:white; border-radius:12px; padding:16px; margin-bottom:12px; border:1px solid #eee; }
      .gf-summary-row { display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; }
      .gf-summary-label { font-size:13px; color:#666; }
      .gf-summary-val { font-size:15px; font-weight:700; }
      .gf-progress { height:8px; background:#eee; border-radius:4px; margin-top:8px; overflow:hidden; }
      .gf-progress-bar { height:100%; background:#27AE60; border-radius:4px; transition:width 0.3s; }
      .gf-section { background:white; border-radius:12px; padding:16px; margin-bottom:12px; border:1px solid #eee; }
      .gf-section-title { font-size:14px; font-weight:700; color:#333; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center; }
      .gf-rata { border-radius:8px; padding:10px 12px; font-size:13px; margin-bottom:6px; }
      .gf-rata-row { display:flex; justify-content:space-between; align-items:center; }
      .gf-rata-actions { display:flex; align-items:center; gap:8px; margin-top:6px; flex-wrap:wrap; }
      .gf-iban-box { margin-top:8px; padding:8px 10px; background:rgba(0,0,0,0.04); border-radius:6px; font-size:11px; color:#555; line-height:1.8; }
      .gf-empty { text-align:center; padding:40px 20px; color:#888; font-size:14px; }
    </style>
    <div class="gf-container">
      <div style="font-size:18px;font-weight:700;color:#1a1a2e;margin-bottom:16px;">💰 Le mie Quote</div>

      ${feeRates.length === 0 ? `<div class="gf-empty">Nessuna quota assegnata.</div>` : `
      <!-- Summary -->
      <div class="gf-summary">
        <div class="gf-summary-row">
          <span class="gf-summary-label">Totale</span>
          <span class="gf-summary-val">€${totale.toFixed(0)}</span>
        </div>
        <div class="gf-summary-row">
          <span class="gf-summary-label">Pagato</span>
          <span class="gf-summary-val" style="color:#27AE60;">€${pagato.toFixed(0)}</span>
        </div>
        <div class="gf-summary-row">
          <span class="gf-summary-label">Da pagare</span>
          <span class="gf-summary-val" style="color:${daPagare > 0 ? '#E74C3C' : '#27AE60'};">€${daPagare.toFixed(0)}</span>
        </div>
        ${scaduteCount > 0 ? `<div style="font-size:12px;color:#E74C3C;font-weight:600;margin-top:6px;">⚠️ ${scaduteCount} rat${scaduteCount === 1 ? 'a scaduta' : 'e scadute'}</div>` : ''}
        <div class="gf-progress"><div class="gf-progress-bar" style="width:${totale > 0 ? Math.round(pagato/totale*100) : 0}%"></div></div>
        <div style="font-size:11px;color:#888;margin-top:4px;text-align:right;">${totale > 0 ? Math.round(pagato/totale*100) : 0}% pagato</div>
      </div>

      <!-- Quote per config -->
      ${Object.values(byConfig).map(cfg => {
        const cfgPagato = cfg.rates.filter(i => i.stato === 'pagata').reduce((s, i) => s + (parseFloat(i.importo) || 0), 0);
        const cfgTotale = cfg.rates.reduce((s, i) => s + (parseFloat(i.importo) || 0), 0);
        return `<div class="gf-section">
          <div class="gf-section-title">
            <span>${cfg.nome}</span>
            <span style="font-size:12px;font-weight:400;color:#888;">€${cfgPagato.toFixed(0)} / €${cfgTotale.toFixed(0)}</span>
          </div>
          ${cfg.rates.sort((a, b) => (a.numero_rata || 0) - (b.numero_rata || 0)).map(i => {
            const isPagata = i.stato === 'pagata';
            const hasRicevuta = !!i.ricevuta_path;
            const scad = i.scadenza ? new Date(i.scadenza).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }) : '';
            const isScaduta = !isPagata && i.scadenza && i.scadenza.slice(0, 10) < today;
            const isInScadenza = !isPagata && !isScaduta && i.scadenza && i.scadenza.slice(0, 10) <= new Date(Date.now() + 7*86400000).toISOString().slice(0, 10);
            const label = i.scadenza_label || `Rata ${i.numero_rata}`;
            let badge, bg;
            if (isPagata)          { badge = '🟢 Pagata';              bg = '#d1fae5'; }
            else if (hasRicevuta)  { badge = '📎 In attesa conferma'; bg = '#fef9c3'; }
            else if (isScaduta)    { badge = '🔴 Scaduta';             bg = '#fee2e2'; }
            else if (isInScadenza) { badge = '🟡 In scadenza';         bg = '#fef3c7'; }
            else                   { badge = '⬜ Da pagare';            bg = '#f8f9fa'; }
            return `<div class="gf-rata" style="background:${bg};">
              <div class="gf-rata-row">
                <span><strong>${label}</strong> — €${parseFloat(i.importo || 0).toFixed(0)}</span>
                <span style="color:#888;font-size:12px;">${scad}</span>
              </div>
              <div class="gf-rata-actions">
                <span style="font-size:11px;">${badge}</span>
                ${isPagata && hasRicevuta ? `<button class="btn btn-secondary gf-view-btn" data-inst-id="${i.id}" style="font-size:11px;padding:3px 8px;">👁 Vedi ricevuta</button>` : ''}
                ${!isPagata && hasRicevuta ? `<span style="font-size:11px;color:#92400e;">Ricevuta caricata ✓</span>` : ''}
                ${!isPagata && !hasRicevuta && iban ? `<button class="btn btn-secondary gf-upload-btn" data-inst-id="${i.id}" data-causale="${encodeURIComponent(i.causale || '')}" style="font-size:11px;padding:3px 8px;">📎 Carica ricevuta</button>` : ''}
              </div>
              ${!isPagata && !hasRicevuta && iban ? `<div class="gf-iban-box">
                🏦 <strong>${intestatario}</strong>${nomeBanca ? ` — ${nomeBanca}` : ''}<br>
                IBAN: <code style="font-size:10px;">${iban}</code><br>
                Causale: <em>${i.causale || ''}</em>
              </div>` : ''}
            </div>`;
          }).join('')}
        </div>`;
      }).join('')}
      `}
    </div>`;

  // Handler upload ricevuta
  c.querySelectorAll('.gf-upload-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const instId = btn.dataset.instId;
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/jpeg,image/png,application/pdf';
      input.onchange = async () => {
        const file = input.files[0];
        if (!file) return;
        const allowed = ['application/pdf', 'image/jpeg', 'image/png'];
        if (!allowed.includes(file.type)) { if (window.showToast) window.showToast('❌ Formato non supportato. Usa PDF, JPG o PNG.', 'error'); return; }
        if (file.size > 5 * 1024 * 1024) { if (window.showToast) window.showToast('❌ File troppo grande (max 5MB)', 'error'); return; }
        const fd = new FormData();
        fd.append('ricevuta', file);
        btn.disabled = true;
        btn.textContent = '⏳ Caricamento...';
        try {
          const guestRaw = sessionStorage.getItem('yfm_guest');
          let token = null;
          try { token = guestRaw ? JSON.parse(guestRaw).jwt : null; } catch { token = null; }
          if (!token) throw new Error('Sessione guest scaduta, ricaricare la pagina');
          const res = await fetch(`${API_BASE}/fee-installments/${instId}/upload-ricevuta`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: fd
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Errore upload');
          if (window.showToast) window.showToast('✅ Ricevuta caricata! La segreteria la verificherà a breve.', 'success');
          // Ricarica la pagina per aggiornare lo stato
          loadGuestFees();
        } catch (err) {
          btn.disabled = false;
          btn.textContent = '📎 Carica ricevuta';
          if (window.showToast) window.showToast('❌ ' + err.message, 'error');
        }
      };
      input.click();
    });
  });

  // Handler preview ricevuta
  c.querySelectorAll('.gf-view-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const instId = btn.dataset.instId;
      btn.disabled = true;
      btn.textContent = '⏳';
      try {
        const guestRaw = sessionStorage.getItem('yfm_guest');
        let token = null;
        try { token = guestRaw ? JSON.parse(guestRaw).jwt : null; } catch { token = null; }
        const res = await fetch(`${API_BASE}/fee-installments/${instId}/ricevuta`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (!res.ok || !data.url) throw new Error('Ricevuta non disponibile');
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:3000;display:flex;align-items:center;justify-content:center;padding:16px;';
        const isPdf = data.url.includes('.pdf');
        overlay.innerHTML = `<div style="background:white;border-radius:12px;padding:16px;max-width:500px;width:100%;max-height:90vh;overflow:auto;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
            <span style="font-weight:700;">📎 Ricevuta</span>
            <button id="closePreview" style="background:none;border:none;font-size:20px;cursor:pointer;">✕</button>
          </div>
          ${isPdf
            ? `<iframe src="${data.url}" style="width:100%;height:400px;border:none;border-radius:8px;"></iframe>`
            : `<img src="${data.url}" style="width:100%;border-radius:8px;" alt="Ricevuta">`}
          <a href="${data.url}" target="_blank" class="btn btn-primary" style="display:block;text-align:center;margin-top:12px;">↗ Apri in nuova scheda</a>
        </div>`;
        overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
        overlay.querySelector('#closePreview').addEventListener('click', () => overlay.remove());
        document.body.appendChild(overlay);
      } catch (err) {
        alert('Errore: ' + err.message);
      } finally {
        btn.disabled = false;
        btn.textContent = '👁 Vedi ricevuta';
      }
    });
  });
}
