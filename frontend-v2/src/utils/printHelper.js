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
 * Necessario per Blob URL dove i path relativi non funzionano.
 */
function absolutifyImages(html) {
  const base = window.location.origin;
  return html.replace(/(<img[^>]+src=["'])(\/[^"']+)(["'])/gi, (match, pre, path, post) => {
    return pre + base + path + post;
  });
}

/**
 * Stampa su Android: apre nuova finestra con Blob URL
 * Chrome Android blocca print() su about:blank — serve un URL reale.
 */
function printAndroid(html, title) {
  const absHtml = absolutifyImages(html);
  const fullHtml = `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title || 'Stampa'}</title>
<style>
@page { size: A4; margin: 15mm; }
html, body { margin: 0; padding: 0; background: white; font-family: Arial, sans-serif; }
body { padding: 10mm; }
@media print { body { padding: 0; } }
img { max-width: 100%; }
</style>
</head>
<body>
${absHtml}
<script>
window.onload = function() {
  setTimeout(function() { window.print(); }, 500);
};
<\/script>
</body>
</html>`;

  const blob = new Blob([fullHtml], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');

  if (!win) {
    URL.revokeObjectURL(url);
    printStandard(html, title);
    return;
  }

  // Cleanup blob URL dopo un po'
  setTimeout(() => { URL.revokeObjectURL(url); }, 60000);
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
