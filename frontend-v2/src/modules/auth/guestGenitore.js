/**
 * guestGenitore.js — Home Genitore (guest tipo=genitore)
 * Sezioni: comunicazioni, convocazioni figlio, calendario partite, risultati, stats squadra
 */
import { apiFetch } from '../../services/api.js';
import { updateGuestBell, isReadByGuest } from './guestAtleta.js';

export default async function loadGuestGenitore() {
  const c = document.getElementById('pageContent');
  const teamId = window.YFM.guestTeamId || window.YFM.squadraId;
  const playerName = window.YFM.guestPlayerName;

  if (!teamId) {
    c.innerHTML = '<div class="error-box">Link non associato a una squadra.</div>';
    return;
  }

  c.innerHTML = '<div class="loading"><div class="spinner"></div>Caricamento...</div>';

  try {
    const [notifications, matches] = await Promise.all([
      apiFetch(`/notifications/team/${teamId}?destinatario_tipo=genitore`).catch(() => []),
      apiFetch(`/squadre/${teamId}/partite`).catch(() => [])
    ]);

    render(c, { teamId, playerName, notifications, matches });
    updateGuestBell(teamId);
  } catch (e) {
    c.innerHTML = `<div class="error-box">Errore: ${e.message}</div>`;
  }
}

function render(c, { teamId, playerName, notifications, matches }) {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  // Prossime partite
  const upcoming = (matches || [])
    .filter(m => m.data_ora && m.data_ora.slice(0, 10) >= todayStr && m.stato !== 'Archiviata')
    .sort((a, b) => a.data_ora.localeCompare(b.data_ora))
    .slice(0, 3);

  // Ultimi risultati
  const past = (matches || [])
    .filter(m => m.stato === 'Archiviata' || (m.data_ora && m.data_ora.slice(0, 10) < todayStr))
    .sort((a, b) => b.data_ora.localeCompare(a.data_ora))
    .slice(0, 5);

  // Notifiche non lette (per questa sessione)
  const unread = (notifications || []).filter(n => !isReadByGuest(n));


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
  const childFirst = playerName ? playerName.split(' ')[0] : null;
  html += `<div class="gg-header">
    <h1>👨‍👩‍👦 Area Genitore</h1>
    <p>${childFirst ? `Spazio dedicato al genitore di ${childFirst}` : 'Comunicazioni e calendario della squadra'}</p>
  </div>`;

  // Comunicazioni — sempre visibile
  html += `<div class="gg-section">
    <div class="gg-section-title">🔔 Comunicazioni${unread.length > 0 ? ` (${unread.length} nuove)` : ''}</div>
    ${unread.length === 0 ? '<p style="color:#999;font-size:13px;margin:0;">Nessuna comunicazione al momento</p>' :
      unread.slice(0, 5).map(n => `<div class="gg-notif unread">
        <div style="font-weight:700;margin-bottom:2px;">${priorityBadge(n.priorita)}${n.titolo || 'Comunicazione'}</div>
        <div style="font-weight:400;font-size:12px;color:#555;">${n.messaggio || ''}</div>
      </div>`).join('')}
    ${unread.length > 5 ? `<p style="font-size:12px;color:#667eea;margin:8px 0 0;">+ altre ${unread.length - 5}</p>` : ''}
  </div>`;


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

function priorityBadge(priorita) {
  if (!priorita || priorita === 'info') return '';
  const map = { importante: '🟡', urgente: '🔴' };
  return `<span style="margin-right:4px;">${map[priorita] || ''}</span>`;
}
