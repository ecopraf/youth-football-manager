/**
 * Team Access Validation Helper
 * Verifica che un team_id appartenga al workspace dell'utente autenticato.
 * Cache in-memory (TTL 5min) per evitare query ripetute.
 */

// Cache: teamId → workspaceId (TTL 5 min)
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

/**
 * Valida che il team appartenga al workspace dell'utente.
 * @returns {string|null} workspaceId se valido, null se team non trovato
 * @throws {Error} se l'utente non ha accesso
 */
// Cache: teamId → { workspaceId, categoryId } (TTL 5 min)
function getCachedTeamInfo(teamId) {
  const entry = cache.get(teamId);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) { cache.delete(teamId); return null; }
  return entry;
}

async function resolveTeamInfo(supabase, teamId) {
  const cached = getCachedTeamInfo(teamId);
  if (cached) return cached;

  const { data: team } = await supabase
    .from('team')
    .select('season_id, category_id')
    .eq('id', teamId)
    .single();
  if (!team) throw new Error('Team non trovato');

  const { data: season } = await supabase
    .from('season')
    .select('workspace_id')
    .eq('id', team.season_id)
    .single();
  if (!season) throw new Error('Stagione non trovata');

  const info = { workspaceId: season.workspace_id, categoryId: team.category_id, ts: Date.now() };
  cache.set(teamId, info);
  return info;
}

async function validateTeamAccess(supabase, user, teamId) {
  if (!teamId) return null;
  if (user.is_superadmin) return 'superadmin';

  const { workspaceId, categoryId } = await resolveTeamInfo(supabase, teamId);

  // Guest: verifica che il team appartenga a una categoria consentita
  if (user.isGuest) {
    const allowed = user.squadre_accesso || [];
    if (allowed.length > 0 && categoryId && !allowed.includes(categoryId)) {
      throw new Error('Accesso al team negato: categoria non consentita');
    }
    return workspaceId;
  }

  // Utenti normali: verifica workspace
  if (user.workspace_id && user.workspace_id !== workspaceId) {
    throw new Error('Accesso al team negato: workspace diverso');
  }

  return workspaceId;
}

/**
 * Express middleware factory — estrae teamId da params, query o body e valida.
 */
function teamAccessMiddleware(supabase) {
  return async (req, res, next) => {
    const teamId = req.params.teamId || req.query.team_id || req.body?.team_id;
    if (!teamId) return next(); // nessun team da validare
    try {
      await validateTeamAccess(supabase, req.user, teamId);
      next();
    } catch (err) {
      return res.status(403).json({ error: err.message });
    }
  };
}

module.exports = { validateTeamAccess, teamAccessMiddleware };
