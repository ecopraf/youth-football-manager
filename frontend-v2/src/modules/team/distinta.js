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
    const data = await apiFetch('/partite/' + mid + '/distinta');
    curStaff = staffOverrides || data.staff || {};
    renderDistinta(data, curStaff);
  } catch (e) {
    document.getElementById('distintaInner').innerHTML = '<div class="error-box">Formazione non disponibile</div>';
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

