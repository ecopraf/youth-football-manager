import { apiFetch } from '../../services/api.js';
import { showLoading, hideLoading } from '../../utils/ui.js';

// Stato modulo
let allPlayers = [];
let activeView = 'rosa'; // 'rosa' | 'giocatore'
let selectedPlayerId = null;
let selectedTpId = null;
let activeTipo = 'campionato'; // 'campionato' | 'amichevole' | 'tutte'
let tipoFallback = false; // true se siamo in fallback automatico

const RUOLI_REPARTO = {
  'Portiere': 'Portieri',
  'Difensore': 'Difensori',
  'Terzino': 'Difensori',
  'Centrocampista': 'Centrocampisti',
  'Mezzala': 'Centrocampisti',
  'Trequartista': 'Centrocampisti',
  'Attaccante': 'Attaccanti',
  'Ala': 'Attaccanti',
  'Punta': 'Attaccanti'
};

function getRepartoLabel(ruolo) {
  if (!ruolo) return 'Altro';
  for (const [k, v] of Object.entries(RUOLI_REPARTO)) {
    if (ruolo.toLowerCase().includes(k.toLowerCase())) return v;
  }
  return 'Altro';
}

function trendBadge(trend) {
  if (trend === 'up') return '<span style="color:#27AE60;font-weight:700;">⬆</span>';
  if (trend === 'down') return '<span style="color:#E74C3C;font-weight:700;">⬇</span>';
  if (trend === 'stable') return '<span style="color:#F39C12;font-weight:700;">➡</span>';
  return '<span style="color:#ccc;">—</span>';
}

function mediaColor(media) {
  if (media === null) return '#aaa';
  if (media >= 7) return '#27AE60';
  if (media >= 6) return '#F39C12';
  return '#E74C3C';
}

function fmtMedia(media) {
  if (media === null) return '<span style="color:#aaa;">SV</span>';
  return `<span style="color:${mediaColor(media)};font-weight:700;">${media.toFixed(2)}</span>`;
}

export default async function loadPlayerPerformance() {
  const c = document.getElementById('pageContent');
  c.innerHTML = `
    <style>
      .pp-header{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:16px;}
      .pp-card{background:#fff;border-radius:12px;padding:16px;box-shadow:0 2px 8px rgba(0,0,0,0.08);margin-bottom:16px;}
      .pp-section-title{font-weight:700;font-size:14px;color:#374151;margin-bottom:12px;}
      .pp-top-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;}
      .pp-top-item{background:#f8f9ff;border-radius:10px;padding:12px;display:flex;flex-direction:column;gap:4px;cursor:pointer;transition:box-shadow .15s;}
      .pp-top-item:hover{box-shadow:0 4px 12px rgba(102,126,234,0.2);}
      .pp-top-rank{font-size:20px;font-weight:800;color:#667eea;}
      .pp-top-name{font-size:13px;font-weight:600;color:#1f2937;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
      .pp-top-meta{font-size:11px;color:#6b7280;}
      .pp-reparto-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;}
      .pp-reparto-item{border-radius:10px;padding:12px;text-align:center;}
      .pp-reparto-label{font-size:12px;font-weight:600;color:#374151;margin-bottom:4px;}
      .pp-reparto-media{font-size:22px;font-weight:800;}
      .pp-reparto-n{font-size:11px;color:#6b7280;}
      .pp-table{width:100%;border-collapse:collapse;font-size:13px;}
      .pp-table th{text-align:left;padding:8px 6px;border-bottom:2px solid #e5e7eb;color:#6b7280;font-weight:600;font-size:11px;text-transform:uppercase;}
      .pp-table td{padding:8px 6px;border-bottom:1px solid #f3f4f6;vertical-align:middle;}
      .pp-table tr:hover td{background:#f8f9ff;cursor:pointer;}
      .pp-no-data{text-align:center;padding:32px;color:#9ca3af;font-size:14px;}
      .pp-back-btn{background:none;border:none;color:#667eea;font-size:13px;cursor:pointer;padding:4px 0;font-weight:600;}
      .pp-back-btn:hover{text-decoration:underline;}
      .pp-alert-item{display:flex;align-items:center;gap:8px;padding:8px 10px;background:#fff7ed;border-radius:8px;margin-bottom:6px;font-size:13px;}
      @media(max-width:600px){
        .pp-table th:nth-child(n+5),.pp-table td:nth-child(n+5){display:none;}
        .pp-top-grid{grid-template-columns:1fr 1fr;}
      }
    </style>
    <div id="ppContent"></div>
  `;

  showLoading('Caricamento performance...');
  try {
    const teamId = window.YFM?.squadraId;
    if (!teamId) { hideLoading(); document.getElementById('ppContent').innerHTML = '<p style="padding:24px;color:#9ca3af;">Seleziona una squadra per vedere le performance.</p>'; return; }

    // Default: campionato. Fallback automatico se <3 partite di campionato
    activeTipo = 'campionato';
    tipoFallback = false;
    let data = await apiFetch(`/squadre/${teamId}/performance-summary?tipo=campionato`);
    if (document.getElementById('pageContent') !== c) return;

    const conVoti = (data || []).filter(p => p.n_valutazioni >= 3);
    if (conVoti.length < 3) {
      // Fallback: prova con tutte le partite
      data = await apiFetch(`/squadre/${teamId}/performance-summary?tipo=tutte`);
      if (document.getElementById('pageContent') !== c) return;
      activeTipo = 'tutte';
      tipoFallback = true;
    }

    allPlayers = data || [];
    hideLoading();
    renderRosa(c);
  } catch (e) {
    hideLoading();
    if (document.getElementById('pageContent') === c)
      document.getElementById('ppContent').innerHTML = `<p style="padding:24px;color:#E74C3C;">Errore caricamento: ${e.message}</p>`;
  }
}

function renderRosa(c) {
  activeView = 'rosa';
  const container = document.getElementById('ppContent');
  if (!container) return;

  const conValutazioni = allPlayers.filter(p => p.n_valutazioni >= 3);
  const insufficienti = conValutazioni.length < 3;

  const tipoLabels = { campionato: '🏆 Campionato', amichevole: '⚽ Amichevoli', tutte: '📋 Tutte' };
  const filterBar = `
    <style>.pp-tipo-btn{font-size:11px;padding:4px 12px;border-radius:20px;border:1px solid #e5e7eb;background:#f9fafb;color:#374151;cursor:pointer;}
    .pp-tipo-btn.active{background:#667eea;color:#fff;border-color:#667eea;}</style>
    <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
      ${['campionato','amichevole','tutte'].map(t => `
        <button class="pp-tipo-btn${activeTipo === t ? ' active' : ''}" data-tipo="${t}">${tipoLabels[t]}</button>
      `).join('')}
    </div>
    ${tipoFallback ? `<div style="font-size:11px;color:#F39C12;margin-top:4px;">⚠️ Pochi dati campionato — mostro tutte le partite</div>` : ''}
  `;

  if (insufficienti) {
    const msgInsuff = activeTipo === 'campionato'
      ? 'Nessuna partita di campionato con valutazioni. Prova a selezionare \'Tutte\'.'
      : activeTipo === 'amichevole'
      ? 'Nessuna amichevole con valutazioni inserite.'
      : 'Servono almeno 3 giocatori con valutazioni inserite.<br>Inserisci le valutazioni dal Match Center dopo ogni partita.';
    container.innerHTML = `
      <div class="pp-header">
        <div style="font-size:18px;font-weight:800;color:#1f2937;">⭐ Performance Center</div>
        <div>${filterBar}</div>
      </div>
      <div class="pp-card" style="text-align:center;padding:40px;">
        <div style="font-size:48px;margin-bottom:12px;">📊</div>
        <div style="font-size:16px;font-weight:700;color:#374151;margin-bottom:8px;">Dati insufficienti</div>
        <div style="font-size:13px;color:#6b7280;">${msgInsuff}</div>
      </div>`;
    container.querySelectorAll('.pp-tipo-btn').forEach(btn => btn.addEventListener('click', () => reloadTipo(c, btn.dataset.tipo)));
    return;
  }

  container.innerHTML = `
    <div class="pp-header">
      <div style="font-size:18px;font-weight:800;color:#1f2937;">⭐ Performance Center</div>
      <div>
        ${filterBar}
      </div>
    </div>
    ${renderTopPerformer(conValutazioni)}
    ${renderAnalisiReparto(conValutazioni)}
    ${renderClassificaRosa(conValutazioni)}
    ${renderSenzaValutazioni()}
  `;

  container.querySelectorAll('.pp-tipo-btn').forEach(btn => btn.addEventListener('click', () => reloadTipo(c, btn.dataset.tipo)));
  container.querySelectorAll('[data-player-id]').forEach(el => {
    el.addEventListener('click', () => {
      selectedPlayerId = el.dataset.playerId;
      selectedTpId = el.dataset.tpId;
      renderGiocatore(c);
    });
  });
}

async function reloadTipo(c, tipo) {
  const teamId = window.YFM?.squadraId;
  if (!teamId) return;
  activeTipo = tipo;
  tipoFallback = false;
  showLoading('Caricamento...');
  try {
    const data = await apiFetch(`/squadre/${teamId}/performance-summary?tipo=${tipo}`);
    if (document.getElementById('pageContent') !== c) return;
    allPlayers = data || [];
    hideLoading();
    renderRosa(c);
  } catch (e) {
    hideLoading();
  }
}

function renderTopPerformer(players) {
  const sorted = [...players].filter(p => p.media !== null).sort((a, b) => b.media - a.media).slice(0, 5);
  if (sorted.length === 0) return '';
  const medals = ['🥇', '🥈', '🥉', '4°', '5°'];

  return `
    <div class="pp-card">
      <div class="pp-section-title">🏆 Top Performer</div>
      <div class="pp-top-grid">
        ${sorted.map((p, i) => `
          <div class="pp-top-item" data-player-id="${p.player_id}" data-tp-id="${p.team_player_id}">
            <div class="pp-top-rank">${medals[i]}</div>
            <div class="pp-top-name">${p.cognome} ${p.nome?.charAt(0) || ''}.</div>
            <div style="display:flex;align-items:center;gap:6px;margin-top:2px;">
              ${fmtMedia(p.media)}
              ${trendBadge(p.trend)}
            </div>
            <div class="pp-top-meta">${p.n_valutazioni} partite · ${p.minuti_totali}' giocati</div>
          </div>
        `).join('')}
      </div>
    </div>`;
}

function renderAnalisiReparto(players) {
  const reparti = {};
  players.forEach(p => {
    if (p.media === null) return;
    const r = getRepartoLabel(p.ruolo);
    if (!reparti[r]) reparti[r] = [];
    reparti[r].push(p.media);
  });

  const ordine = ['Portieri', 'Difensori', 'Centrocampisti', 'Attaccanti', 'Altro'];
  const items = ordine.filter(r => reparti[r]).map(r => {
    const voti = reparti[r];
    const media = voti.reduce((a, b) => a + b, 0) / voti.length;
    const emoji = media >= 7 ? '🟢' : media >= 6 ? '🟡' : '🔴';
    return { r, media, emoji, n: voti.length };
  });

  if (items.length === 0) return '';

  return `
    <div class="pp-card">
      <div class="pp-section-title">📊 Analisi per Reparto</div>
      <div class="pp-reparto-grid">
        ${items.map(({ r, media, emoji, n }) => `
          <div class="pp-reparto-item" style="background:${media >= 7 ? '#f0fdf4' : media >= 6 ? '#fffbeb' : '#fef2f2'};">
            <div class="pp-reparto-label">${r}</div>
            <div class="pp-reparto-media" style="color:${mediaColor(media)};">${emoji} ${media.toFixed(2)}</div>
            <div class="pp-reparto-n">${n} giocatori</div>
          </div>
        `).join('')}
      </div>
    </div>`;
}

function renderClassificaRosa(players) {
  const sorted = [...players].sort((a, b) => {
    if (a.media === null && b.media === null) return 0;
    if (a.media === null) return 1;
    if (b.media === null) return -1;
    return b.media - a.media;
  });

  return `
    <div class="pp-card">
      <div class="pp-section-title">📋 Classifica Rosa</div>
      <table class="pp-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Giocatore</th>
            <th>Media</th>
            <th>Trend</th>
            <th>Presenze</th>
            <th>⚽</th>
            <th>🅰️</th>
          </tr>
        </thead>
        <tbody>
          ${sorted.map((p, i) => `
            <tr data-player-id="${p.player_id}" data-tp-id="${p.team_player_id}">
              <td style="color:#9ca3af;font-size:12px;">${i + 1}</td>
              <td style="font-weight:600;">${p.cognome} ${p.nome?.charAt(0) || ''}.</td>
              <td>${fmtMedia(p.media)}</td>
              <td>${trendBadge(p.trend)}</td>
              <td style="color:#6b7280;">${p.n_valutazioni}</td>
              <td style="color:#6b7280;">${p.gol || 0}</td>
              <td style="color:#6b7280;">${p.assist || 0}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>`;
}

function renderSenzaValutazioni() {
  // Giocatori con 0 valutazioni (reminder allenatore)
  const senza = allPlayers.filter(p => p.n_valutazioni === 0);
  if (senza.length === 0) return '';

  return `
    <div class="pp-card">
      <div class="pp-section-title">⚠️ Senza valutazioni</div>
      <div style="font-size:12px;color:#6b7280;margin-bottom:10px;">${senza.length} giocatori senza nessuna valutazione inserita.</div>
      ${senza.slice(0, 8).map(p => `
        <div class="pp-alert-item">
          <span style="font-size:16px;">👤</span>
          <span style="font-weight:600;">${p.cognome} ${p.nome || ''}</span>
          <span style="color:#9ca3af;font-size:11px;">${p.ruolo || '—'}</span>
        </div>
      `).join('')}
      ${senza.length > 8 ? `<div style="font-size:12px;color:#9ca3af;margin-top:6px;">...e altri ${senza.length - 8}</div>` : ''}
    </div>`;
}

async function renderGiocatore(c) {
  activeView = 'giocatore';
  const container = document.getElementById('ppContent');
  if (!container) return;

  const teamId = window.YFM?.squadraId;
  container.innerHTML = `<div style="padding:24px;text-align:center;color:#9ca3af;">Caricamento...</div>`;

  try {
    const detail = await apiFetch(`/calciatori/${selectedPlayerId}/performance-detail?team_id=${teamId}&tipo=${activeTipo}`);
    if (document.getElementById('pageContent') !== c) return;

    const p = allPlayers.find(x => x.player_id === selectedPlayerId) || {};
    const nome = `${detail.player?.cognome || ''} ${detail.player?.nome || ''}`.trim();

    if (detail.n_valutazioni < 3) {
      container.innerHTML = `
        <button class="pp-back-btn" id="ppBack">← Torna alla rosa</button>
        <div class="pp-card" style="text-align:center;padding:32px;margin-top:12px;">
          <div style="font-size:36px;margin-bottom:8px;">📊</div>
          <div style="font-weight:700;color:#374151;">${nome}</div>
          <div style="font-size:13px;color:#9ca3af;margin-top:8px;">Dati insufficienti — servono almeno 3 valutazioni.</div>
        </div>`;
      document.getElementById('ppBack').addEventListener('click', () => renderRosa(c));
      return;
    }

    const trendLabel = detail.trend === 'up' ? '⬆ In crescita' : detail.trend === 'down' ? '⬇ In calo' : detail.trend === 'stable' ? '➡ Stabile' : '—';
    const trendColor = detail.trend === 'up' ? '#27AE60' : detail.trend === 'down' ? '#E74C3C' : '#F39C12';

    container.innerHTML = `
      <button class="pp-back-btn" id="ppBack">← Torna alla rosa</button>

      <div class="pp-card" style="margin-top:12px;">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
          <div>
            <div style="font-size:18px;font-weight:800;color:#1f2937;">${nome}</div>
            <div style="font-size:12px;color:#6b7280;">${detail.ruolo || '—'} · ${detail.n_valutazioni} partite valutate</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:28px;font-weight:800;color:${mediaColor(detail.media)};">${detail.media?.toFixed(2) || 'SV'}</div>
            <div style="font-size:12px;font-weight:600;color:${trendColor};">${trendLabel}</div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(100px,1fr));gap:8px;margin-top:14px;">
          ${[
            ['Ultimi ' + Math.floor(detail.n_valutazioni / 2) + ' voti', detail.media_ultimi5?.toFixed(2) ?? '—'],
            ['Primi ' + Math.ceil(detail.n_valutazioni / 2) + ' voti', detail.media_precedenti?.toFixed(2) ?? '—'],
            ['Miglior voto', detail.miglior_voto?.toFixed(1) ?? '—'],
            ['Peggior voto', detail.peggior_voto?.toFixed(1) ?? '—'],
          ].map(([label, val]) => `
            <div style="background:#f8f9ff;border-radius:8px;padding:10px;text-align:center;">
              <div style="font-size:16px;font-weight:700;color:#374151;">${val}</div>
              <div style="font-size:10px;color:#9ca3af;margin-top:2px;">${label}</div>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="pp-card">
        <div class="pp-section-title">📈 Trend voti (ultime partite)</div>
        <canvas id="ppTrendChart" height="130" style="width:100%;"></canvas>
      </div>

      ${renderMediaMensile(detail.media_mensile)}
      ${renderListaPartite(detail.partite)}
    `;

    document.getElementById('ppBack').addEventListener('click', () => renderRosa(c));

    // Disegna grafico trend
    const canvas = document.getElementById('ppTrendChart');
    if (canvas && detail.partite?.length > 0) {
      const { drawSimpleLineChart } = await import('../../utils/charts.js');
      const votiConData = detail.partite
        .filter(p => p.voto !== null && p.data)
        .sort((a, b) => a.data.localeCompare(b.data));
      if (votiConData.length > 0) {
        requestAnimationFrame(() => {
          drawSimpleLineChart(canvas, {
            labels: votiConData.map(p => p.avversario?.substring(0, 8) || ''),
            values: votiConData.map(p => p.voto)
          }, { min: 4, max: 10, color: '#667eea', fillColor: 'rgba(102,126,234,0.1)' });
        });
      }
    }

    // Click su riga partita → noop (futuro: apri match detail)
    container.querySelectorAll('[data-match-id]').forEach(el => {
      el.style.cursor = 'default';
    });

  } catch (e) {
    if (document.getElementById('pageContent') === c)
      container.innerHTML = `<button class="pp-back-btn" id="ppBack">← Torna alla rosa</button><p style="padding:16px;color:#E74C3C;">Errore: ${e.message}</p>`;
    document.getElementById('ppBack')?.addEventListener('click', () => renderRosa(c));
  }
}

function renderMediaMensile(mediaMensile) {
  if (!mediaMensile || mediaMensile.length === 0) return '';
  const mesiLabel = { '01': 'Gen', '02': 'Feb', '03': 'Mar', '04': 'Apr', '05': 'Mag', '06': 'Giu', '07': 'Lug', '08': 'Ago', '09': 'Set', '10': 'Ott', '11': 'Nov', '12': 'Dic' };

  return `
    <div class="pp-card">
      <div class="pp-section-title">📅 Media mensile</div>
      <div style="display:flex;flex-direction:column;gap:6px;">
        ${mediaMensile.map(({ mese, media, n }) => {
          const [, mm] = mese.split('-');
          const pct = Math.round(((media - 4) / 6) * 100);
          return `
            <div style="display:flex;align-items:center;gap:10px;">
              <div style="width:36px;font-size:12px;color:#6b7280;flex-shrink:0;">${mesiLabel[mm] || mm}</div>
              <div style="flex:1;background:#f3f4f6;border-radius:4px;height:16px;overflow:hidden;">
                <div style="width:${pct}%;background:${mediaColor(media)};height:100%;border-radius:4px;transition:width .3s;"></div>
              </div>
              <div style="width:36px;text-align:right;font-size:12px;font-weight:700;color:${mediaColor(media)};">${media.toFixed(2)}</div>
              <div style="width:28px;font-size:11px;color:#9ca3af;">${n}p</div>
            </div>`;
        }).join('')}
      </div>
    </div>`;
}

function renderListaPartite(partite) {
  if (!partite || partite.length === 0) return '';
  const eventiIcons = { GOAL: '⚽', ASSIST: '🅰️', YELLOW: '🟨', RED: '🟥' };

  return `
    <div class="pp-card">
      <div class="pp-section-title">📋 Partite valutate</div>
      <div style="display:flex;flex-direction:column;gap:8px;">
        ${[...partite].reverse().map(p => {
          const votoColor = p.voto !== null ? mediaColor(p.voto) : '#aaa';
          const evIcons = (p.eventi || []).map(e => eventiIcons[e] || '').filter(Boolean).join(' ');
          const data = p.data ? new Date(p.data).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' }) : '—';
          const tipo = p.tipo_competizione || 'Amichevole';
          return `
            <div data-match-id="${p.match_id}" style="display:flex;align-items:center;gap:10px;padding:10px;background:#f8f9ff;border-radius:8px;">
              <div style="width:36px;height:36px;border-radius:50%;background:${votoColor};display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:14px;flex-shrink:0;">
                ${p.voto !== null ? p.voto.toFixed(1) : 'SV'}
              </div>
              <div style="flex:1;min-width:0;">
                <div style="font-size:13px;font-weight:600;color:#1f2937;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${p.avversario || '—'}</div>
                <div style="font-size:11px;color:#9ca3af;">${data} · ${tipo} · ${p.minuti_giocati || 0}'</div>
              </div>
              <div style="text-align:right;flex-shrink:0;">
                <div style="font-size:13px;">${evIcons || ''}</div>
                ${p.nota_allenatore ? `<div style="font-size:10px;color:#9ca3af;max-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${p.nota_allenatore}">💬 ${p.nota_allenatore}</div>` : ''}
              </div>
            </div>`;
        }).join('')}
      </div>
    </div>`;
}
