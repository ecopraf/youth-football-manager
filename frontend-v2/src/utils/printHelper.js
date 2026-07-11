/**
 * PWA-safe print helper.
 *
 * Strategia:
 * - iOS/Desktop: @media print nella pagina corrente (funziona perfettamente)
 * - Android: window.open() con pagina dedicata contenente SOLO il documento.
 *   Chrome Android fa snapshot della pagina e ignora @media print su SPA,
 *   quindi l'unica soluzione affidabile è stampare da una finestra pulita.
 */

const PRINT_CONTAINER_ID = 'yfm-print-container';
const PRINT_STYLE_ID = 'yfm-print-style';

function isAndroid() {
  return /android/i.test(navigator.userAgent);
}

/**
 * Converte URL relativi delle immagini in URL assoluti.
 * Necessario per la pagina /print.html che potrebbe non risolvere path relativi.
 */
function absolutifyImages(html) {
  const base = window.location.origin;
  return html.replace(/(<img[^>]+src=["'])(\/[^"']+)(["'])/gi, (match, pre, path, post) => {
    return pre + base + path + post;
  });
}

/**
 * Stampa su Android: apre /print.html che legge da sessionStorage.
 * URL mostrato nell'header di stampa: youth-football-manager.vercel.app/print.html
 */
function printAndroid(html, title) {
  const absHtml = absolutifyImages(html);
  sessionStorage.setItem('yfm-print-html', absHtml);
  sessionStorage.setItem('yfm-print-title', title || 'Stampa');
  window.open('/print.html', '_blank');
}

/**
 * Stampa standard (iOS/Desktop): @media print nella pagina corrente
 */
function printStandard(html, title) {
  let container = document.getElementById(PRINT_CONTAINER_ID);
  if (container) container.remove();
  let style = document.getElementById(PRINT_STYLE_ID);
  if (style) style.remove();

  const isMobile = window.innerWidth < 768;
  const mobileScale = isMobile ? `#${PRINT_CONTAINER_ID} { font-size: 90%; }` : '';

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

  container = document.createElement('div');
  container.id = PRINT_CONTAINER_ID;
  container.innerHTML = html;
  document.body.insertBefore(container, document.body.firstChild);

  const origTitle = document.title;
  if (title) document.title = title;

  const cleanup = () => {
    window.removeEventListener('afterprint', cleanup);
    document.title = origTitle;
    container.remove();
    style.remove();
  };
  window.addEventListener('afterprint', cleanup);

  window.print();
}

/**
 * Entry point principale — smista in base al device
 */
export function printHTML(html, title) {
  if (isAndroid()) {
    printAndroid(html, title);
  } else {
    printStandard(html, title);
  }
}
