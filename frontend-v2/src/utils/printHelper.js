/**
 * PWA-safe print helper.
 * Inietta contenuto HTML in un container nella pagina corrente,
 * usa @media print per nascondere tutto il resto, poi chiama window.print().
 * Nessun iframe, nessun popup, nessun cookie di terze parti.
 *
 * Fix Android: Chrome Android non rispetta bene display:none in @media print
 * per elementi con position:fixed/absolute. Usiamo visibility+height+overflow
 * e rendiamo il container fixed full-page.
 */

const PRINT_CONTAINER_ID = 'yfm-print-container';
const PRINT_STYLE_ID = 'yfm-print-style';

export function printHTML(html, title) {
  // Rimuovi container precedente se esiste
  let container = document.getElementById(PRINT_CONTAINER_ID);
  if (container) container.remove();
  let style = document.getElementById(PRINT_STYLE_ID);
  if (style) style.remove();

  const isMobile = window.innerWidth < 768;
  const mobileScale = isMobile ? `#${PRINT_CONTAINER_ID} { font-size: 90%; }` : '';

  // Crea style @media print — aggressivo per Android
  style = document.createElement('style');
  style.id = PRINT_STYLE_ID;
  style.textContent = `
    @media print {
      @page { size: A4; margin: 15mm; }
      html, body {
        background: white !important;
        background-image: none !important;
        margin: 0 !important;
        padding: 0 !important;
        height: auto !important;
        overflow: visible !important;
      }
      /* Nascondi TUTTO tranne il print container */
      body > *:not(#${PRINT_CONTAINER_ID}) {
        display: none !important;
        visibility: hidden !important;
        height: 0 !important;
        overflow: hidden !important;
        position: absolute !important;
        width: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      /* Anche modali/overlay fixed */
      .modal, .modal-overlay, [class*="modal"], [style*="position: fixed"], [style*="position:fixed"] {
        display: none !important;
        visibility: hidden !important;
        height: 0 !important;
      }
      #${PRINT_CONTAINER_ID} {
        display: block !important;
        visibility: visible !important;
        position: static !important;
        width: 100% !important;
        height: auto !important;
        overflow: visible !important;
        padding: 0 !important;
        margin: 0 !important;
        background: white !important;
        font-size: initial;
        line-height: normal;
      }
      ${mobileScale}
    }
    #${PRINT_CONTAINER_ID} { display: none; }
  `;
  document.head.appendChild(style);

  // Crea container con contenuto — lo mettiamo come PRIMO figlio del body
  container = document.createElement('div');
  container.id = PRINT_CONTAINER_ID;
  container.innerHTML = html;
  document.body.insertBefore(container, document.body.firstChild);

  // Cambia titolo per il nome file PDF
  const origTitle = document.title;
  if (title) document.title = title;

  // Cleanup dopo che il dialogo stampa è chiuso
  const cleanup = () => {
    window.removeEventListener('afterprint', cleanup);
    document.title = origTitle;
    container.remove();
    style.remove();
  };
  window.addEventListener('afterprint', cleanup);

  // Stampa
  window.print();
}
