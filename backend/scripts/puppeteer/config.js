/**
 * config.js — Configurazione condivisa per script Puppeteer
 */

module.exports = {
  // URL base (produzione o locale)
  BASE_URL: process.env.YFM_URL || 'https://youth-football-manager.vercel.app',
  LOCAL_URL: 'http://localhost:5173',

  // Credenziali test
  CREDENTIALS: {
    superadmin: { email: 'coppola.raffaele@gmail.com', password: 'raffaele78' },
    allenatore:  { email: 'matteo@urilli.it',           password: 'mister' },
    admin:       { email: 'francesco@annese.it',        password: 'annex' },
  },

  // Viewport
  VIEWPORT: { width: 1280, height: 800 },
  VIEWPORT_MOBILE: { width: 390, height: 844 },

  // Timeout
  TIMEOUT: 15000,

  // Output screenshots
  SCREENSHOTS_DIR: __dirname + '/output/screenshots',

  // Puppeteer path
  PUPPETEER_PATH: '/Users/Raffaele/.npm/_npx/55158e48eb5c59f7/node_modules/puppeteer',
};
