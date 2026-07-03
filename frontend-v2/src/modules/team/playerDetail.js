import { apiFetch } from '../../services/api.js';
import { formatDateShort, getAvatarColor } from '../../utils/formatters.js';
import { showLoading, hideLoading } from '../../utils/ui.js';

export async function loadPlayerDetail(container, playerId) {
  if (!container) {
    console.error('Container non trovato per loadPlayerDetail');
    return;
  }

  showLoading('Caricamento scheda giocatore...');

  try {
    let player;
    let currentSeasonStats = null;
    let career = [];
    let lastMatches = [];
    let valutazioni = null;
    let allSquadre = [];

    // Carica dati dal backend
    player = await apiFetch('/calciatori/' + playerId + '?squadraId=' + window.YFM.squadraId);

    try {
      currentSeasonStats = await apiFetch('/calciatori/' + playerId + '/stats-current');
    } catch (e) {
      currentSeasonStats = null;
    }

    try {
      career = await apiFetch('/calciatori/' + playerId + '/career');
    } catch (e) {
      career = [];
    }

    try {
      lastMatches = await apiFetch('/calciatori/' + playerId + '/last-matches?limit=10');
    } catch (e) {
      lastMatches = [];
    }

    try {
      valutazioni = await apiFetch('/giocatori/' + playerId + '/valutazioni');
    } catch (e) {
      valutazioni = null;
    }

    try {
      allSquadre = await apiFetch('/squadre');
    } catch (e) {
      allSquadre = [];
    }

    hideLoading();
    renderPlayerDetail(container, { player, currentSeasonStats, career, lastMatches, valutazioni, allSquadre });
  } catch (e) {
    console.error(e);
    hideLoading();
    container.innerHTML = '<div class="error-box">Errore: ' + (e.message || 'errore sconosciuto') + '</div>';
  }
}

function renderPlayerDetail(container, data) {
  const { player, currentSeasonStats, career, lastMatches, valutazioni, allSquadre } = data;

  if (!player) {
    container.innerHTML = '<div class="error-box">Giocatore non trovato.</div>';
    return;
  }

  const isAdmin = window.YFM?.isAdmin?.() || false;
  const nome = player.nome || '';
  const cognome = player.cognome || '';
  const initials = (nome[0] || '') + (cognome[0] || '');
  const ruolo = player.ruolo || '-';
  const numero = player.numero_maglia != null ? player.numero_maglia : '';
  const piede = player.piede_preferito || 'n/d';
  const dataMorte = player.data_nascita ? safeFormatDate(player.data_nascita) : 'n/d';
  const certificato = player.data_visita_medica ? safeFormatDate(player.data_visita_medica) : 'n/d';
  const stato = player.stato || 'attivo';
  const peso = player.peso || '-';
  const altezza = player.altezza || '-';
  const telefono = player.telefono || '-';
  const tipoDoc = player.tipo_documento || '-';
  const numDoc = player.numero_documento || '-';
  const rilasciatoDa = player.rilasciato_da || '-';
  const matricolaFigc = player.matricola_figc || '-';

  const stagioneCorrente = (currentSeasonStats && currentSeasonStats.stagione) || '-';
  const partite = (currentSeasonStats && currentSeasonStats.partite_giocate) || 0;
  const minuti = (currentSeasonStats && currentSeasonStats.minuti) || 0;
  const gol = (currentSeasonStats && currentSeasonStats.gol) || 0;
  const assist = (currentSeasonStats && currentSeasonStats.assist) || 0;

  // Sezione valutazioni
  const valutazioniSection = valutazioni && valutazioni.partiteValutate > 0 ? `
    <div class="card" style="background:linear-gradient(135deg,#667eea10,#764ba210);border:1px solid #667eea30;">
      <h3 class="section-title" style="color:#667eea;">⭐ Valutazioni</h3>
      <div style="display:flex;gap:20px;align-items:center;flex-wrap:wrap;">
        <div style="text-align:center;">
          <div style="font-size:32px;font-weight:bold;color:#667eea;">${valutazioni.media}</div>
          <div style="font-size:11px;color:#666;">Media Voto</div>
        </div>
        <div style="flex:1;">
          <div style="font-size:12px;color:#666;margin-bottom:4px;">${valutazioni.partiteValutate} partite valutate</div>
          ${valutazioni.migliore ? '<div style="font-size:12px;">🏆 Migliore: <strong>' + valutazioni.migliore.voto + '</strong> vs ' + valutazioni.migliore.avversario + '</div>' : ''}
          ${valutazioni.peggiore ? '<div style="font-size:12px;">📉 Peggiore: <strong>' + valutazioni.peggiore.voto + '</strong> vs ' + valutazioni.peggiore.avversario + '</div>' : ''}
        </div>
      </div>
      ${valutazioni.storico && valutazioni.storico.length > 0 ? `
      <div style="margin-top:12px;padding-top:12px;border-top:1px solid #eee;">
        <div style="font-size:11px;color:#888;margin-bottom:6px;">STORICO VALUTAZIONI</div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;">
          ${valutazioni.storico.slice(0, 8).map(v => `<span style="padding:4px 10px;background:white;border-radius:12px;font-size:12px;border:1px solid #eee;"><strong>${v.voto}</strong> ${v.partita ? '(' + v.partita + ')' : ''}</span>`).join('')}
        </div>
      </div>` : ''}
    </div>` : '';

  // Sezione carriera
  const careerRows = (career || []).map(s => `
    <tr>
      <td style="padding:8px;">${s.stagione || '-'}</td>
      <td style="padding:8px;text-align:center;">${s.squadra || '-'}</td>
      <td style="padding:8px;text-align:center;">${s.partite || 0}</td>
      <td style="padding:8px;text-align:center;">${s.minuti || 0}</td>
      <td style="padding:8px;text-align:center;color:#27AE60;font-weight:600;">${s.gol || 0}</td>
      <td style="padding:8px;text-align:center;color:#2980B9;font-weight:600;">${s.assist || 0}</td>
    </tr>`).join('');

  const careerSection = career && career.length ? `
    <div class="card">
      <h3 class="section-title">Carriera</h3>
      <div style="overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead><tr style="background:#F8F9FA;">
            <th style="padding:8px;text-align:left;">Stagione</th>
            <th style="padding:8px;">Squadra</th>
            <th style="padding:8px;">Partite</th>
            <th style="padding:8px;">Minuti</th>
            <th style="padding:8px;">Gol</th>
            <th style="padding:8px;">Assist</th>
          </tr></thead>
          <tbody>${careerRows}</tbody>
        </table>
      </div>
    </div>` : '<div class="card"><h3 class="section-title">Carriera</h3><p style="color:var(--gray);">Nessun dato carriera disponibile.</p></div>';

  // Sezione ultime partite
  const matchRows = (lastMatches || []).map(m => `
    <tr>
      <td style="padding:8px;">${safeFormatDate(m.data_ora)}</td>
      <td style="padding:8px;">${m.avversario || '-'}</td>
      <td style="padding:8px;text-align:center;">${m.competizione || '-'}</td>
      <td style="padding:8px;text-align:center;">${m.minuti || 0}</td>
      <td style="padding:8px;text-align:center;color:#27AE60;">${m.gol || 0}</td>
      <td style="padding:8px;text-align:center;color:#2980B9;">${m.assist || 0}</td>
      <td style="padding:8px;text-align:center;color:#E74C3C;">${m.cartellini_gialli || 0}/${m.cartellini_rossi || 0}</td>
    </tr>`).join('');

  const lastMatchesSection = lastMatches && lastMatches.length ? `
    <div class="card" style="margin-top:20px;">
      <h3 class="section-title">Ultime partite</h3>
      <div style="overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead><tr style="background:#F8F9FA;">
            <th style="padding:8px;">Data</th>
            <th style="padding:8px;">Avversario</th>
            <th style="padding:8px;">Competizione</th>
            <th style="padding:8px;">Min</th>
            <th style="padding:8px;">Gol</th>
            <th style="padding:8px;">Assist</th>
            <th style="padding:8px;">Gialli/Rossi</th>
          </tr></thead>
          <tbody>${matchRows}</tbody>
        </table>
      </div>
    </div>` : '';

  // Costruisci i pulsanti azione per Admin
  const adminActions = isAdmin ? `
    <div class="card" style="margin-bottom:20px;border:2px solid #667eea30;background:linear-gradient(135deg,#667eea08,#764ba208);">
      <h3 class="section-title" style="color:#667eea;margin-bottom:12px;">⚙️ Azioni Admin</h3>
      <div style="display:flex;flex-wrap:wrap;gap:10px;">
        <button class="btn btn-primary" id="btnEditInline" style="background:#667eea;">
          ✏️ Modifica Dati
        </button>
        <button class="btn btn-secondary" id="btnMovePlayer" style="border-color:#667eea;color:#667eea;">
          ↗️ Sposta Categoria
        </button>
        <button class="btn btn-danger" id="btnDeletePlayer" style="background:#E74C3C;">
          🗑️ Elimina
        </button>
      </div>
    </div>
  ` : '';

  // Sezione dati anagrafici
  const datiAnagrafici = `
    <div class="card" style="margin-bottom:20px;">
      <h3 class="section-title">📋 Dati Giocatore</h3>
      <div id="playerDataView" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;">
        <div><span style="font-size:12px;color:#888;">Nome</span><div style="font-size:14px;font-weight:500;">${nome}</div></div>
        <div><span style="font-size:12px;color:#888;">Cognome</span><div style="font-size:14px;font-weight:500;">${cognome}</div></div>
        <div><span style="font-size:12px;color:#888;">Data di Nascita</span><div style="font-size:14px;">${dataMorte}</div></div>
        <div><span style="font-size:12px;color:#888;">Ruolo</span><div style="font-size:14px;">${ruolo}</div></div>
        <div><span style="font-size:12px;color:#888;">N. Maglia</span><div style="font-size:14px;">#${numero}</div></div>
        <div><span style="font-size:12px;color:#888;">Piede Preferito</span><div style="font-size:14px;">${piede}</div></div>
        <div><span style="font-size:12px;color:#888;">Peso (kg)</span><div style="font-size:14px;">${peso}</div></div>
        <div><span style="font-size:12px;color:#888;">Altezza (cm)</span><div style="font-size:14px;">${altezza}</div></div>
        <div><span style="font-size:12px;color:#888;">Telefono</span><div style="font-size:14px;">${telefono}</div></div>
        <div><span style="font-size:12px;color:#888;">Tipo Documento</span><div style="font-size:14px;">${tipoDoc}</div></div>
        <div><span style="font-size:12px;color:#888;">N. Documento</span><div style="font-size:14px;">${numDoc}</div></div>
        <div><span style="font-size:12px;color:#888;">Rilasciato Da</span><div style="font-size:14px;">${rilasciatoDa}</div></div>
        <div><span style="font-size:12px;color:#888;">Matricola FIGC</span><div style="font-size:14px;">${matricolaFigc}</div></div>
        <div><span style="font-size:12px;color:#888;">Certificato Medico</span><div style="font-size:14px;">${certificato}</div></div>
        <div><span style="font-size:12px;color:#888;">Stato</span><div style="font-size:14px;"><span class="badge ${stato === 'Attivo' ? 'badge-green' : 'badge-red'}">${stato}</span></div></div>
      </div>
      <div id="playerDataEdit" style="display:none;">
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;">
          <div class="form-group"><label style="font-size:12px;font-weight:600;color:#666;">Nome</label><input id="editNome" value="${nome}" style="padding:8px;border:1px solid #ddd;border-radius:6px;width:100%;"></div>
          <div class="form-group"><label style="font-size:12px;font-weight:600;color:#666;">Cognome</label><input id="editCognome" value="${cognome}" style="padding:8px;border:1px solid #ddd;border-radius:6px;width:100%;"></div>
          <div class="form-group"><label style="font-size:12px;font-weight:600;color:#666;">Data Nascita</label><input id="editDataNas" type="date" value="${player.data_nascita ? player.data_nascita.split('T')[0] : ''}" style="padding:8px;border:1px solid #ddd;border-radius:6px;width:100%;"></div>
          <div class="form-group"><label style="font-size:12px;font-weight:600;color:#666;">Ruolo</label><select id="editRuolo" style="padding:8px;border:1px solid #ddd;border-radius:6px;width:100%;"><option value="" ${!ruolo || ruolo === '-' ? 'selected' : ''}>-- Seleziona --</option><option value="Portiere" ${ruolo === 'Portiere' ? 'selected' : ''}>Portiere</option><option value="Difensore" ${ruolo === 'Difensore' ? 'selected' : ''}>Difensore</option><option value="Centrocampista" ${ruolo === 'Centrocampista' ? 'selected' : ''}>Centrocampista</option><option value="Attaccante" ${ruolo === 'Attaccante' ? 'selected' : ''}>Attaccante</option></select></div>
          <div class="form-group"><label style="font-size:12px;font-weight:600;color:#666;">N. Maglia</label><input id="editNumMaglia" type="number" value="${numero}" style="padding:8px;border:1px solid #ddd;border-radius:6px;width:100%;"></div>
          <div class="form-group"><label style="font-size:12px;font-weight:600;color:#666;">Piede Preferito</label><select id="editPiede" style="padding:8px;border:1px solid #ddd;border-radius:6px;width:100%;"><option value="" ${!player.piede_preferito ? 'selected' : ''}>-- Seleziona --</option><option value="Destro" ${player.piede_preferito === 'Destro' ? 'selected' : ''}>Destro</option><option value="Sinistro" ${player.piede_preferito === 'Sinistro' ? 'selected' : ''}>Sinistro</option><option value="Ambidestro" ${player.piede_preferito === 'Ambidestro' ? 'selected' : ''}>Ambidestro</option></select></div>
          <div class="form-group"><label style="font-size:12px;font-weight:600;color:#666;">Peso (kg)</label><input id="editPeso" type="number" value="${peso !== '-' ? peso : ''}" style="padding:8px;border:1px solid #ddd;border-radius:6px;width:100%;"></div>
          <div class="form-group"><label style="font-size:12px;font-weight:600;color:#666;">Altezza (cm)</label><input id="editAltezza" type="number" value="${altezza !== '-' ? altezza : ''}" style="padding:8px;border:1px solid #ddd;border-radius:6px;width:100%;"></div>
          <div class="form-group"><label style="font-size:12px;font-weight:600;color:#666;">Telefono</label><input id="editTelefono" value="${telefono !== '-' ? telefono : ''}" style="padding:8px;border:1px solid #ddd;border-radius:6px;width:100%;"></div>
          <div class="form-group"><label style="font-size:12px;font-weight:600;color:#666;">Stato</label><select id="editStato" style="padding:8px;border:1px solid #ddd;border-radius:6px;width:100%;"><option value="Attivo" ${stato === 'Attivo' ? 'selected' : ''}>Attivo</option><option value="Infortunato" ${stato === 'Infortunato' ? 'selected' : ''}>Infortunato</option></select></div>
          <div class="form-group"><label style="font-size:12px;font-weight:600;color:#666;">Data Visita Medica</label><input id="editCertificato" type="date" value="${player.data_visita_medica ? player.data_visita_medica.split('T')[0] : ''}" style="padding:8px;border:1px solid #ddd;border-radius:6px;width:100%;"></div>
          <div class="form-group"><label style="font-size:12px;font-weight:600;color:#666;">Matricola FIGC</label><input id="editMatricola" value="${matricolaFigc !== '-' ? matricolaFigc : ''}" style="padding:8px;border:1px solid #ddd;border-radius:6px;width:100%;"></div>
          <div class="form-group"><label style="font-size:12px;font-weight:600;color:#666;">Tipo Documento</label><input id="editTipoDoc" value="${tipoDoc !== '-' ? tipoDoc : ''}" style="padding:8px;border:1px solid #ddd;border-radius:6px;width:100%;"></div>
          <div class="form-group"><label style="font-size:12px;font-weight:600;color:#666;">N. Documento</label><input id="editNumDoc" value="${numDoc !== '-' ? numDoc : ''}" style="padding:8px;border:1px solid #ddd;border-radius:6px;width:100%;"></div>
          <div class="form-group" style="grid-column:1/-1;"><label style="font-size:12px;font-weight:600;color:#666;">Rilasciato Da</label><input id="editRilasciatoDa" value="${rilasciatoDa !== '-' ? rilasciatoDa : ''}" style="padding:8px;border:1px solid #ddd;border-radius:6px;width:100%;"></div>
        </div>
        <div style="display:flex;gap:10px;margin-top:16px;justify-content:flex-end;">
          <button class="btn btn-secondary" id="btnCancelEdit">Annulla</button>
          <button class="btn btn-primary" id="btnSaveEdit" style="background:#667eea;">💾 Salva Modifiche</button>
        </div>
      </div>
    </div>
  `;

  container.innerHTML = `
    <div class="page-header" style="display:flex;justify-content:space-between;align-items:center;gap:12px;">
      <div>
        <button class="btn btn-secondary btn-small" id="btnBackRoster">← Torna alla rosa</button>
      </div>
    </div>
    <h1 class="page-title" style="margin-top:12px;">${nome} ${cognome}</h1>
    <p class="page-subtitle">${ruolo} • N° ${numero} • ${dataMorte} • piede ${piede}</p>
    ${adminActions}
    ${datiAnagrafici}
    <div class="grid-2" style="margin-bottom:20px;">
      <div class="card" style="display:flex;align-items:center;gap:16px;">
        <div class="player-avatar" style="width:64px;height:64px;font-size:24px;background:${getAvatarColor(nome)};">${initials.toUpperCase()}</div>
        <div style="flex:1;">
          <div style="font-size:14px;color:var(--gray);margin-bottom:4px;">Stagione ${stagioneCorrente}</div>
          <div style="display:flex;flex-wrap:wrap;gap:12px;font-size:13px;">
            <div><strong>${partite}</strong> partite</div>
            <div><strong>${minuti}</strong> minuti</div>
            <div style="color:#27AE60;"><strong>${gol}</strong> gol</div>
            <div style="color:#2980B9;"><strong>${assist}</strong> assist</div>
          </div>
        </div>
      </div>
    </div>
    ${valutazioniSection}
    ${careerSection}
    ${lastMatchesSection}
  `;

  // Event Listeners
  document.getElementById('btnBackRoster')?.addEventListener('click', () => {
    if (window.YFM?.navigateTo) window.YFM.navigateTo('roster');
    else if (window.navigateTo) window.navigateTo('roster');
  });

  if (isAdmin) {
    // Modifica inline
    document.getElementById('btnEditInline')?.addEventListener('click', () => {
      document.getElementById('playerDataView').style.display = 'none';
      document.getElementById('playerDataEdit').style.display = 'block';
    });

    document.getElementById('btnCancelEdit')?.addEventListener('click', () => {
      document.getElementById('playerDataView').style.display = 'grid';
      document.getElementById('playerDataEdit').style.display = 'none';
    });

    document.getElementById('btnSaveEdit')?.addEventListener('click', async () => {
      const capName = s => s ? s.trim().replace(/\s+/g, ' ').replace(/\b\w+/g, w => w[0].toUpperCase() + w.slice(1).toLowerCase()) : '';
      const nome = capName(document.getElementById('editNome').value);
      const cognome = capName(document.getElementById('editCognome').value);
      if (!nome || !cognome) { alert('Nome e Cognome sono obbligatori'); return; }
      const dataNascita = document.getElementById('editDataNas').value || null;
      // Validazione anno nascita
      if (dataNascita) {
        const year = parseInt(dataNascita.split('-')[0]);
        const squadra = window.YFM.getSquadra();
        const annoDa = squadra?.category?.anno_da;
        if (annoDa && (year < annoDa || year > annoDa + 2)) {
          alert(`Anno di nascita ${year} non compatibile con ${squadra.category.nome} (${annoDa}-${annoDa + 2})`);
          return;
        }
      }
      const d = {
        nome,
        cognome,
        data_nascita: dataNascita,
        ruolo: document.getElementById('editRuolo').value,
        numero_maglia: document.getElementById('editNumMaglia').value ? parseInt(document.getElementById('editNumMaglia').value) : null,
        piede_preferito: document.getElementById('editPiede').value || null,
        peso: document.getElementById('editPeso').value ? parseFloat(document.getElementById('editPeso').value) : null,
        altezza: document.getElementById('editAltezza').value ? parseInt(document.getElementById('editAltezza').value) : null,
        telefono: document.getElementById('editTelefono').value,
        stato: document.getElementById('editStato').value,
        data_visita_medica: document.getElementById('editCertificato').value,
        matricola_figc: document.getElementById('editMatricola').value,
        tipo_documento: document.getElementById('editTipoDoc').value,
        numero_documento: document.getElementById('editNumDoc').value,
        rilasciato_da: document.getElementById('editRilasciatoDa').value
      };
      showLoading('Salvataggio...');
      try {
        await apiFetch('/calciatori/' + player.id, { method: 'PUT', body: JSON.stringify(d) });
        // Ricarica la scheda
        loadPlayerDetail(container, player.id);
      } catch (e) {
        alert('Errore: ' + e.message);
      } finally {
        hideLoading();
      }
    });

    // Sposta
    document.getElementById('btnMovePlayer')?.addEventListener('click', () => {
      openMoveModalPlayer(player.id, player.nome + ' ' + player.cognome, allSquadre);
    });

    // Elimina
    document.getElementById('btnDeletePlayer')?.addEventListener('click', () => {
      if (confirm('Eliminare questo giocatore dalla rosa?')) {
        deletePlayer(player.id);
      }
    });
  }
}

// Funzioni per sposta ed elimina
async function deletePlayer(playerId) {
  showLoading();
  try {
    await apiFetch('/squadre/' + window.YFM.squadraId + '/calciatori/' + playerId, { method: 'DELETE' });
    if (window.YFM?.navigateTo) window.YFM.navigateTo('roster');
    else if (window.navigateTo) window.navigateTo('roster');
  } catch (e) {
    alert('Errore: ' + e.message);
  } finally {
    hideLoading();
  }
}

function openMoveModalPlayer(playerId, playerName, squadre) {
  const currentSquadraId = window.YFM.squadraId;
  const otherSquadre = (squadre || []).filter(s => s.id !== currentSquadraId);
  
  if (otherSquadre.length === 0) {
    alert('Non ci sono altre categorie disponibili');
    return;
  }
  
  const modal = document.createElement('div');
  modal.style = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:1000;';
  modal.innerHTML = '<div style="background:white;border-radius:12px;max-width:400px;width:90%;"><div style="padding:16px 20px;border-bottom:1px solid #eee;display:flex;justify-content:space-between;align-items:center;"><h2 style="margin:0;">↗️ Sposta Giocatore</h2><button id="moveModalClose" style="background:none;border:none;font-size:24px;cursor:pointer;">×</button></div><div style="padding:20px;"><p style="margin-bottom:12px;"><strong>' + playerName + '</strong></p><div style="display:flex;flex-direction:column;gap:4px;"><label style="font-size:12px;font-weight:600;color:#666;">Sposta nella categoria:</label><select id="targetSquadra" style="padding:8px 12px;border:1px solid #ddd;border-radius:6px;font-size:14px;width:100%;">' + otherSquadre.map(s => '<option value="' + s.id + '">' + (s.category?.nome || s.nome) + '</option>').join('') + '</select></div></div><div style="padding:16px 20px;border-top:1px solid #eee;display:flex;justify-content:flex-end;gap:12px;"><button id="moveModalCancel" class="btn btn-secondary" style="padding:10px 16px;">Annulla</button><button id="confirmMoveBtn" class="btn btn-primary" style="padding:10px 16px;background:#667eea;color:white;border:none;">Sposta</button></div></div>';
  document.body.appendChild(modal);
  
  document.getElementById('moveModalClose').addEventListener('click', () => modal.remove());
  document.getElementById('moveModalCancel').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
  
  document.getElementById('confirmMoveBtn').addEventListener('click', async () => {
    const targetSquadraId = document.getElementById('targetSquadra').value;
    showLoading();
    try {
      await apiFetch('/calciatori/' + playerId + '/move', {
        method: 'POST',
        body: JSON.stringify({ fromSquadraId: currentSquadraId, toSquadraId: targetSquadraId })
      });
      modal.remove();
      if (window.YFM?.navigateTo) window.YFM.navigateTo('roster');
      else if (window.navigateTo) window.navigateTo('roster');
    } catch (e) {
      alert('Errore: ' + e.message);
    } finally {
      hideLoading();
    }
  });
}

function safeFormatDate(value) {
  if (!value) return 'n/d';
  try {
    return formatDateShort(value);
  } catch (e) {
    return 'n/d';
  }
}

// Modalità creazione nuovo giocatore — stessa UI del dettaglio
export function loadNewPlayerForm(container) {
  if (!container) return;
  const isAdmin = window.YFM?.isAdmin?.() || false;
  if (!isAdmin) return;

  container.innerHTML = `
    <div class="page-header" style="display:flex;justify-content:space-between;align-items:center;gap:12px;">
      <button class="btn btn-secondary btn-small" id="btnBackRoster">← Torna alla rosa</button>
    </div>
    <h1 class="page-title" style="margin-top:12px;">Nuovo Calciatore</h1>
    <p class="page-subtitle">${window.YFM.getSquadraName()}</p>
    <div class="card" style="margin-top:20px;">
      <h3 class="section-title">📋 Dati Giocatore</h3>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;">
        <div class="form-group"><label style="font-size:12px;font-weight:600;color:#666;">Nome *</label><input id="editNome" value="" style="padding:8px;border:1px solid #ddd;border-radius:6px;width:100%;"></div>
        <div class="form-group"><label style="font-size:12px;font-weight:600;color:#666;">Cognome *</label><input id="editCognome" value="" style="padding:8px;border:1px solid #ddd;border-radius:6px;width:100%;"></div>
        <div class="form-group"><label style="font-size:12px;font-weight:600;color:#666;">Data Nascita</label><input id="editDataNas" type="date" value="" style="padding:8px;border:1px solid #ddd;border-radius:6px;width:100%;"></div>
        <div class="form-group"><label style="font-size:12px;font-weight:600;color:#666;">Ruolo</label><select id="editRuolo" style="padding:8px;border:1px solid #ddd;border-radius:6px;width:100%;"><option value="">-- Seleziona --</option><option value="Portiere">Portiere</option><option value="Difensore">Difensore</option><option value="Centrocampista">Centrocampista</option><option value="Attaccante">Attaccante</option></select></div>
        <div class="form-group"><label style="font-size:12px;font-weight:600;color:#666;">N. Maglia</label><input id="editNumMaglia" type="number" value="" style="padding:8px;border:1px solid #ddd;border-radius:6px;width:100%;"></div>
        <div class="form-group"><label style="font-size:12px;font-weight:600;color:#666;">Piede Preferito</label><select id="editPiede" style="padding:8px;border:1px solid #ddd;border-radius:6px;width:100%;"><option value="">-- Seleziona --</option><option value="Destro">Destro</option><option value="Sinistro">Sinistro</option><option value="Ambidestro">Ambidestro</option></select></div>
        <div class="form-group"><label style="font-size:12px;font-weight:600;color:#666;">Peso (kg)</label><input id="editPeso" type="number" value="" style="padding:8px;border:1px solid #ddd;border-radius:6px;width:100%;"></div>
        <div class="form-group"><label style="font-size:12px;font-weight:600;color:#666;">Altezza (cm)</label><input id="editAltezza" type="number" value="" style="padding:8px;border:1px solid #ddd;border-radius:6px;width:100%;"></div>
        <div class="form-group"><label style="font-size:12px;font-weight:600;color:#666;">Telefono</label><input id="editTelefono" value="" style="padding:8px;border:1px solid #ddd;border-radius:6px;width:100%;"></div>
        <div class="form-group"><label style="font-size:12px;font-weight:600;color:#666;">Stato</label><select id="editStato" style="padding:8px;border:1px solid #ddd;border-radius:6px;width:100%;"><option value="Attivo" selected>Attivo</option><option value="Infortunato">Infortunato</option></select></div>
        <div class="form-group"><label style="font-size:12px;font-weight:600;color:#666;">Data Visita Medica</label><input id="editCertificato" type="date" value="" style="padding:8px;border:1px solid #ddd;border-radius:6px;width:100%;"></div>
        <div class="form-group"><label style="font-size:12px;font-weight:600;color:#666;">Matricola FIGC</label><input id="editMatricola" value="" style="padding:8px;border:1px solid #ddd;border-radius:6px;width:100%;"></div>
        <div class="form-group"><label style="font-size:12px;font-weight:600;color:#666;">Tipo Documento</label><input id="editTipoDoc" value="" style="padding:8px;border:1px solid #ddd;border-radius:6px;width:100%;"></div>
        <div class="form-group"><label style="font-size:12px;font-weight:600;color:#666;">N. Documento</label><input id="editNumDoc" value="" style="padding:8px;border:1px solid #ddd;border-radius:6px;width:100%;"></div>
        <div class="form-group" style="grid-column:1/-1;"><label style="font-size:12px;font-weight:600;color:#666;">Rilasciato Da</label><input id="editRilasciatoDa" value="" style="padding:8px;border:1px solid #ddd;border-radius:6px;width:100%;"></div>
      </div>
      <div style="display:flex;gap:10px;margin-top:16px;justify-content:flex-end;">
        <button class="btn btn-secondary" id="btnCancelNew">Annulla</button>
        <button class="btn btn-primary" id="btnSaveNew" style="background:#667eea;">💾 Crea Giocatore</button>
      </div>
    </div>
  `;

  document.getElementById('btnBackRoster').addEventListener('click', () => window.YFM.navigateTo('roster'));
  document.getElementById('btnCancelNew').addEventListener('click', () => window.YFM.navigateTo('roster'));

  document.getElementById('btnSaveNew').addEventListener('click', async () => {
    const capName = s => s ? s.trim().replace(/\s+/g, ' ').replace(/\b\w+/g, w => w[0].toUpperCase() + w.slice(1).toLowerCase()) : '';
    const nome = capName(document.getElementById('editNome').value);
    const cognome = capName(document.getElementById('editCognome').value);
    if (!nome || !cognome) { alert('Nome e Cognome sono obbligatori'); return; }
    const dataNascita = document.getElementById('editDataNas').value || null;
    if (dataNascita) {
      const year = parseInt(dataNascita.split('-')[0]);
      const squadra = window.YFM.getSquadra();
      const annoDa = squadra?.category?.anno_da;
      if (annoDa && (year < annoDa || year > annoDa + 2)) {
        alert(`Anno di nascita ${year} non compatibile con ${squadra.category.nome} (${annoDa}-${annoDa + 2})`);
        return;
      }
    }
    const d = {
      nome, cognome, data_nascita: dataNascita,
      ruolo: document.getElementById('editRuolo').value || null,
      numero_maglia: document.getElementById('editNumMaglia').value ? parseInt(document.getElementById('editNumMaglia').value) : null,
      piede_preferito: document.getElementById('editPiede').value || null,
      peso: document.getElementById('editPeso').value ? parseFloat(document.getElementById('editPeso').value) : null,
      altezza: document.getElementById('editAltezza').value ? parseInt(document.getElementById('editAltezza').value) : null,
      telefono: document.getElementById('editTelefono').value || null,
      stato: document.getElementById('editStato').value,
      data_visita_medica: document.getElementById('editCertificato').value || null,
      matricola_figc: document.getElementById('editMatricola').value || null,
      tipo_documento: document.getElementById('editTipoDoc').value || null,
      numero_documento: document.getElementById('editNumDoc').value || null,
      rilasciato_da: document.getElementById('editRilasciatoDa').value || null
    };
    showLoading('Creazione...');
    try {
      await apiFetch('/squadre/' + window.YFM.squadraId + '/calciatori', { method: 'POST', body: JSON.stringify(d) });
      window.YFM.navigateTo('roster');
    } catch (e) {
      alert('Errore: ' + e.message);
    } finally {
      hideLoading();
    }
  });
}
