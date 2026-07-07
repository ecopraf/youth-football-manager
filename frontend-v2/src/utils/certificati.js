/**
 * Calcola lo stato dei certificati medici per una lista di giocatori.
 * @param {Array} players - Array di oggetti player con data_visita_medica
 * @param {number} sogliaGiorni - Giorni prima della scadenza per "in scadenza" (default 30)
 * @returns {{ scaduti: Array, inScadenza: Array, validi: Array, mancanti: Array }}
 */
export function calcCertificatiStatus(players, sogliaGiorni = 30) {
  const oggi = new Date();
  oggi.setHours(0, 0, 0, 0);
  const soglia = new Date(oggi);
  soglia.setDate(soglia.getDate() + sogliaGiorni);

  const scaduti = [];
  const inScadenza = [];
  const validi = [];
  const mancanti = [];

  (players || []).forEach(p => {
    if (!p.data_visita_medica) {
      mancanti.push(p);
      return;
    }
    const scadenza = new Date(p.data_visita_medica);
    // La visita medica vale 1 anno dalla data
    scadenza.setFullYear(scadenza.getFullYear() + 1);
    scadenza.setHours(0, 0, 0, 0);

    if (scadenza < oggi) {
      scaduti.push({ ...p, _scadenza: scadenza });
    } else if (scadenza <= soglia) {
      inScadenza.push({ ...p, _scadenza: scadenza });
    } else {
      validi.push({ ...p, _scadenza: scadenza });
    }
  });

  return { scaduti, inScadenza, validi, mancanti };
}

/**
 * Renderizza la card compatta certificati medici con espansione dettaglio.
 * @param {{ scaduti, inScadenza, validi, mancanti }} status
 * @returns {string} HTML
 */
export function renderCertificatiCard(status) {
  const { scaduti, inScadenza, validi, mancanti } = status;
  const total = scaduti.length + inScadenza.length + validi.length + mancanti.length;
  if (total === 0) return '';

  const formatDate = (d) => {
    if (!d) return '';
    const dt = d instanceof Date ? d : new Date(d);
    return (dt.getDate() + '').padStart(2, '0') + '/' + (dt.getMonth() + 1 + '').padStart(2, '0') + '/' + dt.getFullYear();
  };

  const badgeStyle = (bg, color) => `display:inline-flex;align-items:center;gap:4px;padding:6px 12px;border-radius:8px;font-size:13px;font-weight:600;background:${bg};color:${color};cursor:pointer;transition:transform 0.1s;`;

  const playerList = (players, type) => {
    if (!players.length) return '';
    return players.map(p => {
      const nome = `${p.cognome || ''} ${p.nome || ''}`.trim();
      let meta = '';
      if (type === 'mancanti') meta = '<span style="color:#888;font-size:11px;">nessuna visita</span>';
      else if (p._scadenza) meta = `<span style="font-size:11px;color:#888;">${type === 'scaduti' ? 'scaduto' : 'scade'} ${formatDate(p._scadenza)}</span>`;
      return `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid #f5f5f5;"><span style="font-size:13px;">${nome}</span>${meta}</div>`;
    }).join('');
  };

  return `
    <div class="cert-card" style="margin-bottom:16px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
        <span style="font-size:14px;font-weight:700;">🏥 Certificati Medici</span>
        <button class="cert-toggle-btn" style="background:none;border:none;font-size:12px;color:#667eea;cursor:pointer;font-weight:600;">▼ Dettaglio</button>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;">
        <span style="${badgeStyle('#FDEDEE', '#E74C3C')}">🔴 Scaduti (${scaduti.length})</span>
        <span style="${badgeStyle('#FFF8E1', '#F39C12')}">🟡 In Scadenza (${inScadenza.length})</span>
        <span style="${badgeStyle('#E8F8F0', '#27AE60')}">🟢 Validi (${validi.length})</span>
        <span style="${badgeStyle('#F5F5F5', '#666')}">⚪ Mancanti (${mancanti.length})</span>
      </div>
      <div class="cert-detail" style="display:none;margin-top:16px;">
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;">
          ${scaduti.length ? `<div style="background:#FDEDEE;border-radius:10px;padding:12px;"><div style="font-size:12px;font-weight:700;color:#E74C3C;margin-bottom:8px;">🔴 SCADUTI (${scaduti.length})</div>${playerList(scaduti, 'scaduti')}</div>` : ''}
          ${inScadenza.length ? `<div style="background:#FFF8E1;border-radius:10px;padding:12px;"><div style="font-size:12px;font-weight:700;color:#F39C12;margin-bottom:8px;">🟡 IN SCADENZA (${inScadenza.length})</div>${playerList(inScadenza, 'inScadenza')}</div>` : ''}
          ${validi.length ? `<div style="background:#E8F8F0;border-radius:10px;padding:12px;"><div style="font-size:12px;font-weight:700;color:#27AE60;margin-bottom:8px;">🟢 VALIDI (${validi.length})</div>${playerList(validi, 'validi')}</div>` : ''}
          ${mancanti.length ? `<div style="background:#F5F5F5;border-radius:10px;padding:12px;"><div style="font-size:12px;font-weight:700;color:#666;margin-bottom:8px;">⚪ MANCANTI (${mancanti.length})</div>${playerList(mancanti, 'mancanti')}</div>` : ''}
        </div>
      </div>
    </div>`;
}

/**
 * Bind toggle espansione sulla card certificati.
 * Chiamare dopo aver inserito l'HTML nel DOM.
 * @param {HTMLElement} container - Elemento che contiene la card
 */
export function bindCertificatiToggle(container) {
  const btn = container.querySelector('.cert-toggle-btn');
  const detail = container.querySelector('.cert-detail');
  if (!btn || !detail) return;
  btn.addEventListener('click', () => {
    const open = detail.style.display !== 'none';
    detail.style.display = open ? 'none' : 'block';
    btn.textContent = open ? '▼ Dettaglio' : '▲ Nascondi';
  });
}
