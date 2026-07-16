/**
 * checklistAutoUpdate — aggiorna automaticamente un item della checklist
 * quando un evento esterno lo soddisfa (tesseramento, quota, certificato).
 *
 * @param {object} supabase
 * @param {string} playerId
 * @param {string} teamId
 * @param {string} seasonId
 * @param {string} itemKey  — chiave item da spuntare (es. 'tesseramento', 'quota', 'certificato')
 * @param {boolean} done    — true = spunta, false = rimuovi spunta
 */
async function checklistAutoUpdate(supabase, playerId, teamId, seasonId, itemKey, done = true) {
  if (!playerId || !teamId || !seasonId) return;
  try {
    const { data: chk } = await supabase.from('registration_checklist')
      .select('id, items').eq('player_id', playerId).eq('team_id', teamId).eq('season_id', seasonId).single();
    if (!chk) return; // checklist non ancora generata, skip
    const items = (chk.items || []).map(i => i.key === itemKey ? { ...i, done } : i);
    const completamento_pct = items.length ? Math.round(items.filter(i => i.done).length / items.length * 100) : 0;
    await supabase.from('registration_checklist')
      .update({ items, completamento_pct, updated_at: new Date().toISOString() }).eq('id', chk.id);
  } catch (e) {
    // Non bloccare il flusso principale se la checklist fallisce
  }
}

module.exports = { checklistAutoUpdate };
