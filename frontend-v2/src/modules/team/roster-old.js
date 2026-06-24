import { apiFetch } from '../../services/api';
import { formatDateShort, getAvatarColor } from '../../utils/formatters';
import { showLoading, hideLoading } from '../../utils/ui';

// Funzioni esportate per la creazione/modifica giocatori
export { openPlayerForm, filterRoster, updateRosterGrid };

let allPlayers = [];

export default async function loadRoster() {
  const c = document.getElementById('pageContent');
  try {
    const [players, scadenze] = await Promise.all([
      apiFetch('/squadre/' + window.YFM.squadraId + '/calciatori'),
      apiFetch('/squadre/' + window.YFM.squadraId + '/scadenze-mediche').catch(() => [])
    ]);
    allPlayers = players;
    window.YFM.allPlayers = players;
    renderRoster(c, players, scadenze);
  } catch (e) {
    c.innerHTML = '<div class="error-box">' + e.message + '</div>';
  }
}

function renderRoster(c, players, scadenze) {
  const ruoli = ['Portiere', 'Difensore', 'Centrocampista', 'Attaccante'];
  const plur = { Portiere: 'Portieri', Difensore: 'Difensori', Centrocampista: 'Centrocampisti', Attaccante: 'Attaccanti' };
  const byRole = {};
  ruoli.forEach(r => byRole[r] = players.filter(p => p.ruolo === r));

  c.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
      <div>
        <h1 class="page-title">Rosa ${window.YFM.getSquadraName()}</h1>
        <p class="page-subtitle">${players.length} calciatori · ${ruoli.map(r => byRole[r].length + ' ' + plur[r]).join(' · ')}</p>
      </div>
      <button class="btn btn-primary" id="btnAdd">+ Aggiungi</button>
    </div>
    ${scadenze.length > 0 ? '<div class="card" style="margin-bottom:20px;border-left:4px solid #F39C12;"><h3>⚠️ Certificati in scadenza</h3>' + scadenze.map(x => '<div>' + x.nome + ' ' + x.cognome + ' - ' + formatDateShort(x.scadenza) + ' (' + x.giorniRimanenti + 'gg)</div>').join('') + '</div>' : ''}
    <div class="roster-toolbar">
      <input class="search-bar" placeholder="Cerca giocatore..." id="sInput">
      <select class="filter-select" id="fRuolo">
        <option value="">Tutti i ruoli</option>
        ${ruoli.map(r => '<option value="' + r + '">' + plur[r] + '</option>').join('')}
      </select>
      <select class="filter-select" id="fStato">
        <option value="">Tutti gli stati</option>
        <option value="Attivo">Attivo</option>
        <option value="Infortunato">Infortunato</option>
      </select>
    </div>
    ${ruoli.map(r => `
      <div style="margin-bottom:20px;">
        <h3 style="font-size:16px;font-weight:600;color:var(--blue);margin-bottom:12px;padding-bottom:8px;border-bottom:2px solid var(--green);">
          ${plur[r]} (${byRole[r].length})
        </h3>
        <div class="roster-grid" id="grid${r}">
          ${renderPlayerCards(byRole[r].sort((a, b) => a.cognome.localeCompare(b.cognome)))}
        </div>
      </div>
    `).join('')}
  `;

  document.getElementById('btnAdd').addEventListener('click', () => openPlayerForm());
  document.getElementById('sInput').addEventListener('input', filterRoster);
  document.getElementById('fRuolo').addEventListener('change', filterRoster);
  document.getElementById('fStato').addEventListener('change', filterRoster);
  document.querySelectorAll('.roster-grid .player-card').forEach(card => {
    card.addEventListener('click', () => window.YFM && typeof window.YFM.openPlayerDetail === 'function' ? window.YFM.openPlayerDetail(card.dataset.pid) : openPlayerForm(card.dataset.pid));
  });
}

function renderPlayerCards(players) {
  if (players.length === 0) return '<p style="color:var(--gray);grid-column:1/-1;">Nessun calciatore</p>';
  return players.map(p => `
    <div class="card player-card" data-pid="${p.id}">
      <div class="player-avatar" style="background:${getAvatarColor(p.nome)}">${p.nome[0]}${p.cognome[0]}</div>
      <div class="player-info">
        <div class="player-name">${p.nome} ${p.cognome}</div>
        <div class="player-role">${p.ruolo} · #${p.numeroMaglia}</div>
        <div style="margin-top:6px;">
          <span class="badge ${p.stato === 'Attivo' ? 'badge-green' : 'badge-red'}">${p.stato}</span>
        </div>
      </div>
    </div>
  `).join('');
}

function filterRoster() {
  const s = (document.getElementById('sInput')?.value || '').toLowerCase();
  const ruolo = document.getElementById('fRuolo')?.value || '';
  const stato = document.getElementById('fStato')?.value || '';
  let f = allPlayers;
  if (s) f = f.filter(p => (p.nome + ' ' + p.cognome).toLowerCase().includes(s));
  if (ruolo) f = f.filter(p => p.ruolo === ruolo);
  if (stato) f = f.filter(p => p.stato === stato);
  ['Portiere', 'Difensore', 'Centrocampista', 'Attaccante'].forEach(ruolo => {
    const grid = document.getElementById('grid' + ruolo);
    if (grid) {
      const filtered = f.filter(p => p.ruolo === ruolo).sort((a, b) => a.cognome.localeCompare(b.cognome));
      grid.innerHTML = renderPlayerCards(filtered);
      grid.querySelectorAll('.player-card').forEach(card => {
        card.addEventListener('click', () => window.YFM && typeof window.YFM.openPlayerDetail === 'function' ? window.YFM.openPlayerDetail(card.dataset.pid) : openPlayerForm(card.dataset.pid));
      });
    }
  });
}

function updateRosterGrid(players) {
  allPlayers = players;
  window.YFM.allPlayers = players;
  filterRoster();
}

function openPlayerForm(pid) {
  const p = pid ? allPlayers.find(x => x.id === pid) : null;
  const content = `
    <div class="form-grid">
      <div class="form-group"><label>Nome</label><input id="pfN" value="${p ? p.nome : ''}"></div>
      <div class="form-group"><label>Cognome</label><input id="pfC" value="${p ? p.cognome : ''}"></div>
      <div class="form-group"><label>Data Nascita</label><input id="pfD" type="date" value="${p && p.dataNascita ? new Date(p.dataNascita).toISOString().split('T')[0] : ''}"></div>
      <div class="form-group"><label>Telefono</label><input id="pfTel" value="${p ? p.telefono || '' : ''}"></div>
      <div class="form-group"><label>Data Visita Medica</label><input id="pfVM" type="date" value="${p && p.dataVisitaMedica ? p.dataVisitaMedica : ''}"></div>
      <div class="form-group"><label>Ruolo</label><select id="pfR"><option>Attaccante</option><option>Centrocampista</option><option>Difensore</option><option>Portiere</option></select></div>
      <div class="form-group"><label>N. Maglia</label><input id="pfM" type="number" value="${p ? p.numeroMaglia || '' : ''}"></div>
      <div class="form-group"><label>Matricola FIGC</label><input id="pfFigc" value="${p ? p.matricolaFigc || '' : ''}"></div>
      <div class="form-group"><label>Tipo Doc</label><input id="pfTD" value="${p ? p.tipoDocumento || '' : ''}"></div>
      <div class="form-group"><label>N. Doc</label><input id="pfND" value="${p ? p.numeroDocumento || '' : ''}"></div>
      <div class="form-group"><label>Rilasciato</label><input id="pfRD" value="${p ? p.rilasciatoDa || '' : ''}"></div>
    </div>`;
  
  const footer = '<button class="btn btn-secondary" id="btnCancelForm">Annulla</button><button class="btn btn-primary" id="saveBtn">Salva</button>';
  
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'currentModal';
  modal.innerHTML = `
    <div class="modal-content" style="max-width:650px;">
      <div class="modal-header"><h2>${p ? 'Modifica' : 'Nuovo'} Calciatore</h2><button class="modal-close-btn" id="modalCloseX">×</button></div>
      <div class="modal-body">${content}</div>
      <div class="modal-footer">${footer}</div>
    </div>`;
  document.body.appendChild(modal);
  
  const closeModal = () => { const m = document.getElementById('currentModal'); if (m) m.remove(); };
  document.getElementById('modalCloseX').addEventListener('click', closeModal);
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
  modal.querySelector('.modal-close-btn').addEventListener('click', closeModal);
  document.getElementById('btnCancelForm').addEventListener('click', closeModal);
  
  if (p) document.getElementById('pfR').value = p.ruolo;
  
  document.getElementById('saveBtn').addEventListener('click', async () => {
    const d = {
      nome: document.getElementById('pfN').value,
      cognome: document.getElementById('pfC').value,
      dataNascita: document.getElementById('pfD').value,
      telefono: document.getElementById('pfTel').value,
      dataVisitaMedica: document.getElementById('pfVM').value,
      ruolo: document.getElementById('pfR').value,
      numeroMaglia: parseInt(document.getElementById('pfM').value) || 1,
      matricolaFigc: document.getElementById('pfFigc').value,
      tipoDocumento: document.getElementById('pfTD').value,
      numeroDocumento: document.getElementById('pfND').value,
      rilasciatoDa: document.getElementById('pfRD').value
    };
    showLoading();
    try {
      if (p) {
        await apiFetch('/calciatori/' + p.id, { method: 'PUT', body: JSON.stringify(d) });
      } else {
        await apiFetch('/squadre/' + window.YFM.squadraId + '/calciatori', { method: 'POST', body: JSON.stringify(d) });
      }
      closeModal();
      loadRoster();
    } catch (e) {
      alert(e.message);
    } finally {
      hideLoading();
    }
  });
}


// Espone la funzione di modifica giocatore sulla namespace globale YFM
try {
  window.YFM = window.YFM || {};
  if (typeof openPlayerForm === 'function') {
    window.YFM.openPlayerForm = openPlayerForm;
  }
} catch (e) {
  console.warn('Impossibile esporre openPlayerForm su window.YFM', e);
}
