import { apiFetch } from '../../services/api';
import { formatDate, formatDateShort, formatTime } from '../../utils/formatters';

export default async function loadDashboard() {
  const c = document.getElementById('pageContent');
  const squadraId = window.YFM.squadraId;
  
  let stats, top, topValutazioni, partiteFuture;
  
  try {
    [stats, top, topValutazioni, partiteFuture] = await Promise.all([
      apiFetch('/squadre/' + squadraId + '/statistiche-complete').catch(() => ({ punti:0, partiteGiocate:0, vittorie:0, pareggi:0, sconfitte:0, golFatti:0, golSubiti:0, differenzaReti:0, risultati:[] })),
      apiFetch('/squadre/' + squadraId + '/top-players').catch(() => ({ marcatori:[], assistmen:[], presenze:[] })),
      apiFetch('/squadre/' + squadraId + '/valutazioni-top').catch(() => ({ topGiocatori:[] })),
      apiFetch('/squadre/' + squadraId + '/partite-future').catch(() => [])
    ]);
  } catch (err) {
    console.error('Dashboard load error:', err);
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
      return '<div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:20px;margin-bottom:24px;color:white;border-radius:16px;box-shadow:0 8px 25px rgba(102,126,234,0.4);">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">' +
        '<div>' +
        '<div style="font-size:11px;font-weight:600;opacity:0.9;text-transform:uppercase;margin-bottom:4px;">⏱ Prossima Partita</div>' +
        '<div style="font-size:18px;font-weight:bold;margin-bottom:4px;">' + prossimaPartita.avversario + '</div>' +
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
    const bgColor = index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : '#CD7F32';
    const bgEnd = index === 0 ? '#FFA500' : index === 1 ? '#A0A0A0' : '#8B4513';
    return '<div style="flex:1;background:linear-gradient(180deg,' + bgColor + ' 0%,' + bgEnd + ' 100%);padding:16px 8px;border-radius:16px;text-align:center;cursor:pointer;" onclick="if(typeof loadPlayerDetail===\'function\') loadPlayerDetail(\'' + giocatore.id + '\',\'' + giocatore.nome + '\');">' +
      '<div style="font-size:32px;margin-bottom:8px;">' + medal + '</div>' +
      '<div style="font-size:13px;font-weight:bold;color:#fff;margin-bottom:6px;">' + giocatore.nome + '</div>' +
      '<div style="font-size:16px;font-weight:bold;color:#fff;">' + value + '</div></div>';
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
  
  // Badge helper per competizione - VERSIONE MIGLIORATA
  const getCompetitionBadge = (tipoEvento) => {
    const badges = {
      campionato: { icon: '🏆', bg: '#e8f5e9', color: '#28a745', label: 'Campionato' },
      coppa: { icon: '🏅', bg: '#fff3e0', color: '#fd7e14', label: 'Coppa' },
      torneo: { icon: '🎯', bg: '#e3f2fd', color: '#007bff', label: 'Torneo' },
      amichevole: { icon: '🤝', bg: '#f5f5f5', color: '#6c757d', label: 'Amichevole' }
    };
    const badge = badges[tipoEvento] || badges.amichevole;
    return `<span style="display:inline-flex;align-items:center;gap:4px;background:${badge.bg};border:1px solid ${badge.color};color:${badge.color};font-size:10px;font-weight:600;padding:4px 8px;border-radius:6px;">${badge.icon} ${badge.label}</span>`;
  };
  
  // Helper per stile risultato colorato
  const getResultStyle = (gf, gs) => {
    if (gf > gs) return { bg: '#e8f5e9', color: '#28a745', label: 'V' };
    if (gf < gs) return { bg: '#ffebee', color: '#dc3545', label: 'S' };
    return { bg: '#fff8e1', color: '#b8860b', label: 'P' };
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
      return `<div style="text-align:center;">
        <span style="display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;background:${style.color};color:white;font-size:13px;font-weight:bold;border-radius:10px;margin-bottom:4px;">${style.label}</span>
        <div style="font-size:11px;font-weight:600;color:white;background:rgba(0,0,0,0.25);padding:2px 8px;border-radius:4px;">${r.golFatti}-${r.golSubiti}</div>
      </div>`;
    }).join('<span style="color:rgba(255,255,255,0.4);margin:0 10px;align-self:center;font-size:18px;">—</span>');
    
    const trendBox = '<div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);border-radius:14px;padding:16px;margin-bottom:16px;">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">' +
      '<span style="color:white;font-size:11px;font-weight:600;opacity:0.9;">ANDAMENTO ULTIME 5</span>' +
      '<span style="color:white;font-size:11px;font-weight:600;opacity:0.9;">' + v5 + 'V ' + p5 + 'P ' + s5 + 'S</span></div>' +
      '<div style="display:flex;align-items:center;justify-content:center;gap:4px;flex-wrap:wrap;margin-bottom:14px;">' + trendHtml + '</div>' +
      '<div style="display:flex;justify-content:center;gap:16px;padding-top:12px;border-top:1px solid rgba(255,255,255,0.2);">' +
      '<div style="background:rgba(255,255,255,0.15);border-radius:10px;padding:8px 16px;text-align:center;min-width:60px;">' +
      '<div style="font-size:22px;font-weight:bold;color:white;">' + gf5 + '</div><div style="font-size:10px;color:rgba(255,255,255,0.8);">Gol Fatti</div></div>' +
      '<div style="background:rgba(255,255,255,0.15);border-radius:10px;padding:8px 16px;text-align:center;min-width:60px;">' +
      '<div style="font-size:22px;font-weight:bold;color:white;">' + gs5 + '</div><div style="font-size:10px;color:rgba(255,255,255,0.8);">Gol Subiti</div></div>' +
      '<div style="background:rgba(255,255,255,0.15);border-radius:10px;padding:8px 16px;text-align:center;min-width:60px;">' +
      '<div style="font-size:22px;font-weight:bold;color:' + (dr5 >= 0 ? '#4ade80' : '#f87171') + ';">' + (dr5 >= 0 ? '+' : '') + dr5 + '</div><div style="font-size:10px;color:rgba(255,255,255,0.8);">Diff. Reti</div></div></div></div>';
    
    // LISTA PARTITE - layout identico alla demo
    const matchesHtml = risultati.map(r => {
      const isCasa = r.luogo === 'Casa';
      const icon = isCasa ? '🏠' : '✈️';
      const resultStyle = getResultStyle(r.golFatti, r.golSubiti);
      const comp = r.competizione || (r.giornata ? 'Campionato' : 'Amichevole');
      const compLower = comp.toLowerCase();
      const tipoEvento = compLower.includes('coppa') ? 'coppa' : compLower.includes('torneo') ? 'torneo' : compLower.includes('amichevole') ? 'amichevole' : 'campionato';
      const competitionBadge = getCompetitionBadge(tipoEvento);
      const giornataLabel = r.giornata ? 'G.' + r.giornata : '';
      const dotColor = r.golFatti > r.golSubiti ? '#28a745' : r.golFatti < r.golSubiti ? '#dc3545' : '#b8860b';
      const resultClass = r.golFatti > r.golSubiti ? 'match-win' : r.golFatti < r.golSubiti ? 'match-loss' : 'match-draw';
      
      return `<div class="match-item ${resultClass}" onclick="window.YFM.openMatchDetail('${r.id}')">
        <div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:10px;border-bottom:1px solid #f0f0f0;margin-bottom:10px;width:100%;">
          <div style="display:flex;align-items:center;gap:8px;">
            ${competitionBadge}
            <span style="font-size:12px;color:#555;font-weight:500;">${giornataLabel}</span>
          </div>
          <span style="font-size:12px;color:#888;">${formatDateShort(r.dataOra)}</span>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;width:100%;">
          <div style="display:flex;align-items:center;gap:10px;flex:1;min-width:0;">
            <span style="font-size:16px;">${icon}</span>
            <span style="width:12px;height:12px;border-radius:50%;background:${dotColor};flex-shrink:0;"></span>
            <span style="font-size:15px;font-weight:600;color:#222;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${r.avversario}</span>
          </div>
          <span style="font-size:16px;font-weight:bold;color:${resultStyle.color};background:${resultStyle.bg};padding:8px 16px;border-radius:8px;border:1px solid ${resultStyle.color};flex-shrink:0;letter-spacing:1px;">${r.golFatti} - ${r.golSubiti}</span>
        </div>
      </div>`;
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
    '.match-item { display:flex; flex-direction:column; padding:14px 16px; border-radius:12px; margin-bottom:10px; transition: all 0.2s ease; cursor:pointer; background:white; border:1px solid #e8e8e8; border-left:4px solid #ccc; box-shadow:0 2px 8px rgba(0,0,0,0.04); }' +
    '.match-item.match-win { border-left-color:#28a745; }' +
    '.match-item.match-draw { border-left-color:#b8860b; }' +
    '.match-item.match-loss { border-left-color:#dc3545; }' +
    '.match-item:hover { background:#f8f9ff; box-shadow:0 4px 12px rgba(0,0,0,0.08); }' +
    '.staff-card { background:white; padding:16px; border-radius:16px; box-shadow:0 4px 20px rgba(0,0,0,0.08); }' +
    '.staff-item { display:flex; align-items:center; gap:12px; padding:10px 0; border-bottom:1px solid #f0f0f0; }' +
    '</style>';

  if (isGuest) {
    // GUEST VIEW: solo prossima partita + widgets + ultimi risultati
    c.innerHTML = styles +
      '<div style="margin-bottom:24px;"><h1 class="page-title">Dashboard ' + window.YFM.getSquadraName() + '</h1>' +
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
    '<div><h1 class="page-title">Dashboard ' + window.YFM.getSquadraName() + '</h1>' +
    '<p class="page-subtitle">Stagione 2025/26 · ' + stats.partiteGiocate + ' partite</p></div></div>' +
    
    renderProssimaPartitaSection() +
    
    '<div class="dash-widgets">' +
    widgets.map(w => '<div class="dash-card"><div style="font-size:20px;font-weight:bold;color:' + (w.c || 'var(--text)') + ';">' + w.v + '</div><div style="font-size:10px;color:var(--gray);margin-top:4px;">' + w.l + '</div></div>').join('') +
    '</div>' +
    
    '<div class="top-grid">' +
    renderTopSection('⚽ Top 3 Marcatori', (top.marcatori || []).slice(0, 3), 'gol') +
    renderTopSection('🅰️ Top 3 Assist', (top.assistmen || []).slice(0, 3), 'assist') +
    renderTopSection('🏃 Top 3 Presenze', (top.presenze || []).slice(0, 3), 'presenze') +
    '</div>' +
    
    '<div class="bottom-grid">' +
    '<div class="result-card"><h3 style="margin:0 0 14px 0;font-size:15px;color:#333;">📋 Ultimi Risultati</h3>' + renderResults() + '</div>' +
    '<div class="staff-card"><h3 style="margin:0 0 14px 0;font-size:15px;color:#333;">👥 Staff</h3><div>' + renderStaff() + '</div></div>' +
    '</div>';
}