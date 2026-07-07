import { apiFetch } from '../../services/api.js';
import { formatDateShort } from '../../utils/formatters.js';
import { showLoading, hideLoading } from '../../utils/ui.js';
import { calcolaCodiceFiscale, cercaComune } from '../../utils/codiceFiscale.js';

export async function loadPlayerDetail(container, playerId) {
  if (!container) {
    console.error('Container non trovato per loadPlayerDetail');
    return;
  }

  showLoading('Caricamento scheda giocatore...');

  try {
    let player;
    let career = [];
    let lastMatches = [];
    let valutazioni = null;
    let allSquadre = [];

    // Carica dati dal backend
    player = await apiFetch('/calciatori/' + playerId + '?squadraId=' + window.YFM.squadraId);

    try {
      career = await apiFetch('/calciatori/' + playerId + '/career');
    } catch (e) {
      career = [];
    }

    try {
      lastMatches = await apiFetch('/calciatori/' + playerId + '/last-matches?limit=10&squadraId=' + window.YFM.squadraId);
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

    let injuries = [];
    try {
      injuries = await apiFetch('/players/' + playerId + '/injuries');
    } catch (e) {
      injuries = [];
    }

    hideLoading();
    renderPlayerDetail(container, { player, career, lastMatches, valutazioni, allSquadre, injuries });
  } catch (e) {
    console.error(e);
    hideLoading();
    container.innerHTML = '<div class="error-box">Errore: ' + (e.message || 'errore sconosciuto') + '</div>';
  }
}

function renderPlayerDetail(container, data) {
  const { player, career, lastMatches, valutazioni, allSquadre, injuries } = data;

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



  // Sezione valutazioni
  const valutazioniSection = valutazioni && valutazioni.partiteValutate > 0 ? `
    <div class="card" data-help="player.valutazioni" style="background:linear-gradient(135deg,#667eea10,#764ba210);border:1px solid #667eea30;">
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
  // Sezione infortuni
  const injuriesSection = `
    <div class="card" style="margin-top:20px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <h3 class="section-title" style="margin:0;">🏥 Infortuni</h3>
        ${isAdmin ? '<button class="btn btn-primary" id="btnAddInjury" style="font-size:12px;padding:6px 12px;">+ Aggiungi</button>' : ''}
      </div>
      ${(injuries || []).length > 0 ? `
      <div style="overflow-x:auto;-webkit-overflow-scrolling:touch;">
        <table class="pd-table" style="width:100%;border-collapse:collapse;font-size:12px;white-space:nowrap;">
          <thead><tr style="background:#F8F9FA;">
            <th style="padding:6px 4px;text-align:left;">Tipo</th>
            <th style="padding:6px 4px;">Inizio</th>
            <th style="padding:6px 4px;">Rientro</th>
            <th style="padding:6px 4px;">Effettivo</th>
            <th style="padding:6px 4px;">Grav.</th>
            ${isAdmin ? '<th style="padding:6px 4px;">Azioni</th>' : ''}
          </tr></thead>
          <tbody>${(injuries || []).map(inj => {
            const isOpen = !inj.data_rientro_effettiva;
            return `<tr style="${isOpen ? 'background:#FFF3F3;' : ''}">
              <td style="padding:6px 4px;font-weight:${isOpen ? '600' : '400'};">${inj.tipo}${isOpen ? ' <span style="color:#E74C3C;font-size:10px;">●</span>' : ''}</td>
              <td style="padding:6px 4px;text-align:center;">${safeFormatDate(inj.data_inizio)}</td>
              <td style="padding:6px 4px;text-align:center;">${inj.data_rientro_prevista ? safeFormatDate(inj.data_rientro_prevista) : '—'}</td>
              <td style="padding:6px 4px;text-align:center;">${inj.data_rientro_effettiva ? safeFormatDate(inj.data_rientro_effettiva) : '—'}</td>
              <td style="padding:6px 4px;text-align:center;"><span style="padding:2px 6px;border-radius:8px;font-size:10px;background:${inj.gravita === 'grave' ? '#FDEDEE' : inj.gravita === 'lieve' ? '#E8F8F0' : '#FFF8E1'};color:${inj.gravita === 'grave' ? '#E74C3C' : inj.gravita === 'lieve' ? '#27AE60' : '#F39C12'};">${inj.gravita || 'media'}</span></td>
              ${isAdmin ? `<td style="padding:6px 4px;text-align:center;">${isOpen ? '<button class="btn-close-injury" data-id="' + inj.id + '" style="font-size:10px;padding:3px 6px;background:#27AE60;color:white;border:none;border-radius:6px;cursor:pointer;">✅</button>' : ''} <button class="btn-del-injury" data-id="${inj.id}" style="font-size:10px;padding:3px 6px;background:#eee;border:none;border-radius:6px;cursor:pointer;">🗑️</button></td>` : ''}
            </tr>`;
          }).join('')}</tbody>
        </table>
      </div>` : '<p style="color:var(--gray);font-size:13px;">Nessun infortunio registrato.</p>'}
    </div>`;

  // Sezione carriera — raggruppata per tipo competizione
  const tipoOrder = ['Campionato', 'Coppa', 'Amichevole', 'Altro'];
  const tipoLabels = { Campionato: '🏆 Campionato', Coppa: '🏅 Coppa', Amichevole: '⚽ Amichevoli', Altro: '📋 Altro' };
  const tipoColors = { Campionato: '#667eea', Coppa: '#F39C12', Amichevole: '#27AE60', Altro: '#888' };

  function buildCareerTable(rows) {
    const totals = rows.reduce((t, s) => {
      t.partite += s.partite || 0; t.minuti += s.minuti || 0;
      t.gol += s.gol || 0; t.assist += s.assist || 0;
      t.ammonizioni += s.ammonizioni || 0; t.espulsioni += s.espulsioni || 0;
      return t;
    }, { partite: 0, minuti: 0, gol: 0, assist: 0, ammonizioni: 0, espulsioni: 0 });
    return `<div style="overflow-x:auto;-webkit-overflow-scrolling:touch;"><table class="pd-table" style="width:100%;border-collapse:collapse;font-size:12px;white-space:nowrap;">
      <thead><tr style="background:#F8F9FA;"><th style="padding:6px 4px;text-align:left;">Stagione</th><th style="padding:6px 4px;">Squadra</th><th style="padding:6px 4px;">PG</th><th style="padding:6px 4px;">Min</th><th style="padding:6px 4px;">G</th><th style="padding:6px 4px;">A</th><th style="padding:6px 4px;">🟨</th><th style="padding:6px 4px;">🟥</th></tr></thead>
      <tbody>${rows.map(s => `<tr><td style="padding:6px 4px;">${s.stagione || '-'}</td><td style="padding:6px 4px;text-align:center;">${s.squadra || '-'}</td><td style="padding:6px 4px;text-align:center;">${s.partite || 0}</td><td style="padding:6px 4px;text-align:center;">${s.minuti || 0}</td><td style="padding:6px 4px;text-align:center;color:#27AE60;font-weight:600;">${s.gol || 0}</td><td style="padding:6px 4px;text-align:center;color:#2980B9;font-weight:600;">${s.assist || 0}</td><td style="padding:6px 4px;text-align:center;color:#F39C12;">${s.ammonizioni || 0}</td><td style="padding:6px 4px;text-align:center;color:#E74C3C;">${s.espulsioni || 0}</td></tr>`).join('')}</tbody>
      <tfoot><tr style="background:#f0f4ff;font-weight:700;"><td style="padding:6px 4px;">TOT</td><td></td><td style="padding:6px 4px;text-align:center;">${totals.partite}</td><td style="padding:6px 4px;text-align:center;">${totals.minuti}</td><td style="padding:6px 4px;text-align:center;color:#27AE60;">${totals.gol}</td><td style="padding:6px 4px;text-align:center;color:#2980B9;">${totals.assist}</td><td style="padding:6px 4px;text-align:center;color:#F39C12;">${totals.ammonizioni}</td><td style="padding:6px 4px;text-align:center;color:#E74C3C;">${totals.espulsioni}</td></tr></tfoot>
    </table></div>`;
  }

  let careerSection = '';
  if (career && career.length) {
    const byTipo = {};
    (career || []).forEach(s => {
      const t = s.tipo_competizione || 'Altro';
      if (!byTipo[t]) byTipo[t] = [];
      byTipo[t].push(s);
    });
    const sections = tipoOrder.filter(t => byTipo[t]?.length).map(t => `
      <div style="margin-bottom:16px;">
        <div style="font-size:13px;font-weight:700;color:${tipoColors[t]};margin-bottom:8px;">${tipoLabels[t]}</div>
        ${buildCareerTable(byTipo[t])}
      </div>`).join('');
    careerSection = `<div class="card" data-help="player.carriera"><h3 class="section-title">Carriera</h3>${sections}</div>`;
  } else {
    careerSection = '<div class="card"><h3 class="section-title">Carriera</h3><p style="color:var(--gray);">Nessun dato carriera disponibile.</p></div>';
  }

  // Sezione ultime partite
  const matchRows = (lastMatches || []).map(m => `
    <tr>
      <td style="padding:6px 4px;">${safeFormatDate(m.data)}</td>
      <td style="padding:6px 4px;">${m.avversario || '-'}</td>
      <td style="padding:6px 4px;text-align:center;">${m.minuti || 0}</td>
      <td style="padding:6px 4px;text-align:center;color:#27AE60;">${m.gol || 0}</td>
      <td style="padding:6px 4px;text-align:center;color:#2980B9;">${m.assist || 0}</td>
      <td style="padding:6px 4px;text-align:center;">${m.cartellini_gialli ? '<span style="color:#F39C12;">' + m.cartellini_gialli + '</span>' : '0'}/${m.cartellini_rossi ? '<span style="color:#E74C3C;">' + m.cartellini_rossi + '</span>' : '0'}</td>
    </tr>`).join('');

  const lastMatchesSection = lastMatches && lastMatches.length ? `
    <div class="card" data-help="player.ultimePartite" style="margin-top:20px;">
      <h3 class="section-title">Ultime partite</h3>
      <div style="overflow-x:auto;-webkit-overflow-scrolling:touch;">
        <table class="pd-table" style="width:100%;border-collapse:collapse;font-size:12px;white-space:nowrap;">
          <thead><tr style="background:#F8F9FA;">
            <th style="padding:6px 4px;">Data</th>
            <th style="padding:6px 4px;">Avversario</th>
            <th style="padding:6px 4px;">Min</th>
            <th style="padding:6px 4px;">G</th>
            <th style="padding:6px 4px;">A</th>
            <th style="padding:6px 4px;">🟨/🟥</th>
          </tr></thead>
          <tbody>${matchRows}</tbody>
        </table>
      </div>
    </div>` : '';

  // Costruisci i pulsanti azione per Admin
  const adminActions = isAdmin ? `
    <div class="card" data-help="player.azioniAdmin" style="margin-bottom:20px;border:2px solid #667eea30;background:linear-gradient(135deg,#667eea08,#764ba208);">
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
    <div class="card" data-help="player.anagrafica" style="margin-bottom:20px;">
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
      ${(player.contatti_genitori && player.contatti_genitori.length) ? `
      <div style="margin-top:16px;">
        <span style="font-size:12px;font-weight:700;color:#667eea;">👨‍👩‍👦 CONTATTI GENITORI</span>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:8px;margin-top:8px;">
          ${player.contatti_genitori.map(c => `<div style="padding:8px 12px;background:#f8f9fa;border-radius:6px;"><span style="font-size:11px;color:#888;">${c.tipo || ''}</span><div style="font-size:14px;font-weight:500;">${c.nome || ''}</div><div style="font-size:13px;color:#667eea;">${c.telefono ? '<a href="tel:' + c.telefono + '" style="color:#667eea;text-decoration:none;">📞 ' + c.telefono + '</a>' : ''}</div></div>`).join('')}
        </div>
      </div>` : ''}
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
          <div class="form-group"><label style="font-size:12px;font-weight:600;color:#666;">Stato</label><select id="editStato" style="padding:8px;border:1px solid #ddd;border-radius:6px;width:100%;"><option value="Attivo" ${stato === 'Attivo' ? 'selected' : ''}>Attivo</option><option value="Infortunato" ${stato === 'Infortunato' ? 'selected' : ''}>Infortunato</option><option value="Svincolato" ${stato === 'Svincolato' ? 'selected' : ''}>Svincolato</option></select></div>
          <div class="form-group"><label style="font-size:12px;font-weight:600;color:#666;">Data Visita Medica</label><input id="editCertificato" type="date" value="${player.data_visita_medica ? player.data_visita_medica.split('T')[0] : ''}" style="padding:8px;border:1px solid #ddd;border-radius:6px;width:100%;"></div>
          <div class="form-group"><label style="font-size:12px;font-weight:600;color:#666;">Matricola FIGC</label><input id="editMatricola" value="${matricolaFigc !== '-' ? matricolaFigc : ''}" style="padding:8px;border:1px solid #ddd;border-radius:6px;width:100%;"></div>
          <div class="form-group"><label style="font-size:12px;font-weight:600;color:#666;">Tipo Documento</label><input id="editTipoDoc" value="${tipoDoc !== '-' ? tipoDoc : ''}" style="padding:8px;border:1px solid #ddd;border-radius:6px;width:100%;"></div>
          <div class="form-group"><label style="font-size:12px;font-weight:600;color:#666;">N. Documento</label><input id="editNumDoc" value="${numDoc !== '-' ? numDoc : ''}" style="padding:8px;border:1px solid #ddd;border-radius:6px;width:100%;"></div>
          <div class="form-group" style="grid-column:1/-1;"><label style="font-size:12px;font-weight:600;color:#666;">Rilasciato Da</label><input id="editRilasciatoDa" value="${rilasciatoDa !== '-' ? rilasciatoDa : ''}" style="padding:8px;border:1px solid #ddd;border-radius:6px;width:100%;"></div>
        </div>
        <div style="margin-top:16px;">
          <span style="font-size:12px;font-weight:700;color:#667eea;">👨‍👩‍👦 CONTATTI GENITORI</span>
          <div id="editContattiGenitori" style="margin-top:8px;"></div>
          <button type="button" id="editAddContatto" style="margin-top:8px;padding:6px 12px;border:1px dashed #667eea;background:none;color:#667eea;border-radius:6px;cursor:pointer;font-size:12px;">+ Aggiungi contatto</button>
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

    ${valutazioniSection}
    ${injuriesSection}
    ${careerSection}
    ${lastMatchesSection}
  `;

  // Event Listeners
  document.getElementById('btnBackRoster')?.addEventListener('click', () => {
    if (window.YFM?.navigateTo) window.YFM.navigateTo('roster');
    else if (window.navigateTo) window.navigateTo('roster');
  });

  // Injury handlers
  document.getElementById('btnAddInjury')?.addEventListener('click', () => {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:2000;display:flex;align-items:center;justify-content:center;';
    overlay.innerHTML = `<div style="background:white;border-radius:16px;padding:24px;max-width:360px;width:95%;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
      <div style="font-size:18px;font-weight:700;margin-bottom:16px;">🏥 Nuovo Infortunio</div>
      <div style="display:flex;flex-direction:column;gap:12px;">
        <input id="injTipo" placeholder="Tipo (es. Distorsione caviglia)" style="padding:10px;border:1px solid #ddd;border-radius:8px;">
        <input id="injInizio" type="date" value="${new Date().toISOString().split('T')[0]}" style="padding:10px;border:1px solid #ddd;border-radius:8px;">
        <input id="injRientro" type="date" placeholder="Rientro previsto" style="padding:10px;border:1px solid #ddd;border-radius:8px;">
        <select id="injGravita" style="padding:10px;border:1px solid #ddd;border-radius:8px;"><option value="lieve">Lieve</option><option value="media" selected>Media</option><option value="grave">Grave</option></select>
        <input id="injNote" placeholder="Note (opzionale)" style="padding:10px;border:1px solid #ddd;border-radius:8px;">
      </div>
      <div style="display:flex;gap:10px;margin-top:16px;">
        <button id="injCancel" class="btn btn-secondary" style="flex:1;">Annulla</button>
        <button id="injConfirm" class="btn btn-primary" style="flex:1;background:#667eea;">Salva</button>
      </div>
    </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('#injTipo').focus();
    overlay.querySelector('#injCancel').onclick = () => overlay.remove();
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    overlay.querySelector('#injConfirm').onclick = async () => {
      const tipo = overlay.querySelector('#injTipo').value.trim();
      if (!tipo) return;
      await apiFetch('/injuries', { method: 'POST', body: JSON.stringify({
        player_id: player.id, team_id: window.YFM.squadraId,
        tipo, data_inizio: overlay.querySelector('#injInizio').value,
        data_rientro_prevista: overlay.querySelector('#injRientro').value || null,
        gravita: overlay.querySelector('#injGravita').value,
        note: overlay.querySelector('#injNote').value || null
      })});
      overlay.remove();
      loadPlayerDetail(container, player.id);
    };
  });

  document.querySelectorAll('.btn-close-injury').forEach(btn => {
    btn.addEventListener('click', async () => {
      const today = new Date().toISOString().split('T')[0];
      await apiFetch('/injuries/' + btn.dataset.id, { method: 'PUT', body: JSON.stringify({ data_rientro_effettiva: today }) });
      loadPlayerDetail(container, player.id);
    });
  });

  document.querySelectorAll('.btn-del-injury').forEach(btn => {
    btn.addEventListener('click', async () => {
      await apiFetch('/injuries/' + btn.dataset.id, { method: 'DELETE' });
      loadPlayerDetail(container, player.id);
    });
  });

  // Attiva help contestuale per la scheda giocatore
  import('../../components/PageHelp.js').then(m => m.injectPageHelp('playerDetail')).catch(() => {});

  if (isAdmin) {
    // Modifica inline
    // Contatti genitori - helper
    function addContattoRowDetail(container, c = {}) {
      const row = document.createElement('div');
      row.style = 'display:grid;grid-template-columns:auto 1fr 1fr auto;gap:8px;align-items:center;margin-bottom:8px;';
      row.innerHTML = `<select class="cg-tipo" style="padding:6px;border:1px solid #ddd;border-radius:6px;font-size:12px;"><option value="Padre" ${c.tipo === 'Padre' ? 'selected' : ''}>Padre</option><option value="Madre" ${c.tipo === 'Madre' ? 'selected' : ''}>Madre</option><option value="Tutore" ${c.tipo === 'Tutore' ? 'selected' : ''}>Tutore</option></select><input class="cg-nome" placeholder="Nome" value="${c.nome || ''}" style="padding:6px 10px;border:1px solid #ddd;border-radius:6px;"><input class="cg-tel" placeholder="Cellulare" value="${c.telefono || ''}" style="padding:6px 10px;border:1px solid #ddd;border-radius:6px;"><button type="button" style="background:none;border:none;color:#E74C3C;font-size:18px;cursor:pointer;">×</button>`;
      row.querySelector('button').onclick = () => row.remove();
      container.appendChild(row);
    }

    document.getElementById('btnEditInline')?.addEventListener('click', () => {
      document.getElementById('playerDataView').style.display = 'none';
      document.getElementById('playerDataEdit').style.display = 'block';
      // Popola contatti genitori
      const cgContainer = document.getElementById('editContattiGenitori');
      if (cgContainer && !cgContainer.hasChildNodes()) {
        (player.contatti_genitori || []).forEach(c => addContattoRowDetail(cgContainer, c));
      }
    });

    document.getElementById('editAddContatto')?.addEventListener('click', () => {
      const cgContainer = document.getElementById('editContattiGenitori');
      if (cgContainer) addContattoRowDetail(cgContainer);
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
        rilasciato_da: document.getElementById('editRilasciatoDa').value,
        contatti_genitori: [...document.querySelectorAll('#editContattiGenitori > div')].map(row => {
          const tipo = row.querySelector('.cg-tipo')?.value;
          const nome = row.querySelector('.cg-nome')?.value?.trim();
          const telefono = row.querySelector('.cg-tel')?.value?.trim();
          return (nome || telefono) ? { tipo, nome, telefono } : null;
        }).filter(Boolean)
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
    document.getElementById('btnDeletePlayer')?.addEventListener('click', async () => {
      if (await confirm('Eliminare questo giocatore dalla rosa?')) {
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
  modal.innerHTML = '<div style="background:white;border-radius:12px;max-width:400px;width:90%;"><div style="padding:16px 20px;border-bottom:1px solid #eee;display:flex;justify-content:space-between;align-items:center;"><h2 style="margin:0;">↗️ Sposta Giocatore</h2><button id="moveModalClose" style="background:none;border:none;font-size:24px;cursor:pointer;">×</button></div><div style="padding:20px;"><p style="margin-bottom:12px;"><strong>' + playerName + '</strong></p><div style="display:flex;flex-direction:column;gap:4px;"><label style="font-size:12px;font-weight:600;color:#666;">Sposta nella categoria:</label><select id="targetSquadra" style="padding:8px 12px;border:1px solid #ddd;border-radius:6px;font-size:14px;width:100%;">' + otherSquadre.map(s => '<option value="' + s.id + '">' + (s.category?.nome || s.nome) + (s._stagione ? ' (' + s._stagione + ')' : '') + '</option>').join('') + '</select></div></div><div style="padding:16px 20px;border-top:1px solid #eee;display:flex;justify-content:flex-end;gap:12px;"><button id="moveModalCancel" class="btn btn-secondary" style="padding:10px 16px;">Annulla</button><button id="confirmMoveBtn" class="btn btn-primary" style="padding:10px 16px;background:#667eea;color:white;border:none;">Sposta</button></div></div>';
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
        <div class="form-group"><label style="font-size:12px;font-weight:600;color:#666;">Stato</label><select id="editStato" style="padding:8px;border:1px solid #ddd;border-radius:6px;width:100%;"><option value="Attivo" selected>Attivo</option><option value="Infortunato">Infortunato</option><option value="Svincolato">Svincolato</option></select></div>
        <div class="form-group"><label style="font-size:12px;font-weight:600;color:#666;">Data Visita Medica</label><input id="editCertificato" type="date" value="" style="padding:8px;border:1px solid #ddd;border-radius:6px;width:100%;"></div>
        <div class="form-group"><label style="font-size:12px;font-weight:600;color:#666;">Matricola FIGC</label><input id="editMatricola" value="" style="padding:8px;border:1px solid #ddd;border-radius:6px;width:100%;"></div>
        <div class="form-group" style="position:relative;"><label style="font-size:12px;font-weight:600;color:#666;">Luogo Nascita</label><input id="editLuogoNascita" value="" placeholder="Digita comune..." autocomplete="off" style="padding:8px;border:1px solid #ddd;border-radius:6px;width:100%;"><div id="editLNList" style="display:none;position:absolute;top:100%;left:0;right:0;background:white;border:1px solid #ddd;border-radius:0 0 6px 6px;max-height:150px;overflow-y:auto;z-index:10;box-shadow:0 4px 12px rgba(0,0,0,0.1);"></div></div>
        <div class="form-group" style="grid-column:1/-1;"><label style="font-size:12px;font-weight:600;color:#666;">Codice Fiscale</label><div style="display:flex;gap:8px;"><input id="editCF" value="" maxlength="16" style="flex:1;padding:8px;border:1px solid #ddd;border-radius:6px;text-transform:uppercase;font-family:monospace;"><button type="button" id="btnCalcCF" style="padding:8px 12px;background:#667eea;color:white;border:none;border-radius:6px;cursor:pointer;font-size:11px;white-space:nowrap;">Calcola</button></div></div>
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

  // --- Autocomplete luogo nascita + calcolo CF ---
  let selectedBelfiore = '';
  const lnInput = document.getElementById('editLuogoNascita');
  const lnList = document.getElementById('editLNList');
  let lnTimeout = null;
  lnInput.addEventListener('input', () => {
    clearTimeout(lnTimeout);
    selectedBelfiore = '';
    lnTimeout = setTimeout(async () => {
      const results = await cercaComune(lnInput.value);
      if (results.length === 0) { lnList.style.display = 'none'; return; }
      lnList.innerHTML = results.map(c => `<div data-codice="${c.codice}" style="padding:8px 12px;cursor:pointer;font-size:12px;border-bottom:1px solid #f5f5f5;">${c.nome} (${c.provincia})</div>`).join('');
      lnList.style.display = 'block';
      lnList.querySelectorAll('div').forEach(el => el.addEventListener('click', () => {
        lnInput.value = el.textContent;
        selectedBelfiore = el.dataset.codice;
        lnList.style.display = 'none';
      }));
    }, 200);
  });
  document.addEventListener('click', e => { if (!lnInput.contains(e.target) && !lnList.contains(e.target)) lnList.style.display = 'none'; });

  document.getElementById('btnCalcCF').addEventListener('click', async () => {
    const nome = document.getElementById('editNome').value.trim();
    const cognome = document.getElementById('editCognome').value.trim();
    const data = document.getElementById('editDataNas').value;
    if (!nome || !cognome || !data) { alert('Compila Nome, Cognome e Data Nascita'); return; }
    let codice = selectedBelfiore;
    if (!codice) {
      const results = await cercaComune(lnInput.value);
      if (results.length > 0) { codice = results[0].codice; lnInput.value = results[0].nome + ' (' + results[0].provincia + ')'; selectedBelfiore = codice; }
    }
    if (!codice) { alert('Seleziona il Luogo di Nascita'); return; }
    document.getElementById('editCF').value = calcolaCodiceFiscale(cognome, nome, data, 'M', codice);
  });

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
      luogo_nascita: document.getElementById('editLuogoNascita').value || null,
      codice_fiscale: document.getElementById('editCF').value.toUpperCase() || null,
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
