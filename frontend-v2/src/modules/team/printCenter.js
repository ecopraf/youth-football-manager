import { apiFetch } from '../../services/api.js';
import { showLoading, hideLoading } from '../../utils/ui.js';

let currentMatchId = null;
let matchList = [];
let docStatus = {};

export default async function printCenter() {
  const container = document.getElementById('pageContent');
  const squadraId = window.YFM.squadraId;
  if (!squadraId) {
    container.innerHTML = '<div class="empty-state">Seleziona una squadra</div>';
    return;
  }

  showLoading();
  try {
    const partite = await apiFetch('/squadre/' + squadraId + '/partite').catch(() => []);
    matchList = Array.isArray(partite) ? partite : [];
    const now = new Date();
    const future = matchList.filter(m => new Date(m.data_ora) >= now).sort((a, b) => new Date(a.data_ora) - new Date(b.data_ora));
    const past = matchList.filter(m => new Date(m.data_ora) < now).sort((a, b) => new Date(b.data_ora) - new Date(a.data_ora));
    currentMatchId = future[0]?.id || past[0]?.id || null;

    if (currentMatchId) {
      docStatus = await apiFetch('/squadre/' + squadraId + '/print-center-status?match_id=' + currentMatchId).catch(() => ({}));
    }
  } catch (e) {
    docStatus = {};
  }
  hideLoading();

  render(container);
}

function render(container) {
  const match = matchList.find(m => m.id === currentMatchId);
  const squadraId = window.YFM.squadraId;

  container.innerHTML = `
    <div class="pc-page">
      <div class="pc-header">
        <h1>📄 Print Center</h1>
      </div>

      <div class="pc-sections">
        <div class="pc-match-section">
          <div class="pc-section-title">⚽ Match Day</div>
          <div class="pc-match-selector">
            <label class="sr-only" for="pcMatchSelect">Seleziona partita</label>
            <select id="pcMatchSelect" class="pc-select">
              ${matchList.length === 0 ? '<option>Nessuna partita</option>' : ''}
              ${matchList.sort((a, b) => new Date(b.data_ora) - new Date(a.data_ora)).map(m => {
                const d = new Date(m.data_ora);
                const label = (m.avversario || 'TBD') + ' — ' + d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
                return `<option value="${m.id}" ${m.id === currentMatchId ? 'selected' : ''}>${label}</option>`;
              }).join('')}
            </select>
          </div>
          ${match ? renderMatchHeader(match) : ''}
          <div class="pc-grid">
            ${renderDocCard('convocazione', '📋', 'Convocazione', docStatus.convocazione)}
            ${renderDocCard('distinta', '👥', 'Distinta Gara', docStatus.distinta)}
            ${renderDocCard('formazione', '🧭', 'Formazione', docStatus.formazione)}
            ${renderDocCard('report', '📊', 'Report Gara', docStatus.report)}
          </div>
        </div>

        <div class="pc-section">
          <div class="pc-section-title">🏃 Allenamenti</div>
          <div class="pc-grid">
            ${renderDocCard('presenze', '📑', 'Registro Presenze', 'available', squadraId)}
            ${renderDocCard('report-squadra', '📈', 'Report Squadra', 'available', squadraId)}
          </div>
        </div>

        <div class="pc-section">
          <div class="pc-section-title">👥 Rosa</div>
          <div class="pc-grid">
            ${renderDocCard('rosa', '📋', 'Elenco Tesserati', 'available', squadraId)}
            ${renderDocCard('scadenze', '🏥', 'Scadenze Mediche', 'available', squadraId)}
          </div>
        </div>
      </div>

      ${renderRecenti()}
    </div>
    <style>${getStyles()}</style>
  `;

  // Bind selettore partita
  document.getElementById('pcMatchSelect')?.addEventListener('change', async (e) => {
    currentMatchId = e.target.value;
    if (currentMatchId) {
      showLoading();
      docStatus = await apiFetch('/squadre/' + window.YFM.squadraId + '/print-center-status?match_id=' + currentMatchId).catch(() => ({}));
      hideLoading();
    }
    render(container);
  });

  // Bind click su card — navigazione diretta
  container.querySelectorAll('.pc-card[data-available="true"]').forEach(card => {
    card.addEventListener('click', () => handleCardClick(card.dataset.tipo, card.dataset.id));
  });
}

function handleCardClick(tipo, id) {
  const match = matchList.find(m => m.id === id);
  addToHistory(tipo, id, getDocTitle(tipo, match));
  navigateToDoc(tipo, id);
}


function navigateToDoc(tipo, id) {
  // Assicura che allMatches contenga le partite caricate dal print center
  if (matchList.length > 0) {
    const existing = new Set((window.YFM.allMatches || []).map(m => m.id));
    const toAdd = matchList.filter(m => !existing.has(m.id));
    if (toAdd.length > 0) window.YFM.allMatches = [...(window.YFM.allMatches || []), ...toAdd];
  }
  if (tipo === 'convocazione') { window.YFM.openConvocation(id, true); return; }
  if (tipo === 'distinta') { window.YFM.openDistinta(id); return; }
  const pageMap = { formazione: 'printFormazione', report: 'printReport', presenze: 'printPresenze', rosa: 'printRosa', scadenze: 'printScadenze', 'report-squadra': 'reports' };
  const page = pageMap[tipo];
  if (page) {
    const params = { id };
    if (tipo === 'report-squadra') params.from = 'printCenter';
    window.YFM.navigateTo(page, params);
  } else {
    if (window.showToast) window.showToast('Documento non ancora disponibile', 'warning');
  }
}

function renderMatchHeader(match) {
  const d = new Date(match.data_ora);
  const dateStr = d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const timeStr = d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  const wsLogo = window.YFM.getWorkspaceLogo();
  const wsName = window.YFM.getSocietaName();
  const oppLogo = match.logo || null;
  return `
    <div class="pc-match-header">
      <div class="pc-match-teams">
        ${wsLogo ? `<img src="${wsLogo}" alt="" class="pc-match-logo" onerror="this.style.display='none'">` : ''}
        <span class="pc-match-name">${wsName}</span>
        <span class="pc-match-vs">vs</span>
        ${oppLogo ? `<img src="${oppLogo}" alt="" class="pc-match-logo" onerror="this.style.display='none'">` : ''}
        <span class="pc-match-name">${match.avversario || 'TBD'}</span>
      </div>
      <div class="pc-match-info">${dateStr} • ${timeStr} • ${match.luogo || ''}</div>
    </div>
  `;
}

function renderDocCard(tipo, icon, label, status, altId) {
  const id = altId || currentMatchId;
  const isAvailable = status === 'available' || status === true;
  const statusLabel = getStatusLabel(status);
  const statusClass = isAvailable ? 'pc-status-ok' : 'pc-status-wait';
  return `
    <div class="pc-card ${isAvailable ? 'pc-card-active' : 'pc-card-disabled'}" data-tipo="${tipo}" data-id="${id}" data-available="${isAvailable}">
      <div class="pc-card-icon">${icon}</div>
      <div class="pc-card-body">
        <div class="pc-card-label">${label}</div>
        <div class="pc-card-status ${statusClass}">${statusLabel}</div>
      </div>
    </div>
  `;
}

function getStatusLabel(status) {
  if (status === 'available' || status === true) return '✔ Disponibile';
  if (status === 'not_ready') return '⏳ Non compilata';
  if (status === 'post_match') return '🔒 Post-partita';
  if (status === false) return '⏳ Non disponibile';
  return '✔ Disponibile';
}

function renderRecenti() {
  const history = getHistory();
  if (history.length === 0) return '';
  return `
    <div class="pc-section" style="margin-top:20px;">
      <div class="pc-section-title">🕒 Recenti</div>
      <div class="pc-recenti">
        ${history.slice(0, 5).map(h => {
          const ago = timeAgo(h.timestamp);
          return `<div class="pc-recente-item">
            <span>✔ ${h.titolo}</span>
            <span class="pc-recente-ago">${ago}</span>
          </div>`;
        }).join('')}
      </div>
    </div>
  `;
}

function getDocTitle(tipo, match) {
  const labels = { convocazione: 'Convocazione', distinta: 'Distinta Gara', formazione: 'Formazione', report: 'Report Gara', presenze: 'Registro Presenze', 'report-squadra': 'Report Squadra', rosa: 'Elenco Tesserati', scadenze: 'Scadenze Mediche' };
  const base = labels[tipo] || tipo;
  if (match?.avversario) return base + ' — ' + match.avversario;
  return base;
}

// ── Cronologia (localStorage) ──
const HISTORY_KEY = 'yfm_print_history';

function getHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { return []; }
}

function addToHistory(tipo, id, titolo) {
  const history = getHistory();
  history.unshift({ tipo, id, titolo, timestamp: Date.now() });
  const seen = new Set();
  const unique = history.filter(h => {
    const key = h.tipo + h.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 10);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(unique));
}

function timeAgo(ts) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return mins + ' min fa';
  const hours = Math.floor(mins / 60);
  if (hours < 24) return hours + 'h fa';
  const days = Math.floor(hours / 24);
  return days + 'gg fa';
}

// ── Styles ──
function getStyles() {
  return `
.pc-page { max-width: 700px; margin: 0 auto; padding: 16px; }
.pc-header h1 { font-size: 22px; margin: 0 0 16px; }
.pc-match-selector { margin-bottom: 12px; }
.pc-select { width: 100%; padding: 10px 12px; border: 1px solid #ddd; border-radius: 10px; font-size: 14px; background: white; }
.pc-match-header { background: linear-gradient(135deg, #667eea, #764ba2); color: white; border-radius: 10px; padding: 14px; margin-bottom: 12px; text-align: center; }
.pc-match-teams { display: flex; align-items: center; justify-content: center; gap: 8px; flex-wrap: wrap; }
.pc-match-logo { width: 28px; height: 28px; border-radius: 50%; object-fit: contain; }
.pc-match-name { font-weight: 700; font-size: 15px; }
.pc-match-vs { opacity: 0.7; font-size: 13px; }
.pc-match-info { margin-top: 6px; font-size: 12px; opacity: 0.85; }
.pc-sections { display: flex; flex-direction: column; gap: 20px; }
.pc-match-section { background: linear-gradient(135deg, #f0f4ff 0%, #e8eeff 100%); border: 1px solid #d4ddff; border-radius: 14px; padding: 16px; }
.pc-section-title { font-weight: 700; font-size: 14px; margin-bottom: 10px; color: #333; }
.pc-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; }
.pc-card { display: flex; align-items: center; gap: 10px; padding: 14px; background: white; border-radius: 12px; border: 1px solid #eee; cursor: pointer; transition: transform 0.15s, box-shadow 0.15s; }
.pc-card-active:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(102,126,234,0.15); border-color: #667eea; }
.pc-card-disabled { opacity: 0.55; cursor: not-allowed; }
.pc-card-icon { font-size: 24px; }
.pc-card-body { flex: 1; min-width: 0; }
.pc-card-label { font-weight: 600; font-size: 13px; }
.pc-card-status { font-size: 11px; margin-top: 2px; }
.pc-status-ok { color: #27AE60; }
.pc-status-wait { color: #F39C12; }
.pc-recenti { display: flex; flex-direction: column; gap: 6px; }
.pc-recente-item { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: #f9f9f9; border-radius: 8px; font-size: 13px; }
.pc-recente-ago { color: #888; font-size: 11px; }
.pc-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 2000; display: flex; align-items: center; justify-content: center; }
@keyframes scale-in { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
@media (max-width: 500px) {
  .pc-grid { grid-template-columns: 1fr 1fr; gap: 8px; }
  .pc-card { padding: 10px; }
  .pc-card-icon { font-size: 20px; }
  .pc-card-label { font-size: 12px; }
}
`;
}
