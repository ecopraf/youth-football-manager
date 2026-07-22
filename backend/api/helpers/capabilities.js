/**
 * capabilities.js - Definizione profili e capabilities utente (backend)
 * Mirror di frontend-v2/src/utils/capabilities.js
 */

const CAPABILITIES = [
  { id: 'rosa', label: 'Rosa' },
  { id: 'partite', label: 'Partite' },
  { id: 'convocazioni', label: 'Convocazioni' },
  { id: 'formazione', label: 'Match Center' },
  { id: 'allenamenti', label: 'Allenamenti' },
  { id: 'statistiche', label: 'Statistiche' },
  { id: 'guest_links', label: 'Link Guest' },
  { id: 'import', label: 'Import' },
  { id: 'report', label: 'Report' },
  { id: 'quote', label: 'Quote' },
  { id: 'kit', label: 'Kit' },
  { id: 'tesseramento', label: 'Tesseramento' },
  { id: 'inbox', label: 'Inbox' }
];

const PROFILI = {
  segreteria: {
    label: 'Segreteria',
    capabilities: { rosa: 'write', partite: 'read', convocazioni: 'write', formazione: '', allenamenti: 'read', statistiche: 'read', guest_links: 'write', import: 'write', report: 'read', quote: 'write', kit: 'write', tesseramento: 'write', inbox: 'write' }
  },
  atleta: {
    label: 'Atleta',
    capabilities: { rosa: '', partite: 'read', convocazioni: 'read', formazione: 'read', allenamenti: 'read', statistiche: 'read', guest_links: '', import: '', report: '', tesseramento: '' }
  },
  genitore: {
    label: 'Genitore',
    capabilities: { rosa: '', partite: 'read', convocazioni: 'read', formazione: '', allenamenti: '', statistiche: 'read', guest_links: '', import: '', report: '', tesseramento: '' }
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
