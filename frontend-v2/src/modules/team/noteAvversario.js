import { apiFetch } from '../../services/api';
import { formatDateShort } from '../../utils/formatters';
import { showLoading, hideLoading } from '../../utils/ui';

export async function openNoteAvversario(mid) {
  // Cerca la partita in allMatches, altrimenti carica dall'API
  let match = (window.YFM.allMatches || []).find(m => m.id === mid);
  if (!match) {
    try {
      const resp = await apiFetch('/partite/' + mid + '/dettaglio');
      match = resp.match || {};
    } catch(e) {
      match = {};
    }
  }
  
  const inherited = getNoteAvversario(match);
  const note = match.note_avversario || inherited.text || '';

  const info = (inherited.source && !match.note_avversario)
    ? `<p style="color:var(--gray);font-size:12px;margin-bottom:8px;">[Note ereditate${inherited.source}]</p>`
    : '';

  const content = `
    <p style="margin-bottom:8px;"><strong>${window.YFM.getSocietaName()} vs ${match.avversario}</strong></p>
    ${info}
    <textarea id="noteAvvText" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:8px;min-height:150px;font-size:14px;">${note}</textarea>`;

  const footer = '<button class="btn btn-secondary" id="modalCancel">Chiudi</button><button class="btn btn-primary" id="saveNoteBtn">💾 Salva Note</button>';
  const modal = createModal('📝 Note Avversario', content, footer, '600px');

  document.getElementById('saveNoteBtn').addEventListener('click', async () => {
    const newNote = document.getElementById('noteAvvText').value;
    showLoading();
    try {
      await apiFetch('/partite/' + mid, {
        method: 'PUT',
        body: JSON.stringify({
          dataOra: match.data_ora,
          avversario: match.avversario,
          luogo: match.luogo,
          competizione: match.competizione,
          giornata: match.giornata,
          noteAvversario: newNote
        })
      });
      match.note_avversario = newNote;
      hideLoading();
      modal.close();
      alert('✅ Note salvate!');
    } catch (e) {
      hideLoading();
      alert('Errore: ' + e.message);
    }
  });
}

function getNoteAvversario(match) {
  if (match.note_avversario) return { text: match.note_avversario, source: '' };
  const altre = window.YFM.allMatches.filter(
    m => m.id !== match.id && m.avversario === match.avversario && m.note_avversario
  );
  if (altre.length > 0) {
    return {
      text: altre[0].note_avversario,
      source: ' (dalla partita del ' + formatDateShort(altre[0].data_ora) + ')'
    };
  }
  return { text: '', source: '' };
}

function createModal(title, content, footer, maxW = '600px') {
  const existing = document.getElementById('currentModal');
  if (existing) existing.remove();
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'currentModal';
  modal.innerHTML = `
    <div class="modal-content" style="max-width:${maxW};">
      <div class="modal-header"><h2>${title}</h2><button class="modal-close-btn" id="modalCloseX">×</button></div>
      <div class="modal-body">${content}</div>
      ${footer ? '<div class="modal-footer">' + footer + '</div>' : ''}
    </div>`;
  document.body.appendChild(modal);
  const close = () => { const m = document.getElementById('currentModal'); if (m) m.remove(); };
  document.getElementById('modalCloseX').addEventListener('click', close);
  modal.addEventListener('click', e => { if (e.target === modal) close(); });
  const cancelBtn = document.getElementById('modalCancel');
  if (cancelBtn) cancelBtn.addEventListener('click', close);
  return { modal, closeModal: close, close };
}
