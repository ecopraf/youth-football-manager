import { apiFetch } from '../../services/api';
import { formatDate, getAvatarColor } from '../../utils/formatters';
import { showLoading, hideLoading } from '../../utils/ui';

export async function openConvocation(mid, readOnly) {
  const match = window.YFM.allMatches?.find(m => m.id === mid) || {};
  const isArchiviata = match.archiviata === true || match.archiviata === 'true';
  
  let conv = [];
  let gioc = [];
  
  [conv, gioc] = await Promise.all([
    apiFetch('/partite/' + mid + '/convocazioni').catch(() => []),
    apiFetch('/squadre/' + window.YFM.squadraId + '/calciatori')
  ]);

  const ids = conv.filter(c => c.presente === true).map(c => c.calciatoreId);
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

  const content = `
    <p style="margin-bottom:8px;color:var(--gray);">${formatDate(match.data_ora)}</p>
    <div style="display:flex;gap:8px;margin-bottom:12px;">
      <button class="btn btn-secondary btn-small" id="btnSelAll">✅ Tutti</button>
      <button class="btn btn-secondary btn-small" id="btnDeselAll">❌ Nessuno</button>
      <span style="font-size:12px;color:var(--gray);" id="convCount">${ids.length} convocati</span>
      <span id="convWarning" style="color:#E74C3C;font-weight:600;font-size:12px;display:none;"></span>
    </div>
    ${sorted.map(g => `
      <div class="convocation-item">
        <input type="checkbox" ${ids.includes(g.id) ? 'checked' : ''} data-pid="${g.id}" class="conv-check" style="width:20px;height:20px;cursor:pointer;accent-color:var(--green);">
        <div class="player-avatar" style="width:32px;height:32px;font-size:12px;background:${getAvatarColor(g.nome)};">${g.nome[0]}${g.cognome[0]}</div>
        <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${g.nome} ${g.cognome}</span>
        <span style="color:var(--gray);font-size:13px;white-space:nowrap;">${g.ruolo} · #${g.numeroMaglia}</span>
      </div>
    `).join('')}`;

  const footer = `
    <button class="btn btn-secondary" id="modalCancel">Chiudi</button>
    <button class="btn btn-primary" id="saveBtn">💾 Salva</button>
    <button class="btn btn-primary" id="previewBtn" style="background:#0A1C3A;">📄 Vedi Convocazione</button>`;

  const modal = createModal('📋 Convocazioni - vs ' + (match.avversario || '...'), content, footer, '650px');

  document.getElementById('previewBtn').addEventListener('click', () => {
    const checks = document.querySelectorAll('#currentModal .conv-check:checked');
    const list = [];
    checks.forEach(cb => {
      const row = cb.closest('.convocation-item');
      if (row) {
        const spans = row.querySelectorAll('span');
        const nc = spans[0]?.textContent.trim() || '';
        const rm = spans[1]?.textContent.trim() || '';
        const [nome, ...cognomeParts] = nc.split(' ');
        const cognome = cognomeParts.join(' ') || '';
        const ruolo = rm.split(' · ')[0] || '';
        list.push({ nome, cognome, ruolo });
      }
    });
    if (list.length === 0) { alert('Nessun convocato selezionato.'); return; }
    showConvocationPreview(match, list, false);
  });

  function upd() {
    const checks = document.querySelectorAll('#currentModal .conv-check:checked');
    const c = checks.length;
    document.getElementById('convCount').textContent = c + ' convocati';
    const w = document.getElementById('convWarning'), s = document.getElementById('saveBtn');
    w.style.display = 'none'; s.disabled = false; s.style.opacity = '1';
    if (c > 20) { w.textContent = '⚠️ Max 20!'; w.style.display = 'inline'; s.disabled = true; s.style.opacity = '0.5'; }
    else if (c < 11) { w.textContent = '⚠️ Minimo 11!'; w.style.display = 'inline'; s.disabled = true; s.style.opacity = '0.5'; }
    else if (c < 16) { w.textContent = '⚠️ Solo ' + c; w.style.display = 'inline'; }
  }
  document.querySelectorAll('#currentModal .conv-check').forEach(cb => cb.addEventListener('change', upd));
  document.getElementById('btnSelAll').addEventListener('click', () => {
    document.querySelectorAll('#currentModal .conv-check').forEach(cb => cb.checked = true); upd();
  });
  document.getElementById('btnDeselAll').addEventListener('click', () => {
    document.querySelectorAll('#currentModal .conv-check').forEach(cb => cb.checked = false); upd();
  });
  upd();

  document.getElementById('saveBtn').addEventListener('click', async () => {
    const checks = document.querySelectorAll('#currentModal .conv-check:checked');
    if (checks.length > 20) { alert('⚠️ Max 20 convocabili!'); return; }
    if (checks.length < 11) { alert('⚠️ Minimo 11 calciatori!'); return; }
    if (checks.length < 16 && !confirm('Solo ' + checks.length + ' convocati. Procedere?')) return;
    
    // Raccogli tutte le convocazioni in un array
    const convocazioni = [];
    document.querySelectorAll('#currentModal .conv-check').forEach(cb => {
      convocazioni.push({ calciatoreId: cb.dataset.pid, presente: cb.checked });
    });
    
    showLoading();
    try {
      await apiFetch('/partite/' + mid + '/convocazioni-batch', {
        method: 'POST', body: JSON.stringify({ convocazioni })
      });
      hideLoading(); modal.close(); alert('✅ Convocazioni salvate!');
    } catch (e) {
      hideLoading();
      alert('Errore: ' + e.message);
    }
  });
}

function showConvocationPreview(match, list, isArchiviata = false) {
  list.sort((a, b) => (a.cognome || '').localeCompare(b.cognome || ''));
  const dt = new Date(match.data_ora);
  const ritrovo = new Date(dt.getTime() - 75 * 60000);
  const giorni = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
  const catYear = dt.getFullYear() - 14;
  const campoCasa = window.YFM.facility ? `${window.YFM.facility.nome} - ${window.YFM.facility.indirizzo}, ${window.YFM.facility.citta}` : '';
  const campoInfo = match.luogo === 'Trasferta' ? (match.indirizzo_campo || 'Trasferta') : (campoCasa || 'Casa');
  let html = '';
  
  // Badge archivio se applicabile
  if (isArchiviata) {
    html += '<div style="background:#8B7355;color:white;padding:10px 20px;border-radius:12px;margin-bottom:20px;text-align:center;font-weight:600;">📦 Partita Archiviata</div>';
  }
  
  html += `
    <div class="t1">CONVOCAZIONE</div>
    <div class="t2">${window.YFM.getSocietaName()} - ${catYear}</div>
    <div class="t3">${match.giornata ? 'Giornata ' + match.giornata + ' - ' : ''}${match.competizione || ''}</div>
    <div class="info">Partita: <strong>${window.YFM.getSocietaName()} - ${match.avversario}</strong><br>Campo: <strong>${campoInfo}</strong><br>Alle ore: ${dt.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })} del giorno: <strong>${giorni[dt.getDay()]} ${dt.toLocaleDateString('it-IT')}</strong><br>Ritrovo alle ore: <strong>${ritrovo.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</strong> al Campo di Giuoco</div>
    <table class="list-table" style="border:2px solid #000;border-collapse:collapse;width:100%;"><thead><tr style="background:#f0f0f0;"><th style="border:1px solid #000;padding:5px 8px;">N.</th><th style="border:1px solid #000;padding:5px 8px;">Cognome</th><th style="border:1px solid #000;padding:5px 8px;">Nome</th><th style="border:1px solid #000;padding:5px 8px;">P</th></tr></thead><tbody>`;
  for (let i = 0; i < 25; i++) {
    if (i < list.length) {
      html += `<tr><td style="border:1px solid #000;padding:4px 6px;text-align:center;">${i + 1}</td><td style="border:1px solid #000;padding:4px 6px;">${list[i].cognome.toUpperCase()}</td><td style="border:1px solid #000;padding:4px 6px;">${list[i].nome}</td><td style="border:1px solid #000;padding:4px 6px;text-align:center;">${list[i].ruolo === 'Portiere' ? 'P' : ''}</td></tr>`;
    } else {
      html += `<tr><td style="border:1px solid #000;padding:4px 6px;text-align:center;">${i + 1}</td><td style="border:1px solid #000;padding:4px 6px;"></td><td style="border:1px solid #000;padding:4px 6px;"></td><td style="border:1px solid #000;padding:4px 6px;"></td></tr>`;
    }
  }
  html += '</tbody></table><div class="note">Eventuali assenze vanno comunicate tempestivamente. Si raccomanda il rispetto dell\'orario di convocazione.</div><div class="firma">Il Mister</div>';

  const footer = '<button class="btn btn-secondary" id="modalCancel">Chiudi</button><button class="btn btn-primary" id="printFromPreview">🖨️ Stampa</button>';
  const modal = createModal('📄 Convocazione', '<div id="convPreviewInner">' + html + '</div>', footer, '900px');
  document.getElementById('printFromPreview').addEventListener('click', () => {
    const el = document.getElementById('convPreviewInner');
    if (el) {
      const w = window.open('', '_blank', 'width=800,height=600');
      w.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Convocazione</title><style>@page{margin:10mm;size:A4 portrait}body{font-family:Arial,sans-serif;margin:0;padding:8mm;}.t1{text-align:center;font-size:18px;font-weight:bold;margin-bottom:2mm;}.t2{text-align:center;font-size:15px;font-weight:bold;margin-bottom:1mm;}.t3{text-align:center;font-size:14px;font-weight:bold;margin-bottom:4mm;}.info{font-size:13px;margin-bottom:6mm;line-height:1.6;}.list-table{width:100%;border-collapse:collapse;margin-bottom:6mm;}.list-table td{padding:3px 5px;font-size:13px;border:1px solid #000;}.note{font-weight:bold;font-size:13px;margin-top:4mm;}.firma{margin-top:10mm;text-align:right;font-size:14px;font-weight:bold;}@media print{body{padding:6mm;}}</style></head><body>' + el.innerHTML + '<script>window.onload=function(){window.print();setTimeout(function(){window.close()},500)}<\/script></body></html>');
      w.document.close();
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
  modal.addEventListener('click', e => { if (e.target === modal) close(); });
  const cancelBtn = document.getElementById('modalCancel');
  if (cancelBtn) cancelBtn.addEventListener('click', close);
  return { modal, closeModal: close, close };
}
