/**
 * guestGenitore.js — Home Genitore (guest tipo=genitore)
 * Sezioni: comunicazioni, convocazioni figlio, calendario partite, risultati, stats squadra
 */
import { apiFetch } from '../../services/api.js';

export default async function loadGuestGenitore() {
  const c = document.getElementById('pageContent');
  const teamId = window.YFM.guestTeamId || window.YFM.squadraId;

  if (!teamId) {
    c.innerHTML = '<div class="error-box">Link non associato a una squadra.</div>';
    return;
  }

  c.innerHTML = '<div class="loading"><div class="spinner"></div>Caricamento...</div>';

  try {
    const matches = await apiFetch(`/squadre/${teamId}/partite`).catch(() => []);

    // Convocazione prossima partita
    const todayStr = new Date().toISOString().slice(0, 10);
    const now = new Date().toISOString();
    const nextMatch = (matches || [])
      .filter(m => m.data_ora && m.data_ora > now && m.stato !== 'Archiviata' && m.stato !== 'Terminata' && m.live_meta?.stato !== 'fine')
      .sort((a, b) => a.data_ora.localeCompare(b.data_ora))[0] || null;

    let convocationPublished = false;
    let convocatiCount = 0;
    if (nextMatch) {
      const notifs = await apiFetch(`/notifications/team/${teamId}?tipo=convocazione`).catch(() => []);
      convocationPublished = (notifs || []).some(n => n.tipo === 'convocazione' && n.riferimento_id === nextMatch.id);
      if (convocationPublished) {
        try {
          const convs = await apiFetch(`/partite/${nextMatch.id}/convocazioni`);
          convocatiCount = (convs || []).filter(cv => cv.presente && cv.risposta !== 'indisponibile').length;
        } catch(e) { /* silent */ }
      }
    }

    render(c, { teamId, matches, nextMatch, convocationPublished, convocatiCount });
  } catch (e) {
    c.innerHTML = `<div class="error-box">Errore: ${e.message}</div>`;
  }
}

function render(c, { teamId, matches, nextMatch, convocationPublished, convocatiCount }) {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  // Prossime partite (escludi la nextMatch già mostrata nella card convocazione)
  const upcoming = (matches || [])
    .filter(m => m.data_ora && m.data_ora.slice(0, 10) >= todayStr && m.stato !== 'Archiviata')
    .sort((a, b) => a.data_ora.localeCompare(b.data_ora))
    .slice(0, 3);

  // Ultimi risultati
  const past = (matches || [])
    .filter(m => m.stato === 'Archiviata' || (m.data_ora && m.data_ora.slice(0, 10) < todayStr))
    .sort((a, b) => b.data_ora.localeCompare(a.data_ora))
    .slice(0, 5);



  let html = `<style>
    .gg-container { max-width:600px; margin:0 auto; padding:16px; }
    .gg-header { text-align:center; margin-bottom:20px; }
    .gg-header h1 { font-size:20px; margin:0; color:#1a1a2e; }
    .gg-header p { color:#666; font-size:13px; margin:4px 0 0; }
    .gg-section { background:white; border-radius:12px; padding:16px; margin-bottom:12px; border:1px solid #eee; }
    .gg-section-title { font-size:14px; font-weight:700; margin-bottom:12px; color:#333; }
    .gg-notif { padding:10px 12px; border-radius:8px; background:#f8f9fa; margin-bottom:6px; font-size:13px; border-left:3px solid #667eea; }
    .gg-notif.unread { background:#eef2ff; font-weight:600; }
    .gg-match-card { display:flex; align-items:center; justify-content:space-between; padding:10px 12px; border-radius:8px; background:#f8f9fa; margin-bottom:6px; }
    .gg-match-team { font-weight:600; font-size:13px; }
    .gg-match-meta { font-size:11px; color:#888; }
    .gg-match-result { font-weight:700; font-size:14px; }

  </style>`;

  html += `<div class="gg-container">`;

  // Header
  html += `<div class="gg-header">
    <h1>👋 Benvenuto</h1>
    <p>Segui la squadra: risultati, classifica e calendario.</p>
  </div>`;



  // Prossima partita (info pubblica, no dettagli convocazione personale)
  if (nextMatch && convocationPublished) {
    const d = new Date(nextMatch.data_ora);
    const dateStr = d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const timeStr = d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    const societa = window.YFM.getSocietaName ? window.YFM.getSocietaName() : '';
    const campoCasa = window.YFM.facility ? [window.YFM.facility.nome, window.YFM.facility.indirizzo].filter(Boolean).join(' - ') : 'Campo di casa';
    const campoInfo = nextMatch.luogo === 'Trasferta' ? (nextMatch.indirizzo_campo || 'Trasferta') : campoCasa;

    html += `<div class="gg-section" style="border-left:3px solid #667eea;">
      <div class="gg-section-title">⚽ Prossima Partita</div>
      <div style="font-size:13px;color:#333;line-height:1.8;">
        <div><strong>${societa.toUpperCase()} - ${(nextMatch.avversario || 'TBD').toUpperCase()}</strong></div>
        <div>🏟️ ${campoInfo}</div>
        <div>🗓️ ${dateStr} ore ${timeStr}</div>
      </div>
    </div>`;
  }

  // Prossime partite
  if (upcoming.length > 0) {
    html += `<div class="gg-section">
      <div class="gg-section-title">📅 Prossime Partite</div>
      ${upcoming.map(m => {
        const d = new Date(m.data_ora);
        const dateStr = d.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' });
        const timeStr = d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
        return `<div class="gg-match-card">
          <div>
            <div class="gg-match-team">${m.avversario || 'Da definire'}</div>
            <div class="gg-match-meta">${dateStr} • ${timeStr} • ${m.casa ? '🏠 Casa' : '✈️ Trasferta'}</div>
          </div>
        </div>`;
      }).join('')}
    </div>`;
  }

  // Ultimi risultati
  if (past.length > 0) {
    html += `<div class="gg-section">
      <div class="gg-section-title">⚽ Ultimi Risultati</div>
      ${past.map(m => {
        const d = new Date(m.data_ora);
        const dateStr = d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
        const result = m.gol_casa != null && m.gol_trasferta != null ? `${m.gol_casa}-${m.gol_trasferta}` : '—';
        // Determina colore risultato
        let resultColor = '#666';
        if (m.gol_casa != null && m.gol_trasferta != null) {
          const noi = m.casa ? m.gol_casa : m.gol_trasferta;
          const loro = m.casa ? m.gol_trasferta : m.gol_casa;
          if (noi > loro) resultColor = '#27AE60';
          else if (noi < loro) resultColor = '#E74C3C';
          else resultColor = '#F39C12';
        }
        return `<div class="gg-match-card">
          <div>
            <div class="gg-match-team">${m.avversario || '?'}</div>
            <div class="gg-match-meta">${dateStr} • ${m.casa ? 'Casa' : 'Trasferta'}</div>
          </div>
          <span class="gg-match-result" style="color:${resultColor};">${result}</span>
        </div>`;
      }).join('')}
    </div>`;
  }

  // Nessun contenuto partite
  if (upcoming.length === 0 && past.length === 0) {
    html += `<div class="gg-section" style="text-align:center;padding:40px 16px;">
      <p style="font-size:32px;">📅</p>
      <p style="color:#666;">Nessuna partita in programma al momento.</p>
    </div>`;
  }

  html += `</div>`; // gg-container
  c.innerHTML = html;
}


