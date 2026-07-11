/**
 * guestGenitore.js — Home Genitore (guest tipo=genitore)
 * Sezioni: comunicazioni, convocazioni figlio, calendario partite, risultati, stats squadra
 */
import { apiFetch } from '../../services/api.js';
import { showLoading, hideLoading } from '../../utils/ui.js';
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

  const playerId = window.YFM.guestPlayerId;

  try {
    const [notifications, matches] = await Promise.all([
      apiFetch(`/notifications/team/${teamId}?destinatario_tipo=genitore`).catch(() => []),
      apiFetch(`/squadre/${teamId}/partite`).catch(() => [])
    ]);

    // Convocazione prossima partita
    const todayStr = new Date().toISOString().slice(0, 10);
    const now = new Date().toISOString();
    const nextMatch = (matches || [])
      .filter(m => m.data_ora && m.data_ora > now && m.stato !== 'Archiviata' && m.stato !== 'Terminata' && m.live_meta?.stato !== 'fine')
      .sort((a, b) => a.data_ora.localeCompare(b.data_ora))[0] || null;

    let myConvocation = null;
    let convocationPublished = false;
    let convocatiCount = 0;
    if (nextMatch) {
      convocationPublished = (notifications || []).some(n => n.tipo === 'convocazione' && n.riferimento_id === nextMatch.id);
      if (convocationPublished) {
        try {
          const convs = await apiFetch(`/partite/${nextMatch.id}/convocazioni`);
          convocatiCount = (convs || []).filter(cv => cv.presente && cv.risposta !== 'indisponibile').length;
          if (playerId) {
            myConvocation = (convs || []).find(cv => cv.calciatoreId === playerId && cv.presente);
          }
        } catch(e) { /* silent */ }
      }
    }

    render(c, { teamId, playerName, playerId, notifications, matches, nextMatch, myConvocation, convocationPublished, convocatiCount });
    updateGuestBell(teamId);
  } catch (e) {
    c.innerHTML = `<div class="error-box">Errore: ${e.message}</div>`;
  }
}

function render(c, { teamId, playerName, playerId, notifications, matches, nextMatch, myConvocation, convocationPublished, convocatiCount }) {
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


  // Card convocazione (se pubblicata)
  if (nextMatch && convocationPublished) {
    const d = new Date(nextMatch.data_ora);
    const dateStr = d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const timeStr = d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    const ritrovo = new Date(d.getTime() - 75 * 60000);
    const ritrovoStr = ritrovo.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    const childFirst = playerName ? playerName.split(' ')[0] : 'tuo figlio';
    const societa = window.YFM.getSocietaName ? window.YFM.getSocietaName() : '';
    const campoCasa = window.YFM.facility ? [window.YFM.facility.nome, window.YFM.facility.indirizzo].filter(Boolean).join(' - ') : 'Campo di casa';
    const campoInfo = nextMatch.luogo === 'Trasferta' ? (nextMatch.indirizzo_campo || 'Trasferta') : campoCasa;

    // Dettagli partita stile convocazione
    let detailsHtml = `<div style="font-size:13px;color:#333;line-height:1.8;margin-bottom:10px;">`;
    detailsHtml += `<div>⚽ <strong>${societa.toUpperCase()} - ${(nextMatch.avversario || 'TBD').toUpperCase()}</strong></div>`;
    detailsHtml += `<div>🏟️ Campo: <strong>${campoInfo}</strong></div>`;
    detailsHtml += `<div>🗓️ Alle ore <strong>${timeStr}</strong> del giorno <strong>${dateStr}</strong></div>`;
    detailsHtml += `<div>🚌 Ritrovo alle ore <strong>${ritrovoStr}</strong> al Campo di Giuoco</div>`;
    detailsHtml += `</div>`;

    // Stato figlio (solo se player_id associato)
    let statusHtml = '';
    if (playerId) {
      if (!myConvocation) {
        statusHtml = `<div style="margin-top:10px;padding:10px 12px;border-radius:8px;background:#f8f9fa;border:1px solid #e5e7eb;font-size:13px;color:#666;">📋 ${childFirst} non è stato convocato per questa partita</div>`;
      } else if (myConvocation.risposta === 'indisponibile') {
        statusHtml = `<div style="margin-top:10px;padding:10px 12px;border-radius:8px;background:#fee2e2;font-size:13px;">❌ ${childFirst} ha comunicato la propria indisponibilità${myConvocation.risposta_motivo ? ' — ' + myConvocation.risposta_motivo : ''}</div>`;
      } else {
        statusHtml = `<div style="margin-top:10px;padding:10px 12px;border-radius:8px;background:#d1fae5;border:1px solid #a7f3d0;font-size:13px;font-weight:600;">✅ ${childFirst} è convocato!</div>`;
      }
    }

    html += `<div class="gg-section" style="border-left:3px solid #667eea;">
      <div class="gg-section-title">📋 Convocazione vs ${nextMatch.avversario || 'Da definire'}</div>
      <div style="font-size:13px;color:#555;margin-bottom:8px;">${convocatiCount} convocati per ${dateStr}. Verifica la convocazione di tuo figlio.</div>
      ${detailsHtml}
      ${statusHtml}
      <button class="btn btn-secondary" id="ggConvView" data-match-id="${nextMatch.id}" style="font-size:12px;padding:6px 12px;margin-top:10px;">📄 Vedi Convocazione</button>
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
  bindGenitoreEvents(c, teamId);
}

function bindGenitoreEvents(c, teamId) {
  document.getElementById('ggConvView')?.addEventListener('click', async (e) => {
    const matchId = e.target.dataset.matchId;
    showLoading('Caricamento...');
    try {
      const convs = await apiFetch(`/squadre/${teamId}/partite/${matchId}/convocati`);
      const players = await apiFetch(`/squadre/${teamId}/calciatori`);
      hideLoading();
      const list = (convs || []).map(cv => {
        const p = (players || []).find(pl => pl.id === cv.calciatoreId);
        return p ? `${p.cognome} ${p.nome}` : '?';
      }).sort();
      const overlay = document.createElement('div');
      overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:2000;display:flex;align-items:center;justify-content:center;';
      overlay.innerHTML = `<div style="background:white;border-radius:16px;padding:24px;max-width:360px;width:95%;max-height:80vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
        <div style="text-align:center;font-weight:700;font-size:16px;margin-bottom:16px;">📋 Convocati (${list.length})</div>
        <div style="display:flex;flex-direction:column;gap:6px;">
          ${list.map((name, i) => `<div style="padding:6px 10px;border-radius:8px;background:#f8f9fa;font-size:13px;">${i + 1}. ${name}</div>`).join('')}
        </div>
        <button class="btn btn-secondary" style="width:100%;margin-top:16px;" id="ggConvViewClose">Chiudi</button>
      </div>`;
      document.body.appendChild(overlay);
      overlay.addEventListener('click', (ev) => { if (ev.target === overlay) overlay.remove(); });
      overlay.querySelector('#ggConvViewClose').addEventListener('click', () => overlay.remove());
    } catch(err) { hideLoading(); }
  });
}

function priorityBadge(priorita) {
  if (!priorita || priorita === 'info') return '';
  const map = { importante: '🟡', urgente: '🔴' };
  return `<span style="margin-right:4px;">${map[priorita] || ''}</span>`;
}
