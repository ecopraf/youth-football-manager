import { apiFetch } from '../../services/api.js';
import { showLoading, hideLoading } from '../../utils/ui.js';

export default async function loadAbsence() {
  const c = document.getElementById('pageContent');
  const playerId = window.YFM.guestPlayerId;
  const teamId = window.YFM.squadraId;

  if (!playerId) {
    c.innerHTML = '<div class="error-box">Accesso non disponibile. Il tuo link non è associato a un giocatore.</div>';
    return;
  }

  c.innerHTML = '<div class="loading"><div class="spinner"></div>Caricamento...</div>';

  try {
    const [trainings, myAbsences, motivi] = await Promise.all([
      apiFetch('/squadre/' + teamId + '/allenamenti-futuri').catch(() => []),
      apiFetch('/absence/player/' + playerId).catch(() => []),
      apiFetch('/absence/motivi').catch(() => ['Infortunio', 'Malattia', 'Impegni scolastici', 'Motivi familiari', 'Altro'])
    ]);

    renderAbsencePage(c, trainings, myAbsences, motivi, playerId, teamId);
  } catch (e) {
    c.innerHTML = '<div class="error-box">Errore: ' + e.message + '</div>';
  }
}

function renderAbsencePage(c, trainings, myAbsences, motivi, playerId, teamId) {
  const absenceDates = new Set(myAbsences.map(a => a.data_allenamento));

  let html = `<style>
    .absence-card { background:white; border-radius:12px; padding:16px; margin-bottom:12px; box-shadow:0 2px 8px rgba(0,0,0,0.06); border:1px solid #eee; }
    .absence-card-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; }
    .absence-date { font-weight:700; font-size:15px; color:#1a1a2e; }
    .absence-time { font-size:13px; color:#888; }
    .absence-reported { background:#FFF3E0; border-color:#F39C12; }
    .absence-reported .absence-badge { background:#F39C12; color:white; padding:2px 8px; border-radius:10px; font-size:11px; font-weight:600; }
    .absence-form { margin-top:12px; padding-top:12px; border-top:1px solid #eee; }
    .absence-history { margin-top:24px; }
    .absence-history-item { padding:8px 12px; border-left:3px solid #F39C12; margin-bottom:8px; background:#fafafa; border-radius:0 8px 8px 0; }
  </style>`;

  html += `<h1 class="page-title">📋 Segnala Assenza</h1>
    <p style="color:#666;font-size:14px;margin-bottom:20px;">Seleziona un allenamento e comunica la tua assenza al mister.</p>`;

  // Prossimi allenamenti
  if (trainings.length === 0) {
    html += '<div class="absence-card"><p style="color:#999;text-align:center;">Nessun allenamento programmato</p></div>';
  } else {
    trainings.forEach(t => {
      const date = new Date(t.data_ora);
      const dateStr = date.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
      const timeStr = date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
      const dataOnly = t.data_ora.substring(0, 10);
      const alreadyReported = absenceDates.has(dataOnly);

      html += `<div class="absence-card ${alreadyReported ? 'absence-reported' : ''}">
        <div class="absence-card-header">
          <div>
            <div class="absence-date">🏋️ ${dateStr}</div>
            <div class="absence-time">⏰ ${timeStr}${t.luogo ? ' • 📍 ' + t.luogo : ''}</div>
          </div>
          ${alreadyReported ? '<span class="absence-badge">✅ Segnalata</span>' : `<button class="btn btn-small btn-warning absence-btn" data-training-id="${t.id}" data-date="${dataOnly}">⚠️ Assente</button>`}
        </div>
      </div>`;
    });
  }

  // Storico
  if (myAbsences.length > 0) {
    html += `<div class="absence-history"><h3 style="font-size:14px;margin-bottom:12px;">📜 Le mie segnalazioni</h3>`;
    myAbsences.slice(0, 10).forEach(a => {
      const d = new Date(a.data_allenamento).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
      html += `<div class="absence-history-item">
        <strong>${d}</strong> — ${a.motivo}${a.messaggio ? ` <span style="color:#666;font-size:12px;">• "${a.messaggio}"</span>` : ''}
        ${a.letto ? '<span style="color:#27AE60;font-size:11px;"> ✓ Letto</span>' : ''}
      </div>`;
    });
    html += '</div>';
  }

  // Modal segnalazione (hidden)
  html += `<div id="absenceModal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:1000;align-items:center;justify-content:center;">
    <div style="background:white;border-radius:12px;padding:24px;max-width:400px;width:90%;">
      <h3 style="margin-bottom:16px;">⚠️ Segnala Assenza</h3>
      <div class="form-group" style="margin-bottom:12px;">
        <label>Motivo *</label>
        <select id="absMotivo" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:8px;">
          ${motivi.map(m => `<option value="${m}">${m}</option>`).join('')}
        </select>
      </div>
      <div class="form-group" style="margin-bottom:16px;">
        <label>Messaggio per il mister (opzionale)</label>
        <textarea id="absMessaggio" rows="3" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:8px;resize:none;" placeholder="es. Torno giovedì..."></textarea>
      </div>
      <input type="hidden" id="absTrainingId">
      <input type="hidden" id="absDate">
      <div style="display:flex;gap:8px;">
        <button class="btn btn-primary" id="absConfirm" style="flex:1;">✅ Conferma</button>
        <button class="btn btn-secondary" id="absCancel">Annulla</button>
      </div>
    </div>
  </div>`;

  c.innerHTML = html;

  // Event listeners
  c.querySelectorAll('.absence-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('absTrainingId').value = btn.dataset.trainingId;
      document.getElementById('absDate').value = btn.dataset.date;
      document.getElementById('absenceModal').style.display = 'flex';
    });
  });

  document.getElementById('absCancel')?.addEventListener('click', () => {
    document.getElementById('absenceModal').style.display = 'none';
  });

  document.getElementById('absConfirm')?.addEventListener('click', async () => {
    const motivo = document.getElementById('absMotivo').value;
    const messaggio = document.getElementById('absMessaggio').value.trim();
    const training_id = document.getElementById('absTrainingId').value;
    const data_allenamento = document.getElementById('absDate').value;

    showLoading('Invio...');
    try {
      await apiFetch('/absence', {
        method: 'POST',
        body: JSON.stringify({ player_id: playerId, team_id: teamId, training_id, data_allenamento, motivo, messaggio })
      });
      hideLoading();
      document.getElementById('absenceModal').style.display = 'none';
      loadAbsence(); // Ricarica
    } catch (err) {
      hideLoading();
      alert('❌ ' + err.message);
    }
  });
}
