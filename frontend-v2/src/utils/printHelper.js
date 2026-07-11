/**
 * PWA-safe print helper.
 * Inietta contenuto HTML in un container nella pagina corrente,
 * usa @media print per nascondere tutto il resto, poi chiama window.print().
 * Nessun iframe, nessun popup, nessun cookie di terze parti.
 */

const PRINT_CONTAINER_ID = 'yfm-print-container';
const PRINT_STYLE_ID = 'yfm-print-style';

export function printHTML(html, title) {
  // Rimuovi container precedente se esiste
  let container = document.getElementById(PRINT_CONTAINER_ID);
  if (container) container.remove();
  let style = document.getElementById(PRINT_STYLE_ID);
  if (style) style.remove();

  // Su mobile i browser aggiungono header/footer che rubano ~10mm
  const isMobile = window.innerWidth < 768;
  const mobileScale = isMobile ? `#${PRINT_CONTAINER_ID} { font-size: 90%; }` : '';

  // Crea style @media print
  style = document.createElement('style');
  style.id = PRINT_STYLE_ID;
  style.textContent = `
    @media print {
      body > *:not(#${PRINT_CONTAINER_ID}) { display: none !important; }
      #${PRINT_CONTAINER_ID} { display: block !important; position: absolute; top: 0; left: 0; width: 100%; padding: 0; margin: 0; font-size: initial; line-height: normal; }
      body { padding: 0 !important; margin: 0 !important; }
      ${mobileScale}
    }
    #${PRINT_CONTAINER_ID} { display: none; }
  `;
  document.head.appendChild(style);

  // Crea container con contenuto
  container = document.createElement('div');
  container.id = PRINT_CONTAINER_ID;
  container.innerHTML = html;
  document.body.appendChild(container);

  // Cambia titolo per il nome file PDF
  const origTitle = document.title;
  if (title) document.title = title;

  // Cleanup solo dopo che il dialogo stampa è chiuso
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
