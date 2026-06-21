import { apiFetch } from '../../services/api.js';
import { formatDateShort } from '../../utils/formatters.js';
import { showLoading, hideLoading } from '../../utils/ui.js';

// Scheda giocatore: dati base + stats stagione + carriera + ultime partite
export async function loadPlayerDetail(container, playerId) {
  if (!container) {
    console.error('Container non trovato per loadPlayerDetail');
    return;
  }

  showLoading('Caricamento scheda giocatore...');

  try {
    // 1) Dati anagrafici / profilo (critico)
    const player = await apiFetch('/calciatori/' + playerId);

    // 2) Le altre 3 chiamate sono "best effort": se falliscono non blocchiamo la pagina
    let currentSeasonStats = null;
    try {
      currentSeasonStats = await apiFetch('/calciatori/' + playerId + '/stats-current');
    } catch (e) {
      console.warn('Errore stats-current per giocatore', playerId, e);
      currentSeasonStats = null;
    }

    let career = [];
    try {
      career = await apiFetch('/calciatori/' + playerId + '/career');
    } catch (e) {
      console.warn('Errore career per giocatore', playerId, e);
      career = [];
    }

    let lastMatches = [];
    try {
      lastMatches = await apiFetch('/calciatori/' + playerId + '/last-matches?limit=10');
    } catch (e) {
      console.warn('Errore last-matches per giocatore', playerId, e);
      lastMatches = [];
    }

    hideLoading();
    renderPlayerDetail(container, { player, currentSeasonStats, career, lastMatches });
  } catch (e) {
    console.error(e);
    hideLoading();
    container.innerHTML = '<div class="error-box">Errore nel caricamento della scheda giocatore: ' +
      (e.message || 'errore sconosciuto') + '</div>';
  }
}

function renderPlayerDetail(container, data) {
  const { player, currentSeasonStats, career, lastMatches } = data;

  if (!player) {
    container.innerHTML = '<div class="error-box">Giocatore non trovato.</div>';
    return;
  }

  const nome = player.nome || '';
  const cognome = player.cognome || '';
  const initials = (nome[0] || '') + (cognome[0] || '');
  const ruolo = player.ruolo || '-';
  const numero = player.numero_maglia != null ? player.numero_maglia : '–';
  const piede = player.piede_preferito || 'n/d';

  const stagioneCorrente = (currentSeasonStats && currentSeasonStats.stagione) || '-';
  const partite = (currentSeasonStats && currentSeasonStats.partite_giocate) || 0;
  const minuti = (currentSeasonStats && currentSeasonStats.minuti) || 0;
  const gol = (currentSeasonStats && currentSeasonStats.gol) || 0;
  const assist = (currentSeasonStats && currentSeasonStats.assist) || 0;

  const careerRows = (career || []).map(function(s) {
    return '<tr>'
      + '<td style="padding:8px;">' + (s.stagione || '-') + '</td>'
      + '<td style="padding:8px;text-align:center;">' + (s.squadra || '-') + '</td>'
      + '<td style="padding:8px;text-align:center;">' + (s.partite || 0) + '</td>'
      + '<td style="padding:8px;text-align:center;">' + (s.minuti || 0) + '</td>'
      + '<td style="padding:8px;text-align:center;color:#27AE60;font-weight:600;">' + (s.gol || 0) + '</td>'
      + '<td style="padding:8px;text-align:center;color:#2980B9;font-weight:600;">' + (s.assist || 0) + '</td>'
      + '</tr>';
  }).join('');

  const matchRows = (lastMatches || []).map(function(m) {
    return '<tr>'
      + '<td style="padding:8px;">' + safeFormatDate(m.data_ora) + '</td>'
      + '<td style="padding:8px;">' + (m.avversario || '-') + '</td>'
      + '<td style="padding:8px;text-align:center;">' + (m.competizione || '-') + '</td>'
      + '<td style="padding:8px;text-align:center;">' + (m.minuti || 0) + '</td>'
      + '<td style="padding:8px;text-align:center;color:#27AE60;">' + (m.gol || 0) + '</td>'
      + '<td style="padding:8px;text-align:center;color:#2980B9;">' + (m.assist || 0) + '</td>'
      + '<td style="padding:8px;text-align:center;color:#E74C3C;">'
      + ((m.cartellini_gialli || 0) + '/' + (m.cartellini_rossi || 0))
      + '</td>'
      + '</tr>';
  }).join('');

  var dataNascita = player.data_nascita ? safeFormatDate(player.data_nascita) : 'n/d';
  var certificato = player.certificato_scadenza ? safeFormatDate(player.certificato_scadenza) : 'n/d';
  var stato = player.stato || 'attivo';

  container.innerHTML =
    '<div class="page-header" style="display:flex;justify-content:space-between;align-items:center;gap:12px;">'
      + '<div>'
        + '<button class="btn btn-secondary btn-small" id="btnBackRoster">← Torna alla rosa</button>'
      + '</div>'
      + '<div>'
        + '<button class="btn btn-primary btn-small" id="btnEditPlayer">Modifica giocatore</button>'
      + '</div>'
    + '</div>'
    + '<h1 class="page-title" style="margin-top:12px;">' + nome + ' ' + cognome + '</h1>'
    + '<p class="page-subtitle">'
      + ruolo + ' • N° ' + numero + ' • ' + dataNascita + ' • piede ' + piede
    + '</p>'
    + '<div class="grid-2" style="margin-top:20px;margin-bottom:20px;">'
      + '<div class="card" style="display:flex;align-items:center;gap:16px;">'
        + '<div class="player-avatar" style="width:64px;height:64px;font-size:24px;">'
          + initials.toUpperCase()
        + '</div>'
        + '<div style="flex:1;">'
          + '<div style="font-size:14px;color:var(--gray);margin-bottom:4px;">Stagione ' + stagioneCorrente + '</div>'
          + '<div style="display:flex;flex-wrap:wrap;gap:12px;font-size:13px;">'
            + '<div><strong>' + partite + '</strong> partite</div>'
            + '<div><strong>' + minuti + '</strong> minuti</div>'
            + '<div style="color:#27AE60;"><strong>' + gol + '</strong> gol</div>'
            + '<div style="color:#2980B9;"><strong>' + assist + '</strong> assist</div>'
          + '</div>'
        + '</div>'
      + '</div>'
      + '<div class="card">'
        + '<h3 class="section-title">Stato &amp; Note</h3>'
        + '<p style="font-size:13px;color:var(--gray);">'
          + 'Stato: <strong>' + stato + '</strong><br>'
          + 'Certificato medico: <strong>' + certificato + '</strong>'
        + '</p>'
      + '</div>'
    + '</div>'
    + '<div class="card">'
      + '<h3 class="section-title">Carriera</h3>'
      + ((career && career.length)
        ? '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:13px;">'
            + '<thead><tr style="background:#F8F9FA;">'
              + '<th style="padding:8px;text-align:left;">Stagione</th>'
              + '<th style="padding:8px;">Squadra</th>'
              + '<th style="padding:8px;">Partite</th>'
              + '<th style="padding:8px;">Minuti</th>'
              + '<th style="padding:8px;">Gol</th>'
              + '<th style="padding:8px;">Assist</th>'
            + '</tr></thead>'
            + '<tbody>' + careerRows + '</tbody>'
          + '</table></div>'
        : '<p style="color:var(--gray);">Nessun dato carriera disponibile.</p>')
    + '</div>'
    + '<div class="card" style="margin-top:20px;">'
      + '<h3 class="section-title">Ultime partite</h3>'
      + ((lastMatches && lastMatches.length)
        ? '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:13px;">'
            + '<thead><tr style="background:#F8F9FA;">'
              + '<th style="padding:8px;">Data</th>'
              + '<th style="padding:8px;">Avversario</th>'
              + '<th style="padding:8px;">Competizione</th>'
              + '<th style="padding:8px;">Min</th>'
              + '<th style="padding:8px;">Gol</th>'
              + '<th style="padding:8px;">Assist</th>'
              + '<th style="padding:8px;">Gialli/Rossi</th>'
            + '</tr></thead>'
            + '<tbody>' + matchRows + '</tbody>'
          + '</table></div>'
        : '<p style="color:var(--gray);">Nessuna partita recente registrata.</p>')
    + '</div>';

  var backBtn = document.getElementById('btnBackRoster');
  if (backBtn) {
    backBtn.addEventListener('click', function() {
      if (window.YFM && typeof window.YFM.navigateTo === 'function') {
        window.YFM.navigateTo('roster');
      } else if (typeof window.navigateTo === 'function') {
        window.navigateTo('roster');
      } else {
        console.warn('Funzione navigateTo non disponibile');
      }
    });
  }

  var editBtn = document.getElementById('btnEditPlayer');
  if (editBtn) {
    editBtn.addEventListener('click', function() {
      if (window.YFM && typeof window.YFM.openPlayerForm === 'function') {
        window.YFM.openPlayerForm(player.id);
      } else if (typeof window.openPlayerForm === 'function') {
        window.openPlayerForm(player.id);
      } else {
        console.warn('Funzione openPlayerForm non disponibile');
      }
    });
  }
}

function safeFormatDate(value) {
  if (!value) return 'n/d';
  try {
    return formatDateShort(value);
  } catch (e) {
    return 'n/d';
  }
}
