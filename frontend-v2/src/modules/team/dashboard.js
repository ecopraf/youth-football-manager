import { apiFetch } from '../../services/api';
import { formatDate, formatDateShort, formatTime } from '../../utils/formatters';

export default async function loadDashboard() {
  const c = document.getElementById('pageContent');
  const squadraId = window.YFM.squadraId;
  
  try {
    const [stats, top, topValutazioni, partiteFuture] = await Promise.all([
      apiFetch('/squadre/' + squadraId + '/statistiche-complete').catch(() => ({ punti:0, partiteGiocate:0, vittorie:0, pareggi:0, sconfitte:0, golFatti:0, golSubiti:0, differenzaReti:0, risultati:[] })),
      apiFetch('/squadre/' + squadraId + '/top-players').catch(() => ({ marcatori:[], assistmen:[], presenze:[] })),
      apiFetch('/squadre/' + squadraId + '/valutazioni-top').catch(() => ({ topGiocatori:[] })),
      apiFetch('/squadre/' + squadraId + '/partite-future').catch(() => [])
    ]);
    
    const s = window.YFM.getSquadra();
    const prossimaPartita = partiteFuture && partiteFuture.length > 0 ? partiteFuture[0] : null;
    
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
    
    const medalColors = [
      'linear-gradient(180deg, #FFD700 0%, #FFA500 100%)',
      'linear-gradient(180deg, #E8E8E8 0%, #A0A0A0 100%)',
      'linear-gradient(180deg, #CD7F32 0%, #8B4513 100%)'
    ];
    
    c.innerHTML = \`
      <style>
        .dash-widgets { display:grid; grid-template-columns:repeat(8,1fr); gap:10px; margin-bottom:24px; }
        @media (max-width: 900px) { .dash-widgets { grid-template-columns: repeat(4, 1fr) !important; } }
        @media (max-width: 600px) { .dash-widgets { grid-template-columns: repeat(4, 1fr) !important; } }
        @media (max-width: 400px) { .dash-widgets { grid-template-columns: repeat(2, 1fr) !important; } }
        .dash-card { background:white; padding:12px 6px; text-align:center; border-radius:12px; box-shadow:0 2px 10px rgba(0,0,0,0.08); }
        .top-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; margin-bottom:20px; }
        @media (max-width: 900px) { .top-grid { grid-template-columns: 1fr !important; } }
        .top-section { background:linear-gradient(180deg, #fff 0%, #f5f5f5 100%); padding:16px; border-radius:16px; box-shadow:0 4px 20px rgba(0,0,0,0.08); }
        .player-card { padding:14px 8px; border-radius:16px; text-align:center; cursor:pointer; transition: all 0.3s ease; box-shadow:0 4px 15px rgba(0,0,0,0.1); }
        .player-card:hover { transform: translateY(-8px) scale(1.03); box-shadow:0 15px 30px rgba(0,0,0,0.2); }
        .bottom-grid { display:grid; gap:20px; grid-template-columns:1fr; }
        @media (min-width: 900px) { .bottom-grid { grid-template-columns: 1.5fr 1fr !important; } }
        .result-card { background:white; padding:16px; border-radius:16px; box-shadow:0 4px 20px rgba(0,0,0,0.08); }
        .match-item { display:flex; align-items:center; justify-content:space-between; padding:10px 8px; border-radius:10px; margin-bottom:6px; transition: all 0.2s ease; cursor:pointer; background:#fafafa; }
        .match-item:hover { background:#f0f0f0; transform: translateX(5px); }
        .staff-card { background:white; padding:16px; border-radius:16px; box-shadow:0 4px 20px rgba(0,0,0,0.08); }
        .staff-item { display:flex; align-items:center; gap:12px; padding:10px 0; border-bottom:1px solid #f0f0f0; }
      </style>
      
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;">
        <div>
          <h1 class="page-title">Dashboard \${window.YFM.getSquadraName()}</h1>
          <p class="page-subtitle">Stagione 2025/26 · \${stats.partiteGiocate} partite</p>
        </div>
      </div>
      
      \${prossimaPartita ? \`
      <div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:20px;margin-bottom:24px;color:white;border-radius:16px;box-shadow:0 8px 25px rgba(102,126,234,0.4);">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
          <div>
            <div style="font-size:11px;font-weight:600;opacity:0.9;text-transform:uppercase;margin-bottom:4px;">⏱ Prossima Partita</div>
            <div style="font-size:18px;font-weight:bold;margin-bottom:4px;">\${prossimaPartita.avversario}</div>
            <div style="font-size:12px;opacity:0.9;">
              📅 \${formatDate(prossimaPartita.data_ora)} · 🕐 \${formatTime(prossimaPartita.data_ora)}
              \${prossimaPartita.luogo === 'Casa' ? ' · 🏠 Casa' : ' · ✈️ Trasferta'}
              \${prossimaPartita.competizione ? ' · 🏆 ' + prossimaPartita.competizione : ''}
            </div>
          </div>
          \${(window.YFM.isAdmin() || window.YFM.hasRole('allenatore')) ? \`
          <button style="background:rgba(255,255,255,0.2);color:white;border:none;padding:10px 16px;border-radius:10px;cursor:pointer;font-weight:600;" 
                  onclick="window.YFM.openConvocation('\${prossimaPartita.id}')">👥 Convocazioni</button>
          \` : ''}
        </div>
      </div>
      \` : \`
      <div style="padding:16px;margin-bottom:24px;text-align:center;border:2px dashed #ddd;border-radius:12px;">
        <p style="color:var(--gray);margin:0;">📅 Nessuna partita in programma</p>
        \${(window.YFM.isAdmin() || window.YFM.hasRole('allenatore')) ? \`
        <button class="btn btn-primary" style="margin-top:12px;" onclick="window.YFM.navigateTo('calendar')">+ Nuova Partita</button>
        \` : ''}
      </div>
      \`}
      
      <div class="dash-widgets">
        \${widgets.map(w => \`
          <div class="dash-card">
            <div style="font-size:20px;font-weight:bold;color:\${w.c || 'var(--text)'};">\${w.v}</div>
            <div style="font-size:10px;color:var(--gray);margin-top:4px;">\${w.l}</div>
          </div>
        \`).join('')}
      </div>
      
      <div class="top-grid">
        <div class="top-section">
          <h3 style="margin:0 0 14px 0;font-size:14px;color:#333;">⚽ Top 3 Marcatori</h3>
          <div style="display:flex;gap:8px;">
            \${(top.marcatori || []).slice(0, 3).map((x, i) => \`
              <div class="player-card" style="flex:1;background:\${medalColors[i]};"
                   onclick="if(typeof loadPlayerDetail==='function') loadPlayerDetail('\${x.id}', '\${x.nome}');">
                <div style="font-size:26px;margin-bottom:6px;filter:drop-shadow(0 2px 3px rgba(0,0,0,0.3));">\${['🥇','🥈','🥉'][i]}</div>
                <div style="font-size:12px;font-weight:bold;color:#222;margin-bottom:4px;">\${x.nome}</div>
                <div style="font-size:15px;font-weight:bold;color:#fff;">\${x.gol} Gol</div>
              </div>
            \`).join('')}
            \${(top.marcatori || []).length < 3 ? Array(3 - (top.marcatori || []).length).fill('<div style="flex:1;background:#e0e0e0;padding:14px 8px;border-radius:16px;text-align:center;color:#999;">-</div>').join('') : ''}
          </div>
        </div>
        <div class="top-section">
          <h3 style="margin:0 0 14px 0;font-size:14px;color:#333;">🅰️ Top 3 Assist</h3>
          <div style="display:flex;gap:8px;">
            \${(top.assistmen || []).slice(0, 3).map((x, i) => \`
              <div class="player-card" style="flex:1;background:\${medalColors[i]};"
                   onclick="if(typeof loadPlayerDetail==='function') loadPlayerDetail('\${x.id}', '\${x.nome}');">
                <div style="font-size:26px;margin-bottom:6px;filter:drop-shadow(0 2px 3px rgba(0,0,0,0.3));">\${['🥇','🥈','🥉'][i]}</div>
                <div style="font-size:12px;font-weight:bold;color:#222;margin-bottom:4px;">\${x.nome}</div>
                <div style="font-size:15px;font-weight:bold;color:#fff;">\${x.assist} Assist</div>
              </div>
            \`).join('')}
            \${(top.assistmen || []).length < 3 ? Array(3 - (top.assistmen || []).length).fill('<div style="flex:1;background:#e0e0e0;padding:14px 8px;border-radius:16px;text-align:center;color:#999;">-</div>').join('') : ''}
          </div>
        </div>
        <div class="top-section">
          <h3 style="margin:0 0 14px 0;font-size:14px;color:#333;">🏃 Top 3 Presenze</h3>
          <div style="display:flex;gap:8px;">
            \${(top.presenze || []).slice(0, 3).map((x, i) => \`
              <div class="player-card" style="flex:1;background:\${medalColors[i]};"
                   onclick="if(typeof loadPlayerDetail==='function') loadPlayerDetail('\${x.id}', '\${x.nome}');">
                <div style="font-size:26px;margin-bottom:6px;filter:drop-shadow(0 2px 3px rgba(0,0,0,0.3));">\${['🥇','🥈','🥉'][i]}</div>
                <div style="font-size:12px;font-weight:bold;color:#222;margin-bottom:4px;">\${x.nome}</div>
                <div style="font-size:15px;font-weight:bold;color:#fff;">\${x.presenze} Pres.</div>
              </div>
            \`).join('')}
            \${(top.presenze || []).length < 3 ? Array(3 - (top.presenze || []).length).fill('<div style="flex:1;background:#e0e0e0;padding:14px 8px;border-radius:16px;text-align:center;color:#999;">-</div>').join('') : ''}
          </div>
        </div>
      </div>
      
      <div class="bottom-grid">
        <div class="result-card">
          <h3 style="margin:0 0 14px 0;font-size:15px;color:#333;">📋 Ultimi Risultati</h3>
          \${(() => {
            const risultati = (stats.risultati || []).slice(0, 5);
            if (risultati.length === 0) return '<p style="color:var(--gray);text-align:center;padding:20px;">Nessuna partita disputata</p>';
            
            const ultimi5 = risultati.slice(0, 5);
            const gf5 = ultimi5.reduce((sum, r) => sum + (r.golFatti || 0), 0);
            const gs5 = ultimi5.reduce((sum, r) => sum + (r.golSubiti || 0), 0);
            const dr5 = gf5 - gs5;
            
            const trendHtml = ultimi5.map(r => {
              const esito = r.golFatti > r.golSubiti ? 'V' : r.golFatti === r.golSubiti ? 'P' : 'S';
              const color = r.golFatti > r.golSubiti ? '#27AE60' : r.golFatti === r.golSubiti ? '#F39C12' : '#E74C3C';
              return \`<span style="display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;background:\${color};color:white;font-size:12px;font-weight:bold;border-radius:8px;box-shadow:0 2px 6px rgba(0,0,0,0.2);">\${esito}</span>\`;
            }).join('<span style="color:#ddd;margin:0 6px;">—</span>');
            
            return \`
              <div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);border-radius:14px;padding:16px;margin-bottom:16px;">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
                  <span style="color:white;font-size:11px;font-weight:600;opacity:0.9;">ANDAMENTO ULTIME 5</span>
                </div>
                <div style="display:flex;align-items:center;justify-content:center;gap:6px;flex-wrap:wrap;margin-bottom:12px;">\${trendHtml}</div>
                <div style="display:flex;justify-content:center;gap:16px;padding-top:10px;border-top:1px solid rgba(255,255,255,0.2);">
                  <div style="background:rgba(255,255,255,0.15);border-radius:10px;padding:8px 16px;text-align:center;min-width:60px;">
                    <div style="font-size:22px;font-weight:bold;color:white;">\${gf5}</div>
                    <div style="font-size:10px;color:rgba(255,255,255,0.8);">Gol Fatti</div>
                  </div>
                  <div style="background:rgba(255,255,255,0.15);border-radius:10px;padding:8px 16px;text-align:center;min-width:60px;">
                    <div style="font-size:22px;font-weight:bold;color:white;">\${gs5}</div>
                    <div style="font-size:10px;color:rgba(255,255,255,0.8);">Gol Subiti</div>
                  </div>
                  <div style="background:rgba(255,255,255,0.15);border-radius:10px;padding:8px 16px;text-align:center;min-width:60px;">
                    <div style="font-size:22px;font-weight:bold;color:\${dr5 >= 0 ? '#4ade80' : '#f87171'};">\${dr5 >= 0 ? '+' : ''}\${dr5}</div>
                    <div style="font-size:10px;color:rgba(255,255,255,0.8);">Diff. Reti</div>
                  </div>
                </div>
              </div>
              \${risultati.map(r => {
                const isCasa = r.luogo === 'Casa';
                const resultColor = r.golFatti > r.golSubiti ? '#27AE60' : r.golFatti === r.golSubiti ? '#F39C12' : '#E74C3C';
                return \`
                  <div class="match-item" onclick="window.YFM.openMatchDetail('\${r.id}')">
                    <div style="display:flex;align-items:center;gap:10px;">
                      <span style="font-size:10px;color:#667eea;font-weight:600;min-width:24px;">G.\${String(r.giornata || '-').padStart(2,'0')}</span>
                      <span style="font-size:11px;color:var(--gray);">\${formatDateShort(r.dataOra)}</span>
                      <span style="font-size:12px;">\${isCasa ? '🏠' : '✈️'}</span>
                    </div>
                    <div style="display:flex;align-items:center;gap:8px;">
                      <span style="font-size:12px;color:var(--gray);max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">\${r.avversario}</span>
                      <span style="font-size:15px;font-weight:bold;color:\${resultColor};background:#f8f8f8;padding:4px 10px;border-radius:8px;">\${r.golFatti} - \${r.golSubiti}</span>
                    </div>
                  </div>
                \`;
              }).join('')}
            \`;
          })()}
        </div>
        
        <div class="staff-card">
          <h3 style="margin:0 0 14px 0;font-size:15px;color:#333;">👥 Staff</h3>
          <div>
            \${['allenatore','dirigente','dirigente2','preparatore_atletico','allenatore_portieri'].filter(r => s[r]).map(r => \`
              <div class="staff-item">
                <span style="font-size:11px;font-weight:600;color:#667eea;min-width:90px;background:#f0f4ff;padding:4px 8px;border-radius:6px;">
                  \${r==='allenatore'?'Allenatore':r==='dirigente'?'1° Dirigente':r==='dirigente2'?'2° Dirigente':r==='preparatore_atletico'?'Prep. Atl.':'All. Portieri'}
                </span>
                <span style="font-weight:500;font-size:14px;">\${s[r]}</span>
              </div>
            \`).join('')}
            \${!s.allenatore && !s.dirigente ? '<p style="color:var(--gray);text-align:center;padding:20px;">Nessuno staff registrato</p>' : ''}
          </div>
        </div>
      </div>
    \`;
  } catch (error) {
    c.innerHTML = \`<div class="error-box">Errore: \${error.message}</div>\`;
  }
}
