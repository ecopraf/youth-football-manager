import { apiFetch } from '../../services/api';
import { showLoading, hideLoading } from '../../utils/ui';

let users = [];
let squadre = [];

export default async function loadUsers() {
  const c = document.getElementById('pageContent');
  
  if (!window.YFM.isAdmin()) {
    c.innerHTML = '<div class="error-box">Accesso riservato agli amministratori</div>';
    return;
  }

  c.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;">
      <h1 class="page-title">👥 Gestione Utenti</h1>
      <button class="btn btn-primary" id="btnAddUser">+ Nuovo Utente</button>
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
    
    <!-- Modal Crea/Modifica Utente -->
    <div id="userModal" class="modal-overlay" style="display:none;">
      <div class="modal-content">
        <div class="modal-header">
          <h2 id="modalTitle">Nuovo Utente</h2>
          <button class="modal-close-btn" id="closeModalBtn">&times;</button>
        </div>
        
        <form id="userForm">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
            <div class="form-group">
              <label>Nome *</label>
              <input type="text" id="userNome" required>
            </div>
            <div class="form-group">
              <label>Cognome</label>
              <input type="text" id="userCognome">
            </div>
          </div>
          
          <div class="form-group">
            <label>Email *</label>
            <input type="email" id="userEmail" required>
          </div>
          
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
            <div class="form-group">
              <label>Password <span id="passwordRequired"></span></label>
              <input type="password" id="userPassword">
            </div>
            <div class="form-group">
              <label>Ruolo *</label>
              <select id="userRuolo" required>
                <option value="staff">Staff</option>
                <option value="allenatore">Allenatore</option>
                <option value="admin">Amministratore</option>
              </select>
            </div>
          </div>
          
          <div class="form-group">
            <label>Categorie Accessibili</label>
            <select id="userSquadre" multiple style="height:120px;">
              <option value="">Tutte le categorie</option>
            </select>
            <small style="color:#666;">Usa Ctrl/Cmd per selezionare più categorie</small>
          </div>
          
          <div class="form-group" id="isActiveGroup" style="display:none;">
            <label>
              <input type="checkbox" id="userIsActive" checked>
              Account attivo
            </label>
          </div>
          
          <input type="hidden" id="userId">
          
          <div style="display:flex;gap:12px;margin-top:20px;">
            <button type="submit" class="btn btn-primary">Salva</button>
            <button type="button" class="btn btn-secondary" onclick="closeModal()">Annulla</button>
          </div>
        </form>
      </div>
    </div>
  `;

  // Carica utenti e squadre
  await loadData();
  
  // Event listeners con verifica
  const btnAddUser = document.getElementById('btnAddUser');
  const userForm = document.getElementById('userForm');
  const closeBtn = document.getElementById('closeModalBtn');
  
  if (btnAddUser) {
    btnAddUser.addEventListener('click', () => openModal());
  }
  
  if (userForm) {
    userForm.addEventListener('submit', handleSubmit);
  }
  
  if (closeBtn) {
    closeBtn.addEventListener('click', closeModal);
  }
}

function closeModal() {
  document.getElementById('userModal').style.display = 'none';
}

async function loadData() {
  try {
    showLoading('Caricamento...');
    
    // Prova a ottenere le squadre con fallback
    let squadreRes = [];
    try {
      squadreRes = await apiFetch('/squadre');
    } catch (e) {
      try {
        if (window.YFM.stagioneId) {
          squadreRes = await apiFetch('/stagioni/' + window.YFM.stagioneId + '/squadre');
        }
      } catch (e2) {}
    }
    
    const usersRes = await apiFetch('/auth/users');
    users = usersRes.users || [];
    squadre = Array.isArray(squadreRes) ? squadreRes : (squadreRes.data || []);
    
    hideLoading();
    renderUsers();
    populateSquadreSelect();
  } catch (err) {
    hideLoading();
    document.getElementById('pageContent').innerHTML = `<div class="error-box">Errore: ${err.message}</div>`;
  }
}

function renderUsers() {
  const tbody = document.getElementById('usersTableBody');
  if (!tbody) return; // Evita errore se DOM non pronto
  
  if (users.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:#999;">Nessun utente trovato</td></tr>';
    return;
  }
  
  tbody.innerHTML = users.map(user => {
    const isCurrentUser = user.id === window.YFM.getUser()?.id;
    const squadreText = user.squadre_accesso && user.squadre_accesso.length > 0 
      ? user.squadre_accesso.map(id => squadre.find(s => s.id === id)?.nome || id).join(', ')
      : 'Tutte';
    
    return `
      <tr style="border-bottom:1px solid #eee;">
        <td style="padding:12px;">
          <strong>${user.nome} ${user.cognome || ''}</strong>
          ${isCurrentUser ? '<span style="background:#667eea;color:white;padding:2px 6px;border-radius:4px;font-size:11px;margin-left:8px;">Tu</span>' : ''}
        </td>
        <td style="padding:12px;color:#666;">${user.email}</td>
        <td style="padding:12px;">
          <span class="badge badge-${getRoleBadge(user.ruolo)}">${getRoleLabel(user.ruolo)}</span>
          ${user.is_superadmin ? '<span class="badge" style="background:#9b59b6;color:white;margin-left:4px;">Super Admin</span>' : ''}
        </td>
        <td style="padding:12px;color:#666;font-size:13px;">${squadreText}</td>
        <td style="padding:12px;text-align:center;">
          <span class="badge badge-${user.is_active !== false ? 'green' : 'red'}">${user.is_active !== false ? 'Attivo' : 'Disattivo'}</span>
        </td>
        <td style="padding:12px;text-align:right;">
          ${!isCurrentUser ? `
            <button class="btn btn-small" onclick="window.openUserEdit('${user.id}')" style="margin-right:8px;">✏️</button>
            <button class="btn btn-small btn-danger" onclick="window.deleteUser('${user.id}')">🗑️</button>
          ` : ''}
        </td>
      </tr>
    `;
  }).join('');
  
  // Espandi funzioni globali
  window.openUserEdit = (id) => openModal(id);
  window.deleteUser = async (id) => {
    if (confirm('Sei sicuro di voler disattivare questo utente?')) {
      try {
        await apiFetch(`/auth/users/${id}`, { method: 'DELETE' });
        await loadData();
      } catch (err) {
        alert('Errore: ' + err.message);
      }
    }
  };
}

function getRoleBadge(ruolo) {
  const badges = { admin: 'purple', allenatore: 'blue', staff: 'gray' };
  return badges[ruolo] || 'gray';
}

function getRoleLabel(ruolo) {
  const labels = { admin: 'Admin', allenatore: 'Allenatore', staff: 'Staff' };
  return labels[ruolo] || ruolo;
}

function populateSquadreSelect() {
  const select = document.getElementById('userSquadre');
  select.innerHTML = '<option value="">Tutte le categorie</option>' + 
    squadre.map(s => `<option value="${s.id}">${s.nome}</option>`).join('');
}

function openModal(userId = null) {
  const modal = document.getElementById('userModal');
  const form = document.getElementById('userForm');
  const title = document.getElementById('modalTitle');
  const passwordField = document.getElementById('userPassword');
  const isActiveGroup = document.getElementById('isActiveGroup');
  
  form.reset();
  document.getElementById('userId').value = '';
  passwordField.value = '';
  passwordField.required = false;
  
  if (userId) {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    
    title.textContent = 'Modifica Utente';
    isActiveGroup.style.display = 'block';
    
    document.getElementById('userNome').value = user.nome || '';
    document.getElementById('userCognome').value = user.cognome || '';
    document.getElementById('userEmail').value = user.email || '';
    document.getElementById('userRuolo').value = user.ruolo || 'staff';
    document.getElementById('userIsActive').checked = user.is_active !== false;
    document.getElementById('userId').value = user.id;
    
    // Seleziona squadre
    if (user.squadre_accesso && user.squadre_accesso.length > 0) {
      Array.from(document.getElementById('userSquadre').options).forEach(opt => {
        opt.selected = user.squadre_accesso.includes(opt.value);
      });
    }
  } else {
    title.textContent = 'Nuovo Utente';
    isActiveGroup.style.display = 'none';
    passwordField.required = true;
  }
  
  modal.style.display = 'flex';
}

// Esporta globalmente per onclick
window.openUserEdit = (id) => openModal(id);
window.deleteUser = async (id) => {
  if (confirm('Sei sicuro di voler disattivare questo utente?')) {
    try {
      await apiFetch(`/auth/users/${id}`, { method: 'DELETE' });
      await loadData();
    } catch (err) {
      alert('Errore: ' + err.message);
    }
  }
};

async function handleSubmit(e) {
  e.preventDefault();
  
  const userId = document.getElementById('userId').value;
  const isEdit = !!userId;
  
  const nome = document.getElementById('userNome').value;
  const cognome = document.getElementById('userCognome').value;
  const email = document.getElementById('userEmail').value;
  const password = document.getElementById('userPassword').value;
  const ruolo = document.getElementById('userRuolo').value;
  const is_active = document.getElementById('userIsActive').checked;
  
  // Ottieni squadre selezionate
  const squadreSelect = document.getElementById('userSquadre');
  const squadre_accesso = Array.from(squadreSelect.selectedOptions)
    .filter(opt => opt.value)
    .map(opt => opt.value);
  
  showLoading('Salvataggio...');
  
  try {
    const body = { nome, cognome, email, ruolo, squadre_accesso };
    if (password) body.password = password;
    if (isEdit) body.is_active = is_active;
    
    if (isEdit) {
      await apiFetch(`/auth/users/${userId}`, { method: 'PUT', body: JSON.stringify(body) });
    } else {
      await apiFetch('/auth/users', { method: 'POST', body: JSON.stringify({ ...body }) });
    }
    
    hideLoading();
    document.getElementById('userModal').style.display = 'none';
    // Ricarica solo i dati senza ricaricare la pagina
    await loadData();
  } catch (err) {
    hideLoading();
    alert('Errore: ' + err.message);
  }
}
