import { apiFetch } from '../../services/api.js';

function showToast(msg, type = 'info') {
  if (window.showToast) { window.showToast(msg, type); return; }
  alert(msg);
}

export default async function loadClub() {
  const c = document.getElementById('pageContent');
  c.innerHTML = '<div class="loading"><div class="spinner"></div>Caricamento...</div>';

  try {
    const wid = window.YFM.workspaceId || window.YFM.activeWorkspaceId;
    const teamId = window.YFM.squadraId;
    const isGuest = !!sessionStorage.getItem('yfm_guest');

    let wsData, staffData, anagrafica, organigramma;
    if (isGuest) {
      wsData = window.YFM.workspaceInfo || {};
      [staffData, anagrafica, organigramma] = await Promise.all([
        apiFetch('/squadre/' + teamId + '/staff-completo').catch(() => []),
        apiFetch('/workspaces/' + wid + '/anagrafica').catch(() => ({})),
        apiFetch('/workspaces/' + wid + '/organigramma').catch(() => [])
      ]);
    } else {
      [wsData, staffData, anagrafica, organigramma] = await Promise.all([
        apiFetch('/auth/workspaces').then(ws => ws.find(w => w.id === wid) || ws[0]),
        apiFetch('/squadre/' + teamId + '/staff-completo').catch(() => []),
        apiFetch('/workspaces/' + wid + '/anagrafica').catch(() => ({})),
        apiFetch('/workspaces/' + wid + '/organigramma').catch(() => [])
      ]);
    }

    renderClub(c, wsData, staffData, anagrafica, wid, organigramma);
  } catch (e) {
    c.innerHTML = '<div class="error-box">Errore: ' + e.message + '</div>';
  }
}

function renderClub(c, ws, staff, anagrafica, wid, organigramma = []) {
  anagrafica = anagrafica || {};
  const canEditAnagrafica = window.YFM.canWrite("rosa") || window.YFM.getUser()?.ruolo === "admin" || window.YFM.getUser()?.is_superadmin;
  const teamName = window.YFM.getSquadraName();
  const logo = ws?.logo_url || '';

  // Raggruppa staff per ruolo non più necessario in club.js — gestito da staff.js

  let html = `<style>
    .club-header { display:flex; align-items:center; gap:16px; margin-bottom:24px; }
    .club-logo { width:64px; height:64px; border-radius:12px; object-fit:contain; background:#f5f5f5; padding:4px; }
    .club-name { font-size:22px; font-weight:700; color:#1a1a2e; }
    .club-team { font-size:14px; color:#667eea; font-weight:500; }
    .club-cards { display:grid; grid-template-columns:repeat(auto-fill, minmax(300px, 1fr)); gap:16px; margin-bottom:24px; }
    .club-card { background:white; border-radius:12px; padding:20px; box-shadow:0 2px 8px rgba(0,0,0,0.06); border:1px solid #eee; }
    .club-card-title { font-size:14px; font-weight:700; color:#1a1a2e; margin-bottom:12px; display:flex; align-items:center; gap:8px; }
    .club-staff-item { display:flex; align-items:center; gap:10px; padding:8px 0; border-bottom:1px solid #f5f5f5; }
    .club-staff-item:last-child { border-bottom:none; }
    .club-staff-avatar { width:36px; height:36px; border-radius:50%; background:linear-gradient(135deg, #667eea, #764ba2); color:white; display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:600; flex-shrink:0; }
    .club-staff-name { font-size:13px; font-weight:600; color:#333; }
    .club-staff-role { font-size:11px; color:#888; }
    .club-info-row { display:flex; align-items:center; gap:8px; padding:6px 0; font-size:13px; color:#555; }
    .club-info-icon { font-size:16px; width:24px; text-align:center; }
    .club-empty { color:#999; font-size:13px; font-style:italic; padding:8px 0; }
    @media (max-width:639px) { .club-cards { grid-template-columns:1fr; } .club-header { flex-direction:column; align-items:flex-start; } }
  </style>`;

  html += `<div class="club-header">
    ${logo ? `<img src="${logo}" class="club-logo" alt="Logo">` : '<div class="club-logo" style="display:flex;align-items:center;justify-content:center;font-size:28px;">🏢</div>'}
    <div>
      <div class="club-name">${ws?.nome_breve || ws?.nome || 'Società'}</div>
      <div class="club-team">${teamName}</div>
    </div>
  </div>`;

  html += '<div class="club-cards">';

  // Riferimenti Societari
  const ag = anagrafica;
  const hasData = ag.indirizzo || ag.telefono || ag.email || ag.matricola_figc || ag.p_iva || ag.colori_sociali || ag.nome_campo;
  html += '<div class="club-card" id="clubAnagraficaCard">';
  html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">';
  html += '<div class="club-card-title" style="margin:0;">\uD83C\uDFE2 Riferimenti Societari</div>';
  if (canEditAnagrafica) html += '<button id="btnEditAnagrafica" style="border:none;background:#667eea15;color:#667eea;border-radius:8px;padding:6px 12px;font-size:12px;font-weight:600;cursor:pointer;">\u270F\uFE0F Modifica</button>';
  html += '</div>';
  if (ag.forma_giuridica || (ws && ws.nome)) html += '<div class="club-info-row"><span class="club-info-icon">\uD83C\uDFDB\uFE0F</span>' + [ws && ws.nome, ag.forma_giuridica].filter(Boolean).join(' ') + '</div>';
  if (ag.colori_sociali) html += '<div class="club-info-row"><span class="club-info-icon">\uD83C\uDFA8</span>' + ag.colori_sociali + (ag.sponsor_tecnico ? ' · ' + ag.sponsor_tecnico : '') + '</div>';
  if (ag.indirizzo) html += '<div class="club-info-row"><span class="club-info-icon">\uD83D\uDCCD</span>' + ag.indirizzo + '</div>';
  if (ag.telefono) html += '<div class="club-info-row"><span class="club-info-icon">\uD83D\uDCDE</span><a href="tel:' + ag.telefono + '" style="color:inherit;text-decoration:none;">' + ag.telefono + '</a></div>';
  if (ag.email) html += '<div class="club-info-row"><span class="club-info-icon">\uD83D\uDCE7</span><a href="mailto:' + ag.email + '" style="color:#667eea;">' + ag.email + '</a></div>';
  if (ag.sito_web) html += '<div class="club-info-row"><span class="club-info-icon">\uD83C\uDF10</span><a href="' + ag.sito_web + '" target="_blank" style="color:#667eea;">' + ag.sito_web + '</a></div>';
  if (ag.facebook) html += '<div class="club-info-row"><span class="club-info-icon">\uD83D\uDCF1</span><a href="' + ag.facebook + '" target="_blank" style="color:#667eea;">Facebook</a></div>';
  if (ag.instagram) html += '<div class="club-info-row"><span class="club-info-icon">\uD83D\uDCF8</span><a href="' + ag.instagram + '" target="_blank" style="color:#667eea;">Instagram</a></div>';
  if (ag.p_iva) html += '<div class="club-info-row"><span class="club-info-icon">\uD83D\uDCBC</span>P.IVA ' + ag.p_iva + '</div>';
  if (ag.codice_fiscale) html += '<div class="club-info-row"><span class="club-info-icon">\uD83D\uDD22</span>C.F. ' + ag.codice_fiscale + '</div>';
  if (ag.sdi) html += '<div class="club-info-row"><span class="club-info-icon">\uD83D\uDCC4</span>SDI ' + ag.sdi + '</div>';
  if (ag.matricola_figc) html += '<div class="club-info-row"><span class="club-info-icon">\u26BD</span>Matricola FIGC ' + ag.matricola_figc + '</div>';
  if (ag.iban) html += '<div class="club-info-row"><span class="club-info-icon">\uD83C\uDFE6</span>IBAN ' + ag.iban + '</div>';
  if (ag.nome_campo) html += '<div class="club-info-row" style="margin-top:8px;padding-top:8px;border-top:1px solid #f0f0f0;"><span class="club-info-icon">\uD83C\uDFDF\uFE0F</span><strong>' + ag.nome_campo + '</strong>' + (ag.indirizzo_campo ? ' — ' + ag.indirizzo_campo : '') + '</div>';
  if (!hasData) html += '<div class="club-empty">Nessun riferimento configurato</div>';
  html += '</div>';

  // Organigramma Societario
  if (organigramma.length > 0 || canEditAnagrafica) {
    html += '<div class="club-card">';
    html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">';
    html += '<div class="club-card-title" style="margin:0;">🏢 Organigramma Societario</div>';
    html += '</div>';
    if (organigramma.length === 0) {
      html += '<div class="club-empty">Nessun membro societario</div>';
    } else {
      organigramma.forEach(s => {
        const initials = ((s.cognome || '')[0] || '') + ((s.nome || '')[0] || '');
        html += `<div class="club-staff-item">
          <div class="club-staff-avatar" style="background:linear-gradient(135deg,#0ea5e9,#0369a1);">${initials.toUpperCase()}</div>
          <div><div class="club-staff-name">${s.cognome} ${s.nome}</div><div class="club-staff-role">${s.ruolo || ''}</div></div>
        </div>`;
      });
    }
    html += '</div>';
  }

  html += '</div>';
  c.innerHTML = html;

  // Bottone modifica anagrafica
  document.getElementById('btnEditAnagrafica')?.addEventListener('click', () => openAnagraficaModal(anagrafica, wid, (saved) => {
    anagrafica = saved;
    renderClub(c, ws, staff, anagrafica, wid, organigramma);
  }));
}

function parseSocietaText(text) {
  const result = {};
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const tcMapping = { 'nome completo': 'nome', 'colori sociali': 'colori_sociali', 'sede': 'indirizzo', 'telefono': 'telefono', 'sito web': 'sito_web', 'sponsor tecnico': 'sponsor_tecnico' };
  const allKeys = [...Object.keys(tcMapping), 'categoria', 'stadio', 'regione', 'fax', 'email secondaria', 'email', 'facebook', 'instagram'];
  let stadioLines = [], inStadio = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i], lineLow = line.toLowerCase();
    if (inStadio) { if (allKeys.some(k => lineLow.startsWith(k))) inStadio = false; else { stadioLines.push(line); continue; } }
    if (/^stadio/i.test(line)) { const v = line.replace(/^stadio\s*/i, '').trim(); if (v) stadioLines.push(v); inStadio = true; continue; }
    if (lineLow.startsWith('email secondaria')) continue;
    if (lineLow.startsWith('email')) { let v = line.substring(5).replace(/^\t+/, '').trim(); if (!v && i+1 < lines.length && !allKeys.some(k => lines[i+1].toLowerCase().startsWith(k))) v = lines[++i].trim(); if (v && v !== '-') result.email = v; continue; }
    if (lineLow.startsWith('facebook')) { let v = line.substring(8).replace(/^\t+/, '').trim(); if (!v && i+1 < lines.length && !allKeys.some(k => lines[i+1].toLowerCase().startsWith(k))) v = lines[++i].trim(); if (v && v !== '-') result.facebook = v; continue; }
    if (lineLow.startsWith('instagram')) { let v = line.substring(9).replace(/^\t+/, '').trim(); if (!v && i+1 < lines.length && !allKeys.some(k => lines[i+1].toLowerCase().startsWith(k))) v = lines[++i].trim(); if (v && v !== '-') result.instagram = v; continue; }
    for (const [key, field] of Object.entries(tcMapping)) {
      if (lineLow.startsWith(key)) { let v = line.substring(key.length).replace(/^\t+/, '').trim(); if (!v && i+1 < lines.length && !allKeys.some(k => lines[i+1].toLowerCase().startsWith(k))) { v = lines[++i].trim(); } if (v && v !== '-') result[field] = v; break; }
    }
  }
  if (stadioLines.length) { result._stadio_nome = stadioLines[0]; if (stadioLines.length > 1) result._stadio_indirizzo = stadioLines.slice(1).join(', '); }
  if (!result.matricola_figc) { const m = text.match(/matricola\s+f\.?i\.?g\.?c\.?\s*[:\-]?\s*(\d+)/i); if (m) result.matricola_figc = m[1]; }
  if (!result.p_iva) { const m = text.match(/p\.?\s*iva\s*[:\-]?\s*(\d{11})/i); if (m) result.p_iva = m[1]; }
  if (!result.codice_fiscale) { const m = text.match(/c\.?\s*f\.?\s*[:\-]?\s*([A-Z0-9]{11,16})/i); if (m && m[1] !== result.p_iva) result.codice_fiscale = m[1]; }
  if (!result.sdi) { const m = text.match(/\bsdi\s*[:\-]?\s*([A-Z0-9]{6,7})\b/i); if (m) result.sdi = m[1].toUpperCase(); }
  if (!result.telefono) { const m = text.match(/tel\.?\s*[:\-]?\s*([0-9][\d\s\/\-]{5,14})/i); if (m) result.telefono = m[1].trim(); }
  if (!result.email) { const m = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/); if (m) result.email = m[0]; }
  if (!result.sito_web) { const m = text.match(/https?:\/\/[^\s,;]+/i); if (m) result.sito_web = m[0]; }
  if (!result.indirizzo) { const m = text.match(/(?:sede[^:]*:|via|viale|piazza|corso)\s+[^,\n]{5,50},\s*[^,\n]{3,30}/i); if (m) result.indirizzo = m[0].replace(/^sede[^:]*:/i, '').trim(); }
  if (!result.forma_giuridica) { const m = text.match(/\b(s\.?s\.?d\.?|a\.?s\.?d\.?|s\.?r\.?l\.?|a\.?r\.?l\.?|s\.?p\.?a\.?|a\.?p\.?s\.?)\b/i); if (m) result.forma_giuridica = m[1].toUpperCase().replace(/\./g, ''); }
  return result;
}

function openAnagraficaModal(ag, wid, onSave) {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:2000;display:flex;align-items:center;justify-content:center;padding:16px;';
  const esc = ag => (ag || '').replace(/"/g, '&quot;');
  const f = id => `<input id="anag_${id}" value="${esc(ag[id])}" style="width:100%;padding:8px 10px;border:1px solid #ddd;border-radius:8px;font-size:13px;box-sizing:border-box;">`;
  const lbl = t => `<label style="font-size:11px;font-weight:600;color:#555;display:block;margin-bottom:3px;">${t}</label>`;
  const sec = t => `<div style="font-size:11px;font-weight:700;color:#667eea;text-transform:uppercase;letter-spacing:.5px;margin:14px 0 6px;">${t}</div>`;
  overlay.innerHTML = `<div style="background:white;border-radius:16px;padding:24px;max-width:500px;width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
    <h2 style="margin:0 0 12px 0;font-size:16px;font-weight:600;">\uD83C\uDFE2 Riferimenti Societari</h2>
    <button id="btnAnagPaste" style="width:100%;padding:8px;border:1px dashed #667eea;border-radius:8px;background:#f5f3ff;color:#667eea;font-size:12px;font-weight:600;cursor:pointer;margin-bottom:10px;">\uD83D\uDCCB Incolla dati societ\u00e0</button>
    <div id="anagPasteArea" style="display:none;margin-bottom:10px;">
      <textarea id="anagPasteInput" rows="5" style="width:100%;border:1px solid #ddd;border-radius:8px;padding:10px;font-size:12px;font-family:monospace;box-sizing:border-box;" placeholder="Incolla qui i dati della societ\u00e0..."></textarea>
      <button id="btnAnagParse" style="margin-top:6px;padding:7px 14px;border:none;border-radius:8px;background:#667eea;color:white;font-size:12px;font-weight:600;cursor:pointer;">\u26A1 Analizza</button>
    </div>
    <div id="anagParseRecap" style="display:none;margin-bottom:10px;"></div>
    <div style="display:grid;gap:8px;">
      ${sec('\uD83C\uDFE2 Societ\u00e0')}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        <div>${lbl('Forma giuridica')}${f('forma_giuridica')}</div>
        <div>${lbl('Matricola FIGC')}${f('matricola_figc')}</div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        <div>${lbl('P.IVA')}${f('p_iva')}</div>
        <div>${lbl('Codice Fiscale')}${f('codice_fiscale')}</div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        <div>${lbl('Codice SDI')}${f('sdi')}</div>
        <div>${lbl('Colori Sociali')}${f('colori_sociali')}</div>
      </div>
      <div>${lbl('IBAN')}${f('iban')}</div>
      <div>${lbl('Sponsor Tecnico')}${f('sponsor_tecnico')}</div>
      ${sec('\uD83D\uDCCD Contatti')}
      <div>${lbl('Sede legale / Indirizzo')}${f('indirizzo')}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        <div>${lbl('Telefono')}${f('telefono')}</div>
        <div>${lbl('Email')}${f('email')}</div>
      </div>
      <div>${lbl('Sito web')}${f('sito_web')}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        <div>${lbl('Facebook')}${f('facebook')}</div>
        <div>${lbl('Instagram')}${f('instagram')}</div>
      </div>
      ${sec('\uD83C\uDFDF\uFE0F Campo di Casa')}
      <div>${lbl('Nome impianto')}${f('nome_campo')}</div>
      <div>${lbl('Indirizzo campo')}${f('indirizzo_campo')}</div>
    </div>
    <div style="display:flex;gap:8px;margin-top:20px;">
      <button id="btnAnagCancel" style="flex:1;padding:10px;border:1px solid #ddd;border-radius:10px;background:#f9fafb;cursor:pointer;font-size:13px;font-weight:600;">Annulla</button>
      <button id="btnAnagSave" style="flex:1;padding:10px;border:none;border-radius:10px;background:#667eea;color:white;cursor:pointer;font-size:13px;font-weight:600;">\uD83D\uDCBE Salva</button>
    </div>
  </div>`;

  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  document.addEventListener('keydown', function esc(e) { if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', esc); } });
  overlay.querySelector('#btnAnagCancel').onclick = () => overlay.remove();

  overlay.querySelector('#btnAnagPaste').onclick = () => {
    const area = overlay.querySelector('#anagPasteArea');
    area.style.display = area.style.display === 'none' ? 'block' : 'none';
    if (area.style.display === 'block') setTimeout(() => overlay.querySelector('#anagPasteInput').focus(), 50);
  };

  overlay.querySelector('#btnAnagParse').onclick = () => {
    const text = overlay.querySelector('#anagPasteInput').value;
    if (!text.trim()) return;
    const parsed = parseSocietaText(text);
    const fieldMap = { forma_giuridica: parsed.forma_giuridica, matricola_figc: parsed.matricola_figc, p_iva: parsed.p_iva, codice_fiscale: parsed.codice_fiscale, sdi: parsed.sdi, colori_sociali: parsed.colori_sociali, sponsor_tecnico: parsed.sponsor_tecnico, indirizzo: parsed.indirizzo, telefono: parsed.telefono, email: parsed.email, sito_web: parsed.sito_web, facebook: parsed.facebook, instagram: parsed.instagram, nome_campo: parsed._stadio_nome, indirizzo_campo: parsed._stadio_indirizzo };
    const labels = { forma_giuridica: 'Forma giuridica', matricola_figc: 'Matricola FIGC', p_iva: 'P.IVA', codice_fiscale: 'C.F.', sdi: 'SDI', colori_sociali: 'Colori', sponsor_tecnico: 'Sponsor', indirizzo: 'Indirizzo', telefono: 'Telefono', email: 'Email', sito_web: 'Sito web', facebook: 'Facebook', instagram: 'Instagram', nome_campo: 'Campo', indirizzo_campo: 'Indirizzo campo' };
    const rows = Object.entries(labels).map(([id, label]) => {
      const val = fieldMap[id];
      return '<div style="display:flex;justify-content:space-between;align-items:center;padding:3px 0;border-bottom:1px solid #f0f0f0;">'
        + '<span style="color:#555;font-size:12px;">' + label + '</span>'
        + (val ? '<span style="font-size:12px;font-weight:500;color:#166534;max-width:200px;text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="' + val + '">' + val + '</span>'
               : '<span style="font-size:11px;color:#bbb;">non trovato</span>')
        + '</div>';
    }).join('');
    const found = Object.values(fieldMap).filter(Boolean).length;
    const recap = overlay.querySelector('#anagParseRecap');
    recap.innerHTML = '<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:12px 14px;">'
      + '<div style="font-size:12px;font-weight:600;color:#166534;margin-bottom:8px;">✅ ' + found + ' campi trovati — controlla e conferma</div>'
      + rows
      + '<div style="display:flex;gap:8px;margin-top:10px;">'
      + '<button id="btnAnagParseCancel" style="flex:1;padding:7px;border:1px solid #ddd;border-radius:8px;background:#f9fafb;font-size:12px;font-weight:600;cursor:pointer;">Annulla</button>'
      + '<button id="btnAnagParseConfirm" style="flex:1;padding:7px;border:none;border-radius:8px;background:#667eea;color:white;font-size:12px;font-weight:600;cursor:pointer;">✓ Applica</button>'
      + '</div></div>';
    recap.style.display = 'block';
    recap.querySelector('#btnAnagParseCancel').onclick = () => { recap.innerHTML = ''; recap.style.display = 'none'; };
    recap.querySelector('#btnAnagParseConfirm').onclick = () => {
      Object.entries(fieldMap).forEach(([id, val]) => { if (val) { const el = overlay.querySelector('#anag_' + id); if (el) el.value = val; } });
      recap.innerHTML = '<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:8px 12px;font-size:12px;color:#166534;">✅ ' + found + ' campi applicati</div>';
      overlay.querySelector('#anagPasteArea').style.display = 'none';
      overlay.querySelector('#btnAnagPaste').innerHTML = '✅ Dati importati';
    };
  };

  overlay.querySelector('#btnAnagSave').onclick = async () => {
    const fields = ['forma_giuridica','matricola_figc','p_iva','codice_fiscale','sdi','iban','colori_sociali','sponsor_tecnico','indirizzo','telefono','email','sito_web','facebook','instagram','nome_campo','indirizzo_campo'];
    const body = {};
    fields.forEach(id => { body[id] = (overlay.querySelector('#anag_' + id)?.value || '').trim() || null; });
    try {
      const saved = await apiFetch('/workspaces/' + wid + '/anagrafica', { method: 'PUT', body: JSON.stringify(body) });
      showToast('Riferimenti salvati', 'success');
      overlay.remove();
      onSave(saved);
    } catch(e) { showToast(e.message || 'Errore salvataggio', 'error'); }
  };
}

