import { apiFetch } from '../../services/api';
import { showLoading, hideLoading } from '../../utils/ui';

let seasons = [];
let categories = [];
let teamsBySeason = {}; // { seasonId: [teams] }

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
    // Carica team per ogni stagione
    teamsBySeason = {};
    await Promise.all(seasons.map(async s => {
      const t = await apiFetch(`/stagioni/${s.id}/squadre`);
      teamsBySeason[s.id] = t || [];
    }));
  } catch (e) {
    seasons = []; categories = []; teamsBySeason = {};
  }
}

function render() {
  const container = document.getElementById('scContent');
  if (!container) return;
  // Più recente = prima in ordine decrescente per nome (formato "YYYY/YY")
  const sortedSeasons = seasons.slice().sort((a, b) => (b.nome || '').localeCompare(a.nome || ''));
  const latestSeasonId = sortedSeasons[0]?.id || null;

  // Count rosa/staff per team
  const teamCounts = {};
  for (const sid of Object.keys(teamsBySeason)) {
    for (const t of teamsBySeason[sid]) {
      teamCounts[t.id] = { rosa: t._rosa_count ?? null, staff: t._staff_count ?? null };
    }
  }

  let expandedSeason = latestSeasonId || seasons[0]?.id || null;

  container.innerHTML = `
    <!-- STAGIONI -->
    <div class="card" style="margin-bottom:24px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
        <h3 style="margin:0;font-size:16px;color:#334155;">📅 Stagioni</h3>
        <button class="btn btn-primary btn-small" id="btnAddSeason">+ Nuova Stagione</button>
      </div>
      ${seasons.length === 0 ? '<p style="color:#999;text-align:center;padding:20px;">Nessuna stagione creata</p>' : `
      <div style="display:flex;flex-direction:column;gap:8px;">
        ${sortedSeasons.map(s => {
          const sTeams = (teamsBySeason[s.id] || []).sort((a, b) => (a.category?.nome || a.nome || '').localeCompare(b.category?.nome || b.nome || ''));
          const isExpanded = s.id === expandedSeason;
          const isLatest = s.id === latestSeasonId;
          return `
          <div style="border-radius:10px;border:1px solid ${isLatest ? '#86efac' : '#e5e7eb'};overflow:hidden;">
            <div data-toggle-season="${s.id}" style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:${isLatest ? '#f0fdf4' : '#f8f9fa'};cursor:pointer;">
              <div>
                <span style="font-weight:600;">${s.nome}</span>
                ${isLatest ? '<span style="margin-left:8px;font-size:11px;background:#667eea;color:white;padding:2px 8px;border-radius:10px;">★ Più recente</span>' : ''}
                <span style="margin-left:8px;font-size:11px;color:#999;">${sTeams.length} team</span>
              </div>
              <div style="display:flex;gap:6px;align-items:center;">
                <button class="btn btn-small" data-edit-season="${s.id}" style="padding:4px 8px;font-size:11px;">✏️</button>
                <button class="btn btn-small btn-danger" data-del-season="${s.id}">🗑️</button>
                <span style="font-size:14px;transition:transform .2s;${isExpanded ? 'transform:rotate(90deg);' : ''}">▶</span>
              </div>
            </div>
            <div data-season-body="${s.id}" style="${isExpanded ? '' : 'display:none;'}padding:12px 16px;background:white;border-top:1px solid #eee;">
              ${sTeams.length === 0 ? '<p style="color:#999;font-size:13px;margin:0;">Nessun team in questa stagione</p>' : `
              <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px;">
                ${sTeams.map(t => {
                  const rc = teamCounts[t.id];
                  return `
                  <div style="padding:12px;background:#f8f9fa;border-radius:8px;border:1px solid #e5e7eb;position:relative;">
                    <div style="font-weight:600;font-size:13px;">${t.category?.nome || t.nome}</div>
                    <div style="font-size:11px;color:#666;margin-top:2px;">${t.category?.tipo_campionato || ''}</div>
                    <div style="font-size:11px;color:#888;margin-top:4px;display:flex;gap:10px;">
                      ${rc?.rosa != null ? '<span>👥 ' + rc.rosa + '</span>' : ''}
                      ${rc?.staff != null ? '<span>💼 ' + rc.staff + '</span>' : ''}
                    </div>
                    <button class="btn btn-small btn-danger" data-del-team="${t.id}" data-season-id="${s.id}" style="position:absolute;top:8px;right:8px;padding:2px 6px;font-size:10px;">✖</button>
                  </div>
                `;
                }).join('')}
              </div>`}
              <button class="btn btn-small" data-add-team-season="${s.id}" style="margin-top:10px;font-size:12px;">+ Aggiungi categoria</button>
            </div>
          </div>`;
        }).join('')}
      </div>`}
    </div>

    <!-- CATEGORIE (registro globale workspace) -->
    <div class="card" style="margin-bottom:24px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
        <h3 style="margin:0;font-size:16px;color:#334155;">📋 Categorie Workspace</h3>
        <button class="btn btn-primary btn-small" id="btnAddCategory">+ Nuova Categoria</button>
      </div>
      ${categories.length === 0 ? '<p style="color:#999;text-align:center;padding:20px;">Nessuna categoria creata</p>' : `
      <div style="display:flex;flex-wrap:wrap;gap:8px;">
        ${categories.map(cat => `
          <div style="display:flex;align-items:center;gap:8px;padding:8px 14px;background:#f8f9fa;border-radius:8px;border:1px solid #e5e7eb;">
            <span style="font-weight:600;font-size:13px;">${cat.nome}</span>
            <span style="font-size:11px;color:#666;">${cat.tipo_campionato || ''}</span>
            <span style="font-size:11px;">${cat.genere === 'F' ? '👧' : '👦'}</span>
            <button class="btn btn-small" data-edit-cat="${cat.id}" style="padding:2px 6px;font-size:10px;">✏️</button>
            <button class="btn btn-small btn-danger" data-del-cat="${cat.id}" style="padding:2px 6px;font-size:10px;">✖</button>
          </div>
        `).join('')}
      </div>`}
    </div>
  `;

  // Bind events
  document.getElementById('btnAddSeason')?.addEventListener('click', showSeasonWizard);
  document.getElementById('btnAddCategory')?.addEventListener('click', addCategory);
  container.querySelectorAll('[data-edit-season]').forEach(btn => btn.addEventListener('click', (e) => { e.stopPropagation(); editSeason(btn.dataset.editSeason); }));
  container.querySelectorAll('[data-del-season]').forEach(btn => btn.addEventListener('click', (e) => { e.stopPropagation(); deleteSeason(btn.dataset.delSeason); }));
  container.querySelectorAll('[data-edit-cat]').forEach(btn => btn.addEventListener('click', () => editCategory(btn.dataset.editCat)));
  container.querySelectorAll('[data-del-cat]').forEach(btn => btn.addEventListener('click', () => deleteCategory(btn.dataset.delCat)));
  // Toggle season expand/collapse
  container.querySelectorAll('[data-toggle-season]').forEach(btn => btn.addEventListener('click', () => {
    const sid = btn.dataset.toggleSeason;
    const body = container.querySelector(`[data-season-body="${sid}"]`);
    const arrow = btn.querySelector('span:last-child');
    if (body.style.display === 'none') { body.style.display = ''; arrow.style.transform = 'rotate(90deg)'; }
    else { body.style.display = 'none'; arrow.style.transform = ''; }
  }));
  // Delete team
  container.querySelectorAll('[data-del-team]').forEach(btn => btn.addEventListener('click', async () => {
    const teamId = btn.dataset.delTeam;
    if (!await confirm('⚠️ Eliminare questo team e tutti i dati associati (rosa, partite, allenamenti)?')) return;
    showLoading();
    try {
      await apiFetch(`/squadre/${teamId}`, { method: 'DELETE' });
      await loadData(); render();
    } catch (e) { alert('Errore: ' + e.message); }
    finally { hideLoading(); }
  }));
  // Add team to season
  container.querySelectorAll('[data-add-team-season]').forEach(btn => btn.addEventListener('click', () => addTeamToSeason(btn.dataset.addTeamSeason)));
}

// ── WIZARD NUOVA STAGIONE ──
function showSeasonWizard() {
  const latestSeason = seasons.slice().sort((a, b) => (b.nome || '').localeCompare(a.nome || ''))[0] || null;
  let suggestedYear;
  if (latestSeason?.nome) {
    suggestedYear = parseInt(latestSeason.nome.split('/')[0]) + 1;
  } else {
    const now = new Date();
    suggestedYear = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  }
  if (isNaN(suggestedYear) || suggestedYear < 2020) suggestedYear = new Date().getFullYear();

  // Calcola promozioni categoria
  const CATS_ORDER = ['U14', 'U15', 'U16', 'U17', 'U18', 'U19'];
  const TIPI = ['Provinciale', 'Regionale', 'Elite', 'Nazionale'];
  const activeTeams = latestSeason ? (teamsBySeason[latestSeason.id] || []) : [];

  function nextCategory(catName) {
    const idx = CATS_ORDER.indexOf(catName);
    if (idx >= 0 && idx < CATS_ORDER.length - 1) return CATS_ORDER[idx + 1];
    return catName;
  }

  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;padding:20px;';
  modal.innerHTML = `
    <div style="background:white;border-radius:16px;padding:28px;width:90%;max-width:520px;max-height:90vh;overflow-y:auto;">
      <h3 style="margin:0 0 20px;font-size:18px;">📅 Nuova Stagione</h3>
      <div style="margin-bottom:16px;">
        <label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">Anno di inizio</label>
        <input id="wizAnno" type="number" value="${suggestedYear}" min="2020" max="2050" style="width:100%;padding:10px;border:1.5px solid #e0e0e0;border-radius:8px;font-size:16px;box-sizing:border-box;">
        <div id="wizPreview" style="font-size:12px;color:#666;margin-top:4px;">Stagione: ${suggestedYear}/${(suggestedYear + 1).toString().slice(2)} — dal 01/07/${suggestedYear} al 30/06/${suggestedYear + 1}</div>
      </div>
      ${latestSeason && activeTeams.length > 0 ? `
      <div style="margin-bottom:16px;padding:14px;background:#f0f4ff;border-radius:10px;border:1px solid #c7d2fe;">
        <div style="font-size:13px;font-weight:600;color:#4338ca;margin-bottom:10px;">🔄 Migrazione da "${latestSeason.nome}"</div>
        <table style="width:100%;font-size:12px;border-collapse:collapse;margin-bottom:12px;">
          <thead><tr style="text-align:left;border-bottom:1px solid #c7d2fe;">
            <th style="padding:4px 6px;">Attuale</th>
            <th style="padding:4px 6px;">→ Nuova Categoria</th>
            <th style="padding:4px 6px;">Tipo Campionato</th>
            <th style="padding:4px 6px;">Migra</th>
          </tr></thead>
          <tbody>
            ${activeTeams.map((t, i) => {
              const catName = t.category?.nome || 'Squadra';
              const catTipo = t.category?.tipo_campionato || 'Provinciale';
              const suggested = nextCategory(catName);
              return `<tr style="border-bottom:1px solid #eee;">
                <td style="padding:6px;"><strong>${catName}</strong><br><span style="color:#666;">${catTipo}</span></td>
                <td style="padding:6px;"><select class="wizNewCat" data-idx="${i}" style="padding:4px;border-radius:6px;border:1px solid #ddd;font-size:12px;">
                  ${CATS_ORDER.map(c => `<option value="${c}" ${c === suggested ? 'selected' : ''}>${c}</option>`).join('')}
                </select></td>
                <td style="padding:6px;"><select class="wizNewTipo" data-idx="${i}" style="padding:4px;border-radius:6px;border:1px solid #ddd;font-size:12px;">
                  ${TIPI.map(tp => `<option value="${tp}" ${tp === catTipo ? 'selected' : ''}>${tp}</option>`).join('')}
                </select></td>
                <td style="padding:6px;text-align:center;"><input type="checkbox" class="wizMigraTeam" data-idx="${i}" checked></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
        <label style="display:flex;align-items:center;gap:8px;font-size:13px;margin-bottom:4px;cursor:pointer;">
          <input type="checkbox" id="wizMigraRosa" checked> Rosa giocatori (attivi)
        </label>
        <label style="display:flex;align-items:center;gap:8px;font-size:13px;margin-bottom:4px;cursor:pointer;">
          <input type="checkbox" id="wizMigraStaff" checked> Staff tecnico e ruoli
        </label>
        <label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer;">
          <input type="checkbox" id="wizMigraConfig" checked> Config allenamenti
        </label>
      </div>` : (latestSeason ? '<p style="font-size:12px;color:#999;">Nessun team nella stagione più recente da migrare.</p>' : '<p style="font-size:12px;color:#999;">Nessuna stagione precedente da cui migrare.</p>')}
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
    if (a >= 2020 && a <= 2050) preview.textContent = `Stagione: ${a}/${(a + 1).toString().slice(2)} — dal 01/07/${a} al 30/06/${a + 1}`;
  });

  modal.querySelector('#wizCancel').addEventListener('click', () => modal.remove());
  modal.querySelector('#wizConfirm').addEventListener('click', async () => {
    const anno = parseInt(annoInput.value);
    if (isNaN(anno) || anno < 2020 || anno > 2050) { alert('Anno non valido'); return; }

    // Raccogli mapping promozioni
    const migrations = [];
    modal.querySelectorAll('.wizMigraTeam').forEach(cb => {
      if (!cb.checked) return;
      const idx = parseInt(cb.dataset.idx);
      const t = activeTeams[idx];
      if (!t) return;
      migrations.push({
        from_team_id: t.id,
        from_category_id: t.category_id,
        new_category_name: modal.querySelector(`.wizNewCat[data-idx="${idx}"]`).value,
        new_tipo_campionato: modal.querySelector(`.wizNewTipo[data-idx="${idx}"]`).value,
        genere: t.category?.genere || 'M'
      });
    });

    const migra_rosa = modal.querySelector('#wizMigraRosa')?.checked || false;
    const migra_staff = modal.querySelector('#wizMigraStaff')?.checked || false;
    const migra_config = modal.querySelector('#wizMigraConfig')?.checked || false;

    modal.remove();
    showLoading();
    try {
      const wsId = window.YFM.activeWorkspaceId || window.YFM.workspaceInfo?.id;
      const newSeason = await apiFetch(`/workspaces/${wsId}/stagioni`, {
        method: 'POST', body: JSON.stringify({ anno_inizio: anno, skip_auto_teams: migrations.length > 0 })
      });

      if (newSeason?.id && migrations.length > 0) {
        const migResult = await apiFetch(`/stagioni/${newSeason.id}/migra`, {
          method: 'POST', body: JSON.stringify({
            from_season_id: latestSeason.id,
            migrations, migra_rosa, migra_staff, migra_config
          })
        });
        const parts = [];
        if (migResult.migrated?.rosa) parts.push(`${migResult.migrated.rosa} giocatori`);
        if (migResult.migrated?.staff) parts.push(`${migResult.migrated.staff} staff`);
        if (migResult.migrated?.config) parts.push(`${migResult.migrated.config} config`);
        if (migResult.migrated?.categories_created) parts.push(`${migResult.migrated.categories_created} nuove categorie`);
        alert(`✅ Stagione creata!${parts.length ? '\nMigrati: ' + parts.join(', ') : ''}`);
      } else {
        alert('✅ Stagione creata!');
      }

      const { loadSquadre } = await import('../team/squadre.js');
      await loadSquadre();
      await loadData();
      render();
    } catch (e) { alert('Errore: ' + e.message); }
    finally { hideLoading(); }
  });
}

async function editSeason(id) {
  const s = seasons.find(x => x.id === id);
  if (!s) return;
  const anno = parseInt(s.nome.split('/')[0]);

  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;';
  modal.innerHTML = `
    <div style="background:white;border-radius:16px;padding:28px;width:90%;max-width:380px;">
      <h3 style="margin:0 0 16px;font-size:16px;">✏️ Modifica Stagione</h3>
      <div style="margin-bottom:14px;">
        <label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">Anno di inizio</label>
        <input id="editSeasonAnno" type="number" value="${anno}" min="2020" max="2050" style="width:100%;padding:10px;border:1.5px solid #e0e0e0;border-radius:8px;font-size:16px;box-sizing:border-box;">
        <div id="editSeasonPreview" style="font-size:12px;color:#666;margin-top:4px;">Stagione: ${s.nome} — dal 01/07/${anno} al 30/06/${anno + 1}</div>
      </div>
      <div style="display:flex;gap:10px;justify-content:flex-end;">
        <button id="editSeasonCancel" class="btn btn-secondary btn-small">Annulla</button>
        <button id="editSeasonSave" class="btn btn-primary btn-small">Salva</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const input = modal.querySelector('#editSeasonAnno');
  const preview = modal.querySelector('#editSeasonPreview');
  input.addEventListener('input', () => {
    const a = parseInt(input.value);
    if (a >= 2020 && a <= 2050) preview.textContent = `Stagione: ${a}/${(a + 1).toString().slice(2)} — dal 01/07/${a} al 30/06/${a + 1}`;
  });

  modal.querySelector('#editSeasonCancel').addEventListener('click', () => modal.remove());
  modal.querySelector('#editSeasonSave').addEventListener('click', async () => {
    const newAnno = parseInt(input.value);
    if (isNaN(newAnno) || newAnno < 2020 || newAnno > 2050) { alert('Anno non valido'); return; }
    const newNome = `${newAnno}/${(newAnno + 1).toString().slice(2)}`;
    modal.remove();
    showLoading();
    try {
      await apiFetch(`/stagioni/${id}`, {
        method: 'PUT', body: JSON.stringify({ nome: newNome, data_inizio: `${newAnno}-07-01`, data_fine: `${newAnno + 1}-06-30` })
      });
      await loadData(); render();
    } catch (e) { alert('Errore: ' + e.message); }
    finally { hideLoading(); }
  });
}

async function deleteSeason(id) {
  const s = seasons.find(x => x.id === id);
  const confirmed = await confirm(`⚠️ Eliminare la stagione "${s?.nome}"?\n\nVerranno eliminati TUTTI i dati associati:\n- Squadre, rosa, staff\n- Partite, formazioni, eventi\n- Allenamenti e presenze\n\nQuesta azione è IRREVERSIBILE.`);
  if (!confirmed) return;
  showLoading();
  try {
    await apiFetch(`/stagioni/${id}`, { method: 'DELETE' });
    const { loadSquadre } = await import('../team/squadre.js');
    await loadSquadre();
    await loadData();
    render();
  } catch (e) { alert('Errore: ' + e.message); }
  finally { hideLoading(); }
}

// ── AGGIUNGI TEAM A STAGIONE ──
async function addTeamToSeason(seasonId) {
  const existingTeams = teamsBySeason[seasonId] || [];
  const existingCatIds = existingTeams.map(t => t.category_id).filter(Boolean);
  const available = categories.filter(c => !existingCatIds.includes(c.id));

  if (available.length === 0) {
    alert('Tutte le categorie hanno già un team in questa stagione.');
    return;
  }

  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;';
  modal.innerHTML = `
    <div style="background:white;border-radius:16px;padding:28px;width:90%;max-width:360px;">
      <h3 style="margin:0 0 16px;font-size:16px;">Aggiungi Team</h3>
      <div style="margin-bottom:14px;">
        <label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">Categoria</label>
        <select id="addTeamCat" style="width:100%;padding:10px;border:1.5px solid #e0e0e0;border-radius:8px;font-size:14px;">
          ${available.map(c => `<option value="${c.id}">${c.nome} ${c.tipo_campionato || ''}</option>`).join('')}
        </select>
      </div>
      <div style="display:flex;gap:10px;justify-content:flex-end;">
        <button id="addTeamCancel" class="btn btn-secondary btn-small">Annulla</button>
        <button id="addTeamConfirm" class="btn btn-primary btn-small">Crea Team</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.querySelector('#addTeamCancel').addEventListener('click', () => modal.remove());
  modal.querySelector('#addTeamConfirm').addEventListener('click', async () => {
    const catId = modal.querySelector('#addTeamCat').value;
    modal.remove();
    showLoading();
    try {
      const teamName = window.YFM.workspaceInfo?.nome_breve || window.YFM.workspaceInfo?.nome || 'Squadra';
      await apiFetch(`/categorie/${catId}/team`, {
        method: 'POST', body: JSON.stringify({ season_id: seasonId, nome: teamName })
      });
      const { loadSquadre } = await import('../team/squadre.js');
      await loadSquadre();
      await loadData(); render();
    } catch (e) { alert('Errore: ' + e.message); }
    finally { hideLoading(); }
  });
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
      // Auto-crea team nella stagione più recente
      const latestS = seasons.slice().sort((a, b) => (b.nome || '').localeCompare(a.nome || ''))[0];
      if (latestS && newCat?.id) {
        const teamName = window.YFM.workspaceInfo?.nome || nome;
        await apiFetch(`/categorie/${newCat.id}/team`, {
          method: 'POST', body: JSON.stringify({ season_id: latestS.id, nome: teamName })
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
  if (!await confirm(`Eliminare la categoria "${cat?.nome}"?`)) return;
  showLoading();
  try {
    await apiFetch(`/categorie/${id}`, { method: 'DELETE' });
    await loadData();
    render();
  } catch (e) { alert('Errore: ' + e.message); }
  finally { hideLoading(); }
}
