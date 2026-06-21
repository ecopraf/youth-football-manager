import { apiFetch } from '../../services/api';

export default async function loadStats() {
  const c = document.getElementById('pageContent');
  c.innerHTML = '<div class="loading"><div class="spinner"></div>Caricamento...</div>';

  try {
    const disciplina = await apiFetch('/squadre/' + window.YFM.squadraId + '/disciplina');
    const totAmmonizioni = (disciplina || []).reduce((s, p) => s + p.ammonizioni, 0);
    const totEspulsioni = (disciplina || []).reduce((s, p) => s + p.espulsioni, 0);

    let html = `
      <h1 class="page-title">Dati & Statistiche ${window.YFM.getSquadraName()}</h1>
      <p class="page-subtitle">Disciplina e altre statistiche</p>
      <div class="widgets" style="margin-bottom:20px;">
        <div class="card widget">
          <div class="widget-value" style="color:#F39C12;">${totAmmonizioni}</div>
          <div class="widget-label">Ammonizioni</div>
        </div>
        <div class="card widget">
          <div class="widget-value" style="color:#E74C3C;">${totEspulsioni}</div>
          <div class="widget-label">Espulsioni</div>
        </div>
      </div>`;

    if (disciplina && disciplina.length > 0) {
      html += `
        <div class="card">
          <h3 class="section-title">🟨🟥 Stato Disciplinare</h3>
          <div style="overflow-x:auto;">
            <table style="width:100%;border-collapse:collapse;font-size:13px;">
              <thead><tr style="background:#F8F9FA;">
                <th style="padding:8px;text-align:left;">Giocatore</th>
                <th style="padding:8px;">🟨 Ammonizioni</th>
                <th style="padding:8px;">🟥 Espulsioni</th>
                <th style="padding:8px;color:#E74C3C;">Squalifiche</th>
              </tr></thead>
              <tbody>`;

      disciplina.filter(p => p.ammonizioni > 0 || p.espulsioni > 0).forEach(p => {
        html += `
          <tr style="border-bottom:1px solid var(--border);">
            <td style="padding:8px;">${p.nome} ${p.cognome}</td>
            <td style="padding:8px;text-align:center;">${p.ammonizioni}</td>
            <td style="padding:8px;text-align:center;">${p.espulsioni}</td>
            <td style="padding:8px;text-align:center;font-weight:bold;color:#E74C3C;">${p.squalifiche > 0 ? p.squalifiche : '-'}</td>
          </tr>`;
      });

      html += '</tbody></table></div></div>';
    } else {
      html += '<div class="card"><p style="text-align:center;color:var(--gray);padding:20px;">Nessun dato disciplinare disponibile.</p></div>';
    }

    c.innerHTML = html;
  } catch (e) {
    c.innerHTML = '<div class="error-box">Errore: ' + e.message + '</div>';
  }
}
