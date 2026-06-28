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
    const { data: user } = await supabase.from('users').select('*').eq('id', decoded.userId).single();
    if (!user) return res.status(401).json({ error: 'Utente non trovato' });
    if (user.is_active === false) return res.status(401).json({ error: 'Account disattivato' });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token non valido' });
  }
};

// Export supabase e JWT_SECRET per i moduli
module.exports = { app, supabase, JWT_SECRET, authMiddleware };

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
        is_superadmin: users.is_superadmin || false
      } 
    });
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, nome, cognome, ruolo, workspace_id } = req.body;
    if (!email || !password || !nome || !cognome) return res.status(400).json({ error: 'Tutti i campi sono richiesti' });
    
    const { data: existing } = await supabase.from('users').select('id').eq('email', email.toLowerCase()).single();
    if (existing) return res.status(409).json({ error: 'Email già registrata' });
    
    const password_hash = await bcrypt.hash(password, 10);
    const { data: newUser, error } = await supabase.from('users').insert({
      email: email.toLowerCase(), password_hash, nome, cognome, ruolo: ruolo || 'admin',
      workspace_id: workspace_id || '00000000-0000-0000-0000-000000000001', is_active: true
    }).select().single();
    
    if (error) return res.status(400).json({ error: error.message });
    
    const token = jwt.sign({ userId: newUser.id, email: newUser.email, ruolo: newUser.ruolo, workspace_id: newUser.workspace_id }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: newUser.id, nome: newUser.nome, cognome: newUser.cognome, email: newUser.email, ruolo: newUser.ruolo, workspace_id: newUser.workspace_id } });
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
    let query = supabase.from('users').select('id, nome, cognome, email, ruolo, workspace_id, ruoli, squadre_accesso, is_superadmin, is_active').eq('is_active', true).order('cognome');
    if (workspaceId) query = query.eq('workspace_id', workspaceId);
    const { data, error } = await query;
    if (error) return res.status(400).json({ error: error.message });
    res.json({ users: data || [] });
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
});

app.post('/api/auth/users', authMiddleware, async (req, res) => {
  try {
    const { email, password, nome, cognome, ruolo, workspace_id, ruoli, squadre_accesso } = req.body;
    const password_hash = await bcrypt.hash(password || 'ChangeMe123!', 10);
    const { data, error } = await supabase.from('users').insert({
      email: email.toLowerCase(), password_hash, nome, cognome,
      ruolo: ruolo || 'admin', workspace_id, ruoli: ruoli || [ruolo || 'admin'],
      squadre_accesso: squadre_accesso || [], is_active: true
    }).select().single();
    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
});

app.put('/api/auth/users/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, cognome, ruolo, workspace_id, ruoli, squadre_accesso, is_active } = req.body;
    const { data, error } = await supabase.from('users').update({ nome, cognome, ruolo, workspace_id, ruoli, squadre_accesso, is_active }).eq('id', id).select().single();
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true, user: data });
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
    const { workspace_id, expires_in_hours = 24 } = req.body;
    const token = require('crypto').randomBytes(32).toString('hex');
    const expires_at = new Date(Date.now() + expires_in_hours * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase.from('guest_link').insert({ token, workspace_id, expires_at }).select().single();
    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json({ token: data.token, expires_at: data.expires_at, url: `/guest/${data.token}` });
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
});

app.get('/api/auth/guest-links', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase.from('guest_link').select('*').gte('expires_at', new Date().toISOString()).order('created_at', { ascending: false });
    if (error) return res.status(400).json({ error: error.message });
    res.json({ links: data || [] });
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
});

app.delete('/api/auth/guest-link/:token', authMiddleware, async (req, res) => {
  try {
    const { token } = req.params;
    const { error } = await supabase.from('guest_link').delete().eq('token', token);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
});

app.get('/api/guest/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { data, error } = await supabase.from('guest_link').select('*, workspace:workspace_id(id, nome)').eq('token', token).gte('expires_at', new Date().toISOString()).single();
    if (error || !data) return res.status(404).json({ error: 'Link non valido o scaduto' });
    res.json({ workspace: data.workspace });
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
});

// ── WORKSPACE ROUTES ──
app.get('/api/workspaces', async (req, res) => {
  try {
    const { data, error } = await supabase.from('workspace').select('id, nome, logo_url, data_creazione').order('nome');
    if (error) return res.status(400).json({ error: error.message });
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
});

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

app.get('/api/workspaces/:id/stagioni', async (req, res) => {
  try {
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

// ── STAGIONE ROUTES ──
app.get('/api/stagioni', async (req, res) => {
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

// DEBUG: Test endpoint per verificare route
app.get('/api/debug/routes', (req, res) => {
  const routes = [];
  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      routes.push({
        path: middleware.route.path,
        methods: Object.keys(middleware.route.methods)
      });
    } else if (middleware.name === 'router') {
      middleware.handle.stack.forEach((handler) => {
        if (handler.route) {
          routes.push({
            path: handler.route.path,
            methods: Object.keys(handler.route.methods)
          });
        }
      });
    }
  });
  res.json({ routes: routes.filter(r => r.path.includes('stagioni')) });
});

app.get('/api/stagioni/:id/squadre', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('[DEBUG] /api/stagioni/:id/squadre called with id:', id);
    const { data, error } = await supabase.from('team')
      .select('*, category:category_id(id, nome, tipo_campionato)')
      .eq('season_id', id)
      .order('nome');
    if (error) {
      console.error('[DEBUG] Supabase error:', error);
      return res.status(400).json({ error: error.message });
    }
    console.log('[DEBUG] Returning teams:', data?.length);
    res.json(data || []);
  } catch (err) {
    console.error('[DEBUG] Catch error:', err);
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
app.get('/api/squadre', async (req, res) => {
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

app.get('/api/squadre/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase.from('team').select('*').eq('id', id).single();
    if (error || !data) return res.status(404).json({ error: 'Squadra non trovata' });
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
      await supabase.from('formazione_partita').delete().eq('match_id', p.id);
      await supabase.from('convocation').delete().eq('match_id', p.id);
      await supabase.from('match_event').delete().eq('match_id', p.id);
    }
    await supabase.from('match').delete().eq('team_id', sid);
    await supabase.from('presenza_allenamento').delete().eq('team_id', sid);
    await supabase.from('configurazione_allenamento').delete().eq('team_id', sid);
    await supabase.from('team_player').delete().eq('team_id', sid);
    await supabase.from('team').delete().eq('id', sid);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
});

// ── GIOCATORI ROUTES ──
app.get('/api/squadre/:squadraId/calciatori', async (req, res) => {
  try {
    const { data } = await supabase.from('team_player').select('calciatore:player_id(*), numero_maglia, ruolo, stato').eq('team_id', req.params.squadraId);
    res.json((data || []).map(r => ({
      id: r.calciatore.id, nome: r.calciatore.nome, cognome: r.calciatore.cognome, data_nascita: r.calciatore.data_nascita,
      telefono: r.calciatore.telefono, medical_cert_date: r.calciatore.medical_cert_date, matricola_figc: r.calciatore.matricola_figc,
      tipo_documento: r.calciatore.tipo_documento, numero_documento: r.calciatore.numero_documento, rilasciato_da: r.calciatore.rilasciato_da,
      numero_maglia: r.numero_maglia, ruolo: r.ruolo, stato: r.stato
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/squadre/:squadraId/calciatori', async (req, res) => {
  try {
    const c = req.body;
    
    // Inserisci solo i campi che esistono nella tabella player
    const playerData = {
      nome: c.nome, 
      cognome: c.cognome,
      data_nascita: c.data_nascita || c.dataVisitaMedica,
      telefono: c.telefono,
      sesso: c.sesso || 'M'
    };
    
    const { data: cal, error } = await supabase.from('player').insert(playerData).select().single();
    if (error) return res.status(500).json({ error: error.message });
    
    // Inserisci in team_player
    await supabase.from('team_player').insert({ 
      team_id: req.params.squadraId, 
      player_id: cal.id, 
      numero_maglia: c.numero_maglia || c.numeroMaglia, 
      ruolo: c.ruolo, 
      stato: 'Attivo' 
    });
    
    res.status(201).json(cal);
  } catch (err) {
    console.error('POST calciatori error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/squadre/:squadraId/scadenze-mediche', async (req, res) => {
  try {
    const { data: rosa } = await supabase
      .from('team_player')
      .select('calciatore:player_id(id, nome, cognome)')
      .eq('team_id', req.params.squadraId);
    
    // Per ora restituisci array vuoto - non c'è campo medical_cert_date
    res.json([]);
  } catch (err) {
    console.error('scadenze-mediche error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── PARTITE ROUTES ──
app.get('/api/squadre/:squadraId/partite', async (req, res) => {
  try {
    const { data } = await supabase.from('match').select('*').eq('team_id', req.params.squadraId).order('data_ora', { ascending: false });
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/squadre/:squadraId/partite-future', async (req, res) => {
  try {
    const now = new Date().toISOString();
    const { data } = await supabase.from('match').select('*').eq('team_id', req.params.squadraId).gte('data_ora', now).order('data_ora', { ascending: true }).limit(5);
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/squadre/:squadraId/partite', async (req, res) => {
  try {
    const p = req.body;
    const { data } = await supabase.from('match').insert({ team_id: req.params.squadraId, data_ora: p.dataOra, avversario: p.avversario, luogo: p.luogo, competizione: p.competizione, giornata: p.giornata }).select().single();
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/partite/:id', async (req, res) => {
  try {
    const p = req.body;
    await supabase.from('match').update({ data_ora: p.dataOra, avversario: p.avversario, luogo: p.luogo, competizione: p.competizione, giornata: p.giornata }).eq('id', req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/partite/:id', async (req, res) => {
  try {
    await supabase.from('match_event').delete().eq('match_id', req.params.id);
    await supabase.from('formazione_partita').delete().eq('match_id', req.params.id);
    await supabase.from('convocation').delete().eq('match_id', req.params.id);
    await supabase.from('match').delete().eq('id', req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── SQUADRA STATISTICS ROUTES ──
app.get('/api/squadre/:id/statistiche-complete', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Totale partite
    const { count: totalePartite } = await supabase.from('match').select('*', { count: 'exact', head: true }).eq('team_id', id);
    
    // Partite vinte/perse/pareggiate
    const { data: partite } = await supabase.from('match').select('gol_casa, gol_ospite, team_id').eq('team_id', id).eq('stato', 'Terminata');
    let vinte = 0, pareggiate = 0, perse = 0;
    partite?.forEach(p => {
      const golCasa = p.gol_casa || 0;
      const golOspite = p.gol_ospite || 0;
      if (golCasa > golOspite) vinte++;
      else if (golCasa === golOspite) pareggiate++;
      else perse++;
    });
    
    // Gol fatti/subiti
    const { data: golData } = await supabase.from('match_event').select('tipo_evento').eq('player_id', 
      supabase.from('team_player').select('player_id').eq('team_id', id)
    );
    
    res.json({
      totale_partite: totalePartite || 0,
      partite_vinte: vinte,
      partite_pareggiate: pareggiate,
      partite_perse: perse,
      gol_fatti: vinte * 2 + pareggiate, // Stima
      gol_subiti: perse
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/squadre/:id/top-players', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Prendi i giocatori con più gol
    const { data: players } = await supabase
      .from('team_player')
      .select(`
        id,
        player:player_id(id, nome, cognome),
        numero_maglia
      `)
      .eq('team_id', id)
      .order('numero_maglia');
    
    res.json(players || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/squadre/:id/valutazioni-top', async (req, res) => {
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
app.get('/api/calciatori/:id', async (req, res) => {
  try {
    const { data, error } = await supabase.from('player').select('*').eq('id', req.params.id).single();
    if (error || !data) return res.status(404).json({ error: 'Giocatore non trovato' });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
});

app.put('/api/calciatori/:id', async (req, res) => {
  try {
    const { nome, cognome, data_nascita, telefono, email, medical_cert_date, matricola_figc, tipo_documento, numero_documento, rilasciato_da, peso, altezza, piede_preferito } = req.body;
    const { data, error } = await supabase.from('player').update({ nome, cognome, data_nascita, telefono, email, medical_cert_date, matricola_figc, tipo_documento, numero_documento, rilasciato_da, peso, altezza, piede_preferito }).eq('id', req.params.id).select().single();
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
});

app.get('/api/calciatori/:id/stats-current', async (req, res) => {
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

module.exports = app;

// Avvio server locale (solo se eseguito direttamente, non importato)
if (require.main === module) {
  const PORT = process.env.PORT || 3002;
  app.listen(PORT, () => {
    console.log(`\n🚀 Backend API avviato su http://localhost:${PORT}`);
    console.log(`📡 Health check: http://localhost:${PORT}/api/health\n`);
  });
}
