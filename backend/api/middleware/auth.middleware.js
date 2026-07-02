/**
 * Auth Middleware & Permission Helpers
 * Versione allineata a index.js (Luglio 2026)
 */
const jwt = require('jsonwebtoken');
const supabase = require('../db/supabase');

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

    // JWT Guest: accesso solo in lettura
    if (decoded.isGuest) {
      req.user = {
        isGuest: true,
        tipo: decoded.tipo,
        squadre_accesso: decoded.squadre_accesso || [],
        ruolo: 'guest',
        is_superadmin: false,
        permessi: {}
      };
      return next();
    }

    const { data: user } = await supabase.from('users').select('*').eq('id', decoded.userId).single();
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
  if (user.ruolo === 'allenatore') return true;
  // Staff: controlla permessi granulari
  const permessi = user.permessi || {};
  const perm = permessi[modulo];
  if (!perm) return false;
  if (livello === 'read') return perm === 'read' || perm === 'write';
  return perm === 'write';
}

function hasSquadraAccess(user, squadraId) {
  if (user.is_superadmin) return true;
  if (user.ruolo === 'admin') return true;
  if (!user.squadre_accesso || user.squadre_accesso.length === 0) return true;
  return user.squadre_accesso.includes(squadraId);
}

function requirePermission(modulo, livello = 'write') {
  return (req, res, next) => {
    if (!hasPermission(req.user, modulo, livello)) {
      return res.status(403).json({ error: 'Permesso negato' });
    }
    if (req.params.squadraId && !hasSquadraAccess(req.user, req.params.squadraId)) {
      return res.status(403).json({ error: 'Accesso alla squadra negato' });
    }
    next();
  };
}

module.exports = { authMiddleware, hasPermission, hasSquadraAccess, requirePermission, JWT_SECRET };
