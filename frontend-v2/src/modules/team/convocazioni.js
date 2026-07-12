import { apiFetch } from '../../services/api';
import { formatDate, getAvatarColor } from '../../utils/formatters';
import { showLoading, hideLoading } from '../../utils/ui';
import { printHTML } from '../../utils/printHelper';
import { invalidateDashboardCache } from './dashboard.js';
import { calcCertificatiStatus } from '../../utils/certificati.js';

// Aggiorna le card dashboard (convocazione + prossima partita) dopo salvataggio
function refreshDashConvCards(matchId) {
  const convWidget = document.getElementById('dashConvocazioneWidget');
  const convStatus = document.getElementById('dashConvStatus');
  if (!convWidget && !convStatus) return;
  const infortunati = window._dashInfortunati || [];
  apiFetch('/partite/' + matchId + '/convocazioni').then(convAll => {
    const tutti = (convAll || []).filter(c => c.presente);
    const injPlayerIds = new Set(infortunati.map(i => i.player_id));
    const assenti = tutti.filter(c => c.risposta === 'indisponibile' && !injPlayerIds.has(c.calciatoreId));
    const injIndisponibili = tutti.filter(c => c.risposta === 'indisponibile' && injPlayerIds.has(c.calciatoreId));
    const convIds = new Set(tutti.map(c => c.calciatoreId));
    const injNonConv = infortunati.filter(i => !i.data_rientro_effettiva && !convIds.has(i.player_id));
    const totInj = injIndisponibili.length + injNonConv.length;
    const totAssenti = assenti.length;
    const disponibili = tutti.length - assenti.length - injIndisponibili.length;
    // Update status line in prossima partita card
    if (convStatus) {
      let html = '<div style="font-size:11px;opacity:0.9;display:flex;gap:8px;justify-content:center;flex-wrap:wrap;">';
      if (tutti.length > 0) html += '<span>\uD83D\uDC65 ' + disponibili + ' disponibili</span>';
      if (totInj > 0) html += '<span style="color:#fca5a5;font-weight:700;">\uD83C\uDFE5 ' + totInj + ' indisponibil' + (totInj === 1 ? 'e' : 'i') + '</span>';
      if (totAssenti > 0) html += '<span style="color:#fca5a5;font-weight:700;">\u274C ' + totAssenti + ' assent' + (totAssenti === 1 ? 'e' : 'i') + '</span>';
      html += '</div>';
      convStatus.innerHTML = tutti.length > 0 || totInj > 0 || totAssenti > 0 ? html : '';
    }
    // Update segreteria card
    if (convWidget) {
      const stato = tutti.length > 0
        ? '<span style="color:#27AE60;font-weight:600;">\u2705 ' + disponibili + ' disponibili</span>'
        : '<span style="color:#E67E22;font-weight:600;">\u2B1C Da convocare</span>';
      let alertHtml = '';
      if (totInj > 0 || totAssenti > 0) {
        alertHtml = '<div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap;font-size:11px;">';
        if (totInj > 0) alertHtml += '<span style="background:#fee2e2;color:#dc2626;padding:3px 8px;border-radius:6px;font-weight:600;">\uD83C\uDFE5 ' + totInj + ' indisponibil' + (totInj === 1 ? 'e' : 'i') + '</span>';
        if (totAssenti > 0) alertHtml += '<span style="background:#fff3e0;color:#e65100;padding:3px 8px;border-radius:6px;font-weight:600;">\u274C ' + totAssenti + ' assent' + (totAssenti === 1 ? 'e' : 'i') + '</span>';
        alertHtml += '</div>';
      }
      // Update only the dynamic parts (stato + alert)
      const statoEl = convWidget.querySelector('[data-conv-stato]');
      const alertEl = convWidget.querySelector('[data-conv-alert]');
      if (statoEl) statoEl.innerHTML = stato;
      if (alertEl) alertEl.innerHTML = alertHtml;
    }
  }).catch(() => {});
}

export async function openConvocation(mid, readOnly) {
  const match = window.YFM.allMatches?.find(m => m.id === mid) || {};
  const isArchiviata = match.archiviata === true || match.archiviata === 'true';
  
  let conv = [];
  let gioc = [];
  let weekAbsences = [];
  let realAbsences = [];
  
  const matchDate = match.data_ora ? match.data_ora.substring(0, 10) : '';

  [conv, gioc, weekAbsences, realAbsences] = await Promise.all([
    apiFetch('/partite/' + mid + '/convocazioni').catch(() => []),
    apiFetch('/squadre/' + window.YFM.squadraId + '/calciatori'),
    apiFetch('/absence/team/' + window.YFM.squadraId + '/week' + (matchDate ? '?date=' + matchDate : '')).catch(() => []),
    apiFetch('/squadre/' + window.YFM.squadraId + '/assenze-settimana' + (matchDate ? '?date=' + matchDate : '')).catch(() => [])
  ]);

  // Conta assenze REALI registrate dal mister (training_attendance)
  const absCountByPlayer = {};
  (realAbsences || []).forEach(a => {
    const pid = a.player_id;
    absCountByPlayer[pid] = (absCountByPlayer[pid] || 0) + 1;
  });

  // Giocatori con assenza segnalata per la data esatta della partita → congelati
  const absentForMatchIds = new Set(
    (weekAbsences || []).filter(a => a.data_allenamento === matchDate).map(a => a.player_id)
  );

  // Check rosa sufficiente
  const attivi = (gioc || []).filter(g => g.stato === 'Attivo' || !g.stato);
  if (attivi.length === 0) {
    const content = '<div style="text-align:center;padding:32px 16px;"><div style="font-size:48px;margin-bottom:16px;">⚠️</div><div style="font-size:16px;font-weight:600;color:#333;margin-bottom:8px;">Nessun giocatore in rosa</div><div style="font-size:13px;color:#666;">Aggiungi i giocatori alla rosa prima di convocare.</div></div>';
    const footer = '<button class="btn btn-secondary" id="modalCancel">Chiudi</button>';
    createModal('📋 Convocazioni', content, footer);
    return;
  }
  if (attivi.length < 11) {
    const content = '<div style="text-align:center;padding:32px 16px;"><div style="font-size:48px;margin-bottom:16px;">⚠️</div><div style="font-size:16px;font-weight:600;color:#333;margin-bottom:8px;">Solo ' + attivi.length + ' giocatori in rosa</div><div style="font-size:13px;color:#666;">Servono almeno 11 giocatori per convocare una partita.</div></div>';
    const footer = '<button class="btn btn-secondary" id="modalCancel">Chiudi</button>';
    createModal('📋 Convocazioni', content, footer);
    return;
  }

  // Mappa risposte convocazione per giocatore
  const rispostaMap = {};
  conv.filter(c => c.risposta).forEach(c => {
    rispostaMap[c.calciatoreId] = { risposta: c.risposta, motivo: c.risposta_motivo };
  });
  // IDs congelati: indisponibili post-convocazione + assenti pre-convocazione
  const indisponibiliIds = new Set(Object.entries(rispostaMap).filter(([,v]) => v.risposta === 'indisponibile').map(([k]) => k));
  const frozenIds = new Set([...indisponibiliIds, ...absentForMatchIds]);
  const ids = conv.filter(c => c.presente === true && !frozenIds.has(c.calciatoreId)).map(c => c.calciatoreId);
  const sorted = [...gioc].sort((a, b) => {
    const o = ['Portiere', 'Difensore', 'Centrocampista', 'Attaccante'];
    const ra = o.indexOf(a.ruolo), rb = o.indexOf(b.ruolo);
    if (ra !== rb) return ra - rb;
    return a.cognome.localeCompare(b.cognome);
  });

  // Se partita archiviata O readOnly (passata), mostra sola lettura
  if (isArchiviata || readOnly) {
    const convocatiList = conv.filter(c => c.presente === true).map(c => {
      const g = gioc.find(g => g.id === c.calciatoreId);
      return {
        nome: g?.nome || '', cognome: g?.cognome || '',
        ruolo: g?.ruolo || ''
      };
    });
    showConvocationPreview(match, convocatiList, isArchiviata);
    return;
  }

  // Calcola certificati scaduti/in scadenza per warning
  const certStatus = calcCertificatiStatus(gioc);
  const certExpiredIds = new Set(certStatus.scaduti.map(p => p.id));
  const certExpiringSoonIds = new Set(certStatus.inScadenza.map(p => p.id));
  const certMissingIds = new Set(certStatus.mancanti.map(p => p.id));

  // Determina stato: esistono convocazioni salvate? È stata pubblicata?
  const hasSavedConv = conv.length > 0;
  const isPublished = hasSavedConv ? await apiFetch('/partite/' + mid + '/convocazioni-stato').catch(() => ({ published: false })) : { published: false };
  const published = isPublished.published === true;
  // Traccia se ci sono modifiche non pubblicate
  let hasUnsavedChanges = false;

  const content = `
    <p style="margin-bottom:8px;color:var(--gray);">${formatDate(match.data_ora)}</p>
    <div style="display:flex;gap:8px;margin-bottom:12px;align-items:center;" data-help="convocazioni.selezione">
      <button class="btn btn-secondary btn-small" id="btnSelAll">✅ Tutti</button>
      <button class="btn btn-secondary btn-small" id="btnDeselAll">❌ Nessuno</button>
      <span style="font-size:12px;color:var(--gray);" id="convCount">${ids.length} convocati</span>${frozenIds.size > 0 ? `<span style="font-size:11px;color:#dc2626;font-weight:600;">❌ ${frozenIds.size} non disponibil${frozenIds.size === 1 ? 'e' : 'i'}</span>` : ''}
      <span id="convWarning" style="color:#E74C3C;font-weight:600;font-size:12px;display:none;"></span>
    </div>
    <div id="certBanner" style="display:none;background:#FDEDEE;border:1px solid #FDCECE;border-radius:8px;padding:8px 12px;margin-bottom:10px;font-size:12px;color:#E74C3C;font-weight:600;"></div>
    ${sorted.map(g => {
      const abs = absCountByPlayer[g.id] || 0;
      const isInj = g.stato === 'Infortunato';
      const certScaduto = certExpiredIds.has(g.id);
      const certInScadenza = certExpiringSoonIds.has(g.id);
      const badges = [];
      if (certScaduto) badges.push('<span style="background:#FDEDEE;color:#E74C3C;padding:1px 6px;border-radius:8px;font-size:10px;font-weight:600;">⚠️ Cert. scaduto</span>');
      else if (certInScadenza) badges.push('<span style="background:#FFF8E1;color:#F39C12;padding:1px 6px;border-radius:8px;font-size:10px;font-weight:600;">⏳ Cert. in scadenza</span>');
      if (isInj) badges.push('<span style="background:#FDEDEE;color:#E74C3C;padding:1px 6px;border-radius:8px;font-size:10px;font-weight:600;">🤕 Infortunato</span>');
      if (abs > 0) badges.push(`<span style="background:#FFF3E0;color:#E65100;padding:1px 6px;border-radius:8px;font-size:10px;font-weight:600;">⚠️ ${abs} assenz${abs > 1 ? 'e' : 'a'} sett.</span>`);
      const risp = rispostaMap[g.id];
      const isIndisponibile = risp?.risposta === 'indisponibile';
      const isAbsentForMatch = absentForMatchIds.has(g.id);
      const isFrozen = isIndisponibile || isAbsentForMatch;
      if (isIndisponibile && !isInj) badges.push(`<span style="background:#fee2e2;color:#dc2626;padding:1px 6px;border-radius:8px;font-size:10px;font-weight:600;" title="${risp.motivo || ''}">❌ Indisponibile</span>`);
      else if (isAbsentForMatch) badges.push('<span style="background:#fee2e2;color:#dc2626;padding:1px 6px;border-radius:8px;font-size:10px;font-weight:600;">🚫 Assente</span>');
      return `
      <div class="convocation-item" style="${isFrozen ? 'opacity:0.5;text-decoration:line-through;' : ''}">
        <input type="checkbox" ${ids.includes(g.id) ? 'checked' : ''} data-pid="${g.id}" class="conv-check" ${isFrozen ? 'disabled' : ''} style="width:20px;height:20px;cursor:${isFrozen ? 'not-allowed' : 'pointer'};accent-color:${isFrozen ? '#999' : 'var(--green)'};">
        <div class="player-avatar" style="width:32px;height:32px;font-size:12px;background:${getAvatarColor(g.nome)};">${g.nome[0]}${g.cognome[0]}</div>
        <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${g.cognome} ${g.nome}${badges.length ? ' ' + badges.join(' ') : ''}</span>
        <span style="color:var(--gray);font-size:13px;white-space:nowrap;">${g.ruolo}${g.numeroMaglia ? ' · #' + g.numeroMaglia : ''}</span>
      </div>
    `}).join('')}`;

  // Bottone salva/modifica + pubblica con stati visivi
  const saveBtnLabel = hasSavedConv ? '✏️ Modifica' : '💾 Salva';
  const dotColor = published ? '#27AE60' : '#FFD700';
  const dotAnim = published ? 'none' : 'pulse-dot 1.2s infinite';

  const footer = `
    <style>@keyframes pulse-dot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.4;transform:scale(1.3)}}</style>
    <button class="btn btn-secondary" id="modalCancel">Chiudi</button>
    <button class="btn btn-primary" id="saveBtn" data-help="convocazioni.salva">${saveBtnLabel}</button>
    <button class="btn btn-primary" id="publishBtn" style="display:flex;align-items:center;" title="Salva e invia notifica ad atleti, genitori e staff"><span id="pubDot" style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${dotColor};margin-right:6px;animation:${dotAnim};"></span>📢 Pubblica</button>
    <button class="btn btn-primary" id="previewBtn" style="background:#0A1C3A;" data-help="convocazioni.anteprima">📄 Vedi Convocazione</button>`;

  const modal = createModal('📋 Convocazioni vs ' + (match.avversario || '...'), content, footer, '650px');

  document.getElementById('previewBtn').addEventListener('click', () => {
    const checks = document.querySelectorAll('#currentModal .conv-check:checked');
    const list = [];
    checks.forEach(cb => {
      const pid = cb.dataset.pid;
      const g = gioc.find(x => x.id === pid);
      if (g) list.push({ nome: g.nome || '', cognome: g.cognome || '', ruolo: g.ruolo || '' });
    });
    if (list.length === 0) { alert('Nessun convocato selezionato.'); return; }
    showConvocationPreview(match, list, false);
  });

  function upd() {
    const checks = document.querySelectorAll('#currentModal .conv-check:checked:not(:disabled)');
    const c = checks.length;
    document.getElementById('convCount').textContent = c + ' convocati';
    const w = document.getElementById('convWarning'), s = document.getElementById('saveBtn');
    w.style.display = 'none'; s.disabled = false; s.style.opacity = '1';
    if (c > 20) { w.textContent = '⚠️ Max 20!'; w.style.display = 'inline'; s.disabled = true; s.style.opacity = '0.5'; }
    else if (c < 11) { w.textContent = '⚠️ Minimo 11!'; w.style.display = 'inline'; s.disabled = true; s.style.opacity = '0.5'; }
    else if (c < 16) { w.textContent = '⚠️ Solo ' + c; w.style.display = 'inline'; }
    // Banner certificati scaduti tra i convocati
    const banner = document.getElementById('certBanner');
    if (banner) {
      const selectedIds = [...checks].map(cb => cb.dataset.pid);
      const expConv = selectedIds.filter(id => certExpiredIds.has(id));
      const missConv = selectedIds.filter(id => certMissingIds.has(id));
      const tot = expConv.length + missConv.length;
      if (tot > 0) {
        banner.style.display = 'block';
        banner.textContent = '⚠️ ' + tot + ' convocati con certificato medico scaduto o mancante — non impiegabili senza rinnovo';
      } else { banner.style.display = 'none'; }
    }
  }
  document.querySelectorAll('#currentModal .conv-check:not(:disabled)').forEach(cb => cb.addEventListener('change', () => { upd(); markChanged(); }));
  document.getElementById('btnSelAll').addEventListener('click', () => {
    document.querySelectorAll('#currentModal .conv-check:not(:disabled)').forEach(cb => cb.checked = true); upd(); markChanged();
  });
  document.getElementById('btnDeselAll').addEventListener('click', () => {
    document.querySelectorAll('#currentModal .conv-check:not(:disabled)').forEach(cb => cb.checked = false); upd(); markChanged();
  });
  upd();

  // Marca che ci sono modifiche non pubblicate
  function markChanged() {
    if (!hasSavedConv) return;
    hasUnsavedChanges = true;
    const dot = document.getElementById('pubDot');
    if (dot) { dot.style.background = '#FFD700'; dot.style.animation = 'pulse-dot 1.2s infinite'; }
  }

  document.getElementById('saveBtn').addEventListener('click', async () => {
    const checks = document.querySelectorAll('#currentModal .conv-check:checked:not(:disabled)');
    if (checks.length > 20) { alert('⚠️ Max 20 convocabili!'); return; }
    if (checks.length < 11) { alert('⚠️ Minimo 11 calciatori!'); return; }
    if (checks.length < 16 && !await confirm('Solo ' + checks.length + ' convocati. Procedere?')) return;
    
    const convocazioni = [];
    document.querySelectorAll('#currentModal .conv-check:not(:disabled)').forEach(cb => {
      convocazioni.push({ calciatoreId: cb.dataset.pid, presente: cb.checked });
    });
    
    showLoading();
    try {
      await apiFetch('/partite/' + mid + '/convocazioni-batch', {
        method: 'POST', body: JSON.stringify({ convocazioni })
      });
      hideLoading();
      // Aggiorna stato bottoni
      const saveBtn = document.getElementById('saveBtn');
      if (saveBtn) saveBtn.innerHTML = '✏️ Modifica';
      // Segna che pubblica è necessario
      const dot = document.getElementById('pubDot');
      if (dot) { dot.style.background = '#FFD700'; dot.style.animation = 'pulse-dot 1.2s infinite'; }
      invalidateDashboardCache();
      refreshDashConvCards(mid);
      alert('✅ Convocazioni salvate! Ricorda di pubblicare per notificare.');
    } catch (e) {
      hideLoading();
      alert('Errore: ' + e.message);
    }
  });

  document.getElementById('publishBtn').addEventListener('click', async () => {
    const checks = document.querySelectorAll('#currentModal .conv-check:checked:not(:disabled)');
    if (checks.length < 11) { alert('⚠️ Minimo 11 calciatori!'); return; }
    if (checks.length > 20) { alert('⚠️ Max 20 convocabili!'); return; }
    const convocazioni = [];
    document.querySelectorAll('#currentModal .conv-check:not(:disabled)').forEach(cb => {
      convocazioni.push({ calciatoreId: cb.dataset.pid, presente: cb.checked });
    });
    showLoading();
    try {
      await apiFetch('/partite/' + mid + '/convocazioni-batch', { method: 'POST', body: JSON.stringify({ convocazioni }) });
      await apiFetch('/partite/' + mid + '/convocazioni-pubblica', { method: 'POST' });
      hideLoading();
      // Pallino verde fisso
      const dot = document.getElementById('pubDot');
      if (dot) { dot.style.background = '#27AE60'; dot.style.animation = 'none'; }
      hasUnsavedChanges = false;
      invalidateDashboardCache();
      refreshDashConvCards(mid);
      alert('✅ Convocazione pubblicata! Notifica inviata.');
    } catch (e) {
      hideLoading(); alert('Errore: ' + e.message);
    }
  });
}

function showConvocationPreview(match, list, isArchiviata = false) {
  list.sort((a, b) => (a.cognome || '').localeCompare(b.cognome || ''));
  const dt = match.data_ora ? new Date(match.data_ora) : null;
  const isValidDate = dt && !isNaN(dt.getTime());
  const ritrovo = isValidDate ? new Date(dt.getTime() - 75 * 60000) : null;
  const giorni = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
  
  // Categoria dalla squadra corrente
  const squadra = window.YFM.getSquadra ? window.YFM.getSquadra() : {};
  const catNome = squadra.category?.nome || squadra.categoria || 'U.15';
  const tipoCampionato = squadra.category?.tipo_campionato || '';
  
  // Intestazione per tipo competizione
  const comp = match.competizione || match.tipo_competizione || '';
  const girone = squadra.category?.girone || '';
  let titolo2 = '';
  if (comp === 'Campionato') {
    titolo2 = catNome + (tipoCampionato ? ' ' + tipoCampionato : '');
    if (girone) titolo2 += ' - Girone ' + girone;
    if (match.giornata) titolo2 += ' — Giornata ' + match.giornata;
  } else if (comp === 'Coppa') {
    titolo2 = catNome + ' COPPA';
  } else if (comp.toLowerCase().includes('torneo')) {
    titolo2 = catNome + ' TORNEO';
  } else {
    titolo2 = catNome + ' AMICHEVOLE';
  }
  
  const campoCasa = window.YFM.facility ? [window.YFM.facility.nome, window.YFM.facility.indirizzo, window.YFM.facility.citta].filter(Boolean).join(' - ') : '';
  const campoInfo = match.luogo === 'Trasferta' ? (match.indirizzo_campo || 'Trasferta') : (campoCasa || 'Casa');
  
  const oraStr = isValidDate ? dt.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : '--:--';
  const giornoStr = isValidDate ? `${giorni[dt.getDay()]} ${dt.toLocaleDateString('it-IT')}` : '---';
  const ritrovoStr = ritrovo ? ritrovo.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : '--:--';
  
  let html = '';
  
  if (isArchiviata) {
    html += '<div style="background:#8B7355;color:white;padding:10px 20px;border-radius:12px;margin-bottom:20px;text-align:center;font-weight:600;">📦 Partita Archiviata</div>';
  }
  
  const logoWs = window.YFM.getWorkspaceLogo ? window.YFM.getWorkspaceLogo() : '';
  const isAmichevole = !comp || comp === 'Amichevole';
  const giornataStr = !isAmichevole && match.giornata ? ` (${match.giornata}a)` : '';
  const gironeStr = !isAmichevole && match.girone ? ` - Gir. ${match.girone}` : '';
  
  html += `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4mm;">
      <div style="width:80px;text-align:left;">${logoWs ? '<img src="' + logoWs + '" style="height:70px;object-fit:contain;">' : ''}</div>
      <div style="flex:1;text-align:center;">
        <div class="t1">CONVOCAZIONE</div>
        <div class="t2">${titolo2}</div>
        ${!isAmichevole ? `<div class="t3">${giornataStr}${gironeStr}</div>` : ''}
      </div>
      <div style="width:80px;text-align:right;"><img src="/img/logo-lnd.png" style="height:70px;object-fit:contain;" onerror="this.style.display='none'"></div>
    </div>
    <div class="info">Partita: <strong>${(window.YFM.getSocietaName ? window.YFM.getSocietaName() : '').toUpperCase()} - ${match.avversario || 'TBD'}</strong><br>Campo: <strong>${campoInfo}</strong><br>Alle ore: <strong>${oraStr}</strong> del giorno: <strong>${giornoStr}</strong><br>Ritrovo alle ore: <strong>${ritrovoStr}</strong> al Campo di Giuoco</div>
    <div style="overflow-x:auto;-webkit-overflow-scrolling:touch;">
    <table class="list-table" style="border:2px solid #000;border-collapse:collapse;width:100%;table-layout:fixed;"><colgroup><col style="width:8%"><col style="width:42%"><col style="width:40%"><col style="width:10%"></colgroup><thead><tr style="background:#f0f0f0;"><th style="border:1px solid #000;padding:5px 8px;">N.</th><th style="border:1px solid #000;padding:5px 8px;">Cognome</th><th style="border:1px solid #000;padding:5px 8px;">Nome</th><th style="border:1px solid #000;padding:5px 8px;">P</th></tr></thead><tbody>`;
  const maxRows = Math.max(list.length, 20);
  for (let i = 0; i < maxRows; i++) {
    if (i < list.length) {
      html += `<tr><td style="border:1px solid #000;padding:4px 6px;text-align:center;">${i + 1}</td><td style="border:1px solid #000;padding:4px 6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${list[i].cognome.toUpperCase()}</td><td style="border:1px solid #000;padding:4px 6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${list[i].nome}</td><td style="border:1px solid #000;padding:4px 6px;text-align:center;">${list[i].ruolo === 'Portiere' ? 'P' : ''}</td></tr>`;
    } else {
      html += `<tr><td style="border:1px solid #000;padding:4px 6px;text-align:center;">${i + 1}</td><td style="border:1px solid #000;padding:4px 6px;"></td><td style="border:1px solid #000;padding:4px 6px;"></td><td style="border:1px solid #000;padding:4px 6px;"></td></tr>`;
    }
  }
  html += '</tbody></table></div><div class="note">Eventuali assenze vanno comunicate tempestivamente. Si raccomanda il rispetto dell\'orario di convocazione.</div><div class="firma">Il Mister</div>';

  const footer = '<button class="btn btn-secondary" id="modalCancel">Chiudi</button><button class="btn btn-primary" id="printFromPreview">🖨️ Stampa</button>';
  const mobileStyles = `<style>
    @media (max-width:600px) {
      #convPreviewInner .list-table td, #convPreviewInner .list-table th { padding:3px 4px; font-size:12px; }
      #convPreviewInner .info { font-size:12px; }
      #convPreviewInner .t1 { font-size:18px; }
      #convPreviewInner .t2 { font-size:13px; }
      #convPreviewInner .note { font-size:10px; }
      #convPreviewInner img { height:50px !important; }
    }
  </style>`;
  const modal = createModal('📄 Convocazione', mobileStyles + '<div id="convPreviewInner">' + html + '</div>', footer, '900px');
  document.getElementById('printFromPreview').addEventListener('click', () => {
    const el = document.getElementById('convPreviewInner');
    if (el) {
      const printStyles = '<style>@page{margin:15mm;size:A4 portrait}body{font-family:Arial,sans-serif;background:white!important;}img{print-color-adjust:exact;-webkit-print-color-adjust:exact}.t1{text-align:center;font-size:22px;font-weight:bold;margin-bottom:2mm;}.t2{text-align:center;font-size:16px;font-weight:bold;margin-bottom:1mm;}.t3{text-align:center;font-size:14px;font-weight:bold;margin-bottom:3mm;}.info{font-size:13px;margin-bottom:4mm;line-height:1.7;}.list-table{width:100%;border-collapse:collapse;margin-bottom:1mm;page-break-inside:avoid;}.list-table td,.list-table th{padding:3px 6px;font-size:12px;border:1px solid #000;}.note{font-weight:bold;font-style:italic;font-size:11px;margin-top:1mm;text-align:center;color:#E74C3C;}.firma{margin-top:6mm;text-align:right;font-size:14px;font-weight:bold;}</style>';
      printHTML(printStyles + el.innerHTML, 'Convocazione');
    }
  });
}

function createModal(title, content, footer, maxW = '600px') {
  const existing = document.getElementById('currentModal');
  if (existing) existing.remove();
  const modal = document.createElement('div');
  modal.className = 'modal-overlay'; modal.id = 'currentModal';
  modal.innerHTML = '<div class="modal-content" style="max-width:' + maxW + ';"><div class="modal-header"><h2>' + title + '</h2><button class="modal-close-btn" id="modalCloseX">×</button></div><div class="modal-body">' + content + '</div>' + (footer ? '<div class="modal-footer">' + footer + '</div>' : '') + '</div>';
  document.body.appendChild(modal);
  const close = () => { const m = document.getElementById('currentModal'); if (m) m.remove(); };
  document.getElementById('modalCloseX').addEventListener('click', close);
  const cancelBtn = document.getElementById('modalCancel');
  if (cancelBtn) cancelBtn.addEventListener('click', close);
  return { modal, closeModal: close, close };
}
