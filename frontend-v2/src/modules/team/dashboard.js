import { apiFetch } from '../../services/api';
import { formatDate, formatDateShort, formatTime } from '../../utils/formatters';
import { isOurTeam } from '../../utils/teamMatch';
import { calcCertificatiStatus, renderCertificatiCard, bindCertificatiToggle } from '../../utils/certificati.js';

const CACHE_TTL_LAZY = 10 * 60 * 1000; // 10 min per classifica/GR
const CACHE_TTL_FAST = 5 * 60 * 1000; // 5 min per dati principali
const memCache = {};

function cachedFetch(key, fetcher, ttl = CACHE_TTL_LAZY) {
  const entry = memCache[key];
  if (entry && Date.now() - entry.ts < ttl) return Promise.resolve(entry.data);
  // Fallback sessionStorage per lazy (sopravvive a navigazione pagina)
  if (ttl === CACHE_TTL_LAZY) {
    const raw = sessionStorage.getItem(key);
    if (raw) {
      const { data, ts } = JSON.parse(raw);
      if (Date.now() - ts < ttl) { memCache[key] = { data, ts }; return Promise.resolve(data); }
    }
  }
  return fetcher().then(data => {
    memCache[key] = { data, ts: Date.now() };
    if (ttl === CACHE_TTL_LAZY) {
      try { sessionStorage.setItem(key, JSON.stringify({ data, ts: Date.now() })); } catch(e) {}
    }
    return data;
  });
}

export function invalidateDashboardCache() {
  Object.keys(memCache).forEach(k => { if (k.startsWith('dash_')) delete memCache[k]; });
  // Pulisci anche sessionStorage per le chiavi dashboard
  try {
    Object.keys(sessionStorage).forEach(k => { if (k.startsWith('dash_')) sessionStorage.removeItem(k); });
  } catch(e) {}
}

export default async function loadDashboard() {
  const c = document.getElementById('pageContent');
  const squadraId = window.YFM.squadraId;
  let currentTipo = 'tutte';
  
  let stats, top, topValutazioni, partiteFuture, nextTrainings;
  let classificaData = { classifica: null };
  let marcatoriGR = { marcatori: [] };
  let calendarioGR = { matches: [] };

  // Fetch aggregato: 1 sola chiamata al backend per tutti i dati core
  async function fetchDashboardData(tipo) {
    const data = await cachedFetch('dash_agg_' + squadraId + '_' + tipo, () =>
      apiFetch('/squadre/' + squadraId + '/dashboard?tipo=' + tipo).catch(() => ({
        stats: { punti:0, partiteGiocate:0, vittorie:0, pareggi:0, sconfitte:0, golFatti:0, golSubiti:0, differenzaReti:0, risultati:[] },
        topPlayers: { marcatori:[], assistmen:[], presenze:[] },
        prossimePartite: [],
        allenamenti: [],
        infortunati: [],
        certificati: { scaduti:0, inScadenza:0, validi:0, mancanti:0, dettaglio:[] }
      })), CACHE_TTL_FAST);
    return data;
  }

  // Retrocompatibilità: fetchFiltered per il dropdown tipo (riusa cache aggregata)
  async function fetchFiltered(tipo) {
    const data = await fetchDashboardData(tipo);
    return { stats: data.stats, top: data.topPlayers };
  }
  
  // Load saved competition filter preference
  try {
    const prefs = await apiFetch('/users/preferences').catch(() => ({}));
    if (prefs?.competizione_filtro) currentTipo = prefs.competizione_filtro;
    window._dashPrefs = prefs; // reuse later for layout
    window.YFM.competizioneFiltro = currentTipo;
  } catch(e) {}

  try {
    const dashData = await fetchDashboardData(currentTipo);
    stats = dashData.stats;
    top = dashData.topPlayers;
    partiteFuture = dashData.prossimePartite;
    nextTrainings = dashData.allenamenti;
    topValutazioni = { topGiocatori: [] };
    // Certificati e infortuni già inclusi nel dashboard aggregato
    window._dashCertificati = dashData.certificati || null;
    window._dashInfortunati = dashData.infortunati || [];
  } catch (err) {
    stats = { punti: 0, partiteGiocate: 0, vittorie: 0, pareggi: 0, sconfitte: 0, golFatti: 0, golSubiti: 0, differenzaReti: 0, risultati: [] };
    top = { marcatori: [], assistmen: [], presenze: [] };
    topValutazioni = { topGiocatori: [] };
    partiteFuture = [];
    nextTrainings = [];
  }
  // Popola allMatches con partite future se vuoto
  if (partiteFuture && partiteFuture.length > 0 && (!window.YFM.allMatches || window.YFM.allMatches.length === 0)) {
    window.YFM.allMatches = partiteFuture;
  }
  
  const s = window.YFM.getSquadra();
  const stagioneName = s._stagione || ((window.YFM.accessibleSeasons || []).find(ss => ss.id === window.YFM.currentSeasonId) || {}).nome || '';
  const isToday = (d) => new Date(d).toDateString() === new Date().toDateString();
  const isMatchDone = (m) => m.live_meta?.stato === 'fine' || m.stato === 'Terminata';
  // Pick first match: today's finished match takes priority, otherwise first non-finished future match
  let prossimaPartita = null;
  if (partiteFuture && partiteFuture.length > 0) {
    const todayFinished = partiteFuture.find(m => isToday(m.data_ora) && isMatchDone(m));
    if (todayFinished) prossimaPartita = todayFinished;
    else prossimaPartita = partiteFuture.find(m => !isMatchDone(m)) || null;
  }
  const isMatchToday = prossimaPartita && isToday(prossimaPartita.data_ora);
  const isMatchFinished = prossimaPartita && isMatchDone(prossimaPartita);
  
  const isGuest = !!(window.YFM.guestSquadreAccesso && window.YFM.guestSquadreAccesso.length > 0);
  const hasEditAccess = !isGuest && window.YFM.canWrite('partite');
  const matchCenterBtn = !isGuest && window.YFM.canRead('formazione') && prossimaPartita
    ? '<button style="background:rgba(255,255,255,0.2);color:white;border:none;padding:8px 12px;border-radius:10px;cursor:pointer;font-weight:600;" onclick="window.YFM.openMatchCenter(\'' + prossimaPartita.id + '\')">⚽ Match Center</button>'
    : '';
  const distintaBtn = !isGuest && window.YFM.canRead('convocazioni') && prossimaPartita
    ? '<button style="background:rgba(255,255,255,0.2);color:white;border:none;padding:8px 12px;border-radius:10px;cursor:pointer;font-weight:600;" onclick="window.YFM.openDistinta(\'' + prossimaPartita.id + '\')">📄 Distinta</button>'
    : '';
  const convButton = !isGuest && window.YFM.canRead('convocazioni') && prossimaPartita 
    ? '<button style="background:rgba(255,255,255,0.2);color:white;border:none;padding:8px 12px;border-radius:10px;cursor:pointer;font-weight:600;" onclick="window.YFM.openConvocation(\'' + prossimaPartita.id + '\')">👥 Convoca</button>'
    : '';
  
  const nuovaPartitaButton = hasEditAccess 
    ? '<button class="btn btn-primary" style="margin-top:12px;" onclick="window.YFM.navigateTo(\'calendar\')">+ Nuova Partita</button>'
    : '';
  
  const widgets = [
    { v:stats.punti, l:'Punti', c:'#27AE60' },
    { v:stats.partiteGiocate, l:'Giocate' },
    { v:stats.vittorie, l:'V', c:'#27AE60' },
    { v:stats.pareggi, l:'P', c:'#F39C12' },
    { v:stats.sconfitte, l:'S', c:'#E74C3C' },
    { v:stats.golFatti, l:'GF', c:'#27AE60' },
    { v:stats.golSubiti, l:'GS' },
    { v:(stats.differenzaReti > 0 ? '+' : '') + stats.differenzaReti, l:'DR', c:stats.differenzaReti > 0 ? '#27AE60' : stats.differenzaReti < 0 ? '#E74C3C' : '#666' }
  ];
  
  // Helper function for conditional sections
  const renderProssimaPartitaSection = () => {
    if (prossimaPartita) {
      const luogoHtml = prossimaPartita.luogo === 'Casa' ? '🏠 Casa' : '✈️ Trasferta';
      const comp = prossimaPartita.competizione || 'Amichevole';
      const btnHtml = (convButton || distintaBtn || matchCenterBtn) ? '<div style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap;justify-content:center;">' + convButton + distintaBtn + matchCenterBtn + '</div>' : '';
      const isLive = !!(prossimaPartita.live_meta && ['1t','2t','intervallo'].includes(prossimaPartita.live_meta.stato));
      const isFinished = isMatchFinished && isMatchToday;
      const wsLogo = window.YFM.getWorkspaceLogo();
      const wsName = window.YFM.getSocietaName() || 'Noi';
      const advName = prossimaPartita.avversario;
      const advLogo = prossimaPartita.logo || null;
      const isCasa = prossimaPartita.luogo === 'Casa';
      const leftName = isCasa ? wsName : advName;
      const rightName = isCasa ? advName : wsName;
      const leftLogoSrc = isCasa ? wsLogo : advLogo;
      const rightLogoSrc = isCasa ? advLogo : wsLogo;
      const logoImg = (src) => src ? '<img src="' + src + '" style="width:52px;height:52px;border-radius:50%;object-fit:contain;background:rgba(255,255,255,0.1);" class="dash-match-logo" onerror="this.style.display=\'none\'">' : '<div style="width:52px;height:52px;border-radius:50%;background:rgba(255,255,255,0.1);display:flex;align-items:center;justify-content:center;font-size:24px;" class="dash-match-logo">⚽</div>';
      const liveLabel = isLive ? '<div style="display:flex;align-items:center;justify-content:center;gap:6px;margin-bottom:4px;"><span style="width:8px;height:8px;border-radius:50%;background:#ff4444;animation:pulse-live 1s infinite;"></span><span style="font-size:11px;font-weight:700;color:#ff4444;animation:blink-text 1s infinite;">LIVE</span></div>' : '';
      const scoreLeft = isCasa ? (prossimaPartita.gol_casa ?? 0) : (prossimaPartita.gol_ospite ?? 0);
      const scoreRight = isCasa ? (prossimaPartita.gol_ospite ?? 0) : (prossimaPartita.gol_casa ?? 0);
      const scoreHtml = (isLive || isFinished)
        ? '<div style="font-size:36px;font-weight:800;color:white;letter-spacing:2px;">' + scoreLeft + ' - ' + scoreRight + '</div>'
        : '<div style="font-size:20px;color:rgba(255,255,255,0.5);font-weight:700;">VS</div>';
      const bgGrad = isLive ? 'background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);' : isFinished ? 'background:linear-gradient(135deg,#1a1a2e 0%,#2d3748 100%);' : 'background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);';
      const headerLabel = isLive ? '⚽ IN CORSO' : isFinished ? '✅ PARTITA ODIERNA' : '⏱ PROSSIMA PARTITA';
      return '<style>@keyframes pulse-live{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(.8)}}@keyframes blink-text{0%,100%{opacity:1}50%{opacity:.3}}</style>' +
        '<div data-help="dashboard.prossimaPartita" style="' + bgGrad + 'padding:20px;color:white;border-radius:16px;box-shadow:0 8px 25px rgba(102,126,234,0.4);text-align:center;">' +
        '<div style="font-size:11px;font-weight:600;opacity:0.8;text-transform:uppercase;margin-bottom:2px;">' + headerLabel + '</div>' +
        '<div style="font-size:11px;opacity:0.6;margin-bottom:16px;">🏆 ' + comp + ' · ' + luogoHtml + '</div>' +
        '<div style="display:flex;align-items:center;justify-content:center;">' +
        '<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;">' + logoImg(leftLogoSrc) + '<div style="font-size:14px;font-weight:700;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" class="dash-match-name">' + leftName + '</div></div>' +
        '<div style="flex:0 0 auto;min-width:100px;display:flex;flex-direction:column;align-items:center;">' + liveLabel + scoreHtml + '</div>' +
        '<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;">' + logoImg(rightLogoSrc) + '<div style="font-size:14px;font-weight:700;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" class="dash-match-name">' + rightName + '</div></div>' +
        '</div>' +
        '<div style="font-size:11px;opacity:0.6;margin-top:12px;">📅 ' + formatDate(prossimaPartita.data_ora) + ' · 🕐 ' + formatTime(prossimaPartita.data_ora) + '</div>' +
        btnHtml +
        '<div id="dashConvStatus" style="margin-top:10px;"></div>' +
        '</div>';
    }
    const btnHtml = nuovaPartitaButton ? '<div style="margin-top:12px;">' + nuovaPartitaButton + '</div>' : '';
    return '<div style="padding:16px;text-align:center;border:2px dashed #ddd;border-radius:12px;">' +
      '<p style="color:var(--gray);margin:0;">📅 Nessuna partita in programma</p>' + btnHtml + '</div>';
  };

  const renderProssimoAllenamento = () => {
    const next = (nextTrainings || []).find(t => new Date(t.data_ora) > new Date());
    if (!next) return '';
    const d = new Date(next.data_ora);
    const giorni = ['Domenica','Luned\u00ec','Marted\u00ec','Mercoled\u00ec','Gioved\u00ec','Venerd\u00ec','Sabato'];
    const dayLabel = giorni[d.getDay()] + ' ' + d.getDate() + '/' + (d.getMonth()+1);
    const ora = d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    const luogo = next.luogo || '';
    let programma = null;
    if (next.note && next.note.startsWith && next.note.startsWith('JSON::')) {
      try { programma = JSON.parse(next.note.substring(6)); } catch(e) {}
    }
    let fasiHtml = '';
    if (programma && programma.fasi && programma.fasi.length > 0) {
      fasiHtml = '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;">' + programma.fasi.map(f => '<span style="background:#f0f4ff;color:#4338ca;padding:4px 10px;border-radius:8px;font-size:11px;font-weight:500;">' + (f.nome || f.tipo || 'Fase') + ' ' + (f.durata || '') + "'" + '</span>').join('') + '</div>';
    } else {
      fasiHtml = '<div style="font-size:12px;color:#94a3b8;margin-top:6px;font-style:italic;">Programma non ancora definito</div>';
    }
    return '<div style="background:white;border:1px solid #f1f5f9;border-radius:14px;padding:16px;box-shadow:0 2px 8px rgba(0,0,0,0.04);">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">' +
      '<div style="font-size:12px;font-weight:600;color:#667eea;text-transform:uppercase;">\uD83C\uDFCB\uFE0F Prossimo Allenamento</div>' +
      '<div style="display:flex;gap:6px;align-items:center;">' +
      (next.virtuale ? '<span style="font-size:10px;background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:6px;">Da config</span>' : '') +
      '<button style="font-size:11px;padding:5px 10px;border-radius:8px;border:1px solid #e2e8f0;background:#f8fafc;color:#475569;cursor:pointer;font-weight:500;" onclick="window.YFM.navigateTo(\'trainingSessions\')">\u270F\uFE0F Programma</button>' +
      '<button style="font-size:11px;padding:5px 10px;border-radius:8px;border:1px solid #e2e8f0;background:#f8fafc;color:#475569;cursor:pointer;font-weight:500;" onclick="window.YFM.navigateTo(\'trainingPresenze\')">\uD83D\uDCCB Presenze</button>' +
      '</div></div>' +
      '<div style="font-size:15px;font-weight:700;color:#1e293b;">' + dayLabel + ' \u2014 ' + ora + '</div>' +
      (luogo ? '<div style="font-size:12px;color:#64748b;margin-top:2px;">\uD83D\uDCCD ' + luogo + '</div>' : '') +
      fasiHtml +
      '</div>';
  };

  // Create player box HTML
  const renderTopSectionGlass = (title, players, tipo) => {
    const medals = ['\uD83E\uDD47', '\uD83E\uDD48', '\uD83E\uDD49'];
    const getValue = (p) => tipo === 'gol' ? p.gol : tipo === 'assist' ? p.assist : p.minuti || p.presenze;
    const getLabel = (p) => tipo === 'gol' ? p.gol + ' gol' : tipo === 'assist' ? p.assist + ' assist' : p.minuti ? p.minuti + "'" : p.presenze + ' pres.';
    const getBadge = (p) => p.presenze || 0;
    const maxVal = players.length > 0 ? getValue(players[0]) : 1;
    let rows = '';
    for (let i = 0; i < 3; i++) {
      const p = players[i];
      if (!p) {
        rows += '<div style="padding:10px;text-align:center;color:rgba(255,255,255,0.3);">\u2014</div>';
        continue;
      }
      const pct = Math.round(getValue(p) / maxVal * 100);
      rows += '<div style="display:flex;align-items:center;gap:12px;padding:10px 14px;border-radius:12px;background:rgba(255,255,255,0.08);backdrop-filter:blur(4px);margin-bottom:8px;cursor:pointer;position:relative;border:1px solid rgba(255,255,255,0.12);" onclick="if(typeof loadPlayerDetail===\'function\') loadPlayerDetail(\'' + p.id + '\',\'' + p.nome + '\');">' +
        '<div style="position:absolute;top:-6px;left:-6px;font-size:14px;">' + medals[i] + '</div>' +
        '<div style="width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:#fff;flex-shrink:0;border:1.5px solid rgba(255,255,255,0.25);">' + getBadge(p) + '</div>' +
        '<div style="flex:1;min-width:0;">' +
          '<div style="font-size:13px;font-weight:600;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + p.nome + '</div>' +
          '<div style="height:4px;background:rgba(255,255,255,0.15);border-radius:2px;margin-top:5px;"><div style="height:100%;width:' + pct + '%;background:rgba(255,255,255,0.7);border-radius:2px;"></div></div>' +
        '</div>' +
        '<div style="font-size:18px;font-weight:800;color:#fff;flex-shrink:0;">' + getLabel(p) + '</div>' +
      '</div>';
    }
    return '<div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:16px;border-radius:14px;"><h2 style="font-size:14px;font-weight:600;color:rgba(255,255,255,0.9);margin:0 0 12px 0;">' + title + '</h2>' + rows + '</div>';
  };
  
  // Helper per stile risultato colorato
  const getResultStyle = (gf, gs) => {
    if (gf > gs) return { bg: '#e8f5e9', color: '#28a745' };
    if (gf < gs) return { bg: '#ffebee', color: '#dc3545' };
    return { bg: '#fff8e1', color: '#b8860b' };
  };
  
  // Render results
  const renderResults = () => {
    const risultati = (stats.risultati || []).slice(0, 5);
    if (risultati.length === 0) return '<p style="color:var(--gray);text-align:center;padding:20px;">Nessuna partita disputata</p>';
    
    const ultimi5 = risultati.slice(0, 5);
    const gf5 = ultimi5.reduce((sum, r) => sum + (r.golFatti || 0), 0);
    const gs5 = ultimi5.reduce((sum, r) => sum + (r.golSubiti || 0), 0);
    const dr5 = gf5 - gs5;
    const v5 = ultimi5.filter(r => r.golFatti > r.golSubiti).length;
    const p5 = ultimi5.filter(r => r.golFatti === r.golSubiti).length;
    const s5 = ultimi5.filter(r => r.golFatti < r.golSubiti).length;
    
    // Trend con risultati sotto V/P/S
    const trendHtml = ultimi5.map(r => {
      const style = getResultStyle(r.golFatti, r.golSubiti);
      const esito = r.golFatti > r.golSubiti ? 'V' : r.golFatti === r.golSubiti ? 'P' : 'S';
      return '<div style="text-align:center;"><span style="display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;background:' + style.color + ';color:white;font-size:12px;font-weight:bold;border-radius:8px;margin-bottom:4px;">' + esito + '</span><div style="font-size:10px;color:rgba(255,255,255,0.8);">' + r.golFatti + '-' + r.golSubiti + '</div></div>';
    }).join('<span style="color:rgba(255,255,255,0.4);margin:0 8px;align-self:center;">—</span>');
    
    const trendBox = '<div data-help="dashboard.trend" style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);border-radius:14px;padding:16px;margin-bottom:16px;">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">' +
      '<span style="color:white;font-size:11px;font-weight:600;opacity:0.9;">ANDAMENTO ULTIME ' + ultimi5.length + '</span>' +
      '<span style="color:white;font-size:10px;opacity:0.8;">' + v5 + 'V ' + p5 + 'P ' + s5 + 'S</span></div>' +
      '<div style="display:flex;align-items:center;justify-content:center;gap:4px;flex-wrap:wrap;margin-bottom:12px;">' + trendHtml + '</div>' +
      '<div style="display:flex;justify-content:center;gap:16px;padding-top:10px;border-top:1px solid rgba(255,255,255,0.2);">' +
      '<div style="background:rgba(255,255,255,0.15);border-radius:10px;padding:8px 16px;text-align:center;min-width:60px;">' +
      '<div style="font-size:22px;font-weight:bold;color:white;">' + gf5 + '</div><div style="font-size:10px;color:rgba(255,255,255,0.8);">Gol Fatti</div></div>' +
      '<div style="background:rgba(255,255,255,0.15);border-radius:10px;padding:8px 16px;text-align:center;min-width:60px;">' +
      '<div style="font-size:22px;font-weight:bold;color:white;">' + gs5 + '</div><div style="font-size:10px;color:rgba(255,255,255,0.8);">Gol Subiti</div></div>' +
      '<div style="background:rgba(255,255,255,0.15);border-radius:10px;padding:8px 16px;text-align:center;min-width:60px;">' +
      '<div style="font-size:22px;font-weight:bold;color:' + (dr5 >= 0 ? '#4ade80' : '#f87171') + ';">' + (dr5 >= 0 ? '+' : '') + dr5 + '</div><div style="font-size:10px;color:rgba(255,255,255,0.8);">Diff. Reti</div></div></div></div>';
    
    // LISTA PARTITE - layout demo esatto
    const matchesHtml = risultati.map(r => {
      const isCasa = r.luogo === 'Casa';
      const icon = isCasa ? '🏠' : '✈️';
      const comp = r.competizione || (r.giornata ? 'Campionato' : 'Amichevole');
      const compLower = comp.toLowerCase();
      const tipoEvento = compLower.includes('coppa') ? 'coppa' : compLower.includes('torneo') ? 'torneo' : compLower.includes('amichevole') ? 'amichevole' : 'campionato';
      const dettaglioComp = r.giornata ? 'G.' + r.giornata : '';
      const resStyle = getResultStyle(r.golFatti, r.golSubiti);
      const scoreLeft = isCasa ? r.golFatti : r.golSubiti;
      const scoreRight = isCasa ? r.golSubiti : r.golFatti;
      const noi = window.YFM.getSocietaName();
      const wsLogo = window.YFM.getWorkspaceLogo();
      const noiLogoHtml = wsLogo ? '<img src="' + wsLogo + '" style="width:28px;height:28px;border-radius:50%;object-fit:contain;flex-shrink:0;" onerror="this.style.display=\'none\'">' : '';
      const advLogoHtml = r.logo ? '<img src="' + r.logo + '" style="width:28px;height:28px;border-radius:50%;object-fit:contain;flex-shrink:0;" onerror="this.style.display=\'none\'">' : '';
      const leftName = isCasa ? noi : r.avversario;
      const rightName = isCasa ? r.avversario : noi;
      const leftLogo = isCasa ? noiLogoHtml : advLogoHtml;
      const rightLogo = isCasa ? advLogoHtml : noiLogoHtml;
      
      const badges = {
        campionato: { icon: '🏆', bg: '#e8f5e9', color: '#28a745', label: 'Campionato' },
        coppa: { icon: '🏅', bg: '#fff3e0', color: '#fd7e14', label: 'Coppa' },
        torneo: { icon: '🎯', bg: '#e3f2fd', color: '#007bff', label: 'Torneo' },
        amichevole: { icon: '🤝', bg: '#f5f5f5', color: '#6c757d', label: 'Amichevole' }
      };
      const badge = badges[tipoEvento] || badges.campionato;
      const competitionBadgeHtml = '<span style="display:inline-flex;align-items:center;gap:4px;background:' + badge.bg + ';color:' + badge.color + ';font-size:10px;font-weight:700;padding:3px 8px;border-radius:6px;">' + badge.icon + ' ' + badge.label + '</span>';
      
      return '<div class="match-item" onclick="window.YFM.openMatchDetail(\'' + r.id + '\')" style="padding:0;background:#fafafa;border-radius:12px;margin-bottom:12px;overflow:hidden;border:1px solid #eee;cursor:pointer;">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:linear-gradient(to right,#f8f9fa,#fff);border-bottom:1px solid #eee;">' +
        '<div style="display:flex;align-items:center;gap:8px;">' +
        competitionBadgeHtml +
        '<span style="font-size:11px;color:#667eea;font-weight:700;">' + dettaglioComp + '</span></div>' +
        '<span style="font-size:11px;color:#666;font-weight:500;">' + formatDateShort(r.dataOra) + ' ' + icon + '</span></div>' +
        '<div style="display:flex;align-items:center;justify-content:center;padding:16px 14px;gap:10px;">' +
        '<div style="flex:1;display:flex;align-items:center;justify-content:flex-end;gap:8px;min-width:0;">' +
        '<span style="font-size:14px;font-weight:600;color:#333;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + leftName + '</span>' + leftLogo + '</div>' +
        '<span style="font-size:18px;font-weight:800;color:' + resStyle.color + ';background:' + resStyle.bg + ';padding:8px 16px;border-radius:8px;flex-shrink:0;min-width:64px;text-align:center;">' + scoreLeft + ' - ' + scoreRight + '</span>' +
        '<div style="flex:1;display:flex;align-items:center;justify-content:flex-start;gap:8px;min-width:0;">' + rightLogo +
        '<span style="font-size:14px;font-weight:600;color:#333;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + rightName + '</span></div>' +
        '</div></div>';
    }).join('');
    
    return trendBox + matchesHtml;
  };
  
  // Render staff
  const renderStaff = () => {
    const staffList = s._staff || [];
    if (staffList.length === 0) return '<p style="color:rgba(255,255,255,0.5);text-align:center;padding:20px;">Nessuno staff registrato</p>';
    const campoRuoli = ['allenatore', 'capo allenatore', 'vice allenatore', 'preparatore', 'portieri', 'medico', 'massaggiatore', 'fisioterapista', 'dirigente'];
    const isCampo = (ruolo) => { const r = ruolo.toLowerCase(); return campoRuoli.some(k => r.includes(k)); };
    const filtered = staffList.filter(st => isCampo(st.ruolo));
    if (filtered.length === 0) return '<p style="color:rgba(255,255,255,0.5);text-align:center;padding:20px;">Nessuno staff registrato</p>';
    // Ordine di visualizzazione
    const getPriority = (ruolo) => {
      const r = ruolo.toLowerCase();
      if (r.includes('vice')) return 1;
      if (r.includes('allenatore')) return 0;
      if (r.includes('preparatore') && r.includes('portieri')) return 3;
      if (r.includes('preparatore')) return 2;
      if (r.includes('portieri')) return 3;
      if (r.includes('medico')) return 4;
      if (r.includes('massaggiatore') || r.includes('fisioterapista')) return 5;
      if (r.includes('dirigente')) return 6;
      return 99;
    };
    filtered.sort((a, b) => {
      const pa = getPriority(a.ruolo), pb = getPriority(b.ruolo);
      if (pa !== pb) return pa - pb;
      return a.nome.localeCompare(b.nome);
    });
    const roleIcons = { allenatore: '⚽', 'capo allenatore': '⚽', 'vice': '⚽', dirigente: '📋', preparatore: '🏋️', portieri: '🧤', medico: '🏥', massaggiatore: '💆', fisioterapista: '💆' };
    const getIcon = (ruolo) => { const r = ruolo.toLowerCase(); return Object.entries(roleIcons).find(([k]) => r.includes(k))?.[1] || '👤'; };
    return filtered.map(st => {
      const initials = st.nome.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
      return '<div style="display:flex;align-items:center;gap:12px;padding:10px 14px;border-radius:12px;background:rgba(255,255,255,0.08);backdrop-filter:blur(4px);margin-bottom:8px;border:1px solid rgba(255,255,255,0.12);">' +
        '<div style="width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:#fff;flex-shrink:0;border:1.5px solid rgba(255,255,255,0.25);">' + initials + '</div>' +
        '<div style="flex:1;min-width:0;">' +
          '<div style="font-size:13px;font-weight:600;color:#fff;">' + st.nome + '</div>' +
          '<div style="font-size:11px;color:rgba(255,255,255,0.6);margin-top:2px;">' + getIcon(st.ruolo) + ' ' + st.ruolo + '</div>' +
        '</div>' +
      '</div>';
    }).join('');
  };
  
  // Render classifica
  const renderClassifica = () => {
    const cl = classificaData?.classifica;
    if (!cl || cl.length === 0) return '';
    const teamName = classificaData.teamName || '';
    const info = classificaData.info || {};
    const header = info.championship_name ? info.championship_name + ' - Gir. ' + (info.group_name || '') : 'Classifica';
    const rows = cl.map(r => {
      const isUs = isOurTeam(r.nome, teamName);
      const cls = isUs ? ' class="classifica-row-highlight"' : '';
      const logo = r.logo ? '<img src="' + r.logo + '" onerror="this.style.display=\'none\'">' : '';
      const pen = r.penalita ? ' <span style="font-size:9px;color:#E74C3C;">(' + r.penalita + ')</span>' : '';
      return '<tr' + cls + '><td>' + r.pos + '</td><td><div class="cl-team">' + logo + '<span>' + r.nome + pen + '</span></div></td><td><b>' + r.punti + '</b></td><td>' + r.g + '</td><td>' + r.v + '</td><td>' + r.n + '</td><td>' + r.p + '</td><td>' + r.gf + '</td><td>' + r.gs + '</td></tr>';
    }).join('');
    return '<div data-help="dashboard.classifica"><h2 style="margin:0 0 14px 0;font-size:15px;font-weight:600;color:#333;text-align:center;">🏆 ' + header + '</h2>' +
      (info.aggiornamento ? '<div style="font-size:10px;color:#999;margin-bottom:8px;text-align:center;">Aggiornata al ' + info.aggiornamento + '</div>' : '') +
      '<div style="overflow-x:auto;"><table class="classifica-table"><thead><tr><th>#</th><th>Squadra</th><th>Pt</th><th>G</th><th>V</th><th>N</th><th>P</th><th>GF</th><th>GS</th></tr></thead><tbody>' + rows + '</tbody></table></div></div>';
  };

  // Render calendario GR navigabile
  const renderCalendarioGR = () => {
    const matches = calendarioGR?.matches;
    if (!matches || matches.length === 0) {
      // Fallback: usa risultatiUltimaGiornata dalla classifica
      const ris = classificaData?.risultatiUltimaGiornata;
      if (!ris || ris.length === 0) return '';
      // render statico come prima
      const teamName = (classificaData.teamName || '').toLowerCase();
      const round = ris[0].round_number || '';
      const date = ris[0].date_match || '';
      const logoMap = {};
      (classificaData.classifica || []).forEach(r => { if (r.logo) logoMap[r.nome.toLowerCase()] = r.logo; });
      const getLogo = (name) => { const n = name.toLowerCase(); let l = logoMap[n]; if (!l) { const k = Object.keys(logoMap).find(k => k.includes(n) || n.includes(k)); if (k) l = logoMap[k]; } return l ? '<img src="' + l + '" style="width:16px;height:16px;border-radius:50%;object-fit:contain;flex-shrink:0;" onerror="this.style.display=\'none\'">' : ''; };
      const rows = ris.map(r => {
        const isUs = isOurTeam(r.home_club, teamName) || isOurTeam(r.away_club, teamName);
        const cls = isUs ? ' class="classifica-row-highlight"' : '';
        return '<tr' + cls + '><td style="text-align:right;padding:4px 0;width:40%;overflow:hidden;"><span style="display:inline-flex;align-items:center;gap:4px;justify-content:flex-end;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;">' + r.home_club + getLogo(r.home_club) + '</span></td><td style="text-align:center;font-weight:700;white-space:nowrap;padding:4px 8px;width:20%;">' + (r.home_points ?? '-') + ' - ' + (r.away_points ?? '-') + '</td><td style="padding:4px 0;width:40%;overflow:hidden;"><span style="display:inline-flex;align-items:center;gap:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;">' + getLogo(r.away_club) + r.away_club + '</span></td></tr>';
      }).join('');
      return '<div><h2 style="margin:0 0 10px 0;font-size:15px;font-weight:600;color:#333;text-align:center;">📅 Giornata ' + round + ' <span style="font-size:11px;color:#999;font-weight:400;">' + date + '</span></h2><table style="width:100%;border-collapse:collapse;font-size:12px;table-layout:fixed;"><tbody>' + rows + '</tbody></table></div>';
    }
    // Group by giornata
    const byRound = {};
    matches.forEach(m => { const g = m.giornata; if (!byRound[g]) byRound[g] = []; byRound[g].push(m); });
    const rounds = Object.keys(byRound).map(Number).sort((a, b) => a - b);
    if (rounds.length === 0) return '';
    // Find last round with results
    let defaultRound = rounds[rounds.length - 1];
    for (let i = rounds.length - 1; i >= 0; i--) {
      if (byRound[rounds[i]].some(m => m.gol_casa !== null)) { defaultRound = rounds[i]; break; }
    }
    return '<div id="grCalNav" data-round="' + defaultRound + '"></div>';
  };

  // Attach calendario navigation after render
  const attachCalendarioNav = () => {
    const nav = document.getElementById('grCalNav');
    if (!nav) return;
    const matches = calendarioGR?.matches || [];
    if (matches.length === 0) return;
    const byRound = {};
    matches.forEach(m => { const g = m.giornata; if (!byRound[g]) byRound[g] = []; byRound[g].push(m); });
    const rounds = Object.keys(byRound).map(Number).sort((a, b) => a - b);
    let currentIdx = rounds.indexOf(+nav.dataset.round);
    if (currentIdx < 0) currentIdx = rounds.length - 1;
    const teamName = (classificaData.teamName || '').toLowerCase();
    const logoMap = {};
    (classificaData.classifica || []).forEach(r => { if (r.logo) logoMap[r.nome.toLowerCase()] = r.logo; });
    const getLogo = (name) => { const n = name.toLowerCase(); let l = logoMap[n]; if (!l) { const k = Object.keys(logoMap).find(k => k.includes(n) || n.includes(k)); if (k) l = logoMap[k]; } return l ? '<img src="' + l + '" style="width:16px;height:16px;border-radius:50%;object-fit:contain;flex-shrink:0;" onerror="this.style.display=\'none\'">' : ''; };

    function renderRound(idx) {
      const round = rounds[idx];
      const rMatches = byRound[round];
      const date = rMatches[0]?.data || '';
      const rows = rMatches.map(r => {
        const isUs = isOurTeam(r.casa, teamName) || isOurTeam(r.ospite, teamName);
        const cls = isUs ? ' class="classifica-row-highlight"' : '';
        const score = r.gol_casa !== null ? r.gol_casa + ' - ' + r.gol_ospite : '- - -';
        return '<tr' + cls + '><td style="text-align:right;padding:4px 0;width:40%;overflow:hidden;"><span style="display:inline-flex;align-items:center;gap:4px;justify-content:flex-end;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;">' + r.casa + getLogo(r.casa) + '</span></td><td style="text-align:center;font-weight:700;white-space:nowrap;padding:4px 8px;width:20%;">' + score + '</td><td style="padding:4px 0;width:40%;overflow:hidden;"><span style="display:inline-flex;align-items:center;gap:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;">' + getLogo(r.ospite) + r.ospite + '</span></td></tr>';
      }).join('');
      nav.innerHTML = '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">' +
        '<button id="grCalPrev" style="background:none;border:none;font-size:18px;cursor:pointer;padding:4px 8px;opacity:' + (idx > 0 ? '1' : '0.3') + ';">◀</button>' +
        '<h2 style="margin:0;font-size:15px;font-weight:600;color:#333;">📅 Giornata ' + round + ' <span style="font-size:11px;color:#999;font-weight:400;">' + date + '</span></h2>' +
        '<button id="grCalNext" style="background:none;border:none;font-size:18px;cursor:pointer;padding:4px 8px;opacity:' + (idx < rounds.length - 1 ? '1' : '0.3') + ';">▶</button></div>' +
        '<table style="width:100%;border-collapse:collapse;font-size:12px;table-layout:fixed;"><tbody>' + rows + '</tbody></table>';
      document.getElementById('grCalPrev').onclick = () => { if (idx > 0) { currentIdx = idx - 1; renderRound(currentIdx); } };
      document.getElementById('grCalNext').onclick = () => { if (idx < rounds.length - 1) { currentIdx = idx + 1; renderRound(currentIdx); } };
    }
    renderRound(currentIdx);
  };

  // Render marcatori GR (Top 10 Regionali + Top 10 Girone)
  const renderMarcatoriGR = () => {
    const all = marcatoriGR?.marcatori;
    if (!all || all.length === 0) return '';
    const cl = classificaData?.classifica;
    if (!cl || cl.length === 0) return '';
    const teamName = (classificaData.teamName || '').toLowerCase();
    const gironeTeams = new Set(cl.map(r => r.nome.toLowerCase()));
    const gironeMarc = all.filter(m => gironeTeams.has(m.squadra.toLowerCase()));
    const top10Reg = all.slice(0, 10);
    const top10Gir = gironeMarc.slice(0, 10);
    if (top10Gir.length === 0) return '';
    const renderTable = (items) => items.map((m, i) => {
      const isOur = isOurTeam(m.squadra, teamName);
      const s = isOur ? ' style="background:#f0f4ff;font-weight:600;color:#667eea;"' : '';
      return '<tr' + s + '><td>' + (i + 1) + '</td><td>' + m.nome + '</td><td>' + m.squadra + '</td><td>' + m.gol + '</td></tr>';
    }).join('');
    return '<div data-help="dashboard.marcatori"><h2 style="margin:0 0 8px 0;font-size:14px;font-weight:600;color:#333;text-align:center;">⚽ Top Marcatori</h2>' +
      '<div class="marcatori-grid">' +
      '<div><div style="font-size:11px;font-weight:700;color:#999;margin-bottom:6px;text-align:center;">GENERALE</div><table class="marcatori-table"><tbody>' + renderTable(top10Reg) + '</tbody></table></div>' +
      '<div><div style="font-size:11px;font-weight:700;color:#667eea;margin-bottom:6px;text-align:center;">GIRONE ' + (classificaData?.info?.group_name || '') + '</div><table class="marcatori-table"><tbody>' + renderTable(top10Gir) + '</tbody></table></div>' +
      '</div></div>';
  };

  // Build final HTML
  const styles = '<style>' +
    '.dash-widgets { display:grid; grid-template-columns:repeat(8,1fr); gap:10px; }' +
    '@media (max-width: 900px) { .dash-widgets { grid-template-columns: repeat(4, 1fr) !important; } }' +
    '@media (max-width: 600px) { .dash-widgets { grid-template-columns: repeat(4, 1fr) !important; } }' +
    '@media (max-width: 400px) { .dash-widgets { grid-template-columns: repeat(2, 1fr) !important; } }' +
    '.dash-card { background:white; padding:12px 6px; text-align:center; border-radius:12px; box-shadow:0 2px 10px rgba(0,0,0,0.08); }' +
    '.top-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; }' +
    '@media (max-width: 900px) { .top-grid { grid-template-columns: 1fr !important; } }' +
    '.staff-card { padding:16px; border-radius:14px; background:linear-gradient(135deg,#667eea 0%,#764ba2 100%); box-shadow:none; }' +
    '.result-card { background:white; padding:16px; border-radius:16px; box-shadow:0 4px 20px rgba(0,0,0,0.08); overflow:hidden; }' +
    '.match-item { cursor:pointer; transition: all 0.2s ease; }' +
    '.match-item:hover { opacity:0.9; transform:translateY(-2px); box-shadow:0 4px 12px rgba(0,0,0,0.1); }' +
    '.classifica-table { width:100%; border-collapse:collapse; font-size:11px; }' +
    '.classifica-table th { text-align:center; font-size:10px; color:#999; padding:3px 4px; border-bottom:1px solid #eee; white-space:nowrap; }' +
    '.classifica-table th:nth-child(2) { text-align:left; }' +
    '.classifica-table td { text-align:center; padding:4px 3px; border-bottom:1px solid #f5f5f5; white-space:nowrap; font-variant-numeric:tabular-nums; }' +
    '.classifica-table td:nth-child(2) { text-align:left; max-width:120px; overflow:hidden; text-overflow:ellipsis; }' +
    '.classifica-table .cl-team { display:flex; align-items:center; gap:4px; white-space:nowrap; overflow:hidden; }' +
    '.classifica-table .cl-team img { width:18px; height:18px; border-radius:50%; object-fit:contain; flex-shrink:0; }' +
    '.classifica-table .cl-team span { overflow:hidden; text-overflow:ellipsis; }' +
    '@media (max-width: 500px) { .classifica-table { font-size:10px; } .classifica-table th, .classifica-table td { padding:3px 2px; } .classifica-table .cl-team img { width:14px; height:14px; } .classifica-table td:first-child, .classifica-table th:first-child { width:20px; } .classifica-table td:nth-child(n+3), .classifica-table th:nth-child(n+3) { width:22px; padding:3px 1px; } }' +
    '.classifica-row-highlight { background:#f0f4ff !important; font-weight:700; }' +
    '.classifica-row-highlight td { color:#667eea; }' +
    '.gr-grid { display:grid; grid-template-columns:1fr; gap:20px; }' +
    '@media (min-width: 900px) { .gr-grid { grid-template-columns:1.5fr 1fr; } }' +
    '.gr-card { overflow-x:auto; -webkit-overflow-scrolling:touch; }' +
    '.gr-section-classifica { background:linear-gradient(135deg,#f0f4ff 0%,#e8eeff 100%); border-radius:14px; padding:14px; }' +
    '.gr-section-calendario { background:linear-gradient(135deg,#f0fdf4 0%,#e6f9ed 100%); border-radius:14px; padding:14px; }' +
    '.gr-section-marcatori { background:linear-gradient(135deg,#fef7ed 0%,#fdf2e4 100%); border-radius:14px; padding:14px; }' +
    '.marcatori-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px; }' +
    '.marcatori-table { width:100%; border-collapse:collapse; font-size:11px; }' +
    '.marcatori-table td:first-child { width:18px; text-align:center; color:#999; font-size:10px; padding:4px 3px; }' +
    '.marcatori-table td:nth-child(2) { padding:4px 5px; }' +
    '.marcatori-table td:nth-child(3) { color:#888; font-size:10px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; padding:4px 5px; text-align:right; }' +
    '.marcatori-table td:nth-child(4) { width:28px; text-align:right; font-weight:700; font-variant-numeric:tabular-nums; padding:4px 2px 4px 2px; }' +
    '@media (max-width: 500px) { .marcatori-table { font-size:10px; } .marcatori-table td:first-child { width:14px; padding:3px 2px; } .marcatori-table td:nth-child(2) { padding:3px 2px; } .marcatori-table td:nth-child(3) { padding:3px 2px; max-width:60px; } .marcatori-table td:nth-child(4) { width:22px; padding:3px 2px; } }' +
    '@media (min-width: 640px) { .dash-match-logo { width:68px !important; height:68px !important; font-size:30px !important; } .dash-match-name { font-size:16px !important; max-width:150px !important; } }' +
    '</style>';

  if (isGuest) {
    // GUEST VIEW: solo prossima partita + widgets + ultimi risultati
    c.innerHTML = styles +
      '<div style="margin-bottom:24px;"><h1 class="page-title">Dashboard</h1>' +
      '<p class="page-subtitle">Stagione ' + stagioneName + ' · ' + stats.partiteGiocate + ' partite</p></div>' +
      renderProssimaPartitaSection() +
      '<div class="dash-widgets">' +
      widgets.map(w => '<div class="dash-card"><div style="font-size:20px;font-weight:bold;color:' + (w.c || 'var(--text)') + ';">' + w.v + '</div><div style="font-size:10px;color:var(--gray);margin-top:4px;">' + w.l + '</div></div>').join('') +
      '</div>' +
      '<div class="result-card"><h2 style="margin:0 0 14px 0;font-size:15px;font-weight:600;color:#333;">📋 Ultimi Risultati</h2>' + renderResults() + '</div>';
    return;
  }
    
  // Dropdown filter HTML
  const tipoOptions = [{v:'campionato',l:'Campionato'},{v:'ufficiali',l:'Ufficiali (Camp.+Coppa)'},{v:'tutte',l:'Tutte'},{v:'amichevoli',l:'Amichevoli'}];
  const dropdownHtml = '<select id="dashTipoFilter" style="padding:6px 12px;border-radius:8px;border:1px solid #ddd;font-size:12px;font-weight:600;color:#333;background:#f8f9fa;cursor:pointer;">' +
    tipoOptions.map(o => '<option value="' + o.v + '"' + (o.v === currentTipo ? ' selected' : '') + '>' + o.l + '</option>').join('') + '</select>';

  c.innerHTML = styles +
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;">' +
    '<div><h1 class="page-title">Dashboard</h1>' +
    '<p class="page-subtitle">Stagione ' + stagioneName + ' · ' + stats.partiteGiocate + ' partite</p></div>' +
    '<div style="display:flex;align-items:center;gap:8px;">' + dropdownHtml + '<button id="dashOrganizeBtn" title="Organizza dashboard" style="background:#f8f9fa;border:1px solid #ddd;border-radius:8px;padding:8px 12px;cursor:pointer;font-size:16px;min-width:44px;min-height:44px;display:flex;align-items:center;justify-content:center;">⚙️</button></div></div>' +
    
    '<div id="dashWidgetsContainer" style="display:flex;flex-direction:column;gap:20px;min-width:0;">' +
    '<div data-widget="next_training">' + renderProssimoAllenamento() + '</div>' +
    '<div data-widget="next_match">' + renderProssimaPartitaSection() + '</div>' +
    '<div data-widget="stats_widgets"><div class="dash-widgets" data-help="dashboard.widgets">' +
    widgets.map(w => '<div class="dash-card"><div style="font-size:20px;font-weight:bold;color:' + (w.c || 'var(--text)') + ';">' + w.v + '</div><div style="font-size:10px;color:var(--gray);margin-top:4px;">' + w.l + '</div></div>').join('') +
    '</div></div>' +
    '<div data-widget="top_players"><div class="top-grid" data-help="dashboard.topPlayers">' +
    renderTopSectionGlass('⚽ Top 3 Marcatori', (top.marcatori || []).slice(0, 3), 'gol') +
    renderTopSectionGlass('🅰️ Top 3 Assist', (top.assistmen || []).slice(0, 3), 'assist') +
    renderTopSectionGlass('🏃 Top 3 Presenze (min.)', (top.presenze || []).slice(0, 3), 'presenze') +
    '</div></div>' +
    '<div data-widget="results"><div class="result-card" data-help="dashboard.risultati"><h2 style="margin:0 0 14px 0;font-size:15px;font-weight:600;color:#333;">📋 Ultimi Risultati</h2>' + renderResults() + '</div></div>' +
    '<div data-widget="injuries" id="dashInjuryWidget" style="display:none;"></div>' +
    '<div data-widget="certificati" id="dashCertificatiWidget" style="display:none;"></div>' +
    '<div data-widget="fees" id="dashFeesWidget" style="display:none;"></div>' +
    '<div data-widget="kit" id="dashKitWidget" style="display:none;"></div>' +
    '<div data-widget="checklist" id="dashChecklistWidget" style="display:none;"></div>' +
    '<div data-widget="tesseramento" id="dashTessWidget" style="display:none;"></div>' +
    '<div data-widget="convocazione" id="dashConvocazioneWidget" style="display:none;"></div>' +
    '<div data-widget="classifica" id="dashLazyCol"><div style="text-align:center;padding:40px;color:#999;"><div class="spinner"></div></div></div>' +
    '<div data-widget="staff"><div class="staff-card" data-help="dashboard.staff"><h2 style="margin:0 0 12px 0;font-size:14px;font-weight:600;color:rgba(255,255,255,0.9);">👥 Staff</h2><div>' + renderStaff() + '</div></div></div>' +
    '</div>';

  // Attach dropdown change handler
  const filterEl = document.getElementById('dashTipoFilter');
  if (filterEl) {
    filterEl.onchange = async () => {
      currentTipo = filterEl.value;
      window.YFM.competizioneFiltro = currentTipo;
      apiFetch('/users/preferences', { method: 'PUT', body: JSON.stringify({ competizione_filtro: currentTipo }) }).catch(() => {});
      const filtered = await fetchFiltered(currentTipo);
      stats = filtered.stats;
      top = filtered.top;
      // Update subtitle
      const sub = c.querySelector('.page-subtitle');
      if (sub) sub.textContent = 'Stagione ' + stagioneName + ' · ' + stats.partiteGiocate + ' partite';
      // Update widgets
      const wContainer = c.querySelector('.dash-widgets');
      if (wContainer) {
        const w = [
          { v:stats.punti, l:'Punti', c:'#27AE60' },
          { v:stats.partiteGiocate, l:'Giocate' },
          { v:stats.vittorie, l:'V', c:'#27AE60' },
          { v:stats.pareggi, l:'P', c:'#F39C12' },
          { v:stats.sconfitte, l:'S', c:'#E74C3C' },
          { v:stats.golFatti, l:'GF', c:'#27AE60' },
          { v:stats.golSubiti, l:'GS' },
          { v:(stats.differenzaReti > 0 ? '+' : '') + stats.differenzaReti, l:'DR', c:stats.differenzaReti > 0 ? '#27AE60' : stats.differenzaReti < 0 ? '#E74C3C' : '#666' }
        ];
        wContainer.innerHTML = w.map(wi => '<div class="dash-card"><div style="font-size:20px;font-weight:bold;color:' + (wi.c || 'var(--text)') + ';">' + wi.v + '</div><div style="font-size:10px;color:var(--gray);margin-top:4px;">' + wi.l + '</div></div>').join('');
      }
      // Update top 3
      const topGrid = c.querySelector('.top-grid');
      if (topGrid) {
        topGrid.innerHTML = renderTopSectionGlass('⚽ Top 3 Marcatori', (top.marcatori || []).slice(0, 3), 'gol') +
          renderTopSectionGlass('🅰️ Top 3 Assist', (top.assistmen || []).slice(0, 3), 'assist') +
          renderTopSectionGlass('🏃 Top 3 Presenze (min.)', (top.presenze || []).slice(0, 3), 'presenze');
      }
      // Update risultati
      const resCard = c.querySelector('[data-help="dashboard.risultati"]');
      if (resCard) {
        resCard.innerHTML = '<h2 style="margin:0 0 14px 0;font-size:15px;font-weight:600;color:#333;">📋 Ultimi Risultati</h2>' + renderResults();
      }
    };
  }

  // Lazy load: classifica + GR (cached 10min, non bloccano il render) — solo se configurato
  const hasGrConfig = !!(window.YFM.getSquadra()?.classifica_url);
  if (hasGrConfig) {
  Promise.all([
    cachedFetch('dash_classifica_' + squadraId, () => apiFetch('/squadre/' + squadraId + '/classifica').catch(() => ({ classifica: null }))),
    cachedFetch('dash_marcatori_' + squadraId, () => apiFetch('/gr/marcatori/' + squadraId).catch(() => ({ marcatori: [] }))),
    cachedFetch('dash_calendario_' + squadraId, () => apiFetch('/gr/calendario/' + squadraId).catch(() => ({ matches: [] })))
  ]).then(([cl, mr, cal]) => {
    classificaData = cl;
    marcatoriGR = mr;
    calendarioGR = cal;
    const col = document.getElementById('dashLazyCol');
    if (col) {
      const classHtml = renderClassifica();
      const calHtml = renderCalendarioGR();
      const marcHtml = renderMarcatoriGR();
      if (!classHtml && !calHtml && !marcHtml) { col.innerHTML = ''; }
      else if (window.innerWidth >= 900) {
        col.innerHTML = '<div class="result-card gr-card"><div class="gr-grid">' +
          '<div class="gr-section-classifica">' + classHtml + '</div>' +
          '<div><div class="gr-section-calendario">' + calHtml + '</div>' + (marcHtml ? '<div class="gr-section-marcatori" style="margin-top:12px;">' + marcHtml + '</div>' : '') + '</div>' +
          '</div></div>';
      } else {
        col.innerHTML = (classHtml ? '<div class="gr-section-classifica" style="overflow-x:auto;border-radius:14px;box-shadow:0 4px 20px rgba(0,0,0,0.08);">' + classHtml + '</div>' : '') +
          (calHtml ? '<div class="gr-section-calendario" style="margin-top:20px;border-radius:14px;box-shadow:0 4px 20px rgba(0,0,0,0.08);">' + calHtml + '</div>' : '') +
          (marcHtml ? '<div class="gr-section-marcatori" style="margin-top:20px;border-radius:14px;box-shadow:0 4px 20px rgba(0,0,0,0.08);">' + marcHtml + '</div>' : '');
      }
      attachCalendarioNav();
    }
  });
  } else {
    // GR non configurato: pulisci colonna e cache
    const col = document.getElementById('dashLazyCol');
    if (col) col.innerHTML = '';
    try { ['dash_classifica_','dash_marcatori_','dash_calendario_'].forEach(k => sessionStorage.removeItem(k + squadraId)); } catch(e) {}
  }

  // Render infortuni attivi (dati già dal dashboard aggregato)
  const activeInjuries = (window._dashInfortunati || []).filter(i => !i.data_rientro_effettiva);
  const injWidget = document.getElementById('dashInjuryWidget');
  if (injWidget && activeInjuries.length > 0) {
    const today = new Date();
    if (injWidget.dataset.userHidden !== '1') injWidget.style.display = '';
    injWidget.innerHTML = '<div style="background:#FFF3F3;border:1px solid #FDCECE;border-radius:12px;padding:14px;">' +
      '<h3 style="margin:0 0 10px 0;font-size:13px;color:#E74C3C;">🏥 Infortunati (' + activeInjuries.length + ')</h3>' +
      activeInjuries.map(inj => {
        const days = inj.data_rientro_prevista ? Math.ceil((new Date(inj.data_rientro_prevista) - today) / 86400000) : null;
        const daysLabel = days !== null ? (days > 0 ? days + 'gg' : '⚠️ scaduto') : '';
        return '<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;font-size:12px;">' +
          '<span><strong>' + (inj.cognome || '') + '</strong> <span style="color:#888;">' + inj.tipo + '</span></span>' +
          (daysLabel ? '<span style="color:#E74C3C;font-weight:600;">' + daysLabel + '</span>' : '') +
          '</div>';
      }).join('') + '</div>';
  }

  // Render certificati medici (dati già dal dashboard aggregato)
  const certData = window._dashCertificati;
  const certWidget = document.getElementById('dashCertificatiWidget');
  if (certWidget && certData && (certData.scaduti > 0 || certData.inScadenza > 0 || certData.mancanti > 0)) {
    // Costruisci status compatibile con renderCertificatiCard (mappa scadenza → _scadenza)
    const mapDetail = (arr) => (arr || []).map(d => ({ ...d, _scadenza: d.scadenza ? new Date(d.scadenza) : null }));
    const status = { scaduti: mapDetail(certData.dettaglio?.filter(d => d.stato === 'scaduto')), inScadenza: mapDetail(certData.dettaglio?.filter(d => d.stato === 'in_scadenza')), validi: mapDetail(certData.dettaglio?.filter(d => d.stato === 'valido')), mancanti: mapDetail(certData.dettaglio?.filter(d => d.stato === 'mancante')) };
    if (certWidget.dataset.userHidden !== '1') certWidget.style.display = '';
    certWidget.innerHTML = '<div style="background:#FFF9F0;border:1px solid #FDE8C8;border-radius:12px;padding:14px;">' + renderCertificatiCard(status) + '</div>';
    bindCertificatiToggle(certWidget);
  }

  // Widget Quote (visibile per admin/segreteria)
  const feesWidget = document.getElementById('dashFeesWidget');
  if (feesWidget && window.YFM.canRead('quote')) {
    Promise.all([
      apiFetch('/fees?team_id=' + window.YFM.squadraId + '&season_id=' + window.YFM.currentSeasonId),
      apiFetch('/fee-configs?workspace_id=' + window.YFM.activeWorkspaceId)
    ]).then(([fees, configs]) => {
      if (!fees?.length) return;
      const oggi = new Date().toISOString().split('T')[0];
      const in7 = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
      const configNames = {};
      (configs || []).forEach(c => { configNames[c.id] = c.nome; });

      // Raggruppa per config
      const groups = {};
      fees.forEach(f => { const k = f.fee_config_id || 'other'; if (!groups[k]) groups[k] = []; groups[k].push(f); });

      let rowsHtml = '';
      Object.entries(groups).forEach(([cfgId, gFees]) => {
        const name = configNames[cfgId] || 'Altro';
        const tot = gFees.reduce((s, f) => s + parseFloat(f.importo_totale), 0);
        const inc = gFees.reduce((s, f) => s + (f.fee_installment || []).filter(i => i.stato === 'pagata').reduce((ps, i) => ps + parseFloat(i.importo), 0), 0);
        const allInsts = gFees.flatMap(f => f.fee_installment || []);
        const nonPagate = allInsts.filter(i => i.stato !== 'pagata' && i.scadenza).sort((a, b) => a.scadenza.localeCompare(b.scadenza));
        const scaduta = nonPagate.find(i => i.scadenza.slice(0, 10) < oggi);
        const inScad = nonPagate.find(i => i.scadenza.slice(0, 10) >= oggi && i.scadenza.slice(0, 10) <= in7);
        let alert = '';
        if (scaduta) { alert = `<span style="color:#E74C3C;font-size:11px;">(⚠️ ${scaduta.scadenza_label || 'Rata'} scaduta)</span>`; }
        else if (inScad) { const d = Math.ceil((new Date(inScad.scadenza) - new Date()) / 86400000); alert = `<span style="color:#d97706;font-size:11px;">(⏳ ${inScad.scadenza_label || 'Rata'} tra ${d}g)</span>`; }
        rowsHtml += `<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;">
          <span style="font-weight:500;">${name} ${alert}</span>
          <span>€${inc.toFixed(0)}/<span style="color:#888;">€${tot.toFixed(0)}</span></span>
        </div>`;
      });

      const totale = fees.reduce((s, f) => s + parseFloat(f.importo_totale), 0);
      const incassato = fees.reduce((s, f) => s + (f.fee_installment || []).filter(i => i.stato === 'pagata').reduce((ps, i) => ps + parseFloat(i.importo), 0), 0);
      const scadute = fees.reduce((s, f) => s + (f.fee_installment || []).filter(i => i.stato !== 'pagata' && i.scadenza && i.scadenza.slice(0, 10) < oggi).length, 0);
      const saldati = fees.filter(f => f.stato === 'pagata').length;

      if (feesWidget.dataset.userHidden !== '1') feesWidget.style.display = '';
      feesWidget.innerHTML = `<div style="background:white;border:1px solid #eee;border-radius:12px;padding:14px;cursor:pointer;" id="dashFeesCard">
        <div style="font-size:14px;font-weight:600;margin-bottom:10px;">💰 Situazione Quote</div>
        <div style="font-size:12px;display:flex;flex-direction:column;gap:4px;margin-bottom:10px;">${rowsHtml}</div>
        <div style="display:flex;gap:12px;font-size:11px;color:#666;border-top:1px solid #f0f0f0;padding-top:8px;flex-wrap:wrap;">
          <span>Totale: <strong style="color:#27AE60;">€${incassato.toFixed(0)}</strong>/€${totale.toFixed(0)}</span>
          <span>${saldati}/${fees.length} saldati</span>
          ${scadute > 0 ? `<span style="color:#E74C3C;">${scadute} rate scadute</span>` : ''}
        </div>
      </div>`;
      feesWidget.querySelector('#dashFeesCard')?.addEventListener('click', () => window.YFM.navigateTo('fees'));
    }).catch(() => {});
  }

  // Widget Kit (visibile per admin/segreteria)
  const kitWidget = document.getElementById('dashKitWidget');
  const _isAdminUser = u => u?.ruolo === 'admin' || u?.is_superadmin;
  if (kitWidget && (window.YFM.canRead('kit') || _isAdminUser(window.YFM.getUser()))) {
    const _wsId = window.YFM.activeWorkspaceId || window.YFM.workspaceId || window.YFM.workspaceInfo?.id;
    if (!_wsId) { console.warn('[kit widget] activeWorkspaceId non disponibile'); }
    Promise.all([
      apiFetch('/kit-templates?workspace_id=' + _wsId),
      apiFetch('/kit-stock?workspace_id=' + _wsId),
      apiFetch('/kit-assignments?team_id=' + window.YFM.squadraId + '&season_id=' + window.YFM.currentSeasonId)
    ]).then(([tmpls, stk, assignsData]) => {
      const assigns = assignsData?.players || assignsData || [];
      const activeTmpls = (tmpls || []).filter(t => t.attivo !== false);
      const isAdminUser = _isAdminUser(window.YFM.getUser());
      if (!activeTmpls.length) {
        if (!isAdminUser) return; // utenti normali: nascondi se nessun template
        // admin: mostra widget con invito a configurare
        if (kitWidget.dataset.userHidden !== '1') kitWidget.style.display = '';
        kitWidget.innerHTML = `<div style="background:white;border:1px solid #eee;border-radius:12px;padding:14px;cursor:pointer;" id="dashKitCard">
          <div style="font-size:14px;font-weight:600;margin-bottom:8px;">👕 Kit Sportivo</div>
          <div style="font-size:12px;color:#999;">Nessuna seduta tipo configurata. Clicca per configurare.</div>
        </div>`;
        kitWidget.querySelector('#dashKitCard')?.addEventListener('click', () => window.YFM.navigateTo('kit'));
        return;
      }
      let rowsHtml = '';
      activeTmpls.forEach(tmpl => {
        const tmplStock = (stk || []).filter(s => s.template_id === tmpl.id);
        const tmplAssigns = (assigns || []).filter(a => a.kit_stock?.template_id === tmpl.id);
        const nArticoli = (tmpl.articoli || []).length || 1;
        const disponibili = tmplStock.filter(s => s.stato === 'disponibile').length;
        const kitDisp = Math.floor(disponibili / nArticoli);
        const playersWithKit = new Set(tmplAssigns.map(a => a.player_id)).size;
        let alert = '';
        if (kitDisp === 0 && tmplStock.length > 0) alert = '<span style="color:#E74C3C;font-size:11px;">(⚠️ esaurito)</span>';
        else if (kitDisp <= 3 && kitDisp > 0) alert = `<span style="color:#d97706;font-size:11px;">(⏳ ${kitDisp} rimasti)</span>`;
        rowsHtml += `<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;">
          <span style="font-weight:500;">${tmpl.nome} ${alert}</span>
          <span>${playersWithKit} assegnati</span>
        </div>`;
      });
      if (kitWidget.dataset.userHidden !== '1') kitWidget.style.display = '';
      kitWidget.innerHTML = `<div style="background:white;border:1px solid #eee;border-radius:12px;padding:14px;cursor:pointer;" id="dashKitCard">
        <div style="font-size:14px;font-weight:600;margin-bottom:10px;">👕 Kit Sportivo</div>
        <div style="font-size:12px;display:flex;flex-direction:column;gap:4px;">${rowsHtml}</div>
      </div>`;
      kitWidget.querySelector('#dashKitCard')?.addEventListener('click', () => window.YFM.navigateTo('kit'));
    }).catch(err => {
      console.error('[kit widget] errore:', err);
      if (_isAdminUser(window.YFM.getUser()) && kitWidget.dataset.userHidden !== '1') {
        kitWidget.style.display = '';
        kitWidget.innerHTML = `<div style="background:white;border:1px solid #eee;border-radius:12px;padding:14px;cursor:pointer;" id="dashKitCard"><div style="font-size:14px;font-weight:600;margin-bottom:8px;">👕 Kit Sportivo</div><div style="font-size:12px;color:#999;">Clicca per gestire il kit.</div></div>`;
        kitWidget.querySelector('#dashKitCard')?.addEventListener('click', () => window.YFM.navigateTo('kit'));
      }
    });
  }

  // Widget Checklist (visibile per admin/segreteria)
  const chkWidget = document.getElementById('dashChecklistWidget');
  if (chkWidget && (window.YFM.canRead('tesseramento') || _isAdminUser(window.YFM.getUser()))) {
    apiFetch('/checklist?team_id=' + window.YFM.squadraId + '&season_id=' + window.YFM.currentSeasonId).then(chks => {
      if (!chks?.length) return;
      const incompleti = chks.filter(c => c.completamento_pct < 100);
      if (!incompleti.length) return;
      const avgPct = Math.round(chks.reduce((s, c) => s + c.completamento_pct, 0) / chks.length);
      if (chkWidget.dataset.userHidden !== '1') chkWidget.style.display = '';
      chkWidget.innerHTML = `<div style="background:white;border:1px solid #eee;border-radius:12px;padding:14px;cursor:pointer;" id="dashChkCard">
        <div style="font-size:14px;font-weight:600;margin-bottom:8px;">✅ Checklist Stagione</div>
        <div style="font-size:12px;display:flex;justify-content:space-between;align-items:center;">
          <span>${incompleti.length} incompleti su ${chks.length}</span>
          <span style="font-weight:600;color:${avgPct >= 80 ? '#27AE60' : avgPct >= 50 ? '#d97706' : '#E74C3C'};">${avgPct}%</span>
        </div>
        <div style="margin-top:6px;height:6px;background:#f0f0f0;border-radius:3px;overflow:hidden;">
          <div style="height:100%;width:${avgPct}%;background:${avgPct >= 80 ? '#27AE60' : '#667eea'};border-radius:3px;"></div>
        </div>
      </div>`;
      chkWidget.querySelector('#dashChkCard')?.addEventListener('click', () => window.YFM.navigateTo('checklist'));
    }).catch(() => {});
  }

  // Widget Tesseramento (visibile per admin/segreteria)
  const tessWidget = document.getElementById('dashTessWidget');
  if (tessWidget && (window.YFM.canRead('tesseramento') || _isAdminUser(window.YFM.getUser()))) {
    apiFetch('/squadre/' + window.YFM.squadraId + '/registrations').then(regs => {
      if (!regs?.length) return;
      const incompleti = regs.filter(r => r.stato !== 'completo' && r.stato !== 'tesserato');
      const completi = regs.filter(r => r.stato === 'completo' || r.stato === 'tesserato');
      if (!incompleti.length && !completi.length) return;
      if (tessWidget.dataset.userHidden !== '1') tessWidget.style.display = '';
      tessWidget.innerHTML = `<div style="background:white;border:1px solid #eee;border-radius:12px;padding:14px;cursor:pointer;" id="dashTessCard">
        <div style="font-size:14px;font-weight:600;margin-bottom:8px;">📋 Stato Tesseramenti</div>
        <div style="display:flex;gap:12px;font-size:12px;flex-wrap:wrap;">
          <span style="color:${incompleti.length ? '#E74C3C' : '#27AE60'};font-weight:500;">${incompleti.length} incompleti</span>
          <span style="color:#27AE60;">${completi.length}/${regs.length} completati</span>
        </div>
      </div>`;
      tessWidget.querySelector('#dashTessCard')?.addEventListener('click', () => window.YFM.navigateTo('registration'));
    }).catch(() => {});
  }
  if (prossimaPartita) {
    const convPromise = apiFetch('/partite/' + prossimaPartita.id + '/convocazioni').catch(() => []);
    const matchDateStr = prossimaPartita.data_ora ? prossimaPartita.data_ora.substring(0, 10) : '';
    const absPromise = matchDateStr ? apiFetch('/absence/team/' + window.YFM.squadraId + '/week').catch(() => []) : Promise.resolve([]);

    // Helper: calcola conteggi disponibilità
    function calcAvailability(convAll, weekAbs) {
      const tutti = (convAll || []).filter(c => c.presente);
      const injPlayerIds = new Set((window._dashInfortunati || []).map(i => i.player_id));
      // Assenti "normali" = risposta indisponibile ma NON infortunati
      const assenti = tutti.filter(c => c.risposta === 'indisponibile' && !injPlayerIds.has(c.calciatoreId));
      // Infortunati indisponibili = risposta indisponibile E infortunati
      const injIndisponibili = tutti.filter(c => c.risposta === 'indisponibile' && injPlayerIds.has(c.calciatoreId));
      // Infortunati non convocati
      const convIds = new Set(tutti.map(c => c.calciatoreId));
      const injNonConv = (window._dashInfortunati || []).filter(i => !convIds.has(i.player_id));
      // Totale indisponibili per infortunio
      const totInj = injIndisponibili.length + injNonConv.length;
      // Assenze comunicate per data partita (non già contati come convocati indisponibili)
      const absForMatch = (weekAbs || []).filter(a => a.data_allenamento === matchDateStr && !convIds.has(a.player_id));
      const totAssenti = assenti.length + absForMatch.length;
      const disponibili = tutti.length - assenti.length - injIndisponibili.length;
      return { tutti, disponibili, totInj, totAssenti };
    }

    // Card segreteria
    const convWidget = document.getElementById('dashConvocazioneWidget');
    if (convWidget) {
      Promise.all([convPromise, absPromise]).then(([convAll, weekAbs]) => {
        const { tutti, disponibili, totInj, totAssenti } = calcAvailability(convAll, weekAbs);
        const dataMatch = new Date(prossimaPartita.data_ora);
        const dataStr = dataMatch.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' });
        const oraStr = dataMatch.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
        const luogo = prossimaPartita.luogo === 'Casa' ? '🏠 Casa' : '✈️ Trasferta';
        const stato = tutti.length > 0
          ? '<span style="color:#27AE60;font-weight:600;">✅ ' + disponibili + ' disponibili</span>'
          : '<span style="color:#E67E22;font-weight:600;">⬜ Da convocare</span>';
        let alertHtml = '';
        if (totInj > 0 || totAssenti > 0) {
          alertHtml = '<div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap;font-size:11px;">';
          if (totInj > 0) alertHtml += '<span style="background:#fee2e2;color:#dc2626;padding:3px 8px;border-radius:6px;font-weight:600;">🏥 ' + totInj + ' indisponibil' + (totInj === 1 ? 'e' : 'i') + '</span>';
          if (totAssenti > 0) alertHtml += '<span style="background:#fff3e0;color:#e65100;padding:3px 8px;border-radius:6px;font-weight:600;">❌ ' + totAssenti + ' assent' + (totAssenti === 1 ? 'e' : 'i') + '</span>';
          alertHtml += '</div>';
        }
        if (convWidget.dataset.userHidden !== '1') convWidget.style.display = '';
        convWidget.innerHTML = '<div style="background:#f0f4ff;border:1px solid #c7d2fe;border-radius:12px;padding:14px;">' +
          '<h3 style="margin:0 0 10px 0;font-size:13px;color:#4338ca;">📋 Prossima Convocazione</h3>' +
          '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">' +
          '<div style="display:flex;align-items:center;gap:8px;">' + (prossimaPartita.logo ? '<img src="' + prossimaPartita.logo + '" style="width:28px;height:28px;border-radius:50%;object-fit:contain;flex-shrink:0;" onerror="this.style.display=\'none\'">' : '') + '<div><strong>' + (prossimaPartita.avversario || 'TBD') + '</strong><br><span style="font-size:12px;color:#666;">' + dataStr + ' · ' + oraStr + ' · ' + luogo + '</span></div></div>' +
          '<div data-conv-stato>' + stato + '</div></div>' +
          '<div data-conv-alert>' + alertHtml + '</div>' +
          '<div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;">' +
          '<button onclick="window.YFM.openConvocation(\'' + prossimaPartita.id + '\')" style="background:#667eea;color:#fff;border:none;padding:8px 14px;border-radius:8px;cursor:pointer;font-size:12px;font-weight:600;">📋 ' + (tutti.length > 0 ? 'Vedi / Modifica' : 'Convoca') + '</button>' +
          (tutti.length > 0 ? '<button onclick="window.YFM.openConvocation(\'' + prossimaPartita.id + '\',true)" style="background:#27AE60;color:#fff;border:none;padding:8px 14px;border-radius:8px;cursor:pointer;font-size:12px;font-weight:600;">📄 PDF</button>' : '') +
          '</div></div>';
      }).catch(() => {});
    }

    // Card prossima partita — status line
    const convStatusEl = document.getElementById('dashConvStatus');
    if (convStatusEl && hasEditAccess) {
      Promise.all([convPromise, absPromise]).then(([convAll, weekAbs]) => {
        const { tutti, disponibili, totInj, totAssenti } = calcAvailability(convAll, weekAbs);
        if (tutti.length === 0 && totInj === 0 && totAssenti === 0) return;
        let statusHtml = '<div style="font-size:11px;opacity:0.9;display:flex;gap:8px;justify-content:center;flex-wrap:wrap;">';
        if (tutti.length > 0) statusHtml += '<span>👥 ' + disponibili + ' disponibili</span>';
        if (totInj > 0) statusHtml += '<span style="color:#fca5a5;font-weight:700;">🏥 ' + totInj + ' indisponibil' + (totInj === 1 ? 'e' : 'i') + '</span>';
        if (totAssenti > 0) statusHtml += '<span style="color:#fca5a5;font-weight:700;">❌ ' + totAssenti + ' assent' + (totAssenti === 1 ? 'e' : 'i') + '</span>';
        statusHtml += '</div>';
        convStatusEl.innerHTML = statusHtml;
      }).catch(() => {});
    }
  }

  // --- Dashboard Organize ---
  const WIDGET_LABELS = { next_training: '🏋️ Prossimo Allenamento', next_match: '⏱ Prossima Partita', stats_widgets: '📊 Statistiche', top_players: '🏆 Top Giocatori', results: '📋 Ultimi Risultati', injuries: '🏥 Infortuni', staff: '👥 Staff', classifica: '🏆 Classifica & GR', certificati: '🏥 Certificati Medici', convocazione: '📋 Prossima Convocazione' };
  const userProfilo = window.YFM.getUser()?.permessi?.profilo || '';
  const _user = window.YFM.getUser();
  const _isAdmin = _user?.is_superadmin || _user?.ruolo === 'admin';
  const DEFAULT_ORDER = _isAdmin
    ? ['next_training', 'next_match', 'stats_widgets', 'top_players', 'results', 'injuries', 'fees', 'kit', 'checklist', 'tesseramento', 'classifica', 'staff', 'certificati', 'convocazione']
    : userProfilo === 'segreteria'
      ? ['checklist', 'tesseramento', 'fees', 'kit', 'certificati', 'injuries', 'next_training', 'next_match', 'convocazione', 'stats_widgets', 'top_players', 'results', 'classifica', 'staff']
      : ['next_training', 'next_match', 'stats_widgets', 'top_players', 'results', 'injuries', 'fees', 'kit', 'checklist', 'tesseramento', 'classifica', 'staff', 'certificati', 'convocazione'];

  const _societari = new Set(['direttore_sportivo', 'direttore_tecnico', 'direttore_generale', 'presidente']);
  const DEFAULT_HIDDEN = _isAdmin
    ? []
    : userProfilo === 'segreteria'
      ? ['stats_widgets', 'top_players']
      : _societari.has(userProfilo) || userProfilo === 'dirigente'
        ? ['allenamenti', 'stats_widgets', 'top_players']
        : ['fees', 'kit', 'checklist', 'tesseramento'];

  function applyLayout(layout) {
    const container = document.getElementById('dashWidgetsContainer');
    if (!container) return;
    const isSuperAdmin = window.YFM.getUser()?.is_superadmin;
    const allWidgetIds = [...container.querySelectorAll('[data-widget]')].map(el => el.dataset.widget);
    // Superadmin: merge nuovi widget non ancora in order salvato
    let order = layout.order || DEFAULT_ORDER;
    if (isSuperAdmin) {
      const missing = allWidgetIds.filter(id => !order.includes(id));
      if (missing.length) order = [...order, ...missing];
    }
    const hidden = layout.hidden || [];
    const lazyWidgets = new Set(['injuries', 'certificati', 'fees', 'kit', 'checklist', 'tesseramento', 'convocazione']);
    // Append in order
    order.forEach(id => {
      const el = container.querySelector('[data-widget="' + id + '"]');
      if (!el) return;
      if (lazyWidgets.has(id)) {
        // Per i lazy: se esplicitamente nascosto dall'utente, forza display:none e marca
        // altrimenti lascia che la Promise gestisca la visibilità
        if (hidden.includes(id)) {
          el.style.display = 'none';
          el.dataset.userHidden = '1';
        } else {
          el.dataset.userHidden = '0';
        }
      } else {
        el.style.display = hidden.includes(id) ? 'none' : '';
      }
      container.appendChild(el);
    });
    // Any new widgets not in order go at end
    container.querySelectorAll('[data-widget]').forEach(el => {
      const id = el.dataset.widget;
      if (!order.includes(id)) container.appendChild(el);
    });
  }

  // Load and apply user preferences + onboarding (reuse prefetched prefs)
  const _prefs = window._dashPrefs || {};
  if (_prefs.dashboard_layout) applyLayout(_prefs.dashboard_layout);
  else applyLayout({ order: DEFAULT_ORDER, hidden: DEFAULT_HIDDEN });
  if (!_prefs.onboarding_dismissed) renderWelcomeCard();

  // Banner anagrafica incompleta (admin/segreteria, persiste finché non compilata)
  if (window.YFM.canWrite('rosa') || _isAdmin) {
    apiFetch('/workspaces/' + window.YFM.activeWorkspaceId + '/anagrafica').then(ag => {
      if (ag && (ag.matricola_figc || ag.p_iva)) return; // già compilata
      const banner = document.createElement('div');
      banner.style.cssText = 'background:#fef3c7;border:1px solid #fcd34d;border-radius:12px;padding:12px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px;flex-wrap:wrap;';
      banner.innerHTML = '<span style="font-size:13px;color:#92400e;">📋 <strong>Completa i riferimenti societari</strong> — aggiungi P.IVA, Matricola FIGC e contatti ufficiali.</span>' +
        '<button style="border:none;background:#d97706;color:white;border-radius:8px;padding:6px 14px;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap;">Vai a Società →</button>';
      banner.querySelector('button').onclick = () => window.YFM.navigateTo('club');
      const container = document.getElementById('dashWidgetsContainer');
      if (container) container.insertBefore(banner, container.firstChild);
    }).catch(() => {});
  }

  // --- Welcome Onboarding Card ---
  function renderWelcomeCard() {
    const container = document.getElementById('dashWidgetsContainer');
    if (!container) return;
    const profilo = (window.YFM.getUser()?.permessi?.profilo || '').toLowerCase();
    const steps = getOnboardingSteps(profilo);
    const card = document.createElement('div');
    card.id = 'welcomeOnboarding';
    card.style.cssText = 'background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);border-radius:16px;padding:20px;color:white;position:relative;animation:scale-in 0.2s;';
    card.innerHTML = '<button id="welcomeDismiss" style="position:absolute;top:12px;right:12px;background:rgba(255,255,255,0.2);border:none;color:white;width:28px;height:28px;border-radius:50%;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;" aria-label="Chiudi">✕</button>' +
      '<div style="font-size:18px;font-weight:700;margin-bottom:4px;">👋 Benvenuto in Youth Football Manager!</div>' +
      '<div style="font-size:12px;opacity:0.8;margin-bottom:14px;">Ecco come iniziare:</div>' +
      '<div style="display:flex;flex-direction:column;gap:8px;">' +
      steps.map((s, i) => '<div style="display:flex;align-items:center;gap:10px;background:rgba(255,255,255,0.1);border-radius:10px;padding:10px 12px;cursor:pointer;" onclick="window.YFM.navigateTo(\'' + s.route + '\')">' +
        '<span style="font-size:18px;">' + s.icon + '</span>' +
        '<div><div style="font-size:13px;font-weight:600;">' + (i + 1) + '. ' + s.title + '</div><div style="font-size:11px;opacity:0.7;">' + s.desc + '</div></div></div>').join('') +
      '</div>' +
      '<div style="margin-top:14px;display:flex;gap:8px;align-items:center;">' +
      '<button id="welcomeDismissBtn" style="background:rgba(255,255,255,0.2);color:white;border:none;padding:8px 14px;border-radius:8px;cursor:pointer;font-size:12px;font-weight:600;">Non mostrare più</button>' +
      '</div>';
    container.insertBefore(card, container.firstChild);
    const dismiss = () => {
      card.remove();
      apiFetch('/users/preferences', { method: 'PUT', body: JSON.stringify({ onboarding_dismissed: true }) }).catch(() => {});
    };
    document.getElementById('welcomeDismiss').onclick = dismiss;
    document.getElementById('welcomeDismissBtn').onclick = dismiss;
  }

  function getOnboardingSteps(profilo) {
    if (profilo === 'segreteria') return [
      { icon: '🏢', title: 'Riferimenti Societari', desc: 'Completa i dati fiscali e i contatti della società', route: 'club' },
      { icon: '📋', title: 'Rosa', desc: 'Gestisci i giocatori della squadra', route: 'roster' },
      { icon: '🔗', title: 'Link Guest', desc: 'Genera link per genitori e atleti', route: 'guestLinks' },
      { icon: '📅', title: 'Calendario', desc: 'Visualizza partite e impegni', route: 'calendar' }
    ];
    if (profilo === 'dirigente') return [
      { icon: '📅', title: 'Calendario', desc: 'Consulta le partite in programma', route: 'calendar' },
      { icon: '📋', title: 'Rosa', desc: 'Visualizza i giocatori', route: 'roster' },
      { icon: '🔗', title: 'Link Guest', desc: 'Condividi accesso con i genitori', route: 'guestLinks' }
    ];
    if (profilo === 'vice_allenatore' || profilo === 'preparatore') return [
      { icon: '🏋️', title: 'Allenamenti', desc: 'Programma e presenze', route: 'trainingSessions' },
      { icon: '📋', title: 'Rosa', desc: 'Consulta i giocatori', route: 'roster' },
      { icon: '📊', title: 'Statistiche', desc: 'Analizza le performance', route: 'stats' }
    ];
    // Default: allenatore
    return [
      { icon: '📋', title: 'Rosa', desc: 'Aggiungi i tuoi giocatori', route: 'roster' },
      { icon: '📅', title: 'Calendario', desc: 'Crea la prima partita', route: 'calendar' },
      { icon: '⚽', title: 'Match Center', desc: 'Gestisci la giornata gara', route: 'calendar' },
      { icon: '🏋️', title: 'Allenamenti', desc: 'Configura la settimana tipo', route: 'trainingSessions' }
    ];
  }

  // Organize button handler
  const orgBtn = document.getElementById('dashOrganizeBtn');
  if (orgBtn) orgBtn.onclick = () => {
    const container = document.getElementById('dashWidgetsContainer');
    if (!container) return;
    // Widget lazy gestiti dalle Promise — non toccare il loro display
    const lazyWidgets = new Set(['injuries', 'certificati', 'fees', 'kit', 'checklist', 'tesseramento', 'convocazione']);
    // Get current order from DOM
    const currentWidgets = [...container.querySelectorAll('[data-widget]')];
    let order = currentWidgets.map(el => el.dataset.widget);
    // Per i widget lazy, lo stato hidden viene letto dalle preferenze salvate (non dal display DOM)
    const savedLayout = (window._dashPrefs || {}).dashboard_layout || {};
    const savedHidden = savedLayout.hidden || DEFAULT_HIDDEN;
    let hidden = order.filter(id => {
      if (lazyWidgets.has(id)) return savedHidden.includes(id);
      const el = container.querySelector('[data-widget="' + id + '"]');
      return el && el.style.display === 'none';
    });

    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:2000;display:flex;align-items:center;justify-content:center;padding:16px;';

    let selectedOrgId = null; // two-tap state
    const isMobile = window.innerWidth <= 768;

    function renderList() {
      return order.map((id) => {
        const isHidden = hidden.includes(id);
        const isSelected = selectedOrgId === id;
        const label = WIDGET_LABELS[id] || id;
        const bg = isSelected ? '#eef2ff' : (isHidden ? '#f9fafb' : '#fff');
        const border = isSelected ? '2px solid #667eea' : '1px solid #e5e7eb';
        return '<div data-id="' + id + '" draggable="true" style="display:flex;align-items:center;gap:8px;padding:12px 14px;min-height:44px;background:' + bg + ';border:' + border + ';border-radius:10px;margin-bottom:6px;opacity:' + (isHidden && !isSelected ? '0.5' : '1') + ';cursor:' + (isMobile ? 'pointer' : 'grab') + ';transition:box-shadow 0.15s,border 0.15s;">' +
          '<span style="color:' + (isSelected ? '#667eea' : '#9ca3af') + ';font-size:14px;margin-right:2px;">' + (isSelected ? '✦' : '⠿') + '</span>' +
          '<span style="flex:1;font-size:13px;font-weight:' + (isHidden ? '400' : '600') + ';color:' + (isSelected ? '#667eea' : (isHidden ? '#9ca3af' : '#1f2937')) + ';">' + label + '</span>' +
          '<button data-toggle="' + id + '" style="border:none;background:' + (isHidden ? '#e5e7eb' : '#667eea') + ';color:' + (isHidden ? '#6b7280' : 'white') + ';border-radius:6px;padding:4px 10px;font-size:11px;cursor:pointer;font-weight:600;">' + (isHidden ? 'Mostra' : 'Nascondi') + '</button></div>';
      }).join('');
    }

    function bindInteractions(listEl) {
      listEl.querySelectorAll('[data-id]').forEach(row => {
        // Two-tap (mobile + desktop click)
        row.addEventListener('click', (e) => {
          if (e.target.closest('[data-toggle]')) return; // handled separately
          const id = row.dataset.id;
          if (!selectedOrgId) {
            // Primo tap: seleziona
            selectedOrgId = id;
            renderModal();
          } else if (selectedOrgId === id) {
            // Tap sulla stessa: deseleziona
            selectedOrgId = null;
            renderModal();
          } else {
            // Secondo tap: swap posizione
            const si = order.indexOf(selectedOrgId), di = order.indexOf(id);
            if (si >= 0 && di >= 0) { order.splice(si, 1); order.splice(di, 0, selectedOrgId); }
            selectedOrgId = null;
            renderModal();
          }
        });
        // Drag & drop (desktop)
        if (!isMobile) {
          row.addEventListener('dragstart', e => {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', row.dataset.id);
            setTimeout(() => row.style.opacity = '0.4', 0);
          });
          row.addEventListener('dragend', () => {
            row.style.opacity = '';
            listEl.querySelectorAll('[data-id]').forEach(r => r.style.boxShadow = '');
          });
          row.addEventListener('dragover', e => {
            e.preventDefault();
            listEl.querySelectorAll('[data-id]').forEach(r => r.style.boxShadow = '');
            if (row.dataset.id !== e.dataTransfer.getData('text/plain')) row.style.boxShadow = '0 -2px 0 #667eea';
          });
          row.addEventListener('drop', e => {
            e.preventDefault();
            const srcId = e.dataTransfer.getData('text/plain');
            const dstId = row.dataset.id;
            if (!srcId || srcId === dstId) return;
            const si = order.indexOf(srcId), di = order.indexOf(dstId);
            if (si >= 0 && di >= 0) { order.splice(si, 1); order.splice(di, 0, srcId); }
            renderModal();
          });
        }
      });
    }

    function renderModal() {
      overlay.innerHTML = '<div style="background:white;border-radius:16px;padding:24px;max-width:380px;width:100%;max-height:85vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.3);animation:scale-in 0.2s;">' +
        '<h2 style="margin:0 0 4px 0;font-size:16px;font-weight:600;">⚙️ Organizza Dashboard</h2>' +
        '<p style="margin:0 0 16px 0;font-size:12px;color:#6b7280;">' + (isMobile ? 'Tocca per selezionare, tocca di nuovo per spostare' : 'Trascina per riordinare') + '</p>' +
        '<div id="orgList">' + renderList() + '</div>' +
        '<div style="display:flex;gap:8px;margin-top:16px;">' +
        '<button id="orgReset" style="flex:1;padding:10px;border:1px solid #ddd;border-radius:10px;background:#f9fafb;cursor:pointer;font-size:13px;font-weight:600;">↺ Reset</button>' +
        '<button id="orgSave" style="flex:1;padding:10px;border:none;border-radius:10px;background:#667eea;color:white;cursor:pointer;font-size:13px;font-weight:600;">✓ Salva</button></div></div>';

      overlay.querySelector('#orgList').onclick = (e) => {
        const toggleBtn = e.target.closest('[data-toggle]');
        if (toggleBtn) {
          const id = toggleBtn.dataset.toggle;
          hidden = hidden.includes(id) ? hidden.filter(h => h !== id) : [...hidden, id];
          renderModal();
        }
      };
      bindInteractions(overlay.querySelector('#orgList'));
      overlay.querySelector('#orgReset').onclick = () => { order = [...DEFAULT_ORDER]; hidden = [...DEFAULT_HIDDEN]; renderModal(); };
      overlay.querySelector('#orgSave').onclick = () => {
        const layout = { order, hidden };
        applyLayout(layout);
        // Aggiorna le prefs in memoria per coerenza con il modal
        if (!window._dashPrefs) window._dashPrefs = {};
        window._dashPrefs.dashboard_layout = layout;
        apiFetch('/users/preferences', { method: 'PUT', body: JSON.stringify({ dashboard_layout: layout }) }).catch(() => {});
        overlay.remove();
      };
    }

    renderModal();
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    document.addEventListener('keydown', function esc(e) { if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', esc); } });
    document.body.appendChild(overlay);
  };
}