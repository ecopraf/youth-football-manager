import { apiFetch } from '../../services/api';
import { showLoading, hideLoading } from '../../utils/ui';

function showToast(msg, type = 'info') {
  const t = document.createElement('div');
  const bg = type === 'error' ? '#E74C3C' : type === 'success' ? '#27AE60' : '#667eea';
  t.style.cssText = `position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:${bg};color:white;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:600;z-index:9999;box-shadow:0 4px 12px rgba(0,0,0,0.2);`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

function showConfirm(msg, onConfirm) {
  const ov = document.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:3000;display:flex;align-items:center;justify-content:center;';
  ov.innerHTML = `<div style="background:white;border-radius:16px;padding:24px;max-width:320px;width:90%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
    <div style="font-size:14px;color:#333;margin-bottom:20px;line-height:1.5;">${msg}</div>
    <div style="display:flex;gap:10px;justify-content:center;">
      <button id="cfNo" style="padding:8px 20px;border:1px solid #ddd;border-radius:8px;background:white;cursor:pointer;font-size:13px;">Annulla</button>
      <button id="cfSi" style="padding:8px 20px;border:none;border-radius:8px;background:#667eea;color:white;cursor:pointer;font-size:13px;font-weight:600;">Conferma</button>
    </div>
  </div>`;
  document.body.appendChild(ov);
  ov.querySelector('#cfNo').addEventListener('click', () => ov.remove());
  ov.querySelector('#cfSi').addEventListener('click', () => { ov.remove(); onConfirm(); });
  ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
}

let tokens = [];
let categorie = [];
let workspaces = [];
let rosterPlayers = [];
let sortField = 'cognome';
let sortAsc = true;

export default async function loadGuestLinks() {
  const c = document.getElementById('pageContent');
  const user = window.YFM.getUser() || {};
  const isSuperadmin = user.is_superadmin;
  const isAdmin = user.ruolo === 'admin';

  if (!isSuperadmin && !isAdmin && !window.YFM.canWrite('guest_links')) {
    c.innerHTML = '<div class="error-box">Accesso riservato</div>';
    return;
  }

  c.innerHTML = `
    <style>
      .gl-filter-bar { display:flex;gap:6px;flex-wrap:wrap; }
      .gl-filter { border:1px solid #ddd;background:white;border-radius:20px;padding:4px 12px;font-size:12px;cursor:pointer;color:#666; }
      .gl-filter.active { background:#667eea;color:white;border-color:#667eea; }
      .gl-grid { display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px;margin-top:16px; }
      .gl-card { background:white;border-radius:12px;border:1px solid #eee;padding:14px 16px; }
      .gl-card.expired { border-left:3px solid #E74C3C;opacity:0.8; }
      .gl-card.active-link { border-left:3px solid #27AE60; }
      .gl-card-header { display:flex;align-items:center;justify-content:space-between;margin-bottom:8px; }
      .gl-name { font-weight:700;font-size:14px;color:#1a1a2e; }
      .gl-meta { font-size:11px;color:#888;margin-top:2px; }
      .gl-actions { display:flex;gap:6px;margin-top:10px;flex-wrap:wrap; }
      .gl-btn { border:none;border-radius:8px;padding:6px 12px;font-size:12px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:4px; }
      .gl-btn-copy { background:#eef2ff;color:#667eea; }
      .gl-btn-wa { background:#e8f8f0;color:#27AE60; }
      .gl-btn-renew { background:#fef9ec;color:#d97706; }
      .gl-btn-del { background:#fef2f2;color:#E74C3C; }
      .gl-empty { text-align:center;padding:40px;color:#999;font-size:14px; }
      @media(max-width:500px) { .gl-grid { grid-template-columns:1fr; } }
    </style>
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:8px;">
      <h1 class="page-title">🔗 Link Guest</h1>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button class="btn btn-primary" id="btnCreateLink" data-help="guest.genera">+ Crea Link</button>
        <button class="btn btn-secondary" id="btnBatchLinks">👥 Genera Famiglia</button>
      </div>
    </div>
    <div id="seasonWarning"></div>
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
      <div class="gl-filter-bar">
        <button class="gl-filter active" data-f="all">Tutti</button>
        <button class="gl-filter" data-f="famiglia">👨👩👦 Famiglia</button>
        <button class="gl-filter" data-f="ospite">👋 Ospite</button>
        <button class="gl-filter" data-f="expired">🔴 Scaduti</button>
      </div>
      <span id="glCount" style="font-size:12px;color:#888;"></span>
    </div>
    <div id="glGrid" class="gl-grid"></div>`;

  // Modale creazione (aggiunta dinamicamente)
  const modalEl = document.createElement('div');
  modalEl.id = 'linkModal';
  modalEl.style.cssText = 'display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:1000;align-items:center;justify-content:center;';
  modalEl.innerHTML = `<div style="background:white;border-radius:16px;padding:24px;max-width:500px;width:95%;text-align:left;max-height:90vh;overflow-y:auto;">
    <h2 style="margin-bottom:4px;">Crea Link di Accesso</h2>
    <p style="color:#888;font-size:12px;margin-bottom:20px;">Stagione: ${window.YFM.allStagioni?.find(s=>s.id===window.YFM.currentSeasonId)?.nome || 'corrente'}</p>
    <form id="linkForm">
      ${isSuperadmin ? `<div class="form-group" id="wsGroup"><label>Workspace *</label><select id="linkWorkspace" required></select></div>` : ''}
      <div class="form-group"><label>Tipo di accesso *</label>
        <select id="linkTipo" required>
          <option value="famiglia">👨👩👦 Famiglia</option>
          <option value="ospite">👋 Ospite</option>
        </select>
      </div>
      <div class="form-group" id="playerGroup" style="display:none;"><label>Giocatore *</label>
        <select id="linkPlayer"><option value="">-- Seleziona giocatore --</option></select>
      </div>
      <div class="form-group" id="catGroup" style="align-items:flex-start;"><label>Categoria *</label>
        <div id="linkCategorie" style="display:block;text-align:left;"></div>
      </div>
      <div class="form-group"><label>Scadenza</label>
        <select id="linkScadenza">
          <option value="30">30 giorni</option>
          <option value="90">90 giorni</option>
          <option value="365">Fine stagione (30/06)</option>
          <option value="">Nessuna scadenza</option>
        </select>
      </div>
      <div style="display:flex;gap:12px;margin-top:20px;">
        <button type="submit" class="btn btn-primary">Crea Link</button>
        <button type="button" class="btn btn-secondary" id="btnCancelLink">Annulla</button>
      </div>
    </form>
  </div>`;
  document.body.appendChild(modalEl);
    

  // Disabilita bottoni se stagione scaduta
  if (isSeasonExpiredForLinks()) {
    document.getElementById('btnCreateLink').disabled = true;
    document.getElementById('btnCreateLink').style.opacity = '0.5';
    document.getElementById('btnBatchLinks').disabled = true;
    document.getElementById('btnBatchLinks').style.opacity = '0.5';
    const warn = document.getElementById('seasonWarning');
    if (warn) warn.innerHTML = `<div style="background:#fff3cd;border-radius:8px;padding:10px 14px;margin-bottom:12px;color:#856404;font-size:13px;">⚠️ <strong>Stagione conclusa</strong> — Seleziona la stagione corrente per generare nuovi link.</div>`;
  }

  document.getElementById('btnCreateLink').addEventListener('click', openCreateModal);
  document.getElementById('btnBatchLinks').addEventListener('click', handleBatchGenerate);

  document.querySelectorAll('.gl-filter').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.gl-filter').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderTokens(btn.dataset.f);
    });
  });

  modalEl.querySelector('#linkForm').addEventListener('submit', handleCreate);
  modalEl.querySelector('#btnCancelLink').addEventListener('click', () => { modalEl.style.display = 'none'; });
  modalEl.addEventListener('click', e => { if (e.target === modalEl) modalEl.style.display = 'none'; });
  modalEl.querySelector('#linkTipo').addEventListener('change', onTipoChange);
  if (isSuperadmin) modalEl.querySelector('#linkWorkspace').addEventListener('change', onWorkspaceChange);

  showLoading('Caricamento...');
  await loadData();
  hideLoading();
}

function updateActionBtns() {} // non più usata, mantenuta per compatibilità

async function handleDeleteSelected() {} // non più usata

async function handleRenewSelected() {} // non più usata

async function loadData() {
  const user = window.YFM.getUser() || {};
  try {
    // Filtra link per categoria e stagione della squadra selezionata
    const squadra = window.YFM.getSquadra();
    const catId = squadra.category_id || '';
    const seasonId = squadra.season_id || '';
    const params = new URLSearchParams();
    if (catId) params.set('categoryId', catId);
    if (seasonId) params.set('seasonId', seasonId);
    const qs = params.toString() ? '?' + params.toString() : '';
    const tokensRes = await apiFetch('/auth/guest-links' + qs);
    tokens = tokensRes.links || [];

    const teamId = window.YFM.squadraId;
    if (teamId) {
      try {
        const rosterData = await apiFetch('/squadre/' + teamId + '/calciatori');
        rosterPlayers = (rosterData || []).map(r => ({
          id: r.player_id || r.id,
          nome: r.nome, cognome: r.cognome, telefono: r.telefono || null
        }));
      } catch(e) { rosterPlayers = []; }
    }

    if (user.is_superadmin) {
      try { workspaces = await apiFetch('/auth/workspaces'); } catch(e) { workspaces = []; }
      workspaces = Array.isArray(workspaces) ? workspaces : (workspaces.data || []);
      const allCats = await Promise.all(workspaces.map(w => apiFetch(`/workspaces/${w.id}/categorie`).catch(() => [])));
      categorie = allCats.flat();
    } else {
      const wsId = user.workspace_id;
      if (wsId) {
        try { categorie = await apiFetch(`/workspaces/${wsId}/categorie`); } catch(e) { categorie = []; }
      }
    }

    renderTokens();
  } catch (err) {
    const grid = document.getElementById('glGrid');
    if (grid) grid.innerHTML = `<div class="gl-empty" style="color:#c00;">Errore: ${err.message}</div>`;
  }
}

function renderTokens(filter) {
  const grid = document.getElementById('glGrid');
  const countEl = document.getElementById('glCount');
  if (!grid) return;

  const now = new Date();
  let list = [...tokens].sort((a, b) => {
    const pa = rosterPlayers.find(p => p.id === a.player_id);
    const pb = rosterPlayers.find(p => p.id === b.player_id);
    const na = pa ? `${pa.cognome} ${pa.nome}` : 'zzz';
    const nb = pb ? `${pb.cognome} ${pb.nome}` : 'zzz';
    return na.localeCompare(nb);
  });

  if (filter === 'famiglia') list = list.filter(t => t.tipo === 'famiglia');
  else if (filter === 'ospite') list = list.filter(t => t.tipo === 'ospite');
  else if (filter === 'expired') list = list.filter(t => t.scadenza && new Date(t.scadenza) < now);

  if (countEl) countEl.textContent = `${list.length} link`;

  if (list.length === 0) {
    grid.innerHTML = '<div class="gl-empty">🔗 Nessun link trovato</div>';
    return;
  }

  grid.innerHTML = list.map(t => {
    const isExpired = t.scadenza && new Date(t.scadenza) < now;
    const catText = (t.squadre_accesso || []).map(id => categorie.find(c => c.id === id)?.nome || '?').join(', ') || 'Tutte';
    const link = `${window.location.origin}/guest/${t.token}`;
    const playerInfo = t.player || rosterPlayers.find(p => p.id === t.player_id);
    const playerName = playerInfo ? `${playerInfo.cognome} ${playerInfo.nome}` : null;
    const telefono = t.telefono || playerInfo?.telefono || '';
    const waNum = telefono.replace(/[^0-9+]/g, '');
    const waNumFull = waNum ? (waNum.startsWith('+') ? waNum : '+39' + waNum) : '';
    const waLink = waNumFull ? `https://wa.me/${waNumFull}?text=${encodeURIComponent('Ciao! Ecco il tuo accesso a Youth Football Manager: ' + link)}` : '';
    const scadenzaStr = t.scadenza ? new Date(t.scadenza).toLocaleDateString('it-IT') : 'Nessuna';

    return `<div class="gl-card ${isExpired ? 'expired' : 'active-link'}">
      <div class="gl-card-header">
        <div>
          <div class="gl-name">${playerName || (t.tipo === 'ospite' ? '👋 Ospite' : '👥 Famiglia')}</div>
          <div class="gl-meta">${t.tipo === 'famiglia' ? '👨👩👦 Famiglia' : '👋 Ospite'} · ${catText}</div>
        </div>
        <div style="text-align:right;">
          ${isExpired
            ? '<span style="font-size:11px;font-weight:600;color:#E74C3C;">🔴 Scaduto</span>'
            : '<span style="font-size:11px;font-weight:600;color:#27AE60;">🟢 Attivo</span>'}
          <div style="font-size:11px;color:#aaa;margin-top:2px;">scade ${scadenzaStr}</div>
        </div>
      </div>
      ${telefono ? `<div style="font-size:11px;color:#888;margin-bottom:6px;">📱 ${telefono}</div>` : ''}
      <div class="gl-actions">
        <button class="gl-btn gl-btn-copy" data-copy="${link}">📋 Copia link</button>
        ${waLink ? `<a href="${waLink}" target="_blank" class="gl-btn gl-btn-wa" style="text-decoration:none;">📲 WhatsApp</a>` : ''}
        ${isExpired ? `<button class="gl-btn gl-btn-renew" data-renew="${t.token}">🔄 Rinnova</button>` : ''}
        <button class="gl-btn gl-btn-del" data-revoke="${t.token}">🗑️</button>
      </div>
    </div>`;
  }).join('');

  grid.querySelectorAll('[data-copy]').forEach(btn => {
    btn.addEventListener('click', () => {
      navigator.clipboard.writeText(btn.dataset.copy)
        .then(() => showToast('📋 Link copiato!', 'success'))
        .catch(() => prompt('Copia il link:', btn.dataset.copy));
    });
  });

  grid.querySelectorAll('[data-renew]').forEach(btn => {
    btn.addEventListener('click', async () => {
      showConfirm('Rinnovare questo link fino a fine stagione (30/06)?', async () => {
        try {
          showLoading('Rinnovo...');
          await apiFetch('/auth/guest-links-renew', { method: 'PUT', body: JSON.stringify({ tokens: [btn.dataset.renew] }) });
          hideLoading();
          await loadData();
        } catch (err) { hideLoading(); showToast(err.message, 'error'); }
      });
    });
  });

  grid.querySelectorAll('[data-revoke]').forEach(btn => {
    btn.addEventListener('click', async () => {
      showConfirm('Revocare questo link di accesso?', async () => {
        try {
          showLoading('Revoca...');
          await apiFetch(`/auth/guest-link/${btn.dataset.revoke}`, { method: 'DELETE' });
          hideLoading();
          await loadData();
        } catch (err) { hideLoading(); showToast(err.message, 'error'); }
      });
    });
  });
}

async function openCreateModal() {
  const user = window.YFM.getUser() || {};
  const modal = document.getElementById('linkModal');
  modal.style.display = 'flex';

  if (user.is_superadmin) {
    const wsSel = document.getElementById('linkWorkspace');
    wsSel.innerHTML = '<option value="">-- Seleziona workspace --</option>' +
      workspaces.map(w => `<option value="${w.id}">${w.nome}</option>`).join('');
    // Pre-seleziona workspace attivo
    const activeWsId = window.YFM.activeWorkspaceId;
    if (activeWsId) {
      wsSel.value = activeWsId;
      // Carica categorie del workspace attivo
      try { categorie = await apiFetch(`/workspaces/${activeWsId}/categorie`); } catch(e) { categorie = []; }
    }
    renderCatCheckboxes([], false);
  } else if (user.ruolo === 'allenatore') {
    const userCats = user.categorie_accesso || [];
    renderCatCheckboxes(userCats, true);
  } else {
    // admin: categorie già caricate in loadData
    renderCatCheckboxes([], false);
  }
  // Inizializza stato tipo (famiglia è default → mostra subito playerGroup)
  onTipoChange();
}

async function onWorkspaceChange() {
  const wsId = document.getElementById('linkWorkspace').value;
  if (!wsId) { document.getElementById('linkCategorie').innerHTML = ''; return; }
  try {
    categorie = await apiFetch(`/workspaces/${wsId}/categorie`);
  } catch(e) { categorie = []; }
  renderCatCheckboxes([], false);
}

function renderCatCheckboxes(preselected, disabled) {
  const container = document.getElementById('linkCategorie');
  container.style.cssText = 'text-align:left;display:block;';
  if (categorie.length === 0) {
    container.innerHTML = '<p style="color:#999;font-size:13px;">Nessuna categoria disponibile</p>';
    return;
  }
  container.innerHTML = `<div style="display:flex;flex-wrap:wrap;gap:4px 16px;">${categorie.map(cat => {
    const checked = preselected.includes(cat.id) ? 'checked' : '';
    const dis = disabled ? 'checked disabled' : checked;
    return `<label style="display:flex;align-items:center;gap:6px;padding:4px 0;cursor:pointer;white-space:nowrap;">
      <input type="checkbox" name="linkCat" value="${cat.id}" ${dis}>
      <span style="font-size:13px;">${cat.nome}</span>
    </label>`;
  }).join('')}</div>`;
}

async function handleCreate(e) {
  e.preventDefault();
  if (isSeasonExpiredForLinks()) { showToast('Stagione conclusa — seleziona la stagione corrente', 'error'); return; }

  const user = window.YFM.getUser() || {};
  const tipo = document.getElementById('linkTipo').value;
  const scadenza_giorni = document.getElementById('linkScadenza').value || null;

  let categorie_accesso = [];
  if (user.ruolo === 'allenatore') {
    categorie_accesso = user.categorie_accesso || [];
  } else {
    categorie_accesso = Array.from(document.querySelectorAll('#linkCategorie input[type="checkbox"]:checked')).map(cb => cb.value);
  }
  if (categorie_accesso.length === 0) { showToast('Seleziona almeno una categoria', 'error'); return; }

  const squadra = window.YFM.getSquadra();
  const body = { tipo, categorie_accesso, scadenza_giorni: scadenza_giorni ? parseInt(scadenza_giorni) : null };
  if (squadra?.season_id) body.season_id = squadra.season_id;

  if (tipo === 'famiglia') {
    const playerId = document.getElementById('linkPlayer').value;
    if (!playerId) { showToast('Seleziona un giocatore', 'error'); return; }
    body.player_id = playerId;
    const p = rosterPlayers.find(r => r.id === playerId);
    if (p?.telefono) body.telefono = p.telefono;
  }

  showLoading('Creazione link...');
  try {
    const result = await apiFetch('/auth/guest-link', { method: 'POST', body: JSON.stringify(body) });
    hideLoading();
    document.getElementById('linkModal').style.display = 'none';
    if (result.link) await navigator.clipboard.writeText(result.link).catch(() => {});
    showToast('✅ Link creato e copiato negli appunti!', 'success');
    await loadData();
  } catch (err) {
    hideLoading();
    showToast(err.message, 'error');
  }
}

function onTipoChange() {
  const tipo = document.getElementById('linkTipo').value;
  const playerGroup = document.getElementById('playerGroup');
  playerGroup.style.display = tipo === 'famiglia' ? 'block' : 'none';
  if (tipo === 'famiglia' && rosterPlayers.length > 0) {
    // Filtra: mostra solo giocatori senza link atleta attivo
    const linkedPlayerIds = new Set(tokens.filter(t => t.tipo === 'famiglia' && t.player_id && new Date(t.scadenza) > new Date()).map(t => t.player_id));
    const available = rosterPlayers.filter(p => !linkedPlayerIds.has(p.id));
    const sel = document.getElementById('linkPlayer');
    sel.innerHTML = available.length > 0
      ? '<option value="">-- Seleziona giocatore --</option>' + available.map(p => `<option value="${p.id}">${p.cognome} ${p.nome}${p.telefono ? ' 📱' : ''}</option>`).join('')
      : '<option value="">-- Tutti i giocatori hanno già un link --</option>';
  }
}

function isSeasonExpiredForLinks() {
  const squadra = window.YFM.getSquadra();
  if (!squadra || !squadra.season_id) return false;
  const stagioni = window.YFM.allStagioni || window.YFM.accessibleSeasons || [];
  const season = stagioni.find(s => s.id === squadra.season_id);
  if (!season || !season.data_fine) return false;
  const dataFine = new Date(season.data_fine);
  const limite = new Date(dataFine.getFullYear(), dataFine.getMonth() + 1, 31, 23, 59, 59); // 31 luglio
  return new Date() > limite;
}

async function handleBatchGenerate() {
  if (isSeasonExpiredForLinks()) { showToast('Stagione conclusa — seleziona la stagione corrente', 'error'); return; }
  const teamId = window.YFM.squadraId;
  if (!teamId) { showToast('Seleziona una squadra', 'error'); return; }

  showConfirm('Generare link famiglia per tutti i giocatori attivi della rosa?<br><small style="color:#888;">I giocatori con link valido verranno saltati.</small>', async () => {
    const user = window.YFM.getUser() || {};
    let categorie_accesso = [];
    if (user.ruolo === 'allenatore') {
      categorie_accesso = user.categorie_accesso || [];
    } else {
      const squad = window.YFM.allSquadre?.find(s => s.id === teamId);
      if (squad?.category_id) categorie_accesso = [squad.category_id];
    }
    showLoading('Generazione link...');
    try {
      const result = await apiFetch('/auth/guest-links-batch', { method: 'POST', body: JSON.stringify({ team_id: teamId, categorie_accesso }) });
      hideLoading();
      showToast(`✅ Generati: ${result.generated} · Già esistenti: ${result.skipped}`, 'success');
      await loadData();
    } catch (err) { hideLoading(); showToast(err.message, 'error'); }
  });
}
