/**
 * trainingData.js - Caricamento dati condiviso per le sotto-pagine allenamenti
 */

import { apiFetch } from '../../services/api';

export async function loadTrainingData() {
  try {
    const ts = Date.now();
    const [config, presenze, giocatori, sumData, partite] = await Promise.all([
      apiFetch('/squadre/' + window.YFM.squadraId + '/allenamenti/config?_=' + ts).catch(() => []),
      apiFetch('/squadre/' + window.YFM.squadraId + '/allenamenti/presenze?_=' + ts).catch(() => []),
      apiFetch('/squadre/' + window.YFM.squadraId + '/calciatori?_=' + ts).catch(() => []),
      apiFetch('/squadre/' + window.YFM.squadraId + '/allenamenti/summary?_=' + ts).catch(() => ({ summary: {}, settimana: {} })),
      apiFetch('/squadre/' + window.YFM.squadraId + '/partite').catch(() => [])
    ]);

    window.YFM.allPlayers = giocatori;
    window.YFM.allMatches = partite;

    return {
      config,
      giocatori,
      presenze,
      partite,
      summary: sumData.summary || {},
      settimana: sumData.settimana || {},
      motiviTotali: sumData.motiviTotali || {}
    };
  } catch (e) {
    document.getElementById('pageContent').innerHTML = '<div class="error-box">' + e.message + '</div>';
    return null;
  }
}
