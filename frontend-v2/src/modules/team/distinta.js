import { apiFetch } from '../../services/api';
import { formatDateShort } from '../../utils/formatters';
import { showLoading, hideLoading } from '../../utils/ui';

export async function openDistinta(mid, staffOverrides) {
  const content = '<div id="distintaInner"><div class="loading"><div class="spinner"></div>Caricamento distinta...</div></div>';
  const footer = '<button class="btn btn-secondary" id="modalCancel">Chiudi</button>' +
    '<button class="btn btn-secondary" id="staffBtn">👥 Staff</button>' +
    
    '<button class="btn btn-primary" id="printBtn">🖨️ Stampa</button>';
  const modal = createModal('📄 Distinta Gara', content, footer, '980px');
  
  let curStaff = null;
  try {
    let data = await apiFetch('/squadre/' + window.YFM.squadraId + '/partite/' + mid + '/distinta');
    
    // Se non c'è formazione, usa i convocati
    if (!data || !Array.isArray(data) || data.length === 0) {
      // Prova a caricare i convocati
      const convResp = await apiFetch('/partite/' + mid + '/convocazioni').catch(() => []);
      const convocati = (Array.isArray(convResp) ? convResp : []).filter(c => c.presente === true || c.presente === null);
      
      if (convocati.length === 0) {
        document.getElementById('distintaInner').innerHTML = '<div class="error-box">⚠️ Nessun convocato per questa partita. Salva prima le convocazioni.</div>';
        return;
      }
      
      // Carica rosa per avere i dati anagrafici
      const rosa = await apiFetch('/squadre/' + window.YFM.squadraId + '/calciatori').catch(() => []);
      const rosaMap = {};
      rosa.forEach(g => { rosaMap[g.id] = g; });
      
      // Risolvi team_player_id → player data
      const tpIds = convocati.map(c => c.team_player_id).filter(Boolean);
      let tpMap = {};
      if (tpIds.length > 0) {
        const tpResp = await apiFetch('/squadre/' + window.YFM.squadraId + '/calciatori').catch(() => []);
        tpResp.forEach(g => { tpMap[g.id] = g; });
      }
      
      // Costruisci formazione dai convocati in ordine alfabetico
      const formazioneDaConvocati = rosa
        .sort((a, b) => (a.cognome || '').localeCompare(b.cognome || ''))
        .map(g => ({
          id: g.id,
          nome: g.nome,
          cognome: g.cognome,
          numeroMaglia: g.numero_maglia,
          dataNascita: g.data_nascita,
          matricolaFigc: g.matricola_figc,
          tipoDocumento: g.tipo_documento,
          numeroDocumento: g.numero_documento,
          rilasciatoDa: g.rilasciato_da,
          capitano: false,
          viceCapitano: false
        }));
      
      data = { formazione: formazioneDaConvocati, partita: null, staff: {} };
    }
    
    // Se data è un array (dalla formazione API), wrappalo
    if (Array.isArray(data)) {
      data = { formazione: data, partita: null, staff: {} };
    }
    
    // Carica dati partita se mancanti
    if (!data.partita) {
      const match = window.YFM.allMatches?.find(m => m.id === mid);
      data.partita = match ? {
        avversario: match.avversario,
        dataOra: match.data_ora,
        competizione: match.competizione || '',
        giornata: match.giornata,
        luogo: match.luogo
      } : { avversario: '...', dataOra: new Date().toISOString(), competizione: '', giornata: null, luogo: '' };
    }
    
    curStaff = staffOverrides || data.staff || {};
    renderDistinta(data, curStaff);
  } catch (e) {
    document.getElementById('distintaInner').innerHTML = '<div class="error-box">⚠️ Nessun convocato per questa partita. Salva prima le convocazioni.</div>';
  }
  
  document.getElementById('printBtn').addEventListener('click', () => {
    const el = document.getElementById('distintaInner');
    if (!el) return;
    
    const html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Distinta</title><style>@page{margin:6mm;size:A4 portrait}body{font-family:Courier New,monospace;font-size:9px;margin:0;padding:6mm}.center{text-align:center}.distinta-table{width:100%;border-collapse:collapse;margin:8px 0}.distinta-table th,.distinta-table td{border:1px solid #333;padding:2px 4px;text-align:center;font-size:8px}th{background:#f0f0f0}.capitano{background:#FFF9C4}.vice{background:#E8F5E9}.staff-section td{font-size:7px}.firme{margin-top:12px;display:flex;justify-content:space-between;font-size:9px}.note-finali{font-size:6px;margin-top:4px;text-align:center}@media print{body{padding:0}}</style></head><body>' + el.innerHTML + '</body></html>';
    
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const w = window.open(url, '_blank');
    if (!w) { alert('Popup bloccato! Abilita i popup per questo sito.'); return; }
    w.onload = () => {
      w.print();
      w.onafterprint = () => w.close();
    };
  });
  
  document.getElementById('staffBtn').addEventListener('click', () => openStaffForm(mid, curStaff));
  
}

async function openValutazioniForm(mid) {
  const content = '<div id="valutazioniInner"><div class="loading"><div class="spinner"></div>Caricamento...</div></div>';
  const footer = '<button class="btn btn-secondary" id="modalCancel">Annulla</button><button class="btn btn-primary" id="saveValutazioniBtn">💾 Salva</button>';
  const modal = createModal('⭐ Valutazioni Giocatori', content, footer, '700px');
  
  try {
    const [partitaRes, valutazioniRes] = await Promise.all([
      apiFetch('/partite/' + mid),
      apiFetch('/partite/' + mid + '/valutazioni').catch(() => ({ valutazioni: [] }))
    ]);
    
    const formazioneRes = await apiFetch('/partite/' + mid + '/formazione');
    const formazione = formazioneRes.formazione || [];
    
    // Crea mappa valutazioni esistenti
    const existingVotes = {};
    (valutazioniRes.valutazioni || []).forEach(v => {
      existingVotes[v.calciatore_id] = v;
    });
    
    // Genera HTML con voti selezionabili
    let html = '<style>';
    html += '.val-card{display:flex;align-items:center;justify-content:space-between;padding:12px;background:#f8f9fa;border-radius:10px;margin-bottom:8px;border:1px solid #eee;}';
    html += '.val-card:hover{border-color:#667eea;}';
    html += '.val-player{font-weight:600;font-size:14px;flex:1;}';
    html += '.val-number{font-size:20px;font-weight:bold;color:#667eea;min-width:40px;text-align:center;}';
    html += '.vote-select{padding:8px 12px;font-size:16px;border:2px solid #667eea;border-radius:8px;background:white;cursor:pointer;min-width:70px;text-align:center;}';
    html += '.vote-select:focus{outline:none;border-color:#764ba2;}';
    html += '.note-input{width:100%;padding:6px 10px;border:1px solid #ddd;border-radius:6px;font-size:12px;margin-top:6px;}';
    html += '</style>';
    html += '<p style="margin-bottom:16px;color:#666;font-size:13px;">Assegna un voto da 1 a 10 per ogni giocatore della formazione.</p>';
    html += '<div id="valutazioniList">';
    
    formazione.forEach((g, idx) => {
      const existing = existingVotes[g.id] || {};
      const currentVoto = existing.voto || '';
      const currentNota = existing.nota_allenatore || '';
      
      html += '<div class="val-card" data-player-id="' + g.id + '">';
      html += '<div style="flex:1;">';
      html += '<div class="val-player">' + (g.cognome || '').toUpperCase() + ' ' + (g.nome || '') + '</div>';
      html += '<input type="text" class="note-input" placeholder="Note (opzionale)" value="' + currentNota + '" data-nota-id="' + g.id + '">';
      html += '</div>';
      html += '<select class="vote-select" data-voto-id="' + g.id + '">';
      html += '<option value="">-</option>';
      for (let v = 4; v <= 10; v += 0.5) {
        html += '<option value="' + v + '"' + (currentVoto == v ? ' selected' : '') + '>' + v.toString().replace('.', ',') + '</option>';
      }
      html += '</select>';
      html += '</div>';
    });
    
    html += '</div>';
    
    document.getElementById('valutazioniInner').innerHTML = html;
    
    // Salva valutazioni
    document.getElementById('saveValutazioniBtn').addEventListener('click', async () => {
      const valutazioni = [];
      document.querySelectorAll('.vote-select').forEach(sel => {
        const playerId = sel.dataset.votoId;
        const voto = sel.value;
        const nota = document.querySelector('[data-nota-id="' + playerId + '"]').value;
        if (voto) {
          valutazioni.push({
            calciatore_id: playerId,
            voto: parseFloat(voto),
            nota_allenatore: nota || null
          });
        }
      });
      
      showLoading();
      try {
        await apiFetch('/partite/' + mid + '/valutazioni', {
          method: 'POST',
          body: JSON.stringify({ valutazioni })
        });
        modal.close();
        alert('✅ Valutazioni salvate!');
      } catch (e) {
        alert('Errore: ' + e.message);
      } finally {
        hideLoading();
      }
    });
  } catch (err) {
    document.getElementById('valutazioniInner').innerHTML = '<div class="error-box">Errore: ' + err.message + '</div>';
  }
}

function renderDistinta(d, staff) {
  const c = document.getElementById('distintaInner');
  if (!c) return;
  
  // Ordina: titolari per numero maglia, poi riserve per numero maglia
  const t = (d.formazione || []).sort((a, b) => {
    const aIsTit = a.posizione === 'Titolare' ? 0 : 1;
    const bIsTit = b.posizione === 'Titolare' ? 0 : 1;
    if (aIsTit !== bIsTit) return aIsTit - bIsTit;
    return (a.numeroMaglia || 99) - (b.numeroMaglia || 99);
  });
  const dt = new Date(d.partita.dataOra);
  const s = staff || {};
  const righe = [];
  
  for (let i = 0; i < 24; i++) {
    if (i < t.length) {
      const f = t[i];
      righe.push('<tr class="' + (f.capitano ? 'capitano' : f.viceCapitano ? 'vice' : '') + '">' +
        '<td style="border:none;font-size:7px;">' + (i + 1) + '</td>' +
        '<td>' + (f.numeroMaglia || '-') + '</td>' +
        '<td>' + (f.dataNascita ? formatDateShort(f.dataNascita) : '-') + '</td>' +
        '<td style="text-align:left;">' + (f.cognome || '').toUpperCase() + ' ' + (f.nome || '') + '</td>' +
        '<td>' + (f.capitano ? 'CAP' : f.viceCapitano ? 'V.CAP' : '') + '</td>' +
        '<td>' + (f.matricolaFigc || '-') + '</td>' +
        '<td>' + (f.tipoDocumento || '-') + '</td>' +
        '<td>' + (f.numeroDocumento || '-') + '</td>' +
        '<td>' + (f.rilasciatoDa || '-') + '</td>' +
        '<td></td><td></td></tr>');
    } else {
      righe.push('<tr><td style="border:none;font-size:7px;">' + (i + 1) + '</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>');
    }
  }
  
  const societa = window.YFM.getSocietaName ? window.YFM.getSocietaName() : (d.societa || 'La tua Società');
  
  // Costruisci le righe dello staff – TUTTI i ruoli, anche se vuoti
  const staffRows = [
    { label: 'Dirigente accompagnatore', nome: s.dirigente, matricola: s.matricola_dirigente, tessera: s.tessera_lnd_dirigente, tipoTessera: 'Tessera LND' },
    { label: 'Dirigente addetto ufficiali di gara', nome: s.dirigente2, matricola: s.matricola_dirigente2, tessera: s.tessera_lnd_dirigente2, tipoTessera: 'Tessera LND' },
    { label: 'Medico sociale', nome: s.medico, matricola: s.matricola_medico, tessera: s.tessera_lnd_medico, tipoTessera: 'Tessera LND' },
    { label: 'Allenatore', nome: s.allenatore, matricola: s.matricola_allenatore, tessera: s.tessera_figc_allenatore, tipoTessera: 'Tessera FIGC' },
    { label: 'Allenatore in seconda', nome: s.allenatore2, matricola: s.matricola_allenatore2, tessera: s.tessera_figc_allenatore2, tipoTessera: 'Tessera FIGC' },
    { label: 'Massaggiatore', nome: s.massaggiatore, matricola: s.matricola_massaggiatore, tessera: s.tessera_lnd_massaggiatore, tipoTessera: 'Tessera LND' },
    { label: 'Preparatore Atletico', nome: s.preparatore_atletico, matricola: s.matricola_preparatore, tessera: s.tessera_lnd_preparatore, tipoTessera: 'Tessera LND' },
    { label: 'Preparatore Portieri', nome: s.allenatore_portieri, matricola: s.matricola_prep_portieri, tessera: s.tessera_lnd_prep_portieri, tipoTessera: 'Tessera LND' }
  ];

  let staffHtml = '';
  staffRows.forEach(r => {
    let credenziali = '';
    if (r.matricola) credenziali += 'Matr. N° ' + r.matricola;
    if (r.tessera) {
      credenziali += (credenziali ? ' - ' : '') + r.tipoTessera + ' N° ' + r.tessera;
    }
    staffHtml += '<tr><td colspan="7" style="text-align:left;">' + r.label + ': ' + (r.nome || '') + '</td><td colspan="4" style="text-align:right;">' + credenziali + '</td></tr>';
  });
  
  c.innerHTML = 
    '<div class="center"><strong>F.I.G.C. - LEGA NAZIONALE DILETTANTI</strong><br><strong>' + societa + '</strong></div>' +
    '<div style="border:1px solid #333;padding:8px;margin:8px 0;text-align:left;"><strong>Distinta dei giuocatori partecipanti alla gara</strong><br><strong>' + societa + ' - ' + d.partita.avversario + '</strong><br>del campionato <strong>' + d.partita.competizione + '</strong><br>da disputare il <strong>' + dt.toLocaleDateString('it-IT') + ' alle ore ' + dt.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) + (d.partita.giornata ? ' (Giornata ' + d.partita.giornata + ')' : '') + '</strong><br>presso <strong>' + (d.partita.luogo === 'Casa' ? 'Campo di Casa' : 'Campo Trasferta') + '</strong></div>' +
    '<table class="distinta-table"><thead><tr><th></th><th>N.</th><th>Data Nascita</th><th>Cognome e Nome</th><th>Cap/V.Cap</th><th>Matricola FIGC</th><th colspan="3">Documento Identificazione</th><th>Esp.</th><th>Amm.</th></tr><tr><th></th><th></th><th></th><th></th><th></th><th></th><th>Tipo</th><th>Numero</th><th>Rilasciato</th><th></th><th></th></tr></thead><tbody>' + righe.join('') + '<tr><td></td><td colspan="2" style="text-align:left;font-weight:bold;">ASSISTENTE DELL\'ARBITRO</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr></tbody></table>' +
    '<table class="distinta-table staff-section"><tbody>' +
    '<tr><td colspan="11" style="text-align:left;font-weight:bold;background:#f0f0f0;">STAFF</td></tr>' +
    staffHtml +
    '<tr><td colspan="11"> </td></tr>' +
    '<tr><td colspan="11" style="text-align:left;">NOTE .......................................................................................</td></tr>' +
    '</tbody></table>' +
    '<div style="font-size:7px;text-align:left;margin-top:4px;">*obbligatorio per gare nazionali, facoltativo per gare organizzate in ambito regionale e dal settore per l&#39;attività Giovanile e Scolastica. Le persone qui sopra elencate possono essere ammessi solo se munite delle prescritte tessere valide per l&#39;annata in corso.</div>' +
    '<div style="font-size:7px;margin-top:4px;text-align:justify;">Il sottoscritto Dirigente dichiara che i giocatori sopraindicati sono regolarmente tesserati e partecipano alla gara sotto la responsabilità della Società di appartenenza.</div>' +
    '<div class="firme"><div>L\'ARBITRO<br><br>___________________</div><div>IL DIRIGENTE ACCOMPAGNATORE UFFICIALE<br><br>___________________</div></div>';
}

function openStaffForm(mid, cur) {
  const s = cur || {};

  // Carica staff completo dalla squadra via team_staff (già in window.YFM)
  const squadra = window.YFM.getSquadra ? window.YFM.getSquadra() : {};

  // Costruisci registro staff con qualifiche (caricato dall'API team_staff)
  const staffRegistry = [];
  const seen = new Set();

  // Usa i dati staff già caricati nell'endpoint /stagioni/:id/squadre (arricchiti)
  // Fallback: usa i nomi dalla squadra
  ['allenatore','dirigente','dirigente2','preparatore_atletico','allenatore_portieri'].forEach(key => {
    const nome = squadra[key];
    if (nome && !seen.has(nome.toLowerCase())) {
      staffRegistry.push({ id: 'sq_' + key, nome, ruolo: key, matricola: '', tessera: '' });
      seen.add(nome.toLowerCase());
    }
  });

  // Carica staff completo via API (asincrono, aggiorna dropdown)
  apiFetch('/squadre/' + window.YFM.squadraId + '/staff-completo').then(staffData => {
    if (!staffData || !Array.isArray(staffData)) return;
    // Aggiorna dropdown con dati completi
    staffData.forEach(m => {
      if (!seen.has((m.nome + ' ' + m.cognome).toLowerCase())) {
        staffRegistry.push({ id: m.id, nome: m.nome + ' ' + m.cognome, ruolo: m.ruolo_squadra, matricola: m.matricola || '', tessera: m.tessera || '' });
      } else {
        // Aggiorna dati esistenti con matricola/tessera
        const existing = staffRegistry.find(r => r.nome.toLowerCase() === (m.nome + ' ' + m.cognome).toLowerCase());
        if (existing) { existing.matricola = m.matricola || ''; existing.tessera = m.tessera || ''; existing.id = m.id; }
      }
    });
    // Refresh dropdown options
    document.querySelectorAll('.staff-dropdown').forEach(sel => {
      const roleKey = sel.dataset.role;
      const nomeInput = sel.closest('div[style]')?.querySelector('input');
      const nomeVal = nomeInput?.value || '';
      sel.innerHTML = '<option value="">-- Seleziona dallo staff --</option>' +
        staffRegistry.map(m => `<option value="${m.id}" ${m.nome === nomeVal ? 'selected' : ''}>${m.nome}${m.ruolo ? ' (' + m.ruolo + ')' : ''}</option>`).join('') +
        '<option value="__manual__">✏️ Inserisci manualmente</option>';
    });
  }).catch(() => {});

  // Ruoli del form con mapping ai campi
  const ruoli = [
    { key: 'allenatore', label: 'Allenatore', idNome: 'sfAll', idMatr: 'sfMatrAll', idTess: 'sfTessAll', tessType: 'FIGC', matrKey: 'matricola_allenatore', tessKey: 'tessera_figc_allenatore' },
    { key: 'dirigente', label: 'Dirigente Ufficiale', idNome: 'sfDir', idMatr: 'sfMatr', idTess: 'sfTessLND', tessType: 'LND', matrKey: 'matricola_dirigente', tessKey: 'tessera_lnd_dirigente' },
    { key: 'dirigente2', label: '2° Dirigente', idNome: 'sfDir2', idMatr: 'sfMatrDir2', idTess: 'sfTessDir2', tessType: 'LND', matrKey: 'matricola_dirigente2', tessKey: 'tessera_lnd_dirigente2' },
    { key: 'medico', label: 'Medico Sociale', idNome: 'sfMed', idMatr: 'sfMatrMed', idTess: 'sfTessMed', tessType: 'LND', matrKey: 'matricola_medico', tessKey: 'tessera_lnd_medico' },
    { key: 'allenatore2', label: 'All. in Seconda', idNome: 'sfAll2', idMatr: 'sfMatrAll2', idTess: 'sfTessAll2', tessType: 'FIGC', matrKey: 'matricola_allenatore2', tessKey: 'tessera_figc_allenatore2' },
    { key: 'massaggiatore', label: 'Massaggiatore', idNome: 'sfMass', idMatr: 'sfMatrMass', idTess: 'sfTessMass', tessType: 'LND', matrKey: 'matricola_massaggiatore', tessKey: 'tessera_lnd_massaggiatore' },
    { key: 'preparatore_atletico', label: 'Prep. Atletico', idNome: 'sfPrep', idMatr: 'sfMatrPrep', idTess: 'sfTessPrep', tessType: 'LND', matrKey: 'matricola_preparatore', tessKey: 'tessera_lnd_preparatore' },
    { key: 'allenatore_portieri', label: 'Prep. Portieri', idNome: 'sfPort', idMatr: 'sfMatrPort', idTess: 'sfTessPort', tessType: 'LND', matrKey: 'matricola_prep_portieri', tessKey: 'tessera_lnd_prep_portieri' }
  ];

  let formFields = '';
  ruoli.forEach(r => {
    const nomeVal = s[r.key] || '';
    const matrVal = s[r.matrKey] || '';
    const tessVal = s[r.tessKey] || '';
    const options = staffRegistry.map(m =>
      `<option value="${m.id}" ${m.nome === nomeVal ? 'selected' : ''}>${m.nome}${m.ruolo ? ' (' + m.ruolo + ')' : ''}</option>`
    ).join('');

    formFields += `
      <div style="border:1px solid #e2e8f0;border-radius:10px;padding:12px;margin-bottom:10px;background:#f8fafc;">
        <label style="font-size:12px;font-weight:600;color:#334155;margin-bottom:6px;display:block;">${r.label}</label>
        <select class="staff-dropdown" data-role="${r.key}" style="width:100%;padding:6px 10px;border:1px solid #e2e8f0;border-radius:6px;font-size:12px;margin-bottom:8px;">
          <option value="">-- Seleziona dallo staff --</option>
          ${options}
          <option value="__manual__">✏️ Inserisci manualmente</option>
        </select>
        <div class="form-grid" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">
          <div class="form-group" style="margin-bottom:0;"><label style="font-size:10px;">Nome</label><input id="${r.idNome}" value="${nomeVal}" style="font-size:12px;padding:6px 8px;border:1px solid #ddd;border-radius:6px;width:100%;"></div>
          <div class="form-group" style="margin-bottom:0;"><label style="font-size:10px;">Matricola</label><input id="${r.idMatr}" value="${matrVal}" style="font-size:12px;padding:6px 8px;border:1px solid #ddd;border-radius:6px;width:100%;"></div>
          <div class="form-group" style="margin-bottom:0;"><label style="font-size:10px;">Tessera ${r.tessType}</label><input id="${r.idTess}" value="${tessVal}" style="font-size:12px;padding:6px 8px;border:1px solid #ddd;border-radius:6px;width:100%;"></div>
        </div>
      </div>`;
  });

  const content = `<div style="max-height:70vh;overflow-y:auto;">${formFields}</div>`;
  const footer = '<button class="btn btn-secondary" id="modalCancel">Annulla</button><button class="btn btn-primary" id="applyBtn">✅ Applica</button>';
  const modal = createModal('👥 Staff Distinta', content, footer, '750px');

  // Listener dropdown: auto-compila campi
  document.querySelectorAll('.staff-dropdown').forEach(sel => {
    sel.addEventListener('change', () => {
      const roleKey = sel.dataset.role;
      const ruolo = ruoli.find(r => r.key === roleKey);
      if (!ruolo) return;
      const memberId = sel.value;
      if (!memberId || memberId === '__manual__') {
        if (memberId === '__manual__') {
          document.getElementById(ruolo.idNome).value = '';
          document.getElementById(ruolo.idMatr).value = '';
          document.getElementById(ruolo.idTess).value = '';
          document.getElementById(ruolo.idNome).focus();
        }
        return;
      }
      const member = staffRegistry.find(m => m.id === memberId);
      if (member) {
        document.getElementById(ruolo.idNome).value = member.nome || '';
        document.getElementById(ruolo.idMatr).value = member.matricola || '';
        document.getElementById(ruolo.idTess).value = member.tessera || '';
      }
    });
  });

  document.getElementById('applyBtn').addEventListener('click', () => {
    const ns = {
      allenatore: document.getElementById('sfAll').value,
      matricola_allenatore: document.getElementById('sfMatrAll').value,
      tessera_figc_allenatore: document.getElementById('sfTessAll').value,
      dirigente: document.getElementById('sfDir').value,
      matricola_dirigente: document.getElementById('sfMatr').value,
      tessera_lnd_dirigente: document.getElementById('sfTessLND').value,
      dirigente2: document.getElementById('sfDir2').value,
      matricola_dirigente2: document.getElementById('sfMatrDir2').value,
      tessera_lnd_dirigente2: document.getElementById('sfTessDir2').value,
      medico: document.getElementById('sfMed').value,
      matricola_medico: document.getElementById('sfMatrMed').value,
      tessera_lnd_medico: document.getElementById('sfTessMed').value,
      allenatore2: document.getElementById('sfAll2').value,
      matricola_allenatore2: document.getElementById('sfMatrAll2').value,
      tessera_figc_allenatore2: document.getElementById('sfTessAll2').value,
      massaggiatore: document.getElementById('sfMass').value,
      matricola_massaggiatore: document.getElementById('sfMatrMass').value,
      tessera_lnd_massaggiatore: document.getElementById('sfTessMass').value,
      preparatore_atletico: document.getElementById('sfPrep').value,
      matricola_preparatore: document.getElementById('sfMatrPrep').value,
      tessera_lnd_preparatore: document.getElementById('sfTessPrep').value,
      allenatore_portieri: document.getElementById('sfPort').value,
      matricola_prep_portieri: document.getElementById('sfMatrPort').value,
      tessera_lnd_prep_portieri: document.getElementById('sfTessPort').value
    };
    modal.close();
    openDistinta(mid, ns);
  });
}

function createModal(title, content, footer, maxW = '600px') {
  const existing = document.getElementById('currentModal');
  if (existing) existing.remove();
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'currentModal';
  modal.innerHTML = '<div class="modal-content" style="max-width:' + maxW + ';"><div class="modal-header"><h2>' + title + '</h2><button class="modal-close-btn" id="modalCloseX">×</button></div><div class="modal-body">' + content + '</div>' + (footer ? '<div class="modal-footer">' + footer + '</div>' : '') + '</div>';
  document.body.appendChild(modal);
  const close = () => { const m = document.getElementById('currentModal'); if (m) m.remove(); };
  document.getElementById('modalCloseX').addEventListener('click', close);
  modal.addEventListener('click', e => { if (e.target === modal) close(); });
  const cancelBtn = document.getElementById('modalCancel');
  if (cancelBtn) cancelBtn.addEventListener('click', close);
  return { modal, closeModal: close, close };
}
