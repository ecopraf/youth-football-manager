/**
 * capabilities.js - Definizione profili e capabilities utente (backend)
 * Mirror di frontend-v2/src/utils/capabilities.js
 */

const CAPABILITIES = [
  { id: 'rosa', label: 'Rosa' },
  { id: 'partite', label: 'Partite' },
  { id: 'formazione', label: 'Formazione' },
  { id: 'allenamenti', label: 'Allenamenti' },
  { id: 'statistiche', label: 'Statistiche' },
  { id: 'guest_links', label: 'Link Guest' },
  { id: 'import', label: 'Import' },
  { id: 'report', label: 'Report' }
];

/**
 * Estrae le capabilities effettive da user.permessi (retrocompatibile)
 */
function getUserCapabilities(permessi) {
  if (!permessi) return {};
  if (permessi.capabilities) return permessi.capabilities;
  const { profilo, capabilities, ...rest } = permessi;
  return rest;
}

module.exports = { CAPABILITIES, getUserCapabilities };
