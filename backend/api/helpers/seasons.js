/**
 * Season helpers — logica "più recente" al posto di "attiva"
 */

/**
 * Ritorna la stagione più recente dall'array (per nome anno desc).
 * Formato nome atteso: "YYYY/YY" (es. "2026/27")
 * @param {Array} seasons - array di oggetti season con campo `nome`
 * @returns {Object|null} la stagione più recente o null
 */
function getLatestSeason(seasons) {
  if (!seasons || seasons.length === 0) return null;
  return seasons.slice().sort((a, b) => (b.nome || '').localeCompare(a.nome || ''))[0];
}

module.exports = { getLatestSeason };
