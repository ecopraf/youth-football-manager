import { apiFetch } from '../../services/api';
import { formatDate, formatDateShort, formatBirthDate } from '../../utils/formatters';
import { showLoading, hideLoading } from '../../utils/ui';

export default async function loadReports() {
  const c = document.getElementById('pageContent');
  c.innerHTML = `
    <h1 class="page-title">Report ${window.YFM.getSquadraName()}</h1>
    <p class="page-subtitle">Genera e scarica report della stagione</p>
    
    <div class="report-tabs" style="margin-bottom:24px;">
      <button class="report-tab active" data-tab="match">📄 Report Partita</button>
      <button class="report-tab" data-tab="seasonal">📊 Report Stagionale</button>
      <button class="report-tab" data-tab="player">👤 Report Giocatore</button>
    </div>
    
    <!-- Tab Report Partita -->
    <div id="tabMatch" class="report-tab-content">
      <div class="card">
        <div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap;margin-bottom:16px;">
          <label style="font-weight:500;">Seleziona partita:</label>
          <select id="reportMatchSelect" style="flex:1;min-width:250px;padding:10px;border:1px solid var(--border);border-radius:8px;">
            <option value="">-- Caricamento partite --</option>
          </select>
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
          <select id="playerSelect" style="flex:1;min-width:250px;padding:10px;border:1px solid var(--border);border-radius:8px;">
            <option value="">-- Seleziona giocatore --</option>
          </select>
          <button class="btn btn-primary" id="btnGeneratePlayerReport" disabled>Genera Report</button>
          <button class="btn btn-secondary" id="btnPrintPlayerReport" style="display:none;">🖨️ Stampa / Salva PDF</button>
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
      sortedPlayers.map(p => `<option value="${p.id}" data-ruolo="${p.ruolo || ''}">${p.cognome || p.nome} ${p.nome}${p.ruolo ? ' (' + p.ruolo + ')' : ''}</option>`).join('');
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

    select.innerHTML = '<option value="">-- Seleziona una partita --</option>' +
      partite.map(p => {
        const data = formatDateShort(p.data_ora);
        const stato = new Date(p.data_ora) < new Date() ? '✅' : '📅';
        return `<option value="${p.id}">${stato} ${data} - ${p.avversario} (${p.competizione})</option>`;
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

      <!-- Header Report -->
      <div style="text-align:center;border-bottom:2px solid #333;padding-bottom:16px;margin-bottom:24px;">
        <h1 style="margin:0 0 8px 0;font-size:28px;">${report.societa} vs ${report.partita.avversario}</h1>
        <p style="margin:0;color:#666;">
          ${formatDate(report.partita.dataOra)} · ${report.partita.competizione}
          ${report.partita.giornata ? ' · Giornata ' + report.partita.giornata : ''}
          ${report.partita.luogo ? (report.partita.luogo.toLowerCase().includes('casa') ? '(Casa)' : '(Trasferta)') : ''}
        </p>
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
          ${report.eventi.map(e => {
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

  const html = `<!DOCTYPE html>
<html>
<head>
  <title>Report Partita</title>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; padding: 15px; color: #333; font-size: 11px; background: white; }
    h1 { font-size: 16px; margin: 0 0 6px 0; }
    h2 { font-size: 14px; margin: 10px 0 5px 0; }
    h3 { font-size: 12px; margin: 10px 0 5px 0; border-bottom: 1px solid #ddd; padding-bottom: 3px; }
    table { width: 100%; border-collapse: collapse; margin-top: 5px; font-size: 10px; }
    th, td { padding: 3px 5px; text-align: left; border: 1px solid #eee; }
    th { background: #f5f5f5; font-weight: 600; }
    @page { size: A4; margin: 8mm; }
  </style>
</head>
<body>${clone.innerHTML}</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const printWindow = window.open(url, '_blank');
  if (!printWindow) { alert('Popup bloccato! Abilita i popup per questo sito.'); return; }
  printWindow.onload = () => {
    printWindow.print();
    printWindow.onafterprint = () => printWindow.close();
  };
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
      const nome = (m.principale || 'Giocatore').split(' ')[0];
      return `${nome} (${m.minuto || '?'}')`;
    }).join(', ');
    comment += `⚽ Marcatori: ${marcatoriList}\n`;
  }
  
  if (golSubiti === 0 && golFatti > 0) {
    comment += `🧤 PORTA INVOLATA!\n`;
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
    const report = await apiFetch('/squadre/' + window.YFM.squadraId + '/report-stagionale');
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
  
  container.innerHTML = `
    <div id="seasonalPrintArea" style="background:white;padding:24px;">
      <!-- Header -->
      <div style="text-align:center;border-bottom:2px solid #333;padding-bottom:16px;margin-bottom:24px;">
        <h2 style="margin:0 0 8px 0;">${report.societa}</h2>
        <h1 style="margin:0;font-size:28px;">Report Stagionale</h1>
        <p style="margin:8px 0 0 0;color:#666;font-size:18px;font-weight:600;">${report.squadra.categoria}</p>
        <p style="margin:4px 0 0 0;color:#666;">${report.stagione}</p>
      </div>
      
      <!-- Stats Squadra -->
      <div class="stats-grid" style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:20px;">
        <div class="stat-card" style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:12px 6px;border-radius:8px;text-align:center;color:white;">
          <div style="font-size:18px;font-weight:bold;">${report.punti || 0}</div>
          <div style="font-size:9px;opacity:0.9;">Punti</div>
        </div>
        <div class="stat-card" style="background:#cce5ff;padding:12px 6px;border-radius:8px;text-align:center;">
          <div style="font-size:18px;font-weight:bold;color:#004085;">${report.partiteGiocate || 0}</div>
          <div style="color:#666;font-size:9px;">Giocate</div>
        </div>
        <div class="stat-card" style="background:#d4edda;padding:12px 6px;border-radius:8px;text-align:center;">
          <div style="font-size:18px;font-weight:bold;color:#28a745;">${report.vittorie || 0}</div>
          <div style="color:#666;font-size:9px;">V</div>
        </div>
        <div class="stat-card" style="background:#fff3cd;padding:12px 6px;border-radius:8px;text-align:center;">
          <div style="font-size:18px;font-weight:bold;color:#856404;">${report.pareggi || 0}</div>
          <div style="color:#666;font-size:9px;">P</div>
        </div>
        <div class="stat-card" style="background:#f8d7da;padding:12px 6px;border-radius:8px;text-align:center;">
          <div style="font-size:18px;font-weight:bold;color:#dc3545;">${report.sconfitte || 0}</div>
          <div style="color:#666;font-size:9px;">S</div>
        </div>
        <div class="stat-card" style="background:#cce5ff;padding:12px 6px;border-radius:8px;text-align:center;">
          <div style="font-size:18px;font-weight:bold;color:#28a745;">${report.golFatti || 0}</div>
          <div style="color:#666;font-size:9px;">GF</div>
        </div>
        <div class="stat-card" style="background:#e2e3e5;padding:12px 6px;border-radius:8px;text-align:center;">
          <div style="font-size:18px;font-weight:bold;color:#495057;">${report.golSubiti || 0}</div>
          <div style="color:#666;font-size:9px;">GS</div>
        </div>
        <div class="stat-card" style="background:#f8f9fa;padding:12px 6px;border-radius:8px;text-align:center;">
          <div style="font-size:18px;font-weight:bold;color:#495057;">${report.differenzaReti > 0 ? '+' : ''}${report.differenzaReti || 0}</div>
          <div style="color:#666;font-size:9px;">DR</div>
        </div>
      </div>
      <style>
        @media (max-width: 800px) { .stats-grid { grid-template-columns: repeat(4, 1fr) !important; } }
        @media (max-width: 600px) { .stats-grid { grid-template-columns: repeat(2, 1fr) !important; } }
        @media (max-width: 400px) { .stats-grid { grid-template-columns: repeat(2, 1fr) !important; } }
      </style>
      
      <!-- Top Rankings -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px;margin-bottom:24px;">
        <!-- Top 3 Marcatori -->
        <div>
          <h3 style="margin:0 0 12px 0;">⚽ Top 3 Marcatori</h3>
          <table style="width:100%;border-collapse:collapse;">
            <thead>
              <tr style="background:#f8f9fa;">
                <th style="padding:8px;text-align:left;border-bottom:2px solid #dee2e6;font-size:13px;">#</th>
                <th style="padding:8px;text-align:left;border-bottom:2px solid #dee2e6;font-size:13px;">Giocatore</th>
                <th style="padding:8px;text-align:center;border-bottom:2px solid #dee2e6;font-size:13px;">Gol</th>
              </tr>
            </thead>
            <tbody>
              ${report.topMarcatori.slice(0, 3).map((m, i) => `
                <tr style="background:${i === 0 ? '#fff9e6' : 'white'};">
                  <td style="padding:8px;font-weight:bold;">${i + 1}</td>
                  <td style="padding:8px;">${m.cognome || m.nome} ${m.nome}</td>
                  <td style="padding:8px;text-align:center;font-weight:bold;">${m.gol}</td>
                </tr>
              `).join('')}
              ${report.topMarcatori.length === 0 ? '<tr><td colspan="3" style="padding:12px;text-align:center;color:#666;">-</td></tr>' : ''}
            </tbody>
          </table>
        </div>
        
        <!-- Top 3 Assist -->
        <div>
          <h3 style="margin:0 0 12px 0;">🅰️ Top 3 Assist</h3>
          <table style="width:100%;border-collapse:collapse;">
            <thead>
              <tr style="background:#f8f9fa;">
                <th style="padding:8px;text-align:left;border-bottom:2px solid #dee2e6;font-size:13px;">#</th>
                <th style="padding:8px;text-align:left;border-bottom:2px solid #dee2e6;font-size:13px;">Giocatore</th>
                <th style="padding:8px;text-align:center;border-bottom:2px solid #dee2e6;font-size:13px;">Assist</th>
              </tr>
            </thead>
            <tbody>
              ${report.topAssist.slice(0, 3).map((a, i) => `
                <tr style="background:${i === 0 ? '#e6f3ff' : 'white'};">
                  <td style="padding:8px;font-weight:bold;">${i + 1}</td>
                  <td style="padding:8px;">${a.cognome || a.nome} ${a.nome}</td>
                  <td style="padding:8px;text-align:center;font-weight:bold;">${a.assist}</td>
                </tr>
              `).join('')}
              ${report.topAssist.length === 0 ? '<tr><td colspan="3" style="padding:12px;text-align:center;color:#666;">-</td></tr>' : ''}
            </tbody>
          </table>
        </div>
        
        <!-- Top 3 Presenze -->
        <div>
          <h3 style="margin:0 0 12px 0;">👕 Top 3 Presenze</h3>
          <table style="width:100%;border-collapse:collapse;">
            <thead>
              <tr style="background:#f8f9fa;">
                <th style="padding:8px;text-align:left;border-bottom:2px solid #dee2e6;font-size:13px;">#</th>
                <th style="padding:8px;text-align:left;border-bottom:2px solid #dee2e6;font-size:13px;">Giocatore</th>
                <th style="padding:8px;text-align:center;border-bottom:2px solid #dee2e6;font-size:13px;">Pres.</th>
              </tr>
            </thead>
            <tbody>
              ${report.topPresenze.slice(0, 3).map((p, i) => `
                <tr style="background:${i === 0 ? '#e6f3ff' : 'white'};">
                  <td style="padding:8px;font-weight:bold;">${i + 1}</td>
                  <td style="padding:8px;">${p.cognome || p.nome} ${p.nome}</td>
                  <td style="padding:8px;text-align:center;font-weight:bold;">${p.presenze}</td>
                </tr>
              `).join('')}
              ${report.topPresenze.length === 0 ? '<tr><td colspan="3" style="padding:12px;text-align:center;color:#666;">-</td></tr>' : ''}
            </tbody>
          </table>
        </div>
      </div>
      
      <!-- Calendario Stagionale Raggruppato -->
      <div>
        <h3 style="margin:0 0 12px 0;">📅 Calendario Stagionale</h3>
        ${(() => {
          // Raggruppa partite per competizione
          const gruppi = {};
          (report.partite || []).forEach(p => {
            const comp = p.competizione || 'Altro';
            if (!gruppi[comp]) gruppi[comp] = [];
            gruppi[comp].push(p);
          });
          return Object.entries(gruppi).map(([comp, partite]) => `
            <div style="margin-bottom:20px;">
              <h4 style="margin:0 0 8px 0;padding:8px 12px;background:#667eea;color:white;border-radius:6px;font-size:13px;">${comp}</h4>
              <table style="width:100%;border-collapse:collapse;table-layout:fixed;">
                <thead>
                  <tr style="background:#f0f0f0;">
                    <th style="padding:6px;text-align:center;border-bottom:2px solid #dee2e6;font-size:10px;width:30px;">G.</th>
                    <th style="padding:6px;text-align:left;border-bottom:2px solid #dee2e6;font-size:10px;">Data</th>
                    <th style="padding:6px;text-align:center;border-bottom:2px solid #dee2e6;font-size:10px;width:40px;">C/T</th>
                    <th style="padding:6px;text-align:left;border-bottom:2px solid #dee2e6;font-size:10px;">Avversario</th>
                    <th style="padding:6px;text-align:center;border-bottom:2px solid #dee2e6;font-size:10px;width:70px;">Risultato</th>
                  </tr>
                </thead>
                <tbody>
                  ${partite.map((p, i) => {
                    const isCasa = p.luogo === 'Casa';
                    const resultClass = p.golCasa > p.golOspiti ? 'color:#28a745;' : p.golCasa === p.golOspiti ? 'color:#856404;' : 'color:#dc3545;';
                    const resultIcon = p.golCasa > p.golOspiti ? '✅' : p.golCasa === p.golOspiti ? '🤝' : '❌';
                    return `
                    <tr style="background:${i % 2 === 0 ? 'white' : '#f8f9fa'};">
                      <td style="padding:6px;text-align:center;font-weight:bold;color:#667eea;font-size:10px;">${p.giornata || '-'}</td>
                      <td style="padding:6px;font-size:10px;">${formatDateShort(p.data)}</td>
                      <td style="padding:6px;text-align:center;font-size:10px;"><span style="padding:2px 4px;background:${isCasa ? '#e6f3ff' : '#fff3cd'};border-radius:3px;color:${isCasa ? '#004085' : '#856404'};font-size:9px;">${isCasa ? 'C' : 'T'}</span></td>
                      <td style="padding:6px;font-size:10px;">${p.avversario}</td>
                      <td style="padding:6px;text-align:center;font-size:10px;"><span style="font-weight:bold;${resultClass}">${p.golCasa} - ${p.golOspiti}</span> <span style="font-size:10px;">${resultIcon}</span></td>
                    </tr>`;}).join('')}
                </tbody>
              </table>
            </div>
          `).join('');
        })()}
      </div>
    </div>
  `;
}

function printSeasonalReport() {
  const printArea = document.getElementById('seasonalPrintArea');
  if (!printArea) { alert('Area di stampa non trovata'); return; }

  const html = `<!DOCTYPE html>
<html>
<head>
  <title>Report Stagionale</title>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; padding: 15px; color: #333; font-size: 10px; background: white; }
    h1 { font-size: 14px; margin: 0 0 5px 0; }
    h2 { font-size: 12px; margin: 8px 0 4px 0; }
    h3 { font-size: 11px; margin: 8px 0 4px 0; border-bottom: 1px solid #ddd; padding-bottom: 3px; }
    table { width: 100%; border-collapse: collapse; margin-top: 4px; font-size: 9px; }
    th, td { padding: 2px 4px; text-align: left; border: 1px solid #eee; }
    th { background: #f5f5f5; font-weight: 600; }
    @page { size: A4 landscape; margin: 5mm; }
  </style>
</head>
<body>${printArea.innerHTML}</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const printWindow = window.open(url, '_blank');
  if (!printWindow) { alert('Popup bloccato! Abilita i popup per questo sito.'); return; }
  printWindow.onload = () => {
    printWindow.print();
    printWindow.onafterprint = () => printWindow.close();
  };
}

// ── REPORT GIOCATORE ──
async function generatePlayerReport() {
  const playerId = document.getElementById('playerSelect').value;
  if (!playerId) return;
  
  showLoading('Generazione report giocatore...');
  try {
    const report = await apiFetch('/calciatori/' + playerId + '/report');
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
  const minutiTotali = report.stats.partiteGiocate * 90;
  
  // Raggruppa storico per competizione e partita (giornata)
  const gruppiStorico = {};
  (report.storico || []).forEach(e => {
    // Crea chiave univoca per partita: competizione + giornata
    const key = (e.competizione || 'Altro') + '||' + (e.giornata || '') + '||' + (e.partita || '') + '||' + (e.data || '');
    if (!gruppiStorico[key]) {
      gruppiStorico[key] = {
        competizione: e.competizione || 'Altro',
        giornata: e.giornata,
        partita: e.partita,
        data: e.data,
        eventi: []
      };
    }
    gruppiStorico[key].eventi.push(e);
  });
  
  // Ordina eventi per minuto e gruppi per giornata crescente
  Object.values(gruppiStorico).forEach(g => {
    g.eventi.sort((a, b) => a.minuto - b.minuto);
  });
  const gruppiOrdinati = Object.values(gruppiStorico).sort((a, b) => {
    const gA = parseInt(a.giornata) || 0;
    const gB = parseInt(b.giornata) || 0;
    return gA - gB;
  });
  
  container.innerHTML = `
    <div id="playerPrintArea" style="background:white;padding:24px;">
      <!-- Header -->
      <div style="text-align:center;border-bottom:2px solid #333;padding-bottom:12px;margin-bottom:16px;">
        <h1 style="margin:0;font-size:24px;">${report.giocatore.cognome || ''} ${report.giocatore.nome}</h1>
        <p style="margin:4px 0 0 0;color:#666;font-size:13px;">
          ${report.giocatore.data_nascita ? 'Nato: ' + formatBirthDate(report.giocatore.data_nascita) : ''}
          ${report.giocatore.nazionalita ? ' | ' + report.giocatore.nazionalita : ''}
        </p>
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
      
      <!-- Storico Eventi Raggruppato per partita -->
      <div>
        <h3 style="margin:0 0 8px 0;font-size:14px;border-bottom:1px solid #ddd;padding-bottom:6px;">📋 Storico Eventi</h3>
        ${gruppiOrdinati.length > 0 ? gruppiOrdinati.map(gruppo => `
          <div style="margin-bottom:14px;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
              <span style="background:#667eea;color:white;padding:4px 8px;border-radius:4px;font-size:11px;font-weight:600;min-width:50px;text-align:center;">
                ${gruppo.giornata ? 'G.' + String(gruppo.giornata).padStart(2, '0') : ''}
              </span>
              <span style="font-size:12px;font-weight:500;color:#333;">
                vs ${gruppo.partita || 'Avversario'}
              </span>
              <span style="font-size:10px;color:#888;">${formatDateShort(gruppo.data)}</span>
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:6px;padding:8px;background:#f8f9fa;border-radius:6px;">
              ${gruppo.eventi.map(e => `
                <span style="display:inline-flex;align-items:center;gap:4px;padding:4px 8px;background:${e.tipo === 'GOAL' ? '#d4edda' : e.tipo === 'ASSIST' ? '#cce5ff' : e.tipo === 'YELLOW' ? '#fff3cd' : '#f8d7da'};border-radius:4px;font-size:11px;">
                  <span style="font-weight:bold;color:#667eea;">${e.minuto}'</span>
                  <span>${getEventIcon(e.tipo)}</span>
                </span>
              `).join('')}
            </div>
          </div>
        `).join('') : '<p style="color:#666;font-size:13px;text-align:center;padding:20px;">Nessun evento registrato</p>'}
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

  const html = `<!DOCTYPE html>
<html>
<head>
  <title>Report Giocatore</title>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; padding: 15px; color: #333; font-size: 11px; background: white; }
    h1 { font-size: 16px; margin: 0 0 6px 0; }
    table { width: 100%; border-collapse: collapse; font-size: 10px; }
    th, td { padding: 3px 5px; border: 1px solid #eee; }
    @page { size: A4; margin: 8mm; }
  </style>
</head>
<body>${printArea.innerHTML}</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const printWindow = window.open(url, '_blank');
  if (!printWindow) { alert('Popup bloccato! Abilita i popup per questo sito.'); return; }
  printWindow.onload = () => {
    printWindow.print();
    printWindow.onafterprint = () => printWindow.close();
  };
}
