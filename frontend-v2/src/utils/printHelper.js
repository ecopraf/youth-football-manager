/**
 * PWA-safe print helper.
 *
 * Strategia:
 * - iOS/Desktop: @media print nasconde tutto tranne il print container (funziona bene)
 * - Android Chrome: @media print non basta — il browser stampa la modale visibile.
 *   Soluzione: prima di window.print(), nascondiamo FISICAMENTE tutti gli elementi
 *   del body (display:none inline) e mostriamo solo il print container.
 *   Dopo afterprint, ripristiniamo tutto.
 */

const PRINT_CONTAINER_ID = 'yfm-print-container';
const PRINT_STYLE_ID = 'yfm-print-style';

function isAndroid() {
  return /android/i.test(navigator.userAgent);
}

export function printHTML(html, title) {
  // Rimuovi container precedente se esiste
  let container = document.getElementById(PRINT_CONTAINER_ID);
  if (container) container.remove();
  let style = document.getElementById(PRINT_STYLE_ID);
  if (style) style.remove();

  const isMobile = window.innerWidth < 768;
  const mobileScale = isMobile ? `#${PRINT_CONTAINER_ID} { font-size: 90%; }` : '';

  // Crea style
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
      body > *:not(#${PRINT_CONTAINER_ID}) {
        display: none !important;
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
      }
      ${mobileScale}
    }
    #${PRINT_CONTAINER_ID} { display: none; }
  `;
  document.head.appendChild(style);

  // Crea container
  container = document.createElement('div');
  container.id = PRINT_CONTAINER_ID;
  container.innerHTML = html;
  document.body.insertBefore(container, document.body.firstChild);

  // Cambia titolo per il nome file PDF
  const origTitle = document.title;
  if (title) document.title = title;

  // Android: nascondi fisicamente tutti gli altri elementi del body
  let hiddenElements = [];
  if (isAndroid()) {
    const children = document.body.children;
    for (let i = 0; i < children.length; i++) {
      const el = children[i];
      if (el.id === PRINT_CONTAINER_ID || el.id === PRINT_STYLE_ID) continue;
      hiddenElements.push({ el, prevDisplay: el.style.display });
      el.style.display = 'none';
    }
    // Mostra il container (normalmente hidden via CSS)
    container.style.display = 'block';
  }

  // Cleanup
  const cleanup = () => {
    window.removeEventListener('afterprint', cleanup);
    document.title = origTitle;
    // Android: ripristina elementi
    if (hiddenElements.length) {
      hiddenElements.forEach(({ el, prevDisplay }) => {
        el.style.display = prevDisplay;
      });
      hiddenElements = [];
    }
    container.remove();
    style.remove();
  };
  window.addEventListener('afterprint', cleanup);

  // Piccolo delay per Android — assicura che il DOM sia aggiornato prima del print
  if (isAndroid()) {
    requestAnimationFrame(() => {
      window.print();
    });
  } else {
    window.print();
  }
}
