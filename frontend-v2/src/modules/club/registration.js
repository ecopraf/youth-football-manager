import { apiFetch } from '../../services/api';
import { showLoading, hideLoading } from '../../utils/ui';

// Calcola anno nascita atteso basato su categoria e stagione
function getExpectedBirthYear() {
  const cat = window.YFM.getSquadraName?.() || '';
  const match = cat.match(/(?:under|u)\s*(\d+)/i);
  if (!match) return null;
  const eta = parseInt(match[1]);
  const seasons = window.YFM.accessibleSeasons || [];
  const current = seasons.find(s => s.id === window.YFM.currentSeasonId);
  const sName = current?.nome || '';
  const yearMatch = sName.match(/(\d{4})\/(\d{2,4})/);
  const annoFinale = yearMatch ? (yearMatch[2].length === 2 ? 2000 + parseInt(yearMatch[2]) : parseInt(yearMatch[2])) : new Date().getFullYear();
  return annoFinale - eta;
}

function getBirthPlaceholder() {
  const yr = getExpectedBirthYear();
  if (!yr) return null;
  const today = new Date();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  return `${yr}-${mm}-${dd}`;
}

function showToast(msg, type = 'info') {
  const colors = { success: '#27AE60', error: '#E74C3C', warning: '#F39C12', info: '#667eea' };
  const t = document.createElement('div');
  t.textContent = msg;
  t.style.cssText = `position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:${colors[type] || colors.info};color:white;padding:10px 20px;border-radius:8px;font-size:13px;z-index:9999;box-shadow:0 4px 12px rgba(0,0,0,0.2);`;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

const STATI = { non_iniziato: '⬜ Non iniziato', incompleto: '🟡 Incompleto', completo: '🟢 Completo', tesserato: '✅ Tesserato' };
const STATI_COLORS = { non_iniziato: '#999', incompleto: '#F39C12', completo: '#27AE60', tesserato: '#667eea' };

let template = null;
let registrations = [];
let activeTab = 'situazione';

export default async function loadRegistration() {
  const c = document.getElementById('pageContent');
  const teamId = window.YFM.squadraId;
  const workspaceId = window.YFM.activeWorkspaceId;
  const seasonId = window.YFM.currentSeasonId;

  if (!teamId) { c.innerHTML = '<div class="error-box">Nessuna squadra selezionata.</div>'; return; }

  showLoading('Caricamento tesseramenti...');
  try {
    [template, registrations] = await Promise.all([
      apiFetch(`/workspaces/${workspaceId}/registration-template`),
      apiFetch(`/squadre/${teamId}/registrations`)
    ]);
  } catch (e) { c.innerHTML = `<div class="error-box">${e.message}</div>`; return; }
  finally { hideLoading(); }

  render(c, teamId, workspaceId, seasonId);
}

function render(c, teamId, workspaceId, seasonId) {
  const totale = registrations.length;
  const completi = registrations.filter(r => r.stato === 'completo' || r.stato === 'tesserato').length;

  c.innerHTML = `
    <div style="max-width:900px;margin:0 auto;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:8px;">
        <h2 style="margin:0;">📋 Tesseramento</h2>
        ${totale > 0 ? `<span style="font-size:13px;color:#666;">${completi}/${totale} completati</span>` : ''}
      </div>
      <div style="display:flex;gap:8px;margin-bottom:16px;">
        <button class="tab-btn ${activeTab === 'situazione' ? 'active' : ''}" data-tab="situazione">📊 Situazione</button>
        <button class="tab-btn ${activeTab === 'template' ? 'active' : ''}" data-tab="template">⚙️ Template</button>
      </div>
      <div id="regTabContent"></div>
    </div>
  `;

  c.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      activeTab = btn.dataset.tab;
      render(c, teamId, workspaceId, seasonId);
    });
  });

  const tabContent = c.querySelector('#regTabContent');
  if (activeTab === 'situazione') renderSituazione(tabContent, teamId, seasonId);
  else renderTemplate(tabContent, workspaceId);
}

// ─── TAB SITUAZIONE ───
function renderSituazione(container, teamId, seasonId) {
  const canWrite = window.YFM.canWrite('rosa');

  container.innerHTML = `
    ${canWrite ? `<div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;">
      <button id="btnNewPlayer" class="btn btn-secondary" style="font-size:13px;">➕ Nuovo giocatore</button>
      <button id="btnBatchReg" class="btn btn-primary" style="font-size:13px;">🔄 Genera per tutta la rosa</button>
      ${registrations.length > 0 ? '<button id="btnDeleteAll" class="btn btn-secondary" style="font-size:13px;color:#E74C3C;border-color:#E74C3C;">🗑️ Elimina tutti</button>' : ''}
    </div>` : ''}
    <div id="regFilterBar" style="margin-bottom:12px;display:flex;gap:8px;flex-wrap:wrap;">
      <input type="text" id="regSearch" placeholder="Cerca giocatore..." style="padding:8px 12px;border:1px solid #ddd;border-radius:8px;font-size:13px;width:200px;">
      <select id="regFilterStato" style="padding:8px;border:1px solid #ddd;border-radius:8px;font-size:13px;">
        <option value="">Tutti</option>
        <option value="non_iniziato">Non iniziato</option>
        <option value="incompleto">Incompleto</option>
        <option value="completo">Completo</option>
        <option value="tesserato">Tesserato</option>
      </select>
    </div>
    <div id="regList"></div>
  `;

  if (canWrite) {
    container.querySelector('#btnNewPlayer').addEventListener('click', () => openNewPlayerModal(teamId, seasonId, container));
    const btnDeleteAll = container.querySelector('#btnDeleteAll');
    if (btnDeleteAll) {
      btnDeleteAll.addEventListener('click', () => {
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:2000;display:flex;align-items:center;justify-content:center;padding:16px;';
        overlay.innerHTML = `<div style="background:white;border-radius:16px;padding:24px;max-width:360px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.3);text-align:center;">
          <div style="font-size:32px;margin-bottom:12px;">⚠️</div>
          <div style="font-size:15px;font-weight:600;margin-bottom:8px;">Eliminare TUTTI i tesseramenti?</div>
          <div style="font-size:13px;color:#666;margin-bottom:20px;">Potrai rigenerarli dal template aggiornato.</div>
          <div style="display:flex;gap:8px;justify-content:center;">
            <button id="delCancel" class="btn btn-secondary" style="font-size:13px;">Annulla</button>
            <button id="delConfirm" class="btn btn-primary" style="font-size:13px;background:#E74C3C;">Elimina tutti</button>
          </div>
        </div>`;
        document.body.appendChild(overlay);
        overlay.querySelector('#delCancel').addEventListener('click', () => overlay.remove());
        overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
        overlay.querySelector('#delConfirm').addEventListener('click', async () => {
          overlay.remove();
          try {
            showLoading('Eliminazione...');
            await apiFetch(`/squadre/${teamId}/registrations-batch`, { method: 'DELETE' });
            registrations = [];
            showToast('Tesseramenti eliminati', 'success');
            renderSituazione(container, teamId, seasonId);
          } catch (e) { showToast(e.message, 'error'); }
          finally { hideLoading(); }
        });
      });
    }
    container.querySelector('#btnBatchReg').addEventListener('click', () => {
      const overlay = document.createElement('div');
      overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:2000;display:flex;align-items:center;justify-content:center;padding:16px;';
      overlay.innerHTML = `<div style="background:white;border-radius:16px;padding:24px;max-width:360px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.3);text-align:center;">
        <div style="font-size:32px;margin-bottom:12px;">🔄</div>
        <div style="font-size:15px;font-weight:600;margin-bottom:8px;">Genera tesseramenti</div>
        <div style="font-size:13px;color:#666;margin-bottom:20px;">Generare tesseramenti per tutti i giocatori attivi della rosa?<br>Quelli già esistenti verranno saltati.</div>
        <div style="display:flex;gap:8px;justify-content:center;">
          <button id="batchCancel" class="btn btn-secondary" style="font-size:13px;">Annulla</button>
          <button id="batchConfirm" class="btn btn-primary" style="font-size:13px;">Genera</button>
        </div>
      </div>`;
      document.body.appendChild(overlay);
      overlay.querySelector('#batchCancel').addEventListener('click', () => overlay.remove());
      overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
      overlay.querySelector('#batchConfirm').addEventListener('click', async () => {
        overlay.remove();
        try {
          showLoading('Generazione...');
          const res = await apiFetch(`/squadre/${teamId}/registrations-batch`, {
            method: 'POST', body: JSON.stringify({ season_id: seasonId, template_id: template?.id })
          });
          showToast(`${res.created} tesseramenti creati`, 'success');
          registrations = await apiFetch(`/squadre/${teamId}/registrations`);
          renderRegList(container.querySelector('#regList'), canWrite);
        } catch (e) { showToast(e.message, 'error'); }
        finally { hideLoading(); }
      });
    });
  }

  const search = container.querySelector('#regSearch');
  const filter = container.querySelector('#regFilterStato');
  const listEl = container.querySelector('#regList');

  const rerender = () => renderRegList(listEl, canWrite, search.value, filter.value);
  search.addEventListener('input', rerender);
  filter.addEventListener('change', rerender);
  rerender();
}

function renderRegList(listEl, canWrite, searchTerm = '', filterStato = '') {
  let filtered = [...registrations];
  filtered.sort((a, b) => {
    const pa = a.player || {}, pb = b.player || {};
    return (`${pa.cognome} ${pa.nome}`).localeCompare(`${pb.cognome} ${pb.nome}`);
  });
  if (searchTerm) {
    const s = searchTerm.toLowerCase();
    filtered = filtered.filter(r => {
      const p = r.player;
      return p && (`${p.cognome} ${p.nome}`).toLowerCase().includes(s);
    });
  }
  if (filterStato) filtered = filtered.filter(r => r.stato === filterStato);

  if (filtered.length === 0) {
    listEl.innerHTML = '<div style="text-align:center;color:#999;padding:32px;">Nessun tesseramento trovato</div>';
    return;
  }

  listEl.innerHTML = filtered.map(r => {
    const p = r.player || {};
    const docs = r.documenti_consegnati || [];
    const consegnati = docs.filter(d => d.consegnato).length;
    const totDocs = docs.length;
    const pct = totDocs > 0 ? Math.round(consegnati / totDocs * 100) : 0;

    return `<div class="reg-card" data-id="${r.id}" style="background:white;border:1px solid #eee;border-radius:12px;padding:14px 16px;margin-bottom:8px;cursor:pointer;transition:box-shadow 0.2s;">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
        <div style="flex:1;min-width:0;">
          <div style="font-weight:600;font-size:14px;">${p.cognome || ''} ${p.nome || ''}</div>
          <div style="font-size:12px;color:#666;margin-top:2px;">📄 ${consegnati}/${totDocs} documenti · <span style="color:${STATI_COLORS[r.stato]}">${STATI[r.stato]}</span></div>
        </div>
        <div style="width:48px;height:48px;border-radius:50%;background:conic-gradient(${STATI_COLORS[r.stato]} ${pct}%, #eee ${pct}%);display:flex;align-items:center;justify-content:center;">
          <span style="background:white;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;">${pct}%</span>
        </div>
      </div>
    </div>`;
  }).join('');

  listEl.querySelectorAll('.reg-card').forEach(card => {
    card.addEventListener('click', () => openDetail(card.dataset.id, canWrite));
  });
}

async function openDetail(regId, canWrite) {
  const reg = registrations.find(r => r.id === regId);
  if (!reg) return;
  const p = reg.player || {};
  const docs = reg.documenti_consegnati || [];

  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:2000;display:flex;align-items:center;justify-content:center;padding:16px;';
  overlay.innerHTML = `<div style="background:white;border-radius:16px;padding:24px;max-width:500px;width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
      <h3 style="margin:0;">📋 ${p.cognome} ${p.nome}</h3>
      <button id="closeDetail" style="background:none;border:none;font-size:20px;cursor:pointer;">✕</button>
    </div>
    <div style="margin-bottom:16px;">
      <label style="font-size:12px;font-weight:600;color:#555;">Dati Atleta</label>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px;">
        <input id="plNome" placeholder="Nome" value="${p.nome || ''}" style="padding:8px;border:1px solid #ddd;border-radius:8px;font-size:13px;" ${canWrite ? '' : 'disabled'}>
        <input id="plCognome" placeholder="Cognome" value="${p.cognome || ''}" style="padding:8px;border:1px solid #ddd;border-radius:8px;font-size:13px;" ${canWrite ? '' : 'disabled'}>
        <input id="plDataNascita" type="date" value="${p.data_nascita ? p.data_nascita.slice(0,10) : ''}" style="padding:8px;border:1px solid #ddd;border-radius:8px;font-size:13px;" ${canWrite ? '' : 'disabled'}>
        <input id="plLuogoNascita" placeholder="Luogo di nascita" value="${p.luogo_nascita || ''}" style="padding:8px;border:1px solid #ddd;border-radius:8px;font-size:13px;" ${canWrite ? '' : 'disabled'}>
        <input id="plCF" placeholder="Codice Fiscale" value="${p.codice_fiscale || ''}" style="padding:8px;border:1px solid #ddd;border-radius:8px;font-size:13px;font-family:monospace;text-transform:uppercase;" ${canWrite ? '' : 'disabled'}>
        <input id="plResidenza" placeholder="Residenza" value="${p.residenza || ''}" style="padding:8px;border:1px solid #ddd;border-radius:8px;font-size:13px;grid-column:span 2;" ${canWrite ? '' : 'disabled'}>
      </div>
    </div>
    <div style="margin-bottom:16px;">
      <label style="font-size:12px;font-weight:600;color:#555;">Documenti</label>
      <div id="docsList" style="margin-top:8px;">
        ${docs.map((d, i) => `<label style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid #f5f5f5;cursor:${canWrite ? 'pointer' : 'default'};">
          <input type="checkbox" data-idx="${i}" ${d.consegnato ? 'checked' : ''} ${canWrite ? '' : 'disabled'} style="width:18px;height:18px;">
          <span style="font-size:13px;${d.consegnato ? 'text-decoration:line-through;color:#999;' : ''}">${d.nome}</span>
        </label>`).join('')}
      </div>
    </div>
    <div style="margin-bottom:16px;">
      <label style="font-size:12px;font-weight:600;color:#555;">Dati Genitore</label>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px;">
        <input id="genNome" placeholder="Nome genitore" value="${reg.dati_genitore?.nome || ''}" style="padding:8px;border:1px solid #ddd;border-radius:8px;font-size:13px;" ${canWrite ? '' : 'disabled'}>
        <input id="genCognome" placeholder="Cognome genitore" value="${reg.dati_genitore?.cognome || ''}" style="padding:8px;border:1px solid #ddd;border-radius:8px;font-size:13px;" ${canWrite ? '' : 'disabled'}>
        <select id="genParentela" style="padding:8px;border:1px solid #ddd;border-radius:8px;font-size:13px;" ${canWrite ? '' : 'disabled'}>
          <option value="">Parentela</option>
          <option value="padre" ${reg.dati_genitore?.parentela === 'padre' ? 'selected' : ''}>Padre</option>
          <option value="madre" ${reg.dati_genitore?.parentela === 'madre' ? 'selected' : ''}>Madre</option>
          <option value="tutore" ${reg.dati_genitore?.parentela === 'tutore' ? 'selected' : ''}>Tutore</option>
        </select>
        <input id="genDocTipo" placeholder="Tipo documento" value="${reg.dati_genitore?.documento_tipo || ''}" style="padding:8px;border:1px solid #ddd;border-radius:8px;font-size:13px;" ${canWrite ? '' : 'disabled'}>
        <input id="genDocNumero" placeholder="N° documento" value="${reg.dati_genitore?.documento_numero || ''}" style="padding:8px;border:1px solid #ddd;border-radius:8px;font-size:13px;" ${canWrite ? '' : 'disabled'}>
        <input id="genDocRilascio" type="date" value="${reg.dati_genitore?.documento_rilasciato || ''}" style="padding:8px;border:1px solid #ddd;border-radius:8px;font-size:13px;" ${canWrite ? '' : 'disabled'}>
      </div>
    </div>
    ${canWrite ? `<div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;">
      <button id="btnDeleteReg" class="btn btn-secondary" style="font-size:13px;color:#E74C3C;">🗑️</button>
      ${docs.some(d => !d.consegnato) ? `<button id="btnSollecitoReg" class="btn btn-secondary" style="font-size:13px;">📩 Sollecita</button>` : ''}
      ${reg.stato !== 'tesserato' ? `<button id="btnTesserato" class="btn btn-secondary" style="font-size:13px;background:#667eea20;color:#667eea;border-color:#667eea;">✅ Tesserato</button>` : ''}
      <button id="btnSaveReg" class="btn btn-primary" style="font-size:13px;">💾 Salva</button>
      <button id="btnPdfReg" class="btn btn-secondary" style="font-size:13px;">📄 PDF</button>
    </div>` : ''}
  </div>`;

  document.body.appendChild(overlay);
  overlay.querySelector('#closeDetail').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

  // Date picker: posiziona sull'anno atteso se campo vuoto
  const birthInput = overlay.querySelector('#plDataNascita');
  if (birthInput && !birthInput.value) {
    const placeholder = getBirthPlaceholder();
    if (placeholder) {
      birthInput.addEventListener('focus', function() { if (!this.value) this.value = placeholder; }, { once: true });
      birthInput.addEventListener('change', function() { if (this.value === placeholder) this.value = ''; });
    }
  }

  if (canWrite) {
    overlay.querySelector('#btnDeleteReg').addEventListener('click', async () => {
      if (!confirm(`Eliminare il tesseramento di ${p.cognome} ${p.nome}?`)) return;
      try {
        await apiFetch(`/registrations/${regId}`, { method: 'DELETE' });
        registrations = registrations.filter(r => r.id !== regId);
        showToast('Eliminato', 'success');
        overlay.remove();
        const listEl = document.querySelector('#regList');
        if (listEl) renderRegList(listEl, canWrite);
      } catch (e) { showToast(e.message, 'error'); }
    });

    overlay.querySelector('#btnSaveReg').addEventListener('click', async () => {
      const checkboxes = overlay.querySelectorAll('#docsList input[type=checkbox]');
      const updatedDocs = docs.map((d, i) => ({ ...d, consegnato: checkboxes[i].checked, data_consegna: checkboxes[i].checked ? (d.data_consegna || new Date().toISOString().split('T')[0]) : null }));
      const dati_genitore = {
        nome: overlay.querySelector('#genNome').value,
        cognome: overlay.querySelector('#genCognome').value,
        parentela: overlay.querySelector('#genParentela').value,
        documento_tipo: overlay.querySelector('#genDocTipo').value,
        documento_numero: overlay.querySelector('#genDocNumero').value,
        documento_rilasciato: overlay.querySelector('#genDocRilascio').value
      };
      // Auto-calcola stato
      const obbligatori = template?.documenti_richiesti?.filter(d => d.obbligatorio).map(d => d.nome) || [];
      const tuttiConsegnati = obbligatori.every(nome => updatedDocs.find(d => d.nome === nome && d.consegnato));
      const genComplete = !!(genitore.nome && genitore.cognome && genitore.documento_tipo && genitore.documento_numero);
      const resComplete = !!overlay.querySelector('#plResidenza').value.trim();
      const stato = (tuttiConsegnati && genComplete && resComplete) ? 'completo' : (updatedDocs.some(d => d.consegnato) || genitore.nome || resComplete ? 'incompleto' : 'non_iniziato');

      // Dati atleta
      const playerUpdate = {
        nome: overlay.querySelector('#plNome').value.trim(),
        cognome: overlay.querySelector('#plCognome').value.trim(),
        data_nascita: overlay.querySelector('#plDataNascita').value || null,
        luogo_nascita: overlay.querySelector('#plLuogoNascita').value.trim() || null,
        codice_fiscale: overlay.querySelector('#plCF').value.trim().toUpperCase() || null,
        residenza: overlay.querySelector('#plResidenza').value.trim() || null
      };

      try {
        await apiFetch(`/registrations/${regId}`, {
          method: 'PUT', body: JSON.stringify({ documenti_consegnati: updatedDocs, dati_genitore, stato })
        });
        // Salva dati atleta
        if (reg.player_id) {
          await apiFetch(`/calciatori/${reg.player_id}`, { method: 'PUT', body: JSON.stringify(playerUpdate) }).catch(() => {});
        }
        const idx = registrations.findIndex(r => r.id === regId);
        if (idx >= 0) {
          registrations[idx].documenti_consegnati = updatedDocs;
          registrations[idx].dati_genitore = dati_genitore;
          registrations[idx].stato = stato;
          if (registrations[idx].player) Object.assign(registrations[idx].player, playerUpdate);
        }
        showToast('Salvato', 'success');
        overlay.remove();
        const listEl = document.querySelector('#regList');
        if (listEl) renderRegList(listEl, canWrite);
      } catch (e) { showToast(e.message, 'error'); }
    });

    overlay.querySelector('#btnPdfReg').addEventListener('click', () => {
      window.YFM.navigateTo('print-tesseramento', { id: regId });
      overlay.remove();
    });

    overlay.querySelector('#btnSollecitoReg')?.addEventListener('click', async () => {
      try {
        const res = await apiFetch(`/registrations/${regId}/sollecito`, { method: 'POST' });
        showToast(`Sollecito inviato a ${res.atleta} (${res.mancanti} doc mancanti)`, 'success');
      } catch (e) { showToast(e.message, 'error'); }
    });

    overlay.querySelector('#btnTesserato')?.addEventListener('click', async () => {
      // Validazione: tutti i doc obbligatori consegnati + dati genitore + residenza + documento
      const checkboxes = overlay.querySelectorAll('#docsList input[type=checkbox]');
      const currentDocs = docs.map((d, i) => ({ ...d, consegnato: checkboxes[i].checked }));
      const obbligatori = template?.documenti_richiesti?.filter(d => d.obbligatorio).map(d => d.nome) || [];
      const docMancanti = obbligatori.filter(nome => !currentDocs.find(d => d.nome === nome && d.consegnato));
      const genNome = overlay.querySelector('#genNome').value.trim();
      const genCognome = overlay.querySelector('#genCognome').value.trim();
      const genDocTipo = overlay.querySelector('#genDocTipo').value.trim();
      const genDocNumero = overlay.querySelector('#genDocNumero').value.trim();
      const residenza = overlay.querySelector('#plResidenza').value.trim();
      if (docMancanti.length > 0) {
        showToast(`Documenti obbligatori mancanti: ${docMancanti.join(', ')}`, 'error');
        return;
      }
      if (!genNome || !genCognome) {
        showToast('Dati genitore incompleti (nome e cognome obbligatori)', 'error');
        return;
      }
      if (!genDocTipo || !genDocNumero) {
        showToast('Documento genitore mancante (tipo e numero obbligatori)', 'error');
        return;
      }
      if (!residenza) {
        showToast('Residenza atleta mancante', 'error');
        return;
      }
      try {
        await apiFetch(`/registrations/${regId}`, { method: 'PUT', body: JSON.stringify({ stato: 'tesserato' }) });
        // Invia notifica alla famiglia
        const teamId = window.YFM.squadraId;
        const playerName = reg.player ? `${reg.player.cognome} ${reg.player.nome}` : '';
        await apiFetch('/notifications', { method: 'POST', body: JSON.stringify({
          team_id: teamId, tipo: 'avviso', titolo: '✅ Tesseramento completato',
          messaggio: `Il tesseramento di ${playerName} è stato completato e confermato dalla segreteria.`,
          destinatario_tipo: ['atleta', 'genitore'], destinatario_player_id: reg.player_id
        }) }).catch(() => {});
        const idx = registrations.findIndex(r => r.id === regId);
        if (idx >= 0) registrations[idx].stato = 'tesserato';
        showToast('Tesseramento confermato + notifica inviata', 'success');
        overlay.remove();
        const listEl = document.querySelector('#regList');
        if (listEl) renderRegList(listEl, canWrite);
      } catch (e) { showToast(e.message, 'error'); }
    });
  }
}

// ─── NUOVO GIOCATORE ───
function openNewPlayerModal(teamId, seasonId, parentContainer) {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:2000;display:flex;align-items:center;justify-content:center;padding:16px;';
  overlay.innerHTML = `<div style="background:white;border-radius:16px;padding:24px;max-width:440px;width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
      <h3 style="margin:0;">➕ Nuovo Giocatore + Tesseramento</h3>
      <button id="closeNewPlayer" style="background:none;border:none;font-size:20px;cursor:pointer;">✕</button>
    </div>
    <div style="font-size:12px;color:#666;margin-bottom:16px;">Il giocatore verrà aggiunto alla rosa e il tesseramento creato automaticamente.</div>
    <div style="display:grid;gap:10px;">
      <input id="npCognome" placeholder="Cognome *" style="padding:8px 12px;border:1px solid #ddd;border-radius:8px;font-size:13px;">
      <input id="npNome" placeholder="Nome *" style="padding:8px 12px;border:1px solid #ddd;border-radius:8px;font-size:13px;">
      <input id="npDataNascita" type="date" placeholder="Data nascita *" style="padding:8px 12px;border:1px solid #ddd;border-radius:8px;font-size:13px;">
      <input id="npTelefono" type="tel" placeholder="Telefono genitore *" style="padding:8px 12px;border:1px solid #ddd;border-radius:8px;font-size:13px;">
      <input id="npLuogoNascita" placeholder="Luogo di nascita" style="padding:8px 12px;border:1px solid #ddd;border-radius:8px;font-size:13px;">
      <input id="npCF" placeholder="Codice Fiscale" style="padding:8px 12px;border:1px solid #ddd;border-radius:8px;font-size:13px;text-transform:uppercase;">
    </div>
    <div id="npError" style="color:#E74C3C;font-size:12px;margin-top:8px;display:none;"></div>
    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px;">
      <button id="npCancel" class="btn btn-secondary" style="font-size:13px;">Annulla</button>
      <button id="npConfirm" class="btn btn-primary" style="font-size:13px;">✅ Crea</button>
    </div>
  </div>`;

  document.body.appendChild(overlay);
  overlay.querySelector('#closeNewPlayer').addEventListener('click', () => overlay.remove());
  overlay.querySelector('#npCancel').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

  // Date picker: posiziona sull'anno atteso
  const npBirth = overlay.querySelector('#npDataNascita');
  const npPlaceholder = getBirthPlaceholder();
  if (npBirth && npPlaceholder) {
    npBirth.addEventListener('focus', function() { if (!this.value) this.value = npPlaceholder; }, { once: true });
    npBirth.addEventListener('change', function() { if (this.value === npPlaceholder) this.value = ''; });
  }

  overlay.querySelector('#npConfirm').addEventListener('click', async () => {
    const cognome = overlay.querySelector('#npCognome').value.trim();
    const nome = overlay.querySelector('#npNome').value.trim();
    const data_nascita = overlay.querySelector('#npDataNascita').value;
    const telefono = overlay.querySelector('#npTelefono').value.trim();
    const luogo_nascita = overlay.querySelector('#npLuogoNascita').value.trim();
    const codice_fiscale = overlay.querySelector('#npCF').value.trim().toUpperCase() || null;
    const errEl = overlay.querySelector('#npError');

    if (!cognome || !nome || !data_nascita || !telefono) {
      errEl.textContent = 'Cognome, nome, data di nascita e telefono genitore sono obbligatori';
      errEl.style.display = 'block';
      return;
    }

    // Check duplicati CF
    if (codice_fiscale) {
      try {
        const existing = await apiFetch(`/squadre/${teamId}/calciatori`).catch(() => []);
        const dup = (existing || []).find(p => p.codice_fiscale && p.codice_fiscale.toUpperCase() === codice_fiscale);
        if (dup) {
          errEl.textContent = `\u26a0\ufe0f Esiste gi\u00e0 un giocatore con questo CF: ${dup.cognome} ${dup.nome}`;
          errEl.style.display = 'block';
          return;
        }
      } catch (e) { /* ignora errore check */ }
    }

    try {
      errEl.style.display = 'none';
      // Crea player + team_player in un colpo
      const player = await apiFetch(`/squadre/${teamId}/calciatori`, {
        method: 'POST',
        body: JSON.stringify({ cognome, nome, data_nascita, luogo_nascita, codice_fiscale, telefono })
      });
      // Crea tesseramento
      await apiFetch('/registrations', {
        method: 'POST',
        body: JSON.stringify({ player_id: player.id, team_id: teamId, season_id: seasonId, template_id: template?.id })
      });
      showToast(`${cognome} ${nome} aggiunto con tesseramento`, 'success');
      overlay.remove();
      registrations = await apiFetch(`/squadre/${teamId}/registrations`);
      const listEl = parentContainer.querySelector('#regList');
      if (listEl) renderRegList(listEl, true);
    } catch (e) {
      errEl.textContent = e.message || 'Errore nella creazione';
      errEl.style.display = 'block';
    }
  });
}

// ─── TAB TEMPLATE ───
function renderTemplate(container, workspaceId) {
  const docs = template?.documenti_richiesti || [];

  container.innerHTML = `
    <div style="background:white;border:1px solid #eee;border-radius:12px;padding:20px;">
      <div style="margin-bottom:16px;">
        <label style="font-size:12px;font-weight:600;color:#555;">Titolo modulo</label>
        <input id="tplTitolo" value="${template?.titolo || ''}" style="width:100%;padding:8px 12px;border:1px solid #ddd;border-radius:8px;font-size:13px;margin-top:4px;box-sizing:border-box;">
      </div>
      <div style="margin-bottom:16px;">
        <label style="font-size:12px;font-weight:600;color:#555;">Intestazione (testo sopra il modulo)</label>
        <textarea id="tplIntestazione" rows="3" style="width:100%;padding:8px 12px;border:1px solid #ddd;border-radius:8px;font-size:13px;margin-top:4px;box-sizing:border-box;resize:vertical;">${template?.intestazione || ''}</textarea>
      </div>
      <div style="margin-bottom:16px;">
        <label style="font-size:12px;font-weight:600;color:#555;">Documenti richiesti</label>
        <div id="tplDocs" style="margin-top:8px;">
          ${docs.map((d, i) => `<div class="tpl-doc-row" style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #f5f5f5;">
            <input type="text" value="${d.nome}" data-idx="${i}" data-field="nome" style="flex:1;padding:6px 8px;border:1px solid #ddd;border-radius:6px;font-size:13px;">
            <label style="font-size:11px;white-space:nowrap;"><input type="checkbox" data-idx="${i}" data-field="obb" ${d.obbligatorio ? 'checked' : ''}> Obb.</label>
            <input type="text" value="${d.nota_eta || ''}" data-idx="${i}" data-field="nota" placeholder="Nota età" style="width:140px;padding:6px 8px;border:1px solid #ddd;border-radius:6px;font-size:12px;">
            <button data-idx="${i}" class="btn-remove-doc" style="background:none;border:none;cursor:pointer;font-size:16px;">🗑️</button>
          </div>`).join('')}
        </div>
        <button id="btnAddDoc" style="margin-top:8px;background:none;border:1px dashed #ccc;border-radius:8px;padding:6px 12px;font-size:12px;cursor:pointer;color:#667eea;">+ Aggiungi documento</button>
      </div>
      <div style="margin-bottom:16px;">
        <label style="font-size:12px;font-weight:600;color:#555;">Clausole / Privacy</label>
        <textarea id="tplClausole" rows="3" style="width:100%;padding:8px 12px;border:1px solid #ddd;border-radius:8px;font-size:13px;margin-top:4px;box-sizing:border-box;resize:vertical;">${template?.clausole || ''}</textarea>
      </div>
      <div style="display:flex;gap:10px;align-items:center;">
        <button id="btnSaveTpl" class="btn btn-primary" style="font-size:13px;">💾 Salva Template</button>
        <button id="btnPrintBlank" class="btn btn-secondary" style="font-size:13px;">🖨️ Stampa modulo vuoto</button>
      </div>
    </div>
  `;

  container.querySelector('#btnAddDoc').addEventListener('click', () => {
    docs.push({ nome: '', obbligatorio: false, nota_eta: null });
    renderTemplate(container, workspaceId);
  });

  container.querySelector('#btnPrintBlank').addEventListener('click', () => {
    window.YFM.navigateTo('print-tesseramento', { blank: 'true' });
  });

  container.querySelectorAll('.btn-remove-doc').forEach(btn => {
    btn.addEventListener('click', () => {
      docs.splice(parseInt(btn.dataset.idx), 1);
      renderTemplate(container, workspaceId);
    });
  });

  container.querySelector('#btnSaveTpl').addEventListener('click', async () => {
    // Raccogli dati
    const rows = container.querySelectorAll('.tpl-doc-row');
    const documenti_richiesti = [];
    rows.forEach(row => {
      const nome = row.querySelector('[data-field="nome"]').value.trim();
      if (!nome) return;
      const obb = row.querySelector('[data-field="obb"]').checked;
      const nota = row.querySelector('[data-field="nota"]').value.trim() || null;
      documenti_richiesti.push({ nome, obbligatorio: obb, nota_eta: nota });
    });

    const body = {
      titolo: container.querySelector('#tplTitolo').value.trim(),
      intestazione: container.querySelector('#tplIntestazione').value.trim(),
      documenti_richiesti,
      clausole: container.querySelector('#tplClausole').value.trim()
    };

    try {
      template = await apiFetch(`/workspaces/${workspaceId}/registration-template`, {
        method: 'PUT', body: JSON.stringify(body)
      });
      showToast('Template salvato', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  });
}
