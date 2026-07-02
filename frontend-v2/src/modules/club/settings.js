import { apiFetch } from '../../services/api';
import { showLoading, hideLoading } from '../../utils/ui';

export default async function loadSettings() {
  const c = document.getElementById('pageContent');
  
  if (!window.YFM.isAdmin()) {
    c.innerHTML = '<div class="error-box">Accesso riservato agli amministratori.</div>';
    return;
  }
  
  const s = window.YFM.getSquadra();
  
  c.innerHTML = `
    <h1 class="page-title">Impostazioni ${window.YFM.getSquadraName()}</h1>
    <p class="page-subtitle">Gestione categoria e staff</p>
    
    <div class="card" style="margin-bottom:20px;">
      <h3 class="section-title">⚙️ Modifica Categoria</h3>
      <div class="form-grid">
        <div class="form-group"><label>Nome Squadra</label><input id="sN" value="${s.nome || ''}"></div>
        <div class="form-group"><label>Categoria</label><input id="sC" value="${s.categoria || ''}"></div>
        <div class="form-group"><label>Allenatore</label><input id="sA" value="${s.allenatore || ''}"></div>
        <div class="form-group"><label>1° Dirigente</label><input id="sD" value="${s.dirigente || ''}"></div>
        <div class="form-group"><label>2° Dirigente</label><input id="sD2" value="${s.dirigente2 || ''}"></div>
        <div class="form-group"><label>Prep. Atletico</label><input id="sP" value="${s.preparatore_atletico || ''}"></div>
        <div class="form-group"><label>All. Portieri</label><input id="sAP" value="${s.allenatore_portieri || ''}"></div>
      </div>
      <div style="display:flex;gap:12px;margin-top:16px;">
        <button class="btn btn-primary" id="btnSave">💾 Salva</button>
        <button class="btn btn-danger" id="btnDel" style="background:#E74C3C;color:white;">🗑️ Elimina</button>
      </div>
    </div>
    
    <div class="card">
      <h3 class="section-title">➕ Nuova Categoria</h3>
      <div class="form-grid">
        <div class="form-group"><label>Nome</label><input id="nN" placeholder="es. Under 15 Regionale"></div>
        <div class="form-group"><label>Categoria</label><input id="nC" placeholder="es. Under 15"></div>
        <div class="form-group"><label>Allenatore</label><input id="nA"></div>
        <div class="form-group"><label>1° Dirigente</label><input id="nD"></div>
        <div class="form-group"><label>2° Dirigente</label><input id="nD2"></div>
        <div class="form-group"><label>Prep. Atletico</label><input id="nP"></div>
        <div class="form-group"><label>All. Portieri</label><input id="nAP"></div>
      </div>
      <button class="btn btn-primary" id="btnNew" style="margin-top:16px;">➕ Crea</button>
    </div>
  `;

  document.getElementById('btnSave').addEventListener('click', async () => {
    const d = {
      nome: document.getElementById('sN').value,
      categoria: document.getElementById('sC').value,
      allenatore: document.getElementById('sA').value,
      dirigente: document.getElementById('sD').value,
      dirigente2: document.getElementById('sD2').value,
      preparatore_atletico: document.getElementById('sP').value,
      allenatore_portieri: document.getElementById('sAP').value
    };
    showLoading();
    await apiFetch('/squadre/' + window.YFM.squadraId, { method: 'PUT', body: JSON.stringify(d) });
    hideLoading();
    alert('✅ Aggiornato!');
    // Ricarica le squadre per aggiornare il dropdown
    const { loadSquadre } = await import('../team/squadre.js');
    await loadSquadre();
    loadSettings();
  });

  document.getElementById('btnDel').addEventListener('click', async () => {
    if (!confirm('⚠️ Eliminare ' + window.YFM.getSquadraName() + '?')) return;
    if (!confirm('Sei SICURO?')) return;
    showLoading();
    await apiFetch('/squadre/' + window.YFM.squadraId, { method: 'DELETE' });
    const { loadSquadre } = await import('../team/squadre.js');
    await loadSquadre();
    hideLoading();
    if (window.YFM.allSquadre.length > 0) {
      window.YFM.squadraId = window.YFM.allSquadre[0].id;
      window.YFM.navigateTo('dashboard');
    } else {
      alert('Tutte le categorie eliminate. Creane una nuova.');
    }
  });

  document.getElementById('btnNew').addEventListener('click', async () => {
    const d = {
      nome: document.getElementById('nN').value,
      categoria: document.getElementById('nC').value,
      allenatore: document.getElementById('nA').value,
      dirigente: document.getElementById('nD').value,
      dirigente2: document.getElementById('nD2').value,
      preparatore_atletico: document.getElementById('nP').value,
      allenatore_portieri: document.getElementById('nAP').value
    };
    showLoading();
    await apiFetch('/stagioni/22222222-2222-2222-2222-222222222222/squadre', { method: 'POST', body: JSON.stringify(d) });
    const { loadSquadre } = await import('../team/squadre.js');
    await loadSquadre();
    hideLoading();
    alert('✅ Creata!');
    loadSettings();
  });
}
