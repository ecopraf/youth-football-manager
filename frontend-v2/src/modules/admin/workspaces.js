import { apiFetch } from '../../services/api';
import { showLoading, hideLoading } from '../../utils/ui';
import { isOurTeam } from '../../utils/teamMatch';

let workspaces = [];
let allLogos = [];

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

// ── TC PARSER ──
function parseTCText(text) {
  const result = {};
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const mapping = {
    'nome completo': 'nome',
    'colori sociali': 'colori_sociali',
    'sede': 'indirizzo',
    'telefono': 'telefono',
    'sito web': 'sito_web',
    'email': 'email',
    'sponsor tecnico': 'sponsor_tecnico'
  };

  let stadioLines = [];
  let inStadio = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Handle "Stadio" which can span multiple lines
    if (inStadio) {
      // Next key found? stop collecting stadio
      const isKey = Object.keys(mapping).some(k => line.toLowerCase().startsWith(k)) ||
        /^(categoria|regione|fax|email secondaria|facebook|instagram)/i.test(line);
      if (isKey) {
        inStadio = false;
      } else {
        stadioLines.push(line);
        continue;
      }
    }

    if (/^stadio/i.test(line)) {
      const val = line.replace(/^stadio\s*/i, '').replace(/^\t+/, '').trim();
      if (val) stadioLines.push(val);
      inStadio = true;
      continue;
    }

    for (const [key, field] of Object.entries(mapping)) {
      if (line.toLowerCase().startsWith(key)) {
        let val = line.substring(key.length).replace(/^\t+/, '').trim();
        if (!val && i + 1 < lines.length) {
          // Value might be on next line (tab-separated format)
          const next = lines[i + 1];
          if (!Object.keys(mapping).some(k => next.toLowerCase().startsWith(k)) && !/^(categoria|stadio|regione|fax|email secondaria|facebook|instagram)/i.test(next)) {
            val = next.trim();
            i++;
          }
        }
        if (val && val !== '-') result[field] = val;
        break;
      }
    }
  }

  // Parse stadio into facility fields
  if (stadioLines.length > 0) {
    result._stadio_nome = stadioLines[0];
    if (stadioLines.length > 1) result._stadio_indirizzo = stadioLines.slice(1).join(', ');
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
            <textarea id="tcPasteInput" rows="6" style="width:100%;border:1px solid #ddd;border-radius:8px;padding:10px;font-size:12px;font-family:monospace;" placeholder="Incolla qui la scheda società da Tuttocampo..."></textarea>
            <button type="button" class="btn btn-primary" id="btnParsePaste" style="margin-top:8px;font-size:12px;">⚡ Analizza e precompila</button>
          </div>
        </div>

        <form id="wsForm">
          <div class="form-group"><label>Nome *</label><input id="wsNome" required></div>
          <div class="form-group"><label>Nome Breve</label><input id="wsNomeBreve" placeholder="es. DF Academy (mostrato in sidebar/dashboard)"></div>
          <div id="logoPreview" style="margin:12px 0;text-align:center;"></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div class="form-group"><label>Colori Sociali</label><input id="wsColori" placeholder="es. Nero/Azzurro"></div>
            <div class="form-group"><label>Sponsor Tecnico</label><input id="wsSponsor" placeholder="es. Nike"></div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div class="form-group"><label>Indirizzo sede</label><input id="wsIndirizzo"></div>
            <div class="form-group"><label>Telefono</label><input id="wsTelefono"></div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div class="form-group"><label>Email</label><input id="wsEmail" type="email"></div>
            <div class="form-group"><label>Sito web</label><input id="wsSitoWeb" placeholder="https://..."></div>
          </div>

          <div style="background:#f8f9fa;border-radius:10px;padding:14px;margin-top:12px;">
            <label style="font-weight:600;font-size:13px;display:block;margin-bottom:8px;">🏟️ Campo di Casa (Facility)</label>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
              <div class="form-group"><label>Nome Impianto</label><input id="wsFacNome" placeholder="es. Centro Sportivo"></div>
              <div class="form-group"><label>Indirizzo Campo</label><input id="wsFacIndirizzo" placeholder="es. Via dello Sport 1"></div>
            </div>
          </div>

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
}

function renderGrid() {
  const grid = document.getElementById('wsGrid');
  grid.innerHTML = workspaces.map(ws => {
    const infoParts = [ws.indirizzo, ws.telefono, ws.email].filter(Boolean);
    return `
      <div class="ws-card">
        <div class="ws-card-header">
          <img class="ws-card-logo" src="${ws.logo_url || '/assets/app-icon.png'}" onerror="this.src='/assets/app-icon.png'">
          <div>
            <div class="ws-card-name">${ws.nome}</div>
            <div class="ws-card-meta">${[ws.colori_sociali, ws.sponsor_tecnico].filter(Boolean).join(' · ') || ''}</div>
          </div>
        </div>
        ${infoParts.length ? `<div class="ws-card-info">${infoParts.join(' · ')}</div>` : ''}
        <div class="ws-card-actions">
          <button class="btn btn-small" data-edit="${ws.id}">✏️ Modifica</button>
          <button class="btn btn-small btn-danger" data-del="${ws.id}" style="background:#E74C3C;color:white;">🗑️ Elimina</button>
        </div>
      </div>
    `;
  }).join('');

  grid.querySelectorAll('[data-edit]').forEach(btn => btn.addEventListener('click', () => openModal(btn.dataset.edit)));
  grid.querySelectorAll('[data-del]').forEach(btn => btn.addEventListener('click', () => openDeleteModal(btn.dataset.del)));
}

// ── PARSE TC PASTE ──
function handleParse() {
  const text = document.getElementById('tcPasteInput').value.trim();
  if (!text) { alert('Incolla prima i dati dalla scheda Tuttocampo'); return; }

  const parsed = parseTCText(text);

  // Fill form fields (only if currently empty or user confirms overwrite)
  const fields = {
    wsNome: parsed.nome,
    wsColori: parsed.colori_sociali,
    wsSponsor: parsed.sponsor_tecnico,
    wsIndirizzo: parsed.indirizzo,
    wsTelefono: parsed.telefono,
    wsEmail: parsed.email,
    wsSitoWeb: parsed.sito_web,
    wsFacNome: parsed._stadio_nome,
    wsFacIndirizzo: parsed._stadio_indirizzo
  };

  for (const [id, val] of Object.entries(fields)) {
    if (val) document.getElementById(id).value = val;
  }

  // Auto-match logo based on parsed name
  if (parsed.nome) {
    const logo = findLogo(parsed.nome);
    if (logo) {
      document.getElementById('wsLogoUrl').value = logo;
      renderLogoPreview(logo, true);
    }
  }

  // Collapse paste area and show success
  document.getElementById('tcPasteArea').style.display = 'none';
  document.getElementById('btnTogglePaste').innerHTML = '✅ Dati importati da Tuttocampo';
  document.getElementById('btnTogglePaste').style.background = '#d4edda';
  document.getElementById('btnTogglePaste').style.color = '#155724';
}

// ── LOGO ──
function autoMatchLogo() {
  const nome = document.getElementById('wsNome').value.trim();
  if (!nome || document.getElementById('wsLogoUrl').value) return;
  const match = findLogo(nome);
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
  grid.innerHTML = allLogos.map(l => `<img class="logo-item" src="${l}" data-logo="${l}" title="${l.replace('/logos/', '')}">`).join('');
  grid.querySelectorAll('.logo-item').forEach(img => {
    img.addEventListener('click', () => {
      document.getElementById('wsLogoUrl').value = img.dataset.logo;
      renderLogoPreview(img.dataset.logo, true);
      modal.style.display = 'none';
    });
  });
  modal.style.display = 'flex';
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
  document.getElementById('btnTogglePaste').innerHTML = '📋 Incolla dati da Tuttocampo';
  document.getElementById('btnTogglePaste').style.background = '';
  document.getElementById('btnTogglePaste').style.color = '';
  document.getElementById('wsFacNome').value = '';
  document.getElementById('wsFacIndirizzo').value = '';

  if (wsId) {
    const ws = workspaces.find(w => w.id === wsId);
    if (!ws) return;
    document.getElementById('wsModalTitle').textContent = 'Modifica Workspace';
    document.getElementById('wsId').value = ws.id;
    document.getElementById('wsNome').value = ws.nome || '';
    document.getElementById('wsNomeBreve').value = ws.nome_breve || '';
    document.getElementById('wsColori').value = ws.colori_sociali || '';
    document.getElementById('wsSponsor').value = ws.sponsor_tecnico || '';
    document.getElementById('wsIndirizzo').value = ws.indirizzo || '';
    document.getElementById('wsTelefono').value = ws.telefono || '';
    document.getElementById('wsEmail').value = ws.email || '';
    document.getElementById('wsSitoWeb').value = ws.sito_web || '';
    document.getElementById('wsLogoUrl').value = ws.logo_url || '';
    if (ws.logo_url) renderLogoPreview(ws.logo_url, true);

    // Load facility
    try {
      const fac = await apiFetch(`/workspaces/${wsId}/facility`);
      if (fac) {
        document.getElementById('wsFacNome').value = fac.nome || '';
        document.getElementById('wsFacIndirizzo').value = fac.indirizzo || '';
      }
    } catch (e) {}
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
    logo_url: document.getElementById('wsLogoUrl').value || null,
    colori_sociali: document.getElementById('wsColori').value.trim() || null,
    sponsor_tecnico: document.getElementById('wsSponsor').value.trim() || null,
    indirizzo: document.getElementById('wsIndirizzo').value.trim() || null,
    telefono: document.getElementById('wsTelefono').value.trim() || null,
    email: document.getElementById('wsEmail').value.trim() || null,
    sito_web: document.getElementById('wsSitoWeb').value.trim() || null
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

    // Save facility if provided
    const facNome = document.getElementById('wsFacNome').value.trim();
    const facIndirizzo = document.getElementById('wsFacIndirizzo').value.trim();
    if (facNome || facIndirizzo) {
      await apiFetch(`/workspaces/${wsId}/facility`, {
        method: 'PUT',
        body: JSON.stringify({ nome: facNome, indirizzo: facIndirizzo, citta: '' })
      });
    }

    workspaces = await apiFetch('/auth/workspaces');
    closeModal();
    renderGrid();
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
    } catch (err) {
      alert('Errore: ' + err.message);
    }
    hideLoading();
  };

  document.getElementById('deleteModal').style.display = 'flex';
}
