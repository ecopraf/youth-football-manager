import { apiFetch } from '../../services/api';
import { showLoading, hideLoading } from '../../utils/ui';
import { isOurTeam } from '../../utils/teamMatch';

let workspaces = [];
let allLogos = [];
let currentView = 'list'; // 'list' | 'detail'
let selectedWs = null;

export default async function loadWorkspaces() {
  const c = document.getElementById('pageContent');
  const user = window.YFM.getUser();
  if (!user?.is_superadmin) {
    c.innerHTML = '<div class="error-box">Accesso riservato al superadmin.</div>';
    return;
  }

  showLoading('Caricamento workspace...');
  try {
    [workspaces, allLogos] = await Promise.all([
      apiFetch('/auth/workspaces'),
      apiFetch('/logos')
    ]);
  } catch (e) {
    c.innerHTML = `<div class="error-box">${e.message}</div>`;
    hideLoading();
    return;
  }
  hideLoading();
  render(c);
}

// ── UNIFIED PARSER (TC + testo libero) ──
function parseSocietaText(text) {
  const result = {};
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // ── TC structured keys ──
  const tcMapping = {
    'nome completo': 'nome',
    'colori sociali': 'colori_sociali',
    'sede': 'indirizzo',
    'telefono': 'telefono',
    'sito web': 'sito_web',
    'sponsor tecnico': 'sponsor_tecnico'
  };
  const allKeys = [...Object.keys(tcMapping), 'categoria', 'stadio', 'regione', 'fax', 'email secondaria', 'email', 'facebook', 'instagram'];
  let stadioLines = [];
  let inStadio = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineLow = line.toLowerCase();

    if (inStadio) {
      if (allKeys.some(k => lineLow.startsWith(k))) { inStadio = false; }
      else { stadioLines.push(line); continue; }
    }
    if (/^stadio/i.test(line)) {
      const val = line.replace(/^stadio\s*/i, '').replace(/^\t+/, '').trim();
      if (val) stadioLines.push(val);
      inStadio = true; continue;
    }
    if (lineLow.startsWith('email secondaria')) continue;
    if (lineLow.startsWith('email')) {
      let val = line.substring(5).replace(/^\t+/, '').trim();
      if (!val && i + 1 < lines.length && !allKeys.some(k => lines[i+1].toLowerCase().startsWith(k))) val = lines[++i].trim();
      if (val && val !== '-') result.email = val; continue;
    }
    if (lineLow.startsWith('facebook')) {
      let val = line.substring(8).replace(/^\t+/, '').trim();
      if (!val && i + 1 < lines.length && !allKeys.some(k => lines[i+1].toLowerCase().startsWith(k))) val = lines[++i].trim();
      if (val && val !== '-') result.facebook = val; continue;
    }
    if (lineLow.startsWith('instagram')) {
      let val = line.substring(9).replace(/^\t+/, '').trim();
      if (!val && i + 1 < lines.length && !allKeys.some(k => lines[i+1].toLowerCase().startsWith(k))) val = lines[++i].trim();
      if (val && val !== '-') result.instagram = val; continue;
    }
    let matched = false;
    for (const [key, field] of Object.entries(tcMapping)) {
      if (lineLow.startsWith(key)) {
        let val = line.substring(key.length).replace(/^\t+/, '').trim();
        if (!val && i + 1 < lines.length && !allKeys.some(k => lines[i+1].toLowerCase().startsWith(k))) { val = lines[++i].trim(); }
        if (val && val !== '-') result[field] = val;
        matched = true; break;
      }
    }
    if (matched) continue;
  }
  if (stadioLines.length > 0) {
    result._stadio_nome = stadioLines[0];
    if (stadioLines.length > 1) result._stadio_indirizzo = stadioLines.slice(1).join(', ');
  }

  // ── Generic regex patterns (free text fallback) ──
  const full = text;
  if (!result.matricola_figc) {
    const m = full.match(/matricola\s+f\.?i\.?g\.?c\.?\s*[:\-]?\s*(\d+)/i);
    if (m) result.matricola_figc = m[1];
  }
  if (!result.p_iva) {
    const m = full.match(/p\.?\s*iva\s*[:\-]?\s*(\d{11})/i);
    if (m) result.p_iva = m[1];
  }
  if (!result.codice_fiscale) {
    const m = full.match(/c\.?\s*f\.?\s*[:\-]?\s*([A-Z0-9]{11,16})/i);
    if (m && m[1] !== result.p_iva) result.codice_fiscale = m[1];
  }
  if (!result.sdi) {
    const m = full.match(/\bsdi\s*[:\-]?\s*([A-Z0-9]{6,7})\b/i);
    if (m) result.sdi = m[1].toUpperCase();
  }
  if (!result.telefono) {
    const m = full.match(/tel\.?\s*[:\-]?\s*([0-9][\d\s\/\-]{5,14})/i);
    if (m) result.telefono = m[1].trim();
  }
  if (!result.email) {
    const m = full.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
    if (m) result.email = m[0];
  }
  if (!result.sito_web) {
    const m = full.match(/https?:\/\/[^\s,;]+/i);
    if (m) result.sito_web = m[0];
  }
  if (!result.indirizzo) {
    const m = full.match(/(?:sede|indirizzo|via|viale|piazza|corso|loc\.?)\s+[^,\n]{5,50},\s*[^,\n]{3,30}/i);
    if (m) result.indirizzo = m[0].replace(/^(?:sede legale[^:]*:|indirizzo\s*:?)/i, '').trim();
  }
  if (!result.nome) {
    // First line that looks like a society name (contains ASD/SSD/APS/POLISPORTIVA etc.)
    const m = text.match(/^(.{5,60}(?:asd|ssd|aps|polisportiva|calcio|football|academy|sport)[^\n]*)/im);
    if (m) result.nome = m[1].trim();
  }
  if (!result.forma_giuridica) {
    const m = text.match(/\b(s\.?s\.?d\.?|a\.?s\.?d\.?|s\.?r\.?l\.?|a\.?r\.?l\.?|s\.?p\.?a\.?|a\.?p\.?s\.?)\b/i);
    if (m) result.forma_giuridica = m[1].toUpperCase().replace(/\./g, '');
  }

  return result;
}

// ── FUZZY MATCH ──
function fuzzyMatch(name, filePath) {
  const normalize = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const n = normalize(name);
  const f = normalize(filePath.replace('/logos/', '').replace(/\.(png|jpg|jpeg|svg|webp)$/i, ''));
  if (f.includes(n) || n.includes(f)) return true;
  const nWords = name.toLowerCase().split(/\s+/);
  if (nWords.filter(w => w.length > 2).some(w => f.includes(w.replace(/[^a-z]/g, '')))) return true;
  // Core name matching (handles Pol. Ciampino ↔ Polisportiva Ciampino)
  return isOurTeam(name, filePath.replace('/logos/', '').replace(/\.(png|jpg|jpeg|svg|webp)$/i, '').replace(/-/g, ' '));
}

function findLogo(nome) {
  if (!nome) return null;
  return allLogos.find(l => fuzzyMatch(nome, l)) || null;
}

// ── RENDER ──
function render(c) {
  c.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;">
      <h1 class="page-title">🏢 Gestione Workspace</h1>
      <button class="btn btn-primary" id="btnNewWs">+ Nuovo Workspace</button>
    </div>
    <div id="ticketSummaryCard" style="margin-bottom:24px;"></div>
    <div class="ws-grid" id="wsGrid"></div>

    <!-- MODAL FORM -->
    <div id="wsModal" class="modal-overlay" style="display:none;">
      <div class="modal-content" style="max-width:560px;max-height:90vh;overflow-y:auto;">
        <div class="modal-header">
          <h2 id="wsModalTitle">Nuovo Workspace</h2>
          <button class="modal-close-btn" id="wsModalClose">&times;</button>
        </div>

        <!-- TC PASTE SECTION -->
        <div id="tcPasteSection" style="margin-bottom:16px;">
          <button type="button" class="btn btn-secondary" id="btnTogglePaste" style="width:100%;font-size:13px;">📋 Incolla dati da Tuttocampo</button>
          <div id="tcPasteArea" style="display:none;margin-top:10px;">
            <textarea id="tcPasteInput" rows="6" style="width:100%;border:1px solid #ddd;border-radius:8px;padding:10px;font-size:12px;font-family:monospace;" placeholder="Incolla qui i dati della società (da Tuttocampo, documento ufficiale, email...)..."></textarea>
            <button type="button" class="btn btn-primary" id="btnParsePaste" style="margin-top:8px;font-size:12px;">⚡ Analizza e precompila</button>
          </div>
          <div id="parseRecap" style="display:none;"></div>
        </div>

        <form id="wsForm">
          <div class="form-group"><label>Nome *</label><input id="wsNome" required></div>
          <div class="form-group"><label>Nome Breve</label><input id="wsNomeBreve" placeholder="es. DF Academy (mostrato in sidebar/dashboard)"></div>
          <div id="logoPreview" style="margin:12px 0;text-align:center;"></div>
          <input type="hidden" id="wsId">
          <input type="hidden" id="wsLogoUrl">
          <div style="display:flex;justify-content:flex-end;gap:12px;margin-top:20px;">
            <button type="button" class="btn btn-secondary" id="btnChooseLogo">🖼️ Scegli Logo</button>
            <button type="submit" class="btn btn-primary">💾 Salva</button>
          </div>
        </form>
      </div>
    </div>

    <!-- LOGO GRID MODAL -->
    <div id="logoGridModal" class="modal-overlay" style="display:none;">
      <div class="modal-content" style="max-width:640px;max-height:90vh;overflow-y:auto;">
        <div class="modal-header">
          <h2>Seleziona Logo</h2>
          <button class="modal-close-btn" id="logoGridClose">&times;</button>
        </div>
        <div style="padding:12px 16px 0;"><input type="text" id="logoSearch" placeholder="🔍 Cerca logo (es. pomezia, lodigiani...)" style="width:100%;padding:10px 14px;border:1px solid #ddd;border-radius:8px;font-size:13px;box-sizing:border-box;"></div>
        <div id="logoGrid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(70px,1fr));gap:10px;padding:16px;"></div>
      </div>
    </div>

    <!-- DELETE MODAL -->
    <div id="deleteModal" class="modal-overlay" style="display:none;">
      <div class="modal-content" style="max-width:440px;">
        <div class="modal-header"><h2>⚠️ Elimina Workspace</h2><button class="modal-close-btn" id="delModalClose">&times;</button></div>
        <div id="deleteRecap"></div>
        <div style="display:flex;justify-content:flex-end;gap:12px;margin-top:20px;">
          <button class="btn btn-secondary" id="delCancel">Annulla</button>
          <button class="btn btn-danger" id="delConfirm" style="background:#E74C3C;color:white;">🗑️ Elimina Definitivamente</button>
        </div>
      </div>
    </div>

    <style>
      .ws-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:20px;}
      .ws-card{background:white;border-radius:12px;padding:20px;box-shadow:0 2px 8px rgba(0,0,0,0.08);transition:transform .2s,box-shadow .2s;}
      .ws-card:hover{transform:translateY(-4px);box-shadow:0 8px 20px rgba(0,0,0,0.12);}
      .ws-card-header{display:flex;align-items:center;gap:12px;margin-bottom:12px;}
      .ws-card-logo{width:48px;height:48px;border-radius:8px;object-fit:contain;background:#f8f9fa;padding:4px;}
      .ws-card-name{font-size:16px;font-weight:700;color:#333;}
      .ws-card-meta{font-size:11px;color:#999;margin-top:2px;}
      .ws-card-info{font-size:12px;color:#666;margin-top:8px;line-height:1.6;}
      .ws-card-actions{display:flex;gap:8px;margin-top:16px;border-top:1px solid #eee;padding-top:12px;}
      .logo-item{width:70px;height:70px;border-radius:8px;object-fit:contain;background:#f8f9fa;padding:4px;cursor:pointer;border:2px solid transparent;transition:border .2s;}
      .logo-item:hover{border-color:#667eea;}
    </style>
  `;

  renderGrid();
  renderTicketSummary();

  // Event listeners
  document.getElementById('btnNewWs').addEventListener('click', () => openModal());
  document.getElementById('wsModalClose').addEventListener('click', closeModal);
  document.getElementById('wsForm').addEventListener('submit', handleSave);
  document.getElementById('btnChooseLogo').addEventListener('click', openLogoGrid);
  document.getElementById('logoGridClose').addEventListener('click', () => { document.getElementById('logoGridModal').style.display = 'none'; });
  document.getElementById('delModalClose').addEventListener('click', () => { document.getElementById('deleteModal').style.display = 'none'; });
  document.getElementById('delCancel').addEventListener('click', () => { document.getElementById('deleteModal').style.display = 'none'; });
  document.getElementById('btnTogglePaste').addEventListener('click', () => {
    const area = document.getElementById('tcPasteArea');
    area.style.display = area.style.display === 'none' ? 'block' : 'none';
  });
  document.getElementById('btnParsePaste').addEventListener('click', handleParse);
  document.getElementById('wsNome').addEventListener('blur', autoMatchLogo);
  document.getElementById('wsNomeBreve').addEventListener('blur', autoMatchLogo);
}

async function renderTicketSummary() {
  const c = document.getElementById('pageContent');
  const el = document.getElementById('ticketSummaryCard');
  if (!el) return;
  try {
    const res = await apiFetch('/support/tickets?stato=aperto');
    if (document.getElementById('pageContent') !== c) return;
    const el2 = document.getElementById('ticketSummaryCard');
    if (!el2) return;
    if (!res.success) return;
    const tickets = res.data || [];
    const total = tickets.length;
    const critical = tickets.filter(t => t.priorita === 'critical').length;
    const high = tickets.filter(t => t.priorita === 'high').length;
    if (total === 0) {
      el2.innerHTML = `<div style="background:white;border-radius:12px;padding:14px 20px;box-shadow:0 1px 4px rgba(0,0,0,0.08);display:flex;align-items:center;gap:12px;font-size:13px;color:#27AE60;">
        ✅ Nessun ticket aperto
      </div>`;
      return;
    }
    el2.innerHTML = `
      <div style="background:white;border-radius:12px;padding:16px 20px;box-shadow:0 1px 4px rgba(0,0,0,0.08);display:flex;align-items:center;gap:16px;flex-wrap:wrap;">
        <span style="font-size:15px;font-weight:700;color:#333;">🎫 Ticket aperti</span>
        <span style="background:#FEF3C7;color:#92400E;padding:4px 12px;border-radius:20px;font-size:13px;font-weight:600;">${total} aperti</span>
        ${critical > 0 ? `<span style="background:#F0F0F0;color:#1a1a2e;padding:4px 12px;border-radius:20px;font-size:13px;font-weight:600;">⚫ ${critical} critical</span>` : ''}
        ${high > 0 ? `<span style="background:#FDEDEE;color:#E74C3C;padding:4px 12px;border-radius:20px;font-size:13px;font-weight:600;">🔴 ${high} high</span>` : ''}
        <button class="btn btn-secondary" style="margin-left:auto;font-size:12px;padding:6px 14px;" id="btnVediTicket">Vedi tutti →</button>
      </div>`;
    document.getElementById('btnVediTicket').addEventListener('click', () => window.YFM.navigateTo('supportTickets'));
  } catch { /* silenzioso */ }
}

function renderGrid() {
  const grid = document.getElementById('wsGrid');
  grid.innerHTML = workspaces.map(ws => {
  return `
      <div class="ws-card" data-ws="${ws.id}" style="cursor:pointer;">
        <div class="ws-card-header">
          <img class="ws-card-logo" src="${ws.logo_url || '/assets/app-icon.png'}" onerror="this.src='/assets/app-icon.png'">
          <div>
            <div class="ws-card-name">${ws.nome}</div>
            <div class="ws-card-meta">${[ws.colori_sociali, ws.sponsor_tecnico].filter(Boolean).join(' · ') || ''}</div>
          </div>
        </div>
        <div class="ws-card-actions">
          <button class="btn btn-small btn-primary" data-accedi="${ws.id}" style="background:#667eea;color:white;">Accedi →</button>
          <button class="btn btn-small" data-edit="${ws.id}" style="background:#FEF3C7;color:#92400E;border:1px solid #F59E0B;">✏️ Modifica</button>
          <button class="btn btn-small btn-danger" data-del="${ws.id}" style="background:#E74C3C;color:white;">🗑️ Elimina</button>
        </div>
      </div>
    `;
  }).join('');

  grid.querySelectorAll('[data-accedi]').forEach(btn => btn.addEventListener('click', async (e) => {
    e.stopPropagation();
    const ws = workspaces.find(w => w.id === btn.dataset.accedi);
    if (!ws) return;
    const { saveCurrentWorkspace, populateWorkspaceSelect } = await import('../club/workspaceSwitcher.js');
    saveCurrentWorkspace(ws.id);
    window.YFM.workspaceInfo = ws;
    window.YFM.activeWorkspaceId = ws.id;
    showLoading('Accesso in corso...');
    const { loadWorkspaceInfo } = await import('../club/workspace.js');
    const { loadSquadre } = await import('../team/squadre.js');
    await Promise.all([loadWorkspaceInfo(), loadSquadre()]);
    populateWorkspaceSelect(workspaces);
    hideLoading();
    window.YFM.navigateTo('dashboard');
  }));
  grid.querySelectorAll('[data-edit]').forEach(btn => btn.addEventListener('click', (e) => { e.stopPropagation(); openModal(btn.dataset.edit); }));
  grid.querySelectorAll('[data-del]').forEach(btn => btn.addEventListener('click', (e) => { e.stopPropagation(); openDeleteModal(btn.dataset.del); }));
  grid.querySelectorAll('[data-ws]').forEach(card => card.addEventListener('click', () => openDetail(card.dataset.ws)));
}

// ── DETAIL VIEW ──
function openDetail(wsId) {
  selectedWs = workspaces.find(w => w.id === wsId);
  if (!selectedWs) return;
  currentView = 'detail';
  const c = document.getElementById('pageContent');
  renderDetail(c);
}

function renderDetail(c) {
  const ws = selectedWs;
  c.innerHTML = `
    <div style="margin-bottom:20px;">
      <button class="btn btn-secondary" id="btnBackList" style="font-size:13px;">← Torna alla lista</button>
    </div>
    <div class="ws-detail-header">
      <img src="${ws.logo_url || '/assets/app-icon.png'}" onerror="this.src='/assets/app-icon.png'" style="width:56px;height:56px;border-radius:10px;object-fit:contain;background:#f8f9fa;padding:4px;">
      <div>
        <h1 style="margin:0;font-size:22px;">${ws.nome}</h1>
        <span style="font-size:13px;color:#666;">${[ws.colori_sociali, ws.sponsor_tecnico].filter(Boolean).join(' · ') || ''}</span>
      </div>
    </div>
    <div class="ws-detail-tabs">
      <button class="ws-tab active" data-tab="info">ℹ️ Info</button>
      <button class="ws-tab" data-tab="stagioni">📅 Stagioni</button>
      <button class="ws-tab" data-tab="utenti">👤 Utenti</button>
    </div>
    <div id="wsTabContent" class="ws-tab-content"></div>
    <style>
      .ws-detail-header{display:flex;align-items:center;gap:16px;margin-bottom:24px;}
      .ws-detail-tabs{display:flex;gap:4px;border-bottom:2px solid #eee;margin-bottom:20px;}
      .ws-tab{background:none;border:none;padding:10px 18px;font-size:14px;font-weight:500;color:#666;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-2px;border-radius:8px 8px 0 0;transition:all .2s;}
      .ws-tab:hover{background:#f8f9fa;color:#333;}
      .ws-tab.active{color:#667eea;border-bottom-color:#667eea;font-weight:600;}
      .ws-tab-content{min-height:200px;}
    </style>
  `;

  document.getElementById('btnBackList').addEventListener('click', () => {
    currentView = 'list';
    selectedWs = null;
    render(c);
  });

  c.querySelectorAll('.ws-tab').forEach(tab => tab.addEventListener('click', () => {
    c.querySelectorAll('.ws-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    renderTab(tab.dataset.tab);
  }));

  renderTab('info');
}

async function renderTab(tab) {
  const container = document.getElementById('wsTabContent');
  if (!container || !selectedWs) return;

  switch (tab) {
    case 'info':
      renderTabInfo();
      break;
    case 'stagioni':
      container.innerHTML = '<div style="padding:24px;color:#888;text-align:center;">Caricamento...</div>';
      await renderTabStagioni(container);
      break;
    case 'utenti':
      container.innerHTML = '<div style="padding:24px;color:#888;text-align:center;">Caricamento...</div>';
      await renderTabUtenti(container);
      break;
  }
}

function renderTabInfo() {
  const ws = selectedWs;
  const rows = [
    ['Nome', ws.nome],
    ['Nome Breve', ws.nome_breve],
    ['Colori Sociali', ws.colori_sociali],
    ['Sponsor Tecnico', ws.sponsor_tecnico]
  ].filter(([, v]) => v);

  const container = document.getElementById('wsTabContent');
  container.innerHTML = `
    <div style="background:white;border-radius:12px;padding:20px;border:1px solid #eee;">
      <div style="display:grid;grid-template-columns:140px 1fr;gap:10px 16px;font-size:14px;">
        ${rows.map(([label, val]) => `<span style="color:#888;font-weight:500;">${label}</span><span>${val}</span>`).join('')}
      </div>
      <div style="margin-top:16px;border-top:1px solid #eee;padding-top:16px;">
        <button class="btn btn-primary" id="btnEditWsInfo" style="font-size:13px;">✏️ Modifica</button>
      </div>
    </div>
  `;
  document.getElementById('btnEditWsInfo').addEventListener('click', () => renderTabInfoEdit());
}

async function renderTabInfoEdit() {
  const ws = selectedWs;
  const container = document.getElementById('wsTabContent');
  container.innerHTML = `
    <div style="background:white;border-radius:12px;padding:20px;border:1px solid #eee;">
      <form id="wsInfoForm">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
          <img id="infoLogoImg" src="${ws.logo_url || '/assets/app-icon.png'}" onerror="this.src='/assets/app-icon.png'" style="width:48px;height:48px;border-radius:8px;object-fit:contain;background:#f8f9fa;padding:4px;cursor:pointer;" title="Clicca per cambiare logo">
          <button type="button" class="btn btn-small" id="btnInfoLogo">🖼️ Cambia Logo</button>
          <input type="hidden" id="infoLogoUrl" value="${ws.logo_url || ''}">
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div class="form-group"><label>Nome *</label><input id="infoNome" value="${ws.nome || ''}" required></div>
          <div class="form-group"><label>Nome Breve</label><input id="infoNomeBreve" value="${ws.nome_breve || ''}"></div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div class="form-group"><label>Colori Sociali</label><input id="infoColori" value="${ws.colori_sociali || ''}"></div>
          <div class="form-group"><label>Sponsor Tecnico</label><input id="infoSponsor" value="${ws.sponsor_tecnico || ''}"></div>
        </div>
        <div style="display:flex;justify-content:flex-end;gap:12px;margin-top:20px;">
          <button type="button" class="btn btn-secondary" id="btnInfoCancel">Annulla</button>
          <button type="submit" class="btn btn-primary">💾 Salva</button>
        </div>
      </form>
    </div>
  `;

  document.getElementById('btnInfoCancel').addEventListener('click', () => renderTabInfo());
  document.getElementById('btnInfoLogo').addEventListener('click', () => openInfoLogoGrid());
  document.getElementById('wsInfoForm').addEventListener('submit', handleInfoSave);
}

function openInfoLogoGrid() {
  // Reuse the logo grid modal from the main render — if not present, create a temporary one
  let modal = document.getElementById('logoGridModal');
  if (!modal) {
    const div = document.createElement('div');
    div.innerHTML = `
      <div id="logoGridModal" class="modal-overlay" style="display:none;">
        <div class="modal-content" style="max-width:640px;max-height:90vh;overflow-y:auto;">
          <div class="modal-header"><h2>Seleziona Logo</h2><button class="modal-close-btn" id="logoGridClose">&times;</button></div>
          <div style="padding:12px 16px 0;"><input type="text" id="logoSearch" placeholder="🔍 Cerca logo..." style="width:100%;padding:10px 14px;border:1px solid #ddd;border-radius:8px;font-size:13px;box-sizing:border-box;"></div>
          <div id="logoGrid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(70px,1fr));gap:10px;padding:16px;"></div>
        </div>
      </div>
    `;
    document.body.appendChild(div.firstElementChild);
    modal = document.getElementById('logoGridModal');
    document.getElementById('logoGridClose').addEventListener('click', () => { modal.style.display = 'none'; });
  }

  const grid = document.getElementById('logoGrid');
  const search = document.getElementById('logoSearch');
  search.value = '';

  const renderLogosInfo = (filter) => {
    const q = (filter || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const filtered = q ? allLogos.filter(l => l.replace('/logos/', '').replace(/\.(png|jpg|jpeg|svg|webp)$/i, '').replace(/-/g, '').includes(q)) : allLogos;
    grid.innerHTML = filtered.length ? filtered.map(l => `<img class="logo-item" src="${l}" data-logo="${l}" title="${l.replace('/logos/', '').replace(/\.(png|jpg|jpeg|svg|webp)$/i, '')}">`).join('') : '<p style="padding:16px;color:#888;grid-column:1/-1;">Nessun logo trovato</p>';
    grid.querySelectorAll('.logo-item').forEach(img => {
      img.addEventListener('click', () => {
        document.getElementById('infoLogoUrl').value = img.dataset.logo;
        document.getElementById('infoLogoImg').src = img.dataset.logo;
        modal.style.display = 'none';
      });
    });
  };

  renderLogosInfo('');
  search.oninput = () => renderLogosInfo(search.value);
  modal.style.display = 'flex';
  setTimeout(() => search.focus(), 100);
}

async function handleInfoSave(e) {
  e.preventDefault();
  const ws = selectedWs;
  const body = {
    nome: document.getElementById('infoNome').value.trim(),
    nome_breve: document.getElementById('infoNomeBreve').value.trim() || null,
    logo_url: document.getElementById('infoLogoUrl').value || null,
    colori_sociali: document.getElementById('infoColori').value.trim() || null,
    sponsor_tecnico: document.getElementById('infoSponsor').value.trim() || null
  };
  if (!body.nome) return;

  showLoading('Salvataggio...');
  try {
    await apiFetch(`/workspaces/${ws.id}`, { method: 'PUT', body: JSON.stringify(body) });

    // Refresh workspace data
    workspaces = await apiFetch('/auth/workspaces');
    selectedWs = workspaces.find(w => w.id === ws.id);
    renderTabInfo();
    // Update header
    const header = document.querySelector('.ws-detail-header');
    if (header) {
      header.querySelector('img').src = selectedWs.logo_url || '/assets/app-icon.png';
      header.querySelector('h1').textContent = selectedWs.nome;
    }
  } catch (err) {
    alert('Errore: ' + err.message);
  }
  hideLoading();
}

async function renderTabStagioni(container) {
  try {
    const [stagioni, categorie] = await Promise.all([
      apiFetch(`/workspaces/${selectedWs.id}/stagioni`),
      apiFetch(`/workspaces/${selectedWs.id}/categorie`)
    ]);

    const catMap = {};
    (categorie || []).forEach(c => { catMap[c.id] = c.nome; });

    // Fetch teams per season
    let teamsBySeason = {};
    if (stagioni.length) {
      try {
        const results = await Promise.all(stagioni.map(s =>
          apiFetch(`/workspaces/${selectedWs.id}/stagioni/${s.id}/teams`).catch(() => [])
        ));
        stagioni.forEach((s, i) => { teamsBySeason[s.id] = results[i] || []; });
      } catch (e) { /* graceful */ }
    }

    const sortedStagioni = stagioni.slice().sort((a, b) => (b.nome || '').localeCompare(a.nome || ''));
    const latestId = sortedStagioni[0]?.id || null;
    const firstExpanded = latestId || stagioni[0]?.id || null;

    container.innerHTML = `
      <div style="display:flex;justify-content:flex-end;margin-bottom:16px;">
        <button class="btn btn-primary" id="btnNewSeason" style="font-size:13px;">+ Nuova Stagione</button>
      </div>
      ${!stagioni.length ? '<div style="padding:24px;color:#888;text-align:center;">Nessuna stagione creata.</div>' : `
        <div style="display:flex;flex-direction:column;gap:8px;">
          ${stagioni.map(s => {
            const teams = teamsBySeason[s.id] || [];
            const isExpanded = s.id === firstExpanded;
            const isLatest = s.id === latestId;
            return `
            <div style="border-radius:10px;border:1px solid ${isLatest ? '#86efac' : '#e5e7eb'};overflow:hidden;">
              <div data-toggle-season="${s.id}" style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:${isLatest ? '#f0fdf4' : '#f8f9fa'};cursor:pointer;">
                <div>
                  <span style="font-weight:600;">${s.nome}</span>
                  ${isLatest ? '<span style="margin-left:8px;font-size:11px;background:#667eea;color:white;padding:2px 8px;border-radius:10px;">★ Più recente</span>' : ''}
                  <span style="margin-left:8px;font-size:11px;color:#999;">${teams.length} team</span>
                </div>
                <div style="display:flex;gap:6px;align-items:center;">
                  <button class="btn btn-small" data-edit-season="${s.id}" style="padding:4px 8px;font-size:11px;">✏️</button>
                  <button class="btn btn-small btn-danger" data-del-season="${s.id}" style="padding:4px 8px;font-size:11px;">🗑️</button>
                  <span style="font-size:14px;transition:transform .2s;${isExpanded ? 'transform:rotate(90deg);' : ''}">▶</span>
                </div>
              </div>
              <div data-season-body="${s.id}" style="${isExpanded ? '' : 'display:none;'}padding:12px 16px;background:white;border-top:1px solid #eee;">
                ${teams.length === 0 ? '<p style="color:#999;font-size:13px;margin:0;">Nessun team in questa stagione</p>' : `
                <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px;">
                  ${teams.map(t => `
                    <div style="padding:12px;background:#f8f9fa;border-radius:8px;border:1px solid #e5e7eb;position:relative;">
                      <div style="font-weight:600;font-size:13px;">${catMap[t.category_id] || t.nome}</div>
                      <div style="font-size:11px;color:#666;margin-top:2px;">${t.category_tipo || ''}</div>
                      <button class="btn btn-small btn-danger" data-del-team="${t.id}" data-season-id="${s.id}" style="position:absolute;top:8px;right:8px;padding:2px 6px;font-size:10px;">✖</button>
                    </div>
                  `).join('')}
                </div>`}
                <button class="btn btn-small" data-add-team-season="${s.id}" style="margin-top:10px;font-size:12px;">+ Aggiungi categoria</button>
              </div>
            </div>
            `;
          }).join('')}
        </div>
      `}

      <!-- CATEGORIE -->
      <div style="margin-top:28px;border-top:2px solid #eee;padding-top:20px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
          <h3 style="margin:0;font-size:16px;">📋 Categorie Workspace</h3>
          <button class="btn btn-primary" id="btnNewCat" style="font-size:13px;">+ Nuova Categoria</button>
        </div>
        ${!(categorie || []).length ? '<div style="padding:16px;color:#888;text-align:center;">Nessuna categoria.</div>' : `
          <div style="display:flex;flex-wrap:wrap;gap:8px;">
            ${(categorie || []).map(c => `
              <div style="display:flex;align-items:center;gap:8px;padding:8px 14px;background:#f8f9fa;border-radius:8px;border:1px solid #e5e7eb;">
                <span style="font-weight:600;font-size:13px;">${c.nome}</span>
                <span style="font-size:11px;color:#666;">${c.tipo_campionato || ''}</span>
                <span style="font-size:11px;">${c.genere === 'F' ? '👧' : '👦'}</span>
                <button class="btn btn-small" data-edit-cat="${c.id}" style="padding:2px 6px;font-size:10px;">✏️</button>
                <button class="btn btn-small btn-danger" data-del-cat="${c.id}" style="padding:2px 6px;font-size:10px;">✖</button>
              </div>
            `).join('')}
          </div>
        `}
      </div>
    `;

    document.getElementById('btnNewSeason')?.addEventListener('click', () => showNewSeasonForm(container, stagioni));

    // Toggle accordion
    container.querySelectorAll('[data-toggle-season]').forEach(btn => btn.addEventListener('click', (e) => {
      if (e.target.closest('button')) return; // don't toggle on button clicks
      const sid = btn.dataset.toggleSeason;
      const body = container.querySelector(`[data-season-body="${sid}"]`);
      const arrow = btn.querySelector('span:last-child');
      if (body.style.display === 'none') { body.style.display = ''; arrow.style.transform = 'rotate(90deg)'; }
      else { body.style.display = 'none'; arrow.style.transform = ''; }
    }));

    // Edit season
    container.querySelectorAll('[data-edit-season]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const s = stagioni.find(x => x.id === btn.dataset.editSeason);
        if (!s) return;
        const anno = parseInt(s.nome.split('/')[0]);
        const modal = document.createElement('div');
        modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;';
        modal.innerHTML = `
          <div style="background:white;border-radius:16px;padding:28px;width:90%;max-width:380px;">
            <h3 style="margin:0 0 16px;font-size:16px;">✏️ Modifica Stagione</h3>
            <div style="margin-bottom:14px;">
              <label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">Anno di inizio</label>
              <input id="editSAnno" type="number" value="${anno}" min="2020" max="2050" style="width:100%;padding:10px;border:1.5px solid #e0e0e0;border-radius:8px;font-size:16px;box-sizing:border-box;">
              <div id="editSPreview" style="font-size:12px;color:#666;margin-top:4px;">Stagione: ${s.nome}</div>
            </div>
            <div style="display:flex;gap:10px;justify-content:flex-end;">
              <button id="editSCancel" class="btn btn-secondary">Annulla</button>
              <button id="editSSave" class="btn btn-primary">Salva</button>
            </div>
          </div>
        `;
        document.body.appendChild(modal);
        modal.querySelector('#editSAnno').addEventListener('input', (ev) => {
          const a = parseInt(ev.target.value);
          if (a >= 2020 && a <= 2050) modal.querySelector('#editSPreview').textContent = `Stagione: ${a}/${(a+1).toString().slice(2)}`;
        });
        modal.querySelector('#editSCancel').addEventListener('click', () => modal.remove());
        modal.querySelector('#editSSave').addEventListener('click', async () => {
          const newAnno = parseInt(modal.querySelector('#editSAnno').value);
          if (isNaN(newAnno) || newAnno < 2020 || newAnno > 2050) { alert('Anno non valido'); return; }
          const newNome = `${newAnno}/${(newAnno+1).toString().slice(2)}`;
          modal.remove();
          showLoading('Salvataggio...');
          try {
            await apiFetch(`/stagioni/${s.id}`, { method: 'PUT', body: JSON.stringify({ nome: newNome, data_inizio: `${newAnno}-07-01`, data_fine: `${newAnno+1}-06-30` }) });
          } catch (err) { alert('Errore: ' + err.message); }
          hideLoading();
          await renderTabStagioni(container);
        });
      });
    });

    // Delete season
    container.querySelectorAll('[data-del-season]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const s = stagioni.find(x => x.id === btn.dataset.delSeason);
        if (!confirm(`⚠️ Eliminare la stagione "${s?.nome}"?\n\nVerranno eliminati TUTTI i dati associati (squadre, rosa, partite, allenamenti).\nAzione IRREVERSIBILE.`)) return;
        showLoading('Eliminazione...');
        try {
          await apiFetch(`/stagioni/${s.id}`, { method: 'DELETE' });
        } catch (err) { alert('Errore: ' + err.message); }
        hideLoading();
        await renderTabStagioni(container);
      });
    });

    // Delete team
    container.querySelectorAll('[data-del-team]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Eliminare questo team e tutti i dati associati?')) return;
        showLoading('Eliminazione...');
        try {
          await apiFetch(`/squadre/${btn.dataset.delTeam}`, { method: 'DELETE' });
        } catch (err) { alert('Errore: ' + err.message); }
        hideLoading();
        await renderTabStagioni(container);
      });
    });

    // Add team to season
    container.querySelectorAll('[data-add-team-season]').forEach(btn => {
      btn.addEventListener('click', () => addTeamToSeason(btn.dataset.addTeamSeason, container, categorie, teamsBySeason));
    });

    // Categorie events
    document.getElementById('btnNewCat')?.addEventListener('click', () => showCatForm(container));
    container.querySelectorAll('[data-del-cat]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Eliminare questa categoria?')) return;
        showLoading('Eliminazione...');
        try {
          await apiFetch(`/categorie/${btn.dataset.delCat}`, { method: 'DELETE' });
        } catch (e) {
          alert('Errore: ' + e.message);
        }
        hideLoading();
        await renderTabStagioni(container);
      });
    });
    container.querySelectorAll('[data-edit-cat]').forEach(btn => {
      btn.addEventListener('click', () => editCategory(btn.dataset.editCat, categorie, container));
    });
  } catch (e) {
    container.innerHTML = `<div style="padding:24px;color:#E74C3C;">Errore: ${e.message}</div>`;
  }
}

function addTeamToSeason(seasonId, container, categorie, teamsBySeason) {
  const existingTeams = teamsBySeason[seasonId] || [];
  const existingCatIds = existingTeams.map(t => t.category_id).filter(Boolean);
  const available = (categorie || []).filter(c => !existingCatIds.includes(c.id));
  if (!available.length) { alert('Tutte le categorie hanno già un team in questa stagione.'); return; }

  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;';
  modal.innerHTML = `
    <div style="background:white;border-radius:16px;padding:28px;width:90%;max-width:360px;">
      <h3 style="margin:0 0 16px;font-size:16px;">Aggiungi Team</h3>
      <div style="margin-bottom:14px;">
        <label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">Categoria</label>
        <select id="addTeamCat" style="width:100%;padding:10px;border:1.5px solid #e0e0e0;border-radius:8px;font-size:14px;">
          ${available.map(c => `<option value="${c.id}">${c.nome} ${c.tipo_campionato || ''}</option>`).join('')}
        </select>
      </div>
      <div style="display:flex;gap:10px;justify-content:flex-end;">
        <button id="addTeamCancel" class="btn btn-secondary">Annulla</button>
        <button id="addTeamConfirm" class="btn btn-primary">Crea Team</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.querySelector('#addTeamCancel').addEventListener('click', () => modal.remove());
  modal.querySelector('#addTeamConfirm').addEventListener('click', async () => {
    const catId = modal.querySelector('#addTeamCat').value;
    modal.remove();
    showLoading('Creazione...');
    try {
      const teamName = selectedWs.nome_breve || selectedWs.nome || 'Squadra';
      await apiFetch(`/categorie/${catId}/team`, {
        method: 'POST', body: JSON.stringify({ season_id: seasonId, nome: teamName })
      });
    } catch (e) { alert('Errore: ' + e.message); }
    hideLoading();
    await renderTabStagioni(container);
  });
}

function editCategory(catId, categorie, container) {
  const cat = (categorie || []).find(c => c.id === catId);
  if (!cat) return;
  const TIPI = ['Provinciale', 'Regionale', 'Elite', 'Nazionale'];

  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;';
  modal.innerHTML = `
    <div style="background:white;border-radius:16px;padding:28px;width:90%;max-width:380px;">
      <h3 style="margin:0 0 20px;font-size:16px;">Modifica Categoria</h3>
      <div style="margin-bottom:14px;">
        <label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">Nome</label>
        <input id="editCatNome" type="text" value="${cat.nome}" style="width:100%;padding:10px;border:1.5px solid #e0e0e0;border-radius:8px;font-size:14px;box-sizing:border-box;">
      </div>
      <div style="margin-bottom:14px;">
        <label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">Tipo Campionato</label>
        <select id="editCatTipo" style="width:100%;padding:10px;border:1.5px solid #e0e0e0;border-radius:8px;font-size:14px;">
          ${TIPI.map(t => `<option value="${t}" ${cat.tipo_campionato === t ? 'selected' : ''}>${t}</option>`).join('')}
        </select>
      </div>
      <div style="margin-bottom:14px;">
        <label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">Genere</label>
        <select id="editCatGenere" style="width:100%;padding:10px;border:1.5px solid #e0e0e0;border-radius:8px;font-size:14px;">
          <option value="M" ${cat.genere === 'M' ? 'selected' : ''}>👦 Maschile</option>
          <option value="F" ${cat.genere === 'F' ? 'selected' : ''}>👧 Femminile</option>
        </select>
      </div>
      <div style="display:flex;gap:10px;justify-content:flex-end;">
        <button id="editCatCancel" class="btn btn-secondary">Annulla</button>
        <button id="editCatConfirm" class="btn btn-primary">Salva</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.querySelector('#editCatCancel').addEventListener('click', () => modal.remove());
  modal.querySelector('#editCatConfirm').addEventListener('click', async () => {
    const nome = modal.querySelector('#editCatNome').value.trim();
    const tipo_campionato = modal.querySelector('#editCatTipo').value;
    const genere = modal.querySelector('#editCatGenere').value;
    if (!nome) { alert('Nome richiesto'); return; }
    modal.remove();
    showLoading('Salvataggio...');
    try {
      await apiFetch(`/categorie/${catId}`, {
        method: 'PUT', body: JSON.stringify({ nome, tipo_campionato, genere, anno_da: 0, anno_a: 0 })
      });
    } catch (e) { alert('Errore: ' + e.message); }
    hideLoading();
    await renderTabStagioni(container);
  });
}

async function showNewSeasonForm(container, existingStagioni) {
  const latestSeason = existingStagioni.slice().sort((a, b) => (b.nome || '').localeCompare(a.nome || ''))[0] || null;
  let suggestedYear;
  if (latestSeason?.nome) {
    suggestedYear = parseInt(latestSeason.nome.split('/')[0]) + 1;
  } else {
    const now = new Date();
    suggestedYear = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  }
  if (isNaN(suggestedYear) || suggestedYear < 2020) suggestedYear = new Date().getFullYear();

  const CATS_ORDER = ['U14', 'U15', 'U16', 'U17', 'U18', 'U19'];
  const TIPI = ['Provinciale', 'Regionale', 'Elite', 'Nazionale'];

  // Get teams from active season for migration
  let activeTeams = [];
  if (latestSeason) {
    showLoading('Caricamento...');
    try {
      activeTeams = await apiFetch(`/workspaces/${selectedWs.id}/stagioni/${latestSeason.id}/teams`) || [];
    } catch (e) { /* graceful */ }
    hideLoading();
  }

  function nextCategory(catName) {
    const idx = CATS_ORDER.indexOf(catName);
    if (idx >= 0 && idx < CATS_ORDER.length - 1) return CATS_ORDER[idx + 1];
    return catName;
  }

  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;padding:20px;';
  modal.innerHTML = `
    <div style="background:white;border-radius:16px;padding:28px;width:90%;max-width:520px;max-height:90vh;overflow-y:auto;">
      <h3 style="margin:0 0 20px;font-size:18px;">\ud83d\udcc5 Nuova Stagione</h3>
      <div style="margin-bottom:16px;">
        <label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">Anno di inizio</label>
        <input id="wizAnno" type="number" value="${suggestedYear}" min="2020" max="2050" style="width:100%;padding:10px;border:1.5px solid #e0e0e0;border-radius:8px;font-size:16px;box-sizing:border-box;">
        <div id="wizPreview" style="font-size:12px;color:#666;margin-top:4px;">Stagione: ${suggestedYear}/${(suggestedYear + 1).toString().slice(2)} \u2014 dal 01/07/${suggestedYear} al 30/06/${suggestedYear + 1}</div>
      </div>
      <div id="wizMigrationArea"></div>
      <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px;">
        <button id="wizCancel" class="btn btn-secondary">Annulla</button>
        <button id="wizConfirm" class="btn btn-primary">Crea Stagione</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  function renderMigrationTable() {
    const area = modal.querySelector('#wizMigrationArea');
    if (!latestSeason || !activeTeams.length) {
      area.innerHTML = latestSeason ? '<p style="font-size:12px;color:#999;">Nessun team nella stagione più recente da migrare.</p>' : '';
      return;
    }
    area.innerHTML = `
      <div style="padding:14px;background:#f0f4ff;border-radius:10px;border:1px solid #c7d2fe;">
        <div style="font-size:13px;font-weight:600;color:#4338ca;margin-bottom:10px;">\ud83d\udd04 Migrazione da "${latestSeason.nome}"</div>
        <table style="width:100%;font-size:12px;border-collapse:collapse;margin-bottom:12px;">
          <thead><tr style="text-align:left;border-bottom:1px solid #c7d2fe;">
            <th style="padding:4px 6px;">Attuale</th>
            <th style="padding:4px 6px;">\u2192 Nuova</th>
            <th style="padding:4px 6px;">Tipo</th>
            <th style="padding:4px 6px;">Migra</th>
          </tr></thead>
          <tbody>
            ${activeTeams.map((t, i) => {
              const catName = t.category_name || t.nome;
              const catTipo = t.category_tipo || 'Provinciale';
              const suggested = nextCategory(catName);
              return `<tr style="border-bottom:1px solid #eee;">
                <td style="padding:6px;"><strong>${catName}</strong></td>
                <td style="padding:6px;"><select class="wizNewCat" data-idx="${i}" style="padding:4px;border-radius:6px;border:1px solid #ddd;font-size:12px;">
                  ${CATS_ORDER.map(c => `<option value="${c}" ${c === suggested ? 'selected' : ''}>${c}</option>`).join('')}
                </select></td>
                <td style="padding:6px;"><select class="wizNewTipo" data-idx="${i}" style="padding:4px;border-radius:6px;border:1px solid #ddd;font-size:12px;">
                  ${TIPI.map(tp => `<option value="${tp}" ${tp === catTipo ? 'selected' : ''}>${tp}</option>`).join('')}
                </select></td>
                <td style="padding:6px;text-align:center;"><input type="checkbox" class="wizMigraTeam" data-idx="${i}" checked></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
        <label style="display:flex;align-items:center;gap:8px;font-size:13px;margin-bottom:4px;cursor:pointer;">
          <input type="checkbox" id="wizMigraRosa" checked> Rosa giocatori
        </label>
        <label style="display:flex;align-items:center;gap:8px;font-size:13px;margin-bottom:4px;cursor:pointer;">
          <input type="checkbox" id="wizMigraStaff" checked> Staff tecnico
        </label>
        <label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer;">
          <input type="checkbox" id="wizMigraConfig" checked> Config allenamenti
        </label>
      </div>
    `;
  }
  renderMigrationTable();

  modal.querySelector('#wizAnno').addEventListener('input', (e) => {
    const a = parseInt(e.target.value);
    const preview = modal.querySelector('#wizPreview');
    if (a >= 2020 && a <= 2050) preview.textContent = `Stagione: ${a}/${(a + 1).toString().slice(2)} \u2014 dal 01/07/${a} al 30/06/${a + 1}`;
  });

  modal.querySelector('#wizCancel').addEventListener('click', () => modal.remove());
  modal.querySelector('#wizConfirm').addEventListener('click', async () => {
    const anno = parseInt(modal.querySelector('#wizAnno').value);
    if (isNaN(anno) || anno < 2020 || anno > 2050) { alert('Anno non valido'); return; }
    const nome = `${anno}/${(anno+1).toString().slice(2)}`;
    if (existingStagioni.some(s => s.nome === nome)) {
      alert(`Stagione ${nome} gi\u00e0 esistente`);
      return;
    }

    // Collect migration data
    const migrations = [];
    modal.querySelectorAll('.wizMigraTeam').forEach(cb => {
      if (!cb.checked) return;
      const idx = parseInt(cb.dataset.idx);
      const t = activeTeams[idx];
      if (!t) return;
      migrations.push({
        from_team_id: t.id,
        from_category_id: t.category_id,
        new_category_name: modal.querySelector(`.wizNewCat[data-idx="${idx}"]`).value,
        new_tipo_campionato: modal.querySelector(`.wizNewTipo[data-idx="${idx}"]`).value,
        genere: 'M'
      });
    });

    const migra_rosa = modal.querySelector('#wizMigraRosa')?.checked || false;
    const migra_staff = modal.querySelector('#wizMigraStaff')?.checked || false;
    const migra_config = modal.querySelector('#wizMigraConfig')?.checked || false;

    modal.remove();
    showLoading('Creazione stagione...');
    try {
      const newSeason = await apiFetch(`/workspaces/${selectedWs.id}/stagioni`, {
        method: 'POST', body: JSON.stringify({ anno_inizio: anno, skip_auto_teams: migrations.length > 0 })
      });

      if (newSeason?.id && migrations.length > 0 && latestSeason) {
        const migResult = await apiFetch(`/stagioni/${newSeason.id}/migra`, {
          method: 'POST', body: JSON.stringify({
            from_season_id: latestSeason.id,
            migrations, migra_rosa, migra_staff, migra_config
          })
        });
        const parts = [];
        if (migResult.migrated?.rosa) parts.push(`${migResult.migrated.rosa} giocatori`);
        if (migResult.migrated?.staff) parts.push(`${migResult.migrated.staff} staff`);
        if (migResult.migrated?.config) parts.push(`${migResult.migrated.config} config`);
        if (migResult.migrated?.categories_created) parts.push(`${migResult.migrated.categories_created} nuove categorie`);
        alert(`\u2705 Stagione creata!${parts.length ? '\nMigrati: ' + parts.join(', ') : ''}`);
      } else {
        alert('\u2705 Stagione creata!');
      }
    } catch (e) {
      alert('Errore: ' + e.message);
    }
    hideLoading();
    await renderTabStagioni(container);
  });
}

function showCatForm(container) {
  const CATEGORIE = ['U14', 'U15', 'U16', 'U17', 'U18', 'U19'];
  const TIPI = ['Provinciale', 'Regionale', 'Elite', 'Nazionale'];

  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;padding:20px;';
  modal.innerHTML = `
    <div style="background:white;border-radius:16px;padding:28px;width:90%;max-width:380px;">
      <h3 style="margin:0 0 20px;font-size:16px;">Nuova Categoria</h3>
      <div style="margin-bottom:14px;">
        <label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">Categoria</label>
        <select id="wsCatNomeSelect" style="width:100%;padding:10px;border:1.5px solid #e0e0e0;border-radius:8px;font-size:14px;">
          ${CATEGORIE.map(c => `<option value="${c}">${c}</option>`).join('')}
          <option value="__altro">Altro...</option>
        </select>
        <input id="wsCatNomeManual" type="text" placeholder="Nome personalizzato" style="display:none;width:100%;padding:10px;border:1.5px solid #e0e0e0;border-radius:8px;font-size:14px;margin-top:6px;box-sizing:border-box;">
      </div>
      <div style="margin-bottom:14px;">
        <label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">Tipo Campionato</label>
        <select id="wsCatTipoSelect" style="width:100%;padding:10px;border:1.5px solid #e0e0e0;border-radius:8px;font-size:14px;">
          ${TIPI.map(t => `<option value="${t}">${t}</option>`).join('')}
          <option value="__altro">Altro...</option>
        </select>
        <input id="wsCatTipoManual" type="text" placeholder="Tipo personalizzato" style="display:none;width:100%;padding:10px;border:1.5px solid #e0e0e0;border-radius:8px;font-size:14px;margin-top:6px;box-sizing:border-box;">
      </div>
      <div style="margin-bottom:14px;">
        <label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">Genere</label>
        <select id="wsCatGenere" style="width:100%;padding:10px;border:1.5px solid #e0e0e0;border-radius:8px;font-size:14px;">
          <option value="M">\ud83d\udc66 Maschile</option><option value="F">\ud83d\udc67 Femminile</option>
        </select>
      </div>
      <div style="display:flex;gap:10px;justify-content:flex-end;">
        <button id="wsCatCancel" class="btn btn-secondary">Annulla</button>
        <button id="wsCatConfirm" class="btn btn-primary">Crea</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  modal.querySelector('#wsCatNomeSelect').addEventListener('change', (e) => {
    modal.querySelector('#wsCatNomeManual').style.display = e.target.value === '__altro' ? 'block' : 'none';
  });
  modal.querySelector('#wsCatTipoSelect').addEventListener('change', (e) => {
    modal.querySelector('#wsCatTipoManual').style.display = e.target.value === '__altro' ? 'block' : 'none';
  });

  modal.querySelector('#wsCatCancel').addEventListener('click', () => modal.remove());
  modal.querySelector('#wsCatConfirm').addEventListener('click', async () => {
    const nomeSelect = modal.querySelector('#wsCatNomeSelect').value;
    const nome = nomeSelect === '__altro' ? modal.querySelector('#wsCatNomeManual').value.trim() : nomeSelect;
    const tipoSelect = modal.querySelector('#wsCatTipoSelect').value;
    const tipo_campionato = tipoSelect === '__altro' ? modal.querySelector('#wsCatTipoManual').value.trim() : tipoSelect;
    const genere = modal.querySelector('#wsCatGenere').value;
    if (!nome) { alert('Inserisci un nome categoria'); return; }
    if (!tipo_campionato) { alert('Inserisci il tipo campionato'); return; }

    modal.remove();
    showLoading('Creazione...');
    try {
      await apiFetch(`/workspaces/${selectedWs.id}/categorie`, {
        method: 'POST', body: JSON.stringify({ nome, tipo_campionato, anno_da: 0, anno_a: 0, genere })
      });
    } catch (e) {
      alert('Errore: ' + e.message);
    }
    hideLoading();
    await renderTabStagioni(container);
  });
}

async function renderTabUtenti(container) {
  try {
    const [res, categorie, stagioni] = await Promise.all([
      apiFetch('/auth/users?workspace_id=' + selectedWs.id + '&only_active=false'),
      apiFetch(`/workspaces/${selectedWs.id}/categorie`),
      apiFetch(`/workspaces/${selectedWs.id}/stagioni`)
    ]);
    const users = res.users || res;
    const catMap = {};
    (categorie || []).forEach(c => { catMap[c.id] = c.nome; });
    const seasonMap = {};
    (stagioni || []).forEach(s => { seasonMap[s.id] = s.nome; });

    const roleColors = {
      admin: { bg: '#fef3c7', color: '#92400e' },
      allenatore: { bg: '#d1fae5', color: '#065f46' },
      staff: { bg: '#eef2ff', color: '#4338ca' }
    };

    container.innerHTML = `
      <div style="display:flex;justify-content:flex-end;margin-bottom:16px;">
        <button class="btn btn-primary" id="btnNewUser" style="font-size:13px;">+ Nuovo Utente</button>
      </div>
      ${!users.length ? '<div style="padding:24px;color:#888;text-align:center;">Nessun utente.</div>' : `
        <div style="display:flex;flex-direction:column;gap:10px;">
          ${users.map(u => {
            const rc = roleColors[u.ruolo] || roleColors.staff;
            const cats = (u.categorie_accesso || []).map(id => catMap[id]).filter(Boolean);
            const seasonNames = (u.stagioni_accesso || []).map(id => seasonMap[id]).filter(Boolean);
            const profilo = u.permessi?.profilo || u.ruolo || 'staff';
            return `
              <div style="background:white;border-radius:10px;padding:14px 18px;border:1px solid #eee;${!u.is_active ? 'opacity:0.5;' : ''}">
                <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
                  <div style="display:flex;align-items:center;gap:10px;">
                    <strong>${u.nome || ''} ${u.cognome || ''}</strong>
                    <span style="font-size:12px;color:#888;">${u.email}</span>
                  </div>
                  <div style="display:flex;align-items:center;gap:8px;">
                    <span style="background:${rc.bg};color:${rc.color};padding:2px 10px;border-radius:6px;font-size:11px;font-weight:500;">${profilo}</span>
                    ${!u.is_active ? '<span style="background:#fee2e2;color:#991b1b;padding:2px 8px;border-radius:6px;font-size:10px;">Disattivo</span>' : ''}
                    <button class="btn btn-small" data-edit-user="${u.id}" style="font-size:11px;padding:4px 8px;">\u270f\ufe0f</button>
                  </div>
                </div>
                ${cats.length ? `<div style="margin-top:6px;display:flex;flex-wrap:wrap;gap:6px;">${cats.map(c => `<span style="background:#f0f4ff;color:#4338ca;padding:2px 8px;border-radius:5px;font-size:11px;">${c}</span>`).join('')}</div>` : ''}
                ${seasonNames.length ? `<div style="margin-top:4px;display:flex;flex-wrap:wrap;gap:6px;">${seasonNames.map(s => `<span style="background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:5px;font-size:11px;">📅 ${s}</span>`).join('')}</div>` : ''}
              </div>
            `;
          }).join('')}
        </div>
      `}
      <div id="userFormArea"></div>
    `;

    document.getElementById('btnNewUser')?.addEventListener('click', () => showUserForm(container, categorie, stagioni, null));
    container.querySelectorAll('[data-edit-user]').forEach(btn => {
      btn.addEventListener('click', () => {
        const user = users.find(u => u.id === btn.dataset.editUser);
        if (user) showUserForm(container, categorie, stagioni, user);
      });
    });
  } catch (e) {
    container.innerHTML = `<div style="padding:24px;color:#E74C3C;">Errore: ${e.message}</div>`;
  }
}

function showUserForm(container, categorie, stagioni, user) {
  const isEdit = !!user;
  const profili = ['admin', 'allenatore', 'vice_allenatore', 'dirigente', 'preparatore', 'osservatore', 'segreteria'];
  const area = document.getElementById('userFormArea');
  if (!area) return;

  area.innerHTML = `
    <div style="background:white;border-radius:12px;padding:20px;border:1px solid #667eea;margin-top:16px;">
      <h3 style="margin:0 0 14px;font-size:15px;">${isEdit ? 'Modifica Utente' : 'Nuovo Utente'}</h3>
      <form id="userQuickForm">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div class="form-group"><label>Nome</label><input id="uqNome" value="${user?.nome || ''}" required></div>
          <div class="form-group"><label>Cognome</label><input id="uqCognome" value="${user?.cognome || ''}" required></div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div class="form-group"><label>Email</label><input id="uqEmail" type="email" value="${user?.email || ''}" required ${isEdit ? 'disabled' : ''}></div>
          <div class="form-group"><label>Profilo</label>
            <select id="uqProfilo">
              ${profili.map(p => `<option value="${p}" ${(user?.permessi?.profilo || user?.ruolo) === p ? 'selected' : ''}>${p}</option>`).join('')}
            </select>
          </div>
        </div>
        ${!isEdit ? '<div class="form-group"><label>Password</label><input id="uqPassword" type="text" value="" placeholder="Lascia vuoto per default"></div>' : ''}
        <div class="form-group">
          <label>Stagioni accesso</label>
          <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:4px;">
            ${(stagioni || []).map(s => {
              const checked = (user?.stagioni_accesso || []).includes(s.id);
              return `<label style="display:inline-flex;align-items:center;gap:4px;font-size:12px;cursor:pointer;"><input type="checkbox" class="uqSeason" value="${s.id}" ${checked ? 'checked' : ''}> ${s.nome}</label>`;
            }).join('')}
          </div>
        </div>
        <div class="form-group">
          <label>Categorie accesso</label>
          <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:4px;">
            ${(categorie || []).map(c => {
              const checked = (user?.categorie_accesso || []).includes(c.id);
              return `<label style="display:inline-flex;align-items:center;gap:4px;font-size:12px;cursor:pointer;"><input type="checkbox" class="uqCat" value="${c.id}" ${checked ? 'checked' : ''}> ${c.nome}</label>`;
            }).join('')}
          </div>
        </div>
        ${isEdit ? `<label style="display:inline-flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;margin-top:8px;"><input type="checkbox" id="uqActive" ${user.is_active !== false ? 'checked' : ''}> Account attivo</label>` : ''}
        <div style="display:flex;justify-content:flex-end;gap:12px;margin-top:16px;">
          <button type="button" class="btn btn-secondary" id="btnCancelUser">Annulla</button>
          <button type="submit" class="btn btn-primary">\ud83d\udcbe ${isEdit ? 'Salva' : 'Crea'}</button>
        </div>
      </form>
    </div>
  `;

  document.getElementById('btnCancelUser').addEventListener('click', () => { area.innerHTML = ''; });
  document.getElementById('userQuickForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const profilo = document.getElementById('uqProfilo').value;
    const catIds = [...document.querySelectorAll('.uqCat:checked')].map(cb => cb.value);
    const seasonIds = [...document.querySelectorAll('.uqSeason:checked')].map(cb => cb.value);
    const ruolo = ['admin'].includes(profilo) ? 'admin' : 'allenatore';

    showLoading('Salvataggio...');
    try {
      if (isEdit) {
        const body = {
          nome: document.getElementById('uqNome').value.trim(),
          cognome: document.getElementById('uqCognome').value.trim(),
          ruolo,
          permessi: { profilo, capabilities: {} },
          categorie_accesso: catIds,
          stagioni_accesso: seasonIds,
          is_active: document.getElementById('uqActive')?.checked !== false
        };
        await apiFetch(`/auth/users/${user.id}`, { method: 'PUT', body: JSON.stringify(body) });
      } else {
        const body = {
          nome: document.getElementById('uqNome').value.trim(),
          cognome: document.getElementById('uqCognome').value.trim(),
          email: document.getElementById('uqEmail').value.trim(),
          password: document.getElementById('uqPassword').value || 'ChangeMe123!',
          ruolo,
          workspace_id: selectedWs.id,
          permessi: { profilo, capabilities: {} },
          categorie_accesso: catIds,
          stagioni_accesso: seasonIds
        };
        await apiFetch('/auth/users', { method: 'POST', body: JSON.stringify(body) });
      }
      area.innerHTML = '';
      await renderTabUtenti(container);
    } catch (err) {
      alert('Errore: ' + err.message);
    }
    hideLoading();
  });
}

// ── PARSE TC PASTE ──
function handleParse() {
  const text = document.getElementById('tcPasteInput').value.trim();
  if (!text) { alert('Incolla prima i dati dalla scheda Tuttocampo'); return; }

  const parsed = parseSocietaText(text);

  // Fill form fields (only if currently empty or user confirms overwrite)
  // Populate workspace fields (nome only in form)
  if (parsed.nome) document.getElementById('wsNome').value = parsed.nome;
  if (parsed.nome) document.getElementById('wsNomeBreve').value = parsed.nome;

  // Auto-match logo
  if (parsed.nome) {
    const logo = findLogo(parsed.nome);
    if (logo) { document.getElementById('wsLogoUrl').value = logo; renderLogoPreview(logo, true); }
  }

  // Store parsed anagrafica for save
  window._parsedAnagrafica = {
    colori_sociali: parsed.colori_sociali || null,
    sponsor_tecnico: parsed.sponsor_tecnico || null,
    indirizzo: parsed.indirizzo || null,
    telefono: parsed.telefono || null,
    email: parsed.email || null,
    sito_web: parsed.sito_web || null,
    facebook: parsed.facebook || null,
    instagram: parsed.instagram || null,
    matricola_figc: parsed.matricola_figc || null,
    p_iva: parsed.p_iva || null,
    codice_fiscale: parsed.codice_fiscale || null,
    sdi: parsed.sdi || null,
    forma_giuridica: parsed.forma_giuridica || null,
    nome_campo: parsed._stadio_nome || null,
    indirizzo_campo: parsed._stadio_indirizzo || null
  };

  // Show visual recap
  const labels = [
    ['\uD83C\uDFE2 Nome', parsed.nome],
    ['\uD83C\uDFA8 Colori', parsed.colori_sociali],
    ['\uD83D\uDC55 Sponsor', parsed.sponsor_tecnico],
    ['\uD83D\uDCCB Matricola FIGC', parsed.matricola_figc],
    ['\uD83D\uDCCD Indirizzo', parsed.indirizzo],
    ['\uD83D\uDCDE Telefono', parsed.telefono],
    ['\u2709\uFE0F Email', parsed.email],
    ['\uD83D\uDCB3 P.IVA', parsed.p_iva],
    ['\uD83C\uDD94 C.F.', parsed.codice_fiscale],
    ['\uD83D\uDCE8 SDI', parsed.sdi],
    ['\uD83C\uDF10 Sito web', parsed.sito_web],
    ['\uD83C\uDFDF\uFE0F Campo', parsed._stadio_nome],
    ['\uD83D\uDCCD Indirizzo campo', parsed._stadio_indirizzo]
  ];
  const rows = labels.map(([label, val]) =>
    `<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid #f0f0f0;">
      <span style="color:#555;font-size:12px;">${label}</span>
      ${val
        ? `<span style="font-size:12px;font-weight:500;color:#1a1a1a;max-width:200px;text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${val}">${val}</span>`
        : `<span style="font-size:11px;color:#bbb;">non trovato</span>`}
    </div>`
  ).join('');
  const recap = document.getElementById('parseRecap');
  recap.innerHTML = `
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:12px 14px;margin-top:10px;">
      <div style="font-size:12px;font-weight:600;color:#166534;margin-bottom:8px;">\u2705 Dati estratti</div>
      ${rows}
    </div>`;
  recap.style.display = 'block';

  document.getElementById('tcPasteArea').style.display = 'none';
  document.getElementById('btnTogglePaste').innerHTML = '\u2705 Dati importati';
  document.getElementById('btnTogglePaste').style.background = '#d4edda';
  document.getElementById('btnTogglePaste').style.color = '#155724';
}

// ── LOGO ──
function autoMatchLogo() {
  const nome = document.getElementById('wsNome').value.trim();
  if (!nome || document.getElementById('wsLogoUrl').value) return;
  let match = findLogo(nome);
  if (!match) {
    const nomeBreve = document.getElementById('wsNomeBreve').value.trim();
    if (nomeBreve) match = findLogo(nomeBreve);
  }
  if (match) {
    document.getElementById('wsLogoUrl').value = match;
    renderLogoPreview(match, true);
  } else {
    renderLogoPreview(null, false);
  }
}

function renderLogoPreview(url, found) {
  const container = document.getElementById('logoPreview');
  if (url) {
    container.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;gap:12px;">
        <img src="${url}" style="width:56px;height:56px;border-radius:8px;object-fit:contain;background:#f8f9fa;padding:4px;">
        <span style="font-size:13px;color:#27AE60;">✅ Logo trovato</span>
        <button type="button" class="btn btn-small" id="btnClearLogo" style="font-size:11px;">✕</button>
      </div>
    `;
    container.querySelector('#btnClearLogo').addEventListener('click', () => {
      document.getElementById('wsLogoUrl').value = '';
      container.innerHTML = '';
    });
  } else if (found === false) {
    container.innerHTML = '<span style="font-size:12px;color:#999;">Logo non trovato. Usa "Scegli Logo" per selezionarlo manualmente.</span>';
  } else {
    container.innerHTML = '';
  }
}

function openLogoGrid() {
  const modal = document.getElementById('logoGridModal');
  const grid = document.getElementById('logoGrid');
  const search = document.getElementById('logoSearch');
  search.value = '';

  const renderLogos = (filter) => {
    const q = (filter || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const filtered = q ? allLogos.filter(l => l.replace('/logos/', '').replace(/\.(png|jpg|jpeg|svg|webp)$/i, '').replace(/-/g, '').includes(q)) : allLogos;
    grid.innerHTML = filtered.length ? filtered.map(l => `<img class="logo-item" src="${l}" data-logo="${l}" title="${l.replace('/logos/', '').replace(/\.(png|jpg|jpeg|svg|webp)$/i, '')}">`).join('') : '<p style="padding:16px;color:#888;grid-column:1/-1;">Nessun logo trovato</p>';
    grid.querySelectorAll('.logo-item').forEach(img => {
      img.addEventListener('click', () => {
        document.getElementById('wsLogoUrl').value = img.dataset.logo;
        renderLogoPreview(img.dataset.logo, true);
        modal.style.display = 'none';
      });
    });
  };

  renderLogos('');
  search.oninput = () => renderLogos(search.value);
  modal.style.display = 'flex';
  setTimeout(() => search.focus(), 100);
}

// ── MODAL OPEN/CLOSE ──
async function openModal(wsId = null) {
  const modal = document.getElementById('wsModal');
  document.getElementById('wsForm').reset();
  document.getElementById('wsId').value = '';
  document.getElementById('wsLogoUrl').value = '';
  document.getElementById('logoPreview').innerHTML = '';
  document.getElementById('tcPasteInput').value = '';
  document.getElementById('tcPasteArea').style.display = 'none';
  document.getElementById('btnTogglePaste').innerHTML = '\uD83D\uDCCB Incolla dati societ\u00e0';
  const recapEl = document.getElementById('parseRecap');
  if (recapEl) { recapEl.innerHTML = ''; recapEl.style.display = 'none'; }
  window._parsedAnagrafica = null;
  document.getElementById('btnTogglePaste').style.background = '';
  document.getElementById('btnTogglePaste').style.color = '';

  if (wsId) {
    const ws = workspaces.find(w => w.id === wsId);
    if (!ws) return;
    document.getElementById('wsModalTitle').textContent = 'Modifica Workspace';
    document.getElementById('wsId').value = ws.id;
    document.getElementById('wsNome').value = ws.nome || '';
    document.getElementById('wsNomeBreve').value = ws.nome_breve || '';
    document.getElementById('wsLogoUrl').value = ws.logo_url || '';
    if (ws.logo_url) renderLogoPreview(ws.logo_url, true);
  } else {
    document.getElementById('wsModalTitle').textContent = 'Nuovo Workspace';
  }
  modal.style.display = 'flex';
}

function closeModal() {
  document.getElementById('wsModal').style.display = 'none';
}

// ── SAVE ──
async function handleSave(e) {
  e.preventDefault();
  const id = document.getElementById('wsId').value;
  const body = {
    nome: document.getElementById('wsNome').value.trim(),
    nome_breve: document.getElementById('wsNomeBreve').value.trim() || null,
    logo_url: document.getElementById('wsLogoUrl').value || null
  };
  if (!body.nome) { alert('Nome obbligatorio'); return; }

  showLoading('Salvataggio...');
  try {
    let wsId = id;
    if (id) {
      await apiFetch(`/workspaces/${id}`, { method: 'PUT', body: JSON.stringify(body) });
    } else {
      const created = await apiFetch('/workspaces', { method: 'POST', body: JSON.stringify(body) });
      wsId = created.id;
    }

    // Save anagrafica if parsed data available
    if (window._parsedAnagrafica) {
      try {
        await apiFetch(`/workspaces/${wsId}/anagrafica`, { method: 'PUT', body: JSON.stringify(window._parsedAnagrafica) });
      } catch (e) { /* non bloccante */ }
      window._parsedAnagrafica = null;
    }

    workspaces = await apiFetch('/auth/workspaces');
    closeModal();
    renderGrid();
    // Aggiorna selettore workspace nella sidebar (superadmin)
    const sel = document.getElementById('workspaceSelect');
    if (sel) {
      const { populateWorkspaceSelect } = await import('../club/workspaceSwitcher.js');
      populateWorkspaceSelect(workspaces);
    }
  } catch (err) {
    alert('Errore: ' + err.message);
  }
  hideLoading();
}

// ── DELETE ──
async function openDeleteModal(wsId) {
  const ws = workspaces.find(w => w.id === wsId);
  if (!ws) return;

  showLoading('Calcolo dati...');
  let recap;
  try {
    recap = await apiFetch(`/workspaces/${wsId}/recap`);
  } catch (e) {
    hideLoading();
    alert('Errore: ' + e.message);
    return;
  }
  hideLoading();

  document.getElementById('deleteRecap').innerHTML = `
    <p style="margin-bottom:16px;">Stai per eliminare <strong>${ws.nome}</strong> e tutti i dati associati:</p>
    <div style="background:#FFF5F5;border:1px solid #FED7D7;border-radius:10px;padding:16px;">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:13px;">
        <span>📅 Stagioni: <strong>${recap.stagioni}</strong></span>
        <span>⚽ Squadre: <strong>${recap.squadre}</strong></span>
        <span>👥 Giocatori: <strong>${recap.giocatori}</strong></span>
        <span>🏟️ Partite: <strong>${recap.partite}</strong></span>
        <span>🏋️ Allenamenti: <strong>${recap.allenamenti}</strong></span>
        <span>📂 Categorie: <strong>${recap.categorie}</strong></span>
        <span>👔 Staff: <strong>${recap.staff}</strong></span>
        <span>👤 Utenti: <strong>${recap.utenti}</strong></span>
      </div>
    </div>
    <p style="margin-top:16px;color:#E74C3C;font-weight:600;font-size:13px;">⚠️ Questa azione è irreversibile!</p>
  `;

  document.getElementById('delConfirm').onclick = async () => {
    if (!await confirm(`Confermi l'eliminazione DEFINITIVA di "${ws.nome}"?`)) return;
    showLoading('Eliminazione in corso...');
    try {
      await apiFetch(`/workspaces/${wsId}`, { method: 'DELETE' });
      workspaces = await apiFetch('/auth/workspaces');
      document.getElementById('deleteModal').style.display = 'none';
      renderGrid();
      const sel = document.getElementById('workspaceSelect');
      if (sel) {
        const { populateWorkspaceSelect } = await import('../club/workspaceSwitcher.js');
        populateWorkspaceSelect(workspaces);
      }
    } catch (err) {
      alert('Errore: ' + err.message);
    }
    hideLoading();
  };

  document.getElementById('deleteModal').style.display = 'flex';
}
