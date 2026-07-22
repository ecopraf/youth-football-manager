/**
 * capabilities.js - Definizione profili e capabilities utente
 * Usato da: wizard utenti, sidebar, backend (copia in api/helpers/)
 */

export const CAPABILITIES = [
  { id: 'rosa', label: 'Rosa', icon: '📋', desc: 'Gestione giocatori' },
  { id: 'partite', label: 'Partite', icon: '📅', desc: 'Calendario e risultati' },
  { id: 'convocazioni', label: 'Convocazioni', icon: '📣', desc: 'Convocazioni e distinta' },
  { id: 'formazione', label: 'Match Center', icon: '🏟️', desc: 'Formazione, live, note partita' },
  { id: 'allenamenti', label: 'Allenamenti', icon: '🏋️', desc: 'Sedute, presenze, config' },
  { id: 'statistiche', label: 'Statistiche', icon: '📊', desc: 'Visualizzazione stats' },
  { id: 'guest_links', label: 'Link Guest', icon: '🔗', desc: 'Generare link accesso' },
  { id: 'import', label: 'Import', icon: '📥', desc: 'Import da TC/GR/PDF' },
  { id: 'report', label: 'Report', icon: '📄', desc: 'Report PDF' },
  { id: 'quote', label: 'Quote', icon: '💰', desc: 'Gestione quote economiche' },
  { id: 'kit', label: 'Kit', icon: '👕', desc: 'Gestione kit sportivo' },
  { id: 'tesseramento', label: 'Tesseramento', icon: '📋', desc: 'Iscrizioni e documenti atleti' },
  { id: 'inbox', label: 'Inbox', icon: '📬', desc: 'Comunicazioni in entrata' }
];

// categoria: 'gestione' | 'campo' | 'societario' | 'guest'
export const PROFILI = {
  // ── GESTIONE ──────────────────────────────────────────────────────────────
  admin: {
    label: 'Admin', icon: '🔑', categoria: 'gestione',
    capabilities: { rosa: 'write', partite: 'write', convocazioni: 'write', formazione: 'write', allenamenti: 'write', statistiche: 'read', guest_links: 'write', import: 'write', report: 'read', quote: 'write', kit: 'write', tesseramento: 'write', inbox: 'write' }
  },
  segreteria: {
    label: 'Segreteria', icon: '📎', categoria: 'gestione',
    capabilities: { rosa: 'write', partite: 'read', convocazioni: 'read', formazione: '', allenamenti: 'read', statistiche: 'read', guest_links: 'write', import: 'write', report: 'read', quote: 'write', kit: 'write', tesseramento: 'write', inbox: 'write' }
  },
  custom: {
    label: 'Personalizzato', icon: '⚙️', categoria: 'gestione',
    capabilities: {}
  },

  // ── STAFF DI CAMPO ────────────────────────────────────────────────────────
  allenatore: {
    label: 'Allenatore', icon: '⚽', categoria: 'campo',
    capabilities: { rosa: 'write', partite: 'write', convocazioni: 'write', formazione: 'write', allenamenti: 'write', statistiche: 'read', guest_links: '', import: 'write', report: 'read', quote: '', kit: '', tesseramento: '' }
  },
  vice_allenatore: {
    label: 'Vice Allenatore', icon: '🤝', categoria: 'campo',
    capabilities: { rosa: 'read', partite: 'read', convocazioni: 'write', formazione: 'write', allenamenti: 'write', statistiche: 'read', guest_links: '', import: '', report: 'read', quote: '', kit: '', tesseramento: '' }
  },
  preparatore: {
    label: 'Preparatore Atletico', icon: '💪', categoria: 'campo',
    capabilities: { rosa: 'read', partite: '', convocazioni: '', formazione: '', allenamenti: 'write', statistiche: 'read', guest_links: '', import: '', report: '', quote: '', kit: '', tesseramento: '' }
  },
  osservatore: {
    label: 'Osservatore', icon: '👁️', categoria: 'campo',
    capabilities: { rosa: 'read', partite: 'read', convocazioni: '', formazione: '', allenamenti: '', statistiche: 'read', guest_links: '', import: '', report: 'read', quote: '', kit: '', tesseramento: '' }
  },
  dirigente: {
    label: 'Dirigente', icon: '🦺', categoria: 'campo',
    capabilities: { rosa: 'read', partite: 'read', convocazioni: 'write', formazione: 'read', allenamenti: 'write', statistiche: 'read', guest_links: 'write', import: '', report: 'read', quote: '', kit: '', tesseramento: '' }
  },

  // ── DIRIGENZA SOCIETARIA ──────────────────────────────────────────────────
  direttore_sportivo: {
    label: 'Direttore Sportivo', icon: '🏅', categoria: 'societario',
    capabilities: { rosa: 'write', partite: 'read', convocazioni: '', formazione: '', allenamenti: '', statistiche: 'read', guest_links: '', import: '', report: 'read', quote: 'read', kit: 'read', tesseramento: 'read' }
  },
  direttore_tecnico: {
    label: 'Direttore Tecnico', icon: '📐', categoria: 'societario',
    capabilities: { rosa: 'write', partite: 'read', convocazioni: '', formazione: 'read', allenamenti: 'read', statistiche: 'read', guest_links: '', import: '', report: 'read', quote: '', kit: '', tesseramento: 'read' }
  },
  direttore_generale: {
    label: 'Direttore Generale', icon: '🏢', categoria: 'societario',
    capabilities: { rosa: 'read', partite: 'read', convocazioni: 'read', formazione: 'read', allenamenti: 'read', statistiche: 'read', guest_links: 'write', import: '', report: 'read', quote: 'read', kit: 'read', tesseramento: 'read' }
  },
  presidente: {
    label: 'Presidente', icon: '👑', categoria: 'societario',
    capabilities: { rosa: 'read', partite: 'read', convocazioni: 'read', formazione: 'read', allenamenti: 'read', statistiche: 'read', guest_links: '', import: '', report: 'read', quote: 'read', kit: 'read', tesseramento: 'read' }
  },

  // ── GUEST ─────────────────────────────────────────────────────────────────
  atleta: {
    label: 'Atleta', icon: '🏃', categoria: 'guest',
    capabilities: { rosa: '', partite: 'read', formazione: 'read', allenamenti: 'read', statistiche: 'read', guest_links: '', import: '', report: '' }
  },
  genitore: {
    label: 'Genitore', icon: '👨‍👩‍👦', categoria: 'guest',
    capabilities: { rosa: '', partite: 'read', formazione: 'read', allenamenti: '', statistiche: 'read', guest_links: '', import: '', report: '' }
  }
};

/**
 * Estrae le capabilities effettive da user.permessi (retrocompatibile)
 * Supporta sia il vecchio formato {rosa: "write"} che il nuovo {profilo, capabilities}
 */
export function getUserCapabilities(permessi) {
  if (!permessi) return {};
  if (permessi.capabilities) return permessi.capabilities;
  // Fallback: vecchio formato (le chiavi sono direttamente le capabilities)
  const { profilo, capabilities, ...rest } = permessi;
  return rest;
}
