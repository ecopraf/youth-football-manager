/**
 * Youth Football Manager - Backend API
 * Versione modulare 3.15
 */

require("dotenv").config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();

// Supabase con keep-alive e timeout esteso
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
  global: { fetch: (url, options) => {
    const agent = new http.Agent({ keepAlive: true, timeout: 60000 });
    return fetch(url, { ...options, agent });
  }}
});
const JWT_SECRET = process.env.JWT_SECRET || 'yfm-secret-key-change-in-production';

// CORS ottimizzato
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'apikey'] }));
app.use(express.json({ limit: '5mb' }));

// Health con warmup
app.get('/api/health', async (req, res) => {
  try { await supabase.from('team').select('id').limit(1); } catch(e) {}
  res.json({ status: 'ok', version: '3.15', modular: true, warm: true, proxy: !!process.env.PROXY_TC_URL });
});

// Test proxy connectivity
app.get('/api/test-proxy', async (req, res) => {
  const proxyUrl = process.env.PROXY_TC_URL;
  if (!proxyUrl) return res.json({ error: 'PROXY_TC_URL not set' });
  try {
    const resp = await fetch(proxyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Proxy-Secret': process.env.PROXY_TC_SECRET || 'yfm-tc-proxy-2026' },
      body: JSON.stringify({ url: 'https://www.tuttocampo.it/Homepage', method: 'GET' })
    });
    const text = await resp.text();
    const json = JSON.parse(text);
    res.json({ ok: true, status: json.status, htmlLen: json.data?.length || 0, cookies: json.cookies?.length || 0 });
  } catch (err) {
    res.json({ ok: false, error: err.message, type: err.constructor.name });
  }
});

app.get('/api/warmup', async (req, res) => {
  try {
    await supabase.from('team').select('id').limit(1);
    res.json({ warm: true, time: new Date().toISOString() });
  } catch(e) {
    res.status(500).json({ warm: false, error: e.message });
  }
});

// ── AUTH MIDDLEWARE ──
const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token mancante' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.isGuest) {
      req.user = { isGuest: true, tipo: decoded.tipo, squadre_accesso: decoded.squadre_accesso || [], ruolo: 'guest', is_superadmin: false, permessi: {} };
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
const { getUserCapabilities } = require('./api/helpers/capabilities');

function hasPermission(user, modulo, livello = 'read') {
  if (user.is_superadmin) return true;
  if (user.ruolo === 'admin') return true;
  if (user.ruolo === 'allenatore') return true;
  const caps = getUserCapabilities(user.permessi);
  const perm = caps[modulo];
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

function hasCategoryAccess(user, categoryId) {
  if (user.is_superadmin) return true;
  if (user.ruolo === 'admin') return true;
  if (!user.squadre_accesso || user.squadre_accesso.length === 0) return true;
  return user.squadre_accesso.includes(categoryId);
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

// ============================================================
// ROUTES - Moduli montati
// ============================================================

const createAuthRouter = require('./routes/auth');
app.use(createAuthRouter({ supabase, JWT_SECRET, authMiddleware, bcrypt, jwt }));

const createWorkspaceRouter = require('./routes/workspace');
app.use(createWorkspaceRouter({ supabase, authMiddleware }));

const createTeamRouter = require('./routes/team');
app.use(createTeamRouter({ supabase, authMiddleware }));

const createTrainingRouter = require('./routes/training');
app.use(createTrainingRouter({ supabase, authMiddleware, requirePermission }));

const createMatchRouter = require('./routes/match');
app.use(createMatchRouter({ supabase, authMiddleware, requirePermission }));

const createStaffRouter = require('./routes/staff');
app.use(createStaffRouter({ supabase, authMiddleware }));

const createAdminRouter = require('./routes/admin');
app.use(createAdminRouter({ supabase, authMiddleware }));

const createStatisticsRouter = require('./routes/statistics');
app.use(createStatisticsRouter({ supabase, authMiddleware }));

const createPlayerRouter = require('./routes/player');
app.use(createPlayerRouter({ supabase, authMiddleware, requirePermission }));

const createRosterRouter = require('./routes/roster');
app.use(createRosterRouter({ supabase, authMiddleware, requirePermission }));

const createImportCalendarioRouter = require('./routes/importCalendario');
app.use(createImportCalendarioRouter({ supabase, authMiddleware, requirePermission }));

const createImportTuttocampoRouter = require('./routes/importTuttocampo');
app.use(createImportTuttocampoRouter({ supabase, authMiddleware, requirePermission }));

const createImportConfirmRouter = require('./routes/importConfirm');
app.use(createImportConfirmRouter({ supabase, authMiddleware, requirePermission }));

const createGazzettaRegionaleRouter = require('./routes/gazzettaRegionale');
app.use(createGazzettaRegionaleRouter({ supabase, authMiddleware }));

const createTournamentRouter = require('./routes/tournament');
app.use(createTournamentRouter({ supabase, authMiddleware, requirePermission }));

const createAbsenceRouter = require('./routes/absence');
app.use(createAbsenceRouter({ supabase, authMiddleware }));

module.exports = app;

// Avvio server locale
if (require.main === module) {
  const PORT = process.env.PORT || 3002;
  app.listen(PORT, () => {
    console.log(`\n🚀 Backend API avviato su http://localhost:${PORT}`);
    console.log(`📡 Health check: http://localhost:${PORT}/api/health\n`);
  });
}
