import { apiFetch } from '../../services/api';
import { showLoading, hideLoading } from '../../utils/ui';

let tokens = [];
let categorie = [];
let workspaces = [];

export default async function loadGuestLinks() {
  const c = document.getElementById('pageContent');
  const user = window.YFM.getUser() || {};
  const isSuperadmin = user.is_superadmin;
  const isAdmin = user.ruolo === 'admin';
  const isAllenatore = user.ruolo === 'allenatore';

  if (!isSuperadmin && !isAdmin && !isAllenatore) {
    c.innerHTML = '<div class="error-box">Accesso riservato</div>';
    return;
  }

  c.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;">
      <h1 class="page-title">🔗 Link di Accesso Guest</h1>
      <button class="btn btn-primary" id="btnCreateLink">+ Crea Link</button>
    </div>
    
    <div class="card" style="margin-bottom:24px;background:#f8f9fa;">
      <p style="color:#666;margin:0;line-height:1.6;">
        I link guest permettono ad <strong>atleti</strong> e <strong>genitori</strong> di accedere 
        in sola lettura a dashboard e calendario della categoria selezionata.
      </p>
    </div>
    
    <div class="card">
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="border-bottom:2px solid #eee;">
            <th style="text-align:left;padding:12px;">Tipo</th>
            <th style="text-align:left;padding:12px;">Categoria</th>
            <th style="text-align:left;padding:12px;">Creato da</th>
            <th style="text-align:left;padding:12px;">Scadenza</th>
            <th style="text-align:left;padding:12px;">Link</th>
            <th style="text-align:right;padding:12px;">Azioni</th>
          </tr>
        </thead>
        <tbody id="linksTableBody"></tbody>
      </table>
    </div>
    
    <div id="linkModal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:1000;display:none;align-items:center;justify-content:center;">
      <div style="background:white;border-radius:12px;padding:24px;max-width:500px;width:90%;">
        <h2 style="margin-bottom:20px;">Crea Link di Accesso</h2>
        <form id="linkForm">
          ${isSuperadmin ? `
          <div class="form-group" id="wsGroup">
            <label>Workspace *</label>
            <select id="linkWorkspace" required></select>
          </div>` : ''}
          
          <div class="form-group">
            <label>Tipo di accesso *</label>
            <select id="linkTipo" required>
              <option value="atleta">🏃 Atleta</option>
              <option value="genitore">👨‍👩‍👧 Genitore</option>
            </select>
          </div>
          
          <div class="form-group" id="catGroup">
            <label>Categoria *</label>
            <div id="linkCategorie"></div>
          </div>
          
          <div class="form-group">
            <label>Scadenza</label>
            <select id="linkScadenza">
              <option value="30">30 giorni</option>
              <option value="90">90 giorni</option>
              <option value="365">1 anno</option>
              <option value="">Nessuna scadenza</option>
            </select>
          </div>
          
          <div style="display:flex;gap:12px;margin-top:20px;">
            <button type="submit" class="btn btn-primary">Crea Link</button>
            <button type="button" class="btn btn-secondary" id="btnCancelLink">Annulla</button>
          </div>
        </form>
      </div>
    </div>
  `;

  await loadData();

  document.getElementById('btnCreateLink').addEventListener('click', openCreateModal);
  document.getElementById('linkForm').addEventListener('submit', handleCreate);
  document.getElementById('btnCancelLink').addEventListener('click', () => {
    document.getElementById('linkModal').style.display = 'none';
  });

  if (isSuperadmin) {
    document.getElementById('linkWorkspace').addEventListener('change', onWorkspaceChange);
  }
}

async function loadData() {
  const user = window.YFM.getUser() || {};
  try {
    const tokensRes = await apiFetch('/auth/guest-links');
    tokens = tokensRes.links || [];

    if (user.is_superadmin) {
      try { workspaces = await apiFetch('/auth/workspaces'); } catch(e) { workspaces = []; }
      workspaces = Array.isArray(workspaces) ? workspaces : (workspaces.data || []);
      // Carica categorie di tutti i workspace per risolvere i nomi
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
    document.getElementById('linksTableBody').innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;color:#c00;">${err.message}</td></tr>`;
  }
}

function renderTokens() {
  const tbody = document.getElementById('linksTableBody');
  if (!tbody) return;

  if (tokens.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:#999;">Nessun link creato</td></tr>';
    return;
  }

  const now = new Date();
  tbody.innerHTML = tokens.map(t => {
    const isExpired = t.scadenza && new Date(t.scadenza) < now;
    const catIds = t.squadre_accesso || [];
    const catText = catIds.length > 0
      ? catIds.map(id => categorie.find(c => c.id === id)?.nome || id.substring(0, 8) + '...').join(', ')
      : 'Tutte';
    const createdBy = t.utente ? `${t.utente.nome} ${t.utente.cognome}` : '-';
    const link = `${window.location.origin}/guest/${t.token}`;

    return `
      <tr style="border-bottom:1px solid #eee;${isExpired ? 'opacity:0.5;' : ''}">
        <td style="padding:12px;">
          ${t.tipo === 'atleta' ? '🏃 Atleta' : '👨‍👩‍👧 Genitore'}
          ${isExpired ? '<span style="color:#E74C3C;font-size:11px;"> (scaduto)</span>' : ''}
        </td>
        <td style="padding:12px;color:#666;font-size:13px;">${catText}</td>
        <td style="padding:12px;color:#666;font-size:13px;">${createdBy}</td>
        <td style="padding:12px;color:#666;">
          ${t.scadenza ? new Date(t.scadenza).toLocaleDateString('it-IT') : 'Mai'}
        </td>
        <td style="padding:12px;">
          <button class="btn btn-small" data-copy="${link}">📋 Copia</button>
        </td>
        <td style="padding:12px;text-align:right;">
          <button class="btn btn-small btn-danger" data-revoke="${t.token}">🗑️</button>
        </td>
      </tr>`;
  }).join('');

  tbody.querySelectorAll('[data-copy]').forEach(btn => {
    btn.addEventListener('click', () => {
      navigator.clipboard.writeText(btn.dataset.copy).then(() => alert('Link copiato!')).catch(() => prompt('Copia:', btn.dataset.copy));
    });
  });

  tbody.querySelectorAll('[data-revoke]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Revocare questo link?')) return;
      try {
        await apiFetch(`/auth/guest-link/${btn.dataset.revoke}`, { method: 'DELETE' });
        await loadData();
      } catch (err) { alert('Errore: ' + err.message); }
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
  }

  if (user.ruolo === 'allenatore') {
    // Allenatore: categorie fisse (le sue)
    const userCats = user.categorie_accesso || [];
    renderCatCheckboxes(userCats, true);
  } else if (user.ruolo === 'admin') {
    renderCatCheckboxes([], false);
  }
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
  if (categorie.length === 0) {
    container.innerHTML = '<p style="color:#999;font-size:13px;">Nessuna categoria disponibile</p>';
    return;
  }
  container.innerHTML = categorie.map(cat => {
    const checked = preselected.includes(cat.id) ? 'checked' : '';
    const dis = disabled ? 'checked disabled' : checked;
    return `<label style="display:flex;align-items:center;gap:8px;padding:6px 0;cursor:pointer;">
      <input type="checkbox" name="linkCat" value="${cat.id}" ${dis}>
      <span>${cat.nome}</span>
    </label>`;
  }).join('');
}

async function handleCreate(e) {
  e.preventDefault();
  const user = window.YFM.getUser() || {};

  const tipo = document.getElementById('linkTipo').value;
  const scadenza_giorni = document.getElementById('linkScadenza').value || null;

  let categorie_accesso = [];
  if (user.ruolo === 'allenatore') {
    categorie_accesso = user.categorie_accesso || [];
  } else {
    const checked = document.querySelectorAll('#linkCategorie input[type="checkbox"]:checked');
    categorie_accesso = Array.from(checked).map(cb => cb.value);
  }

  if (categorie_accesso.length === 0) {
    alert('Seleziona almeno una categoria');
    return;
  }

  showLoading('Creazione link...');
  try {
    const result = await apiFetch('/auth/guest-link', {
      method: 'POST',
      body: JSON.stringify({ tipo, categorie_accesso, scadenza_giorni: scadenza_giorni ? parseInt(scadenza_giorni) : null })
    });
    hideLoading();
    document.getElementById('linkModal').style.display = 'none';

    if (result.link) {
      await navigator.clipboard.writeText(result.link).catch(() => {});
      alert('✅ Link creato e copiato!\n\n' + result.link);
    }
    await loadData();
  } catch (err) {
    hideLoading();
    alert('Errore: ' + err.message);
  }
}
