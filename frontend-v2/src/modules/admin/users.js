import { apiFetch } from '../../services/api';
import { showLoading, hideLoading } from '../../utils/ui';

let users = [];
let categorie = [];
let workspaces = [];
let staffList = [];

export default async function loadUsers() {
  const c = document.getElementById('pageContent');
  
  if (!window.YFM.isAdmin()) {
    c.innerHTML = '<div class="error-box">Accesso riservato agli amministratori</div>';
    return;
  }

  c.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;">
      <h1 class="page-title">👥 Gestione Utenti</h1>
      <button class="btn btn-primary" id="btnAddUser" data-help="users.crea">+ Nuovo Utente</button>
    </div>
    
    <div class="card">
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="border-bottom:2px solid #eee;">
            <th style="text-align:left;padding:12px;">Nome</th>
            <th style="text-align:left;padding:12px;">Email</th>
            <th style="text-align:left;padding:12px;">Ruolo</th>
            <th style="text-align:left;padding:12px;">Categorie</th>
            <th style="text-align:center;padding:12px;">Stato</th>
            <th style="text-align:right;padding:12px;">Azioni</th>
          </tr>
        </thead>
        <tbody id="usersTableBody"></tbody>
      </table>
    </div>
    
    <!-- Modal Wizard -->
    <div id="userModal" class="modal-overlay" style="display:none;">
      <div class="modal-content" style="max-width:560px;max-height:90vh;overflow-y:auto;">
        <div class="modal-header">
          <h2 id="modalTitle">Nuovo Utente</h2>
          <button class="modal-close-btn" id="closeModalBtn">&times;</button>
        </div>
        
        <!-- Progress bar -->
        <div style="display:flex;align-items:center;gap:8px;margin:16px 0 20px;padding:0 4px;">
          <div id="step1Dot" style="width:32px;height:32px;border-radius:50%;background:#667eea;color:white;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;">1</div>
          <div style="flex:1;height:3px;background:#e0e4f0;border-radius:2px;"><div id="progressBar" style="width:0%;height:100%;background:#667eea;border-radius:2px;transition:width .3s;"></div></div>
          <div id="step2Dot" style="width:32px;height:32px;border-radius:50%;background:#e0e4f0;color:#999;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;">2</div>
        </div>
        
        <form id="userForm">
          <!-- STEP 1: Dati Account -->
          <div id="wizardStep1">
            <p style="font-size:13px;color:#666;margin-bottom:16px;">Dati account</p>
            
            <!-- Collega a staff esistente -->
            <div class="form-group" id="staffLinkGroup">
              <label>👤 Collega a membro staff <span style="color:#999;font-size:11px;">(opzionale)</span></label>
              <select id="staffLink" style="width:100%;">
                <option value="">— Inserisci manualmente —</option>
              </select>
            </div>
            
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
              <div class="form-group"><label>Nome *</label><input type="text" id="userNome" required></div>
              <div class="form-group"><label>Cognome</label><input type="text" id="userCognome"></div>
            </div>
            <div class="form-group"><label>Email *</label><input type="email" id="userEmail" required></div>
            <div class="form-group"><label>Password <span id="passwordHint" style="color:#999;font-size:11px;"></span></label><input type="password" id="userPassword" placeholder="Min. 6 caratteri"></div>
            <div style="display:flex;justify-content:flex-end;margin-top:20px;">
              <button type="button" class="btn btn-primary" id="btnNextStep">Avanti →</button>
            </div>
          </div>
          
          <!-- STEP 2: Ruolo e Accessi -->
          <div id="wizardStep2" style="display:none;">
            <p style="font-size:13px;color:#666;margin-bottom:16px;">Ruolo e accessi</p>
            
            <div class="form-group">
              <label>Ruolo *</label>
              <select id="userRuolo" required>
                <option value="allenatore">Allenatore</option>
                <option value="staff">Staff</option>
                <option value="admin">Amministratore</option>
              </select>
            </div>
            
            <!-- Workspace (solo superadmin) -->
            <div class="form-group" id="workspaceGroup" style="display:none;">
              <label>🏢 Workspace *</label>
              <select id="userWorkspace"></select>
            </div>
            
            <!-- Categorie (checkbox) -->
            <div class="form-group" id="categorieGroup">
              <label>📂 Categorie accessibili</label>
              <div id="categorieCheckboxes" style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:8px;"></div>
              <small style="color:#666;">Nessuna selezione = accesso a tutte</small>
            </div>
            
            <!-- Permessi granulari (solo staff) -->
            <div id="permessiSection" style="display:none;margin-top:16px;padding:14px;background:#f8f9ff;border-radius:10px;border:1px solid #e0e4f0;">
              <label style="font-weight:600;font-size:13px;color:#333;margin-bottom:10px;display:block;">🔐 Permessi Moduli</label>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;" id="permessiGrid">
                <div class="perm-row"><span>📋 Rosa</span><select data-modulo="rosa" class="perm-select"><option value="">—</option><option value="read">👁️</option><option value="write">✏️</option></select></div>
                <div class="perm-row"><span>📅 Partite</span><select data-modulo="partite" class="perm-select"><option value="">—</option><option value="read">👁️</option><option value="write">✏️</option></select></div>
                <div class="perm-row"><span>🏟️ Formazione</span><select data-modulo="formazione" class="perm-select"><option value="">—</option><option value="read">👁️</option><option value="write">✏️</option></select></div>
                <div class="perm-row"><span>🏋️ Allenamenti</span><select data-modulo="allenamenti" class="perm-select"><option value="">—</option><option value="read">👁️</option><option value="write">✏️</option></select></div>
                <div class="perm-row"><span>📊 Statistiche</span><select data-modulo="statistiche" class="perm-select"><option value="">—</option><option value="read">👁️</option><option value="write">✏️</option></select></div>
                <div class="perm-row"><span>🔗 Guest Links</span><select data-modulo="guest_links" class="perm-select"><option value="">—</option><option value="read">👁️</option><option value="write">✏️</option></select></div>
              </div>
            </div>
            
            <!-- Stato (solo in edit) -->
            <div class="form-group" id="isActiveGroup" style="display:none;margin-top:12px;">
              <label><input type="checkbox" id="userIsActive" checked> Account attivo</label>
            </div>
            
            <input type="hidden" id="userId">
            
            <div style="display:flex;justify-content:space-between;margin-top:20px;">
              <button type="button" class="btn btn-secondary" id="btnPrevStep">← Indietro</button>
              <button type="submit" class="btn btn-primary">✓ Salva</button>
            </div>
          </div>
        </form>
      </div>
    </div>
    
    <style>
      .perm-row { display:flex;align-items:center;justify-content:space-between;padding:6px 10px;background:white;border-radius:8px;border:1px solid #eee; }
      .perm-row span { font-size:12px; }
      .perm-select { padding:3px 6px;border:1px solid #ddd;border-radius:6px;font-size:12px;width:50px; }
      .cat-checkbox { display:flex;align-items:center;gap:6px;padding:6px 10px;background:#f8f9fa;border-radius:8px;font-size:13px;cursor:pointer; }
      .cat-checkbox input { margin:0; }
    </style>
  `;

  await loadData();
  
  document.getElementById('btnAddUser')?.addEventListener('click', () => openModal());
  document.getElementById('closeModalBtn')?.addEventListener('click', closeModal);
  document.getElementById('userForm')?.addEventListener('submit', handleSubmit);
  document.getElementById('btnNextStep')?.addEventListener('click', goToStep2);
  document.getElementById('btnPrevStep')?.addEventListener('click', goToStep1);
  
  document.getElementById('userRuolo')?.addEventListener('change', onRuoloChange);
  document.getElementById('userWorkspace')?.addEventListener('change', onWorkspaceChange);
  document.getElementById('staffLink')?.addEventListener('change', onStaffSelect);
}

function closeModal() {
  document.getElementById('userModal').style.display = 'none';
}

function goToStep1() {
  document.getElementById('wizardStep1').style.display = 'block';
  document.getElementById('wizardStep2').style.display = 'none';
  document.getElementById('step1Dot').style.background = '#667eea';
  document.getElementById('step1Dot').style.color = 'white';
  document.getElementById('step2Dot').style.background = '#e0e4f0';
  document.getElementById('step2Dot').style.color = '#999';
  document.getElementById('progressBar').style.width = '0%';
}

function goToStep2() {
  // Validazione step 1
  const nome = document.getElementById('userNome').value.trim();
  const email = document.getElementById('userEmail').value.trim();
  if (!nome || !email) { alert('Nome e Email sono obbligatori'); return; }
  
  const isEdit = !!document.getElementById('userId').value;
  const password = document.getElementById('userPassword').value;
  if (!isEdit && password.length < 6) { alert('Password deve avere almeno 6 caratteri'); return; }
  
  document.getElementById('wizardStep1').style.display = 'none';
  document.getElementById('wizardStep2').style.display = 'block';
  document.getElementById('step1Dot').style.background = '#27AE60';
  document.getElementById('step2Dot').style.background = '#667eea';
  document.getElementById('step2Dot').style.color = 'white';
  document.getElementById('progressBar').style.width = '100%';
  
  onRuoloChange();
}

function onRuoloChange() {
  const ruolo = document.getElementById('userRuolo').value;
  document.getElementById('permessiSection').style.display = ruolo === 'staff' ? 'block' : 'none';
  // Categorie visibili per allenatore e staff
  document.getElementById('categorieGroup').style.display = (ruolo === 'admin') ? 'none' : 'block';
}

async function onWorkspaceChange() {
  const wsId = document.getElementById('userWorkspace').value;
  if (!wsId) return;
  // Carica categorie del workspace selezionato
  try {
    categorie = await apiFetch(`/workspaces/${wsId}/categorie`);
  } catch (e) {
    categorie = [];
  }
  renderCategorieCheckboxes();
}

function onStaffSelect() {
  const sel = document.getElementById('staffLink');
  const staffId = sel.value;
  if (!staffId) return;
  
  const member = staffList.find(s => s.id === staffId);
  if (member) {
    document.getElementById('userNome').value = member.nome || '';
    document.getElementById('userCognome').value = member.cognome || '';
  }
}

function populateStaffDropdown() {
  const sel = document.getElementById('staffLink');
  if (!sel) return;
  sel.innerHTML = '<option value="">\u2014 Inserisci manualmente \u2014</option>' +
    staffList.map(s => `<option value="${s.id}">${s.cognome} ${s.nome} (${s.ruolo_squadra || s.ruolo || ''})</option>`).join('');
}

function renderCategorieCheckboxes(selectedIds = []) {
  const container = document.getElementById('categorieCheckboxes');
  if (!container) return;
  if (categorie.length === 0) {
    container.innerHTML = '<small style="color:#999;">Nessuna categoria disponibile</small>';
    return;
  }
  container.innerHTML = categorie.map(cat => `
    <label class="cat-checkbox">
      <input type="checkbox" value="${cat.id}" ${selectedIds.includes(cat.id) ? 'checked' : ''}>
      ${cat.nome}
    </label>
  `).join('');
}

async function loadData() {
  try {
    showLoading('Caricamento...');
    
    const user = window.YFM.getUser();
    const isSuperadmin = user?.is_superadmin;
    
    // Carica workspaces (solo superadmin)
    if (isSuperadmin) {
      workspaces = await apiFetch('/auth/workspaces');
    }
    
    // Carica categorie del workspace corrente
    const wsId = window.YFM.activeWorkspaceId || window.YFM.workspaceInfo?.id;
    if (wsId) {
      try { categorie = await apiFetch(`/workspaces/${wsId}/categorie`); } catch(e) { categorie = []; }
    }
    
    // Carica staff del workspace (per dropdown collegamento)
    if (wsId) {
      try { staffList = await apiFetch(`/workspaces/${wsId}/staff`); } catch(e) { staffList = []; }
    }
    
    // Carica utenti: filtrati per workspace attivo
    const usersUrl = '/auth/users' + (wsId ? `?workspace_id=${wsId}` : '');
    const usersRes = await apiFetch(usersUrl);
    users = usersRes.users || [];
    
    hideLoading();
    renderUsers();
  } catch (err) {
    hideLoading();
    document.getElementById('pageContent').innerHTML = `<div class="error-box">Errore: ${err.message}</div>`;
  }
}

function renderUsers() {
  const tbody = document.getElementById('usersTableBody');
  if (!tbody) return;
  
  if (users.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:#999;">Nessun utente trovato</td></tr>';
    return;
  }
  
  tbody.innerHTML = users.map(user => {
    const isCurrentUser = user.id === window.YFM.getUser()?.id;
    const catAccesso = user.categorie_accesso || [];
    const categorieText = catAccesso.length > 0 
      ? catAccesso.map(id => categorie.find(c => c.id === id)?.nome || '?').join(', ')
      : '<span style="color:#999;">Tutte</span>';
    
    return `
      <tr style="border-bottom:1px solid #eee;">
        <td style="padding:12px;">
          <strong>${user.nome} ${user.cognome || ''}</strong>
          ${isCurrentUser ? '<span style="background:#667eea;color:white;padding:2px 6px;border-radius:4px;font-size:11px;margin-left:8px;">Tu</span>' : ''}
        </td>
        <td style="padding:12px;color:#666;font-size:13px;">${user.email}</td>
        <td style="padding:12px;">
          <span class="badge badge-${getRoleBadge(user.ruolo)}">${getRoleLabel(user.ruolo)}</span>
          ${user.is_superadmin ? '<span class="badge" style="background:#9b59b6;color:white;margin-left:4px;">SA</span>' : ''}
        </td>
        <td style="padding:12px;font-size:13px;">${categorieText}</td>
        <td style="padding:12px;text-align:center;">
          <span style="width:8px;height:8px;border-radius:50%;display:inline-block;background:${user.is_active !== false ? '#27AE60' : '#E74C3C'};"></span>
        </td>
        <td style="padding:12px;text-align:right;">
          ${!isCurrentUser ? `
            <button class="btn btn-small" onclick="window._editUser('${user.id}')" title="Modifica">✏️</button>
            <button class="btn btn-small btn-danger" onclick="window._deleteUser('${user.id}')" title="Disattiva" style="margin-left:4px;">🗑️</button>
          ` : ''}
        </td>
      </tr>
    `;
  }).join('');
  
  window._editUser = (id) => openModal(id);
  window._deleteUser = async (id) => {
    if (!await confirm('Disattivare questo utente?')) return;
    try {
      await apiFetch(`/auth/users/${id}`, { method: 'DELETE' });
      await loadData();
    } catch (err) { alert('Errore: ' + err.message); }
  };
}

function getRoleBadge(ruolo) {
  return { admin: 'purple', allenatore: 'blue', staff: 'gray' }[ruolo] || 'gray';
}
function getRoleLabel(ruolo) {
  return { admin: 'Admin', allenatore: 'Allenatore', staff: 'Staff' }[ruolo] || ruolo;
}

async function openModal(userId = null) {
  const modal = document.getElementById('userModal');
  const form = document.getElementById('userForm');
  
  form.reset();
  document.getElementById('userId').value = '';
  goToStep1();
  
  const isSuperadmin = window.YFM.getUser()?.is_superadmin;
  
  // Workspace dropdown (solo superadmin)
  const wsGroup = document.getElementById('workspaceGroup');
  if (isSuperadmin && workspaces.length > 0) {
    wsGroup.style.display = 'block';
    const wsSelect = document.getElementById('userWorkspace');
    const currentWsId = window.YFM.activeWorkspaceId || window.YFM.workspaceInfo?.id;
    wsSelect.innerHTML = workspaces.map(w => 
      `<option value="${w.id}" ${w.id === currentWsId ? 'selected' : ''}>${w.nome}</option>`
    ).join('');
  } else {
    wsGroup.style.display = 'none';
  }
  
  if (userId) {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    
    document.getElementById('modalTitle').textContent = 'Modifica Utente';
    document.getElementById('isActiveGroup').style.display = 'block';
    document.getElementById('passwordHint').textContent = '(lascia vuoto per non cambiare)';
    
    document.getElementById('userNome').value = user.nome || '';
    document.getElementById('userCognome').value = user.cognome || '';
    document.getElementById('userEmail').value = user.email || '';
    document.getElementById('userRuolo').value = user.ruolo || 'allenatore';
    document.getElementById('userIsActive').checked = user.is_active !== false;
    document.getElementById('userId').value = user.id;
    
    if (isSuperadmin && user.workspace_id) {
      document.getElementById('userWorkspace').value = user.workspace_id;
      await onWorkspaceChange();
    }
    
    // Carica permessi
    if (user.permessi) {
      document.querySelectorAll('.perm-select').forEach(sel => {
        sel.value = user.permessi[sel.dataset.modulo] || '';
      });
    }
    
    // Categorie selezionate
    const selectedCats = user.categorie_accesso || [];
    renderCategorieCheckboxes(selectedCats);
  } else {
    document.getElementById('modalTitle').textContent = 'Nuovo Utente';
    document.getElementById('isActiveGroup').style.display = 'none';
    document.getElementById('passwordHint').textContent = '(obbligatoria)';
    document.querySelectorAll('.perm-select').forEach(sel => { sel.value = ''; });
    renderCategorieCheckboxes([]);
  }
  
  modal.style.display = 'flex';
  populateStaffDropdown();
}

async function handleSubmit(e) {
  e.preventDefault();
  
  const userId = document.getElementById('userId').value;
  const isEdit = !!userId;
  
  const nome = document.getElementById('userNome').value.trim();
  const cognome = document.getElementById('userCognome').value.trim();
  const email = document.getElementById('userEmail').value.trim();
  const password = document.getElementById('userPassword').value;
  const ruolo = document.getElementById('userRuolo').value;
  const is_active = document.getElementById('userIsActive').checked;
  
  // Categorie selezionate
  const catCheckboxes = document.querySelectorAll('#categorieCheckboxes input[type="checkbox"]:checked');
  const categorie_accesso = Array.from(catCheckboxes).map(cb => cb.value);
  
  // Workspace
  const isSuperadmin = window.YFM.getUser()?.is_superadmin;
  const workspace_id = isSuperadmin 
    ? document.getElementById('userWorkspace')?.value 
    : (window.YFM.activeWorkspaceId || window.YFM.workspaceInfo?.id);
  
  showLoading('Salvataggio...');
  
  try {
    const body = { nome, cognome, email, ruolo, categorie_accesso, workspace_id };
    if (password) body.password = password;
    if (isEdit) body.is_active = is_active;
    
    // Permessi staff
    if (ruolo === 'staff') {
      const permessi = {};
      document.querySelectorAll('.perm-select').forEach(sel => {
        if (sel.value) permessi[sel.dataset.modulo] = sel.value;
      });
      body.permessi = permessi;
    } else {
      body.permessi = {};
    }
    
    if (isEdit) {
      await apiFetch(`/auth/users/${userId}`, { method: 'PUT', body: JSON.stringify(body) });
    } else {
      await apiFetch('/auth/users', { method: 'POST', body: JSON.stringify(body) });
    }
    
    hideLoading();
    closeModal();
    await loadData();
  } catch (err) {
    hideLoading();
    alert('Errore: ' + err.message);
  }
}
