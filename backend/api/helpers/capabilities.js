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
  { id: 'report', label: 'Report' },
  { id: 'quote', label: 'Quote' }
];

const PROFILI = {
  segreteria: {
    label: 'Segreteria',
    capabilities: { rosa: 'write', partite: 'read', formazione: 'write', allenamenti: 'read', statistiche: 'read', guest_links: 'write', import: 'write', report: 'read', quote: 'write' }
  },
  atleta: {
    label: 'Atleta',
    capabilities: { rosa: '', partite: 'read', formazione: 'read', allenamenti: 'read', statistiche: 'read', guest_links: '', import: '', report: '' }
  },
  genitore: {
    label: 'Genitore',
    capabilities: { rosa: '', partite: 'read', formazione: 'read', allenamenti: '', statistiche: 'read', guest_links: '', import: '', report: '' }
  }
};

/**
 * Estrae le capabilities effettive da user.permessi (retrocompatibile)
 */
function getUserCapabilities(permessi) {
  if (!permessi) return {};
  if (permessi.capabilities) return permessi.capabilities;
  const { profilo, capabilities, ...rest } = permessi;
  return rest;
}

module.exports = { CAPABILITIES, PROFILI, getUserCapabilities };
