/**
 * Auth Middleware & Permission Helpers
 * Versione allineata a index.js (Luglio 2026)
 */
const jwt = require('jsonwebtoken');
const supabase = require('../db/supabase');
const { PROFILI } = require('../helpers/capabilities');

const JWT_SECRET = process.env.JWT_SECRET || 'yfm-secret-key-change-in-production';

// ── AUTH MIDDLEWARE ──
const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token mancante' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // JWT Guest: capabilities in base al tipo (atleta/genitore)
    if (decoded.isGuest) {
      const guestProfile = PROFILI[decoded.tipo] || {};
      req.user = {
        isGuest: true,
        tipo: decoded.tipo,
        player_id: decoded.player_id || null,
        squadre_accesso: decoded.squadre_accesso || [],
        ruolo: 'guest',
        is_superadmin: false,
        permessi: { profilo: decoded.tipo, capabilities: guestProfile.capabilities || {} }
      };
      return next();
    }

    const { data: user } = decoded.userId === 'superadmin'
      ? { data: { id: 'superadmin', email: decoded.email, nome: decoded.nome, cognome: decoded.cognome, ruolo: 'admin', is_superadmin: true, workspace_id: decoded.workspace_id } }
      : await supabase.from('users').select('*').eq('id', decoded.userId).single();
    if (!user) return res.status(401).json({ error: 'Utente non trovato' });
    if (user.is_active === false) return res.status(401).json({ error: 'Account disattivato' });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token non valido' });
  }
};

// ── PERMISSION HELPERS ──
function hasPermission(user, modulo, livello = 'read') {
  if (user.is_superadmin) return true;
  if (user.ruolo === 'admin') return true;
  if (user.ruolo === 'allenatore') {
    // Allenatore: controlla capabilities se presenti
    const permessi = user.permessi || {};
    const caps = permessi.capabilities || permessi;
    if (!caps || Object.keys(caps).length === 0) return true; // legacy fallback
    const perm = caps[modulo];
    if (!perm) return false;
    if (livello === 'read') return perm === 'read' || perm === 'write';
    return perm === 'write';
  }
  // Guest/Staff: controlla permessi granulari
  const permessi = user.permessi || {};
  const caps = permessi.capabilities || permessi;
  const perm = caps[modulo];
  if (!perm) return false;
  if (livello === 'read') return perm === 'read' || perm === 'write';
  return perm === 'write';
}

function hasSquadraAccess(user, squadraId) {
  if (user.is_superadmin) return true;
  if (user.ruolo === 'admin') return true;
  if (!user.squadre_accesso || user.squadre_accesso.length === 0) return true;
  // squadre_accesso contiene category_id, squadraId può essere team_id o category_id
  return user.squadre_accesso.includes(squadraId);
}

async function checkSquadraAccess(user, squadraId) {
  if (user.is_superadmin || user.ruolo === 'admin') return true;
  if (!user.squadre_accesso || user.squadre_accesso.length === 0) return true;
  // Direct match (squadraId è già un category_id)
  if (user.squadre_accesso.includes(squadraId)) return true;
  // Resolve team_id → category_id
  const { data: team } = await supabase.from('team').select('category_id').eq('id', squadraId).maybeSingle();
  if (team && user.squadre_accesso.includes(team.category_id)) return true;
  return false;
}

function requirePermission(modulo, livello = 'write') {
  return async (req, res, next) => {
    if (!hasPermission(req.user, modulo, livello)) {
      return res.status(403).json({ error: 'Permesso negato' });
    }
    if (req.params.squadraId) {
      const hasAccess = await checkSquadraAccess(req.user, req.params.squadraId);
      if (!hasAccess) return res.status(403).json({ error: 'Accesso alla squadra negato' });
    }
    next();
  };
}

module.exports = { authMiddleware, hasPermission, hasSquadraAccess, requirePermission, JWT_SECRET };
