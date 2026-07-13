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
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px;">
      <h1 class="page-title">👥 Gestione Utenti</h1>
      <button class="btn btn-primary" id="btnAddUser" data-help="users.crea">+ Nuovo Utente</button>
    </div>
    
    <!-- Filtri -->
    <div class="card" style="padding:12px 16px;margin-bottom:16px;">
      <div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;">
        <input type="text" id="filterSearch" placeholder="🔍 Cerca nome o email..." style="flex:1;min-width:180px;padding:8px 12px;border:1px solid #ddd;border-radius:8px;font-size:13px;">
        <select id="filterRuolo" style="padding:8px 12px;border:1px solid #ddd;border-radius:8px;font-size:13px;">
          <option value="">Tutti i ruoli</option>
          <option value="admin">Admin</option>
          <option value="allenatore">Allenatore</option>
          <option value="vice_allenatore">Vice Allenatore</option>
          <option value="dirigente">Dirigente</option>
          <option value="preparatore">Preparatore</option>
          <option value="segreteria">Segreteria</option>
          <option value="osservatore">Osservatore</option>
        </select>
        <select id="filterStato" style="padding:8px 12px;border:1px solid #ddd;border-radius:8px;font-size:13px;">
          <option value="">Tutti gli stati</option>
          <option value="attivi">✅ Attivi</option>
          <option value="sospesi">🔒 Sospesi</option>
        </select>
      </div>
    </div>
    
    <!-- Lista utenti card -->
    <div id="usersCount" style="font-size:13px;color:#666;margin-bottom:12px;"></div>
    <div id="usersGrid" class="users-grid"></div>
    
    <!-- Modal Wizard 3 Step -->
    <div id="userModal" class="modal-overlay" style="display:none;">
      <div class="modal-content" style="max-width:580px;max-height:90vh;overflow-y:auto;width:95%;margin:16px;">
        <div class="modal-header">
          <h2 id="modalTitle">Nuovo Utente</h2>
          <button class="modal-close-btn" id="closeModalBtn">&times;</button>
        </div>
        
        <div class="modal-body">
          <!-- Progress bar 3 step -->
          <div style="display:flex;align-items:center;gap:0;margin-bottom:28px;">
            <div id="step1Dot" class="wiz-dot wiz-active">1</div>
            <div class="wiz-line"><div id="prog12" class="wiz-line-fill"></div></div>
            <div id="step2Dot" class="wiz-dot">2</div>
            <div class="wiz-line"><div id="prog23" class="wiz-line-fill"></div></div>
            <div id="step3Dot" class="wiz-dot">3</div>
          </div>
          <div style="display:flex;justify-content:space-between;margin-top:-20px;margin-bottom:20px;font-size:11px;color:#888;">
            <span>Dati Account</span><span>Permessi</span><span>Riepilogo</span>
          </div>
          
          <form id="userForm">
            <!-- STEP 1: Dati Account -->
            <div id="wizardStep1">
              <!-- Collega a staff -->
              <div class="form-group" id="staffLinkGroup" style="margin-bottom:16px;">
                <label>👤 Collega a membro staff <span style="color:#999;font-size:11px;">(opzionale)</span></label>
                <select id="staffLink" style="width:100%;">
                  <option value="">— Inserisci manualmente —</option>
                </select>
              </div>
              
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;" class="user-modal-grid">
                <div class="form-group"><label>📝 Nome *</label><input type="text" id="userNome" required></div>
                <div class="form-group"><label>📝 Cognome</label><input type="text" id="userCognome"></div>
              </div>
              <div class="form-group" style="margin-bottom:16px;"><label>✉️ Email *</label><input type="email" id="userEmail" required></div>
              
              <!-- Password section -->
              <div id="passwordSection">
                <div id="passwordStatusBar" style="display:none;padding:10px 14px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;margin-bottom:12px;align-items:center;justify-content:space-between;">
                  <span style="font-size:13px;color:#16a34a;font-weight:500;">🔒 Password impostata</span>
                  <button type="button" id="btnTogglePassword" class="btn btn-small btn-secondary" style="font-size:12px;padding:4px 10px;">Cambia</button>
                </div>
                <div id="passwordFields">
                  <div class="form-group" style="margin-bottom:8px;"><label>🔒 Password *</label><input type="password" id="userPassword" placeholder="Min. 6 caratteri" autocomplete="new-password"></div>
                  <div class="form-group"><label>🔒 Conferma password *</label><input type="password" id="userPasswordConfirm" placeholder="Ripeti la password" autocomplete="new-password"></div>
                </div>
              </div>
              
              <div style="display:flex;justify-content:flex-end;margin-top:24px;">
                <button type="button" class="btn btn-primary" id="btnToStep2">Avanti →</button>
              </div>
            </div>
            
            <!-- STEP 2: Permessi -->
            <div id="wizardStep2" style="display:none;">
              <input type="hidden" id="userRuolo" value="staff">
              
              <div class="form-group" style="margin-bottom:16px;">
                <label>👤 Profilo *</label>
                <select id="userProfilo">
                  ${Object.entries(PROFILI).filter(([k]) => k !== 'admin' || window.YFM.getUser()?.is_superadmin).map(([k, v]) => `<option value="${k}">${v.icon} ${v.label}</option>`).join('')}
                </select>
              </div>
              
              <div class="form-group" id="workspaceGroup" style="display:none;margin-bottom:16px;">
                <label>🏢 Workspace *</label>
                <select id="userWorkspace"></select>
              </div>
              
              <!-- Stagioni + Categorie affiancate -->
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;align-items:start;" class="user-modal-grid-keep">
                <div class="form-group" id="stagioniGroup">
                  <label>📅 Stagioni</label>
                  <div id="stagioniCheckboxes" style="display:flex;flex-direction:column;gap:6px;margin-top:8px;align-items:flex-start;"></div>
                  <small style="color:#888;margin-top:6px;display:block;font-size:11px;">ℹ️ Nessuna = solo attiva</small>
                </div>
                <div class="form-group" id="categorieGroup">
                  <label>🏷️ Categorie</label>
                  <div id="categorieCheckboxes" style="display:flex;flex-direction:column;gap:6px;margin-top:8px;align-items:flex-start;"></div>
                  <small style="color:#888;margin-top:6px;display:block;font-size:11px;">ℹ️ Nessuna = tutte</small>
                </div>
              </div>
              
              <!-- Capabilities -->
              <div id="capabilitiesSection" style="padding:14px;background:#f8f9ff;border-radius:10px;border:1px solid #e0e4f0;">
                <label style="font-weight:600;font-size:13px;color:#333;margin-bottom:10px;display:block;">🛠️ Capabilities</label>
                <div id="capabilitiesGrid" style="display:grid;gap:8px;"></div>
              </div>
              
              <div id="isActiveGroup" style="display:none;margin-top:16px;">
                <label style="display:inline-flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;font-weight:500;color:#666;"><input type="checkbox" id="userIsActive" checked> Account attivo</label>
              </div>
              
              <input type="hidden" id="userId">
              
              <div style="display:flex;justify-content:space-between;margin-top:24px;">
                <button type="button" class="btn btn-secondary" id="btnBackTo1">← Indietro</button>
                <button type="button" class="btn btn-primary" id="btnToStep3">Avanti →</button>
              </div>
            </div>
            
            <!-- STEP 3: Riepilogo -->
            <div id="wizardStep3" style="display:none;">
              <p style="font-size:13px;color:#27AE60;font-weight:600;margin-bottom:16px;">✅ Verifica i dati prima di confermare</p>
              <div id="summaryContent" style="display:flex;flex-direction:column;gap:12px;"></div>
              
              <div style="display:flex;justify-content:space-between;margin-top:24px;">
                <button type="button" class="btn btn-secondary" id="btnBackTo2">← Indietro</button>
                <button type="submit" class="btn btn-primary" style="background:#27AE60;">💾 Salva</button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
    
    <style>
      .wiz-dot { width:32px;height:32px;border-radius:50%;background:#e0e4f0;color:#999;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;transition:all .3s;flex-shrink:0; }
      .wiz-dot.wiz-active { background:#667eea;color:white; }
      .wiz-dot.wiz-done { background:#27AE60;color:white; }
      .wiz-line { flex:1;height:3px;background:#e0e4f0;border-radius:2px;position:relative; }
      .wiz-line-fill { height:100%;background:#27AE60;border-radius:2px;width:0%;transition:width .3s; }
      .cap-row { display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:white;border-radius:8px;border:1px solid #eee; }
      .cap-row .cap-info { display:flex;align-items:center;gap:8px;font-size:12px; }
      .cap-row .cap-icon { font-size:14px; }
      .cap-row .cap-label { font-weight:500;color:#333; }
      .cap-toggle { display:flex;align-items:center;gap:4px; }
      .cap-toggle button { padding:3px 8px;border:1px solid #ddd;border-radius:6px;font-size:11px;cursor:pointer;background:white;transition:all 0.15s; }
      .cap-toggle button.active-off { background:#f1f5f9;color:#999;border-color:#e2e8f0; }
      .cap-toggle button.active-read { background:#3b82f6;color:white;border-color:#3b82f6; }
      .cap-toggle button.active-write { background:#22c55e;color:white;border-color:#22c55e; }
      .cat-checkbox { display:flex;align-items:center;gap:6px;padding:4px 0;font-size:13px;cursor:pointer; }
      .cat-checkbox input { margin:0; }
      .users-grid { display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:12px; }
      .user-card { background:white;border-radius:12px;padding:16px;border:1px solid #eee;transition:box-shadow .2s; }
      .user-card:hover { box-shadow:0 4px 12px rgba(0,0,0,0.08); }
      .user-card.inactive { opacity:0.6; }
      .uc-top { display:flex;align-items:center;gap:12px; }
      .uc-avatar { width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:white;flex-shrink:0; }
      .uc-info { flex:1;min-width:0; }
      .uc-name { font-size:14px;font-weight:600;color:#1a1a2e;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
      .uc-email { font-size:12px;color:#888;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
      .uc-actions { display:flex;gap:4px;flex-shrink:0; }
      .uc-actions button { width:32px;height:32px;border:1px solid #eee;border-radius:8px;background:white;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;transition:background .15s; }
      .uc-actions button:hover { background:#f5f5f5; }
      .uc-meta { display:flex;flex-wrap:wrap;gap:6px;margin-top:10px;align-items:center; }
      .uc-badge { padding:3px 8px;border-radius:6px;font-size:11px;font-weight:600; }
      .uc-badge-profilo { background:#eef2ff;color:#4338ca;border:1px solid #c7d2fe; }
      .uc-badge-cat { background:#f0fdf4;color:#166534;border:1px solid #bbf7d0; }
      .uc-badge-active { background:#E8F8F0;color:#27AE60; }
      .uc-badge-suspended { background:#FDEDEE;color:#E74C3C; }
      .uc-badge-you { background:#667eea;color:white; }
      @media(max-width:500px) {
        .user-modal-grid { grid-template-columns:1fr !important; }
        .user-modal-grid-keep { grid-template-columns:1fr 1fr !important; }
        .users-grid { grid-template-columns:1fr;gap:10px; }
        .user-card { padding:14px; }
        .cap-row { padding:6px 10px; }
        .cap-toggle button { padding:4px 8px;font-size:12px; }
      }
    </style>
  `;

  await loadData();
  
  document.getElementById('btnAddUser')?.addEventListener('click', () => openModal());
  document.getElementById('closeModalBtn')?.addEventListener('click', closeModal);
  document.getElementById('userForm')?.addEventListener('submit', handleSubmit);
  document.getElementById('btnToStep2')?.addEventListener('click', goToStep2);
  document.getElementById('btnToStep3')?.addEventListener('click', goToStep3);
  document.getElementById('btnBackTo1')?.addEventListener('click', goToStep1);
  document.getElementById('btnBackTo2')?.addEventListener('click', goToStep2FromStep3);
  document.getElementById('btnTogglePassword')?.addEventListener('click', togglePasswordFields);
  
  document.getElementById('userProfilo')?.addEventListener('change', onProfiloChange);
  document.getElementById('userWorkspace')?.addEventListener('change', onWorkspaceChange);
  document.getElementById('staffLink')?.addEventListener('change', onStaffSelect);
  
  // Reset bordo rosso al focus
  document.querySelectorAll('#userForm input, #userForm select').forEach(el => {
    el.addEventListener('focus', () => { el.style.borderColor = '#ddd'; });
  });
  
  // Filtri
  document.getElementById('filterSearch')?.addEventListener('input', applyFilters);
  document.getElementById('filterRuolo')?.addEventListener('change', applyFilters);
  document.getElementById('filterStato')?.addEventListener('change', applyFilters);
}

function closeModal() {
  document.getElementById('userModal').style.display = 'none';
}

function setWizardStep(step) {
  document.getElementById('wizardStep1').style.display = step === 1 ? 'block' : 'none';
  document.getElementById('wizardStep2').style.display = step === 2 ? 'block' : 'none';
  document.getElementById('wizardStep3').style.display = step === 3 ? 'block' : 'none';
  // Dots
  const d1 = document.getElementById('step1Dot');
  const d2 = document.getElementById('step2Dot');
  const d3 = document.getElementById('step3Dot');
  d1.className = 'wiz-dot ' + (step > 1 ? 'wiz-done' : step === 1 ? 'wiz-active' : '');
  d2.className = 'wiz-dot ' + (step > 2 ? 'wiz-done' : step === 2 ? 'wiz-active' : '');
  d3.className = 'wiz-dot ' + (step === 3 ? 'wiz-active' : '');
  // Lines
  document.getElementById('prog12').style.width = step > 1 ? '100%' : '0%';
  document.getElementById('prog23').style.width = step > 2 ? '100%' : '0%';
}

function goToStep1() {
  setWizardStep(1);
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
  if (!nome || !email) {
    if (!nome) document.getElementById('userNome').style.borderColor = '#E74C3C';
    if (!email) document.getElementById('userEmail').style.borderColor = '#E74C3C';
    return;
  }
  
  const isEdit = !!document.getElementById('userId').value;
  const password = document.getElementById('userPassword').value;
  const passwordConfirm = document.getElementById('userPasswordConfirm').value;
  const passwordFieldsVisible = document.getElementById('passwordFields').style.display !== 'none';
  
  if (passwordFieldsVisible && (password || !isEdit)) {
    if (password.length < 6) { document.getElementById('userPassword').style.borderColor = '#E74C3C'; return; }
    if (password !== passwordConfirm) { document.getElementById('userPasswordConfirm').style.borderColor = '#E74C3C'; return; }
  }
  
  setWizardStep(2);
  renderCapabilitiesGrid();
  onProfiloChange();
}

function goToStep2FromStep3() {
  setWizardStep(2);
}

function goToStep3() {
  setWizardStep(3);
  renderSummary();
}

function renderSummary() {
  const nome = document.getElementById('userNome').value.trim();
  const cognome = document.getElementById('userCognome').value.trim();
  const email = document.getElementById('userEmail').value.trim();
  const profilo = document.getElementById('userProfilo').value;
  const profiloData = PROFILI[profilo];
  const profiloLabel = profiloData ? profiloData.icon + ' ' + profiloData.label : profilo;
  
  const selCats = [...document.querySelectorAll('#categorieCheckboxes input:checked')].map(cb => {
    const cat = categorie.find(c => c.id === cb.value);
    return cat?.nome || '?';
  });
  const selStag = [...document.querySelectorAll('#stagioniCheckboxes input:checked')].map(cb => {
    const s = stagioni.find(st => st.id === cb.value);
    return s?.nome || '?';
  });
  const caps = getCapabilitiesFromUI();
  const capsLabels = CAPABILITIES.filter(c => caps[c.id]).map(c => c.icon + ' ' + c.label + ' (' + caps[c.id] + ')');
  
  const container = document.getElementById('summaryContent');
  container.innerHTML = `
    <div style="padding:14px;background:#f8f9fa;border-radius:10px;border:1px solid #eee;">
      <div style="font-size:12px;font-weight:700;color:#667eea;margin-bottom:8px;">👤 Dati Account</div>
      <div style="display:grid;grid-template-columns:auto 1fr;gap:4px 12px;font-size:13px;">
        <span style="color:#888;">Nome</span><span style="font-weight:500;">${nome} ${cognome}</span>
        <span style="color:#888;">Email</span><span>${email}</span>
      </div>
    </div>
    <div style="padding:14px;background:#f8f9fa;border-radius:10px;border:1px solid #eee;">
      <div style="font-size:12px;font-weight:700;color:#667eea;margin-bottom:8px;">🔑 Permessi</div>
      <div style="display:grid;grid-template-columns:auto 1fr;gap:4px 12px;font-size:13px;">
        <span style="color:#888;">Profilo</span><span style="font-weight:500;">${profiloLabel}</span>
        <span style="color:#888;">Stagioni</span><span>${selStag.length ? selStag.join(', ') : 'Solo attiva'}</span>
        <span style="color:#888;">Categorie</span><span>${selCats.length ? selCats.join(', ') : 'Tutte'}</span>
      </div>
    </div>
    <div style="padding:14px;background:#f8f9fa;border-radius:10px;border:1px solid #eee;">
      <div style="font-size:12px;font-weight:700;color:#667eea;margin-bottom:8px;">🛠️ Capabilities</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;">
        ${capsLabels.length ? capsLabels.map(l => `<span style="padding:4px 10px;background:white;border:1px solid #e0e4f0;border-radius:6px;font-size:12px;">${l}</span>`).join('') : '<span style="color:#999;font-size:12px;">Nessuna capability assegnata</span>'}
      </div>
    </div>
  `;
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
    // Merge con default profilo per capabilities aggiunte dopo la creazione utente
    const profilo = document.getElementById('userProfilo')?.value;
    const profiloDefaults = (profilo && profilo !== 'custom' && PROFILI[profilo]) ? PROFILI[profilo].capabilities : {};
    CAPABILITIES.forEach(cap => {
      const val = window._pendingCaps[cap.id] !== undefined ? window._pendingCaps[cap.id] : (profiloDefaults[cap.id] || '');
      setCapabilityValue(cap.id, val || '');
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
      ${s.nome}
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
    
    const wsId = window.YFM.activeWorkspaceId || window.YFM.workspaceInfo?.id;
    
    // Carica tutto in parallelo
    const usersUrl = '/auth/users' + (wsId ? `?workspace_id=${wsId}&only_active=false` : '?only_active=false');
    const [catRes, stagRes, staffRes, usersRes] = await Promise.all([
      wsId ? apiFetch(`/workspaces/${wsId}/categorie`).catch(() => []) : [],
      wsId ? apiFetch(`/workspaces/${wsId}/stagioni`).catch(() => []) : [],
      wsId ? apiFetch(`/workspaces/${wsId}/staff`).catch(() => ({ staff: [] })) : [],
      apiFetch(usersUrl)
    ]);
    categorie = catRes;
    stagioni = stagRes;
    staffList = Array.isArray(staffRes) ? staffRes : (staffRes.staff || []);
    users = usersRes.users || [];
    
    hideLoading();
    renderUsers();
  } catch (err) {
    hideLoading();
    document.getElementById('pageContent').innerHTML = `<div class="error-box">Errore: ${err.message}</div>`;
  }
}

function applyFilters() {
  const search = (document.getElementById('filterSearch')?.value || '').toLowerCase();
  const ruoloFilter = document.getElementById('filterRuolo')?.value || '';
  const statoFilter = document.getElementById('filterStato')?.value || '';

  let filtered = users;
  if (search) {
    filtered = filtered.filter(u => 
      (u.nome + ' ' + (u.cognome || '') + ' ' + u.email).toLowerCase().includes(search)
    );
  }
  if (ruoloFilter) {
    filtered = filtered.filter(u => {
      if (ruoloFilter === 'admin') return u.ruolo === 'admin';
      const profilo = u.permessi?.profilo || '';
      return profilo === ruoloFilter;
    });
  }
  if (statoFilter === 'attivi') filtered = filtered.filter(u => u.is_active !== false);
  if (statoFilter === 'sospesi') filtered = filtered.filter(u => u.is_active === false);

  renderUsers(filtered);
}

function renderUsers(filteredUsers) {
  const list = filteredUsers || users;
  const grid = document.getElementById('usersGrid');
  if (!grid) return;
  
  const countEl = document.getElementById('usersCount');
  if (countEl) countEl.textContent = `${list.length} utent${list.length === 1 ? 'e' : 'i'}`;
  
  if (list.length === 0) {
    grid.innerHTML = '<div style="text-align:center;padding:40px;color:#999;">Nessun utente trovato</div>';
    return;
  }

  const avatarColors = ['#667eea','#764ba2','#E74C3C','#F39C12','#27AE60','#3498db','#8e44ad','#e67e22'];
  
  grid.innerHTML = list.map((user, idx) => {
    const isCurrentUser = user.id === window.YFM.getUser()?.id;
    const isActive = user.is_active !== false;
    const initials = ((user.nome?.[0] || '') + (user.cognome?.[0] || '')).toUpperCase() || '?';
    const color = avatarColors[idx % avatarColors.length];
    
    const catAccesso = user.categorie_accesso || [];
    const catNames = catAccesso.length > 0
      ? catAccesso.map(id => categorie.find(c => c.id === id)?.nome || '?')
      : [];
    
    const profiloLabel = getProfiloLabel(user);
    
    return `
      <div class="user-card${!isActive ? ' inactive' : ''}">
        <div class="uc-top">
          <div class="uc-avatar" style="background:${color};">${initials}</div>
          <div class="uc-info">
            <div class="uc-name">${user.nome} ${user.cognome || ''}</div>
            <div class="uc-email">${user.email}</div>
          </div>
          <div class="uc-actions">
            ${!isCurrentUser ? `
              <button onclick="window._editUser('${user.id}')" title="Modifica">✏️</button>
              <button onclick="window._toggleUser('${user.id}')" title="${isActive ? 'Sospendi' : 'Riattiva'}">${isActive ? '🔒' : '🔓'}</button>
              <button onclick="window._deleteUser('${user.id}')" title="Elimina">🗑️</button>
            ` : ''}
          </div>
        </div>
        <div class="uc-meta">
          <span class="uc-badge uc-badge-profilo">${profiloLabel}</span>
          ${catNames.map(n => `<span class="uc-badge uc-badge-cat">${n}</span>`).join('')}
          ${!catNames.length ? '<span class="uc-badge uc-badge-cat">Tutte</span>' : ''}
          <span class="uc-badge ${isActive ? 'uc-badge-active' : 'uc-badge-suspended'}">${isActive ? '✅ Attivo' : '🔒 Sospeso'}</span>
          ${isCurrentUser ? '<span class="uc-badge uc-badge-you">Tu</span>' : ''}
          ${user.is_superadmin ? '<span class="uc-badge" style="background:#9b59b6;color:white;">SA</span>' : ''}
        </div>
      </div>
    `;
  }).join('');
  
  window._editUser = (id) => openModal(id);
  window._toggleUser = async (id) => {
    try {
      await apiFetch(`/auth/users/${id}/toggle-active`, { method: 'PUT' });
      await loadData();
    } catch (err) { alert('Errore: ' + err.message); }
  };
  window._deleteUser = async (id) => {
    if (!confirm('ELIMINAZIONE DEFINITIVA: l\'utente verrà rimosso permanentemente dal database. Continuare?')) return;
    try {
      await apiFetch(`/auth/users/${id}?hard=true`, { method: 'DELETE' });
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
