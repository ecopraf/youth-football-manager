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
  c.innerHTML = `<h1 class="page-title">📅 Stagioni & Categorie</h1>
    <div id="scContent"><div class="loading"><div class="spinner"></div>Caricamento...</div></div>`;
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
      await Promise.all(teams.map(async t => {
        try { t._playerCount = ((await apiFetch(`/squadre/${t.id}/calciatori`)) || []).length; } catch { t._playerCount = 0; }
        try { t._staffCount = ((await apiFetch(`/squadre/${t.id}/staff-completo`)) || []).length; } catch { t._staffCount = 0; }
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
              <div style="font-size:12px;color:#666;margin-top:2px;">01/07/${s.nome.split('/')[0]} → 30/06/${parseInt(s.nome.split('/')[0]) + 1}</div>
            </div>
            <div style="display:flex;gap:6px;">
              ${!s.attiva ? `<button class="btn btn-small" data-activate="${s.id}" style="background:#22c55e;color:white;border-color:#22c55e;">✅ Attiva</button>` : '<span style="font-size:12px;color:#22c55e;font-weight:600;">● Corrente</span>'}
              ${!s.attiva ? `<button class="btn btn-small btn-danger" data-del-season="${s.id}">🗑️</button>` : ''}
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
      <div style="display:flex;flex-direction:column;gap:8px;">
        ${categories.map(cat => {
          const hasTeam = teams.find(t => t.category_id === cat.id);
          return `<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:#f8f9fa;border-radius:10px;border:1px solid #e5e7eb;">
            <div>
              <span style="font-weight:600;">${cat.nome}</span>
              <span style="margin-left:8px;font-size:12px;color:#666;">${cat.tipo_campionato || ''}</span>
              <span style="margin-left:6px;font-size:12px;">${cat.genere === 'F' ? '👧' : '👦'}</span>
              ${hasTeam ? `<div style="font-size:11px;color:#22c55e;margin-top:2px;">✓ Team: ${hasTeam.nome}</div>` : (activeSeason ? '<div style="font-size:11px;color:#f59e0b;margin-top:2px;">⚠️ Nessun team nella stagione attiva</div>' : '')}
            </div>
            <div style="display:flex;gap:6px;">
              <button class="btn btn-small" data-edit-cat="${cat.id}">✏️</button>
              <button class="btn btn-small btn-danger" data-del-cat="${cat.id}">🗑️</button>
            </div>
          </div>`;
        }).join('')}
      </div>`}
    </div>

    <!-- RIEPILOGO TEAM STAGIONE ATTIVA -->
    ${activeSeason && teams.length > 0 ? `
    <div class="card">
      <h3 style="margin:0 0 16px;font-size:16px;color:#334155;">⚽ Team — ${activeSeason.nome}</h3>
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
  document.getElementById('btnAddSeason')?.addEventListener('click', showSeasonWizard);
  document.getElementById('btnAddCategory')?.addEventListener('click', addCategory);
  container.querySelectorAll('[data-activate]').forEach(btn => btn.addEventListener('click', () => activateSeason(btn.dataset.activate)));
  container.querySelectorAll('[data-del-season]').forEach(btn => btn.addEventListener('click', () => deleteSeason(btn.dataset.delSeason)));
  container.querySelectorAll('[data-edit-cat]').forEach(btn => btn.addEventListener('click', () => editCategory(btn.dataset.editCat)));
  container.querySelectorAll('[data-del-cat]').forEach(btn => btn.addEventListener('click', () => deleteCategory(btn.dataset.delCat)));
}

// ── WIZARD NUOVA STAGIONE ──
function showSeasonWizard() {
  const currentYear = new Date().getFullYear();
  const nextYear = currentYear + 1;
  const activeSeason = seasons.find(s => s.attiva);

  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;';
  modal.innerHTML = `
    <div style="background:white;border-radius:16px;padding:28px;width:90%;max-width:420px;">
      <h3 style="margin:0 0 20px;font-size:18px;">📅 Nuova Stagione</h3>
      <div style="margin-bottom:16px;">
        <label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">Anno di inizio</label>
        <input id="wizAnno" type="number" value="${nextYear}" min="2020" max="2050" style="width:100%;padding:10px;border:1.5px solid #e0e0e0;border-radius:8px;font-size:16px;box-sizing:border-box;">
        <div id="wizPreview" style="font-size:12px;color:#666;margin-top:4px;">Stagione: ${nextYear}/${(nextYear + 1).toString().slice(2)} — dal 01/07/${nextYear} al 30/06/${nextYear + 1}</div>
      </div>
      ${activeSeason ? `
      <div style="margin-bottom:16px;padding:14px;background:#f0f4ff;border-radius:10px;border:1px solid #c7d2fe;">
        <div style="font-size:13px;font-weight:600;color:#4338ca;margin-bottom:8px;">🔄 Migrazione da "${activeSeason.nome}"</div>
        <label style="display:flex;align-items:center;gap:8px;font-size:13px;margin-bottom:6px;cursor:pointer;">
          <input type="checkbox" id="wizMigraRosa" checked> Rosa giocatori (attivi)
        </label>
        <label style="display:flex;align-items:center;gap:8px;font-size:13px;margin-bottom:6px;cursor:pointer;">
          <input type="checkbox" id="wizMigraStaff" checked> Staff tecnico e ruoli
        </label>
        <label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer;">
          <input type="checkbox" id="wizMigraConfig" checked> Config allenamenti (giorni/orari)
        </label>
      </div>` : '<p style="font-size:12px;color:#999;">Nessuna stagione precedente da cui migrare dati.</p>'}
      <div style="display:flex;gap:10px;justify-content:flex-end;">
        <button id="wizCancel" class="btn btn-secondary btn-small">Annulla</button>
        <button id="wizConfirm" class="btn btn-primary btn-small">Crea Stagione</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const annoInput = modal.querySelector('#wizAnno');
  const preview = modal.querySelector('#wizPreview');
  annoInput.addEventListener('input', () => {
    const a = parseInt(annoInput.value);
    if (a >= 2020 && a <= 2050) {
      preview.textContent = `Stagione: ${a}/${(a + 1).toString().slice(2)} — dal 01/07/${a} al 30/06/${a + 1}`;
    }
  });

  modal.querySelector('#wizCancel').addEventListener('click', () => modal.remove());
  modal.querySelector('#wizConfirm').addEventListener('click', async () => {
    const anno = parseInt(annoInput.value);
    if (isNaN(anno) || anno < 2020 || anno > 2050) { alert('Anno non valido'); return; }
    modal.remove();
    showLoading();
    try {
      const wsId = window.YFM.activeWorkspaceId || window.YFM.workspaceInfo?.id;
      const newSeason = await apiFetch(`/workspaces/${wsId}/stagioni`, {
        method: 'POST', body: JSON.stringify({ anno_inizio: anno })
      });

      // Migrazione se richiesta
      if (activeSeason && newSeason?.id) {
        const migra_rosa = modal.querySelector('#wizMigraRosa')?.checked || false;
        const migra_staff = modal.querySelector('#wizMigraStaff')?.checked || false;
        const migra_config = modal.querySelector('#wizMigraConfig')?.checked || false;
        if (migra_rosa || migra_staff || migra_config) {
          const migResult = await apiFetch(`/stagioni/${newSeason.id}/migra`, {
            method: 'POST', body: JSON.stringify({ from_season_id: activeSeason.id, migra_rosa, migra_staff, migra_config })
          });
          const parts = [];
          if (migResult.migrated?.rosa) parts.push(`${migResult.migrated.rosa} giocatori`);
          if (migResult.migrated?.staff) parts.push(`${migResult.migrated.staff} staff`);
          if (migResult.migrated?.config) parts.push(`${migResult.migrated.config} config`);
          if (parts.length) alert(`✅ Stagione creata!\nMigrati: ${parts.join(', ')}`);
          else alert('✅ Stagione creata!');
        } else {
          alert('✅ Stagione creata!');
        }
      } else {
        alert('✅ Stagione creata!');
      }

      // Reload squadre dropdown
      const { loadSquadre } = await import('../team/squadre.js');
      await loadSquadre();
      await loadData();
      render();
    } catch (e) { alert('Errore: ' + e.message); }
    finally { hideLoading(); }
  });
}

async function activateSeason(id) {
  const s = seasons.find(x => x.id === id);
  if (!confirm(`Attivare la stagione "${s?.nome}"?\nTutti gli utenti vedranno i dati di questa stagione.`)) return;
  showLoading();
  try {
    await apiFetch(`/stagioni/${id}`, { method: 'PUT', body: JSON.stringify({ attiva: true }) });
    const { loadSquadre } = await import('../team/squadre.js');
    await loadSquadre();
    await loadData();
    render();
  } catch (e) { alert('Errore: ' + e.message); }
  finally { hideLoading(); }
}

async function deleteSeason(id) {
  const s = seasons.find(x => x.id === id);
  if (!confirm(`Eliminare la stagione "${s?.nome}"? Questa azione è irreversibile.`)) return;
  showLoading();
  try {
    await apiFetch(`/stagioni/${id}`, { method: 'DELETE' });
    await loadData();
    render();
  } catch (e) { alert('Errore: ' + e.message); }
  finally { hideLoading(); }
}

// ── CATEGORIE ──
function addCategory() {
  const wsId = window.YFM.activeWorkspaceId || window.YFM.workspaceInfo?.id;
  if (!wsId) return;
  const CATEGORIE = ['U14', 'U15', 'U16', 'U17', 'U19'];
  const TIPI = ['Provinciale', 'Regionale', 'Elite', 'Nazionale'];

  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;';
  modal.innerHTML = `
    <div style="background:white;border-radius:16px;padding:28px;width:90%;max-width:380px;">
      <h3 style="margin:0 0 20px;font-size:16px;">Nuova Categoria</h3>
      <div style="margin-bottom:14px;">
        <label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">Categoria</label>
        <select id="catNomeSelect" style="width:100%;padding:10px;border:1.5px solid #e0e0e0;border-radius:8px;font-size:14px;">
          ${CATEGORIE.map(c => `<option value="${c}">${c}</option>`).join('')}
          <option value="__altro">Altro...</option>
        </select>
        <input id="catNomeManual" type="text" placeholder="Nome personalizzato" style="display:none;width:100%;padding:10px;border:1.5px solid #e0e0e0;border-radius:8px;font-size:14px;margin-top:6px;box-sizing:border-box;">
      </div>
      <div style="margin-bottom:14px;">
        <label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">Tipo Campionato</label>
        <select id="catTipoSelect" style="width:100%;padding:10px;border:1.5px solid #e0e0e0;border-radius:8px;font-size:14px;">
          ${TIPI.map(t => `<option value="${t}">${t}</option>`).join('')}
          <option value="__altro">Altro...</option>
        </select>
        <input id="catTipoManual" type="text" placeholder="Tipo personalizzato" style="display:none;width:100%;padding:10px;border:1.5px solid #e0e0e0;border-radius:8px;font-size:14px;margin-top:6px;box-sizing:border-box;">
      </div>
      <div style="margin-bottom:14px;">
        <label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">Genere</label>
        <select id="catGenere" style="width:100%;padding:10px;border:1.5px solid #e0e0e0;border-radius:8px;font-size:14px;">
          <option value="M">👦 Maschile</option><option value="F">👧 Femminile</option>
        </select>
      </div>
      <div style="display:flex;gap:10px;justify-content:flex-end;">
        <button id="catCancel" class="btn btn-secondary btn-small">Annulla</button>
        <button id="catConfirm" class="btn btn-primary btn-small">Crea</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  modal.querySelector('#catNomeSelect').addEventListener('change', (e) => {
    modal.querySelector('#catNomeManual').style.display = e.target.value === '__altro' ? 'block' : 'none';
  });
  modal.querySelector('#catTipoSelect').addEventListener('change', (e) => {
    modal.querySelector('#catTipoManual').style.display = e.target.value === '__altro' ? 'block' : 'none';
  });

  modal.querySelector('#catCancel').addEventListener('click', () => modal.remove());
  modal.querySelector('#catConfirm').addEventListener('click', async () => {
    const nomeSelect = modal.querySelector('#catNomeSelect').value;
    const nome = nomeSelect === '__altro' ? modal.querySelector('#catNomeManual').value.trim() : nomeSelect;
    const tipoSelect = modal.querySelector('#catTipoSelect').value;
    const tipo_campionato = tipoSelect === '__altro' ? modal.querySelector('#catTipoManual').value.trim() : tipoSelect;
    const genere = modal.querySelector('#catGenere').value;
    if (!nome) { alert('Inserisci un nome categoria'); return; }
    if (!tipo_campionato) { alert('Inserisci il tipo campionato'); return; }

    modal.remove();
    showLoading();
    try {
      const newCat = await apiFetch(`/workspaces/${wsId}/categorie`, {
        method: 'POST', body: JSON.stringify({ nome, tipo_campionato, anno_da: 0, anno_a: 0, genere })
      });
      // Auto-crea team se c'è stagione attiva
      const activeSeason = seasons.find(s => s.attiva);
      if (activeSeason && newCat?.id) {
        const teamName = window.YFM.workspaceInfo?.nome || nome;
        await apiFetch(`/categorie/${newCat.id}/team`, {
          method: 'POST', body: JSON.stringify({ season_id: activeSeason.id, nome: teamName })
        });
        const { loadSquadre } = await import('../team/squadre.js');
        await loadSquadre();
      }
      await loadData();
      render();
    } catch (e) { alert('Errore: ' + e.message); }
    finally { hideLoading(); }
  });
}

async function editCategory(id) {
  const cat = categories.find(c => c.id === id);
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
        <button id="editCatCancel" class="btn btn-secondary btn-small">Annulla</button>
        <button id="editCatConfirm" class="btn btn-primary btn-small">Salva</button>
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
    showLoading();
    try {
      await apiFetch(`/categorie/${id}`, {
        method: 'PUT', body: JSON.stringify({ nome, tipo_campionato, genere, anno_da: 0, anno_a: 0 })
      });
      await loadData();
      render();
    } catch (e) { alert('Errore: ' + e.message); }
    finally { hideLoading(); }
  });
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
