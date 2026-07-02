/**
 * Youth Football Manager - Backend API
 * Versione modulare 3.15
 */

require("dotenv").config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const XLSX = require('xlsx');
const cheerio = require('cheerio');
const https = require('https');
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
  res.json({ status: 'ok', version: '3.15', modular: true, warm: true });
});

// Endpoint warmup dedicato
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
  // squadre_accesso ora contiene category_id — il check diretto per team_id
  // viene fatto nel frontend/endpoint specifici tramite hasCategoryAccess
  return user.squadre_accesso.includes(squadraId);
}

// Verifica accesso per category_id (usato per filtrare squadre)
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

// Export supabase e JWT_SECRET per i moduli
// NOTA: module.exports finale sovrascrive questo, usare require diretto se necessario

// ============================================================
// ROUTES - Integrazione moduli nel file principale
// ============================================================

// Auth routes
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email e password richiesti' });
    
    const { data: users, error } = await supabase.from('users').select('*').eq('email', email.toLowerCase()).eq('is_active', true).single();
    if (error || !users) return res.status(401).json({ error: 'Credenziali non valide' });
    
    const validPassword = await bcrypt.compare(password, users.password_hash);
    if (!validPassword) return res.status(401).json({ error: 'Credenziali non valide' });
    
    const token = jwt.sign({ 
      userId: users.id, 
      email: users.email, 
      ruolo: users.ruolo, 
      workspace_id: users.workspace_id,
      is_superadmin: users.is_superadmin || false
    }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ 
      token, 
      user: { 
        id: users.id, 
        nome: users.nome, 
        cognome: users.cognome, 
        email: users.email, 
        ruolo: users.ruolo, 
        workspace_id: users.workspace_id,
        is_superadmin: users.is_superadmin || false,
        categorie_accesso: users.squadre_accesso || [],
        ruoli: users.ruoli || [],
        permessi: users.permessi || {}
      } 
    });
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
});

// Registrazione: solo admin e superadmin possono creare nuovi utenti
app.post('/api/auth/register', authMiddleware, async (req, res) => {
  try {
    // Verifica permessi: solo admin o superadmin
    if (!req.user.is_superadmin && req.user.ruolo !== 'admin') {
      return res.status(403).json({ error: 'Solo admin possono registrare nuovi utenti' });
    }
    
    const { email, password, nome, cognome, ruolo, workspace_id } = req.body;
    if (!email || !password || !nome || !cognome) return res.status(400).json({ error: 'Tutti i campi sono richiesti' });
    
    // Non permettere la creazione di superadmin
    if (ruolo === 'superadmin' && !req.user.is_superadmin) {
      return res.status(403).json({ error: 'Solo superadmin può creare altri superadmin' });
    }
    
    const { data: existing } = await supabase.from('users').select('id').eq('email', email.toLowerCase()).single();
    if (existing) return res.status(409).json({ error: 'Email già registrata' });
    
    const password_hash = await bcrypt.hash(password, 10);
    const { data: newUser, error } = await supabase.from('users').insert({
      email: email.toLowerCase(), password_hash, nome, cognome, 
      ruolo: ruolo || 'allenatore',
      workspace_id: workspace_id || req.user.workspace_id,
      is_active: true
    }).select().single();
    
    if (error) return res.status(400).json({ error: error.message });
    
    res.status(201).json({ success: true, user: { id: newUser.id, nome: newUser.nome, cognome: newUser.cognome, email: newUser.email, ruolo: newUser.ruolo, workspace_id: newUser.workspace_id } });
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
});

app.get('/api/auth/me', authMiddleware, async (req, res) => {
  res.json(req.user);
});

app.post('/api/auth/logout', authMiddleware, async (req, res) => {
  res.json({ success: true });
});

app.put('/api/auth/profile', authMiddleware, async (req, res) => {
  try {
    const { nome, cognome, telefono } = req.body;
    const { data, error } = await supabase.from('users').update({ nome, cognome, telefono }).eq('id', req.user.id).select().single();
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
});

app.get('/api/auth/users', authMiddleware, async (req, res) => {
  try {
    const workspaceId = req.query.workspace_id;
    let query = supabase.from('users').select('id, nome, cognome, email, ruolo, workspace_id, ruoli, squadre_accesso, permessi, is_superadmin, is_active').eq('is_active', true).order('cognome');
    if (workspaceId) query = query.eq('workspace_id', workspaceId);
    const { data, error } = await query;
    if (error) return res.status(400).json({ error: error.message });
    // Mappa squadre_accesso → categorie_accesso per il frontend
    const users = (data || []).map(u => ({ ...u, categorie_accesso: u.squadre_accesso || [] }));
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
});

app.post('/api/auth/users', authMiddleware, async (req, res) => {
  try {
    const { email, password, nome, cognome, ruolo, workspace_id, ruoli, categorie_accesso, permessi } = req.body;
    const password_hash = await bcrypt.hash(password || 'ChangeMe123!', 10);
    const { data, error } = await supabase.from('users').insert({
      email: email.toLowerCase(), password_hash, nome, cognome,
      ruolo: ruolo || 'admin',
      workspace_id: workspace_id || req.user.workspace_id,
      ruoli: ruoli || [ruolo || 'admin'],
      squadre_accesso: categorie_accesso || [],
      permessi: permessi || {},
      is_active: true
    }).select().single();
    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json({ ...data, categorie_accesso: data.squadre_accesso || [] });
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
});

app.put('/api/auth/users/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, cognome, ruolo, workspace_id, ruoli, categorie_accesso, is_active, permessi } = req.body;
    const updateData = { nome, cognome, ruolo, workspace_id, ruoli, permessi: permessi || {} };
    if (is_active !== undefined) updateData.is_active = is_active;
    if (categorie_accesso !== undefined) updateData.squadre_accesso = categorie_accesso;
    const { data, error } = await supabase.from('users').update(updateData).eq('id', id).select().single();
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true, user: { ...data, categorie_accesso: data.squadre_accesso || [] } });
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
});

app.delete('/api/auth/users/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('users').update({ is_active: false }).eq('id', id);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
});

app.post('/api/auth/guest-link', authMiddleware, async (req, res) => {
  try {
    const { tipo = 'genitore', categorie_accesso = [], scadenza_giorni } = req.body;
    const token = require('crypto').randomBytes(32).toString('hex');
    const hours = scadenza_giorni ? scadenza_giorni * 24 : 720 * 24;
    const scadenza = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase.from('guest_token').insert({
      token, utente_id: req.user.id, tipo, squadre_accesso: categorie_accesso, scadenza
    }).select().single();
    if (error) return res.status(400).json({ error: error.message });
    const link = `${req.headers.origin || 'https://youth-football-manager.vercel.app'}/guest/${data.token}`;
    res.status(201).json({ success: true, token: data.token, scadenza: data.scadenza, tipo: data.tipo, link });
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
});

app.get('/api/auth/guest-links', authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    let query = supabase.from('guest_token').select('*').order('created_at', { ascending: false });
    
    if (user.is_superadmin) {
      // superadmin vede tutto
    } else if (user.ruolo === 'admin') {
      const { data: wsUsers } = await supabase.from('users').select('id').eq('workspace_id', user.workspace_id);
      const userIds = (wsUsers || []).map(u => u.id);
      query = query.in('utente_id', userIds);
    } else {
      query = query.eq('utente_id', user.id);
    }
    
    const { data, error } = await query;
    if (error) return res.status(400).json({ error: error.message });
    
    // Arricchisci con nome creatore
    const utenteIds = [...new Set((data || []).map(t => t.utente_id).filter(Boolean))];
    let utenteMap = {};
    if (utenteIds.length > 0) {
      const { data: utenti } = await supabase.from('users').select('id, nome, cognome').in('id', utenteIds);
      (utenti || []).forEach(u => { utenteMap[u.id] = { nome: u.nome, cognome: u.cognome }; });
    }
    
    const links = (data || []).map(t => ({ ...t, utente: utenteMap[t.utente_id] || null }));
    res.json({ links });
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
});

app.delete('/api/auth/guest-link/:token', authMiddleware, async (req, res) => {
  try {
    const { token } = req.params;
    const { error } = await supabase.from('guest_token').delete().eq('token', token);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
});

app.get('/api/guest/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { data, error } = await supabase.from('guest_token').select('*').eq('token', token).gte('scadenza', new Date().toISOString()).single();
    if (error || !data) return res.status(404).json({ error: 'Link non valido o scaduto' });
    
    // Genera JWT guest per accesso API
    const guestJwt = jwt.sign({
      isGuest: true,
      tipo: data.tipo,
      squadre_accesso: data.squadre_accesso || [],
      guestTokenId: data.id
    }, JWT_SECRET, { expiresIn: '24h' });
    
    res.json({ token: data.token, jwt: guestJwt, tipo: data.tipo, squadre_accesso: data.squadre_accesso });
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
});

// ── WORKSPACE ROUTES ──
app.get('/api/auth/workspaces', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Non autenticato' });
    
    // Recupera utente con is_superadmin
    const { data: user } = await supabase.from('users').select('workspace_id, is_superadmin').eq('id', userId).single();
    if (!user) return res.json([]);
    
    // Superadmin vede TUTTI i workspace, utente normale solo il suo
    let query = supabase.from('workspace').select('id, nome, logo_url');
    
    if (!user.is_superadmin && user.workspace_id) {
      query = query.eq('id', user.workspace_id);
    }
    // Se è superadmin o non ha workspace_id, ritorna tutti i workspace
    
    const { data: workspaces, error } = await query;
    if (error) return res.status(400).json({ error: error.message });
    res.json(workspaces || []);
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
});

app.post('/api/workspaces', authMiddleware, async (req, res) => {
  try {
    if (!req.user.is_superadmin) {
      return res.status(403).json({ error: 'Solo superadmin può creare workspace' });
    }
    const { nome, logo_url, indirizzo, telefono, email, sito_web } = req.body;
    if (!nome) return res.status(400).json({ error: 'Nome richiesto' });
    const { data, error } = await supabase.from('workspace').insert({ nome, logo_url, indirizzo, telefono, email, sito_web }).select().single();
    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
});

app.put('/api/workspaces/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, logo_url, indirizzo, telefono, email, sito_web } = req.body;
    const { data, error } = await supabase.from('workspace').update({ nome, logo_url, indirizzo, telefono, email, sito_web }).eq('id', id).select().single();
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
});

app.delete('/api/workspaces/:id', authMiddleware, async (req, res) => {
  try {
    if (!req.user.is_superadmin) {
      return res.status(403).json({ error: 'Solo superadmin può eliminare workspace' });
    }
    const { id } = req.params;
    const { data: seasons } = await supabase.from('season').select('id').eq('workspace_id', id);
    if (seasons && seasons.length > 0) return res.status(400).json({ error: 'Elimina prima le stagioni associate' });
    const { error } = await supabase.from('workspace').delete().eq('id', id);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
});

app.put('/api/workspaces/:id/logo', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { logo_url } = req.body;
    const { error } = await supabase.from('workspace').update({ logo_url }).eq('id', id);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
});

// ── FACILITY (campo di casa) ──
app.get('/api/workspaces/:id/facility', authMiddleware, async (req, res) => {
  try {
    const { data } = await supabase.from('facility').select('*').eq('workspace_id', req.params.id).eq('is_default', true).maybeSingle();
    res.json(data || null);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/workspaces/:id/facility', authMiddleware, async (req, res) => {
  try {
    const { nome, indirizzo, citta } = req.body;
    const { data: existing } = await supabase.from('facility').select('id').eq('workspace_id', req.params.id).eq('is_default', true).maybeSingle();
    if (existing) {
      const { error } = await supabase.from('facility').update({ nome, indirizzo, citta }).eq('id', existing.id);
      if (error) return res.status(400).json({ error: error.message });
    } else {
      const { error } = await supabase.from('facility').insert({ nome, indirizzo, citta, workspace_id: req.params.id, is_default: true });
      if (error) return res.status(400).json({ error: error.message });
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/workspaces/:id/stagioni', authMiddleware, async (req, res) => {  try {
    const { id } = req.params;
    const { data, error } = await supabase.from('season').select('*').eq('workspace_id', id).order('data_inizio', { ascending: false });
    if (error) return res.status(400).json({ error: error.message });
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
});

app.post('/api/workspaces/:id/stagioni', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, data_inizio, data_fine } = req.body;
    if (!nome || !data_inizio || !data_fine) return res.status(400).json({ error: 'Nome, data inizio e data fine richiesti' });
    const { data, error } = await supabase.from('season').insert({
      workspace_id: id, nome, data_inizio, data_fine, attiva: true
    }).select().single();
    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
});

// ── STAFF PER WORKSPACE (tutti i membri staff del workspace) ──
app.get('/api/workspaces/:id/staff', authMiddleware, async (req, res) => {
  try {
    const wsId = req.params.id;
    const { data: staffData, error } = await supabase.from('staff')
      .select('*')
      .eq('workspace_id', wsId)
      .order('cognome');
    if (error) return res.status(400).json({ error: error.message });
    
    // Arricchisci con categorie assegnate
    const staffIds = (staffData || []).map(s => s.id);
    if (staffIds.length === 0) return res.json([]);
    
    const { data: tsData } = await supabase.from('team_staff').select('staff_id, team_id, ruolo_squadra').in('staff_id', staffIds);
    const { data: categories } = await supabase.from('category').select('id, nome').eq('workspace_id', wsId);
    const { data: seasons } = await supabase.from('season').select('id').eq('workspace_id', wsId);
    const seasonIds = (seasons || []).map(s => s.id);
    const { data: teams } = await supabase.from('team').select('id, category_id').in('season_id', seasonIds.length > 0 ? seasonIds : ['x']);
    
    const catMap = {};
    (categories || []).forEach(c => { catMap[c.id] = c.nome; });
    const teamCatMap = {};
    (teams || []).forEach(t => { teamCatMap[t.id] = t.category_id; });
    
    const result = (staffData || []).map(s => {
      const assignments = (tsData || []).filter(ts => ts.staff_id === s.id);
      const catIds = [...new Set(assignments.map(a => teamCatMap[a.team_id]).filter(Boolean))];
      return {
        ...s,
        categorie: catIds.map(id => ({ id, nome: catMap[id] || '?' })),
        ruolo_squadra: assignments[0]?.ruolo_squadra || s.ruolo
      };
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
});

app.post('/api/workspaces/:id/staff', authMiddleware, async (req, res) => {
  try {
    const wsId = req.params.id;
    const { nome, cognome, ruolo, telefono, email, qualifiche, categorie_ids } = req.body;
    
    const { data: staff, error } = await supabase.from('staff').insert({
      nome, cognome, ruolo, telefono, email, qualifiche: qualifiche || {}, workspace_id: wsId
    }).select().single();
    if (error) return res.status(400).json({ error: error.message });
    
    // Assegna alle categorie (team_staff)
    if (categorie_ids && categorie_ids.length > 0) {
      const { data: seasons } = await supabase.from('season').select('id').eq('workspace_id', wsId);
      const seasonIds = (seasons || []).map(s => s.id);
      const { data: teams } = await supabase.from('team').select('id, category_id').in('season_id', seasonIds);
      
      const inserts = [];
      categorie_ids.forEach(catId => {
        const team = (teams || []).find(t => t.category_id === catId);
        if (team) inserts.push({ staff_id: staff.id, team_id: team.id, ruolo_squadra: ruolo });
      });
      if (inserts.length > 0) await supabase.from('team_staff').insert(inserts);
    }
    
    res.status(201).json({ success: true, staff });
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
});

app.put('/api/staff/:id', authMiddleware, async (req, res) => {
  try {
    const { nome, cognome, ruolo, telefono, email, qualifiche, categorie_ids, workspace_id } = req.body;
    
    const updateData = { nome, cognome, ruolo, telefono, email, qualifiche: qualifiche || {} };
    const { data: staff, error } = await supabase.from('staff').update(updateData).eq('id', req.params.id).select().single();
    if (error) return res.status(400).json({ error: error.message });
    
    // Aggiorna assegnazioni categorie
    if (categorie_ids !== undefined && workspace_id) {
      const { data: seasons } = await supabase.from('season').select('id').eq('workspace_id', workspace_id);
      const seasonIds = (seasons || []).map(s => s.id);
      const { data: teams } = await supabase.from('team').select('id, category_id').in('season_id', seasonIds);
      const teamIds = (teams || []).map(t => t.id);
      
      // Rimuovi vecchie assegnazioni per questo workspace
      await supabase.from('team_staff').delete().eq('staff_id', req.params.id).in('team_id', teamIds);
      
      // Inserisci nuove
      const inserts = [];
      categorie_ids.forEach(catId => {
        const team = (teams || []).find(t => t.category_id === catId);
        if (team) inserts.push({ staff_id: req.params.id, team_id: team.id, ruolo_squadra: ruolo });
      });
      if (inserts.length > 0) await supabase.from('team_staff').insert(inserts);
    }
    
    res.json({ success: true, staff });
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
});

app.delete('/api/staff/:id', authMiddleware, async (req, res) => {
  try {
    await supabase.from('team_staff').delete().eq('staff_id', req.params.id);
    const { error } = await supabase.from('staff').delete().eq('id', req.params.id);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
});

// ── CATEGORIE ROUTES ──
app.get('/api/workspaces/:id/categorie', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase.from('category').select('*').eq('workspace_id', req.params.id).order('nome');
    if (error) return res.status(400).json({ error: error.message });
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
});

app.post('/api/workspaces/:id/categorie', authMiddleware, async (req, res) => {
  try {
    const { nome, anno_da, anno_a, genere, descrizione } = req.body;
    if (!nome) return res.status(400).json({ error: 'Nome richiesto' });
    const { data, error } = await supabase.from('category').insert({
      workspace_id: req.params.id, nome, anno_da: anno_da || 0, anno_a: anno_a || 0, genere: genere || 'M', descrizione
    }).select().single();
    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
});

app.put('/api/categorie/:id', authMiddleware, async (req, res) => {
  try {
    const { nome, anno_da, anno_a, genere, descrizione } = req.body;
    const { data, error } = await supabase.from('category').update({ nome, anno_da, anno_a, genere, descrizione }).eq('id', req.params.id).select().single();
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
});

app.delete('/api/categorie/:id', authMiddleware, async (req, res) => {
  try {
    // Verifica che non ci siano squadre associate
    const { data: teams } = await supabase.from('team').select('id').eq('category_id', req.params.id);
    if (teams && teams.length > 0) return res.status(400).json({ error: 'Elimina prima le squadre associate a questa categoria' });
    const { error } = await supabase.from('category').delete().eq('id', req.params.id);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
});

// ── STAGIONE ROUTES ──
app.get('/api/stagioni', authMiddleware, async (req, res) => {
  try {
    const workspaceId = req.query.workspace_id;
    let query = supabase.from('season').select('*').order('data_inizio', { ascending: false });
    if (workspaceId) query = query.eq('workspace_id', workspaceId);
    const { data, error } = await query;
    if (error) return res.status(400).json({ error: error.message });
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
});


app.get('/api/stagioni/:id/squadre', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase.from('team')
      .select('*, category:category_id(id, nome, tipo_campionato)')
      .eq('season_id', id)
      .order('nome');
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    
    // Filtra per categorie_accesso dell'utente
    let filteredData = data || [];
    if (!req.user.is_superadmin && req.user.ruolo !== 'admin' && req.user.squadre_accesso && req.user.squadre_accesso.length > 0) {
      filteredData = filteredData.filter(t => !t.category_id || req.user.squadre_accesso.includes(t.category_id));
    }
    
    // Arricchisci ogni team con nomi staff
    for (const team of filteredData) {
      const { data: staffAssign } = await supabase.from('team_staff').select('ruolo_squadra, staff:staff_id(nome, cognome)').eq('team_id', team.id);
      if (staffAssign && staffAssign.length > 0) {
        staffAssign.forEach(sa => {
          const nome = sa.staff ? sa.staff.nome + ' ' + sa.staff.cognome : '';
          const ruolo = (sa.ruolo_squadra || '').toLowerCase();
          if (ruolo.includes('allenatore') && !ruolo.includes('portieri')) team.allenatore = team.allenatore || nome;
          if (ruolo.includes('dirigente')) team.dirigente = team.dirigente || nome;
          if (ruolo.includes('preparatore')) team.preparatore_atletico = team.preparatore_atletico || nome;
          if (ruolo.includes('portieri')) team.allenatore_portieri = team.allenatore_portieri || nome;
        });
      }
    }
    
    res.json(filteredData);
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
});

app.delete('/api/stagioni/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { data: teams } = await supabase.from('team').select('id').eq('season_id', id);
    if (teams && teams.length > 0) return res.status(400).json({ error: 'Elimina prima le squadre associate' });
    const { error } = await supabase.from('season').delete().eq('id', id);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
});

// ── SQUADRA ROUTES ──
app.get('/api/squadre', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase.from('team').select('*').order('nome');
    if (error) return res.status(400).json({ error: error.message });
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
});

app.post('/api/squadre', authMiddleware, async (req, res) => {
  try {
    const { nome, categoria, allenatore, dirigente, season_id } = req.body;
    if (!nome) return res.status(400).json({ error: 'Nome richiesto' });
    const { data, error } = await supabase.from('team').insert({ nome, categoria, allenatore, dirigente, season_id }).select().single();
    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
});

app.get('/api/squadre/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase.from('team').select('*').eq('id', id).single();
    if (error || !data) return res.status(404).json({ error: 'Squadra non trovata' });
    
    // Arricchisci con nomi staff da team_staff
    const { data: staffAssign } = await supabase.from('team_staff').select('ruolo_squadra, staff:staff_id(nome, cognome)').eq('team_id', id);
    if (staffAssign && staffAssign.length > 0) {
      staffAssign.forEach(sa => {
        const nome = sa.staff ? sa.staff.nome + ' ' + sa.staff.cognome : '';
        const ruolo = (sa.ruolo_squadra || '').toLowerCase();
        if (ruolo.includes('capo allenatore') || ruolo.includes('allenatore') && !ruolo.includes('portieri')) data.allenatore = data.allenatore || nome;
        if (ruolo.includes('dirigente')) data.dirigente = data.dirigente || nome;
        if (ruolo.includes('preparatore')) data.preparatore_atletico = data.preparatore_atletico || nome;
        if (ruolo.includes('portieri')) data.allenatore_portieri = data.allenatore_portieri || nome;
      });
    }
    
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
});

app.put('/api/squadre/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, categoria, allenatore, dirigente, dirigente2, preparatore_atletico, allenatore_portieri, matricola_dirigente, tessera_lnd_dirigente, tessera_figc_allenatore } = req.body;
    const { error } = await supabase.from('team').update({ nome, categoria, allenatore, dirigente, dirigente2, preparatore_atletico, allenatore_portieri, matricola_dirigente, tessera_lnd_dirigente, tessera_figc_allenatore }).eq('id', id);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
});

app.delete('/api/squadre/:id', authMiddleware, async (req, res) => {
  try {
    const sid = req.params.id;
    const { data: partite } = await supabase.from('match').select('id').eq('team_id', sid);
    for (const p of (partite || [])) {
      await supabase.from('match_formation').delete().eq('match_id', p.id);
      await supabase.from('convocation').delete().eq('match_id', p.id);
      await supabase.from('match_event').delete().eq('match_id', p.id);
    }
    await supabase.from('match').delete().eq('team_id', sid);
    // Elimina training e attendance
    const { data: trainings } = await supabase.from('training').select('id').eq('team_id', sid);
    for (const t of (trainings || [])) {
      await supabase.from('training_attendance').delete().eq('training_id', t.id);
    }
    await supabase.from('training').delete().eq('team_id', sid);
    await supabase.from('team_player').delete().eq('team_id', sid);
    await supabase.from('team').delete().eq('id', sid);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
});

// ── GIOCATORI ROUTES ──
app.get('/api/squadre/:squadraId/calciatori', authMiddleware, async (req, res) => {
  try {
    const { data } = await supabase
      .from('team_player')
      .select('calciatore:player_id(*), numero_maglia, ruolo_preferito, stato')
      .eq('team_id', req.params.squadraId);
    res.json((data || []).map(r => ({
      id: r.calciatore.id, 
      nome: r.calciatore.nome, 
      cognome: r.calciatore.cognome, 
      data_nascita: r.calciatore.data_nascita,
      telefono: r.calciatore.telefono, 
      data_visita_medica: r.calciatore.data_visita_medica,
      scadenza_visita_medica: r.calciatore.scadenza_visita_medica,
      matricola_figc: r.calciatore.matricola_figc,
      tipo_documento: r.calciatore.tipo_documento, 
      numero_documento: r.calciatore.numero_documento, 
      rilasciato_da: r.calciatore.rilasciato_da,
      numero_maglia: r.numero_maglia, 
      ruolo: r.ruolo_preferito, 
      stato: r.stato
    })));
  } catch (err) {
    console.error('GET calciatori error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/squadre/:squadraId/calciatori', authMiddleware, requirePermission('rosa', 'write'), async (req, res) => {
  try {
    const c = req.body;
    
    // Helper per convertire stringa vuota in null per campi DATE
    const toDate = (val) => val && val.trim() ? val.trim() : null;
    
    const playerData = {
      nome: c.nome,
      cognome: c.cognome,
      data_nascita: c.data_nascita,
      sesso: c.sesso || 'M',
      telefono: c.telefono || null,
      email: c.email || null,
      foto_url: c.foto_url || null,
      ruolo_principale: c.ruolo || c.ruolo_principale,
      piede_preferito: c.piede_preferito || null,
      altezza: c.altezza || null,
      peso: c.peso || null,
      note: c.note || null,
      // Campi nuovi
      luogo_nascita: c.luogo_nascita || null,
      nazionalita: c.nazionalita || null,
      residenza: c.residenza || null,
      matricola_figc: c.matricola_figc || null,
      tipo_documento: c.tipo_documento || null,
      numero_documento: c.numero_documento || null,
      rilasciato_da: c.rilasciato_da || null,
      data_visita_medica: toDate(c.data_visita_medica),
      scadenza_visita_medica: toDate(c.scadenza_visita_medica),
      tesserato_dal: toDate(c.tesserato_dal),
      tesserato_fino_al: toDate(c.tesserato_fino_al)
    };
    
    const { data: cal, error } = await supabase.from('player').insert(playerData).select().single();
    if (error) return res.status(500).json({ error: error.message });
    
    // Inserisci in team_player con i dati stagionali
    const teamPlayerData = {
      team_id: req.params.squadraId,
      player_id: cal.id,
      numero_maglia: c.numero_maglia,
      ruolo_preferito: c.ruolo || c.ruolo_principale,
      stato: c.stato || 'Attivo',
      data_assegnazione: new Date().toISOString().split('T')[0]
    };
    
    await supabase.from('team_player').insert(teamPlayerData);
    
    res.status(201).json(cal);
  } catch (err) {
    console.error('POST calciatori error:', err);
    res.status(500).json({ error: err.message });
  }
});

// === IMPORT ROSTER DA XLS ===
app.post('/api/roster/parse-xls', authMiddleware, requirePermission('rosa', 'write'), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'File richiesto' });
    const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
    
    // Skip header row
    const PREFIXES = ['DE','DI','DEL','DELLA','DELLO','DEGLI','DELLE','DA','LO','LA','LI','LE','D','MC','MAC'];
    function splitNameByCF(fullName, cf) {
      const parts = fullName.split(' ');
      if (cf && cf.length >= 6) {
        const cfCognome = cf.substring(0, 3).toUpperCase();
        for (let i = 1; i < parts.length; i++) {
          const candidate = parts.slice(0, i).join('');
          const cons = candidate.replace(/[^BCDFGHJKLMNPQRSTVWXYZ]/gi, '');
          let check = cons.length >= 3 ? cons.substring(0, 3).toUpperCase() : (cons + candidate.replace(/[^AEIOU]/gi, '')).substring(0, 3).toUpperCase();
          if (check === cfCognome) {
            if (PREFIXES.includes(parts.slice(0, i).join(' ').toUpperCase())) continue;
            return { cognome: parts.slice(0, i).join(' '), nome: parts.slice(i).join(' ') };
          }
        }
      }
      // Fallback: prefissi noti
      if (PREFIXES.includes(parts[0].toUpperCase()) && parts.length > 2) {
        return { cognome: parts.slice(0, 2).join(' '), nome: parts.slice(2).join(' ') };
      }
      return { cognome: parts[0], nome: parts.slice(1).join(' ') };
    }
    const players = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row[1]) continue;
      const fullName = String(row[1]).trim();
      const cf = row[6] ? String(row[6]).trim() : null;
      const { cognome: rawCognome, nome: rawNome } = splitNameByCF(fullName, cf);
      
      // Data nascita: serial Excel → date
      let dataNascita = null;
      let annoNascita = null;
      if (row[3]) {
        if (typeof row[3] === 'number') {
          const d = new Date((row[3] - 25569) * 86400 * 1000);
          dataNascita = d.toISOString().split('T')[0];
          annoNascita = d.getFullYear();
        } else {
          dataNascita = String(row[3]);
          annoNascita = parseInt(dataNascita.substring(0, 4));
        }
      }
      
      players.push({
        matricola: row[0] ? String(row[0]) : null,
        cognome: rawCognome.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' '),
        nome: rawNome.split(' ').map(n => n.charAt(0).toUpperCase() + n.slice(1).toLowerCase()).join(' '),
        disciplina: row[2] || null,
        data_nascita: dataNascita,
        anno_nascita: annoNascita,
        codice_fiscale: row[6] || null,
        status: row[7] || null
      });
    }
    
    // Raggruppa per anno di nascita
    const byYear = {};
    players.forEach(p => {
      const y = p.anno_nascita || 'sconosciuto';
      if (!byYear[y]) byYear[y] = [];
      byYear[y].push(p);
    });
    
    res.json({ success: true, players, byYear, total: players.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/roster/import-xls', authMiddleware, requirePermission('rosa', 'write'), async (req, res) => {
  try {
    const { players, teamId } = req.body;
    if (!players || !players.length || !teamId) return res.status(400).json({ error: 'players e teamId richiesti' });
    
    let imported = 0, skipped = 0;
    for (const p of players) {
      // Check duplicato per cognome + nome + data_nascita
      const { data: existing } = await supabase.from('player')
        .select('id').ilike('cognome', p.cognome).ilike('nome', p.nome).eq('data_nascita', p.data_nascita).maybeSingle();
      
      let playerId;
      if (existing) {
        playerId = existing.id;
        // Check se già in questo team
        const { data: tp } = await supabase.from('team_player').select('id').eq('team_id', teamId).eq('player_id', playerId).maybeSingle();
        if (tp) { skipped++; continue; }
      } else {
        const { data: newP, error } = await supabase.from('player').insert({
          nome: p.nome, cognome: p.cognome, data_nascita: p.data_nascita,
          matricola_figc: p.matricola || null, sesso: 'M'
        }).select().single();
        if (error) { skipped++; continue; }
        playerId = newP.id;
      }
      
      await supabase.from('team_player').insert({
        team_id: teamId, player_id: playerId, stato: 'Attivo',
        data_assegnazione: new Date().toISOString().split('T')[0]
      });
      imported++;
    }
    
    res.json({ success: true, imported, skipped });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// === TUTTOCAMPO SCRAPING HELPER ===
const TC_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function tcRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const opts = {
      hostname: urlObj.hostname, path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: { 'User-Agent': TC_UA, ...(options.headers || {}) }
    };
    const req = https.request(opts, (res) => {
      let data = '';
      const cookies = res.headers['set-cookie'] || [];
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          resolve({ data, cookies, redirect: res.headers.location, status: res.statusCode });
        } else {
          resolve({ data, cookies, status: res.statusCode });
        }
      });
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function tcLogin() {
  const user = process.env.TC_USERNAME || 'youthfootball';
  const pass = process.env.TC_PASSWORD || 'manager';
  // Step 1: get initial cookies
  const home = await tcRequest('https://www.tuttocampo.it/Homepage');
  const initCookies = home.cookies.map(c => c.split(';')[0]).join('; ');
  // Step 2: login
  const body = `username=${encodeURIComponent(user)}&password=${encodeURIComponent(pass)}&submit_login=Accedi&destination_page=https://www.tuttocampo.it/Homepage`;
  const login = await tcRequest('https://www.tuttocampo.it/Web/Views/Login/LoginModal.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cookie': initCookies },
    body
  });
  const allCookies = [...home.cookies, ...login.cookies].map(c => c.split(';')[0]).join('; ');
  return allCookies;
}

async function tcFetchPage(url, cookies) {
  const res = await tcRequest(url, { headers: { 'Cookie': cookies } });
  return res.data;
}

async function tcFetchAjax(url, cookies, referer) {
  const res = await tcRequest(url, {
    headers: { 'Cookie': cookies, 'X-Requested-With': 'XMLHttpRequest', 'Referer': referer }
  });
  return res.data;
}

app.post('/api/roster/scrape-tuttocampo', authMiddleware, requirePermission('rosa', 'write'), async (req, res) => {
  try {
    const { url } = req.body;
    if (!url || !url.includes('tuttocampo.it')) return res.status(400).json({ error: 'URL Tuttocampo richiesto' });

    // Login
    const cookies = await tcLogin();

    // Load roster page to get tokens
    const pageHtml = await tcFetchPage(url, cookies);
    const tckkMatch = pageHtml.match(/tckk='([^']+)'/);
    const ttMatch = pageHtml.match(/var tt='([^']+)'/);
    const hhMatch = pageHtml.match(/var hh='([^']+)'/);
    const teamIdMatch = pageHtml.match(/var teamID=(\d+)/);
    const teamNameMatch = pageHtml.match(/var teamName='([^']+)'/);

    if (!tckkMatch || !ttMatch || !hhMatch || !teamIdMatch) {
      return res.status(400).json({ error: 'Impossibile estrarre i token dalla pagina. Verifica URL.' });
    }

    const tckk = tckkMatch[1], tt = ttMatch[1], hh = hhMatch[1], teamId = teamIdMatch[1];
    const teamName = teamNameMatch ? teamNameMatch[1] : 'Sconosciuta';

    // Fetch roster via AJAX
    const rosterUrl = `https://www.tuttocampo.it/Web/Views/TeamPlayers/TeamPlayers.php?tckk=${tckk}&id=${teamId}&tt=${tt}&hh=${hh}`;
    const rosterHtml = await tcFetchAjax(rosterUrl, cookies, url);

    // Parse HTML
    const $ = cheerio.load(rosterHtml);
    const players = [];
    $('table.team-players tbody tr').each((i, row) => {
      const nameEl = $(row).find('td.player a[data-player-id]');
      if (!nameEl.length) return;
      const fullName = nameEl.text().trim();
      const birthdate = $(row).find('td.birthdate').text().trim();
      const ruolo = $(row).find('td').eq(3).text().trim();

      if (!fullName) return;
      const parts = fullName.split(' ');
      const cognome = parts[0] || '';
      const nome = parts.slice(1).join(' ') || '';

      let dataNascita = null;
      if (birthdate && birthdate !== '-') {
        const [dd, mm, yyyy] = birthdate.split('-');
        if (dd && mm && yyyy) dataNascita = `${yyyy}-${mm}-${dd}`;
      }

      const ruoloMap = { 'POR': 'Portiere', 'DIF': 'Difensore', 'CEN': 'Centrocampista', 'ATT': 'Attaccante' };

      players.push({ cognome, nome, data_nascita: dataNascita, ruolo: ruoloMap[ruolo] || null });
    });

    if (!players.length) {
      return res.status(400).json({ error: 'Nessun giocatore trovato. La pagina potrebbe non contenere dati.' });
    }

    res.json({ success: true, teamName, players });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/roster/import-tuttocampo', authMiddleware, requirePermission('rosa', 'write'), async (req, res) => {
  try {
    const { players, teamId } = req.body;
    if (!players || !players.length || !teamId) return res.status(400).json({ error: 'players e teamId richiesti' });

    let imported = 0, skipped = 0;
    for (const p of players) {
      let query = supabase.from('player').select('id').ilike('cognome', p.cognome).ilike('nome', p.nome);
      if (p.data_nascita) query = query.eq('data_nascita', p.data_nascita);
      const { data: existing } = await query.maybeSingle();

      let playerId;
      if (existing) {
        playerId = existing.id;
        const { data: tp } = await supabase.from('team_player').select('id').eq('team_id', teamId).eq('player_id', playerId).maybeSingle();
        if (tp) { skipped++; continue; }
      } else {
        const { data: newP, error } = await supabase.from('player').insert({
          nome: p.nome, cognome: p.cognome, data_nascita: p.data_nascita || null,
          ruolo_principale: p.ruolo || null, sesso: 'M'
        }).select().single();
        if (error) { skipped++; continue; }
        playerId = newP.id;
      }

      await supabase.from('team_player').insert({
        team_id: teamId, player_id: playerId, stato: 'Attivo', ruolo_preferito: p.ruolo || null,
        data_assegnazione: new Date().toISOString().split('T')[0]
      });
      imported++;
    }

    res.json({ success: true, imported, skipped });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/squadre/:squadraId/scadenze-mediche', authMiddleware, async (req, res) => {
  try {
    const { data: rosa } = await supabase
      .from('team_player')
      .select('calciatore:player_id(id, nome, cognome, scadenza_visita_medica)')
      .eq('team_id', req.params.squadraId);
    
    const oggi = new Date();
    const scadenze = (rosa || [])
      .filter(r => r.calciatore?.scadenza_visita_medica)
      .map(r => {
        const scadenza = new Date(r.calciatore.scadenza_visita_medica);
        const giorniRimanenti = Math.ceil((scadenza - oggi) / (1000 * 60 * 60 * 24));
        return {
          id: r.calciatore.id,
          nome: r.calciatore.nome,
          cognome: r.calciatore.cognome,
          scadenza: r.calciatore.scadenza_visita_medica,
          giorni_rimanenti: giorniRimanenti
        };
      })
      .filter(s => s.giorni_rimanenti <= 30)
      .sort((a, b) => a.giorni_rimanenti - b.giorni_rimanenti);
    
    res.json(scadenze);
  } catch (err) {
    console.error('scadenze-mediche error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── PARTITE ROUTES ──
app.get('/api/squadre/:squadraId/partite', authMiddleware, async (req, res) => {
  try {
    const { data } = await supabase.from('match').select('*, competition:competition_id(id, nome)').eq('team_id', req.params.squadraId).order('data_ora', { ascending: false });
    // Mappa competition.nome → competizione per retrocompatibilità frontend
    const result = (data || []).map(m => ({ ...m, competizione: m.competition?.nome || null }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/squadre/:squadraId/partite-future', authMiddleware, async (req, res) => {
  try {
    const now = new Date().toISOString();
    const { data } = await supabase.from('match').select('*, competition:competition_id(id, nome)').eq('team_id', req.params.squadraId).gte('data_ora', now).order('data_ora', { ascending: true }).limit(5);
    const result = (data || []).map(m => ({ ...m, competizione: m.competition?.nome || null }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/squadre/:squadraId/partite', authMiddleware, requirePermission('partite', 'write'), async (req, res) => {
  try {
    const p = req.body;
    // Se il frontend passa 'competizione' come testo, cerca il competition_id
    let competition_id = null;
    if (p.competizione) {
      const { data: comp } = await supabase.from('competition').select('id').ilike('nome', '%' + p.competizione + '%').limit(1).single();
      if (comp) competition_id = comp.id;
    }
    const { data } = await supabase.from('match').insert({ team_id: req.params.squadraId, data_ora: p.dataOra, avversario: p.avversario, luogo: p.luogo, competition_id, giornata: p.giornata }).select().single();
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/partite/:id', authMiddleware, requirePermission('partite', 'write'), async (req, res) => {
  try {
    const p = req.body;
    let competition_id = undefined;
    if (p.competizione) {
      const { data: comp } = await supabase.from('competition').select('id').ilike('nome', '%' + p.competizione + '%').limit(1).single();
      competition_id = comp ? comp.id : null;
    }
    const updateData = { data_ora: p.dataOra, avversario: p.avversario, luogo: p.luogo, giornata: p.giornata };
    if (competition_id !== undefined) updateData.competition_id = competition_id;
    if (p.noteAvversario !== undefined) updateData.note_avversario = p.noteAvversario;
    await supabase.from('match').update(updateData).eq('id', req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/partite/:id', authMiddleware, requirePermission('partite', 'write'), async (req, res) => {
  try {
    await supabase.from('match_event').delete().eq('match_id', req.params.id);
    await supabase.from('match_formation').delete().eq('match_id', req.params.id);
    await supabase.from('convocation').delete().eq('match_id', req.params.id);
    await supabase.from('match').delete().eq('id', req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Elimina TUTTE le partite di una squadra
app.delete('/api/squadre/:squadraId/partite-all', authMiddleware, requirePermission('partite', 'write'), async (req, res) => {
  try {
    const { data: partite } = await supabase.from('match').select('id').eq('team_id', req.params.squadraId);
    const ids = (partite || []).map(p => p.id);
    if (ids.length > 0) {
      await supabase.from('match_event').delete().in('match_id', ids);
      await supabase.from('match_formation').delete().in('match_id', ids);
      await supabase.from('convocation').delete().in('match_id', ids);
      await supabase.from('match').delete().in('id', ids);
    }
    res.json({ success: true, eliminate: ids.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── SQUADRA STATISTICS ROUTES ──
app.get('/api/squadre/:id/statistiche-complete', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Partite terminate con risultato (stato = 'Terminata' o archiviata)
    const { data: partite } = await supabase.from('match').select('id, gol_casa, gol_ospite, data_ora, avversario, luogo, competition:competition_id(nome), giornata').eq('team_id', id).or('stato.eq.Terminata,archiviata.eq.true').order('data_ora', { ascending: false });
    
    let vinte = 0, pareggiate = 0, perse = 0, golFatti = 0, golSubiti = 0;
    const risultati = [];
    
    (partite || []).forEach(p => {
      const gc = p.gol_casa || 0;
      const go = p.gol_ospite || 0;
      golFatti += gc;
      golSubiti += go;
      if (gc > go) vinte++;
      else if (gc === go) pareggiate++;
      else perse++;
      risultati.push({
        id: p.id,
        dataOra: p.data_ora,
        avversario: p.avversario,
        luogo: p.luogo,
        competizione: p.competition?.nome || null,
        golFatti: gc,
        golSubiti: go
      });
    });
    
    const partiteGiocate = (partite || []).length;
    const punti = vinte * 3 + pareggiate;
    const differenzaReti = golFatti - golSubiti;
    
    res.json({
      punti,
      partiteGiocate,
      vittorie: vinte,
      pareggi: pareggiate,
      sconfitte: perse,
      golFatti,
      golSubiti,
      differenzaReti,
      risultati
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/squadre/:id/top-players', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Prendi team_player con info giocatore
    const { data: players } = await supabase
      .from('team_player')
      .select('id, player:player_id(id, nome, cognome), numero_maglia')
      .eq('team_id', id);
    
    if (!players || players.length === 0) return res.json({ marcatori: [], assistmen: [], presenze: [] });
    
    // Prendi partite terminate di questa squadra
    const { data: matches } = await supabase.from('match').select('id').eq('team_id', id).eq('stato', 'Terminata');
    const matchIds = (matches || []).map(m => m.id);
    
    if (matchIds.length === 0) return res.json({ marcatori: [], assistmen: [], presenze: [] });
    
    // Prendi tutti gli eventi per queste partite
    const { data: events } = await supabase.from('match_event').select('tipo_evento, player_id').in('match_id', matchIds);
    
    // Conta gol e assist per giocatore
    const golCount = {};
    const assistCount = {};
    (events || []).forEach(e => {
      if (e.tipo_evento === 'GOAL') golCount[e.player_id] = (golCount[e.player_id] || 0) + 1;
      if (e.tipo_evento === 'ASSIST') assistCount[e.player_id] = (assistCount[e.player_id] || 0) + 1;
    });
    
    // Costruisci classifiche
    const marcatori = players
      .filter(p => golCount[p.player?.id])
      .map(p => ({ id: p.player.id, nome: p.player.cognome + ' ' + p.player.nome, gol: golCount[p.player.id] }))
      .sort((a, b) => b.gol - a.gol)
      .slice(0, 5);
    
    const assistmen = players
      .filter(p => assistCount[p.player?.id])
      .map(p => ({ id: p.player.id, nome: p.player.cognome + ' ' + p.player.nome, assist: assistCount[p.player.id] }))
      .sort((a, b) => b.assist - a.assist)
      .slice(0, 5);
    
    // Presenze: conta convocazioni con presente=true
    const { data: convs } = await supabase.from('convocation').select('team_player_id').in('match_id', matchIds).eq('presente', true);
    const presCount = {};
    (convs || []).forEach(c => { presCount[c.team_player_id] = (presCount[c.team_player_id] || 0) + 1; });
    
    const presenze = players
      .filter(p => presCount[p.id])
      .map(p => ({ id: p.player?.id, nome: p.player?.cognome + ' ' + p.player?.nome, presenze: presCount[p.id] }))
      .sort((a, b) => b.presenze - a.presenze)
      .slice(0, 5);
    
    res.json({ marcatori, assistmen, presenze });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/squadre/:id/valutazioni-top', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Prima prendi gli ID dei team_player per questa squadra
    const { data: teamPlayers } = await supabase
      .from('team_player')
      .select('id')
      .eq('team_id', id);
    
    const teamPlayerIds = teamPlayers?.map(tp => tp.id) || [];
    
    if (teamPlayerIds.length === 0) {
      return res.json([]);
    }
    
    // Poi prendi le statistiche per quei giocatori
    const { data: stats } = await supabase
      .from('match_statistics')
      .select(`
        *,
        team_player:team_player_id(
          id,
          player:player_id(id, nome, cognome),
          numero_maglia
        )
      `)
      .in('team_player_id', teamPlayerIds)
      .order('minuti_giocati', { ascending: false })
      .limit(10);
    
    res.json(stats || []);
  } catch (err) {
    console.error('valutazioni-top error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── CALCIATORE ROUTES ──
app.get('/api/calciatori/:id', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase.from('player').select('*').eq('id', req.params.id).single();
    if (error || !data) return res.status(404).json({ error: 'Giocatore non trovato' });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
});

app.put('/api/calciatori/:id', authMiddleware, requirePermission('rosa', 'write'), async (req, res) => {
  try {
    const c = req.body;
    
    // Helper per convertire stringa vuota in null per campi DATE
    const toDate = (val) => val && val.trim() ? val.trim() : null;
    
    const updateData = {
      nome: c.nome,
      cognome: c.cognome,
      data_nascita: c.data_nascita,
      telefono: c.telefono || null,
      email: c.email || null,
      ruolo_principale: c.ruolo || c.ruolo_principale || null,
      piede_preferito: c.piede_preferito || null,
      altezza: c.altezza || null,
      peso: c.peso || null,
      matricola_figc: c.matricola_figc || null,
      tipo_documento: c.tipo_documento || null,
      numero_documento: c.numero_documento || null,
      rilasciato_da: c.rilasciato_da || null,
      data_visita_medica: toDate(c.data_visita_medica),
      scadenza_visita_medica: toDate(c.scadenza_visita_medica),
      luogo_nascita: c.luogo_nascita || null,
      nazionalita: c.nazionalita || null,
      residenza: c.residenza || null,
      note: c.note || null
    };
    
    const { data, error } = await supabase.from('player').update(updateData).eq('id', req.params.id).select().single();
    if (error) return res.status(400).json({ error: error.message });
    
    // Aggiorna anche team_player se necessario
    if (c.numero_maglia || c.ruolo || c.stato) {
      await supabase.from('team_player').update({
        numero_maglia: c.numero_maglia || null,
        ruolo_preferito: c.ruolo || null,
        stato: c.stato || null
      }).eq('player_id', req.params.id);
    }
    
    res.json(data);
  } catch (err) {
    console.error('PUT calciatori error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/calciatori/:id/stats-current', authMiddleware, async (req, res) => {
  try {
    const { data: rose } = await supabase.from('team_player').select('team_id').eq('player_id', req.params.id);
    if (!rose || rose.length === 0) return res.json({ gol: 0, assist: 0, presenze: 0, partite: 0 });
    const sqIds = rose.map(r => r.team_id);
    const { data: partite } = await supabase.from('match').select('id').in('team_id', sqIds).eq('stato', 'Terminata');
    if (!partite || partite.length === 0) return res.json({ gol: 0, assist: 0, presenze: 0, partite: 0 });
    const partitaIds = partite.map(p => p.id);
    const { data: eventi } = await supabase.from('match_event').select('tipo_evento').eq('player_id', req.params.id).in('match_id', partitaIds);
    const { data: convocazioni } = await supabase.from('convocation').select('presente').eq('player_id', req.params.id).in('match_id', partitaIds);
    res.json({ gol: (eventi || []).filter(e => e.tipo_evento === 'GOAL').length, assist: (eventi || []).filter(e => e.tipo_evento === 'ASSIST').length, presenze: (convocazioni || []).filter(c => c.presente).length, partite: partite.length });
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
});

// ── TRAINING ROUTES ──

// Get training config (settimana tipo) dalla tabella dedicata
app.get('/api/squadre/:squadraId/allenamenti/config', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('training_config')
      .select('*')
      .eq('team_id', req.params.squadraId)
      .order('giorno_settimana');
    if (error) return res.status(400).json({ error: error.message });
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create training config
app.post('/api/squadre/:squadraId/allenamenti/config', authMiddleware, requirePermission('allenamenti', 'write'), async (req, res) => {
  try {
    const { giorno_settimana, ora_inizio, ora_fine, luogo } = req.body;
    const { data, error } = await supabase.from('training_config').insert({
      team_id: req.params.squadraId, giorno_settimana, ora_inizio, ora_fine, luogo
    }).select().single();
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update training config
app.put('/api/allenamenti/config/:id', authMiddleware, requirePermission('allenamenti', 'write'), async (req, res) => {
  try {
    const { giorno_settimana, ora_inizio, ora_fine, luogo } = req.body;
    const { data, error } = await supabase.from('training_config').update({
      giorno_settimana, ora_inizio, ora_fine, luogo
    }).eq('id', req.params.id).select().single();
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete training config
app.delete('/api/allenamenti/config/:id', authMiddleware, requirePermission('allenamenti', 'write'), async (req, res) => {
  try {
    const { error } = await supabase.from('training_config').delete().eq('id', req.params.id);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get training attendance (presenze) - mappa su training_attendance
app.get('/api/squadre/:squadraId/allenamenti/presenze', authMiddleware, async (req, res) => {
  try {
    // Prendi tutte le sessioni training della squadra
    const { data: trainings } = await supabase.from('training').select('id, data_ora').eq('team_id', req.params.squadraId);
    const trainingIds = (trainings || []).map(t => t.id);
    if (trainingIds.length === 0) return res.json([]);
    
    // Prendi le presenze per quelle sessioni
    const { data, error } = await supabase
      .from('training_attendance')
      .select('*, training:training_id(id, data_ora, team_id)')
      .in('training_id', trainingIds);
    if (error) return res.status(400).json({ error: error.message });
    
    // Mappa nel formato atteso dal frontend (calciatore_id, data, presente)
    // Serve risolvere team_player_id → player_id
    const tpIds = [...new Set((data || []).map(d => d.team_player_id))];
    let tpMap = {};
    if (tpIds.length > 0) {
      const { data: tps } = await supabase.from('team_player').select('id, player_id').in('id', tpIds);
      (tps || []).forEach(tp => { tpMap[tp.id] = tp.player_id; });
    }
    
    const result = (data || []).map(d => ({
      id: d.id,
      calciatore_id: tpMap[d.team_player_id] || d.team_player_id,
      data: d.training?.data_ora ? new Date(d.training.data_ora).toLocaleDateString('sv-SE') : null,
      presente: d.presente,
      motivo_assenza: d.motivi_assenza,
      note: d.note,
      team_id: d.training?.team_id
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Save/update training attendance - BATCH (una sola chiamata per tutti i giocatori)
app.post('/api/squadre/:squadraId/allenamenti/presenze-batch', authMiddleware, requirePermission('allenamenti', 'write'), async (req, res) => {
  try {
    const { data: presenzeList, date } = req.body;
    if (!presenzeList || !date) return res.status(400).json({ error: 'Dati mancanti' });
    
    // Trova o crea la sessione training per quella data
    const dataInizio = date + 'T00:00:00';
    const dataFine = date + 'T23:59:59';
    let { data: training } = await supabase.from('training').select('id').eq('team_id', req.params.squadraId).gte('data_ora', dataInizio).lte('data_ora', dataFine).limit(1).single();
    
    if (!training) {
      const { data: newTraining, error: tErr } = await supabase.from('training').insert({
        team_id: req.params.squadraId, data_ora: date + 'T17:00:00', durata_minuti: 90, tipo: 'Allenamento'
      }).select().single();
      if (tErr) return res.status(400).json({ error: tErr.message });
      training = newTraining;
    }
    
    // Mappa player_id → team_player_id
    const playerIds = presenzeList.map(p => p.calciatoreId);
    const { data: tps } = await supabase.from('team_player').select('id, player_id').eq('team_id', req.params.squadraId).in('player_id', playerIds);
    const playerToTp = {};
    (tps || []).forEach(tp => { playerToTp[tp.player_id] = tp.id; });
    
    // Upsert tutte le presenze
    const upserts = presenzeList.map(p => ({
      training_id: training.id,
      team_player_id: playerToTp[p.calciatoreId],
      presente: p.presente,
      motivi_assenza: !p.presente ? (p.note || 'Assente') : null
    })).filter(u => u.team_player_id);
    
    // Delete existing + insert (upsert)
    await supabase.from('training_attendance').delete().eq('training_id', training.id);
    if (upserts.length > 0) {
      const { error } = await supabase.from('training_attendance').insert(upserts);
      if (error) return res.status(400).json({ error: error.message });
    }
    
    res.json({ success: true, saved: upserts.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Save/update training attendance (singolo - mantenuto per retrocompatibilità)
app.post('/api/squadre/:squadraId/allenamenti/presenze', authMiddleware, requirePermission('allenamenti', 'write'), async (req, res) => {
  try {
    const { calciatoreId, data, presente, note } = req.body;
    
    // Trova il team_player_id
    const { data: tp } = await supabase.from('team_player').select('id').eq('player_id', calciatoreId).eq('team_id', req.params.squadraId).single();
    if (!tp) return res.status(400).json({ error: 'Giocatore non in rosa' });
    
    // Trova o crea la sessione training per quella data
    const dataInizio = data + 'T00:00:00';
    const dataFine = data + 'T23:59:59';
    let { data: training } = await supabase.from('training').select('id').eq('team_id', req.params.squadraId).gte('data_ora', dataInizio).lte('data_ora', dataFine).limit(1).single();
    
    if (!training) {
      // Crea sessione training per quella data
      const { data: newTraining, error: tErr } = await supabase.from('training').insert({
        team_id: req.params.squadraId,
        data_ora: data + 'T17:00:00',
        durata_minuti: 90,
        tipo: 'Allenamento'
      }).select().single();
      if (tErr) return res.status(400).json({ error: tErr.message });
      training = newTraining;
    }
    
    // Upsert attendance
    const { data: existing } = await supabase.from('training_attendance').select('id').eq('training_id', training.id).eq('team_player_id', tp.id).single();
    
    if (existing) {
      const { data: updated, error } = await supabase.from('training_attendance').update({ presente, motivi_assenza: !presente ? (note || 'Assente') : null }).eq('id', existing.id).select().single();
      if (error) return res.status(400).json({ error: error.message });
      res.json(updated);
    } else {
      const { data: inserted, error } = await supabase.from('training_attendance').insert({
        training_id: training.id,
        team_player_id: tp.id,
        presente,
        motivi_assenza: !presente ? (note || 'Assente') : null
      }).select().single();
      if (error) return res.status(400).json({ error: error.message });
      res.json(inserted);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get training summary (stats per player)
app.get('/api/squadre/:squadraId/allenamenti/summary', authMiddleware, async (req, res) => {
  try {
    // Prendi sessioni training
    const { data: trainings } = await supabase.from('training').select('id').eq('team_id', req.params.squadraId);
    const trainingIds = (trainings || []).map(t => t.id);
    
    // Prendi presenze
    let presenze = [];
    if (trainingIds.length > 0) {
      const { data } = await supabase.from('training_attendance').select('*').in('training_id', trainingIds);
      presenze = data || [];
    }
    
    // Prendi giocatori della squadra
    const { data: teamPlayers } = await supabase
      .from('team_player')
      .select('id, player_id, calciatore:player_id(id, nome, cognome)')
      .eq('team_id', req.params.squadraId);
    
    const summary = {};
    (teamPlayers || []).forEach(tp => {
      const g = tp.calciatore;
      if (!g) return;
      const playerPres = presenze.filter(p => p.team_player_id === tp.id);
      const presenti = playerPres.filter(p => p.presente).length;
      const assenti = playerPres.filter(p => !p.presente).length;
      summary[g.id] = {
        id: g.id,
        nome: g.nome,
        cognome: g.cognome,
        totali: playerPres.length,
        presenti,
        assenti,
        assentiSett: 0
      };
    });
    
    // Calcola assenze settimanali (usa date locali)
    const now = new Date();
    const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay(); // Lun=1, Dom=7
    const inizioSett = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek + 1);
    const fineSett = new Date(inizioSett.getFullYear(), inizioSett.getMonth(), inizioSett.getDate() + 6, 23, 59, 59);
    
    // Prendi training di questa settimana
    const weekTrainings = (trainings || []).filter(t => {
      // Non possiamo filtrare senza data_ora qui, lo facciamo con query dedicata
      return true;
    });
    
    // Per le assenze settimanali serve sapere quali training sono in questa settimana
    if (trainingIds.length > 0) {
      const { data: weekT } = await supabase.from('training').select('id').eq('team_id', req.params.squadraId).gte('data_ora', inizioSett.toISOString()).lte('data_ora', fineSett.toISOString());
      const weekIds = (weekT || []).map(t => t.id);
      if (weekIds.length > 0) {
        const weekPresenze = presenze.filter(p => weekIds.includes(p.training_id) && !p.presente);
        // Mappa team_player_id → player_id per lookup nel summary
        const tpToPlayer = {};
        (teamPlayers || []).forEach(tp => { tpToPlayer[tp.id] = tp.calciatore?.id; });
        weekPresenze.forEach(p => {
          const playerId = tpToPlayer[p.team_player_id];
          if (playerId && summary[playerId]) {
            summary[playerId].assentiSett++;
          }
        });
      }
    }
    
    res.json({ summary, settimana: { da: inizioSett.toISOString().split('T')[0], a: fineSett.toISOString().split('T')[0] } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── MIGRATION ENDPOINT - Crea nuovo schema ──
app.post('/api/admin/migrate-new-schema', authMiddleware, async (req, res) => {
  try {
    // Verifica che sia admin
    if (!req.user?.is_superadmin && req.user?.ruolo !== 'superadmin') {
      return res.status(403).json({ error: 'Solo superadmin può eseguire migrazioni' });
    }

    const results = { tables_created: [], seed_data: [], errors: [] };

    // 1. Crea tabella category
    try {
      await supabase.rpc('exec_sql', { sql: `CREATE TABLE IF NOT EXISTS category (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), nome VARCHAR(100) NOT NULL, anno_da INTEGER NOT NULL, anno_a INTEGER NOT NULL, genere VARCHAR(10) DEFAULT 'M', descrizione TEXT, created_at TIMESTAMP DEFAULT NOW())` });
      results.tables_created.push('category');
    } catch (e) { if (!e.message.includes('already exists')) results.errors.push('category: ' + e.message); }

    // 2. Crea tabella competition
    try {
      await supabase.rpc('exec_sql', { sql: `CREATE TABLE IF NOT EXISTS competition (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), nome VARCHAR(200) NOT NULL, tipo VARCHAR(50) DEFAULT 'Campionato', federazione VARCHAR(100), regione VARCHAR(100), logo_url TEXT, descrizione TEXT, created_at TIMESTAMP DEFAULT NOW())` });
      results.tables_created.push('competition');
    } catch (e) { if (!e.message.includes('already exists')) results.errors.push('competition: ' + e.message); }

    // 3. Crea tabella facility
    try {
      await supabase.rpc('exec_sql', { sql: `CREATE TABLE IF NOT EXISTS facility (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), nome VARCHAR(200) NOT NULL, indirizzo TEXT, citta VARCHAR(100), capienza INTEGER, superficie VARCHAR(50), tipo VARCHAR(50), illuminazione BOOLEAN DEFAULT false, servizi TEXT[], coordinate_gps JSONB, note TEXT, created_at TIMESTAMP DEFAULT NOW())` });
      results.tables_created.push('facility');
    } catch (e) { if (!e.message.includes('already exists')) results.errors.push('facility: ' + e.message); }

    // 4. Crea tabella staff
    try {
      await supabase.rpc('exec_sql', { sql: `CREATE TABLE IF NOT EXISTS staff (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), nome VARCHAR(100) NOT NULL, cognome VARCHAR(100) NOT NULL, data_nascita DATE, sesso VARCHAR(1) DEFAULT 'M', foto_url TEXT, telefono VARCHAR(50), email VARCHAR(255), ruolo VARCHAR(50) NOT NULL, qualifiche JSONB DEFAULT '{}', documento JSONB DEFAULT '{}', note TEXT, created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW())` });
      results.tables_created.push('staff');
    } catch (e) { if (!e.message.includes('already exists')) results.errors.push('staff: ' + e.message); }

    // 5. Crea tabella team
    try {
      await supabase.rpc('exec_sql', { sql: `CREATE TABLE IF NOT EXISTS team (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), season_id UUID NOT NULL, category_id UUID, nome VARCHAR(100) NOT NULL, colori_casa VARCHAR(50), colori_trasferta VARCHAR(50), venue_id UUID, allenatore_id UUID, dirigente_id UUID, preparatore_id UUID, portieri_id UUID, matricola_figc VARCHAR(100), iscritta_competizione UUID, note TEXT, created_at TIMESTAMP DEFAULT NOW())` });
      results.tables_created.push('team');
    } catch (e) { if (!e.message.includes('already exists')) results.errors.push('team: ' + e.message); }

    // 6. Crea tabella team_player
    try {
      await supabase.rpc('exec_sql', { sql: `CREATE TABLE IF NOT EXISTS team_player (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), team_id UUID NOT NULL, player_id UUID NOT NULL, numero_maglia INTEGER, ruolo_preferito VARCHAR(50), stato VARCHAR(50) DEFAULT 'Attivo', data_assegnazione DATE DEFAULT CURRENT_DATE, data_cessione DATE, note TEXT, created_at TIMESTAMP DEFAULT NOW(), UNIQUE(team_id, player_id))` });
      results.tables_created.push('team_player');
    } catch (e) { if (!e.message.includes('already exists')) results.errors.push('team_player: ' + e.message); }

    // 7. Crea tabella team_staff
    try {
      await supabase.rpc('exec_sql', { sql: `CREATE TABLE IF NOT EXISTS team_staff (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), team_id UUID NOT NULL, staff_id UUID NOT NULL, ruolo_squadra VARCHAR(100) NOT NULL, data_assegnazione DATE DEFAULT CURRENT_DATE, data_cessione DATE, note TEXT, created_at TIMESTAMP DEFAULT NOW(), UNIQUE(team_id, staff_id, ruolo_squadra))` });
      results.tables_created.push('team_staff');
    } catch (e) { if (!e.message.includes('already exists')) results.errors.push('team_staff: ' + e.message); }

    // 8. Crea tabella match
    try {
      await supabase.rpc('exec_sql', { sql: `CREATE TABLE IF NOT EXISTS match (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), team_id UUID NOT NULL, competition_id UUID, venue_id UUID, data_ora TIMESTAMP NOT NULL, avversario VARCHAR(200) NOT NULL, luogo VARCHAR(20) DEFAULT 'Casa', giornata INTEGER, gol_casa INTEGER DEFAULT 0, gol_ospite INTEGER DEFAULT 0, stato VARCHAR(30) DEFAULT 'Da disputare', archiviat BOOLEAN DEFAULT false, note TEXT, note_avversario TEXT, created_at TIMESTAMP DEFAULT NOW())` });
      results.tables_created.push('match');
    } catch (e) { if (!e.message.includes('already exists')) results.errors.push('match: ' + e.message); }

    // 9. Crea tabella match_event
    try {
      await supabase.rpc('exec_sql', { sql: `CREATE TABLE IF NOT EXISTS match_event (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), match_id UUID NOT NULL, tipo_evento VARCHAR(50) NOT NULL, minuto INTEGER, player_id UUID, player_id_secondario UUID, note TEXT, created_at TIMESTAMP DEFAULT NOW())` });
      results.tables_created.push('match_event');
    } catch (e) { if (!e.message.includes('already exists')) results.errors.push('match_event: ' + e.message); }

    // 10. Crea tabella match_formation
    try {
      await supabase.rpc('exec_sql', { sql: `CREATE TABLE IF NOT EXISTS match_formation (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), match_id UUID NOT NULL, team_player_id UUID NOT NULL, posizione VARCHAR(50), numero_maglia INTEGER, is_captain BOOLEAN DEFAULT false, is_vice_captain BOOLEAN DEFAULT false, is_starter BOOLEAN DEFAULT true, ordine INTEGER DEFAULT 0, created_at TIMESTAMP DEFAULT NOW())` });
      results.tables_created.push('match_formation');
    } catch (e) { if (!e.message.includes('already exists')) results.errors.push('match_formation: ' + e.message); }

    // 11. Crea tabella convocation
    try {
      await supabase.rpc('exec_sql', { sql: `CREATE TABLE IF NOT EXISTS convocation (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), match_id UUID NOT NULL, team_player_id UUID NOT NULL, convocato_da UUID, convocato_il DATE DEFAULT CURRENT_DATE, confermato BOOLEAN, presente BOOLEAN, note TEXT, created_at TIMESTAMP DEFAULT NOW(), UNIQUE(match_id, team_player_id))` });
      results.tables_created.push('convocation');
    } catch (e) { if (!e.message.includes('already exists')) results.errors.push('convocation: ' + e.message); }

    // 12. Crea tabella training
    try {
      await supabase.rpc('exec_sql', { sql: `CREATE TABLE IF NOT EXISTS training (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), team_id UUID NOT NULL, venue_id UUID, data_ora TIMESTAMP NOT NULL, durata_minuti INTEGER DEFAULT 90, tipo VARCHAR(50), descrizione TEXT, note TEXT, created_at TIMESTAMP DEFAULT NOW())` });
      results.tables_created.push('training');
    } catch (e) { if (!e.message.includes('already exists')) results.errors.push('training: ' + e.message); }

    // 13. Crea tabella training_attendance
    try {
      await supabase.rpc('exec_sql', { sql: `CREATE TABLE IF NOT EXISTS training_attendance (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), training_id UUID NOT NULL, team_player_id UUID NOT NULL, presente BOOLEAN DEFAULT false, motivi_assenza TEXT, note TEXT, created_at TIMESTAMP DEFAULT NOW(), UNIQUE(training_id, team_player_id))` });
      results.tables_created.push('training_attendance');
    } catch (e) { if (!e.message.includes('already exists')) results.errors.push('training_attendance: ' + e.message); }

    // 14. Crea tabella match_statistics
    try {
      await supabase.rpc('exec_sql', { sql: `CREATE TABLE IF NOT EXISTS match_statistics (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), match_id UUID NOT NULL, team_player_id UUID NOT NULL, minuti_giocati INTEGER DEFAULT 0, gol INTEGER DEFAULT 0, assist INTEGER DEFAULT 0, tiri INTEGER DEFAULT 0, tiri_in_porta INTEGER DEFAULT 0, passaggi INTEGER DEFAULT 0, passaggi_riusciti INTEGER DEFAULT 0, palloni_recuperati INTEGER DEFAULT 0, falli_subiti INTEGER DEFAULT 0, falli_commessi INTEGER DEFAULT 0, ammonizioni INTEGER DEFAULT 0, espulsioni INTEGER DEFAULT 0, created_at TIMESTAMP DEFAULT NOW(), UNIQUE(match_id, team_player_id))` });
      results.tables_created.push('match_statistics');
    } catch (e) { if (!e.message.includes('already exists')) results.errors.push('match_statistics: ' + e.message); }

    // 15. Crea tabella document
    try {
      await supabase.rpc('exec_sql', { sql: `CREATE TABLE IF NOT EXISTS document (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tipo VARCHAR(50) NOT NULL, entita_tipo VARCHAR(50) NOT NULL, entita_id UUID NOT NULL, file_url TEXT NOT NULL, nome_file VARCHAR(255), mime_type VARCHAR(100), dimensione INTEGER, data_upload TIMESTAMP DEFAULT NOW(), scadenza DATE, note TEXT)` });
      results.tables_created.push('document');
    } catch (e) { if (!e.message.includes('already exists')) results.errors.push('document: ' + e.message); }

    // 16. Aggiungi colonne a stagione
    try {
      await supabase.rpc('exec_sql', { sql: `ALTER TABLE stagione ADD COLUMN IF NOT EXISTS attiva BOOLEAN DEFAULT false, ADD COLUMN IF NOT EXISTS data_inizio DATE, ADD COLUMN IF NOT EXISTS data_fine DATE, ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false` });
      results.tables_created.push('stagione (columns)');
    } catch (e) { results.errors.push('stagione columns: ' + e.message); }

    // 17. Aggiungi colonne a calciatore
    try {
      await supabase.rpc('exec_sql', { sql: `ALTER TABLE calciatore ADD COLUMN IF NOT EXISTS sesso VARCHAR(1) DEFAULT 'M', ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()` });
      results.tables_created.push('calciatore (columns)');
    } catch (e) { results.errors.push('calciatore columns: ' + e.message); }

    // Seed data - categorie
    try {
      await supabase.rpc('exec_sql', { sql: `INSERT INTO category (id, nome, anno_da, anno_a, descrizione) VALUES 
        ('c0000001-0000-0000-0000-000000000001', 'Under 14', 2011, 2012, 'Ragazzi nati 2011-2012'),
        ('c0000002-0000-0000-0000-000000000002', 'Under 15', 2010, 2011, 'Ragazzi nati 2010-2011'),
        ('c0000003-0000-0000-0000-000000000003', 'Under 16', 2009, 2010, 'Ragazzi nati 2009-2010'),
        ('c0000004-0000-0000-0000-000000000004', 'Under 17', 2008, 2009, 'Ragazzi nati 2008-2009'),
        ('c0000005-0000-0000-0000-000000000005', 'Under 18', 2007, 2008, 'Ragazzi nati 2007-2008'),
        ('c0000006-0000-0000-0000-000000000006', 'Primavera', 2005, 2006, 'Giovani calciatori')
        ON CONFLICT (id) DO NOTHING` });
      results.seed_data.push('categories');
    } catch (e) { results.errors.push('categories seed: ' + e.message); }

    // Seed data - competizioni
    try {
      await supabase.rpc('exec_sql', { sql: `INSERT INTO competition (id, nome, tipo, regione, descrizione) VALUES 
        ('cc000001-0000-0000-0000-000000000001', 'Campionato Regionale Lazio', 'Campionato', 'Lazio', 'Campionato regionale FIGC'),
        ('cc000002-0000-0000-0000-000000000002', 'Coppa Lazio', 'Coppa', 'Lazio', 'Coppa regionale FIGC'),
        ('cc000003-0000-0000-0000-000000000003', 'Campionato Nazionale U19', 'Campionato', 'Nazionale', 'Campionato federale under 19'),
        ('cc000004-0000-0000-0000-000000000004', 'Torneo Friendlies', 'Amichevole', NULL, 'Partite amichevoli')
        ON CONFLICT (id) DO NOTHING` });
      results.seed_data.push('competitions');
    } catch (e) { results.errors.push('competitions seed: ' + e.message); }

    res.json({ success: true, results });
  } catch (err) {
    console.error('Migration error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── ARCHIVIA / SBLOCCA PARTITA ──
app.put('/api/partite/:id/archivia', authMiddleware, async (req, res) => {
  try {
    const { error } = await supabase.from('match').update({ archiviata: true }).eq('id', req.params.id);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/partite/:id/sblocca', authMiddleware, async (req, res) => {
  try {
    const { error } = await supabase.from('match').update({ archiviata: false }).eq('id', req.params.id);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── CONVOCAZIONI ──
app.get('/api/partite/:matchId/convocazioni', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase.from('convocation').select('*, team_player:team_player_id(player_id)').eq('match_id', req.params.matchId);
    if (error) return res.status(400).json({ error: error.message });
    // Mappa team_player_id → calciatoreId per retrocompatibilità frontend
    const result = (data || []).map(c => ({
      ...c,
      calciatoreId: c.team_player?.player_id || c.team_player_id
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/squadre/:squadraId/partite/:matchId/convocati', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase.from('convocation').select('*, team_player:team_player_id(player_id)').eq('match_id', req.params.matchId).eq('presente', true);
    if (error) return res.status(400).json({ error: error.message });
    const result = (data || []).map(c => ({
      ...c,
      calciatoreId: c.team_player?.player_id || c.team_player_id
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/partite/:matchId/convocazioni', authMiddleware, requirePermission('formazione', 'write'), async (req, res) => {
  try {
    const { calciatoreId, presente } = req.body;
    // Trova il team_player_id dal player_id
    const { data: tp } = await supabase.from('team_player').select('id').eq('player_id', calciatoreId).limit(1).single();
    const teamPlayerId = tp ? tp.id : null;
    if (!teamPlayerId) return res.status(400).json({ error: 'Giocatore non trovato nella rosa' });
    
    const { data: existing } = await supabase.from('convocation').select('id').eq('match_id', req.params.matchId).eq('team_player_id', teamPlayerId).single();
    if (existing) {
      const { data, error } = await supabase.from('convocation').update({ presente }).eq('id', existing.id).select().single();
      if (error) return res.status(400).json({ error: error.message });
      res.json(data);
    } else {
      const { data, error } = await supabase.from('convocation').insert({ match_id: req.params.matchId, team_player_id: teamPlayerId, presente }).select().single();
      if (error) return res.status(400).json({ error: error.message });
      res.json(data);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Batch convocazioni (una sola chiamata per tutti)
app.post('/api/partite/:matchId/convocazioni-batch', authMiddleware, requirePermission('formazione', 'write'), async (req, res) => {
  try {
    const { convocazioni } = req.body;
    if (!convocazioni || !Array.isArray(convocazioni)) return res.status(400).json({ error: 'Dati mancanti' });
    
    // Mappa tutti i player_id → team_player_id in una query
    const playerIds = convocazioni.map(c => c.calciatoreId);
    const { data: tps } = await supabase.from('team_player').select('id, player_id').in('player_id', playerIds);
    const playerToTp = {};
    (tps || []).forEach(tp => { playerToTp[tp.player_id] = tp.id; });
    
    // Delete existing per questa partita + insert batch
    await supabase.from('convocation').delete().eq('match_id', req.params.matchId);
    
    const inserts = convocazioni
      .filter(c => playerToTp[c.calciatoreId])
      .map(c => ({
        match_id: req.params.matchId,
        team_player_id: playerToTp[c.calciatoreId],
        presente: c.presente
      }));
    
    if (inserts.length > 0) {
      const { error } = await supabase.from('convocation').insert(inserts);
      if (error) return res.status(400).json({ error: error.message });
    }
    
    res.json({ success: true, saved: inserts.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── FORMAZIONE ──
app.get('/api/squadre/:squadraId/partite/:matchId/formazione', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase.from('match_formation').select('*').eq('match_id', req.params.matchId);
    if (error) return res.status(400).json({ error: error.message });
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/partite/:matchId/formazione', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase.from('match_formation').select('*, team_player:team_player_id(player_id)').eq('match_id', req.params.matchId);
    if (error) return res.status(400).json({ error: error.message });
    const result = (data || []).map(f => ({
      ...f,
      calciatoreId: f.team_player?.player_id || f.team_player_id,
      posizione: f.is_starter ? 'Titolare' : 'Panchina',
      numeroMaglia: f.numero_maglia
    }));
    
    // Leggi metadati formazione dal campo dedicato
    let meta = { modulo: '4-3-3', positions: {} };
    const { data: matchData } = await supabase.from('match').select('formazione_meta').eq('id', req.params.matchId).single();
    if (matchData?.formazione_meta) meta = matchData.formazione_meta;
    
    res.json({ formazione: result, meta });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/partite/:matchId/formazione', authMiddleware, requirePermission('formazione', 'write'), async (req, res) => {
  try {
    const { formazione, modulo, positions } = req.body;
    if (!formazione || !Array.isArray(formazione)) return res.status(400).json({ error: 'Dati mancanti' });
    
    // Mappa player_id → team_player_id
    const playerIds = formazione.map(f => f.calciatoreId);
    const { data: tps } = await supabase.from('team_player').select('id, player_id').in('player_id', playerIds);
    const playerToTp = {};
    (tps || []).forEach(tp => { playerToTp[tp.player_id] = tp.id; });
    
    // Delete existing
    await supabase.from('match_formation').delete().eq('match_id', req.params.matchId);
    
    // Insert batch
    const inserts = formazione.filter(f => playerToTp[f.calciatoreId]).map((f, i) => ({
      match_id: req.params.matchId,
      team_player_id: playerToTp[f.calciatoreId],
      posizione: f.posizione === 'Titolare' ? 'Titolare' : 'Panchina',
      numero_maglia: f.numeroMaglia || null,
      is_starter: f.posizione === 'Titolare',
      is_captain: f.capitano || false,
      is_vice_captain: f.viceCapitano || false,
      ordine: i
    }));
    
    if (inserts.length > 0) {
      const { error } = await supabase.from('match_formation').insert(inserts);
      if (error) return res.status(400).json({ error: error.message });
    }
    
    // Salva metadati formazione (modulo + posizioni custom) nel campo dedicato
    if (modulo || positions) {
      await supabase.from('match').update({ formazione_meta: { modulo: modulo || '4-3-3', positions: positions || {} } }).eq('id', req.params.matchId);
    }
    
    res.json({ success: true, saved: inserts.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── EVENTI PARTITA ──
app.get('/api/squadre/:squadraId/partite/:matchId/eventi', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase.from('match_event').select('*').eq('match_id', req.params.matchId).order('minuto');
    if (error) return res.status(400).json({ error: error.message });
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/partite/:matchId/dettaglio', authMiddleware, async (req, res) => {
  try {
    const { data: match } = await supabase.from('match').select('*, competition:competition_id(nome)').eq('id', req.params.matchId).single();
    if (match) match.competizione = match.competition?.nome || null;
    const { data: eventi } = await supabase.from('match_event').select('*, player:player_id(nome, cognome)').eq('match_id', req.params.matchId).order('minuto');
    // Mappa nomi giocatori negli eventi
    const eventiMapped = (eventi || []).map(e => ({
      ...e,
      player_name: e.player ? e.player.cognome + ' ' + (e.player.nome ? e.player.nome.charAt(0) + '.' : '') : ''
    }));
    res.json({ match, eventi: eventiMapped });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/partite/:matchId/eventi-batch', authMiddleware, requirePermission('partite', 'write'), async (req, res) => {
  try {
    const { error } = await supabase.from('match_event').delete().eq('match_id', req.params.matchId);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Batch insert eventi (una sola chiamata)
app.post('/api/partite/:matchId/eventi-batch', authMiddleware, requirePermission('partite', 'write'), async (req, res) => {
  try {
    const { eventi } = req.body;
    if (!eventi || !Array.isArray(eventi)) return res.status(400).json({ error: 'Dati mancanti' });
    
    // Delete existing
    await supabase.from('match_event').delete().eq('match_id', req.params.matchId);
    
    // Insert batch
    if (eventi.length > 0) {
      const inserts = eventi.map(e => ({
        match_id: req.params.matchId,
        tipo_evento: e.tipo,
        minuto: parseInt(e.minuto),
        player_id: e.principale_id || null
      }));
      const { error } = await supabase.from('match_event').insert(inserts);
      if (error) return res.status(400).json({ error: error.message });
    }
    
    res.json({ success: true, saved: eventi.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/partite/:matchId/evento-item', authMiddleware, requirePermission('partite', 'write'), async (req, res) => {
  try {
    const { tipo, minuto, calciatorePrincipaleId } = req.body;
    const insertData = { match_id: req.params.matchId, tipo_evento: tipo, minuto };
    if (calciatorePrincipaleId) insertData.player_id = calciatorePrincipaleId;
    const { data, error } = await supabase.from('match_event').insert(insertData).select().single();
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DISTINTA ──
app.get('/api/squadre/:squadraId/partite/:matchId/distinta', authMiddleware, async (req, res) => {
  try {
    // Prendi formazione con dati giocatore
    const { data: formazione } = await supabase.from('match_formation')
      .select('*, team_player:team_player_id(player_id, player:player_id(nome, cognome, data_nascita, matricola_figc, tipo_documento, numero_documento, rilasciato_da))')
      .eq('match_id', req.params.matchId)
      .order('is_starter', { ascending: false })
      .order('ordine');
    
    if (formazione && formazione.length > 0) {
      // Mappa nel formato atteso dalla distinta
      const result = formazione.map(f => ({
        id: f.team_player?.player_id || f.team_player_id,
        calciatoreId: f.team_player?.player_id || f.team_player_id,
        nome: f.team_player?.player?.nome || '',
        cognome: f.team_player?.player?.cognome || '',
        dataNascita: f.team_player?.player?.data_nascita || null,
        matricolaFigc: f.team_player?.player?.matricola_figc || null,
        tipoDocumento: f.team_player?.player?.tipo_documento || null,
        numeroDocumento: f.team_player?.player?.numero_documento || null,
        rilasciatoDa: f.team_player?.player?.rilasciato_da || null,
        numeroMaglia: f.numero_maglia,
        posizione: f.is_starter ? 'Titolare' : 'Panchina',
        capitano: f.is_captain,
        viceCapitano: f.is_vice_captain
      }));
      return res.json(result);
    }
    
    // Se non c'è formazione, restituisci array vuoto (la distinta userà i convocati)
    res.json([]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── IMPORT CALENDARIO CSV ──
app.post('/api/squadre/:squadraId/importa-calendario', authMiddleware, requirePermission('partite', 'write'), async (req, res) => {
  try {
    const { csvData } = req.body;
    if (!csvData || !Array.isArray(csvData)) return res.status(400).json({ error: 'Dati CSV mancanti' });
    let inserite = 0;
    for (const row of csvData) {
      if (row.length < 3) continue;
      const [data, ora, avversario, luogo, competizione, giornata] = row;
      const dataOra = new Date(`${data}T${ora || '15:00'}:00`).toISOString();
      // Cerca competition_id se specificata
      let comp_id = null;
      if (competizione) {
        const { data: comp } = await supabase.from('competition').select('id').ilike('nome', '%' + competizione + '%').limit(1).single();
        if (comp) comp_id = comp.id;
      }
      const { error } = await supabase.from('match').insert({
        team_id: req.params.squadraId,
        data_ora: dataOra,
        avversario: avversario || 'Avversario',
        luogo: luogo || 'Casa',
        competition_id: comp_id,
        giornata: parseInt(giornata) || null
      });
      if (!error) inserite++;
    }
    res.json({ success: true, inserite });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── MOVE PLAYER ──
app.post('/api/calciatori/:id/move', authMiddleware, requirePermission('rosa', 'write'), async (req, res) => {
  try {
    const { fromSquadraId, toSquadraId } = req.body;
    const playerId = req.params.id;
    // Aggiorna team_player: cambia team_id
    const { error } = await supabase.from('team_player').update({ team_id: toSquadraId }).eq('player_id', playerId).eq('team_id', fromSquadraId);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── MATERIALE ALLENAMENTI ──
app.get('/api/squadre/:squadraId/allenamenti/materiale', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase.from('training_material').select('*').eq('team_id', req.params.squadraId).order('created_at', { ascending: false });
    if (error) {
      // Tabella potrebbe non esistere ancora
      return res.json([]);
    }
    res.json(data || []);
  } catch (err) {
    res.json([]);
  }
});

app.post('/api/squadre/:squadraId/allenamenti/materiale', authMiddleware, async (req, res) => {
  try {
    const { titolo, descrizione, tipo, url } = req.body;
    const { data, error } = await supabase.from('training_material').insert({
      team_id: req.params.squadraId, titolo, descrizione, tipo, url
    }).select().single();
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/allenamenti/materiale/:id', authMiddleware, async (req, res) => {
  try {
    const { error } = await supabase.from('training_material').delete().eq('id', req.params.id);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PROGRAMMA SEDUTA (salva/legge JSON nel campo note della tabella training) ──
app.get('/api/training/:trainingId/programma', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase.from('training').select('id, note, tipo, durata_minuti').eq('id', req.params.trainingId).single();
    if (error || !data) return res.json({ programma: null });
    // Il programma è salvato nel campo note con prefisso JSON::
    let programma = null;
    if (data.note && data.note.startsWith('JSON::')) {
      try { programma = JSON.parse(data.note.substring(6)); } catch(e) {}
    }
    res.json({ programma, tipo: data.tipo, durata_minuti: data.durata_minuti });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/training/:trainingId/programma', authMiddleware, requirePermission('allenamenti', 'write'), async (req, res) => {
  try {
    const { programma } = req.body;
    const noteValue = programma ? 'JSON::' + JSON.stringify(programma) : null;
    const updateData = { note: noteValue };
    if (programma?.tipo) updateData.tipo = programma.tipo;
    if (programma?.fasi) {
      const durata = programma.fasi.reduce((s, f) => s + (f.durata || 0), 0);
      if (durata > 0) updateData.durata_minuti = durata;
    }
    const { error } = await supabase.from('training').update(updateData).eq('id', req.params.trainingId);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint per ottenere/creare training per una data specifica
app.get('/api/squadre/:squadraId/training-by-date/:date', authMiddleware, async (req, res) => {
  try {
    const { squadraId, date } = req.params;
    const dataInizio = date + 'T00:00:00';
    const dataFine = date + 'T23:59:59';
    const { data } = await supabase.from('training').select('*').eq('team_id', squadraId).gte('data_ora', dataInizio).lte('data_ora', dataFine).limit(1).single();
    if (data) {
      let programma = null;
      if (data.note && data.note.startsWith('JSON::')) {
        try { programma = JSON.parse(data.note.substring(6)); } catch(e) {}
      }
      res.json({ training: data, programma });
    } else {
      res.json({ training: null, programma: null });
    }
  } catch (err) {
    res.json({ training: null, programma: null });
  }
});

app.post('/api/squadre/:squadraId/training-by-date', authMiddleware, requirePermission('allenamenti', 'write'), async (req, res) => {
  try {
    const { date, programma } = req.body;
    const noteValue = programma ? 'JSON::' + JSON.stringify(programma) : null;
    const durata = programma?.fasi ? programma.fasi.reduce((s, f) => s + (f.durata || 0), 0) : 90;
    const { data, error } = await supabase.from('training').insert({
      team_id: req.params.squadraId,
      data_ora: date + 'T17:00:00',
      durata_minuti: durata,
      tipo: programma?.tipo || 'Allenamento',
      note: noteValue
    }).select().single();
    if (error) return res.status(400).json({ error: error.message });
    res.json({ training: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── STATS GIOCATORI COMPLETO (per pagina statistiche) ──
app.get('/api/squadre/:squadraId/stats-giocatori', authMiddleware, async (req, res) => {
  try {
    const teamId = req.params.squadraId;
    // Giocatori
    const { data: tps } = await supabase.from('team_player').select('id, player_id, ruolo_preferito, player:player_id(id, nome, cognome)').eq('team_id', teamId);
    // Partite terminate
    const { data: matches } = await supabase.from('match').select('id').eq('team_id', teamId).eq('stato', 'Terminata');
    const matchIds = (matches || []).map(m => m.id);
    // Formazioni (presenze)
    let formazioni = [];
    if (matchIds.length > 0) {
      const { data } = await supabase.from('match_formation').select('match_id, team_player_id, is_starter').in('match_id', matchIds);
      formazioni = data || [];
    }
    // Eventi
    let eventi = [];
    if (matchIds.length > 0) {
      const { data } = await supabase.from('match_event').select('tipo_evento, player_id').in('match_id', matchIds);
      eventi = data || [];
    }
    // Calcola stats per giocatore
    const tpToPlayer = {};
    const playerStats = {};
    (tps || []).forEach(tp => {
      tpToPlayer[tp.id] = tp.player_id;
      const p = tp.player;
      if (p) playerStats[p.id] = { id: p.id, nome: p.nome, cognome: p.cognome, ruolo: tp.ruolo_preferito || '', presenze: 0, gol: 0, assist: 0, ammonizioni: 0, espulsioni: 0 };
    });
    // Presenze da formazioni (solo titolari = is_starter)
    formazioni.filter(f => f.is_starter).forEach(f => {
      const pid = tpToPlayer[f.team_player_id];
      if (pid && playerStats[pid]) playerStats[pid].presenze++;
    });
    // Fallback: per partite senza formazione, usa convocazioni
    const matchesWithFormation = new Set(formazioni.map(f => f.match_id));
    const matchesWithoutFormation = matchIds.filter(mid => !matchesWithFormation.has(mid));
    if (matchesWithoutFormation.length > 0) {
      const { data: convs } = await supabase.from('convocation').select('match_id, team_player_id, presente').in('match_id', matchesWithoutFormation).eq('presente', true);
      (convs || []).forEach(cv => {
        const pid = tpToPlayer[cv.team_player_id];
        if (pid && playerStats[pid]) playerStats[pid].presenze++;
      });
    }
    // Gol, assist, cartellini da eventi
    eventi.forEach(e => {
      if (!e.player_id || !playerStats[e.player_id]) return;
      if (e.tipo_evento === 'GOAL') playerStats[e.player_id].gol++;
      if (e.tipo_evento === 'ASSIST') playerStats[e.player_id].assist++;
      if (e.tipo_evento === 'YELLOW') playerStats[e.player_id].ammonizioni++;
      if (e.tipo_evento === 'RED') playerStats[e.player_id].espulsioni++;
    });
    res.json({ stats: Object.values(playerStats), partiteGiocate: matchIds.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── STAFF COMPLETO (per distinta) ──
app.get('/api/squadre/:squadraId/staff-completo', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase.from('team_staff')
      .select('ruolo_squadra, staff:staff_id(id, nome, cognome, ruolo, qualifiche, documento)')
      .eq('team_id', req.params.squadraId);
    if (error) return res.status(400).json({ error: error.message });
    const result = (data || []).map(ts => {
      const s = ts.staff || {};
      const q = s.qualifiche || {};
      return {
        id: s.id,
        nome: s.nome,
        cognome: s.cognome,
        ruolo_squadra: ts.ruolo_squadra,
        matricola: q.matricola || '',
        tessera: q.tessera_figc || q.tessera_lnd || '',
        tipo_tessera: q.tipo_tessera || ''
      };
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── TRAINING TEMPLATES ──
app.get('/api/squadre/:squadraId/training-templates', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase.from('training_template').select('*').eq('team_id', req.params.squadraId).order('created_at', { ascending: false });
    if (error) return res.status(400).json({ error: error.message });
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/squadre/:squadraId/training-templates', authMiddleware, requirePermission('allenamenti', 'write'), async (req, res) => {
  try {
    const { nome, programma } = req.body;
    if (!nome || !programma) return res.status(400).json({ error: 'Nome e programma richiesti' });
    const { data, error } = await supabase.from('training_template').insert({
      team_id: req.params.squadraId, nome, programma, created_by: req.user.id
    }).select().single();
    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/training-templates/:id', authMiddleware, requirePermission('allenamenti', 'write'), async (req, res) => {
  try {
    const { error } = await supabase.from('training_template').delete().eq('id', req.params.id);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// === PDF CALENDARIO IMPORT ===
const { findTeamInPdf, extractCalendar } = require('./pdfCalendarioParser');

// Step 1: Upload PDF + cerca squadra → ritorna categorie trovate
app.post('/api/calendario/parse-pdf', authMiddleware, upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'File PDF richiesto' });
    const searchName = req.body.searchName;
    if (!searchName) return res.status(400).json({ error: 'Nome squadra richiesto' });
    
    const result = await findTeamInPdf(req.file.buffer, searchName);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Errore parsing PDF: ' + err.message });
  }
});

// Step 2: Estrai calendario per categoria specifica
app.post('/api/calendario/extract', authMiddleware, upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'File PDF richiesto' });
    const { searchName, categoria, girone } = req.body;
    if (!searchName || !categoria || !girone) return res.status(400).json({ error: 'Parametri mancanti' });
    
    const result = await extractCalendar(req.file.buffer, searchName, categoria, girone);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Errore estrazione: ' + err.message });
  }
});

// Step 3: Conferma e inserisci partite nel DB
app.post('/api/calendario/import', authMiddleware, requirePermission('partite', 'write'), async (req, res) => {
  try {
    const { squadraId, partite } = req.body;
    if (!squadraId || !partite || !partite.length) return res.status(400).json({ error: 'Dati mancanti' });
    
    const inserts = partite.map(p => ({
      team_id: squadraId,
      data_ora: p.data,
      avversario: p.avversario,
      luogo: p.luogo,
      giornata: p.giornata,
      indirizzo_campo: p.indirizzo_campo || null,
      stato: 'Programmata'
    }));
    
    const { data, error } = await supabase.from('match').insert(inserts).select();
    if (error) return res.status(400).json({ error: error.message });
    res.json({ inserite: data.length });
  } catch (err) {
    res.status(500).json({ error: 'Errore inserimento: ' + err.message });
  }
});

// ── IMPORT DA TUTTOCAMPO ──
app.post('/api/calendario/import-tuttocampo', authMiddleware, requirePermission('partite', 'write'), async (req, res) => {
  try {
    const { url, teamName, squadraId, importResults, archiveCompleted, importEvents } = req.body;
    if (!url || !teamName || !squadraId) return res.status(400).json({ error: 'URL, nome squadra e squadraId richiesti' });

    // Valida URL
    const urlMatch = url.match(/https:\/\/www\.tuttocampo\.it\/(\d{4}-\d{2})\/([^/]+)\/([^/]+)\/([^/]+)\/Calendario/);
    if (!urlMatch) return res.status(400).json({ error: 'URL non valido. Formato atteso: https://www.tuttocampo.it/ANNO/REGIONE/CATEGORIA/GIRONE/Calendario' });

    const [, anno, regione, categoria, girone] = urlMatch;
    const baseUrl = `https://www.tuttocampo.it/${anno}/${regione}/${categoria}/${girone}`;
    const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';
    const headers = { 'User-Agent': UA };

    // Step 1: Scarica pagina principale per roundID, numero giornate e cookie sessione
    const mainResp = await fetch(baseUrl + '/Calendario', { headers });
    if (!mainResp.ok) return res.status(400).json({ error: 'Impossibile accedere a Tuttocampo (status ' + mainResp.status + ')' });
    const mainHtml = await mainResp.text();
    if (mainHtml.length < 1000) return res.status(400).json({ error: 'Tuttocampo non disponibile. Riprova tra qualche minuto.' });

    const matchesNumberMatch = mainHtml.match(/matchesNumber='(\d+)'/);
    const totalDays = matchesNumberMatch ? parseInt(matchesNumberMatch[1]) : 30;
    const roundIdMatch = mainHtml.match(/roundID='([^']+)'/);
    const roundID = roundIdMatch ? roundIdMatch[1] : '';
    if (!roundID) return res.status(400).json({ error: 'Impossibile determinare il girone.' });

    // Estrai cookie di sessione
    const setCookies = mainResp.headers.get('set-cookie') || '';
    const sessionCookie = setCookies.split(';')[0] || '';

    // Step 2: Per ogni giornata, scarica pagina per tckk + AJAX risultati
    const partite = [];
    const searchLower = teamName.toLowerCase();

    for (let day = 1; day <= totalDays; day++) {
      try {
        const pageResp = await fetch(`${baseUrl}/Giornata${day}`, {
          headers: { ...headers, 'Cookie': sessionCookie }
        });
        if (!pageResp.ok) continue;
        const pageHtml = await pageResp.text();
        const ttMatch = pageHtml.match(/var tt='(\d+)'/);
        if (!ttMatch) continue;
        const tckk = ttMatch[1];
        // Aggiorna cookie se presente
        const pageCookies = pageResp.headers.get('set-cookie');
        const cookie = pageCookies ? pageCookies.split(';')[0] : sessionCookie;

        const ajaxResp = await fetch(`https://www.tuttocampo.it/Web/Views/Results/ResultsView.php?tckk=${tckk}`, {
          method: 'POST',
          headers: {
            ...headers,
            'X-Requested-With': 'XMLHttpRequest',
            'Referer': `${baseUrl}/Giornata${day}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            'Cookie': cookie
          },
          body: `category_id=${roundID}&match_day=${day}&tournament_id=`
        });
        if (!ajaxResp.ok) continue;
        const html = await ajaxResp.text();
        if (html.length < 200) continue;

        const dateMatch = html.match(/id="match_date">([^<]+)/);
        const dateStr = dateMatch ? dateMatch[1].trim() : '';

        const trRegex = /<tr class="match[^"]*"[^>]*>([\s\S]*?)<\/tr>/g;
        let tr;
        while ((tr = trRegex.exec(html)) !== null) {
          const block = tr[1];
          if (!block.toLowerCase().includes(searchLower)) continue;

          const hourMatch = block.match(/class="hour[^"]*"[^>]*>\s*([^<]+)/);
          const hour = hourMatch ? hourMatch[1].trim() : '15:00';
          const homeNameMatch = block.match(/class="team home[\s\S]*?class="team-name">\s*([^<]+)/);
          const home = homeNameMatch ? homeNameMatch[1].trim() : '?';
          const awayNameMatch = block.match(/class="team away[\s\S]*?class="team-name">\s*([^<]+)/);
          const away = awayNameMatch ? awayNameMatch[1].trim() : '?';
          const homeGoalMatch = block.match(/class="team home[\s\S]*?class="goal[^"]*"[^>]*>\s*(\d+)/);
          const awayGoalMatch = block.match(/class="team away[\s\S]*?class="goal[^"]*"[^>]*>\s*(\d+)/);
          const hg = homeGoalMatch ? parseInt(homeGoalMatch[1]) : null;
          const ag = awayGoalMatch ? parseInt(awayGoalMatch[1]) : null;

          const isHome = home.toLowerCase().includes(searchLower);
          const avversario = isHome ? away : home;
          const luogo = isHome ? 'Casa' : 'Trasferta';

          // Parsing data: supporta formato "d|m|y", "dd/mm/yyyy", "yyyy-mm-dd"
          let dataOra = null;
          if (dateStr) {
            if (dateStr.includes('|')) {
              const parts = dateStr.split('|');
              if (parts.length === 3) {
                const [d, m, y] = parts;
                dataOra = `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}T${hour}:00`;
              }
            } else if (dateStr.includes('/')) {
              const parts = dateStr.split('/');
              if (parts.length === 3) {
                const [d, m, y] = parts;
                const year = y.length === 2 ? '20' + y : y;
                dataOra = `${year}-${m.padStart(2,'0')}-${d.padStart(2,'0')}T${hour}:00`;
              }
            } else if (dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
              dataOra = `${dateStr.substring(0,10)}T${hour}:00`;
            }
          }
          // Fallback: cerca data inline nel blocco partita
          if (!dataOra) {
            const inlineDateMatch = block.match(/class="date[^"]*"[^>]*>\s*([^<]+)/);
            if (inlineDateMatch) {
              const inDate = inlineDateMatch[1].trim();
              if (inDate.includes('/')) {
                const parts = inDate.split('/');
                if (parts.length === 3) {
                  const [d, m, y] = parts;
                  const year = y.length === 2 ? '20' + y : y;
                  dataOra = `${year}-${m.padStart(2,'0')}-${d.padStart(2,'0')}T${hour}:00`;
                }
              }
            }
          }

          // Estrai link dettaglio partita (per marcatori)
          const detailLinkMatch = block.match(/href="([^"]*Partita[^"]*)"/i);
          const detailLink = detailLinkMatch ? detailLinkMatch[1] : null;

          // Estrai marcatori dalla sezione scorers (dentro l'AJAX)
          let marcatori = [];
          if (importEvents && (hg !== null || ag !== null)) {
            // Scorers casa: nella sezione "team home" 
            const homeScorersMatch = block.match(/class="team home[\s\S]*?<ul class="scorers">([\s\S]*?)<\/ul>/);
            const awayScorersMatch = block.match(/class="team away[\s\S]*?<ul class="scorers">([\s\S]*?)<\/ul>/);
            
            // Prendi i marcatori della nostra squadra
            const ourScorersHtml = isHome ? (homeScorersMatch ? homeScorersMatch[1] : '') : (awayScorersMatch ? awayScorersMatch[1] : '');
            // Prendi i marcatori avversari (gol subiti)
            const theirScorersHtml = isHome ? (awayScorersMatch ? awayScorersMatch[1] : '') : (homeScorersMatch ? homeScorersMatch[1] : '');
            
            // Pattern: <a ... title="Cognome Nome">Iniziale. Cognome</a>
            const scorerRegex = /title="([^"]+)"/g;
            let sm;
            while ((sm = scorerRegex.exec(ourScorersHtml)) !== null) {
              const fullName = sm[1].trim(); // "Cognome Nome"
              marcatori.push({ tipo: 'GOAL', nome: fullName, minuto: null });
            }
            // Gol subiti
            const scorerRegex2 = /title="([^"]+)"/g;
            let sm2;
            while ((sm2 = scorerRegex2.exec(theirScorersHtml)) !== null) {
              marcatori.push({ tipo: 'SUBITO', nome: sm2[1].trim(), minuto: null });
            }
          }

          partite.push({
            giornata: day, dataOra, avversario, luogo,
            golCasa: isHome ? hg : ag,
            golOspite: isHome ? ag : hg,
            hasResult: hg !== null && ag !== null,
            detailLink: detailLink ? ('https://www.tuttocampo.it' + detailLink) : null,
            marcatori: marcatori.length > 0 ? marcatori : undefined
          });
        }
      } catch (e) { continue; }
    }

    if (partite.length === 0) {
      return res.status(404).json({ error: `Squadra "${teamName}" non trovata nel girone. Verifica il nome esatto su Tuttocampo.` });
    }

    res.json({ success: true, info: { anno, regione, categoria, girone, giornate: totalDays }, partite });
  } catch (err) {
    res.status(500).json({ error: 'Errore scraping: ' + err.message });
  }
});

// Funzione di parsing eventi da HTML Tuttocampo
function parseEventiFromHtml(html) {
  const eventi = [];

  // Pattern 1: sezione "Marcatori" / "Reti" con minuto e nome
  const marcatoriSection = html.match(/(?:Marcatori|Reti|Goals?|Gol)[\s\S]{0,3000}/i);
  if (marcatoriSection) {
    const section = marcatoriSection[0];
    const linePattern = /(\d+)[\u2019'\'\u0027]\s*([^<\n,;]+)/g;
    let lm;
    while ((lm = linePattern.exec(section)) !== null) {
      const minuto = parseInt(lm[1]);
      const nome = lm[2].trim().replace(/\s+/g, ' ');
      if (minuto > 0 && minuto <= 120 && nome.length > 2 && nome.length < 40) {
        if (!eventi.find(e => e.minuto === minuto && e.nome === nome)) {
          eventi.push({ tipo: 'GOAL', minuto, nome });
        }
      }
    }
  }

  // Pattern 2: classe scorer/goalscorer
  if (eventi.length === 0) {
    const scorerBlocks = html.match(/class="[^"]*(?:scorer|goalscorer|goal-player|marcator)[^"]*"[^>]*>[\s\S]*?<\/(?:div|span|li|td)>/gi) || [];
    for (const block of scorerBlocks) {
      const content = block.replace(/<[^>]*>/g, ' ').trim();
      const parts = content.match(/(\d+)[\u2019'\'\u0027]\s*(.+)/);
      if (parts) {
        const minuto = parseInt(parts[1]);
        const nome = parts[2].trim();
        if (minuto > 0 && minuto <= 120 && nome.length > 2 && !eventi.find(e => e.minuto === minuto && e.nome === nome)) {
          eventi.push({ tipo: 'GOAL', minuto, nome });
        }
      }
    }
  }

  // Pattern 3: cartellini gialli - sezione "Ammoniti"
  const yellowSection = html.match(/(?:Ammonit[io]|Ammonizioni|Yellow)[\s\S]{0,2000}/i);
  if (yellowSection) {
    const yRe = /(\d+)[\u2019'\'\u0027]\s*([A-Z\u00C0-\u00DA][a-z\u00E0-\u00FA]+(?:\s+[A-Z\u00C0-\u00DA][a-z\u00E0-\u00FA]*)*)/g;
    let ym;
    while ((ym = yRe.exec(yellowSection[0])) !== null) {
      const minuto = parseInt(ym[1]);
      if (minuto > 0 && minuto <= 120) {
        eventi.push({ tipo: 'YELLOW', minuto, nome: ym[2].trim() });
      }
    }
  }

  // Pattern 4: espulsioni - sezione "Espulsi"
  const redSection = html.match(/(?:Espuls[io]|Espulsioni|Red)[\s\S]{0,2000}/i);
  if (redSection) {
    const rRe = /(\d+)[\u2019'\'\u0027]\s*([A-Z\u00C0-\u00DA][a-z\u00E0-\u00FA]+(?:\s+[A-Z\u00C0-\u00DA][a-z\u00E0-\u00FA]*)*)/g;
    let rm;
    while ((rm = rRe.exec(redSection[0])) !== null) {
      const minuto = parseInt(rm[1]);
      if (minuto > 0 && minuto <= 120) {
        eventi.push({ tipo: 'RED', minuto, nome: rm[2].trim() });
      }
    }
  }

  return eventi;
}

// Import eventi (marcatori) da Tuttocampo per una singola partita
// Accetta: url (pagina giornata o dettaglio), oppure html incollato dall'utente
app.post('/api/partite/:matchId/import-eventi-tuttocampo', authMiddleware, requirePermission('partite', 'write'), async (req, res) => {
  try {
    const { url, html: rawHtml } = req.body;
    let html = rawHtml || '';

    if (!url && !html) return res.status(400).json({ error: 'URL o HTML richiesto' });

    // Se fornito URL, scarica la pagina
    if (url && !html) {
      const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';
      const resp = await fetch(url, { headers: { 'User-Agent': UA } });
      if (!resp.ok) return res.status(400).json({ error: 'Impossibile accedere alla pagina (status ' + resp.status + ')' });
      html = await resp.text();
      if (html.length < 1000 || html.includes('awsWafCookie')) {
        return res.status(400).json({ error: 'Pagina non disponibile (WAF attivo). Riprova tra qualche minuto oppure incolla l\'HTML manualmente.' });
      }
    }

    if (!html || html.length < 500) return res.status(400).json({ error: 'HTML mancante o troppo corto' });

    // Cerca marcatori nella struttura Tuttocampo AJAX (ul.scorers con title)
    const eventi = [];
    const scorerTitles = html.match(/class="scorers"[\s\S]*?<\/ul>/gi) || [];
    for (const block of scorerTitles) {
      const titleRegex = /title="([^"]+)"/g;
      let m;
      while ((m = titleRegex.exec(block)) !== null) {
        eventi.push({ tipo: 'GOAL', nome: m[1].trim(), minuto: null });
      }
    }

    // Fallback: prova parsing generico (per HTML da pagina dettaglio con login)
    if (eventi.length === 0) {
      const parsed = parseEventiFromHtml(html);
      eventi.push(...parsed);
    }

    res.json({ success: true, eventi, htmlLength: html.length });
  } catch (err) {
    res.status(500).json({ error: 'Errore: ' + err.message });
  }
});

// Import eventi in batch durante conferma Tuttocampo (marcatori dal calendario)
app.post('/api/partite/:matchId/eventi-tuttocampo', authMiddleware, requirePermission('partite', 'write'), async (req, res) => {
  try {
    const { matchId } = req.params;
    const { eventi, teamId } = req.body;
    if (!eventi || !Array.isArray(eventi) || eventi.length === 0) {
      return res.status(400).json({ error: 'Nessun evento da importare' });
    }

    // Prendi la rosa per fuzzy match nomi
    const { data: roster } = await supabase
      .from('team_player')
      .select('id, player_id, player:player_id(nome, cognome)')
      .eq('team_id', teamId);

    // Fuzzy match: cerca il giocatore per cognome
    function findPlayer(nome) {
      if (!nome || !roster) return null;
      const searchLower = nome.toLowerCase().trim();
      // Match esatto cognome
      let found = roster.find(r => r.player && r.player.cognome.toLowerCase() === searchLower);
      if (found) return found.player_id;
      // Match parziale (cognome contenuto)
      found = roster.find(r => r.player && searchLower.includes(r.player.cognome.toLowerCase()));
      if (found) return found.player_id;
      // Match cognome contenuto nel search
      found = roster.find(r => r.player && r.player.cognome.toLowerCase().includes(searchLower));
      if (found) return found.player_id;
      return null;
    }

    // Inserisci eventi
    const inserts = eventi.map(e => ({
      match_id: matchId,
      tipo_evento: e.tipo || 'GOAL',
      minuto: e.minuto || null,
      player_id: findPlayer(e.nome) || null
    }));

    // Delete existing events first
    await supabase.from('match_event').delete().eq('match_id', matchId);
    
    if (inserts.length > 0) {
      const { error } = await supabase.from('match_event').insert(inserts);
      if (error) return res.status(400).json({ error: error.message });
    }

    const matched = inserts.filter(i => i.player_id).length;
    res.json({ success: true, imported: inserts.length, matched, unmatched: inserts.length - matched });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Conferma import partite da Tuttocampo
app.post('/api/calendario/confirm-tuttocampo', authMiddleware, requirePermission('partite', 'write'), async (req, res) => {
  try {
    const { squadraId, partite, importResults, archiveCompleted, competizione, importEvents } = req.body;
    if (!squadraId || !partite || !partite.length) return res.status(400).json({ error: 'Dati mancanti' });

    // Cerca competition_id
    let competition_id = null;
    if (competizione) {
      const { data: comp } = await supabase.from('competition').select('id').ilike('nome', '%' + competizione + '%').limit(1).single();
      if (comp) competition_id = comp.id;
    }

    // Prendi la rosa per fuzzy match marcatori
    let roster = [];
    if (importEvents) {
      const { data: rosterData } = await supabase
        .from('team_player')
        .select('id, player_id, player:player_id(nome, cognome)')
        .eq('team_id', squadraId);
      roster = rosterData || [];
    }

    function findPlayer(nome) {
      if (!nome || roster.length === 0) return null;
      const searchLower = nome.toLowerCase().trim();
      let found = roster.find(r => r.player && r.player.cognome.toLowerCase() === searchLower);
      if (found) return found.player_id;
      found = roster.find(r => r.player && searchLower.includes(r.player.cognome.toLowerCase()));
      if (found) return found.player_id;
      found = roster.find(r => r.player && r.player.cognome.toLowerCase().includes(searchLower));
      if (found) return found.player_id;
      return null;
    }

    let inserite = 0;
    let eventiImportati = 0;
    for (const p of partite) {
      if (!p.avversario) continue;
      
      // data_ora è NOT NULL nel DB: se manca, stima dalla giornata adiacente
      let dataOra = p.dataOra ? new Date(p.dataOra).toISOString() : null;
      if (!dataOra) {
        // Cerca la data della giornata precedente o successiva per stimare
        const prevMatch = partite.find(x => x.giornata === (p.giornata - 1) && x.dataOra);
        const nextMatch = partite.find(x => x.giornata === (p.giornata + 1) && x.dataOra);
        if (prevMatch) {
          const d = new Date(prevMatch.dataOra);
          d.setDate(d.getDate() + 7);
          dataOra = d.toISOString();
        } else if (nextMatch) {
          const d = new Date(nextMatch.dataOra);
          d.setDate(d.getDate() - 7);
          dataOra = d.toISOString();
        } else {
          dataOra = new Date('2026-01-01T15:00:00').toISOString();
        }
      }
      
      const insertData = {
        team_id: squadraId,
        data_ora: dataOra,
        avversario: p.avversario,
        luogo: p.luogo || 'Casa',
        giornata: p.giornata || null,
        competition_id
      };

      // Se importa risultati e la partita ha un risultato
      if (importResults && p.golCasa !== null && p.golOspite !== null) {
        insertData.gol_casa = p.golCasa;
        insertData.gol_ospite = p.golOspite;
        insertData.stato = 'Terminata';
        if (archiveCompleted) insertData.archiviata = true;
      }

      const { data: inserted, error } = await supabase.from('match').insert(insertData).select('id').single();
      if (!error && inserted) {
        inserite++;
        // Importa eventi (marcatori) se disponibili
        if (importEvents && p.marcatori && p.marcatori.length > 0 && inserted.id) {
          const eventInserts = p.marcatori
            .map(m => ({
              match_id: inserted.id,
              tipo_evento: m.tipo || 'GOAL',
              minuto: m.minuto || null,
              player_id: findPlayer(m.nome) || null
            }))
            .filter(e => e.player_id); // Solo quelli matchati con la rosa
          if (eventInserts.length > 0) {
            const { error: evErr } = await supabase.from('match_event').insert(eventInserts);
            if (!evErr) eventiImportati += eventInserts.length;
          }
        }
      }
    }

    res.json({ success: true, inserite, eventiImportati });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = app;

// Avvio server locale (solo se eseguito direttamente, non importato)
if (require.main === module) {
  const PORT = process.env.PORT || 3002;
  app.listen(PORT, () => {
    console.log(`\n🚀 Backend API avviato su http://localhost:${PORT}`);
    console.log(`📡 Health check: http://localhost:${PORT}/api/health\n`);
  });
}
