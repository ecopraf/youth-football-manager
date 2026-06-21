import { apiFetch } from '../../services/api';
import { formatDate, formatDateShort } from '../../utils/formatters';

export default async function loadDashboard() {
  const c = document.getElementById('pageContent');
  const squadraId = window.YFM.squadraId;
  
  try {
    const [stats, top] = await Promise.all([
      apiFetch('/squadre/' + squadraId + '/statistiche-complete').catch(() => ({ punti:0, partiteGiocate:0, vittorie:0, pareggi:0, sconfitte:0, golFatti:0, golSubiti:0, differenzaReti:0, risultati:[] })),
      apiFetch('/squadre/' + squadraId + '/top-players').catch(() => ({ marcatori:[], assistmen:[], presenze:[] }))
    ]);
    
    const s = window.YFM.getSquadra();
    
    // Widget principali
    const widgets = [
      { i:'🏆', v:stats.punti, l:'Punti', c:'#27AE60' },
      { i:'📊', v:stats.partiteGiocate, l:'Giocate' },
      { i:'✅', v:stats.vittorie, l:'Vittorie', c:'#27AE60' },
      { i:'🤝', v:stats.pareggi, l:'Pareggi', c:'#F39C12' },
      { i:'❌', v:stats.sconfitte, l:'Sconfitte', c:'#E74C3C' },
      { i:'⚽', v:stats.golFatti, l:'GF' },
      { i:'🥅', v:stats.golSubiti, l:'GS' },
      { i:'📈', v:(stats.differenzaReti >= 0 ? '+' : '') + stats.differenzaReti, l:'DR', c:stats.differenzaReti >= 0 ? '#27AE60' : '#E74C3C' }
    ];
    
    c.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;">
        <div>
          <h1 class="page-title">Dashboard ${window.YFM.getSquadraName()}</h1>
          <p class="page-subtitle">Stagione 2025/26 · ${stats.partiteGiocate} partite</p>
        </div>
        <button class="btn btn-primary" id="btnNewMatch">+ Nuova Partita</button>
      </div>
      
      <!-- Widgets -->
      <div class="widgets">
        ${widgets.map(w => `
          <div class="card widget">
            <div class="widget-value" style="${w.c ? 'color:' + w.c : ''}">${w.v}</div>
            <div class="widget-label">${w.l}</div>
          </div>
        `).join('')}
      </div>
      
      <!-- Top 5 Marcatori e Assist -->
      <div class="grid-2" style="margin-bottom:20px;">
        <div class="card">
          <h3 class="section-title">⚽ Top 5 Marcatori</h3>
          ${(top.marcatori || []).map((x, i) => `
            <div class="top-player">
              <span>${['🥇','🥈','🥉','4°','5°'][i]}</span>
              <div class="top-player-avatar">${(x.nome || '?')[0]}</div>
              <span class="top-player-name">${x.nome}</span>
              <span class="top-player-stat">${x.gol} Gol</span>
            </div>
          `).join('')}
        </div>
        <div class="card">
          <h3 class="section-title">🅰️ Top 5 Assist</h3>
          ${(top.assistmen || []).map((x, i) => `
            <div class="top-player">
              <span>${['🥇','🥈','🥉','4°','5°'][i]}</span>
              <div class="top-player-avatar">${(x.nome || '?')[0]}</div>
              <span class="top-player-name">${x.nome}</span>
              <span class="top-player-stat">${x.assist} Assist</span>
            </div>
          `).join('')}
        </div>
      </div>
      
      <!-- Top 5 Presenze e Ultimi 5 Risultati -->
      <div class="grid-2" style="margin-bottom:20px;">
        <div class="card">
          <h3 class="section-title">🏃 Top 5 Presenze</h3>
          ${(top.presenze || []).map((x, i) => `
            <div class="top-player">
              <span>${['🥇','🥈','🥉','4°','5°'][i]}</span>
              <div class="top-player-avatar">${(x.nome || '?')[0]}</div>
              <span class="top-player-name">${x.nome}</span>
              <span class="top-player-stat">${x.presenze} Pres. · ${x.minuti}'</span>
            </div>
          `).join('')}
        </div>
        <div class="card">
          <h3 class="section-title">📋 Ultimi Risultati</h3>
          ${(stats.risultati || []).slice(0, 5).map(r => `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);cursor:pointer;" 
                 onclick="window.YFM.openMatchDetail('${r.id}')">
              <div>
                <span style="font-size:13px;color:var(--gray);">${formatDateShort(r.dataOra)}</span><br>
                <strong>vs ${r.avversario}</strong>
              </div>
              <div style="font-size:18px;font-weight:bold;color:${r.golFatti > r.golSubiti ? '#27AE60' : r.golFatti === r.golSubiti ? '#F39C12' : '#E74C3C'};">
                ${r.golFatti} - ${r.golSubiti}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
      
      <!-- Staff -->
      <div class="card">
        <h3 class="section-title">👥 Staff</h3>
        <div style="display:flex;flex-wrap:wrap;gap:16px;">
          ${['allenatore','dirigente','dirigente2','preparatore_atletico','allenatore_portieri'].map(r => `
            <div>
              <strong>${r==='allenatore'?'All.':r==='dirigente'?'1° Dir.':r==='dirigente2'?'2° Dir.':r==='preparatore_atletico'?'Prep. Atl.':'All. Port.'}:</strong> 
              ${s[r] || 'N/D'}
            </div>
          `).join('')}
        </div>
      </div>
    `;
    
    document.getElementById('btnNewMatch').addEventListener('click', () => {
      window.YFM.navigateTo('calendar');
    });
  } catch (error) {
    c.innerHTML = `<div class="error-box">Errore: ${error.message}</div>`;
  }
}
