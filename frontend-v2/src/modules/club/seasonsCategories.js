import { apiFetch } from '../../services/api';
import { showLoading, hideLoading } from '../../utils/ui';

let seasons = [];
let categories = [];
let teams = [];

export default async function loadSeasonsCategories() {
  const c = document.getElementById('pageContent');
  if (!window.YFM.isAdmin()) {
    c.innerHTML = '<div class="error-box">Accesso riservato agli amministratori</div>';
    return;
  }

  c.innerHTML = `
    <h1 class="page-title">📅 Stagioni & Categorie</h1>
    <div id="scContent"><div class="loading"><div class="spinner"></div>Caricamento...</div></div>
  `;

  await loadData();
  render();
}

async function loadData() {
  const wsId = window.YFM.activeWorkspaceId || window.YFM.workspaceInfo?.id;
  if (!wsId) return;
  try {
    [seasons, categories] = await Promise.all([
      apiFetch(`/workspaces/${wsId}/stagioni`),
      apiFetch(`/workspaces/${wsId}/categorie`)
    ]);
    const activeSeason = seasons.find(s => s.attiva);
    if (activeSeason) {
      teams = await apiFetch(`/stagioni/${activeSeason.id}/squadre`);
      // Load counts for each team
      await Promise.all(teams.map(async t => {
        try {
          const players = await apiFetch(`/squadre/${t.id}/calciatori`);
          t._playerCount = (players || []).length;
        } catch { t._playerCount = 0; }
        try {
          const staff = await apiFetch(`/squadre/${t.id}/staff-completo`);
          t._staffCount = (staff || []).length;
        } catch { t._staffCount = 0; }
      }));
    } else {
      teams = [];
    }
  } catch (e) {
    seasons = []; categories = []; teams = [];
  }
}

function render() {
  const container = document.getElementById('scContent');
  if (!container) return;
  const activeSeason = seasons.find(s => s.attiva);
  const wsName = window.YFM.workspaceInfo?.nome || '';

  container.innerHTML = `
    <!-- STAGIONI -->
    <div class="card" style="margin-bottom:24px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
        <h3 style="margin:0;font-size:16px;color:#334155;">📅 Stagioni</h3>
        <button class="btn btn-primary btn-small" id="btnAddSeason">+ Nuova Stagione</button>
      </div>
      ${seasons.length === 0 ? '<p style="color:#999;text-align:center;padding:20px;">Nessuna stagione creata</p>' : `
      <div style="display:flex;flex-direction:column;gap:8px;">
        ${seasons.map(s => `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:${s.attiva ? '#f0fdf4' : '#f8f9fa'};border-radius:10px;border:1px solid ${s.attiva ? '#86efac' : '#e5e7eb'};">
            <div>
              <span style="font-weight:600;">${s.nome}</span>
              ${s.attiva ? '<span style="margin-left:8px;font-size:11px;background:#22c55e;color:white;padding:2px 8px;border-radius:10px;">ATTIVA</span>' : ''}
              <div style="font-size:12px;color:#666;margin-top:2px;">${s.data_inizio || ''} → ${s.data_fine || ''}</div>
            </div>
            <div style="display:flex;gap:6px;">
              ${!s.attiva ? `<button class="btn btn-small" data-activate="${s.id}" title="Attiva questa stagione" style="background:#22c55e;color:white;border-color:#22c55e;">✅ Attiva</button>` : `<span style="font-size:12px;color:#22c55e;font-weight:600;">● Corrente</span>`}
              <button class="btn btn-small btn-danger" data-del-season="${s.id}" title="Elimina">🗑️</button>
            </div>
          </div>
        `).join('')}
      </div>`}
    </div>

    <!-- CATEGORIE -->
    <div class="card" style="margin-bottom:24px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
        <h3 style="margin:0;font-size:16px;color:#334155;">📋 Categorie</h3>
        <button class="btn btn-primary btn-small" id="btnAddCategory">+ Nuova Categoria</button>
      </div>
      ${categories.length === 0 ? '<p style="color:#999;text-align:center;padding:20px;">Nessuna categoria creata</p>' : `
      <table style="width:100%;border-collapse:collapse;">
        <thead><tr style="border-bottom:2px solid #eee;">
          <th style="text-align:left;padding:10px;">Nome</th>
          <th style="text-align:center;padding:10px;">Anno nascita</th>
          <th style="text-align:center;padding:10px;">Genere</th>
          <th style="text-align:center;padding:10px;">Team attivo</th>
          <th style="text-align:right;padding:10px;">Azioni</th>
        </tr></thead>
        <tbody>
          ${categories.map(cat => {
            const hasTeam = teams.find(t => t.category_id === cat.id);
            return `<tr style="border-bottom:1px solid #f0f0f0;">
              <td style="padding:10px;font-weight:600;">${cat.nome}</td>
              <td style="padding:10px;text-align:center;font-size:13px;">${cat.anno_da || '-'}${cat.anno_a && cat.anno_a !== cat.anno_da ? ' - ' + cat.anno_a : ''}</td>
              <td style="padding:10px;text-align:center;">${cat.genere === 'F' ? '👧' : '👦'}</td>
              <td style="padding:10px;text-align:center;">
                ${hasTeam ? '<span style="color:#22c55e;font-weight:600;">✓ ' + hasTeam.nome + '</span>' : (activeSeason ? `<button class="btn btn-small" data-create-team="${cat.id}" style="font-size:11px;">⚡ Crea Team</button>` : '<span style="color:#999;font-size:12px;">Nessuna stagione attiva</span>')}
              </td>
              <td style="padding:10px;text-align:right;">
                <button class="btn btn-small" data-edit-cat="${cat.id}">✏️</button>
                <button class="btn btn-small btn-danger" data-del-cat="${cat.id}">🗑️</button>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>`}
    </div>

    <!-- RIEPILOGO TEAM STAGIONE ATTIVA -->
    ${activeSeason && teams.length > 0 ? `
    <div class="card">
      <h3 style="margin:0 0 16px;font-size:16px;color:#334155;">⚽ Team Stagione ${activeSeason.nome}</h3>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;">
        ${teams.map(t => `
          <div style="padding:14px;background:#f8f9fa;border-radius:10px;border:1px solid #e5e7eb;">
            <div style="font-weight:600;font-size:14px;">${t.category?.nome || t.nome}</div>
            <div style="font-size:12px;color:#666;margin-top:4px;">${t.nome}</div>
            <div style="display:flex;gap:12px;margin-top:8px;">
              <span style="font-size:11px;color:#667eea;background:#f0f4ff;padding:3px 8px;border-radius:6px;">👥 ${t._playerCount || 0} giocatori</span>
              <span style="font-size:11px;color:#059669;background:#ecfdf5;padding:3px 8px;border-radius:6px;">👔 ${t._staffCount || 0} staff</span>
            </div>
          </div>
        `).join('')}
      </div>
    </div>` : ''}
  `;

  // Bind events
  document.getElementById('btnAddSeason')?.addEventListener('click', addSeason);
  document.getElementById('btnAddCategory')?.addEventListener('click', addCategory);

  container.querySelectorAll('[data-activate]').forEach(btn => {
    btn.addEventListener('click', () => activateSeason(btn.dataset.activate));
  });
  container.querySelectorAll('[data-del-season]').forEach(btn => {
    btn.addEventListener('click', () => deleteSeason(btn.dataset.delSeason));
  });
  container.querySelectorAll('[data-create-team]').forEach(btn => {
    btn.addEventListener('click', () => createTeam(btn.dataset.createTeam));
  });
  container.querySelectorAll('[data-edit-cat]').forEach(btn => {
    btn.addEventListener('click', () => editCategory(btn.dataset.editCat));
  });
  container.querySelectorAll('[data-del-cat]').forEach(btn => {
    btn.addEventListener('click', () => deleteCategory(btn.dataset.delCat));
  });
}

async function addSeason() {
  const nome = prompt('Nome stagione (es. 2025/26):');
  if (!nome) return;
  const dataInizio = prompt('Data inizio (YYYY-MM-DD):', '2025-09-01');
  if (!dataInizio) return;
  const dataFine = prompt('Data fine (YYYY-MM-DD):', '2026-06-30');
  if (!dataFine) return;

  const wsId = window.YFM.activeWorkspaceId || window.YFM.workspaceInfo?.id;
  showLoading();
  try {
    await apiFetch(`/workspaces/${wsId}/stagioni`, {
      method: 'POST', body: JSON.stringify({ nome, data_inizio: dataInizio, data_fine: dataFine })
    });
    await loadData();
    render();
  } catch (e) { alert('Errore: ' + e.message); }
  finally { hideLoading(); }
}

async function activateSeason(id) {
  const s = seasons.find(x => x.id === id);
  if (!confirm(`Attivare la stagione "${s?.nome}"? L'altra verrà disattivata.`)) return;
  showLoading();
  try {
    await apiFetch(`/stagioni/${id}`, { method: 'PUT', body: JSON.stringify({ attiva: true }) });
    await loadData();
    render();
  } catch (e) { alert('Errore: ' + e.message); }
  finally { hideLoading(); }
}

async function deleteSeason(id) {
  const s = seasons.find(x => x.id === id);
  if (!confirm(`Eliminare la stagione "${s?.nome}"?`)) return;
  showLoading();
  try {
    await apiFetch(`/stagioni/${id}`, { method: 'DELETE' });
    await loadData();
    render();
  } catch (e) { alert('Errore: ' + e.message); }
  finally { hideLoading(); }
}

async function addCategory() {
  const nome = prompt('Nome categoria (es. Under 15):');
  if (!nome) return;
  const annoDa = prompt('Anno nascita (es. 2011):', '');
  const genere = prompt('Genere (M/F):', 'M');

  const wsId = window.YFM.activeWorkspaceId || window.YFM.workspaceInfo?.id;
  showLoading();
  try {
    await apiFetch(`/workspaces/${wsId}/categorie`, {
      method: 'POST', body: JSON.stringify({ nome, anno_da: parseInt(annoDa) || 0, anno_a: parseInt(annoDa) || 0, genere: genere || 'M' })
    });
    await loadData();
    render();
  } catch (e) { alert('Errore: ' + e.message); }
  finally { hideLoading(); }
}

async function editCategory(id) {
  const cat = categories.find(c => c.id === id);
  if (!cat) return;
  const nome = prompt('Nome categoria:', cat.nome);
  if (!nome) return;
  const annoDa = prompt('Anno nascita:', cat.anno_da || '');
  const genere = prompt('Genere (M/F):', cat.genere || 'M');

  showLoading();
  try {
    await apiFetch(`/categorie/${id}`, {
      method: 'PUT', body: JSON.stringify({ nome, anno_da: parseInt(annoDa) || 0, anno_a: parseInt(annoDa) || 0, genere: genere || 'M' })
    });
    await loadData();
    render();
  } catch (e) { alert('Errore: ' + e.message); }
  finally { hideLoading(); }
}

async function deleteCategory(id) {
  const cat = categories.find(c => c.id === id);
  if (!confirm(`Eliminare la categoria "${cat?.nome}"?`)) return;
  showLoading();
  try {
    await apiFetch(`/categorie/${id}`, { method: 'DELETE' });
    await loadData();
    render();
  } catch (e) { alert('Errore: ' + e.message); }
  finally { hideLoading(); }
}

async function createTeam(catId) {
  const activeSeason = seasons.find(s => s.attiva);
  if (!activeSeason) { alert('Nessuna stagione attiva'); return; }
  const cat = categories.find(c => c.id === catId);
  const wsName = window.YFM.workspaceInfo?.nome || cat?.nome || 'Squadra';
  const nome = prompt('Nome team per questa stagione:', wsName);
  if (!nome) return;

  showLoading();
  try {
    await apiFetch(`/categorie/${catId}/team`, {
      method: 'POST', body: JSON.stringify({ season_id: activeSeason.id, nome })
    });
    await loadData();
    render();
    // Reload squadre nel dropdown
    const { loadSquadre } = await import('../team/squadre.js');
    await loadSquadre();
  } catch (e) { alert('Errore: ' + e.message); }
  finally { hideLoading(); }
}
