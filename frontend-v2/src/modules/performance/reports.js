import { apiFetch } from '../../services/api';
import { formatDate, formatDateShort, formatBirthDate } from '../../utils/formatters';
import { showLoading, hideLoading } from '../../utils/ui';
import { printHTML } from '../../utils/printHelper';

export default async function loadReports() {
  const c = document.getElementById('pageContent');
  c.innerHTML = `
    <h1 class="page-title">Report</h1>
    <p class="page-subtitle">Genera e scarica report della stagione</p>
    
    <div class="report-tabs" style="margin-bottom:24px;">
      <button class="report-tab active" data-tab="match" data-help="reports.partita">📄 Report Partita</button>
      <button class="report-tab" data-tab="seasonal" data-help="reports.stagionale">📊 Report Stagionale</button>
      <button class="report-tab" data-tab="player" data-help="reports.giocatore">👤 Report Giocatore</button>
    </div>
    
    <!-- Tab Report Partita -->
    <div id="tabMatch" class="report-tab-content">
      <div class="card">
        <div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap;margin-bottom:16px;">
          <label style="font-weight:500;">Seleziona partita:</label>
          <div style="flex:1;min-width:250px;position:relative;">
            <input type="text" id="matchSearchInput" placeholder="🔍 Cerca avversario..." style="width:100%;padding:10px;border:1px solid var(--border);border-radius:8px;margin-bottom:4px;">
            <select id="reportMatchSelect" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:8px;">
              <option value="">-- Caricamento partite --</option>
            </select>
          </div>
          <button class="btn btn-primary" id="btnGenerateReport" disabled>Genera Report</button>
          <button class="btn btn-secondary" id="btnPrintReport" style="display:none;">🖨️ Stampa / Salva PDF</button>
        </div>
        <div id="reportContent" style="display:none;"></div>
      </div>
    </div>
    
    <!-- Tab Report Stagionale -->
    <div id="tabSeasonal" class="report-tab-content" style="display:none;">
      <div class="card">
        <div style="display:flex;gap:16px;margin-bottom:16px;">
          <button class="btn btn-primary" id="btnGenerateSeasonalReport">Genera Report Stagionale</button>
          <button class="btn btn-secondary" id="btnPrintSeasonalReport" style="display:none;">🖨️ Stampa / Salva PDF</button>
        </div>
        <div id="seasonalReportContent" style="display:none;"></div>
      </div>
    </div>
    
    <!-- Tab Report Giocatore -->
    <div id="tabPlayer" class="report-tab-content" style="display:none;">
      <div class="card">
        <div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap;margin-bottom:16px;">
          <label style="font-weight:500;">Seleziona giocatore:</label>
          <div style="flex:1;min-width:250px;position:relative;">
            <input type="text" id="playerSearchInput" placeholder="🔍 Cerca giocatore..." style="width:100%;padding:10px;border:1px solid var(--border);border-radius:8px;margin-bottom:4px;">
            <select id="playerSelect" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:8px;">
              <option value="">-- Seleziona giocatore --</option>
            </select>
          </div>
          <button class="btn btn-primary" id="btnGeneratePlayerReport" disabled>Genera Report</button>
          <button class="btn btn-secondary" id="btnPrintPlayerReport" style="display:none;">🖨️ Stampa / Salva PDF</button>
        </div>
        <div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap;margin-bottom:16px;padding:12px;background:#f8f9fa;border-radius:8px;">
          <span style="font-weight:500;font-size:13px;">Includi:</span>
          <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;"><input type="checkbox" id="chkCampionato" checked style="accent-color:#667eea;"> Campionato</label>
          <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;"><input type="checkbox" id="chkCoppa" checked style="accent-color:#667eea;"> Coppa</label>
          <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;"><input type="checkbox" id="chkAmichevoli" style="accent-color:#667eea;"> Amichevoli</label>
        </div>
        <div id="playerReportContent" style="display:none;"></div>
      </div>
    </div>
    
    <style>
      .report-tabs { display:flex;gap:8px;border-bottom:2px solid var(--border);padding-bottom:0; }
      .report-tab { padding:12px 24px;background:transparent;border:none;border-bottom:3px solid transparent;cursor:pointer;font-size:14px;font-weight:500;color:var(--gray);transition:all 0.2s; }
      .report-tab:hover { color:var(--primary); }
      .report-tab.active { color:var(--primary);border-bottom-color:var(--primary); }
      .report-tab-content { animation:fadeIn 0.3s; }
      @keyframes fadeIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
    </style>
  `;

  // Carica partite e giocatori
  loadMatchList();
  loadPlayerList();

  // Tab switching
  document.querySelectorAll('.report-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.report-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.report-tab-content').forEach(c => c.style.display = 'none');
      tab.classList.add('active');
      document.getElementById('tab' + tab.dataset.tab.charAt(0).toUpperCase() + tab.dataset.tab.slice(1)).style.display = 'block';
    });
  });

  // Event listeners
  document.getElementById('btnGenerateReport').addEventListener('click', generateReport);
  document.getElementById('btnPrintReport').addEventListener('click', printReport);
  document.getElementById('btnGenerateSeasonalReport').addEventListener('click', generateSeasonalReport);
  document.getElementById('btnPrintSeasonalReport').addEventListener('click', () => printSeasonalReport());
  document.getElementById('btnGeneratePlayerReport').addEventListener('click', generatePlayerReport);
  document.getElementById('btnPrintPlayerReport').addEventListener('click', () => printPlayerReport());

  // Search filters
  document.getElementById('matchSearchInput').addEventListener('input', (e) => {
    filterSelect('reportMatchSelect', e.target.value);
  });
  document.getElementById('playerSearchInput').addEventListener('input', (e) => {
    filterSelect('playerSelect', e.target.value);
  });
}

function filterSelect(selectId, query) {
  const select = document.getElementById(selectId);
  const q = query.toLowerCase().trim();
  Array.from(select.options).forEach((opt, i) => {
    if (i === 0) { opt.hidden = false; return; } // keep placeholder
    opt.hidden = q ? !opt.textContent.toLowerCase().includes(q) : false;
  });
  // Auto-select if only one visible option
  const visible = Array.from(select.options).filter((o, i) => i > 0 && !o.hidden);
  if (visible.length === 1) {
    select.value = visible[0].value;
    select.dispatchEvent(new Event('change'));
  }
}

async function loadPlayerList() {
  try {
    const players = await apiFetch('/squadre/' + window.YFM.squadraId + '/calciatori');
    
    // Ordina alfabeticamente per cognome + nome
    const sortedPlayers = (players || []).sort((a, b) => {
      const nameA = (a.cognome || a.nome || '').toLowerCase();
      const nameB = (b.cognome || b.nome || '').toLowerCase();
      return nameA.localeCompare(nameB);
    });
    
    const select = document.getElementById('playerSelect');
    select.innerHTML = '<option value="">-- Seleziona giocatore --</option>' +
      sortedPlayers.map(p => `<option value="${p.id}" data-ruolo="${p.ruolo || ''}">${p.cognome} ${p.nome}${p.ruolo ? ' (' + p.ruolo + ')' : ''}</option>`).join('');
    select.addEventListener('change', () => {
      document.getElementById('btnGeneratePlayerReport').disabled = !select.value;
    });
  } catch (err) {
    console.error('Errore caricamento giocatori:', err);
  }
}

async function loadMatchList() {
  try {
    const partite = await apiFetch('/squadre/' + window.YFM.squadraId + '/partite');
    
    const select = document.getElementById('reportMatchSelect');
    
    if (!partite || partite.length === 0) {
      select.innerHTML = '<option value="">-- Nessuna partita disponibile --</option>';
      return;
    }

    const giocate = partite.filter(p => p.stato === 'Terminata');
    if (!giocate.length) {
      select.innerHTML = '<option value="">-- Nessuna partita giocata --</option>';
      return;
    }
    select.innerHTML = '<option value="">-- Seleziona una partita --</option>' +
      giocate.sort((a,b) => new Date(b.data_ora) - new Date(a.data_ora)).map(p => {
        const data = formatDateShort(p.data_ora);
        return `<option value="${p.id}">✅ ${data} - ${p.avversario} (${p.competizione})</option>`;
      }).join('');
    
    document.getElementById('btnGenerateReport').disabled = false;
  } catch (e) {
    console.error('Errore caricamento partite:', e);
  }
}

async function generateReport() {
  const matchId = document.getElementById('reportMatchSelect').value;
  if (!matchId) {
    alert('Seleziona una partita');
    return;
  }

  showLoading('Generazione report...');
  try {
    const report = await apiFetch('/partite/' + matchId + '/report');
    hideLoading();
    renderReport(report);
  } catch (e) {
    hideLoading();
    alert('Errore nella generazione del report: ' + e.message);
  }
}

function renderReport(report) {
  const container = document.getElementById('reportContent');
  const titolari = report.giocatori.filter(g => g.ruolo === 'T');
  const panchina = report.giocatori.filter(g => g.ruolo === 'P');
  const socialComment = generateSocialComment(report);

  container.innerHTML = `
    <div id="reportPrintArea" style="background:white;padding:24px;border:1px solid var(--border);border-radius:12px;">
      <!-- Commento Social -->
      <div style="margin-bottom:24px;padding:20px;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);border-radius:12px;color:white;">
        <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:12px;">
          <h3 style="margin:0;font-size:16px;">📱 Commento Social</h3>
          <button class="btn btn-secondary btn-small" onclick="copySocialComment()" style="background:white;color:#667eea;border:none;font-weight:600;padding:6px 12px;border-radius:6px;cursor:pointer;">📋 Copia</button>
        </div>
        <div id="socialCommentBox" style="font-size:14px;line-height:1.6;white-space:pre-wrap;background:rgba(255,255,255,0.15);padding:16px;border-radius:8px;">${socialComment}</div>
      </div>

      <!-- Header Report con loghi -->
      <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #333;padding-bottom:12px;margin-bottom:20px;">
        <div style="width:70px;">${(() => { const l = window.YFM.getWorkspaceLogo ? window.YFM.getWorkspaceLogo() : ''; return l ? '<img src="' + l + '" style="height:60px;object-fit:contain;">' : ''; })()}</div>
        <div style="flex:1;text-align:center;">
          <h1 style="margin:0 0 4px 0;font-size:22px;">${report.societa} vs ${report.partita.avversario}</h1>
          <p style="margin:0;color:#666;font-size:13px;">
            ${formatDate(report.partita.dataOra)} · ${report.partita.competizione}
            ${report.partita.giornata ? ' · Giornata ' + report.partita.giornata : ''}
            ${report.partita.luogo ? (report.partita.luogo.toLowerCase().includes('casa') ? '(Casa)' : '(Trasferta)') : ''}
          </p>
        </div>
        <div style="width:70px;text-align:right;"><img src="/img/logo-lnd.png" style="height:60px;object-fit:contain;" onerror="this.style.display='none'"></div>
      </div>

      <!-- Score e Stats -->
      <div style="display:flex;justify-content:center;gap:40px;margin-bottom:24px;">
        <div style="text-align:center;">
          <div style="font-size:48px;font-weight:bold;color:#27AE60;">${report.score.golCasa}</div>
          <div style="color:#666;">${report.societa}</div>
        </div>
        <div style="text-align:center;">
          <div style="font-size:48px;font-weight:bold;color:#E74C3C;">${report.score.golOspiti}</div>
          <div style="color:#666;">${report.partita.avversario}</div>
        </div>
      </div>

      <div style="display:flex;justify-content:center;gap:24px;margin-bottom:24px;font-size:14px;">
        <span>🟨 Ammonizioni: ${report.ammonizioni}</span>
        <span>🟥 Espulsioni: ${report.espulsioni}</span>
      </div>

      <!-- Timeline Eventi -->
      ${report.eventi.length > 0 ? `
      <div style="margin-bottom:24px;">
        <h3 style="border-bottom:1px solid #ddd;padding-bottom:8px;margin-bottom:12px;">⚽ Cronologia Eventi</h3>
        <div style="display:flex;flex-direction:column;gap:8px;">
          ${report.eventi.sort((a, b) => (a.minuto || 0) - (b.minuto || 0)).map(e => {
            const icona = e.tipo === 'GOAL' ? '⚽' : e.tipo === 'YELLOW' ? '🟨' : '🟥';
            const label = e.tipo === 'GOAL' ? 'Gol' : e.tipo === 'YELLOW' ? 'Amm.' : 'Esp.';
            return `
              <div style="display:flex;align-items:center;gap:12px;padding:8px;background:#f8f9fa;border-radius:8px;">
                <span style="font-weight:bold;min-width:40px;">${e.minuto}'</span>
                <span>${icona}</span>
                <span><strong>${e.principale}</strong></span>
                ${e.secondario ? `<span style="color:#666;">(Assist: ${e.secondario})</span>` : ''}
              </div>`;
          }).join('')}
        </div>
      </div>
      ` : ''}

      <!-- Formazione Titolari -->
      <div style="margin-bottom:24px;">
        <h3 style="border-bottom:1px solid #ddd;padding-bottom:8px;margin-bottom:12px;">👥 Titolari</h3>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead>
            <tr style="background:#f8f9fa;">
              <th style="padding:8px;text-align:center;">#</th>
              <th style="padding:8px;text-align:left;">Nome</th>
              <th style="padding:8px;text-align:center;">G</th>
              <th style="padding:8px;text-align:center;">A</th>
              <th style="padding:8px;text-align:center;">🟨</th>
              <th style="padding:8px;text-align:center;">🟥</th>
            </tr>
          </thead>
          <tbody>
            ${titolari.map(g => `
              <tr style="border-bottom:1px solid #eee;">
                <td style="padding:8px;text-align:center;font-weight:bold;">${g.numeroMaglia}</td>
                <td style="padding:8px;">${g.cognome} ${g.nome[0]}.</td>
                <td style="padding:8px;text-align:center;">${g.gol}</td>
                <td style="padding:8px;text-align:center;">${g.assist}</td>
                <td style="padding:8px;text-align:center;color:#E67E22;">${g.ammonizioni > 0 ? g.ammonizioni : ''}</td>
                <td style="padding:8px;text-align:center;color:#E74C3C;">${g.espulsioni > 0 ? g.espulsioni : ''}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>

      <!-- Panchina -->
      ${panchina.length > 0 ? `
      <div style="margin-bottom:24px;">
        <h3 style="border-bottom:1px solid #ddd;padding-bottom:8px;margin-bottom:12px;">🪑 Panchina</h3>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead>
            <tr style="background:#f8f9fa;">
              <th style="padding:8px;text-align:center;">#</th>
              <th style="padding:8px;text-align:left;">Nome</th>
              <th style="padding:8px;text-align:center;">G</th>
              <th style="padding:8px;text-align:center;">A</th>
              <th style="padding:8px;text-align:center;">🟨</th>
              <th style="padding:8px;text-align:center;">🟥</th>
            </tr>
          </thead>
          <tbody>
            ${panchina.map(g => `
              <tr style="border-bottom:1px solid #eee;">
                <td style="padding:8px;text-align:center;font-weight:bold;">${g.numeroMaglia}</td>
                <td style="padding:8px;">${g.cognome} ${g.nome[0]}.</td>
                <td style="padding:8px;text-align:center;">${g.gol}</td>
                <td style="padding:8px;text-align:center;">${g.assist}</td>
                <td style="padding:8px;text-align:center;color:#E67E22;">${g.ammonizioni > 0 ? g.ammonizioni : ''}</td>
                <td style="padding:8px;text-align:center;color:#E74C3C;">${g.espulsioni > 0 ? g.espulsioni : ''}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
      ` : ''}

      <!-- Note -->
      ${report.partita.note ? `
      <div style="margin-bottom:16px;">
        <h3 style="border-bottom:1px solid #ddd;padding-bottom:8px;margin-bottom:8px;">📝 Note</h3>
        <p style="white-space:pre-wrap;font-size:13px;color:#555;">${report.partita.note}</p>
      </div>
      ` : ''}

      <!-- Footer -->
      <div style="margin-top:32px;padding-top:16px;border-top:1px solid #ddd;text-align:center;color:#999;font-size:12px;">
        <p style="margin:0;">Report generato da Youth Football Manager</p>
        <p style="margin:4px 0 0 0;">${report.allenatore ? 'Allenatore: ' + report.allenatore : ''} ${report.dirigente ? ' | Dirigente: ' + report.dirigente : ''}</p>
      </div>
    </div>
  `;

  container.style.display = 'block';
  document.getElementById('btnPrintReport').style.display = 'inline-block';
}

function printReport() {
  const printArea = document.getElementById('reportPrintArea');
  if (!printArea) { alert('Area di stampa non trovata'); return; }

  const clone = printArea.cloneNode(true);
  const socialSection = clone.querySelector('[style*="linear-gradient"]');
  if (socialSection) socialSection.remove();
  clone.querySelectorAll('img').forEach(img => { if (img.src) img.setAttribute('src', img.src); });

  const printStyles = `<style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; padding: 15px; color: #333; font-size: 11px; background: white; }
    h1 { font-size: 16px; margin: 0 0 6px 0; }
    h2 { font-size: 14px; margin: 10px 0 5px 0; }
    h3 { font-size: 12px; margin: 10px 0 5px 0; border-bottom: 1px solid #ddd; padding-bottom: 3px; }
    table { width: 100%; border-collapse: collapse; margin-top: 5px; font-size: 10px; }
    th, td { padding: 3px 5px; text-align: left; border: 1px solid #eee; }
    th { background: #f5f5f5; font-weight: 600; }
    img { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    @page { size: A4 portrait; margin: 8mm; }
  </style>`;

  printHTML(printStyles + clone.innerHTML, 'Report Partita');
}

function generateSocialComment(report) {
  const societa = report.societa || 'ASD';
  const categoria = report.partita?.competizione || 'Campionato';
  const partita = report.partita || {};
  const score = report.score || { golCasa: 0, golOspiti: 0 };
  const golFatti = score.golCasa || 0;
  const golSubiti = score.golOspiti || 0;
  const marcatori = (report.eventi || []).filter(e => e.tipo === 'GOAL');
  const ammonizioni = report.ammonizioni || 0;
  const espulsioni = report.espulsioni || 0;
  
  // Determina il risultato
  let intro = '';
  if (golFatti > golSubiti) {
    intro = '🏆 GRANDE VITTORIA!';
  } else if (golFatti === golSubiti) {
    intro = '🤝 BEL PUNTO!';
  } else {
    intro = '💪 SI CONTINUA A LAVORARE!';
  }

  // Costruisce il commento
  let comment = `${intro}\n\n`;
  comment += `${societa} ${golFatti}-${golSubiti} ${partita.avversario || 'Avversario'}\n`;
  
  if (marcatori.length > 0) {
    const marcatoriList = marcatori.map(m => {
      // Usa cognome completo (tutto tranne l'ultima parola che è il nome)
      const parts = (m.principale || 'Giocatore').split(' ');
      const cognome = parts.length > 1 ? parts.slice(0, -1).join(' ') : parts[0];
      return `${cognome} (${m.minuto || '?'}')`;
    }).join(', ');
    comment += `⚽ Marcatori: ${marcatoriList}\n`;
  }
  
  if (golSubiti === 0 && golFatti > 0) {
    comment += `🧤 PORTA INVIOLATA!\n`;
  }
  
  if (ammonizioni > 0) {
    comment += `🟨 ${ammonizioni} ammonizion${ammonizioni > 1 ? 'i' : 'e'}\n`;
  }
  
  if (espulsioni > 0) {
    comment += `🟥 ${espulsioni} espulsion${espulsioni > 1 ? 'i' : 'e'}\n`;
  }
  
  comment += `\n${partita.competizione || ''}${partita.giornata ? ' - Giornata ' + partita.giornata : ''}\n\n`;
  
  // Hashtag sicuri
  const cleanSocieta = (societa || '').replace(/\s+/g, '');
  const cleanCategoria = (categoria || '').replace(/\s+/g, '');
  comment += `#${cleanSocieta} #${cleanCategoria} #calciogiovanile`;
  
  return comment;
}

// Funzione globale per copiare il commento
window.copySocialComment = function() {
  const text = document.getElementById('socialCommentBox')?.textContent;
  if (text) {
    navigator.clipboard.writeText(text).then(() => {
      alert('✅ Commento copiato negli appunti!');
    }).catch(() => {
      // Fallback per browser più vecchi
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      alert('✅ Commento copiato negli appunti!');
    });
  }
};

// ── REPORT STAGIONALE ──
async function generateSeasonalReport() {
  showLoading('Generazione report stagionale...');
  
  try {
    const [report, statsData] = await Promise.all([
      apiFetch('/squadre/' + window.YFM.squadraId + '/report-stagionale'),
      apiFetch('/squadre/' + window.YFM.squadraId + '/stats-giocatori')
    ]);
    report.statsGiocatori = statsData.stats || [];
    renderSeasonalReport(report);
    document.getElementById('btnPrintSeasonalReport').style.display = 'inline-block';
  } catch (err) {
    alert('Errore: ' + err.message);
  } finally {
    hideLoading();
  }
}

function renderSeasonalReport(report) {
  const container = document.getElementById('seasonalReportContent');
  container.style.display = 'block';
  const logoWs = window.YFM.getWorkspaceLogo ? window.YFM.getWorkspaceLogo() : '';
  
  container.innerHTML = `
    <div id="seasonalPrintArea" style="background:white;padding:20px;">
      <!-- Header con loghi -->
      <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #333;padding-bottom:12px;margin-bottom:16px;">
        <div style="width:70px;">${logoWs ? '<img src="' + logoWs + '" style="height:60px;object-fit:contain;">' : ''}</div>
        <div style="flex:1;text-align:center;">
          <h2 style="margin:0;font-size:16px;">${report.societa}</h2>
          <h1 style="margin:4px 0 0 0;font-size:22px;">Report Stagionale</h1>
          <p style="margin:4px 0 0 0;color:#666;font-size:14px;font-weight:600;">${report.squadra.categoria} — ${report.stagione}</p>
        </div>
        <div style="width:70px;text-align:right;"><img src="/img/logo-lnd.png" style="height:60px;object-fit:contain;" onerror="this.style.display='none'"></div>
      </div>
      
      <!-- Stats Squadra compatte -->
      <div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin-bottom:16px;">
        <span style="background:linear-gradient(135deg,#667eea,#764ba2);color:white;padding:6px 12px;border-radius:6px;font-size:12px;font-weight:700;">${report.punti || 0} Punti</span>
        <span style="background:#f0f0f0;padding:6px 12px;border-radius:6px;font-size:12px;">${report.partiteGiocate || 0} PG</span>
        <span style="background:#d4edda;padding:6px 12px;border-radius:6px;font-size:12px;font-weight:600;color:#28a745;">${report.vittorie || 0} V</span>
        <span style="background:#fff3cd;padding:6px 12px;border-radius:6px;font-size:12px;font-weight:600;color:#856404;">${report.pareggi || 0} P</span>
        <span style="background:#f8d7da;padding:6px 12px;border-radius:6px;font-size:12px;font-weight:600;color:#dc3545;">${report.sconfitte || 0} S</span>
        <span style="background:#e8f5e9;padding:6px 12px;border-radius:6px;font-size:12px;">GF <strong>${report.golFatti || 0}</strong></span>
        <span style="background:#fce4ec;padding:6px 12px;border-radius:6px;font-size:12px;">GS <strong>${report.golSubiti || 0}</strong></span>
        <span style="background:#f0f0f0;padding:6px 12px;border-radius:6px;font-size:12px;">DR <strong>${report.differenzaReti > 0 ? '+' : ''}${report.differenzaReti || 0}</strong></span>
      </div>
      
      <!-- Calendario Stagionale -->
      <div style="margin-bottom:16px;">
        <h3 style="margin:0 0 6px 0;font-size:13px;border-bottom:1px solid #ddd;padding-bottom:4px;">📅 Calendario</h3>
        ${(() => {
          const gruppi = {};
          (report.partite || []).forEach(p => {
            const comp = p.competizione || 'Altro';
            if (!gruppi[comp]) gruppi[comp] = [];
            gruppi[comp].push(p);
          });
          return Object.entries(gruppi).map(([comp, partite]) => {
            const mid = Math.ceil(partite.length / 2);
            const col1 = partite.slice(0, mid);
            const col2 = partite.slice(mid);
            const renderCol = (rows) => rows.map((p, i) => {
              const isCasa = p.luogo === 'Casa';
              const resultColor = p.golCasa > p.golOspiti ? '#28a745' : p.golCasa === p.golOspiti ? '#856404' : '#dc3545';
              const logoImg = p.logo ? '<img src="' + p.logo + '" style="height:12px;width:12px;object-fit:contain;" onerror="this.style.display=\'none\'">' : '';
              return '<tr style="background:' + (i % 2 === 0 ? 'white' : '#fafafa') + ';">'
                + '<td style="padding:1px 3px;text-align:center;font-size:9px;font-weight:600;color:#667eea;">' + (p.giornata || '-') + '</td>'
                + '<td style="padding:1px 3px;font-size:9px;">' + formatDateShort(p.data) + '</td>'
                + '<td style="padding:1px 3px;text-align:center;"><span style="font-size:8px;padding:0 2px;background:' + (isCasa ? '#e6f3ff' : '#fff3cd') + ';border-radius:2px;color:' + (isCasa ? '#004085' : '#856404') + ';">' + (isCasa ? 'C' : 'T') + '</span></td>'
                + '<td style="padding:1px 3px;font-size:9px;white-space:nowrap;"><span style="display:inline-flex;align-items:center;gap:3px;">' + logoImg + p.avversario + '</span></td>'
                + '<td style="padding:1px 3px;text-align:center;font-size:9px;font-weight:700;color:' + resultColor + ';">' + p.golCasa + '-' + p.golOspiti + '</td>'
                + '</tr>';
            }).join('');
            const thRow = '<tr style="background:#f0f0f0;"><th style="padding:2px 3px;text-align:center;font-size:8px;border-bottom:1px solid #dee2e6;width:20px;">G</th><th style="padding:2px 3px;text-align:left;font-size:8px;border-bottom:1px solid #dee2e6;width:52px;">Data</th><th style="padding:2px 3px;text-align:center;font-size:8px;border-bottom:1px solid #dee2e6;width:18px;"></th><th style="padding:2px 3px;text-align:left;font-size:8px;border-bottom:1px solid #dee2e6;">Avversario</th><th style="padding:2px 3px;text-align:center;font-size:8px;border-bottom:1px solid #dee2e6;width:36px;">Ris</th></tr>';
            return `
            <div style="margin-bottom:10px;">
              <div style="background:#667eea;color:white;padding:3px 8px;border-radius:3px;font-size:10px;font-weight:600;margin-bottom:4px;">${comp}</div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                <table style="width:100%;border-collapse:collapse;"><thead>${thRow}</thead><tbody>${renderCol(col1)}</tbody></table>
                <table style="width:100%;border-collapse:collapse;"><thead>${thRow}</thead><tbody>${renderCol(col2)}</tbody></table>
              </div>
            </div>`;
          }).join('');
        })()}
      </div>
      
      <!-- Statistiche Giocatori -->
      <div>
        <h3 style="margin:0 0 8px 0;font-size:13px;border-bottom:1px solid #ddd;padding-bottom:4px;">📊 Statistiche Giocatori</h3>
        <table style="width:100%;border-collapse:collapse;font-size:10px;">
          <thead>
            <tr style="background:#f8f9fa;">
              <th style="padding:4px 6px;text-align:left;border-bottom:2px solid #dee2e6;">Giocatore</th>
              <th style="padding:4px 4px;text-align:center;border-bottom:2px solid #dee2e6;">Ruolo</th>
              <th style="padding:4px 4px;text-align:center;border-bottom:2px solid #dee2e6;">Pres.</th>
              <th style="padding:4px 4px;text-align:center;border-bottom:2px solid #dee2e6;">⚽</th>
              <th style="padding:4px 4px;text-align:center;border-bottom:2px solid #dee2e6;">🅰️</th>
              <th style="padding:4px 4px;text-align:center;border-bottom:2px solid #dee2e6;">🟨</th>
              <th style="padding:4px 4px;text-align:center;border-bottom:2px solid #dee2e6;">🟥</th>
            </tr>
          </thead>
          <tbody>
            ${(report.statsGiocatori || []).sort((a, b) => {
              const ruoloOrder = ['Portiere','Difensore','Centrocampista','Attaccante'];
              const ra = ruoloOrder.indexOf(a.ruolo), rb = ruoloOrder.indexOf(b.ruolo);
              if (ra !== rb) return ra - rb;
              return a.cognome.localeCompare(b.cognome);
            }).map(p => `
              <tr style="border-bottom:1px solid #f1f5f9;">
                <td style="padding:3px 6px;font-weight:500;">${p.cognome} ${p.nome}</td>
                <td style="padding:3px 4px;text-align:center;font-size:9px;color:#666;">${p.ruolo || '-'}</td>
                <td style="padding:3px 4px;text-align:center;">${p.presenze || '-'}</td>
                <td style="padding:3px 4px;text-align:center;font-weight:${p.gol ? '700' : '400'};color:${p.gol ? '#27AE60' : '#ccc'};">${p.gol || '-'}</td>
                <td style="padding:3px 4px;text-align:center;font-weight:${p.assist ? '700' : '400'};color:${p.assist ? '#3498DB' : '#ccc'};">${p.assist || '-'}</td>
                <td style="padding:3px 4px;text-align:center;color:${p.ammonizioni ? '#F39C12' : '#ccc'};">${p.ammonizioni || '-'}</td>
                <td style="padding:3px 4px;text-align:center;color:${p.espulsioni ? '#E74C3C' : '#ccc'};">${p.espulsioni || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      
      <!-- Footer -->
      <div style="margin-top:16px;padding-top:8px;border-top:1px solid #ddd;text-align:center;color:#999;font-size:10px;">
        <p style="margin:0;">Report generato da Youth Football Manager</p>
      </div>
    </div>
  `;
}

function printSeasonalReport() {
  const printArea = document.getElementById('seasonalPrintArea');
  if (!printArea) { alert('Area di stampa non trovata'); return; }

  const clone = printArea.cloneNode(true);
  clone.querySelectorAll('img').forEach(img => {
    if (img.src) img.setAttribute('src', img.src);
  });

  const printStyles = `<style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; padding: 10px; color: #333; font-size: 9px; background: white; }
    h1 { font-size: 14px; margin: 0 0 4px 0; }
    h2 { font-size: 12px; margin: 6px 0 3px 0; }
    h3 { font-size: 10px; margin: 6px 0 3px 0; border-bottom: 1px solid #ddd; padding-bottom: 2px; }
    table { width: 100%; border-collapse: collapse; margin-top: 2px; font-size: 8px; }
    th, td { padding: 1px 3px; text-align: left; border: 1px solid #eee; }
    th { background: #f5f5f5; font-weight: 600; }
    img { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    @page { size: A4 portrait; margin: 5mm; }
  </style>`;

  printHTML(printStyles + clone.innerHTML, 'Report Stagionale');
}

// ── REPORT GIOCATORE ──
async function generatePlayerReport() {
  const playerId = document.getElementById('playerSelect').value;
  if (!playerId) return;
  
  // Build competition filter from checkboxes
  const comps = [];
  if (document.getElementById('chkCampionato')?.checked) comps.push('Campionato');
  if (document.getElementById('chkCoppa')?.checked) comps.push('Coppa');
  if (document.getElementById('chkAmichevoli')?.checked) comps.push('Amichevole', 'Torneo');
  
  const params = new URLSearchParams();
  params.set('team_id', window.YFM.squadraId);
  if (comps.length > 0) params.set('competizioni', comps.join(','));
  
  showLoading('Generazione report giocatore...');
  try {
    const report = await apiFetch('/calciatori/' + playerId + '/report?' + params.toString());
    renderPlayerReport(report);
    document.getElementById('btnPrintPlayerReport').style.display = 'inline-block';
  } catch (err) {
    alert('Errore: ' + err.message);
  } finally {
    hideLoading();
  }
}

function renderPlayerReport(report) {
  const container = document.getElementById('playerReportContent');
  container.style.display = 'block';
  
  const avgGolPerPartita = report.stats.partiteGiocate > 0 
    ? (report.stats.gol / report.stats.partiteGiocate).toFixed(2) : 0;
  const minutiTotali = report.stats.minutiTotali || 0;
  
  container.innerHTML = `
    <div id="playerPrintArea" style="background:white;padding:24px;">
      <!-- Header con loghi -->
      <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #333;padding-bottom:12px;margin-bottom:16px;">
        <div style="width:70px;">${(() => { const l = window.YFM.getWorkspaceLogo ? window.YFM.getWorkspaceLogo() : ''; return l ? '<img src="' + l + '" style="height:60px;object-fit:contain;">' : ''; })()}</div>
        <div style="flex:1;text-align:center;">
          <h1 style="margin:0;font-size:22px;">${report.giocatore.cognome || ''} ${report.giocatore.nome}</h1>
          <p style="margin:4px 0 0 0;color:#666;font-size:12px;">
            ${report.giocatore.data_nascita ? 'Nato: ' + formatBirthDate(report.giocatore.data_nascita) : ''}
            ${report.giocatore.nazionalita ? ' | ' + report.giocatore.nazionalita : ''}
          </p>
        </div>
        <div style="width:70px;text-align:right;"><img src="/img/logo-lnd.png" style="height:60px;object-fit:contain;" onerror="this.style.display='none'"></div>
      </div>
      
      <!-- Stats Grid - Auto sizing -->
      <div class="player-stats-grid" style="display:grid;grid-template-columns:repeat(6,1fr);gap:8px;margin-bottom:20px;">
        <div style="background:#cce5ff;padding:10px 6px;border-radius:8px;text-align:center;">
          <div style="font-size:18px;font-weight:bold;color:#004085;">${report.stats.partiteGiocate}</div>
          <div style="color:#666;font-size:9px;">Partite</div>
        </div>
        <div style="background:#667eea;padding:10px 6px;border-radius:8px;text-align:center;color:white;">
          <div style="font-size:18px;font-weight:bold;">${minutiTotali}'</div>
          <div style="font-size:9px;opacity:0.9;">Min.</div>
        </div>
        <div style="background:#d4edda;padding:10px 6px;border-radius:8px;text-align:center;">
          <div style="font-size:18px;font-weight:bold;color:#28a745;">${report.stats.gol}</div>
          <div style="color:#666;font-size:9px;">Gol</div>
        </div>
        <div style="background:#e2e3e5;padding:10px 6px;border-radius:8px;text-align:center;">
          <div style="font-size:18px;font-weight:bold;color:#495057;">${avgGolPerPartita}</div>
          <div style="color:#666;font-size:9px;">Gol/P</div>
        </div>
        <div style="background:#fff3cd;padding:10px 6px;border-radius:8px;text-align:center;">
          <div style="font-size:18px;font-weight:bold;color:#856404;">${report.stats.assist}</div>
          <div style="color:#666;font-size:9px;">Assist</div>
        </div>
        <div style="background:#ffe6e6;padding:10px 6px;border-radius:8px;text-align:center;">
          <div style="font-size:18px;font-weight:bold;color:#dc3545;">${report.stats.ammonizioni + report.stats.espulsioni}</div>
          <div style="color:#666;font-size:9px;">Cartellini</div>
        </div>
      </div>
      <style>
        @media (max-width: 700px) { .player-stats-grid { grid-template-columns: repeat(3, 1fr) !important; } }
        @media (max-width: 450px) { .player-stats-grid { grid-template-columns: repeat(2, 1fr) !important; } }
      </style>
      
      <!-- Storico Eventi Raggruppato per competizione -->
      <div>
        <h3 style="margin:0 0 8px 0;font-size:14px;border-bottom:1px solid #ddd;padding-bottom:6px;">📋 Storico Gol & Assist</h3>
        ${(() => {
          // Raggruppa per competizione
          const byComp = {};
          (report.storico || []).forEach(e => {
            const comp = e.competizione || 'Altro';
            if (!byComp[comp]) byComp[comp] = [];
            byComp[comp].push(e);
          });
          if (Object.keys(byComp).length === 0) return '<p style="color:#666;font-size:13px;text-align:center;padding:20px;">Nessun evento registrato</p>';
          return Object.entries(byComp).map(([comp, eventi]) => {
            // Raggruppa per partita dentro la competizione
            const byMatch = {};
            eventi.forEach(e => {
              const key = (e.giornata || '') + '||' + (e.partita || '') + '||' + (e.data || '');
              if (!byMatch[key]) byMatch[key] = { giornata: e.giornata, partita: e.partita, data: e.data, eventi: [] };
              byMatch[key].eventi.push(e);
            });
            const gruppi = Object.values(byMatch).sort((a, b) => (parseInt(a.giornata) || 0) - (parseInt(b.giornata) || 0));
            return `
            <div style="margin-bottom:16px;">
              <div style="background:#667eea;color:white;padding:4px 10px;border-radius:4px;font-size:11px;font-weight:600;margin-bottom:8px;display:inline-block;">${comp}</div>
              ${gruppi.map(gruppo => `
                <div style="margin-bottom:10px;margin-left:8px;">
                  <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
                    <span style="background:#f0f0f0;color:#667eea;padding:3px 7px;border-radius:4px;font-size:10px;font-weight:600;min-width:40px;text-align:center;">
                      ${gruppo.giornata ? 'G.' + String(gruppo.giornata).padStart(2, '0') : ''}
                    </span>
                    <span style="font-size:12px;font-weight:500;color:#333;">vs ${gruppo.partita || 'Avversario'}</span>
                    <span style="font-size:10px;color:#888;">${formatDateShort(gruppo.data)}</span>
                  </div>
                  <div style="display:flex;flex-wrap:wrap;gap:6px;padding:6px 8px;background:#f8f9fa;border-radius:6px;">
                    ${gruppo.eventi.sort((a, b) => (a.minuto || 0) - (b.minuto || 0)).map(e => `
                      <span style="display:inline-flex;align-items:center;gap:4px;padding:4px 8px;background:${e.tipo === 'GOAL' ? '#d4edda' : e.tipo === 'ASSIST' ? '#cce5ff' : e.tipo === 'YELLOW' ? '#fff3cd' : '#f8d7da'};border-radius:4px;font-size:11px;">
                        ${e.minuto != null ? `<span style="font-weight:bold;color:#667eea;">${e.minuto}'</span>` : ''}
                        <span>${getEventIcon(e.tipo)}</span>
                      </span>
                    `).join('')}
                  </div>
                </div>
              `).join('')}
            </div>`;
          }).join('');
        })()}
      </div>
    </div>
  `;
}

function getEventIcon(tipo) {
  const icons = { GOAL: '⚽', ASSIST: '🅰️', YELLOW: '🟨', RED: '🟥', SUB_IN: '🔵', SUB_OUT: '🔴' };
  return icons[tipo] || '⚪';
}

function getEventLabel(tipo) {
  const labels = { GOAL: 'Goal', ASSIST: 'Assist', YELLOW: 'Ammonito', RED: 'Espulso', SUB_IN: 'Entrato', SUB_OUT: 'Uscito' };
  return labels[tipo] || tipo;
}

function printPlayerReport() {
  const printArea = document.getElementById('playerPrintArea');
  if (!printArea) { alert('Area di stampa non trovata'); return; }

  const clone = printArea.cloneNode(true);
  clone.querySelectorAll('img').forEach(img => { if (img.src) img.setAttribute('src', img.src); });

  const printStyles = `<style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; padding: 15px; color: #333; font-size: 11px; background: white; }
    h1 { font-size: 16px; margin: 0 0 6px 0; }
    table { width: 100%; border-collapse: collapse; font-size: 10px; }
    th, td { padding: 3px 5px; border: 1px solid #eee; }
    img { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    @page { size: A4 portrait; margin: 8mm; }
  </style>`;

  printHTML(printStyles + clone.innerHTML, 'Report Giocatore');
}
