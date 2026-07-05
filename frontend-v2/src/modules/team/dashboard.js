import { apiFetch } from '../../services/api';
import { formatDate, formatDateShort, formatTime } from '../../utils/formatters';
import { isOurTeam } from '../../utils/teamMatch';

const CACHE_TTL_LAZY = 10 * 60 * 1000; // 10 min per classifica/GR
const CACHE_TTL_FAST = 2 * 60 * 1000; // 2 min per dati principali
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
}

export default async function loadDashboard() {
  const c = document.getElementById('pageContent');
  const squadraId = window.YFM.squadraId;
  
  let stats, top, topValutazioni, partiteFuture;
  let classificaData = { classifica: null };
  let marcatoriGR = { marcatori: [] };
  let calendarioGR = { matches: [] };
  
  try {
    [stats, top, topValutazioni, partiteFuture] = await Promise.all([
      cachedFetch('dash_stats_' + squadraId, () => apiFetch('/squadre/' + squadraId + '/statistiche-complete').catch(() => ({ punti:0, partiteGiocate:0, vittorie:0, pareggi:0, sconfitte:0, golFatti:0, golSubiti:0, differenzaReti:0, risultati:[] })), CACHE_TTL_FAST),
      cachedFetch('dash_top_' + squadraId, () => apiFetch('/squadre/' + squadraId + '/top-players').catch(() => ({ marcatori:[], assistmen:[], presenze:[] })), CACHE_TTL_FAST),
      cachedFetch('dash_val_' + squadraId, () => apiFetch('/squadre/' + squadraId + '/valutazioni-top').catch(() => ({ topGiocatori:[] })), CACHE_TTL_FAST),
      cachedFetch('dash_future_' + squadraId, () => apiFetch('/squadre/' + squadraId + '/partite-future').catch(() => []), CACHE_TTL_FAST)
    ]);
  } catch (err) {
    stats = { punti: 0, partiteGiocate: 0, vittorie: 0, pareggi: 0, sconfitte: 0, golFatti: 0, golSubiti: 0, differenzaReti: 0, risultati: [] };
    top = { marcatori: [], assistmen: [], presenze: [] };
    topValutazioni = { topGiocatori: [] };
    partiteFuture = [];
  }
  
  const s = window.YFM.getSquadra();
  const prossimaPartita = partiteFuture && partiteFuture.length > 0 ? partiteFuture[0] : null;
  
  const isGuest = !!(window.YFM.guestSquadreAccesso && window.YFM.guestSquadreAccesso.length > 0);
  const hasEditAccess = !isGuest && (window.YFM.isAdmin() || window.YFM.hasRole('allenatore'));
  const convButton = hasEditAccess && prossimaPartita 
    ? '<button style="background:rgba(255,255,255,0.2);color:white;border:none;padding:10px 16px;border-radius:10px;cursor:pointer;font-weight:600;" onclick="window.YFM.openConvocation(\'' + prossimaPartita.id + '\')">👥 Convocazioni</button>'
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
    { v:(stats.differenzaReti >= 0 ? '+' : '') + stats.differenzaReti, l:'DR', c:stats.differenzaReti >= 0 ? '#27AE60' : '#E74C3C' }
  ];
  
  // Helper function for conditional sections
  const renderProssimaPartitaSection = () => {
    if (prossimaPartita) {
      const luogoHtml = prossimaPartita.luogo === 'Casa' ? ' · 🏠 Casa' : ' · ✈️ Trasferta';
      const compHtml = prossimaPartita.competizione ? ' · 🏆 ' + prossimaPartita.competizione : '';
      const btnHtml = convButton ? '<div style="margin-top:10px;">' + convButton + '</div>' : '';
      return '<div data-help="dashboard.prossimaPartita" style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:20px;margin-bottom:24px;color:white;border-radius:16px;box-shadow:0 8px 25px rgba(102,126,234,0.4);">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">' +
        '<div>' +
        '<div style="font-size:11px;font-weight:600;opacity:0.9;text-transform:uppercase;margin-bottom:4px;">⏱ Prossima Partita</div>' +
        '<div style="font-size:18px;font-weight:bold;margin-bottom:4px;">' + (window.YFM.getWorkspaceLogo() ? '<img src="' + window.YFM.getWorkspaceLogo() + '" style="width:22px;height:22px;border-radius:50%;object-fit:contain;vertical-align:middle;margin-right:6px;" onerror="this.style.display=\'none\'">' : '') + prossimaPartita.avversario + '</div>' +
        '<div style="font-size:12px;opacity:0.9;">📅 ' + formatDate(prossimaPartita.data_ora) + ' · 🕐 ' + formatTime(prossimaPartita.data_ora) + luogoHtml + compHtml + '</div>' +
        '</div>' + btnHtml +
        '</div></div>';
    }
    const btnHtml = nuovaPartitaButton ? '<div style="margin-top:12px;">' + nuovaPartitaButton + '</div>' : '';
    return '<div style="padding:16px;margin-bottom:24px;text-align:center;border:2px dashed #ddd;border-radius:12px;">' +
      '<p style="color:var(--gray);margin:0;">📅 Nessuna partita in programma</p>' + btnHtml + '</div>';
  };

  // Create player box HTML
  const createPlayerBoxHtml = (giocatore, tipo, index) => {
    const medalEmojis = ['🥇', '🥈', '🥉'];
    const medal = medalEmojis[index] || (index + 1);
    const value = tipo === 'gol' ? giocatore.gol + ' Gol' : tipo === 'assist' ? giocatore.assist + ' Assist' : giocatore.presenze + ' Pres.';
    const subValue = tipo === 'presenze' && giocatore.minuti ? '<div style="font-size:11px;color:rgba(255,255,255,0.8);margin-top:2px;">(' + giocatore.minuti + '\' min.)</div>' : '';
    const bgColor = index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : '#CD7F32';
    const bgEnd = index === 0 ? '#FFA500' : index === 1 ? '#A0A0A0' : '#8B4513';
    return '<div style="flex:1;background:linear-gradient(180deg,' + bgColor + ' 0%,' + bgEnd + ' 100%);padding:16px 8px;border-radius:16px;text-align:center;cursor:pointer;" onclick="if(typeof loadPlayerDetail===\'function\') loadPlayerDetail(\'' + giocatore.id + '\',\'' + giocatore.nome + '\');">' +
      '<div style="font-size:32px;margin-bottom:8px;">' + medal + '</div>' +
      '<div style="font-size:13px;font-weight:bold;color:#fff;margin-bottom:6px;">' + giocatore.nome + '</div>' +
      '<div style="font-size:16px;font-weight:bold;color:#fff;">' + value + '</div>' + subValue + '</div>';
  };

  const createEmptyBoxHtml = () => '<div style="flex:1;background:#e8e8e8;padding:16px 8px;border-radius:16px;text-align:center;color:#aaa;">-</div>';

  // Render top players
  const renderTopSection = (title, players, tipo) => {
    const boxes = [];
    for (let i = 0; i < 3; i++) {
      boxes.push(players[i] ? createPlayerBoxHtml(players[i], tipo, i) : createEmptyBoxHtml());
    }
    return '<div class="top-section"><h3 class="top-section-title">' + title + '</h3><div class="players-row">' + boxes.join('') + '</div></div>';
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
      return '<div style="text-align:center;"><span style="display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;background:' + style.color + ';color:white;font-size:12px;font-weight:bold;border-radius:8px;margin-bottom:4px;">' + esito + '</span><div style="font-size:10px;color:#aaa;">' + r.golFatti + '-' + r.golSubiti + '</div></div>';
    }).join('<span style="color:#ddd;margin:0 8px;align-self:center;">—</span>');
    
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
      const noiLogoHtml = wsLogo ? '<img src="' + wsLogo + '" style="width:22px;height:22px;border-radius:50%;object-fit:contain;flex-shrink:0;" onerror="this.style.display=\'none\'">' : '';
      const advLogoHtml = r.logo ? '<img src="' + r.logo + '" style="width:22px;height:22px;border-radius:50%;object-fit:contain;flex-shrink:0;" onerror="this.style.display=\'none\'">' : '';
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
        '<div style="display:flex;align-items:center;justify-content:center;padding:14px 12px;gap:8px;">' +
        '<div style="flex:1;display:flex;align-items:center;justify-content:flex-end;gap:6px;min-width:0;">' +
        '<span style="font-size:13px;font-weight:600;color:#333;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + leftName + '</span>' + leftLogo + '</div>' +
        '<span style="font-size:16px;font-weight:800;color:' + resStyle.color + ';background:' + resStyle.bg + ';padding:6px 14px;border-radius:8px;flex-shrink:0;min-width:60px;text-align:center;">' + scoreLeft + ' - ' + scoreRight + '</span>' +
        '<div style="flex:1;display:flex;align-items:center;justify-content:flex-start;gap:6px;min-width:0;">' + rightLogo +
        '<span style="font-size:13px;font-weight:600;color:#333;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + rightName + '</span></div>' +
        '</div></div>';
    }).join('');
    
    return trendBox + matchesHtml;
  };
  
  // Render staff
  const renderStaff = () => {
    const roleLabels = {
      allenatore: 'Allenatore',
      dirigente: '1° Dirigente',
      dirigente2: '2° Dirigente',
      preparatore_atletico: 'Prep. Atl.',
      allenatore_portieri: 'All. Portieri'
    };
    const staffItems = ['allenatore','dirigente','dirigente2','preparatore_atletico','allenatore_portieri']
      .filter(r => s[r])
      .map(r => '<div class="staff-item"><span style="font-size:11px;font-weight:600;color:#667eea;min-width:90px;background:#f0f4ff;padding:4px 8px;border-radius:6px;">' + roleLabels[r] + '</span><span style="font-weight:500;font-size:14px;">' + s[r] + '</span></div>')
      .join('');
    const emptyMsg = !s.allenatore && !s.dirigente ? '<p style="color:var(--gray);text-align:center;padding:20px;">Nessuno staff registrato</p>' : '';
    return staffItems + emptyMsg;
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
    return '<div class="result-card" data-help="dashboard.classifica"><h3 style="margin:0 0 14px 0;font-size:15px;color:#333;">🏆 ' + header + '</h3>' +
      (info.aggiornamento ? '<div style="font-size:10px;color:#999;margin-bottom:8px;">Aggiornata al ' + info.aggiornamento + '</div>' : '') +
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
        return '<tr' + cls + '><td style="text-align:right;padding:4px 0;"><span style="display:inline-flex;align-items:center;gap:4px;justify-content:flex-end;">' + r.home_club + getLogo(r.home_club) + '</span></td><td style="text-align:center;font-weight:700;white-space:nowrap;padding:4px 8px;">' + (r.home_points ?? '-') + ' - ' + (r.away_points ?? '-') + '</td><td style="padding:4px 0;"><span style="display:inline-flex;align-items:center;gap:4px;">' + getLogo(r.away_club) + r.away_club + '</span></td></tr>';
      }).join('');
      return '<div class="result-card" style="margin-top:20px;"><h3 style="margin:0 0 10px 0;font-size:15px;color:#333;">📅 Giornata ' + round + ' <span style="font-size:11px;color:#999;font-weight:400;">' + date + '</span></h3><table style="width:100%;border-collapse:collapse;font-size:12px;"><tbody>' + rows + '</tbody></table></div>';
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
    return '<div class="result-card" style="margin-top:20px;"><div id="grCalNav" data-round="' + defaultRound + '"></div></div>';
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
        return '<tr' + cls + '><td style="text-align:right;padding:4px 0;"><span style="display:inline-flex;align-items:center;gap:4px;justify-content:flex-end;">' + r.casa + getLogo(r.casa) + '</span></td><td style="text-align:center;font-weight:700;white-space:nowrap;padding:4px 8px;">' + score + '</td><td style="padding:4px 0;"><span style="display:inline-flex;align-items:center;gap:4px;">' + getLogo(r.ospite) + r.ospite + '</span></td></tr>';
      }).join('');
      nav.innerHTML = '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">' +
        '<button id="grCalPrev" style="background:none;border:none;font-size:18px;cursor:pointer;padding:4px 8px;opacity:' + (idx > 0 ? '1' : '0.3') + ';">◀</button>' +
        '<h3 style="margin:0;font-size:15px;color:#333;">📅 Giornata ' + round + ' <span style="font-size:11px;color:#999;font-weight:400;">' + date + '</span></h3>' +
        '<button id="grCalNext" style="background:none;border:none;font-size:18px;cursor:pointer;padding:4px 8px;opacity:' + (idx < rounds.length - 1 ? '1' : '0.3') + ';">▶</button></div>' +
        '<table style="width:100%;border-collapse:collapse;font-size:12px;"><tbody>' + rows + '</tbody></table>';
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
      return '<tr' + s + '><td style="padding:3px 4px;text-align:center;color:#999;font-size:10px;white-space:nowrap;">' + (i + 1) + '</td><td style="padding:3px 4px;white-space:nowrap;">' + m.nome + '</td><td style="padding:3px 4px;text-align:center;font-weight:700;white-space:nowrap;">' + m.gol + '</td><td style="padding:3px 4px;color:#888;font-size:10px;white-space:nowrap;max-width:80px;overflow:hidden;text-overflow:ellipsis;">' + m.squadra + '</td></tr>';
    }).join('');
    return '<div class="result-card" data-help="dashboard.marcatori" style="margin-top:20px;"><h3 style="margin:0 0 12px 0;font-size:15px;color:#333;">⚽ Top Marcatori</h3>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">' +
      '<div><div style="font-size:11px;font-weight:700;color:#999;margin-bottom:6px;">GENERALE</div><table style="width:100%;border-collapse:collapse;font-size:11px;"><tbody>' + renderTable(top10Reg) + '</tbody></table></div>' +
      '<div><div style="font-size:11px;font-weight:700;color:#667eea;margin-bottom:6px;">GIRONE ' + (classificaData?.info?.group_name || '') + '</div><table style="width:100%;border-collapse:collapse;font-size:11px;"><tbody>' + renderTable(top10Gir) + '</tbody></table></div>' +
      '</div></div>';
  };

  // Build final HTML
  const styles = '<style>' +
    '.dash-widgets { display:grid; grid-template-columns:repeat(8,1fr); gap:10px; margin-bottom:24px; }' +
    '@media (max-width: 900px) { .dash-widgets { grid-template-columns: repeat(4, 1fr) !important; } }' +
    '@media (max-width: 600px) { .dash-widgets { grid-template-columns: repeat(4, 1fr) !important; } }' +
    '@media (max-width: 400px) { .dash-widgets { grid-template-columns: repeat(2, 1fr) !important; } }' +
    '.dash-card { background:white; padding:12px 6px; text-align:center; border-radius:12px; box-shadow:0 2px 10px rgba(0,0,0,0.08); }' +
    '.top-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; margin-bottom:20px; }' +
    '@media (max-width: 900px) { .top-grid { grid-template-columns: 1fr !important; } }' +
    '.top-section { background:linear-gradient(180deg, #fff 0%, #f5f5f5 100%); padding:16px; border-radius:16px; box-shadow:0 4px 20px rgba(0,0,0,0.08); }' +
    '.top-section-title { font-size:15px;font-weight:600;color:#333;margin:0 0 14px 0;display:flex;align-items:center;gap:8px; }' +
    '.players-row { display:flex; gap:10px; }' +
    '@media (max-width: 600px) { .players-row { flex-direction:column; } }' +
    '.bottom-grid { display:grid; gap:20px; grid-template-columns:1fr; }' +
    '@media (min-width: 900px) { .bottom-grid { grid-template-columns: 1.5fr 1fr !important; } }' +
    '.result-card { background:white; padding:16px; border-radius:16px; box-shadow:0 4px 20px rgba(0,0,0,0.08); }' +
    '.match-item { cursor:pointer; transition: all 0.2s ease; }' +
    '.match-item:hover { opacity:0.9; transform:translateY(-2px); box-shadow:0 4px 12px rgba(0,0,0,0.1); }' +
    '.staff-card { background:white; padding:16px; border-radius:16px; box-shadow:0 4px 20px rgba(0,0,0,0.08); }' +
    '.staff-desktop { display:block; }' +
    '.staff-mobile { display:none; }' +
    '@media (max-width: 900px) { .staff-desktop { display:none !important; } .staff-mobile { display:block !important; } }' +
    '.staff-item { display:flex; align-items:center; gap:12px; padding:10px 0; border-bottom:1px solid #f0f0f0; }' +
    '.classifica-table { width:100%; border-collapse:collapse; font-size:12px; }' +
    '.classifica-table th { text-align:center; font-size:10px; color:#999; padding:4px 6px; border-bottom:1px solid #eee; white-space:nowrap; }' +
    '.classifica-table th:nth-child(2) { text-align:left; }' +
    '.classifica-table td { text-align:center; padding:5px 6px; border-bottom:1px solid #f5f5f5; white-space:nowrap; }' +
    '.classifica-table td:nth-child(2) { text-align:left; }' +
    '.classifica-table .cl-team { display:flex; align-items:center; gap:6px; white-space:nowrap; }' +
    '.classifica-table .cl-team img { width:20px; height:20px; border-radius:50%; object-fit:contain; flex-shrink:0; }' +
    '.classifica-row-highlight { background:#f0f4ff !important; font-weight:700; }' +
    '.classifica-row-highlight td { color:#667eea; }' +
    '</style>';

  if (isGuest) {
    // GUEST VIEW: solo prossima partita + widgets + ultimi risultati
    c.innerHTML = styles +
      '<div style="margin-bottom:24px;"><h1 class="page-title">Dashboard</h1>' +
      '<p class="page-subtitle">Stagione 2025/26 · ' + stats.partiteGiocate + ' partite</p></div>' +
      renderProssimaPartitaSection() +
      '<div class="dash-widgets">' +
      widgets.map(w => '<div class="dash-card"><div style="font-size:20px;font-weight:bold;color:' + (w.c || 'var(--text)') + ';">' + w.v + '</div><div style="font-size:10px;color:var(--gray);margin-top:4px;">' + w.l + '</div></div>').join('') +
      '</div>' +
      '<div class="result-card"><h3 style="margin:0 0 14px 0;font-size:15px;color:#333;">📋 Ultimi Risultati</h3>' + renderResults() + '</div>';
    return;
  }
    
  c.innerHTML = styles +
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;">' +
    '<div><h1 class="page-title">Dashboard</h1>' +
    '<p class="page-subtitle">Stagione 2025/26 · ' + stats.partiteGiocate + ' partite</p></div></div>' +
    
    renderProssimaPartitaSection() +
    
    '<div class="dash-widgets" data-help="dashboard.widgets">' +
    widgets.map(w => '<div class="dash-card"><div style="font-size:20px;font-weight:bold;color:' + (w.c || 'var(--text)') + ';">' + w.v + '</div><div style="font-size:10px;color:var(--gray);margin-top:4px;">' + w.l + '</div></div>').join('') +
    '</div>' +
    
    '<div class="top-grid" data-help="dashboard.topPlayers">' +
    renderTopSection('⚽ Top 3 Marcatori', (top.marcatori || []).slice(0, 3), 'gol') +
    renderTopSection('🅰️ Top 3 Assist', (top.assistmen || []).slice(0, 3), 'assist') +
    renderTopSection('🏃 Top 3 Presenze (min.)', (top.presenze || []).slice(0, 3), 'presenze') +
    '</div>' +
    
    '<div class="bottom-grid">' +
    '<div><div class="result-card" data-help="dashboard.risultati"><h3 style="margin:0 0 14px 0;font-size:15px;color:#333;">📋 Ultimi Risultati</h3>' + renderResults() + '</div>' +
    '<div class="staff-card staff-desktop" data-help="dashboard.staff" style="margin-top:20px;"><h3 style="margin:0 0 14px 0;font-size:15px;color:#333;">👥 Staff</h3><div>' + renderStaff() + '</div></div></div>' +
    '<div id="dashLazyCol"><div style="text-align:center;padding:40px;color:#999;"><div class="spinner"></div></div></div>' +
    '</div>' +
    '<div class="staff-card staff-mobile" style="margin-top:20px;"><h3 style="margin:0 0 14px 0;font-size:15px;color:#333;">👥 Staff</h3><div>' + renderStaff() + '</div></div>';

  // Lazy load: classifica + GR (cached 10min, non bloccano il render)
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
      col.innerHTML = renderClassifica() + renderCalendarioGR() + renderMarcatoriGR();
      attachCalendarioNav();
    }
  });
}