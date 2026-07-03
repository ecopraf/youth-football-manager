import { apiFetch } from '../../services/api';
import { showLoading, hideLoading } from '../../utils/ui';

let staffList = [];
let categorie = [];

const RUOLI = ['Allenatore', 'Vice Allenatore', 'Preparatore Atletico', 'Preparatore Portieri', 'Dirigente', 'Direttore Sportivo', 'Direttore Generale', 'Direttore Tecnico', 'Presidente', 'Osservatore', 'Medico', 'Fisioterapista', 'Massaggiatore'];

export default async function loadStaff() {
  const c = document.getElementById('pageContent');
  if (!window.YFM.isAdmin()) {
    c.innerHTML = '<div class="error-box">Accesso riservato agli amministratori</div>';
    return;
  }

  c.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;">
      <h1 class="page-title">👥 Staff</h1>
      <div style="display:flex;gap:8px;">
        <button class="btn btn-secondary" id="btnPasteStaff">📋 Incolla da TC</button>
        <button class="btn btn-primary" id="btnAddStaff">+ Aggiungi</button>
      </div>
    </div>
    <div class="card">
      <table style="width:100%;border-collapse:collapse;" id="staffTable">
        <thead>
          <tr style="border-bottom:2px solid #eee;">
            <th style="text-align:left;padding:12px;">Nome</th>
            <th style="text-align:left;padding:12px;">Ruolo</th>
            <th style="text-align:left;padding:12px;">Matricola</th>
            <th style="text-align:left;padding:12px;">Tessera</th>
            <th style="text-align:left;padding:12px;">Categorie</th>
            <th style="text-align:right;padding:12px;">Azioni</th>
          </tr>
        </thead>
        <tbody id="staffBody"></tbody>
      </table>
    </div>
    <div id="staffModal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:1000;align-items:center;justify-content:center;">
      <div style="background:white;border-radius:12px;max-width:600px;width:90%;max-height:85vh;overflow-y:auto;">
        <div style="padding:16px 20px;border-bottom:1px solid #eee;display:flex;justify-content:space-between;align-items:center;">
          <h2 id="staffModalTitle" style="margin:0;">Nuovo Membro Staff</h2>
          <button id="staffModalClose" style="background:none;border:none;font-size:24px;cursor:pointer;">&times;</button>
        </div>
        <div style="padding:20px;">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
            <div><label style="font-size:12px;font-weight:600;color:#666;">Nome *</label><input id="sfNome" style="width:100%;padding:8px 12px;border:1px solid #ddd;border-radius:6px;"></div>
            <div><label style="font-size:12px;font-weight:600;color:#666;">Cognome *</label><input id="sfCognome" style="width:100%;padding:8px 12px;border:1px solid #ddd;border-radius:6px;"></div>
            <div><label style="font-size:12px;font-weight:600;color:#666;">Ruolo *</label><select id="sfRuolo" style="width:100%;padding:8px 12px;border:1px solid #ddd;border-radius:6px;">${RUOLI.map(r => `<option value="${r}">${r}</option>`).join('')}</select></div>
            <div><label style="font-size:12px;font-weight:600;color:#666;">Telefono</label><input id="sfTelefono" style="width:100%;padding:8px 12px;border:1px solid #ddd;border-radius:6px;"></div>
            <div style="grid-column:span 2;"><label style="font-size:12px;font-weight:600;color:#666;">Email</label><input id="sfEmail" type="email" style="width:100%;padding:8px 12px;border:1px solid #ddd;border-radius:6px;"></div>
          </div>
          <div style="margin-top:16px;padding-top:16px;border-top:1px solid #eee;">
            <h4 style="margin:0 0 12px;color:#334155;">Qualifiche</h4>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
              <div><label style="font-size:12px;font-weight:600;color:#666;">Matricola</label><input id="sfMatricola" style="width:100%;padding:8px 12px;border:1px solid #ddd;border-radius:6px;"></div>
              <div><label style="font-size:12px;font-weight:600;color:#666;">Tessera FIGC</label><input id="sfTesseraFigc" style="width:100%;padding:8px 12px;border:1px solid #ddd;border-radius:6px;"></div>
              <div><label style="font-size:12px;font-weight:600;color:#666;">Tessera LND</label><input id="sfTesseraLnd" style="width:100%;padding:8px 12px;border:1px solid #ddd;border-radius:6px;"></div>
              <div><label style="font-size:12px;font-weight:600;color:#666;">Tipo Tessera</label><select id="sfTipoTessera" style="width:100%;padding:8px 12px;border:1px solid #ddd;border-radius:6px;"><option value="FIGC">FIGC</option><option value="LND">LND</option></select></div>
            </div>
          </div>
          <div style="margin-top:16px;padding-top:16px;border-top:1px solid #eee;">
            <h4 style="margin:0 0 12px;color:#334155;">Categorie assegnate</h4>
            <div id="sfCategorie"></div>
          </div>
        </div>
        <div style="padding:16px 20px;border-top:1px solid #eee;display:flex;justify-content:flex-end;gap:12px;">
          <button id="staffModalCancel" class="btn btn-secondary">Annulla</button>
          <button id="staffModalSave" class="btn btn-primary">Salva</button>
        </div>
      </div>
    </div>
  `;

  await loadData();
  document.getElementById('btnAddStaff').addEventListener('click', () => openStaffModal());
  document.getElementById('btnPasteStaff').addEventListener('click', openPasteModal);
  document.getElementById('staffModalClose').addEventListener('click', closeModal);
  document.getElementById('staffModalCancel').addEventListener('click', closeModal);
  document.getElementById('staffModalSave').addEventListener('click', handleSave);
}

async function loadData() {
  const wsId = window.YFM.getUser()?.workspace_id;
  if (!wsId) return;
  try {
    [staffList, categorie] = await Promise.all([
      apiFetch(`/workspaces/${wsId}/staff`),
      apiFetch(`/workspaces/${wsId}/categorie`)
    ]);
  } catch (e) {
    staffList = [];
    categorie = [];
  }
  renderTable();
}

function renderTable() {
  const tbody = document.getElementById('staffBody');
  if (!tbody) return;
  if (staffList.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:#999;">Nessun membro staff</td></tr>';
    return;
  }
  tbody.innerHTML = staffList.map(s => {
    const q = s.qualifiche || {};
    const cats = (s.categorie || []).map(c => c.nome).join(', ') || '-';
    return `<tr style="border-bottom:1px solid #eee;">
      <td style="padding:12px;font-weight:600;">${s.cognome} ${s.nome}</td>
      <td style="padding:12px;color:#666;">${s.ruolo || '-'}</td>
      <td style="padding:12px;color:#666;font-size:13px;">${q.matricola || '-'}</td>
      <td style="padding:12px;color:#666;font-size:13px;">${q.tessera_figc || q.tessera_lnd || '-'}</td>
      <td style="padding:12px;font-size:13px;">${cats}</td>
      <td style="padding:12px;text-align:right;">
        <button class="btn btn-small" data-edit="${s.id}">✏️</button>
        <button class="btn btn-small btn-danger" data-del="${s.id}">🗑️</button>
      </td>
    </tr>`;
  }).join('');

  tbody.querySelectorAll('[data-edit]').forEach(btn => {
    btn.addEventListener('click', () => openStaffModal(btn.dataset.edit));
  });
  tbody.querySelectorAll('[data-del]').forEach(btn => {
    btn.addEventListener('click', () => handleDelete(btn.dataset.del));
  });
}

function openStaffModal(staffId = null) {
  const modal = document.getElementById('staffModal');
  modal.style.display = 'flex';
  modal.dataset.editId = staffId || '';

  const s = staffId ? staffList.find(x => x.id === staffId) : null;
  document.getElementById('staffModalTitle').textContent = s ? 'Modifica Staff' : 'Nuovo Membro Staff';
  document.getElementById('sfNome').value = s?.nome || '';
  document.getElementById('sfCognome').value = s?.cognome || '';
  document.getElementById('sfRuolo').value = s?.ruolo || 'Allenatore';
  document.getElementById('sfTelefono').value = s?.telefono || '';
  document.getElementById('sfEmail').value = s?.email || '';

  const q = s?.qualifiche || {};
  document.getElementById('sfMatricola').value = q.matricola || '';
  document.getElementById('sfTesseraFigc').value = q.tessera_figc || '';
  document.getElementById('sfTesseraLnd').value = q.tessera_lnd || '';
  document.getElementById('sfTipoTessera').value = q.tipo_tessera || 'FIGC';

  const selectedCats = (s?.categorie || []).map(c => c.id);
  const container = document.getElementById('sfCategorie');
  container.innerHTML = categorie.map(cat => `
    <label style="display:flex;align-items:center;gap:8px;padding:6px 0;cursor:pointer;">
      <input type="checkbox" name="sfCat" value="${cat.id}" ${selectedCats.includes(cat.id) ? 'checked' : ''}>
      <span>${cat.nome}</span>
    </label>
  `).join('') || '<p style="color:#999;font-size:13px;">Nessuna categoria disponibile</p>';
}

function closeModal() {
  document.getElementById('staffModal').style.display = 'none';
}

async function handleSave() {
  const nome = document.getElementById('sfNome').value.trim();
  const cognome = document.getElementById('sfCognome').value.trim();
  if (!nome || !cognome) { alert('Nome e cognome obbligatori'); return; }

  const body = {
    nome,
    cognome,
    ruolo: document.getElementById('sfRuolo').value,
    telefono: document.getElementById('sfTelefono').value,
    email: document.getElementById('sfEmail').value,
    qualifiche: {
      matricola: document.getElementById('sfMatricola').value,
      tessera_figc: document.getElementById('sfTesseraFigc').value,
      tessera_lnd: document.getElementById('sfTesseraLnd').value,
      tipo_tessera: document.getElementById('sfTipoTessera').value
    },
    categorie_ids: Array.from(document.querySelectorAll('#sfCategorie input:checked')).map(cb => cb.value),
    workspace_id: window.YFM.getUser()?.workspace_id
  };

  const editId = document.getElementById('staffModal').dataset.editId;
  showLoading();
  try {
    if (editId) {
      await apiFetch(`/staff/${editId}`, { method: 'PUT', body: JSON.stringify(body) });
    } else {
      await apiFetch(`/workspaces/${window.YFM.getUser().workspace_id}/staff`, { method: 'POST', body: JSON.stringify(body) });
    }
    closeModal();
    await loadData();
  } catch (err) {
    alert('Errore: ' + err.message);
  } finally {
    hideLoading();
  }
}

async function handleDelete(id) {
  const s = staffList.find(x => x.id === id);
  if (!confirm(`Eliminare ${s?.cognome} ${s?.nome}?`)) return;
  showLoading();
  try {
    await apiFetch(`/staff/${id}`, { method: 'DELETE' });
    await loadData();
  } catch (err) {
    alert('Errore: ' + err.message);
  } finally {
    hideLoading();
  }
}

// ── PASTE DA TUTTOCAMPO ──
const RUOLI_MAP = {
  'allenatore': 'Allenatore',
  'vice allenatore': 'Vice Allenatore',
  'preparatore atletico': 'Preparatore Atletico',
  'prep. atletico': 'Preparatore Atletico',
  'preparatore portieri': 'Preparatore Portieri',
  'all. portieri': 'Preparatore Portieri',
  'dirigente': 'Dirigente',
  'direttore sportivo': 'Direttore Sportivo',
  'dir. sportivo': 'Direttore Sportivo',
  'direttore generale': 'Direttore Generale',
  'dir. generale': 'Direttore Generale',
  'direttore tecnico': 'Direttore Tecnico',
  'dir. tecnico': 'Direttore Tecnico',
  'presidente': 'Presidente',
  'osservatore': 'Osservatore',
  'medico': 'Medico',
  'fisioterapista': 'Fisioterapista',
  'massaggiatore': 'Massaggiatore'
};

function parseTCStaff(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const result = [];
  for (const line of lines) {
    // Formato: "Ruolo\tCognome Nome" oppure "Ruolo  Cognome Nome"
    const parts = line.split(/\t+/);
    let ruoloRaw, nomeRaw;
    if (parts.length >= 2) {
      ruoloRaw = parts[0].trim();
      nomeRaw = parts.slice(1).join(' ').trim();
    } else {
      // Prova split per doppio spazio
      const match = line.match(/^(.+?)\s{2,}(.+)$/);
      if (match) { ruoloRaw = match[1].trim(); nomeRaw = match[2].trim(); }
      else continue;
    }
    const ruolo = RUOLI_MAP[ruoloRaw.toLowerCase()] || ruoloRaw;
    // Nome formato "Cognome Nome" o "Cognome Nome1 Nome2"
    const nameParts = nomeRaw.split(/\s+/);
    const cognome = nameParts[0] || '';
    const nome = nameParts.slice(1).join(' ') || '';
    if (cognome) result.push({ nome, cognome, ruolo });
  }
  return result;
}

function openPasteModal() {
  const overlay = document.createElement('div');
  overlay.style = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:1001;';
  overlay.innerHTML = `
    <div style="background:white;border-radius:12px;max-width:550px;width:90%;max-height:85vh;overflow-y:auto;">
      <div style="padding:16px 20px;border-bottom:1px solid #eee;"><h2 style="margin:0;font-size:18px;">📋 Importa Staff da Tuttocampo</h2><p style="margin:4px 0 0;font-size:12px;color:#888;">Incolla la sezione staff dalla scheda società</p></div>
      <div style="padding:16px 20px;">
        <textarea id="tcStaffInput" rows="6" style="width:100%;border:1px solid #ddd;border-radius:8px;padding:10px;font-size:12px;font-family:monospace;" placeholder="Allenatore\tUrilli Matteo\nDirigente\tCoppola Raffaele\n..."></textarea>
        <button class="btn btn-primary" id="btnParseStaff" style="margin-top:8px;width:100%;">⚡ Analizza</button>
        <div id="staffParsePreview" style="margin-top:12px;"></div>
      </div>
      <div style="padding:12px 20px;border-top:1px solid #eee;display:flex;justify-content:flex-end;gap:10px;">
        <button class="btn btn-secondary" id="pasteStaffClose">Chiudi</button>
        <button class="btn btn-primary" id="pasteStaffImport" style="display:none;">✅ Importa selezionati</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  overlay.querySelector('#pasteStaffClose').addEventListener('click', () => overlay.remove());

  let parsed = [];

  overlay.querySelector('#btnParseStaff').addEventListener('click', () => {
    const text = overlay.querySelector('#tcStaffInput').value.trim();
    if (!text) { alert('Incolla prima i dati'); return; }
    parsed = parseTCStaff(text);
    if (parsed.length === 0) { alert('Nessun membro staff riconosciuto. Verifica il formato.'); return; }

    // Check duplicati contro staffList esistente
    const existingNames = new Set(staffList.map(s => (s.cognome + ' ' + s.nome).toLowerCase()));

    const preview = overlay.querySelector('#staffParsePreview');
    preview.innerHTML = '<p style="font-weight:600;margin-bottom:8px;">' + parsed.length + ' membri trovati:</p>' +
      parsed.map((p, i) => {
        const isDuplicate = existingNames.has((p.cognome + ' ' + p.nome).toLowerCase());
        return `<label style="display:flex;align-items:center;gap:10px;padding:8px;border-radius:8px;background:${isDuplicate ? '#fff3cd' : '#f8f9fa'};margin-bottom:4px;cursor:pointer;opacity:${isDuplicate ? '0.7' : '1'};">
          <input type="checkbox" ${isDuplicate ? '' : 'checked'} class="staffPasteCheck" data-idx="${i}" ${isDuplicate ? 'disabled' : ''}>
          <div style="flex:1;"><span style="font-weight:600;">${p.cognome} ${p.nome}</span>${isDuplicate ? ' <span style="font-size:10px;color:#856404;">✓ già presente</span>' : ''}</div>
          <span style="font-size:11px;color:#667eea;background:#f0f4ff;padding:3px 8px;border-radius:6px;">${p.ruolo}</span>
        </label>`;
      }).join('');
    overlay.querySelector('#pasteStaffImport').style.display = 'block';
  });

  overlay.querySelector('#pasteStaffImport').addEventListener('click', async () => {
    const checked = [...overlay.querySelectorAll('.staffPasteCheck:checked')].map(c => parseInt(c.dataset.idx));
    const selected = checked.map(i => parsed[i]);
    if (!selected.length) return;

    const wsId = window.YFM.getUser()?.workspace_id;
    showLoading('Importazione staff...');
    let imported = 0;
    try {
      for (const s of selected) {
        await apiFetch(`/workspaces/${wsId}/staff`, {
          method: 'POST',
          body: JSON.stringify({ nome: s.nome, cognome: s.cognome, ruolo: s.ruolo })
        });
        imported++;
      }
      overlay.remove();
      alert(`✅ ${imported} membri staff importati!`);
      await loadData();
    } catch (err) {
      alert('Errore: ' + err.message);
    } finally {
      hideLoading();
    }
  });
}
