// Traduce errori Supabase/Postgres in messaggi user-friendly
const DUPLICATE_MESSAGES = {
  'idx_player_codice_fiscale': 'Esiste già un giocatore con questo Codice Fiscale',
  'users_email_key': 'Esiste già un utente con questa email',
  'team_logo_nome_normalizzato_key': 'Logo già presente per questa squadra',
  'convocation_match_id_team_player_id_key': 'Giocatore già convocato per questa partita',
  'match_statistics_match_id_team_player_id_key': 'Statistiche già registrate per questo giocatore in questa partita',
  'training_attendance_training_id_team_player_id_key': 'Presenza già registrata per questo allenamento',
  'team_staff_team_id_staff_id_ruolo_squadra_key': 'Staff già assegnato con questo ruolo'
};

function handleDbError(error, res) {
  if (error.code === '23505' || (error.message && error.message.includes('duplicate key'))) {
    const constraint = Object.keys(DUPLICATE_MESSAGES).find(k => error.message?.includes(k));
    const msg = constraint ? DUPLICATE_MESSAGES[constraint] : 'Record già esistente';
    return res.status(409).json({ error: msg });
  }
  return res.status(400).json({ error: error.message });
}

module.exports = { handleDbError };
