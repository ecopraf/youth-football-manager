/**
 * capabilities.js - Definizione profili e capabilities utente
 * Usato da: wizard utenti, sidebar, backend (copia in api/helpers/)
 */

export const CAPABILITIES = [
  { id: 'rosa', label: 'Rosa', icon: '📋', desc: 'Gestione giocatori' },
  { id: 'partite', label: 'Partite', icon: '📅', desc: 'Calendario e risultati' },
  { id: 'formazione', label: 'Formazione', icon: '🏟️', desc: 'Convocazioni, formazione, distinta' },
  { id: 'allenamenti', label: 'Allenamenti', icon: '🏋️', desc: 'Sedute, presenze, config' },
  { id: 'statistiche', label: 'Statistiche', icon: '📊', desc: 'Visualizzazione stats' },
  { id: 'guest_links', label: 'Link Guest', icon: '🔗', desc: 'Generare link accesso' },
  { id: 'import', label: 'Import', icon: '📥', desc: 'Import da TC/GR/PDF' },
  { id: 'report', label: 'Report', icon: '📄', desc: 'Report PDF' }
];

export const PROFILI = {
  admin: {
    label: 'Admin',
    icon: '🔑',
    capabilities: { rosa: 'write', partite: 'write', formazione: 'write', allenamenti: 'write', statistiche: 'read', guest_links: 'write', import: 'write', report: 'read' }
  },
  allenatore: {
    label: 'Allenatore',
    icon: '⚽',
    capabilities: { rosa: 'write', partite: 'write', formazione: 'write', allenamenti: 'write', statistiche: 'read', guest_links: 'write', import: 'write', report: 'read' }
  },
  vice_allenatore: {
    label: 'Vice Allenatore',
    icon: '🤝',
    capabilities: { rosa: 'read', partite: 'read', formazione: 'write', allenamenti: 'write', statistiche: 'read', guest_links: '', import: '', report: 'read' }
  },
  dirigente: {
    label: 'Dirigente',
    icon: '👔',
    capabilities: { rosa: 'read', partite: 'read', formazione: 'read', allenamenti: '', statistiche: 'read', guest_links: 'write', import: '', report: 'read' }
  },
  preparatore: {
    label: 'Preparatore Atletico',
    icon: '💪',
    capabilities: { rosa: 'read', partite: '', formazione: '', allenamenti: 'write', statistiche: 'read', guest_links: '', import: '', report: '' }
  },
  osservatore: {
    label: 'Osservatore',
    icon: '👁️',
    capabilities: { rosa: 'read', partite: 'read', formazione: '', allenamenti: '', statistiche: 'read', guest_links: '', import: '', report: 'read' }
  },
  segreteria: {
    label: 'Segreteria',
    icon: '📎',
    capabilities: { rosa: 'write', partite: 'read', formazione: '', allenamenti: '', statistiche: '', guest_links: '', import: '', report: 'read' }
  },
  custom: {
    label: 'Personalizzato',
    icon: '⚙️',
    capabilities: {}
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
