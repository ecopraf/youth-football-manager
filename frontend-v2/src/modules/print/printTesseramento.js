import { apiFetch } from '../../services/api.js';

export default async function printTesseramento() {
  const container = document.getElementById('pageContent');
  const params = window.YFM.pageParams || {};
  const regId = params.id;

  if (!regId) { container.innerHTML = '<p>ID tesseramento mancante</p>'; return; }
  container.innerHTML = '<div class="print-page"><div class="loading"><div class="spinner"></div>Caricamento...</div></div>';

  try {
    const reg = await apiFetch(`/registrations/${regId}`).catch(() => null);
    if (!reg) { container.innerHTML = '<p>Tesseramento non trovato</p>'; return; }

    const workspaceId = window.YFM.activeWorkspaceId || reg.workspace_id;
    let tpl = null;
    if (workspaceId) tpl = await apiFetch(`/workspaces/${workspaceId}/registration-template`).catch(() => null);

    let player = reg.player;
    if (!player && reg.player_id) player = await apiFetch(`/calciatori/${reg.player_id}`).catch(() => null);

    const wsInfo = window.YFM.workspaceInfo || {};
    const wsName = wsInfo.nome || window.YFM.getSocietaName() || '';
    const wsLogo = wsInfo.logo_url || (window.YFM.getWorkspaceLogo ? window.YFM.getWorkspaceLogo() : '');
    const wsIndirizzo = wsInfo.indirizzo || '';
    const wsTelefono = wsInfo.telefono || '';
    const wsEmail = wsInfo.email || '';

    const seasons = window.YFM.accessibleSeasons || [];
    const currentSeason = seasons.find(s => s.id === window.YFM.currentSeasonId);
    const stagioneLabel = currentSeason?.nome || '________';

    const gen = reg.dati_genitore || {};
    const docs = reg.documenti_consegnati || tpl?.documenti_richiesti || [];
    const dataNascita = player?.data_nascita ? new Date(player.data_nascita).toLocaleDateString('it-IT') : '';
    const cognome = (player?.cognome || '').toUpperCase();
    const nome = player?.nome || '';
    const luogo = player?.luogo_nascita || '';
    const cf = player?.codice_fiscale || '';
    const residenza = player?.residenza || '';
    const genNomeCognome = gen.cognome && gen.nome ? `${gen.cognome} ${gen.nome}` : '';
    const citta = wsIndirizzo ? wsIndirizzo.split(',').pop().trim() : '';

    // Inline underline field
    const u = (val, w = '180px') => `<span class="pt-field" style="min-width:${w}">${val || '&nbsp;'}</span>`;

    container.innerHTML = `
      <div class="print-page">
        <style>
.print-toolbar { display: flex; gap: 8px; justify-content: center; padding: 10px; }
.print-doc { max-width: 210mm; margin: 0 auto; padding: 16px 20px; font-family: Arial, sans-serif; font-size: 12.5px; line-height: 1.7; color: #000; }
.print-doc .pt-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.print-doc .pt-header img { height: 60px; object-fit: contain; }
.print-doc .pt-title { text-align: center; font-size: 15px; font-weight: bold; text-transform: uppercase; margin: 12px 0 4px; }
.print-doc .pt-subtitle { text-align: center; font-size: 12px; margin-bottom: 14px; }
.print-doc .pt-sep { border: none; border-top: 2.5px solid #1a237e; margin: 8px 0 14px; }
.print-doc p { margin: 6px 0; }
.print-doc .pt-field { display: inline-block; border-bottom: 1px solid #000; padding: 0 4px; text-align: left; }
.print-doc .pt-docs { margin: 10px 0 10px 4px; }
.print-doc .pt-doc-row { display: flex; align-items: flex-start; gap: 6px; margin: 5px 0; }
.print-doc .pt-chk { display: inline-flex; align-items: center; justify-content: center; width: 13px; height: 13px; min-width: 13px; border: 1.5px solid #000; border-radius: 2px; margin-top: 3px; font-size: 11px; font-weight: 700; line-height: 1; }
.print-doc .pt-firme { display: flex; justify-content: space-between; margin-top: 40px; gap: 16px; }
.print-doc .pt-firma { text-align: center; flex: 1; }
.print-doc .pt-firma-line { border-bottom: 1px solid #000; margin-top: 36px; }
@media print {
  .print-toolbar { display: none !important; }
  .sidebar, .header { display: none !important; }
  .main { margin: 0 !important; padding: 0 !important; }
  .content { padding: 0 !important; }
  .layout { display: block !important; }
  .print-page { padding: 0; max-width: none; }
  .print-doc { border: none; padding: 0; box-shadow: none; }
  @page { size: A4 portrait; margin: 15mm; }
}
@media (max-width: 600px) {
  .print-doc { padding: 12px 14px; font-size: 13px; line-height: 1.6; }
  .print-doc .pt-header img { height: 44px; }
  .print-doc .pt-header { gap: 6px; }
  .print-doc .pt-title { font-size: 14px; }
  .print-doc .pt-field { min-width: 0 !important; width: auto; max-width: 100%; word-break: break-all; }
  .print-doc p { word-wrap: break-word; }
  .print-doc .pt-firme { flex-direction: column; gap: 24px; margin-top: 28px; }
  .print-doc .pt-firma-line { margin-top: 24px; }
}
        </style>

        <div class="print-toolbar">
          <button onclick="window.YFM.navigateTo('registration')" class="btn btn-secondary" style="font-size:13px;">← Torna</button>
          <button onclick="window.print()" class="btn btn-primary" style="font-size:13px;">🖨️ Stampa</button>
        </div>

        <div class="print-doc">
          <div class="pt-header">
            <div>${wsLogo ? `<img src="${wsLogo}" onerror="this.style.display='none'">` : ''}</div>
            <div style="text-align:center;flex:1;">
              <div style="font-size:18px;font-weight:bold;text-transform:uppercase;">${wsName}</div>
              ${wsIndirizzo ? `<div style="font-size:10.5px;color:#333;">${wsIndirizzo}</div>` : ''}
              ${wsTelefono || wsEmail ? `<div style="font-size:10.5px;color:#333;">${[wsTelefono ? 'Tel. ' + wsTelefono : '', wsEmail].filter(Boolean).join(' — ')}</div>` : ''}
            </div>
            <div><img src="/logos/figc-lnd.webp" onerror="this.style.display='none'"></div>
          </div>

          <hr class="pt-sep">

          <div class="pt-title">RICHIESTA DI ISCRIZIONE E TESSERAMENTO</div>
          <div class="pt-subtitle">Stagione Sportiva ${stagioneLabel}</div>

          ${tpl?.intestazione ? `<p style="font-size:11.5px;">${tpl.intestazione.replace(/\n/g, '<br>')}</p>` : ''}

          <p>Cognome e nome del calciatore ${u(cognome + ' ' + nome, '260px')}</p>
          <p>Il/La sottoscritto/a ${u(genNomeCognome, '260px')} padre/madre di</p>
          <p>(indicare cognome e nome del ragazzo) ${u(cognome + ' ' + nome, '260px')}</p>
          <p>nato a ${u(luogo, '200px')} il ${u(dataNascita, '100px')}</p>
          <p>ed è residente a ${u(residenza, '280px')}</p>
          <p>Codice Fiscale ${u(cf, '240px')}</p>
          <p>Recapito telefonico ${u(gen.telefono || '', '200px')}</p>

          <p style="margin-top:12px;">Chiede che il figlio, su indicato, venga iscritto e tesserato presso codesta Associazione Sportiva per la stagione sportiva ${stagioneLabel}</p>

          <p style="margin-top:12px;font-weight:600;">Per il tesseramento allega:</p>
          <div class="pt-docs">
            ${docs.map((d, i) => `
              <div class="pt-doc-row">
                <span class="pt-chk">${d.consegnato ? '✓' : ''}</span>
                <span>${String.fromCharCode(97 + i)}) ${d.nome}${d.nota_eta ? ` <em style="font-size:10.5px;color:#444;">(${d.nota_eta})</em>` : ''}</span>
              </div>
            `).join('')}
          </div>

          <p style="font-size:11px;margin-top:8px;">La mancata consegna di uno dei suddetti documenti — prima dell'inizio dell'attività sportiva — NON permetterà al giocatore di essere tesserato.</p>

          <p style="margin-top:12px;">Ha un altro familiare iscritto? &nbsp;&nbsp; <strong>SÌ</strong> &nbsp;&nbsp;&nbsp;&nbsp; <strong>NO</strong></p>

          <p style="margin-top:10px;font-weight:600;">Estremi del documento di riconoscimento del genitore richiedente:</p>
          <p>Tessera ${u(gen.documento_tipo || '', '80px')} Nr. ${u(gen.documento_numero || '', '100px')} rilasciata il: ${u(gen.documento_rilasciato ? new Date(gen.documento_rilasciato).toLocaleDateString('it-IT') : '', '90px')} da ${u(gen.documento_rilasciato_da || '', '120px')}</p>

          <p style="margin-top:24px;">${u(citta, '120px')}, lì ${u('', '90px')}</p>

          <div class="pt-firme">
            <div class="pt-firma">
              <div style="font-size:11px;">Firma del genitore richiedente</div>
              <div class="pt-firma-line"></div>
            </div>
            <div class="pt-firma">
              <div style="font-size:11px;">Firma del ragazzo</div>
              <div class="pt-firma-line"></div>
            </div>
          </div>
        </div>
      </div>
    `;
    // Set document title for PDF filename
    const anno = player?.data_nascita ? new Date(player.data_nascita).getFullYear() : '';
    document.title = `Tesseramento_${cognome}_${nome}${anno ? '_' + anno : ''}`;
  } catch (e) {
    container.innerHTML = `<p>Errore: ${e.message}</p>`;
  }
}
