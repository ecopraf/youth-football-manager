/**
 * training.js - Orchestratore pagina Allenamenti
 * Assembla: Calendario mensile + Dettaglio seduta + Config + Riepilogo
 */

import { apiFetch } from '../../services/api';
import { renderCalendar, attachCalendarListeners, setOnDateSelect, selectTodayIfTraining, getSelectedDate } from './trainingCalendar';
import { renderSession, attachSessionListeners } from './trainingSession';
import { renderConfig, renderSummary, attachConfigListeners } from './trainingConfig';

let trainingData = null;

export default async function loadTraining() {
  const c = document.getElementById('pageContent');
  c.innerHTML = '<div class="loading"><div class="spinner"></div>Caricamento...</div>';

  try {
    const ts = Date.now();
    const [config, presenze, giocatori, sumData] = await Promise.all([
      apiFetch('/squadre/' + window.YFM.squadraId + '/allenamenti/config?_=' + ts).catch(() => []),
      apiFetch('/squadre/' + window.YFM.squadraId + '/allenamenti/presenze?_=' + ts).catch(() => []),
      apiFetch('/squadre/' + window.YFM.squadraId + '/calciatori?_=' + ts).catch(() => []),
      apiFetch('/squadre/' + window.YFM.squadraId + '/allenamenti/summary?_=' + ts).catch(() => ({ summary: {}, settimana: {} }))
    ]);

    window.YFM.allPlayers = giocatori;
    trainingData = {
      config,
      giocatori,
      presenze,
      summary: sumData.summary || {},
      settimana: sumData.settimana || {}
    };

    renderPage(c);
  } catch (e) {
    c.innerHTML = '<div class="error-box">' + e.message + '</div>';
  }
}

function renderPage(c) {
  const { config, giocatori, presenze, summary, settimana } = trainingData;

  selectTodayIfTraining(config);

  setOnDateSelect((date) => {
    renderSessionSection(date);
  });

  window._trainingRefreshCalendar = () => {
    const calEl = document.getElementById('trainingCalendar');
    if (calEl) {
      calEl.innerHTML = renderCalendar(config, presenze);
      attachCalendarListeners();
    }
  };

  c.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
      <h1 class="page-title">Allenamenti ${window.YFM.getSquadraName()}</h1>
    </div>

    <!-- Calendario Mensile -->
    <div class="card" style="margin-bottom:16px;">
      <div id="trainingCalendar">
        ${renderCalendar(config, presenze)}
      </div>
    </div>

    <!-- Dettaglio Seduta Selezionata -->
    <div class="card" style="margin-bottom:16px;" id="sessionContainer">
      <div class="loading"><div class="spinner"></div>Caricamento...</div>
    </div>

    <!-- Settimana Tipo (collassabile) -->
    ${renderConfig(config)}

    <!-- Riepilogo Presenze -->
    ${renderSummary(giocatori, summary, settimana)}
  `;

  attachCalendarListeners();
  attachConfigListeners(trainingData, () => loadTraining());

  // Carica sessione in modo asincrono
  renderSessionSection(getSelectedDate());
}

function renderSessionSection(date) {
  const container = document.getElementById('sessionContainer');
  if (!container) return;
  container.innerHTML = '<div class="loading"><div class="spinner"></div>Caricamento...</div>';
  renderSession(date, trainingData).then(html => {
    container.innerHTML = html;
    attachSessionListeners(date, trainingData, () => loadTraining());
  });
}
