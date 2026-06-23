import { apiFetch } from '../../services/api.js';
import { formatDateShort } from '../../utils/formatters.js';
import { showLoading, hideLoading } from '../../utils/ui.js';

export async function loadPlayerDetail(container, playerId) {
  if (!container) {
    console.error('Container non trovato per loadPlayerDetail');
    return;
  }

  showLoading('Caricamento scheda giocatore...');

  try {
    const player = await apiFetch('/calciatori/' + playerId);

    let currentSeasonStats = null;
    try {
      currentSeasonStats = await apiFetch('/calciatori/' + playerId + '/stats-current');
    } catch (e) {
      currentSeasonStats = null;
    }

    let career = [];
    try {
      career = await apiFetch('/calciatori/' + playerId + '/career');
    } catch (e) {
      career = [];
    }

    let lastMatches = [];
    try {
      lastMatches = await apiFetch('/calciatori/' + playerId + '/last-matches?limit=10');
    } catch (e) {
      lastMatches = [];
    }

    let valutazioni = null;
    try {
      valutazioni = await apiFetch('/giocatori/' + playerId + '/valutazioni');
    } catch (e) {
      valutazioni = null;
    }

    hideLoading();
    renderPlayerDetail(container, { player, currentSeasonStats, career, lastMatches, valutazioni });
  } catch (e) {
    console.error(e);
    hideLoading();
    container.innerHTML = '<div class="error-box">Errore: ' + (e.message || 'errore sconosciuto') + '</div>';
  }
}

function renderPlayerDetail(container, data) {
  const { player, currentSeasonStats, career, lastMatches, valutazioni } = data;

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
  const dataMorte = player.data_nascita ? safeFormatDate(player.data_nascita) : 'n/d';
  const certificato = player.certificato_scadenza ? safeFormatDate(player.certificato_scadenza) : 'n/d';
  const stato = player.stato || 'attivo';

  const stagioneCorrente = (currentSeasonStats && currentSeasonStats.stagione) || '-';
  const partite = (currentSeasonStats && currentSeasonStats.partite_giocate) || 0;
  const minuti = (currentSeasonStats && currentSeasonStats.minuti) || 0;
  const gol = (currentSeasonStats && currentSeasonStats.gol) || 0;
  const assist = (currentSeasonStats && currentSeasonStats.assist) || 0;

  // Sezione valutazioni
  const valutazioniSection = valutazioni && valutazioni.partiteValutate > 0 ? `
    <div class="card" style="background:linear-gradient(135deg,#667eea10,#764ba210);border:1px solid #667eea30;">
      <h3 class="section-title" style="color:#667eea;">⭐ Valutazioni</h3>
      <div style="display:flex;gap:20px;align-items:center;flex-wrap:wrap;">
        <div style="text-align:center;">
          <div style="font-size:32px;font-weight:bold;color:#667eea;">${valutazioni.media}</div>
          <div style="font-size:11px;color:#666;">Media Voto</div>
        </div>
        <div style="flex:1;">
          <div style="font-size:12px;color:#666;margin-bottom:4px;">${valutazioni.partiteValutate} partite valutate</div>
          ${valutazioni.migliore ? '<div style="font-size:12px;">🏆 Migliore: <strong>' + valutazioni.migliore.voto + '</strong> vs ' + valutazioni.migliore.avversario + '</div>' : ''}
          ${valutazioni.peggiore ? '<div style="font-size:12px;">📉 Peggiore: <strong>' + valutazioni.peggiore.voto + '</strong> vs ' + valutazioni.peggiore.avversario + '</div>' : ''}
        </div>
      </div>
      ${valutazioni.storico && valutazioni.storico.length > 0 ? `
      <div style="margin-top:12px;padding-top:12px;border-top:1px solid #eee;">
        <div style="font-size:11px;color:#888;margin-bottom:6px;">STORICO VALUTAZIONI</div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;">
          ${valutazioni.storico.slice(0, 8).map(v => `<span style="padding:4px 10px;background:white;border-radius:12px;font-size:12px;border:1px solid #eee;"><strong>${v.voto}</strong> ${v.partita ? '(' + v.partita + ')' : ''}</span>`).join('')}
        </div>
      </div>` : ''}
    </div>` : '';

  // Sezione carriera
  const careerRows = (career || []).map(s => `
    <tr>
      <td style="padding:8px;">${s.stagione || '-'}</td>
      <td style="padding:8px;text-align:center;">${s.squadra || '-'}</td>
      <td style="padding:8px;text-align:center;">${s.partite || 0}</td>
      <td style="padding:8px;text-align:center;">${s.minuti || 0}</td>
      <td style="padding:8px;text-align:center;color:#27AE60;font-weight:600;">${s.gol || 0}</td>
      <td style="padding:8px;text-align:center;color:#2980B9;font-weight:600;">${s.assist || 0}</td>
    </tr>`).join('');

  const careerSection = career && career.length ? `
    <div class="card">
      <h3 class="section-title">Carriera</h3>
      <div style="overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead><tr style="background:#F8F9FA;">
            <th style="padding:8px;text-align:left;">Stagione</th>
            <th style="padding:8px;">Squadra</th>
            <th style="padding:8px;">Partite</th>
            <th style="padding:8px;">Minuti</th>
            <th style="padding:8px;">Gol</th>
            <th style="padding:8px;">Assist</th>
          </tr></thead>
          <tbody>${careerRows}</tbody>
        </table>
      </div>
    </div>` : '<div class="card"><h3 class="section-title">Carriera</h3><p style="color:var(--gray);">Nessun dato carriera disponibile.</p></div>';

  // Sezione ultime partite
  const matchRows = (lastMatches || []).map(m => `
    <tr>
      <td style="padding:8px;">${safeFormatDate(m.data_ora)}</td>
      <td style="padding:8px;">${m.avversario || '-'}</td>
      <td style="padding:8px;text-align:center;">${m.competizione || '-'}</td>
      <td style="padding:8px;text-align:center;">${m.minuti || 0}</td>
      <td style="padding:8px;text-align:center;color:#27AE60;">${m.gol || 0}</td>
      <td style="padding:8px;text-align:center;color:#2980B9;">${m.assist || 0}</td>
      <td style="padding:8px;text-align:center;color:#E74C3C;">${m.cartellini_gialli || 0}/${m.cartellini_rossi || 0}</td>
    </tr>`).join('');

  const lastMatchesSection = lastMatches && lastMatches.length ? `
    <div class="card" style="margin-top:20px;">
      <h3 class="section-title">Ultime partite</h3>
      <div style="overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead><tr style="background:#F8F9FA;">
            <th style="padding:8px;">Data</th>
            <th style="padding:8px;">Avversario</th>
            <th style="padding:8px;">Competizione</th>
            <th style="padding:8px;">Min</th>
            <th style="padding:8px;">Gol</th>
            <th style="padding:8px;">Assist</th>
            <th style="padding:8px;">Gialli/Rossi</th>
          </tr></thead>
          <tbody>${matchRows}</tbody>
        </table>
      </div>
    </div>` : '';

  container.innerHTML = `
    <div class="page-header" style="display:flex;justify-content:space-between;align-items:center;gap:12px;">
      <div>
        <button class="btn btn-secondary btn-small" id="btnBackRoster">← Torna alla rosa</button>
      </div>
      <div>
        <button class="btn btn-primary btn-small" id="btnEditPlayer">Modifica giocatore</button>
      </div>
    </div>
    <h1 class="page-title" style="margin-top:12px;">${nome} ${cognome}</h1>
    <p class="page-subtitle">${ruolo} • N° ${numero} • ${dataMorte} • piede ${piede}</p>
    <div class="grid-2" style="margin-top:20px;margin-bottom:20px;">
      <div class="card" style="display:flex;align-items:center;gap:16px;">
        <div class="player-avatar" style="width:64px;height:64px;font-size:24px;">${initials.toUpperCase()}</div>
        <div style="flex:1;">
          <div style="font-size:14px;color:var(--gray);margin-bottom:4px;">Stagione ${stagioneCorrente}</div>
          <div style="display:flex;flex-wrap:wrap;gap:12px;font-size:13px;">
            <div><strong>${partite}</strong> partite</div>
            <div><strong>${minuti}</strong> minuti</div>
            <div style="color:#27AE60;"><strong>${gol}</strong> gol</div>
            <div style="color:#2980B9;"><strong>${assist}</strong> assist</div>
          </div>
        </div>
      </div>
      <div class="card">
        <h3 class="section-title">Stato & Note</h3>
        <p style="font-size:13px;color:var(--gray);">
          Stato: <strong>${stato}</strong><br>
          Certificato medico: <strong>${certificato}</strong>
        </p>
      </div>
    </div>
    ${valutazioniSection}
    ${careerSection}
    ${lastMatchesSection}
  `;

  document.getElementById('btnBackRoster')?.addEventListener('click', () => {
    if (window.YFM?.navigateTo) window.YFM.navigateTo('roster');
    else if (window.navigateTo) window.navigateTo('roster');
  });

  document.getElementById('btnEditPlayer')?.addEventListener('click', () => {
    if (window.YFM?.openPlayerForm) window.YFM.openPlayerForm(player.id);
    else if (window.openPlayerForm) window.openPlayerForm(player.id);
  });
}

function safeFormatDate(value) {
  if (!value) return 'n/d';
  try {
    return formatDateShort(value);
  } catch (e) {
    return 'n/d';
  }
}
