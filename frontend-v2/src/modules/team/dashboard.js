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
    
    // Widget principali
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
    
    c.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;">
        <div>
          <h1 class="page-title">Dashboard ${window.YFM.getSquadraName()}</h1>
          <p class="page-subtitle">Stagione 2025/26 · ${stats.partiteGiocate} partite</p>
        </div>
      </div>
      
      ${prossimaPartita ? `
      <!-- Prossima Partita Evidenziata -->
      <div class="card" style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:20px;margin-bottom:24px;color:white;border:none;">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
          <div>
            <div style="font-size:11px;font-weight:600;opacity:0.9;text-transform:uppercase;margin-bottom:4px;">
              ⏱ Prossima Partita
            </div>
            <div style="font-size:18px;font-weight:bold;margin-bottom:4px;">
              ${prossimaPartita.avversario}
            </div>
            <div style="font-size:12px;opacity:0.9;">
              📅 ${formatDate(prossimaPartita.data_ora)} · 🕐 ${formatTime(prossimaPartita.data_ora)}
              ${prossimaPartita.luogo === 'Casa' ? ' · 🏠 Casa' : ' · ✈️ Trasferta'}
              ${prossimaPartita.competizione ? ' · 🏆 ' + prossimaPartita.competizione : ''}
            </div>
          </div>
          <div style="display:flex;gap:8px;">
            <button class="btn" style="background:rgba(255,255,255,0.2);color:white;border:none;padding:10px 16px;border-radius:8px;cursor:pointer;" 
                    onclick="window.YFM.openConvocation('${prossimaPartita.id}')" title="Convocazioni">
              👥 Convocazioni
            </button>
            <button class="btn" style="background:rgba(255,255,255,0.2);color:white;border:none;padding:10px 16px;border-radius:8px;cursor:pointer;" 
                    onclick="window.YFM.openMatchDetail('${prossimaPartita.id}')" title="Dettagli Partita">
              ℹ️ Dettagli
            </button>
          </div>
        </div>
      </div>
      ` : `
      <div class="card" style="padding:16px;margin-bottom:24px;text-align:center;border:2px dashed #ddd;">
        <p style="color:var(--gray);margin:0;">📅 Nessuna partita in programma</p>
        <button class="btn btn-primary" style="margin-top:12px;" onclick="window.YFM.navigateTo('calendar')">+ Nuova Partita</button>
      </div>
      `}
      
      <!-- Widgets responsive -->
      <div class="dashboard-widgets" style="display:grid;grid-template-columns:repeat(8,1fr);gap:10px;margin-bottom:24px;">
        ${widgets.map(w => `
          <div class="card" style="padding:12px 6px;text-align:center;">
            <div style="font-size:18px;font-weight:bold;color:${w.c || 'var(--text)'};">${w.v}</div>
            <div style="font-size:10px;color:var(--gray);">${w.l}</div>
          </div>
        `).join('')}
      </div>
      <style>
        @media (max-width: 900px) { .dashboard-widgets { grid-template-columns: repeat(4, 1fr) !important; } }
        @media (max-width: 600px) { .dashboard-widgets { grid-template-columns: repeat(4, 1fr) !important; } }
        @media (max-width: 400px) { .dashboard-widgets { grid-template-columns: repeat(2, 1fr) !important; } }
      </style>
      
      <!-- Top 3 responsive cards -->
      <div class="top-cards-grid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:20px;">
        <!-- Top 3 Marcatori -->
        <div class="card" style="padding:12px;">
          <h3 class="section-title" style="margin:0 0 12px 0;" title="Top 3 Marcatori">⚽ Top 3 Marcatori</h3>
          <div class="top-cards-row" style="display:flex;gap:8px;">
            ${(top.marcatori || []).slice(0, 3).map((x, i) => `
              <div style="flex:1;background:${['#fff9e6','#f0f0f0','#f0f8ff'][i]};padding:10px 6px;border-radius:8px;text-align:center;">
                <div style="font-size:20px;margin-bottom:4px;">${['🥇','🥈','🥉'][i]}</div>
                <div style="font-size:12px;font-weight:bold;">${x.nome}</div>
                <div style="font-size:14px;font-weight:bold;color:#27AE60;">${x.gol} Gol</div>
              </div>
            `).join('')}
            ${(top.marcatori || []).length < 3 ? Array(3 - (top.marcatori || []).length).fill('<div style="flex:1;background:#f8f8f8;padding:10px 6px;border-radius:8px;text-align:center;color:#ccc;">-</div>').join('') : ''}
          </div>
        </div>
        <!-- Top 3 Assist -->
        <div class="card" style="padding:12px;">
          <h3 class="section-title" style="margin:0 0 12px 0;" title="Top 3 Assist">🅰️ Top 3 Assist</h3>
          <div class="top-cards-row" style="display:flex;gap:8px;">
            ${(top.assistmen || []).slice(0, 3).map((x, i) => `
              <div style="flex:1;background:${['#e6fff0','#f0f0f0','#f0f8ff'][i]};padding:10px 6px;border-radius:8px;text-align:center;">
                <div style="font-size:20px;margin-bottom:4px;">${['🥇','🥈','🥉'][i]}</div>
                <div style="font-size:12px;font-weight:bold;">${x.nome}</div>
                <div style="font-size:14px;font-weight:bold;color:#667eea;">${x.assist} Assist</div>
              </div>
            `).join('')}
            ${(top.assistmen || []).length < 3 ? Array(3 - (top.assistmen || []).length).fill('<div style="flex:1;background:#f8f8f8;padding:10px 6px;border-radius:8px;text-align:center;color:#ccc;">-</div>').join('') : ''}
          </div>
        </div>
        <!-- Top 3 Presenze -->
        <div class="card" style="padding:12px;">
          <h3 class="section-title" style="margin:0 0 12px 0;" title="Top 3 Presenze">🏃 Top 3 Presenze</h3>
          <div class="top-cards-row" style="display:flex;gap:8px;">
            ${(top.presenze || []).slice(0, 3).map((x, i) => `
              <div style="flex:1;background:${['#e6f3ff','#f0f0f0','#fff9e6'][i]};padding:10px 6px;border-radius:8px;text-align:center;">
                <div style="font-size:20px;margin-bottom:4px;">${['🥇','🥈','🥉'][i]}</div>
                <div style="font-size:12px;font-weight:bold;">${x.nome}</div>
                <div style="font-size:14px;font-weight:bold;color:#667eea;">${x.presenze} Pres.</div>
              </div>
            `).join('')}
            ${(top.presenze || []).length < 3 ? Array(3 - (top.presenze || []).length).fill('<div style="flex:1;background:#f8f8f8;padding:10px 6px;border-radius:8px;text-align:center;color:#ccc;">-</div>').join('') : ''}
          </div>
        </div>
      </div>
      
      <!-- Top Valutazioni -->
      ${(topValutazioni.topGiocatori || []).length > 0 ? `
      <div class="card" style="padding:16px;margin-bottom:20px;">
        <h3 class="section-title" style="margin:0 0 12px 0;" title="Migliori per Media Voto">⭐ Migliori per Media Voto</h3>
        <div style="display:flex;flex-direction:column;gap:8px;">
          ${topValutazioni.topGiocatori.slice(0, 5).map((g, i) => `
            <div style="display:flex;align-items:center;gap:12px;padding:8px 12px;background:${i === 0 ? '#fff9e6' : '#f8f9fa'};border-radius:8px;">
              <span style="font-size:18px;">${['🥇','🥈','🥉','4','5'][i]}</span>
              <span style="flex:1;font-weight:600;">${g.nome}</span>
              <span style="font-size:12px;color:#888;">${g.partiteValutate} partite</span>
              <span style="font-size:18px;font-weight:bold;color:#667eea;">${g.media}</span>
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}
      
      <style>
        @media (max-width: 900px) { .top-cards-grid { grid-template-columns: 1fr !important; } }
      </style>
      
      <!-- Ultimi Risultati + Staff (2 colonne desktop) -->
      <div class="dashboard-bottom-grid" style="display:grid;gap:20px;grid-template-columns:1fr;">
        <!-- Ultimi Risultati -->
        <div class="card">
          <h3 class="section-title" title="Ultimi Risultati">📋 Ultimi Risultati</h3>
          ${(() => {
            const risultati = (stats.risultati || []).slice(0, 5);
            if (risultati.length === 0) return '<p style="color:var(--gray);text-align:center;padding:20px;">Nessuna partita disputata</p>';
            
            // Calcola stats solo per le ultime 5
            const ultimi5 = risultati.slice(0, 5);
            const gf5 = ultimi5.reduce((sum, r) => sum + (r.golFatti || 0), 0);
            const gs5 = ultimi5.reduce((sum, r) => sum + (r.golSubiti || 0), 0);
            const dr5 = gf5 - gs5;
            const vittorie5 = ultimi5.filter(r => r.golFatti > r.golSubiti).length;
            const pareggi5 = ultimi5.filter(r => r.golFatti === r.golSubiti).length;
            const sconfitte5 = ultimi5.filter(r => r.golFatti < r.golSubiti).length;
            const punti5 = vittorie5 * 3 + pareggi5;
            
            // Trend: ultimi 5 risultati
            const trendHtml = ultimi5.map(r => {
              const esito = r.golFatti > r.golSubiti ? 'V' : r.golFatti === r.golSubiti ? 'P' : 'S';
              const color = r.golFatti > r.golSubiti ? '#27AE60' : r.golFatti === r.golSubiti ? '#F39C12' : '#E74C3C';
              return `<span style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;background:${color};color:white;font-size:11px;font-weight:bold;border-radius:6px;" title="${esito === 'V' ? 'Vittoria' : esito === 'P' ? 'Pareggio' : 'Sconfitta'}">${esito}</span>`;
            }).join('<span style="color:#ddd;margin:0 4px;">—</span>');
            
            const gruppi = {};
            ultimi5.forEach(r => {
              const comp = r.competizione || 'Altro';
              if (!gruppi[comp]) gruppi[comp] = [];
              gruppi[comp].push(r);
            });
            
            return `
              <!-- Trend Grafico -->
              <div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);border-radius:12px;padding:16px;margin-bottom:16px;">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
                  <span style="color:white;font-size:11px;font-weight:600;opacity:0.9;">ANDAMENTO ULTIME 5</span>
                  <span style="color:white;font-size:10px;opacity:0.8;">V = Vittoria · P = Pareggio · S = Sconfitta</span>
                </div>
                <div style="display:flex;align-items:center;justify-content:center;gap:6px;flex-wrap:wrap;">
                  ${trendHtml}
                </div>
                <div style="display:flex;justify-content:center;gap:16px;margin-top:12px;padding-top:10px;border-top:1px solid rgba(255,255,255,0.2);">
                  <div style="background:rgba(255,255,255,0.15);border-radius:8px;padding:8px 16px;text-align:center;min-width:60px;" title="Gol Fatti">
                    <div style="font-size:22px;font-weight:bold;color:white;">${gf5}</div>
                    <div style="font-size:10px;color:rgba(255,255,255,0.8);">Gol Fatti</div>
                  </div>
                  <div style="background:rgba(255,255,255,0.15);border-radius:8px;padding:8px 16px;text-align:center;min-width:60px;" title="Gol Subiti">
                    <div style="font-size:22px;font-weight:bold;color:white;">${gs5}</div>
                    <div style="font-size:10px;color:rgba(255,255,255,0.8);">Gol Subiti</div>
                  </div>
                  <div style="background:rgba(255,255,255,0.15);border-radius:8px;padding:8px 16px;text-align:center;min-width:60px;" title="Differenza Reti">
                    <div style="font-size:22px;font-weight:bold;color:${dr5 >= 0 ? '#4ade80' : '#f87171'};">${dr5 >= 0 ? '+' : ''}${dr5}</div>
                    <div style="font-size:10px;color:rgba(255,255,255,0.8);">Diff. Reti</div>
                  </div>
                </div>
              </div>
              
              ${Object.entries(gruppi).map(([comp, partite]) => `
                <div style="margin-bottom:12px;">
                  <h4 style="margin:0 0 6px 0;padding:4px 8px;background:#f0f4ff;color:#667eea;border-radius:6px;font-size:11px;font-weight:600;">
                    ${comp}
                  </h4>
                  ${partite.map(r => {
                    const isCasa = r.luogo === 'Casa';
                    const resultColor = r.golFatti > r.golSubiti ? '#27AE60' : r.golFatti === r.golSubiti ? '#F39C12' : '#E74C3C';
                    const resultIcon = r.golFatti > r.golSubiti ? '✅' : r.golFatti === r.golSubiti ? '🤝' : '❌';
                    return `
                      <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 6px;border-bottom:1px solid #f0f0f0;cursor:pointer;" 
                           onclick="window.YFM.openMatchDetail('${r.id}')">
                        <div style="display:flex;align-items:center;gap:8px;">
                          <span style="font-size:10px;color:#667eea;font-weight:600;min-width:24px;" title="Giornata">G.${String(r.giornata || '-').padStart(2,'0')}</span>
                          <span style="font-size:11px;color:var(--gray);">${formatDateShort(r.dataOra)}</span>
                          <span title="${isCasa ? 'Casa' : 'Trasferta'}" style="font-size:12px;">${isCasa ? '🏠' : '✈️'}</span>
                        </div>
                        <div style="display:flex;align-items:center;gap:6px;">
                          <span style="font-size:11px;color:var(--gray);">${r.avversario}</span>
                          <span style="font-size:14px;font-weight:bold;color:${resultColor};">${r.golFatti} - ${r.golSubiti}</span>
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>
              `).join('')}
            `;
          })()}
        </div>
        
        <!-- Staff -->
        <div class="card">
          <h3 class="section-title" title="Staff della Squadra">👥 Staff</h3>
          <div style="display:flex;flex-direction:column;gap:8px;">
            ${['allenatore','dirigente','dirigente2','preparatore_atletico','allenatore_portieri'].filter(r => s[r]).map(r => `
              <div style="display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid #f0f0f0;">
                <span style="font-size:11px;font-weight:600;color:var(--primary);min-width:80px;">
                  ${r==='allenatore'?'Allenatore':r==='dirigente'?'1° Dirigente':r==='dirigente2'?'2° Dirigente':r==='preparatore_atletico'?'Prep. Atl.':'All. Portieri'}
                </span>
                <span style="font-weight:500;">${s[r]}</span>
              </div>
            `).join('')}
            ${!s.allenatore && !s.dirigente ? '<p style="color:var(--gray);">Nessuno staff registrato</p>' : ''}
          </div>
        </div>
      </div>
      <style>
        @media (min-width: 900px) { .dashboard-bottom-grid { grid-template-columns: 1.5fr 1fr !important; } }
      </style>
    `;
  } catch (error) {
    c.innerHTML = `<div class="error-box">Errore: ${error.message}</div>`;
  }
}
