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
  { id: 'tesseramento', label: 'Tesseramento', icon: '📋', desc: 'Iscrizioni e documenti atleti' }
];

export const PROFILI = {
  admin: {
    label: 'Admin',
    icon: '🔑',
    capabilities: { rosa: 'write', partite: 'write', convocazioni: 'write', formazione: 'write', allenamenti: 'write', statistiche: 'read', guest_links: 'write', import: 'write', report: 'read', quote: 'write', kit: 'write', tesseramento: 'write' }
  },
  allenatore: {
    label: 'Allenatore',
    icon: '⚽',
    capabilities: { rosa: 'write', partite: 'write', convocazioni: 'write', formazione: 'write', allenamenti: 'write', statistiche: 'read', guest_links: '', import: 'write', report: 'read', kit: '', tesseramento: 'read' }
  },
  vice_allenatore: {
    label: 'Vice Allenatore',
    icon: '🤝',
    capabilities: { rosa: 'read', partite: 'read', convocazioni: 'write', formazione: 'write', allenamenti: 'write', statistiche: 'read', guest_links: '', import: '', report: 'read', tesseramento: '' }
  },
  dirigente: {
    label: 'Dirigente',
    icon: '👔',
    capabilities: { rosa: 'read', partite: 'read', convocazioni: 'read', formazione: 'read', allenamenti: '', statistiche: 'read', guest_links: 'write', import: '', report: 'read', tesseramento: 'read' }
  },
  preparatore: {
    label: 'Preparatore Atletico',
    icon: '💪',
    capabilities: { rosa: 'read', partite: '', convocazioni: '', formazione: '', allenamenti: 'write', statistiche: 'read', guest_links: '', import: '', report: '', tesseramento: '' }
  },
  osservatore: {
    label: 'Osservatore',
    icon: '👁️',
    capabilities: { rosa: 'read', partite: 'read', convocazioni: '', formazione: '', allenamenti: '', statistiche: 'read', guest_links: '', import: '', report: 'read', tesseramento: '' }
  },
  segreteria: {
    label: 'Segreteria',
    icon: '📎',
    capabilities: { rosa: 'write', partite: 'read', convocazioni: 'write', formazione: '', allenamenti: 'read', statistiche: 'read', guest_links: 'write', import: 'write', report: 'read', quote: 'write', kit: 'write', tesseramento: 'write' }
  },
  custom: {
    label: 'Personalizzato',
    icon: '⚙️',
    capabilities: {}
  },
  atleta: {
    label: 'Atleta',
    icon: '🏃',
    capabilities: { rosa: '', partite: 'read', formazione: 'read', allenamenti: 'read', statistiche: 'read', guest_links: '', import: '', report: '' }
  },
  genitore: {
    label: 'Genitore',
    icon: '👨‍👩‍👦',
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
