import { apiFetch } from '../../services/api.js';
import { formatDateShort } from '../../utils/formatters.js';
import { showLoading, hideLoading } from '../../utils/ui.js';
import { calcolaCodiceFiscale, cercaComune } from '../../utils/codiceFiscale.js';
import { DataGrid } from '../../components/DataGrid.js';

export async function loadPlayerDetail(container, playerId) {
  if (!container) {
    console.error('Container non trovato per loadPlayerDetail');
    return;
  }

  showLoading('Caricamento scheda giocatore...');

  try {
    let player;
    let career = [];
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
    renderPlayerDetail(container, { player, career, valutazioni, allSquadre, injuries });
  } catch (e) {
    console.error(e);
    hideLoading();
    container.innerHTML = '<div class="error-box">Errore: ' + (e.message || 'errore sconosciuto') + '</div>';
  }
}

function renderPlayerDetail(container, data) {
  const { player, career, valutazioni, allSquadre, injuries } = data;

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
  const emailAtleta = player.email || '-';
  const tipoDoc = player.tipo_documento || '-';
  const numDoc = player.numero_documento || '-';
  const rilasciatoDa = player.rilasciato_da || '-';
  const matricolaFigc = player.matricola_figc || '-';
  const codiceFiscale = player.codice_fiscale || '-';
  const luogoNascita = player.luogo_nascita || '-';



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
            <th style="padding:6px 4px;text-align:center;">Inizio</th>
            <th style="padding:6px 4px;text-align:center;">Rientro</th>
            <th style="padding:6px 4px;text-align:center;">Effettivo</th>
            <th style="padding:6px 4px;text-align:center;">Grav.</th>
            ${isAdmin ? '<th style="padding:6px 4px;text-align:center;">Azioni</th>' : ''}
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
    const mappedRows = rows.map(s => ({ stagione: s.stagione || '-', squadra: s.squadra || '-', team_id: s.team_id, partite: s.partite || 0, minuti: s.minuti || 0, gol: s.gol || 0, assist: s.assist || 0, ammonizioni: s.ammonizioni || 0, espulsioni: s.espulsioni || 0 }));

    // Desktop: DataGrid table
    const div = document.createElement('div');
    DataGrid({
      container: div,
      columns: [
        { key: 'stagione', label: 'Stagione', width: '2.2fr', align: 'left', secondary: true },
        { key: 'squadra', label: 'Squadra', width: '2.5fr', align: 'left', primary: true },
        { key: 'partite', label: 'Partite', labelShort: 'PG', width: '1fr', meta: true, metaPrefix: 'PG', metaSuffix: '' },
        { key: 'minuti', label: 'Minuti', labelShort: 'Min', width: '1.3fr', mobileIcon: '🕐' },
        { key: 'gol', label: 'Gol', labelShort: 'G', width: '1fr', color: '#27AE60', bold: true, mobileIcon: '⚽' },
        { key: 'assist', label: 'Assist', labelShort: 'A', width: '1fr', color: '#2980B9', bold: true, mobileIcon: '🅰️' },
        { key: 'ammonizioni', label: '🟨', width: '1fr', color: '#F39C12', mobileIcon: '🟨' },
        { key: 'espulsioni', label: '🟥', width: '1fr', color: '#E74C3C', mobileIcon: '🟥' }
      ],
      rows: mappedRows,
      footer: { stagione: 'TOTALE', squadra: '', partite: totals.partite, minuti: totals.minuti, gol: totals.gol, assist: totals.assist, ammonizioni: totals.ammonizioni, espulsioni: totals.espulsioni }
    });

    // Mobile: raggruppato per squadra con logo
    const wsLogo = window.YFM.getWorkspaceLogo ? window.YFM.getWorkspaceLogo() : null;
    const wsName = window.YFM.getSocietaName ? window.YFM.getSocietaName() : '';
    const grouped = [];
    mappedRows.forEach(r => {
      const last = grouped[grouped.length - 1];
      if (last && last.squadra === r.squadra) { last.rows.push(r); }
      else { grouped.push({ squadra: r.squadra, logo: r.logo, rows: [r] }); }
    });
    const logoImg = (g) => {
      if (g.logo) return `<img src="${g.logo}" style="width:18px;height:18px;border-radius:50%;object-fit:contain;" onerror="this.outerHTML='🛡️'">`;
      const isWs = wsName && g.squadra.toLowerCase().includes(wsName.toLowerCase());
      if (isWs && wsLogo) return `<img src="${wsLogo}" style="width:18px;height:18px;border-radius:50%;object-fit:contain;" onerror="this.outerHTML='🛡️'">`;
      return '🛡️';
    };
    const statLine = (r) => `<div class="dg-card-stats" style="margin-top:2px;"><span class="dg-card-stat">PG <strong>${r.partite}</strong></span><span class="dg-card-stat">🕐 <strong>${r.minuti}</strong></span><span class="dg-card-stat" style="color:#27AE60;">⚽ <strong>${r.gol}</strong></span><span class="dg-card-stat" style="color:#2980B9;">🅰️ <strong>${r.assist}</strong></span><span class="dg-card-stat" style="color:#F39C12;">🟨 <strong>${r.ammonizioni}</strong></span><span class="dg-card-stat" style="color:#E74C3C;">🟥 <strong>${r.espulsioni}</strong></span></div>`;
    const mobileHtml = grouped.map(g => {
      const header = `<div style="display:flex;align-items:center;gap:6px;font-weight:700;font-size:13px;padding:8px 14px 4px;">${logoImg(g)} ${g.squadra}</div>`;
      const seasonRows = g.rows.map((r, ri) => `<div class="dg-card career-season-row" data-team-id="${r.team_id}" data-player-id="${player.id}" style="padding:4px 14px 8px;cursor:pointer;"><div style="font-size:11px;color:#666;margin-bottom:2px;">📅 ${r.stagione} <span style="font-size:10px;color:#667eea;">▶</span></div>${statLine(r)}<div class="career-expand-mobile" style="display:none;margin-top:8px;"></div></div>`).join('');
      return header + seasonRows;
    }).join('');
    const footerMobile = `<div class="dg-card dg-card-footer"><div style="font-weight:700;font-size:12px;color:#667eea;margin-bottom:4px;">TOTALE</div>${statLine(totals)}</div>`;

    // Replace the dg-cards content with grouped layout
    const wrapper = div.querySelector('.dg-wrap');
    const cardsDiv = wrapper.querySelector('.dg-cards');
    cardsDiv.innerHTML = mobileHtml + footerMobile;

    // Desktop: make tbody rows clickable
    const tableEl = wrapper.querySelector('.dg-table');
    if (tableEl) {
      tableEl.classList.add('career-table-expandable');
      const tbody = tableEl.querySelector('tbody');
      const trs = tbody ? [...tbody.querySelectorAll('tr')] : [];
      trs.forEach((tr, i) => {
        tr.style.cursor = 'pointer';
        tr.dataset.teamId = mappedRows[i].team_id;
        tr.dataset.playerId = player.id;
        tr.dataset.idx = i;
        // Add expand arrow to first cell
        const firstTd = tr.querySelector('td');
        if (firstTd) firstTd.innerHTML = `<span class="career-arrow" style="color:#667eea;font-size:10px;margin-right:4px;">▶</span>` + firstTd.innerHTML;
      });
      // Add expand container after table
      const expandContainer = document.createElement('div');
      expandContainer.className = 'career-desktop-expands';
      trs.forEach((tr, i) => {
        const expandDiv = document.createElement('div');
        expandDiv.className = 'career-expand-desktop';
        expandDiv.dataset.idx = i;
        expandDiv.dataset.teamId = mappedRows[i].team_id;
        expandDiv.dataset.playerId = player.id;
        expandDiv.style.cssText = 'display:none;';
        expandContainer.appendChild(expandDiv);
      });
      tableEl.after(expandContainer);
    }

    return div.innerHTML;
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

  const shortDate = (d) => { if (!d) return '-'; try { const dt = new Date(d); return (dt.getDate()+'').padStart(2,'0')+'/'+(dt.getMonth()+1+'').padStart(2,'0')+'/'+String(dt.getFullYear()).slice(2); } catch(e) { return '-'; } };

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
      <div id="playerDataView">
        <!-- SEZIONE 1: Dati Anagrafici -->
        <div style="margin-bottom:16px;">
          <div style="font-size:12px;font-weight:700;color:#667eea;margin-bottom:10px;">👤 DATI ANAGRAFICI</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div><span style="font-size:12px;color:#888;">Nome</span><div style="font-size:14px;font-weight:500;">${nome}</div></div>
            <div><span style="font-size:12px;color:#888;">Cognome</span><div style="font-size:14px;font-weight:500;">${cognome}</div></div>
            <div><span style="font-size:12px;color:#888;">Data di Nascita</span><div style="font-size:14px;">${dataMorte}</div></div>
            <div><span style="font-size:12px;color:#888;">Luogo di Nascita</span><div style="font-size:14px;">${luogoNascita}</div></div>
            <div><span style="font-size:12px;color:#888;">Telefono</span><div style="font-size:14px;">${telefono}</div></div>
            <div><span style="font-size:12px;color:#888;">Email Atleta</span><div style="font-size:14px;">${emailAtleta !== '-' ? '<a href="mailto:' + emailAtleta + '" style="color:#667eea;text-decoration:none;">✉️ ' + emailAtleta + '</a>' : '-'}</div></div>
            <div><span style="font-size:12px;color:#888;">Codice Fiscale</span><div style="font-size:14px;font-family:monospace;">${codiceFiscale}</div></div>
          </div>
        </div>
        <!-- SEZIONE 2: Dati Sportivi -->
        <div style="margin-bottom:16px;padding-top:16px;border-top:1px solid #f0f0f0;">
          <div style="font-size:12px;font-weight:700;color:#667eea;margin-bottom:10px;">⚽ DATI SPORTIVI</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div><span style="font-size:12px;color:#888;">Ruolo</span><div style="font-size:14px;">${ruolo}</div></div>
            <div><span style="font-size:12px;color:#888;">N. Maglia</span><div style="font-size:14px;">#${numero}</div></div>
            <div><span style="font-size:12px;color:#888;">Piede Preferito</span><div style="font-size:14px;">${piede}</div></div>
            <div><span style="font-size:12px;color:#888;">Stato</span><div style="font-size:14px;"><span class="badge ${stato === 'Attivo' ? 'badge-green' : 'badge-red'}">${stato}</span></div></div>
            <div><span style="font-size:12px;color:#888;">Altezza (cm)</span><div style="font-size:14px;">${altezza}</div></div>
            <div><span style="font-size:12px;color:#888;">Peso (kg)</span><div style="font-size:14px;">${peso}</div></div>
            <div style="grid-column:1/-1;"><span style="font-size:12px;color:#888;">Matricola FIGC</span><div style="font-size:14px;">${matricolaFigc}</div></div>
          </div>
        </div>
        <!-- SEZIONE 3: Documenti & Visita Medica -->
        <div style="padding-top:16px;border-top:1px solid #f0f0f0;">
          <div style="font-size:12px;font-weight:700;color:#667eea;margin-bottom:10px;">📄 DOCUMENTI & VISITA MEDICA</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div><span style="font-size:12px;color:#888;">Tipo Documento</span><div style="font-size:14px;">${tipoDoc}</div></div>
            <div><span style="font-size:12px;color:#888;">N. Documento</span><div style="font-size:14px;">${numDoc}</div></div>
            <div><span style="font-size:12px;color:#888;">Rilasciato Da</span><div style="font-size:14px;">${rilasciatoDa}</div></div>
            <div><span style="font-size:12px;color:#888;">Certificato Medico</span><div style="font-size:14px;">${certificato}</div></div>
          </div>
        </div>
      </div>
      ${(player.contatti_genitori && player.contatti_genitori.length) ? `
      <div style="margin-top:16px;">
        <span style="font-size:12px;font-weight:700;color:#667eea;">👨‍👩‍👦 CONTATTI GENITORI</span>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:8px;margin-top:8px;">
          ${player.contatti_genitori.map(c => `<div style="padding:8px 12px;background:#f8f9fa;border-radius:6px;"><span style="font-size:11px;color:#888;">${c.tipo || ''}</span><div style="font-size:14px;font-weight:500;">${c.nome || ''}</div><div style="font-size:13px;color:#667eea;">${c.telefono ? '<a href="tel:' + c.telefono + '" style="color:#667eea;text-decoration:none;">📞 ' + c.telefono + '</a>' : ''}${c.email ? '<br><a href="mailto:' + c.email + '" style="color:#667eea;text-decoration:none;">✉️ ' + c.email + '</a>' : ''}</div></div>`).join('')}
        </div>
      </div>` : ''}
      <div id="playerDataEdit" style="display:none;">
        <!-- SEZIONE 1: Dati Anagrafici -->
        <div style="margin-bottom:16px;">
          <div style="font-size:12px;font-weight:700;color:#667eea;margin-bottom:10px;">👤 DATI ANAGRAFICI</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div class="form-group"><label style="font-size:12px;font-weight:600;color:#666;">Nome *</label><input id="editNome" value="${nome}" style="padding:8px;border:1px solid #ddd;border-radius:6px;width:100%;"></div>
            <div class="form-group"><label style="font-size:12px;font-weight:600;color:#666;">Cognome *</label><input id="editCognome" value="${cognome}" style="padding:8px;border:1px solid #ddd;border-radius:6px;width:100%;"></div>
            <div class="form-group"><label style="font-size:12px;font-weight:600;color:#666;">Data Nascita</label><input id="editDataNas" type="date" value="${player.data_nascita ? player.data_nascita.split('T')[0] : ''}" style="padding:8px;border:1px solid #ddd;border-radius:6px;width:100%;"></div>
            <div class="form-group" style="position:relative;"><label style="font-size:12px;font-weight:600;color:#666;">Luogo Nascita</label><input id="editLuogoNascita" value="${luogoNascita !== '-' ? luogoNascita : ''}" placeholder="Digita comune..." autocomplete="off" style="padding:8px;border:1px solid #ddd;border-radius:6px;width:100%;"><div id="editLNList" style="display:none;position:absolute;top:100%;left:0;right:0;background:white;border:1px solid #ddd;border-radius:0 0 6px 6px;max-height:150px;overflow-y:auto;z-index:10;box-shadow:0 4px 12px rgba(0,0,0,0.1);"></div></div>
            <div class="form-group"><label style="font-size:12px;font-weight:600;color:#666;">Telefono</label><input id="editTelefono" value="${telefono !== '-' ? telefono : ''}" style="padding:8px;border:1px solid #ddd;border-radius:6px;width:100%;"></div>
            <div class="form-group"><label style="font-size:12px;font-weight:600;color:#666;">Email Atleta</label><input id="editEmail" type="email" value="${emailAtleta !== '-' ? emailAtleta : ''}" placeholder="email@esempio.it" style="padding:8px;border:1px solid #ddd;border-radius:6px;width:100%;"></div>
            <div class="form-group"><label style="font-size:12px;font-weight:600;color:#666;">Codice Fiscale</label><div style="position:relative;"><input id="editCF" value="${codiceFiscale !== '-' ? codiceFiscale : ''}" maxlength="16" style="padding:8px;border:1px solid #ddd;border-radius:6px;width:100%;text-transform:uppercase;font-family:monospace;"><div id="cfStatusEdit" style="font-size:11px;margin-top:4px;color:#888;display:none;"></div></div></div>
          </div>
        </div>
        <!-- SEZIONE 2: Dati Sportivi -->
        <div style="margin-bottom:16px;padding-top:16px;border-top:1px solid #f0f0f0;">
          <div style="font-size:12px;font-weight:700;color:#667eea;margin-bottom:10px;">⚽ DATI SPORTIVI</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div class="form-group"><label style="font-size:12px;font-weight:600;color:#666;">Ruolo</label><select id="editRuolo" style="padding:8px;border:1px solid #ddd;border-radius:6px;width:100%;"><option value="" ${!ruolo || ruolo === '-' ? 'selected' : ''}>-- Seleziona --</option><option value="Portiere" ${ruolo === 'Portiere' ? 'selected' : ''}>Portiere</option><option value="Difensore" ${ruolo === 'Difensore' ? 'selected' : ''}>Difensore</option><option value="Centrocampista" ${ruolo === 'Centrocampista' ? 'selected' : ''}>Centrocampista</option><option value="Attaccante" ${ruolo === 'Attaccante' ? 'selected' : ''}>Attaccante</option></select></div>
            <div class="form-group"><label style="font-size:12px;font-weight:600;color:#666;">N. Maglia</label><input id="editNumMaglia" type="number" value="${numero}" style="padding:8px;border:1px solid #ddd;border-radius:6px;width:100%;"></div>
            <div class="form-group"><label style="font-size:12px;font-weight:600;color:#666;">Piede Preferito</label><select id="editPiede" style="padding:8px;border:1px solid #ddd;border-radius:6px;width:100%;"><option value="" ${!player.piede_preferito ? 'selected' : ''}>-- Seleziona --</option><option value="Destro" ${player.piede_preferito === 'Destro' ? 'selected' : ''}>Destro</option><option value="Sinistro" ${player.piede_preferito === 'Sinistro' ? 'selected' : ''}>Sinistro</option><option value="Ambidestro" ${player.piede_preferito === 'Ambidestro' ? 'selected' : ''}>Ambidestro</option></select></div>
            <div class="form-group"><label style="font-size:12px;font-weight:600;color:#666;">Stato</label><select id="editStato" style="padding:8px;border:1px solid #ddd;border-radius:6px;width:100%;"><option value="Attivo" ${stato === 'Attivo' ? 'selected' : ''}>Attivo</option><option value="Infortunato" ${stato === 'Infortunato' ? 'selected' : ''}>Infortunato</option><option value="Svincolato" ${stato === 'Svincolato' ? 'selected' : ''}>Svincolato</option></select></div>
            <div class="form-group"><label style="font-size:12px;font-weight:600;color:#666;">Altezza (cm)</label><input id="editAltezza" type="number" value="${altezza !== '-' ? altezza : ''}" style="padding:8px;border:1px solid #ddd;border-radius:6px;width:100%;"></div>
            <div class="form-group"><label style="font-size:12px;font-weight:600;color:#666;">Peso (kg)</label><input id="editPeso" type="number" value="${peso !== '-' ? peso : ''}" style="padding:8px;border:1px solid #ddd;border-radius:6px;width:100%;"></div>
            <div class="form-group" style="grid-column:1/-1;"><label style="font-size:12px;font-weight:600;color:#666;">Matricola FIGC</label><input id="editMatricola" value="${matricolaFigc !== '-' ? matricolaFigc : ''}" style="padding:8px;border:1px solid #ddd;border-radius:6px;width:100%;"></div>
          </div>
        </div>
        <!-- SEZIONE 3: Documenti & Visita Medica -->
        <div style="margin-bottom:16px;padding-top:16px;border-top:1px solid #f0f0f0;">
          <div style="font-size:12px;font-weight:700;color:#667eea;margin-bottom:10px;">📄 DOCUMENTI & VISITA MEDICA</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div class="form-group"><label style="font-size:12px;font-weight:600;color:#666;">Tipo Documento</label><input id="editTipoDoc" value="${tipoDoc !== '-' ? tipoDoc : ''}" style="padding:8px;border:1px solid #ddd;border-radius:6px;width:100%;"></div>
            <div class="form-group"><label style="font-size:12px;font-weight:600;color:#666;">N. Documento</label><input id="editNumDoc" value="${numDoc !== '-' ? numDoc : ''}" style="padding:8px;border:1px solid #ddd;border-radius:6px;width:100%;"></div>
            <div class="form-group" style="grid-column:1/-1;"><label style="font-size:12px;font-weight:600;color:#666;">Rilasciato Da</label><input id="editRilasciatoDa" value="${rilasciatoDa !== '-' ? rilasciatoDa : ''}" style="padding:8px;border:1px solid #ddd;border-radius:6px;width:100%;"></div>
            <div class="form-group"><label style="font-size:12px;font-weight:600;color:#666;">Data Visita Medica</label><input id="editCertificato" type="date" value="${player.data_visita_medica ? player.data_visita_medica.split('T')[0] : ''}" style="padding:8px;border:1px solid #ddd;border-radius:6px;width:100%;"></div>
          </div>
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
  `;

  // Event Listeners
  document.getElementById('btnBackRoster')?.addEventListener('click', () => {
    if (window.YFM?.navigateTo) window.YFM.navigateTo('roster');
    else if (window.navigateTo) window.navigateTo('roster');
  });

  // Career expand — helper to build DataGrid for matches
  function buildMatchesExpand(matches, containerEl) {
    if (!matches?.length) { containerEl.innerHTML = '<div style="padding:8px;color:#888;font-size:12px;">Nessuna partita trovata.</div>'; return; }
    const mapped = matches.map(m => ({ giornata: m.giornata ? 'G.' + String(m.giornata).padStart(2,'0') : '', data: shortDate(m.data), avversario: m.avversario || '-', risultato: m.risultato || '', logo: m.logo || null, minuti: m.minuti || 0, gol: m.gol || 0, assist: m.assist || 0, gialli: m.cartellini_gialli || 0, rossi: m.cartellini_rossi || 0 }));
    // Desktop DataGrid
    const dgDiv = document.createElement('div');
    DataGrid({
      container: dgDiv,
      columns: [
        { key: 'giornata', label: 'G.', width: '0.8fr', align: 'center' },
        { key: 'avversario', label: 'Avversario', width: '3fr', align: 'left', primary: true, render: (v, row) => `<span style="display:inline-flex;align-items:center;gap:6px;white-space:nowrap;">${row.logo ? `<img src="${row.logo}" style="width:18px;height:18px;border-radius:50%;object-fit:contain;" onerror="this.style.display='none'">` : ''}${v}</span>` },
        { key: 'risultato', label: 'Ris.', width: '1fr', align: 'center', bold: true },
        { key: 'data', label: 'Data', width: '1.5fr', align: 'left', secondary: true },
        { key: 'minuti', label: 'Minuti', labelShort: 'Min', width: '1.2fr', meta: true },
        { key: 'gol', label: 'Gol', labelShort: 'G', width: '1fr', color: '#27AE60', mobileIcon: '⚽' },
        { key: 'assist', label: 'Assist', labelShort: 'A', width: '1fr', color: '#2980B9', mobileIcon: '🅰️' },
        { key: 'gialli', label: '🟨', width: '1fr', color: '#F39C12', mobileIcon: '🟨' },
        { key: 'rossi', label: '🟥', width: '1fr', color: '#E74C3C', mobileIcon: '🟥' }
      ],
      rows: mapped
    });
    // Mobile override — data dd/mm per risparmiare spazio
    const shortDateMobile = (d) => { if (!d) return '-'; try { const dt = new Date(d); return (dt.getDate()+'').padStart(2,'0')+'/'+(dt.getMonth()+1+'').padStart(2,'0'); } catch(e) { return '-'; } };
    const mobileHtml = matches.map((m, i) => {
      const row = mapped[i];
      const logoHtml = row.logo ? `<img src="${row.logo}" style="width:16px;height:16px;border-radius:50%;object-fit:contain;" onerror="this.style.display='none'">` : '';
      const mDate = shortDateMobile(m.data);
      return `<div class="dg-card" style="padding:8px 14px;display:flex;align-items:center;justify-content:space-between;gap:8px;"><span style="font-weight:700;font-size:12px;display:inline-flex;align-items:center;gap:4px;min-width:0;overflow:hidden;"><span style="flex-shrink:0;display:inline-flex;">${logoHtml}</span><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${row.avversario}</span>${row.risultato ? '<span style="font-size:11px;color:#333;font-weight:800;flex-shrink:0;">' + row.risultato + '</span>' : ''}</span><span class="dg-card-stats" style="gap:6px;flex-shrink:0;"><span class="dg-card-stat" style="color:#666;">${mDate}</span><span class="dg-card-stat" style="color:#666;">🕐${row.minuti}'</span><span class="dg-card-stat" style="color:#27AE60;">⚽<strong>${row.gol}</strong></span><span class="dg-card-stat" style="color:#2980B9;">🅰️<strong>${row.assist}</strong></span><span class="dg-card-stat" style="color:#F39C12;">🟨<strong>${row.gialli}</strong></span><span class="dg-card-stat" style="color:#E74C3C;">🟥<strong>${row.rossi}</strong></span></span></div>`;
    }).join('');
    const wrap = dgDiv.querySelector('.dg-wrap');
    wrap.querySelector('.dg-cards').innerHTML = mobileHtml;
    containerEl.innerHTML = dgDiv.innerHTML;
  }

  async function toggleCareerExpand(teamId, playerId, detailEl) {
    if (detailEl.style.display !== 'none') { detailEl.style.display = 'none'; return false; }
    detailEl.style.display = 'block';
    if (detailEl.dataset.loaded) return true;
    detailEl.innerHTML = '<div style="padding:10px;text-align:center;color:#888;font-size:12px;">Caricamento partite...</div>';
    try {
      const matches = await apiFetch('/calciatori/' + playerId + '/career-matches?teamId=' + teamId);
      detailEl.dataset.loaded = '1';
      buildMatchesExpand(matches, detailEl);
    } catch (err) {
      detailEl.innerHTML = '<div style="padding:8px;color:#c00;font-size:12px;">Errore: ' + err.message + '</div>';
    }
    return true;
  }

  // Desktop: click on career table rows (mutually exclusive)
  document.querySelectorAll('.career-table-expandable tbody').forEach(tbody => {
    tbody.addEventListener('click', (e) => {
      const tr = e.target.closest('tr');
      if (!tr || !tr.dataset.teamId) return;
      const wrap = tr.closest('.dg-wrap');
      const expandDiv = wrap.querySelector(`.career-expand-desktop[data-idx="${tr.dataset.idx}"]`);
      if (!expandDiv) return;
      const isClosing = expandDiv.style.display !== 'none';
      // Close all
      wrap.querySelectorAll('.career-expand-desktop').forEach(d => { d.style.display = 'none'; });
      tbody.querySelectorAll('tr').forEach(r => { r.style.background = ''; const a = r.querySelector('.career-arrow'); if (a) a.textContent = '▶'; });
      if (isClosing) return;
      // Open this one
      const arrow = tr.querySelector('.career-arrow');
      toggleCareerExpand(tr.dataset.teamId, tr.dataset.playerId, expandDiv).then(() => {
        tr.style.background = '#f0f4ff';
        if (arrow) arrow.textContent = '▼';
      });
    });
  });

  // Mobile: click on career season rows (mutually exclusive)
  document.querySelectorAll('.career-season-row').forEach(card => {
    card.addEventListener('click', () => {
      const detailEl = card.querySelector('.career-expand-mobile');
      if (!detailEl) return;
      const isClosing = detailEl.style.display !== 'none';
      // Close all
      document.querySelectorAll('.career-expand-mobile').forEach(d => { d.style.display = 'none'; });
      document.querySelectorAll('.career-season-row span[style*="color:#667eea"]').forEach(a => { a.textContent = '▶'; });
      if (isClosing) return;
      // Open this one
      const arrow = card.querySelector('span[style*="color:#667eea"]');
      toggleCareerExpand(card.dataset.teamId, card.dataset.playerId, detailEl).then(() => {
        if (arrow) arrow.textContent = '▼';
      });
    });
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
      row.style = 'display:grid;grid-template-columns:auto 1fr 1fr 1fr auto;gap:8px;align-items:center;margin-bottom:8px;';
      row.innerHTML = `<select class="cg-tipo" style="padding:6px;border:1px solid #ddd;border-radius:6px;font-size:12px;"><option value="Padre" ${c.tipo === 'Padre' ? 'selected' : ''}>Padre</option><option value="Madre" ${c.tipo === 'Madre' ? 'selected' : ''}>Madre</option><option value="Tutore" ${c.tipo === 'Tutore' ? 'selected' : ''}>Tutore</option></select><input class="cg-nome" placeholder="Nome" value="${c.nome || ''}" style="padding:6px 10px;border:1px solid #ddd;border-radius:6px;"><input class="cg-tel" placeholder="Cellulare" value="${c.telefono || ''}" style="padding:6px 10px;border:1px solid #ddd;border-radius:6px;"><input class="cg-email" placeholder="Email" value="${c.email || ''}" type="email" style="padding:6px 10px;border:1px solid #ddd;border-radius:6px;"><button type="button" style="background:none;border:none;color:#E74C3C;font-size:18px;cursor:pointer;">×</button>`;
      row.querySelector('button').onclick = () => row.remove();
      container.appendChild(row);
    }

    document.getElementById('btnEditInline')?.addEventListener('click', () => {
      document.getElementById('playerDataView').style.display = 'none';
      document.getElementById('playerDataEdit').style.display = 'block';
      // Evidenzia modalità edit
      const card = document.getElementById('playerDataEdit').closest('.card');
      if (card) { card.style.border = '2px solid #667eea'; card.style.background = 'linear-gradient(135deg, #667eea06, #764ba206)'; }
      // Banner edit mode
      let banner = document.getElementById('editModeBanner');
      if (!banner) {
        banner = document.createElement('div');
        banner.id = 'editModeBanner';
        banner.style.cssText = 'display:flex;align-items:center;gap:8px;padding:10px 14px;background:#eef2ff;border-radius:8px;margin-bottom:16px;border:1px solid #c7d2fe;';
        banner.innerHTML = '<span style="font-size:16px;">✏️</span><span style="font-size:13px;font-weight:600;color:#4338ca;">Modalità modifica attiva</span>';
        document.getElementById('playerDataEdit').prepend(banner);
      }
      // Popola contatti genitori
      const cgContainer = document.getElementById('editContattiGenitori');
      if (cgContainer && !cgContainer.hasChildNodes()) {
        (player.contatti_genitori || []).forEach(c => addContattoRowDetail(cgContainer, c));
      }
      // Autocomplete luogo nascita + auto-calc CF in edit mode
      let selectedBelfiore = '';
      const lnInput = document.getElementById('editLuogoNascita');
      const lnList = document.getElementById('editLNList');
      const cfInput = document.getElementById('editCF');
      const cfStatusEdit = document.getElementById('cfStatusEdit');
      let lnTimeout = null;

      function tryAutoCalcCFEdit() {
        const n = document.getElementById('editNome').value.trim();
        const c = document.getElementById('editCognome').value.trim();
        const d = document.getElementById('editDataNas').value;
        if (n && c && d && selectedBelfiore) {
          cfInput.value = calcolaCodiceFiscale(c, n, d, 'M', selectedBelfiore);
          if (cfStatusEdit) { cfStatusEdit.textContent = '\u2713 Ricalcolato'; cfStatusEdit.style.display = 'block'; }
        }
      }

      if (lnInput && lnList) {
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
              tryAutoCalcCFEdit();
            }));
          }, 200);
        });
        document.addEventListener('click', e => { if (!lnInput.contains(e.target) && !lnList.contains(e.target)) lnList.style.display = 'none'; });
      }
      document.getElementById('editDataNas')?.addEventListener('change', tryAutoCalcCFEdit);
    });

    document.getElementById('editAddContatto')?.addEventListener('click', () => {
      const cgContainer = document.getElementById('editContattiGenitori');
      if (cgContainer) addContattoRowDetail(cgContainer);
    });

    document.getElementById('btnCancelEdit')?.addEventListener('click', () => {
      document.getElementById('playerDataView').style.display = 'block';
      document.getElementById('playerDataEdit').style.display = 'none';
      // Ripristina stile card
      const card = document.getElementById('playerDataEdit').closest('.card');
      if (card) { card.style.border = '1px solid #eee'; card.style.background = 'white'; }
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
        email: document.getElementById('editEmail').value || null,
        stato: document.getElementById('editStato').value,
        data_visita_medica: document.getElementById('editCertificato').value,
        matricola_figc: document.getElementById('editMatricola').value,
        luogo_nascita: document.getElementById('editLuogoNascita').value || null,
        codice_fiscale: document.getElementById('editCF').value ? document.getElementById('editCF').value.toUpperCase() : null,
        tipo_documento: document.getElementById('editTipoDoc').value,
        numero_documento: document.getElementById('editNumDoc').value,
        rilasciato_da: document.getElementById('editRilasciatoDa').value,
        contatti_genitori: [...document.querySelectorAll('#editContattiGenitori > div')].map(row => {
          const tipo = row.querySelector('.cg-tipo')?.value;
          const nome = row.querySelector('.cg-nome')?.value?.trim();
          const telefono = row.querySelector('.cg-tel')?.value?.trim();
          const email = row.querySelector('.cg-email')?.value?.trim();
          return (nome || telefono || email) ? { tipo, nome, telefono, email } : null;
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

  const squadra = window.YFM.getSquadra();
  const categoriaNome = squadra?.category?.nome || '';
  const stagioneNome = squadra?.season?.nome || '';

  container.innerHTML = `
    <div class="page-header" style="display:flex;justify-content:space-between;align-items:center;gap:12px;">
      <button class="btn btn-secondary btn-small" id="btnBackRoster">← Torna alla rosa</button>
    </div>
    <h1 class="page-title" style="margin-top:12px;">👤 Nuovo Calciatore</h1>
    <p class="page-subtitle">${categoriaNome}${stagioneNome ? ' • Stagione ' + stagioneNome : ''}</p>

    <!-- SEZIONE 1: Dati Anagrafici -->
    <div class="card" style="margin-top:20px;">
      <h3 class="section-title">👤 Dati Anagrafici</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div class="form-group"><label style="font-size:12px;font-weight:600;color:#666;">Nome *</label><input id="editNome" value="" style="padding:8px;border:1px solid #ddd;border-radius:6px;width:100%;"></div>
        <div class="form-group"><label style="font-size:12px;font-weight:600;color:#666;">Cognome *</label><input id="editCognome" value="" style="padding:8px;border:1px solid #ddd;border-radius:6px;width:100%;"></div>
        <div class="form-group"><label style="font-size:12px;font-weight:600;color:#666;">Data Nascita</label><input id="editDataNas" type="date" value="" style="padding:8px;border:1px solid #ddd;border-radius:6px;width:100%;"></div>
        <div class="form-group" style="position:relative;"><label style="font-size:12px;font-weight:600;color:#666;">Luogo Nascita</label><input id="editLuogoNascita" value="" placeholder="Digita comune..." autocomplete="off" style="padding:8px;border:1px solid #ddd;border-radius:6px;width:100%;"><div id="editLNList" style="display:none;position:absolute;top:100%;left:0;right:0;background:white;border:1px solid #ddd;border-radius:0 0 6px 6px;max-height:150px;overflow-y:auto;z-index:10;box-shadow:0 4px 12px rgba(0,0,0,0.1);"></div></div>
        <div class="form-group"><label style="font-size:12px;font-weight:600;color:#666;">Telefono</label><input id="editTelefono" value="" style="padding:8px;border:1px solid #ddd;border-radius:6px;width:100%;"></div>
        <div class="form-group"><label style="font-size:12px;font-weight:600;color:#666;">Codice Fiscale</label><div style="position:relative;"><input id="editCF" value="" maxlength="16" style="padding:8px;border:1px solid #ddd;border-radius:6px;width:100%;text-transform:uppercase;font-family:monospace;" readonly><div id="cfStatus" style="font-size:11px;margin-top:4px;color:#27AE60;display:none;">✓ Calcolato automaticamente — <a href="#" id="cfManualEdit" style="color:#667eea;">✏️ Modifica</a></div></div></div>
      </div>
    </div>

    <!-- SEZIONE 2: Dati Sportivi -->
    <div class="card" style="margin-top:16px;">
      <h3 class="section-title">⚽ Dati Sportivi</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div class="form-group"><label style="font-size:12px;font-weight:600;color:#666;">Ruolo</label><select id="editRuolo" style="padding:8px;border:1px solid #ddd;border-radius:6px;width:100%;"><option value="">-- Seleziona --</option><option value="Portiere">Portiere</option><option value="Difensore">Difensore</option><option value="Centrocampista">Centrocampista</option><option value="Attaccante">Attaccante</option></select></div>
        <div class="form-group"><label style="font-size:12px;font-weight:600;color:#666;">N. Maglia</label><input id="editNumMaglia" type="number" value="" style="padding:8px;border:1px solid #ddd;border-radius:6px;width:100%;"></div>
        <div class="form-group"><label style="font-size:12px;font-weight:600;color:#666;">Piede Preferito</label><select id="editPiede" style="padding:8px;border:1px solid #ddd;border-radius:6px;width:100%;"><option value="">-- Seleziona --</option><option value="Destro">Destro</option><option value="Sinistro">Sinistro</option><option value="Ambidestro">Ambidestro</option></select></div>
        <div class="form-group"><label style="font-size:12px;font-weight:600;color:#666;">Stato</label><select id="editStato" style="padding:8px;border:1px solid #ddd;border-radius:6px;width:100%;"><option value="Attivo" selected>Attivo</option><option value="Infortunato">Infortunato</option><option value="Svincolato">Svincolato</option></select></div>
        <div class="form-group"><label style="font-size:12px;font-weight:600;color:#666;">Altezza (cm)</label><input id="editAltezza" type="number" value="" style="padding:8px;border:1px solid #ddd;border-radius:6px;width:100%;"></div>
        <div class="form-group"><label style="font-size:12px;font-weight:600;color:#666;">Peso (kg)</label><input id="editPeso" type="number" value="" style="padding:8px;border:1px solid #ddd;border-radius:6px;width:100%;"></div>
        <div class="form-group" style="grid-column:1/-1;"><label style="font-size:12px;font-weight:600;color:#666;">Matricola FIGC</label><input id="editMatricola" value="" style="padding:8px;border:1px solid #ddd;border-radius:6px;width:100%;"></div>
      </div>
    </div>

    <!-- SEZIONE 3: Documenti & Visita Medica -->
    <div class="card" style="margin-top:16px;">
      <h3 class="section-title">📄 Documenti & Visita Medica</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div class="form-group"><label style="font-size:12px;font-weight:600;color:#666;">Tipo Documento</label><input id="editTipoDoc" value="" style="padding:8px;border:1px solid #ddd;border-radius:6px;width:100%;"></div>
        <div class="form-group"><label style="font-size:12px;font-weight:600;color:#666;">N. Documento</label><input id="editNumDoc" value="" style="padding:8px;border:1px solid #ddd;border-radius:6px;width:100%;"></div>
        <div class="form-group" style="grid-column:1/-1;"><label style="font-size:12px;font-weight:600;color:#666;">Rilasciato Da</label><input id="editRilasciatoDa" value="" style="padding:8px;border:1px solid #ddd;border-radius:6px;width:100%;"></div>
        <div class="form-group"><label style="font-size:12px;font-weight:600;color:#666;">Data Visita Medica</label><input id="editCertificato" type="date" value="" style="padding:8px;border:1px solid #ddd;border-radius:6px;width:100%;"></div>
      </div>
    </div>

    <!-- AZIONI -->
    <div style="display:flex;gap:10px;margin-top:20px;justify-content:flex-end;">
      <button class="btn btn-secondary" id="btnCancelNew">Annulla</button>
      <button class="btn btn-primary" id="btnSaveNew" style="background:#667eea;">💾 Crea Giocatore</button>
    </div>
  `;

  document.getElementById('btnBackRoster').addEventListener('click', () => window.YFM.navigateTo('roster'));
  document.getElementById('btnCancelNew').addEventListener('click', () => window.YFM.navigateTo('roster'));

  // --- Autocomplete luogo nascita + calcolo CF automatico ---
  let selectedBelfiore = '';
  const lnInput = document.getElementById('editLuogoNascita');
  const lnList = document.getElementById('editLNList');
  const cfInput = document.getElementById('editCF');
  const cfStatus = document.getElementById('cfStatus');
  let lnTimeout = null;

  function tryAutoCalcCF() {
    const nome = document.getElementById('editNome').value.trim();
    const cognome = document.getElementById('editCognome').value.trim();
    const data = document.getElementById('editDataNas').value;
    if (nome && cognome && data && selectedBelfiore) {
      cfInput.value = calcolaCodiceFiscale(cognome, nome, data, 'M', selectedBelfiore);
      cfStatus.style.display = 'block';
    }
  }

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
        tryAutoCalcCF();
      }));
    }, 200);
  });
  document.addEventListener('click', e => { if (!lnInput.contains(e.target) && !lnList.contains(e.target)) lnList.style.display = 'none'; });

  // Auto-calc on blur of data nascita
  document.getElementById('editDataNas').addEventListener('change', tryAutoCalcCF);

  // Link "Modifica manualmente"
  document.getElementById('cfManualEdit')?.addEventListener('click', (e) => {
    e.preventDefault();
    cfInput.removeAttribute('readonly');
    cfInput.focus();
    cfStatus.innerHTML = '<span style="color:#888;">Modalit\u00e0 manuale</span>';
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
