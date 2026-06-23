import { apiFetch } from '../../services/api';
import { formatDate } from '../../utils/formatters';

export async function openMatchDetail(mid) {
  const content = '<div id="detailInner"><div class="loading"><div class="spinner"></div>Caricamento...</div></div>';
  const footer = '<button class="btn btn-secondary" id="modalCancel">Chiudi</button>';
  const modal = createModal('📋 Dettaglio Partita', content, footer, '900px');

  try {
    const d = await apiFetch('/partite/' + mid + '/dettaglio');
    const p = d.partita;
    const eventi = d.eventi || [];
    const golCasa = d.golCasa || 0;
    const golOspiti = d.golOspiti || 0;
    const ammonizioni = eventi.filter(e => e.tipo === 'YELLOW').length;
    const espulsioni = eventi.filter(e => e.tipo === 'RED').length;
    
    const resultBg = golCasa > golOspiti ? 'linear-gradient(135deg, #27AE60, #2ecc71)' : golCasa === golOspiti ? 'linear-gradient(135deg, #F39C12, #f1c40f)' : 'linear-gradient(135deg, #E74C3C, #c0392b)';
    const resultLabel = golCasa > golOspiti ? 'Vittoria!' : golCasa === golOspiti ? 'Pareggio' : 'Sconfitta';
    const resultIcon = golCasa > golOspiti ? '✅' : golCasa === golOspiti ? '🤝' : '❌';

    let html = '<style>';
    html += '.match-header{background:' + resultBg + ';color:white;padding:20px 16px;border-radius:12px;text-align:center;margin-bottom:16px;}';
    html += '.match-header h2{font-size:20px;margin:0 0 8px 0;}';
    html += '.match-header .score{font-size:40px;font-weight:bold;margin:4px 0;}';
    html += '.match-header .result-label{font-size:18px;margin-top:4px;}';
    html += '.match-header .meta{font-size:12px;opacity:0.9;margin-top:8px;}';
    html += '.match-stats{display:flex;gap:12px;margin-bottom:20px;justify-content:center;}';
    html += '.match-stat{background:#f8f9fa;padding:10px 16px;border-radius:10px;text-align:center;min-width:70px;}';
    html += '.match-stat-val{font-size:22px;font-weight:bold;color:#333;}';
    html += '.match-stat-label{font-size:11px;color:#666;margin-top:2px;}';
    html += '.timeline-title{font-size:13px;font-weight:600;color:#333;margin-bottom:12px;padding-bottom:8px;border-bottom:2px solid #667eea;display:inline-block;}';
    html += '.timeline-container{max-height:450px;overflow-y:auto;padding:0 4px;}';
    html += '.timeline{position:relative;padding:8px 0 24px 28px;}';
    html += '.timeline::before{content:"";position:absolute;left:8px;top:0;bottom:0;width:4px;background:linear-gradient(to bottom,#667eea,#764ba2);border-radius:2px;}';
    html += '.timeline-item{position:relative;margin-bottom:14px;animation:fadeSlideIn 0.4s ease-out both;}';
    html += '@keyframes fadeSlideIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}';
    html += '.timeline-dot{position:absolute;left:-28px;top:6px;width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;box-shadow:0 2px 6px rgba(0,0,0,0.25);z-index:1;}';
    html += '.timeline-content{background:#f8f9fa;padding:12px 14px;border-radius:10px;margin-left:8px;border-left:4px solid #667eea;cursor:pointer;transition:all 0.2s;}';
    html += '.timeline-content:hover{background:#f0f4ff;transform:translateX(3px);}';
    html += '.timeline-content.expanded{background:#f0f4ff;border-left-color:#667eea;}';
    html += '.timeline-header{display:flex;align-items:center;gap:10px;margin-bottom:4px;}';
    html += '.timeline-minute{background:#667eea;color:white;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:600;}';
    html += '.timeline-player{font-weight:600;font-size:14px;color:#222;}';
    html += '.timeline-sub{font-size:12px;color:#666;margin-top:2px;}';
    html += '.timeline-divider{margin:18px 0 14px 0;display:flex;align-items:center;gap:12px;}';
    html += '.timeline-divider::before{content:"";flex:1;height:1px;background:linear-gradient(to right,#ddd,#fff);}';
    html += '.timeline-divider span{font-size:11px;font-weight:700;color:#667eea;padding:4px 14px;background:#f0f4ff;border-radius:12px;text-transform:uppercase;letter-spacing:0.5px;}';
    html += '.event-detail-panel{display:none;background:white;margin:10px 0 0 30px;padding:14px;border-radius:10px;border:1px solid #e0e0e0;box-shadow:0 3px 10px rgba(0,0,0,0.1);}';
    html += '.event-detail-panel.active{display:block;animation:slideDown 0.3s ease-out;}';
    html += '@keyframes slideDown{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}';
    html += '.event-detail-row{display:flex;align-items:center;gap:12px;padding:6px 0;}';
    html += '.event-detail-icon{width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;}';
    html += '.event-detail-info{flex:1;}.event-detail-info strong{display:block;font-size:14px;}.event-detail-info span{font-size:12px;color:#777;}';
    html += '</style>';
    
    html += '<div class="match-header">';
    html += '<h2>' + window.YFM.getSocietaName() + ' vs ' + p.avversario + '</h2>';
    html += '<div class="score">' + golCasa + ' - ' + golOspiti + '</div>';
    html += '<div class="result-label">' + resultIcon + ' ' + resultLabel + '</div>';
    html += '<div class="meta">' + formatDate(p.data_ora) + ' · ' + p.competizione + (p.giornata ? ' · G.' + p.giornata : '') + ' · ' + p.luogo + '</div>';
    html += '</div>';
    
    html += '<div class="match-stats">';
    html += '<div class="match-stat"><div class="match-stat-val" style="color:#27AE60;">' + golCasa + '</div><div class="match-stat-label">Gol</div></div>';
    html += '<div class="match-stat"><div class="match-stat-val" style="color:#F39C12;">' + ammonizioni + '</div><div class="match-stat-label">Amm.</div></div>';
    html += '<div class="match-stat"><div class="match-stat-val" style="color:#E74C3C;">' + espulsioni + '</div><div class="match-stat-label">Esp.</div></div>';
    html += '</div>';
    
    html += '<div class="timeline-title">📋 Cronologia Eventi</div>';
    
    if (eventi.length === 0) {
      html += '<p style="text-align:center;color:#888;padding:30px;font-size:14px;">Nessun evento registrato per questa partita</p>';
    } else {
      const primoTempo = eventi.filter(e => e.minuto <= 45);
      const secondoTempo = eventi.filter(e => e.minuto > 45 && e.minuto <= 90);
      const extraTime = eventi.filter(e => e.minuto > 90);
      
      html += '<div class="timeline-container"><div class="timeline">';
      
      if (primoTempo.length > 0) {
        html += '<div class="timeline-divider"><span>1° Tempo</span></div>';
        primoTempo.forEach(e => {
          const config = getEventConfig(e.tipo);
          html += '<div class="timeline-item">';
          html += '<div class="timeline-dot" style="background:' + config.bgColor + ';">' + config.icon + '</div>';
          html += '<div class="timeline-content" onclick="toggleEventDetail(this)">';
          html += '<div class="timeline-header">';
          html += '<span class="timeline-minute">' + e.minuto + '\'</span>';
          html += '<span class="timeline-player">' + e.principale + '</span>';
          html += '</div>';
          if (e.secondario) {
            html += '<div class="timeline-sub">' + config.label + ': ' + e.secondario + '</div>';
          }
          html += '</div>';
          html += '<div class="event-detail-panel">';
          html += '<div class="event-detail-row">';
          html += '<div class="event-detail-icon" style="background:' + config.bgColor + ';color:white;">' + config.icon + '</div>';
          html += '<div class="event-detail-info"><strong>' + config.fullLabel + '</strong><span>Giocatore: ' + e.principale + '</span></div>';
          html += '</div>';
          if (e.secondario) {
            html += '<div class="event-detail-row">';
            html += '<div class="event-detail-icon" style="background:#3498db;color:white;">🅰️</div>';
            html += '<div class="event-detail-info"><strong>Assist</strong><span>' + e.secondario + '</span></div>';
            html += '</div>';
          }
          html += '</div></div>';
        });
      }
      
      if (secondoTempo.length > 0) {
        html += '<div class="timeline-divider"><span>2° Tempo</span></div>';
        secondoTempo.forEach(e => {
          const config = getEventConfig(e.tipo);
          html += '<div class="timeline-item">';
          html += '<div class="timeline-dot" style="background:' + config.bgColor + ';">' + config.icon + '</div>';
          html += '<div class="timeline-content" onclick="toggleEventDetail(this)">';
          html += '<div class="timeline-header">';
          html += '<span class="timeline-minute">' + e.minuto + '\'</span>';
          html += '<span class="timeline-player">' + e.principale + '</span>';
          html += '</div>';
          if (e.secondario) {
            html += '<div class="timeline-sub">' + config.label + ': ' + e.secondario + '</div>';
          }
          html += '</div>';
          html += '<div class="event-detail-panel">';
          html += '<div class="event-detail-row">';
          html += '<div class="event-detail-icon" style="background:' + config.bgColor + ';color:white;">' + config.icon + '</div>';
          html += '<div class="event-detail-info"><strong>' + config.fullLabel + '</strong><span>Giocatore: ' + e.principale + '</span></div>';
          html += '</div>';
          if (e.secondario) {
            html += '<div class="event-detail-row">';
            html += '<div class="event-detail-icon" style="background:#3498db;color:white;">🅰️</div>';
            html += '<div class="event-detail-info"><strong>Assist</strong><span>' + e.secondario + '</span></div>';
            html += '</div>';
          }
          html += '</div></div>';
        });
      }
      
      if (extraTime.length > 0) {
        html += '<div class="timeline-divider"><span>Extratime</span></div>';
        extraTime.forEach(e => {
          const config = getEventConfig(e.tipo);
          html += '<div class="timeline-item">';
          html += '<div class="timeline-dot" style="background:' + config.bgColor + ';">' + config.icon + '</div>';
          html += '<div class="timeline-content" onclick="toggleEventDetail(this)">';
          html += '<div class="timeline-header">';
          html += '<span class="timeline-minute">' + e.minuto + '\'</span>';
          html += '<span class="timeline-player">' + e.principale + '</span>';
          html += '</div>';
          if (e.secondario) {
            html += '<div class="timeline-sub">' + config.label + ': ' + e.secondario + '</div>';
          }
          html += '</div>';
          html += '<div class="event-detail-panel">';
          html += '<div class="event-detail-row">';
          html += '<div class="event-detail-icon" style="background:' + config.bgColor + ';color:white;">' + config.icon + '</div>';
          html += '<div class="event-detail-info"><strong>' + config.fullLabel + '</strong><span>Giocatore: ' + e.principale + '</span></div>';
          html += '</div>';
          if (e.secondario) {
            html += '<div class="event-detail-row">';
            html += '<div class="event-detail-icon" style="background:#3498db;color:white;">🅰️</div>';
            html += '<div class="event-detail-info"><strong>Assist</strong><span>' + e.secondario + '</span></div>';
            html += '</div>';
          }
          html += '</div></div>';
        });
      }
      
      html += '</div></div>';
    }

    if (p.note_avversario) {
      html += '<div style="margin-top:16px;padding:14px;background:#fff9e6;border-radius:10px;border-left:4px solid #F39C12;"><h4 style="margin:0 0 6px 0;font-size:12px;">📝 Note sulla partita</h4><p style="margin:0;color:#555;font-size:13px;line-height:1.5;white-space:pre-wrap;">' + p.note_avversario + '</p></div>';
    }

    html += '<script>function toggleEventDetail(el){var panel=el.nextElementSibling;if(!panel||!panel.classList.contains("event-detail-panel"))return;var isActive=panel.classList.contains("active");document.querySelectorAll(".event-detail-panel.active").forEach(p=>{p.classList.remove("active");p.previousElementSibling.classList.remove("expanded")});if(!isActive){panel.classList.add("active");el.classList.add("expanded")}}</script>';

    document.getElementById('detailInner').innerHTML = html;
  } catch (err) {
    document.getElementById('detailInner').innerHTML = '<div class="error-box">Errore nel caricamento: ' + err.message + '</div>';
  }
}

function getEventConfig(tipo) {
  const configs = {
    'GOAL': { icon: '⚽', bgColor: '#27AE60', label: 'Assist', fullLabel: 'Goal' },
    'ASSIST': { icon: '🅰️', bgColor: '#3498db', label: 'Da', fullLabel: 'Assist' },
    'YELLOW': { icon: '🟨', bgColor: '#F39C12', label: 'Cartellino', fullLabel: 'Ammunizione' },
    'RED': { icon: '🟥', bgColor: '#E74C3C', label: 'Cartellino', fullLabel: 'Espulsione' }
  };
  return configs[tipo] || { icon: '●', bgColor: '#999', label: '', fullLabel: tipo };
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
