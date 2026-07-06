import { apiFetch } from '../../services/api';
import { showLoading, hideLoading } from '../../utils/ui';
import { CAPABILITIES, PROFILI, getUserCapabilities } from '../../utils/capabilities';

let users = [];
let categorie = [];
let workspaces = [];
let staffList = [];
let stagioni = [];

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
        
        <div class="modal-body">
          <!-- Progress bar -->
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:24px;">
            <div id="step1Dot" style="width:32px;height:32px;border-radius:50%;background:#667eea;color:white;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;">1</div>
            <div style="flex:1;height:3px;background:#e0e4f0;border-radius:2px;"><div id="progressBar" style="width:0%;height:100%;background:#667eea;border-radius:2px;transition:width .3s;"></div></div>
            <div id="step2Dot" style="width:32px;height:32px;border-radius:50%;background:#e0e4f0;color:#999;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;">2</div>
          </div>
          
          <form id="userForm">
            <!-- STEP 1: Dati Account -->
            <div id="wizardStep1">
              <p style="font-size:13px;color:#666;margin-bottom:16px;">Dati account</p>
              
              <!-- Collega a staff esistente -->
              <div class="form-group" id="staffLinkGroup" style="margin-bottom:16px;">
                <label>👤 Collega a membro staff <span style="color:#999;font-size:11px;">(opzionale)</span></label>
                <select id="staffLink" style="width:100%;">
                  <option value="">— Inserisci manualmente —</option>
                </select>
              </div>
              
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
                <div class="form-group"><label>Nome *</label><input type="text" id="userNome" required></div>
                <div class="form-group"><label>Cognome</label><input type="text" id="userCognome"></div>
              </div>
              <div class="form-group" style="margin-bottom:16px;"><label>Email *</label><input type="email" id="userEmail" required></div>
              
              <!-- Password section -->
              <div id="passwordSection">
                <!-- In edit: badge + toggle cambio -->
                <div id="passwordStatusBar" style="display:none;padding:10px 14px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;margin-bottom:12px;display:none;align-items:center;justify-content:space-between;">
                  <span style="font-size:13px;color:#16a34a;font-weight:500;">🔒 Password impostata</span>
                  <button type="button" id="btnTogglePassword" class="btn btn-small btn-secondary" style="font-size:12px;padding:4px 10px;">Cambia</button>
                </div>
                
                <!-- Campi password (visibili in creazione, nascosti in edit finché non si clicca Cambia) -->
                <div id="passwordFields">
                  <div class="form-group" style="margin-bottom:8px;">
                    <label>Password *</label>
                    <input type="password" id="userPassword" placeholder="Min. 6 caratteri" autocomplete="new-password">
                  </div>
                  <div class="form-group">
                    <label>Conferma password *</label>
                    <input type="password" id="userPasswordConfirm" placeholder="Ripeti la password" autocomplete="new-password">
                  </div>
                </div>
              </div>
              
              <div style="display:flex;justify-content:flex-end;margin-top:24px;">
                <button type="button" class="btn btn-primary" id="btnNextStep">Avanti →</button>
              </div>
            </div>
            
            <!-- STEP 2: Ruolo e Accessi -->
            <div id="wizardStep2" style="display:none;">
              <p style="font-size:13px;color:#666;margin-bottom:16px;">Profilo e accessi</p>
              
              <!-- Ruolo sistema (nascosto, derivato dal profilo) -->
              <input type="hidden" id="userRuolo" value="staff">
              
              <!-- Profilo -->
              <div class="form-group" style="margin-bottom:16px;">
                <label>Profilo *</label>
                <select id="userProfilo">
                  ${Object.entries(PROFILI).filter(([k]) => k !== 'admin' || window.YFM.getUser()?.is_superadmin).map(([k, v]) => `<option value="${k}">${v.icon} ${v.label}</option>`).join('')}
                </select>
              </div>
              
              <!-- Workspace (solo superadmin) -->
              <div class="form-group" id="workspaceGroup" style="display:none;margin-bottom:16px;">
                <label>🏢 Workspace *</label>
                <select id="userWorkspace"></select>
              </div>
              
              <!-- Stagioni accessibili -->
              <div class="form-group" id="stagioniGroup" style="margin-bottom:16px;">
                <label>📅 Stagioni accessibili</label>
                <div id="stagioniCheckboxes" style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:8px;"></div>
                <small style="color:#666;margin-top:6px;display:block;">Nessuna selezione = solo stagione attiva</small>
              </div>
              
              <!-- Categorie (checkbox) -->
              <div class="form-group" id="categorieGroup" style="margin-bottom:16px;">
                <label>📂 Categorie accessibili</label>
                <div id="categorieCheckboxes" style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:8px;"></div>
                <small style="color:#666;margin-top:6px;display:block;">Nessuna selezione = accesso a tutte</small>
              </div>
              
              <!-- Capabilities toggle -->
              <div id="capabilitiesSection" style="padding:14px;background:#f8f9ff;border-radius:10px;border:1px solid #e0e4f0;">
                <label style="font-weight:600;font-size:13px;color:#333;margin-bottom:10px;display:block;">🔐 Capabilities</label>
                <div id="capabilitiesGrid" style="display:grid;gap:8px;"></div>
              </div>
              
              <!-- Stato (solo in edit) -->
              <div class="form-group" id="isActiveGroup" style="display:none;margin-top:16px;">
                <label style="display:flex;align-items:center;gap:8px;cursor:pointer;"><input type="checkbox" id="userIsActive" checked> Account attivo</label>
              </div>
              
              <input type="hidden" id="userId">
              
              <div style="display:flex;justify-content:space-between;margin-top:24px;">
                <button type="button" class="btn btn-secondary" id="btnPrevStep">← Indietro</button>
                <button type="submit" class="btn btn-primary">✓ Salva</button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
    
    <style>
      .cap-row { display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:white;border-radius:8px;border:1px solid #eee; }
      .cap-row .cap-info { display:flex;align-items:center;gap:8px;font-size:12px; }
      .cap-row .cap-icon { font-size:14px; }
      .cap-row .cap-label { font-weight:500;color:#333; }
      .cap-toggle { display:flex;align-items:center;gap:4px; }
      .cap-toggle button { padding:3px 8px;border:1px solid #ddd;border-radius:6px;font-size:11px;cursor:pointer;background:white;transition:all 0.15s; }
      .cap-toggle button.active-off { background:#f1f5f9;color:#999;border-color:#e2e8f0; }
      .cap-toggle button.active-read { background:#3b82f6;color:white;border-color:#3b82f6; }
      .cap-toggle button.active-write { background:#22c55e;color:white;border-color:#22c55e; }
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
  document.getElementById('btnTogglePassword')?.addEventListener('click', togglePasswordFields);
  
  document.getElementById('userProfilo')?.addEventListener('change', onProfiloChange);
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

function togglePasswordFields() {
  const fields = document.getElementById('passwordFields');
  const btn = document.getElementById('btnTogglePassword');
  if (fields.style.display === 'none') {
    fields.style.display = 'block';
    btn.textContent = 'Annulla';
    document.getElementById('userPassword').value = '';
    document.getElementById('userPasswordConfirm').value = '';
  } else {
    fields.style.display = 'none';
    btn.textContent = 'Cambia';
    document.getElementById('userPassword').value = '';
    document.getElementById('userPasswordConfirm').value = '';
  }
}

function goToStep2() {
  const nome = document.getElementById('userNome').value.trim();
  const email = document.getElementById('userEmail').value.trim();
  if (!nome || !email) { alert('Nome e Email sono obbligatori'); return; }
  
  const isEdit = !!document.getElementById('userId').value;
  const password = document.getElementById('userPassword').value;
  const passwordConfirm = document.getElementById('userPasswordConfirm').value;
  const passwordFieldsVisible = document.getElementById('passwordFields').style.display !== 'none';
  
  // Validazione password solo se i campi sono visibili e compilati
  if (passwordFieldsVisible && (password || !isEdit)) {
    if (password.length < 6) { alert('Password deve avere almeno 6 caratteri'); return; }
    if (password !== passwordConfirm) { alert('Le password non coincidono'); return; }
  }
  
  document.getElementById('wizardStep1').style.display = 'none';
  document.getElementById('wizardStep2').style.display = 'block';
  document.getElementById('step1Dot').style.background = '#27AE60';
  document.getElementById('step2Dot').style.background = '#667eea';
  document.getElementById('step2Dot').style.color = 'white';
  document.getElementById('progressBar').style.width = '100%';
  
  renderCapabilitiesGrid();
  onProfiloChange();
}

function onProfiloChange() {
  const profilo = document.getElementById('userProfilo').value;
  const profiloData = PROFILI[profilo];
  if (!profiloData || profilo === 'custom') return;
  // Precompila capabilities dal profilo
  CAPABILITIES.forEach(cap => {
    const val = profiloData.capabilities[cap.id] || '';
    setCapabilityValue(cap.id, val);
  });
  // Deriva ruolo sistema dal profilo
  const ruoloMap = { admin: 'admin', allenatore: 'allenatore', vice_allenatore: 'allenatore', dirigente: 'staff', preparatore: 'staff', osservatore: 'staff', custom: 'staff' };
  document.getElementById('userRuolo').value = ruoloMap[profilo] || 'staff';
}

function renderCapabilitiesGrid() {
  const grid = document.getElementById('capabilitiesGrid');
  if (!grid) return;
  grid.innerHTML = CAPABILITIES.map(cap => `
    <div class="cap-row" data-cap="${cap.id}">
      <div class="cap-info"><span class="cap-icon">${cap.icon}</span><span class="cap-label">${cap.label}</span></div>
      <div class="cap-toggle">
        <button type="button" data-cap="${cap.id}" data-val="" class="active-off">—</button>
        <button type="button" data-cap="${cap.id}" data-val="read">👁️</button>
        <button type="button" data-cap="${cap.id}" data-val="write">✏️</button>
      </div>
    </div>
  `).join('');
  // Attach toggle listeners
  grid.querySelectorAll('.cap-toggle button').forEach(btn => {
    btn.addEventListener('click', () => {
      setCapabilityValue(btn.dataset.cap, btn.dataset.val);
      document.getElementById('userProfilo').value = 'custom';
    });
  });
  // Se in edit, carica capabilities pendenti
  if (window._pendingCaps) {
    CAPABILITIES.forEach(cap => {
      setCapabilityValue(cap.id, window._pendingCaps[cap.id] || '');
    });
    window._pendingCaps = null;
  }
}

function setCapabilityValue(capId, val) {
  const grid = document.getElementById('capabilitiesGrid');
  if (!grid) return;
  const btns = grid.querySelectorAll(`button[data-cap="${capId}"]`);
  btns.forEach(b => {
    b.className = b.dataset.val === val
      ? (val === '' ? 'active-off' : val === 'read' ? 'active-read' : 'active-write')
      : '';
  });
}

function getCapabilitiesFromUI() {
  const caps = {};
  const grid = document.getElementById('capabilitiesGrid');
  if (!grid) return caps;
  CAPABILITIES.forEach(cap => {
    const activeBtn = grid.querySelector(`button[data-cap="${cap.id}"].active-read, button[data-cap="${cap.id}"].active-write`);
    if (activeBtn) caps[cap.id] = activeBtn.dataset.val;
  });
  return caps;
}

function detectProfilo(caps) {
  for (const [key, prof] of Object.entries(PROFILI)) {
    if (key === 'custom') continue;
    const match = CAPABILITIES.every(c => (prof.capabilities[c.id] || '') === (caps[c.id] || ''));
    if (match) return key;
  }
  return 'custom';
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

function renderStagioniCheckboxes(selectedIds = []) {
  const container = document.getElementById('stagioniCheckboxes');
  if (!container) return;
  if (stagioni.length === 0) {
    container.innerHTML = '<small style="color:#999;">Nessuna stagione disponibile</small>';
    return;
  }
  container.innerHTML = stagioni.map(s => `
    <label class="cat-checkbox">
      <input type="checkbox" value="${s.id}" ${selectedIds.includes(s.id) ? 'checked' : ''}>
      ${s.nome}${s.attiva ? ' <span style="color:#27AE60;font-size:11px;">● attiva</span>' : ''}
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
    
    // Carica stagioni del workspace
    if (wsId) {
      try { stagioni = await apiFetch(`/workspaces/${wsId}/stagioni`); } catch(e) { stagioni = []; }
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
          <span class="badge badge-${getProfiloBadge(user)}">${getProfiloLabel(user)}</span>
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

function getProfiloBadge(user) {
  if (user.ruolo === 'admin') return 'purple';
  const profilo = user.permessi?.profilo;
  return { allenatore: 'blue', vice_allenatore: 'blue', dirigente: 'gray', preparatore: 'orange', osservatore: 'gray' }[profilo] || 'gray';
}
function getProfiloLabel(user) {
  if (user.ruolo === 'admin') return 'Admin';
  const profilo = user.permessi?.profilo;
  if (profilo && PROFILI[profilo]) return PROFILI[profilo].icon + ' ' + PROFILI[profilo].label;
  return { admin: 'Admin', allenatore: 'Allenatore', staff: 'Staff' }[user.ruolo] || user.ruolo;
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
    
    // Password: mostra status bar, nascondi campi
    document.getElementById('passwordStatusBar').style.display = 'flex';
    document.getElementById('passwordFields').style.display = 'none';
    document.getElementById('btnTogglePassword').textContent = 'Cambia';
    
    document.getElementById('userNome').value = user.nome || '';
    document.getElementById('userCognome').value = user.cognome || '';
    document.getElementById('userEmail').value = user.email || '';
    document.getElementById('userIsActive').checked = user.is_active !== false;
    document.getElementById('userId').value = user.id;
    
    // Carica profilo e capabilities
    const permessi = user.permessi || {};
    const profilo = permessi.profilo || detectProfilo(getUserCapabilities(permessi));
    document.getElementById('userProfilo').value = profilo;
    document.getElementById('userRuolo').value = user.ruolo || 'staff';
    
    if (isSuperadmin && user.workspace_id) {
      document.getElementById('userWorkspace').value = user.workspace_id;
      await onWorkspaceChange();
    }
    
    // Categorie selezionate
    const selectedCats = user.categorie_accesso || [];
    renderCategorieCheckboxes(selectedCats);
    
    // Stagioni selezionate
    renderStagioniCheckboxes(user.stagioni_accesso || []);
    
    // Capabilities verranno caricate quando si va allo step 2
    window._pendingCaps = getUserCapabilities(permessi);
  } else {
    document.getElementById('modalTitle').textContent = 'Nuovo Utente';
    document.getElementById('isActiveGroup').style.display = 'none';
    
    // Password: nascondi status bar, mostra campi
    document.getElementById('passwordStatusBar').style.display = 'none';
    document.getElementById('passwordFields').style.display = 'block';
    
    document.getElementById('userProfilo').value = 'allenatore';
    window._pendingCaps = null;
    renderCategorieCheckboxes([]);
    renderStagioniCheckboxes([]);
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
  const passwordFieldsVisible = document.getElementById('passwordFields').style.display !== 'none';
  const ruolo = document.getElementById('userRuolo').value;
  const is_active = document.getElementById('userIsActive').checked;
  
  // Stagioni selezionate
  const stagCheckboxes = document.querySelectorAll('#stagioniCheckboxes input[type="checkbox"]:checked');
  const stagioni_accesso = Array.from(stagCheckboxes).map(cb => cb.value);
  
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
    const body = { nome, cognome, email, ruolo, categorie_accesso, stagioni_accesso, workspace_id };
    if (passwordFieldsVisible && password) body.password = password;
    if (isEdit) body.is_active = is_active;
    
    // Permessi nel nuovo formato {profilo, capabilities}
    const profilo = document.getElementById('userProfilo').value;
    body.permessi = { profilo, capabilities: getCapabilitiesFromUI() };
    
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
