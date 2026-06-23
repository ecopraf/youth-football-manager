import { apiFetch } from '../../services/api';
import { showLoading, hideLoading } from '../../utils/ui';

let tokens = [];
let squadre = [];

export default async function loadGuestLinks() {
  const c = document.getElementById('pageContent');
  
  if (!window.YFM.isAdmin()) {
    c.innerHTML = '<div class="error-box">Accesso riservato agli amministratori</div>';
    return;
  }

  c.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;">
      <h1 class="page-title">🔗 Link di Accesso Guest</h1>
      <button class="btn btn-primary" id="btnCreateLink">+ Crea Link</button>
    </div>
    
    <div class="card" style="margin-bottom:24px;background:#f8f9fa;">
      <h3 style="margin-bottom:12px;">ℹ️ Come funziona</h3>
      <p style="color:#666;margin:0;line-height:1.6;">
        I link guest permettono ad <strong>atleti</strong> e <strong>genitori</strong> di accedere 
        in sola lettura a dashboard e calendario senza bisogno di account.<br>
        Crea un link, condividilo e potranno vedere le informazioni della categoria selezionata.
      </p>
    </div>
    
    <div class="card">
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="border-bottom:2px solid #eee;">
            <th style="text-align:left;padding:12px;">Tipo</th>
            <th style="text-align:left;padding:12px;">Creato da</th>
            <th style="text-align:left;padding:12px;">Categorie</th>
            <th style="text-align:left;padding:12px;">Scadenza</th>
            <th style="text-align:left;padding:12px;">Link</th>
            <th style="text-align:right;padding:12px;">Azioni</th>
          </tr>
        </thead>
        <tbody id="linksTableBody"></tbody>
      </table>
    </div>
    
    <!-- Modal Crea Link -->
    <div id="linkModal" class="modal" style="display:none;">
      <div class="modal-content">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
          <h2>Crea Link di Accesso</h2>
          <span class="modal-close" onclick="document.getElementById('linkModal').style.display='none'">&times;</span>
        </div>
        
        <form id="linkForm">
          <div class="form-group">
            <label>Tipo di accesso *</label>
            <select id="linkTipo" required>
              <option value="atleta">🏃 Atleta</option>
              <option value="genitore">👨‍👩‍👧 Genitore</option>
            </select>
          </div>
          
          <div class="form-group">
            <label>Categorie Accessibili *</label>
            <select id="linkSquadre" multiple required style="height:120px;">
            </select>
            <small style="color:#666;">Usa Ctrl/Cmd per selezionare più categorie</small>
          </div>
          
          <div class="form-group">
            <label>Scadenza (giorni)</label>
            <select id="linkScadenza">
              <option value="">Nessuna scadenza</option>
              <option value="7">7 giorni</option>
              <option value="30">30 giorni</option>
              <option value="90">90 giorni</option>
              <option value="365">1 anno</option>
            </select>
          </div>
          
          <div style="display:flex;gap:12px;margin-top:20px;">
            <button type="submit" class="btn btn-primary">Crea Link</button>
            <button type="button" class="btn btn-secondary" onclick="document.getElementById('linkModal').style.display='none'">Annulla</button>
          </div>
        </form>
      </div>
    </div>
    
    <!-- Modal Link Creato -->
    <div id="linkCreatedModal" class="modal" style="display:none;">
      <div class="modal-content" style="max-width:500px;">
        <div style="text-align:center;">
          <p style="font-size:48px;">✅</p>
          <h2 style="margin-bottom:16px;">Link Creato!</h2>
          <p style="color:#666;margin-bottom:20px;">Copia il link e condividilo con l'atleta/genitore</p>
          
          <div style="background:#f5f5f5;padding:16px;border-radius:8px;margin-bottom:20px;">
            <input type="text" id="createdLink" readonly style="width:100%;padding:12px;border:1px solid #ddd;border-radius:4px;font-size:14px;">
          </div>
          
          <div style="display:flex;gap:12px;justify-content:center;">
            <button class="btn btn-primary" onclick="copyLink()">📋 Copia Link</button>
            <button class="btn btn-secondary" onclick="document.getElementById('linkCreatedModal').style.display='none'">Chiudi</button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Carica dati
  await loadData();
  
  // Event listeners
  document.getElementById('btnCreateLink').addEventListener('click', openCreateModal);
  document.getElementById('linkForm').addEventListener('submit', handleCreate);
}

async function loadData() {
  try {
    const [tokensRes, squadreRes] = await Promise.all([
      apiFetch('/auth/guest-links'),
      apiFetch('/stagioni/' + window.YFM.stagioneId + '/squadre').catch(() => [])
    ]);
    
    tokens = tokensRes.tokens || [];
    squadre = squadreRes || [];
    
    renderTokens();
    populateSquadreSelect();
  } catch (err) {
    document.getElementById('pageContent').innerHTML = `<div class="error-box">Errore: ${err.message}</div>`;
  }
}

function renderTokens() {
  const tbody = document.getElementById('linksTableBody');
  
  if (tokens.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:#999;">Nessun link creato</td></tr>';
    return;
  }
  
  const now = new Date();
  
  tbody.innerHTML = tokens.map(t => {
    const isExpired = t.scadenza && new Date(t.scadenza) < now;
    const squadreText = t.squadre_accesso && t.squadre_accesso.length > 0
      ? t.squadre_accesso.map(id => squadre.find(s => s.id === id)?.nome || id).join(', ')
      : 'Tutte';
    const createdBy = t.utente ? `${t.utente.nome} ${t.utente.cognome}` : 'Admin';
    
    return `
      <tr style="border-bottom:1px solid #eee;${isExpired ? 'opacity:0.5;' : ''}">
        <td style="padding:12px;">
          <span class="badge badge-${t.tipo === 'atleta' ? 'blue' : 'green'}">
            ${t.tipo === 'atleta' ? '🏃 Atleta' : '👨‍👩‍👧 Genitore'}
          </span>
          ${isExpired ? '<span class="badge badge-red" style="margin-left:4px;">Scaduto</span>' : ''}
        </td>
        <td style="padding:12px;color:#666;">${createdBy}</td>
        <td style="padding:12px;color:#666;font-size:13px;">${squadreText}</td>
        <td style="padding:12px;color:#666;">
          ${t.scadenza ? new Date(t.scadenza).toLocaleDateString('it-IT') : 'Mai'}
        </td>
        <td style="padding:12px;">
          <button class="btn btn-small" onclick="copyToClipboard('${window.location.origin}/guest/${t.token}')">📋 Copia</button>
        </td>
        <td style="padding:12px;text-align:right;">
          <button class="btn btn-small btn-danger" onclick="window.revokeLink('${t.token}')">🗑️ Revoca</button>
        </td>
      </tr>
    `;
  }).join('');
  
  window.revokeLink = async (token) => {
    if (confirm('Sei sicuro di voler revocare questo link?')) {
      try {
        await apiFetch(`/auth/guest-link/${token}`, { method: 'DELETE' });
        await loadData();
      } catch (err) {
        alert('Errore: ' + err.message);
      }
    }
  };
}

function populateSquadreSelect() {
  const select = document.getElementById('linkSquadre');
  select.innerHTML = squadre.map(s => `<option value="${s.id}">${s.nome}</option>`).join('');
}

function openCreateModal() {
  document.getElementById('linkForm').reset();
  document.getElementById('linkModal').style.display = 'block';
}

async function handleCreate(e) {
  e.preventDefault();
  
  const tipo = document.getElementById('linkTipo').value;
  const scadenza_giorni = parseInt(document.getElementById('linkScadenza').value) || null;
  
  const squadreSelect = document.getElementById('linkSquadre');
  const squadre_accesso = Array.from(squadreSelect.selectedOptions).map(opt => opt.value);
  
  if (squadre_accesso.length === 0) {
    alert('Seleziona almeno una categoria');
    return;
  }
  
  showLoading('Creazione link...');
  
  try {
    const result = await apiFetch('/auth/guest-link', {
      method: 'POST',
      body: JSON.stringify({ tipo, squadre_accesso, scadenza_giorni })
    });
    
    hideLoading();
    document.getElementById('linkModal').style.display = 'none';
    document.getElementById('createdLink').value = result.link;
    document.getElementById('linkCreatedModal').style.display = 'block';
    
    await loadData();
  } catch (err) {
    hideLoading();
    alert('Errore: ' + err.message);
  }
}

function copyLink() {
  const input = document.getElementById('createdLink');
  input.select();
  document.execCommand('copy');
  alert('Link copiato!');
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    alert('Link copiato!');
  }).catch(() => {
    prompt('Copia questo link:', text);
  });
}
