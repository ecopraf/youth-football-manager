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
        is_superadmin: users.is_superadmin || false
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
    const { tipo = 'genitore', squadre_accesso = [], expires_in_hours = 720 } = req.body;
    const token = require('crypto').randomBytes(32).toString('hex');
    const scadenza = new Date(Date.now() + expires_in_hours * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase.from('guest_token').insert({
      token, utente_id: req.user.id, tipo, squadre_accesso, scadenza
    }).select().single();
    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json({ token: data.token, scadenza: data.scadenza, tipo: data.tipo, url: `/guest/${data.token}` });
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
});

app.get('/api/auth/guest-links', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase.from('guest_token').select('*').gte('scadenza', new Date().toISOString()).order('created_at', { ascending: false });
    if (error) return res.status(400).json({ error: error.message });
    res.json({ links: data || [] });
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
    res.json({ token: data.token, tipo: data.tipo, squadre_accesso: data.squadre_accesso });
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


app.get('/api/stagioni/:id/squadre', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase.from('team')
      .select('*, category:category_id(id, nome, tipo_campionato)')
      .eq('season_id', id)
      .order('nome');
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    
    // Arricchisci ogni team con nomi staff
    for (const team of (data || [])) {
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
    
    res.json(data || []);
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
app.get('/api/squadre/:squadraId/calciatori', async (req, res) => {
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

app.post('/api/squadre/:squadraId/calciatori', authMiddleware, async (req, res) => {
  try {
    const c = req.body;
    
    // Helper per convertire stringa vuota in null per campi DATE
    const toDate = (val) => val && val.trim() ? val.trim() : null;
    
    // Inserisci giocatore con tutti i campi dalla scheda
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

app.get('/api/squadre/:squadraId/scadenze-mediche', async (req, res) => {
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
app.get('/api/squadre/:squadraId/partite', async (req, res) => {
  try {
    const { data } = await supabase.from('match').select('*, competition:competition_id(id, nome)').eq('team_id', req.params.squadraId).order('data_ora', { ascending: false });
    // Mappa competition.nome → competizione per retrocompatibilità frontend
    const result = (data || []).map(m => ({ ...m, competizione: m.competition?.nome || null }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/squadre/:squadraId/partite-future', async (req, res) => {
  try {
    const now = new Date().toISOString();
    const { data } = await supabase.from('match').select('*, competition:competition_id(id, nome)').eq('team_id', req.params.squadraId).gte('data_ora', now).order('data_ora', { ascending: true }).limit(5);
    const result = (data || []).map(m => ({ ...m, competizione: m.competition?.nome || null }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/squadre/:squadraId/partite', authMiddleware, async (req, res) => {
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

app.put('/api/partite/:id', authMiddleware, async (req, res) => {
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

app.delete('/api/partite/:id', authMiddleware, async (req, res) => {
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

// ── SQUADRA STATISTICS ROUTES ──
app.get('/api/squadre/:id/statistiche-complete', async (req, res) => {
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

app.get('/api/squadre/:id/top-players', async (req, res) => {
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

app.put('/api/calciatori/:id', authMiddleware, async (req, res) => {
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

// ── TRAINING ROUTES ──

// Get training config (settimana tipo) dalla tabella dedicata
app.get('/api/squadre/:squadraId/allenamenti/config', async (req, res) => {
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
app.post('/api/squadre/:squadraId/allenamenti/config', authMiddleware, async (req, res) => {
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
app.put('/api/allenamenti/config/:id', authMiddleware, async (req, res) => {
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
app.delete('/api/allenamenti/config/:id', authMiddleware, async (req, res) => {
  try {
    const { error } = await supabase.from('training_config').delete().eq('id', req.params.id);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get training attendance (presenze) - mappa su training_attendance
app.get('/api/squadre/:squadraId/allenamenti/presenze', async (req, res) => {
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
app.post('/api/squadre/:squadraId/allenamenti/presenze-batch', authMiddleware, async (req, res) => {
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
app.post('/api/squadre/:squadraId/allenamenti/presenze', authMiddleware, async (req, res) => {
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
app.get('/api/squadre/:squadraId/allenamenti/summary', async (req, res) => {
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
app.get('/api/partite/:matchId/convocazioni', async (req, res) => {
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

app.get('/api/squadre/:squadraId/partite/:matchId/convocati', async (req, res) => {
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

app.post('/api/partite/:matchId/convocazioni', authMiddleware, async (req, res) => {
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
app.post('/api/partite/:matchId/convocazioni-batch', authMiddleware, async (req, res) => {
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
app.get('/api/squadre/:squadraId/partite/:matchId/formazione', async (req, res) => {
  try {
    const { data, error } = await supabase.from('match_formation').select('*').eq('match_id', req.params.matchId);
    if (error) return res.status(400).json({ error: error.message });
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/partite/:matchId/formazione', async (req, res) => {
  try {
    const { data, error } = await supabase.from('match_formation').select('*, team_player:team_player_id(player_id)').eq('match_id', req.params.matchId);
    if (error) return res.status(400).json({ error: error.message });
    // Mappa per il frontend: calciatoreId, posizione, numeroMaglia
    const result = (data || []).map(f => ({
      ...f,
      calciatoreId: f.team_player?.player_id || f.team_player_id,
      posizione: f.is_starter ? 'Titolare' : 'Panchina',
      numeroMaglia: f.numero_maglia
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/partite/:matchId/formazione', authMiddleware, async (req, res) => {
  try {
    const { formazione } = req.body;
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
    
    res.json({ success: true, saved: inserts.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── EVENTI PARTITA ──
app.get('/api/squadre/:squadraId/partite/:matchId/eventi', async (req, res) => {
  try {
    const { data, error } = await supabase.from('match_event').select('*').eq('match_id', req.params.matchId).order('minuto');
    if (error) return res.status(400).json({ error: error.message });
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/partite/:matchId/dettaglio', async (req, res) => {
  try {
    const { data: match } = await supabase.from('match').select('*, competition:competition_id(nome)').eq('id', req.params.matchId).single();
    if (match) match.competizione = match.competition?.nome || null;
    const { data: eventi } = await supabase.from('match_event').select('*, player:player_id(nome, cognome)').eq('match_id', req.params.matchId).order('minuto');
    // Mappa nomi giocatori negli eventi
    const eventiMapped = (eventi || []).map(e => ({
      ...e,
      player_name: e.player ? e.player.cognome + ' ' + e.player.nome : ''
    }));
    res.json({ match, eventi: eventiMapped });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/partite/:matchId/eventi-batch', authMiddleware, async (req, res) => {
  try {
    const { error } = await supabase.from('match_event').delete().eq('match_id', req.params.matchId);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Batch insert eventi (una sola chiamata)
app.post('/api/partite/:matchId/eventi-batch', authMiddleware, async (req, res) => {
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

app.post('/api/partite/:matchId/evento-item', authMiddleware, async (req, res) => {
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
app.get('/api/squadre/:squadraId/partite/:matchId/distinta', async (req, res) => {
  try {
    const { data, error } = await supabase.from('match_formation').select('*').eq('match_id', req.params.matchId);
    if (error) return res.status(400).json({ error: error.message });
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── IMPORT CALENDARIO CSV ──
app.post('/api/squadre/:squadraId/importa-calendario', authMiddleware, async (req, res) => {
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
app.post('/api/calciatori/:id/move', authMiddleware, async (req, res) => {
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
app.get('/api/squadre/:squadraId/allenamenti/materiale', async (req, res) => {
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
app.get('/api/training/:trainingId/programma', async (req, res) => {
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

app.put('/api/training/:trainingId/programma', authMiddleware, async (req, res) => {
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
app.get('/api/squadre/:squadraId/training-by-date/:date', async (req, res) => {
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

app.post('/api/squadre/:squadraId/training-by-date', authMiddleware, async (req, res) => {
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

// ── TRAINING TEMPLATES ──
app.get('/api/squadre/:squadraId/training-templates', async (req, res) => {
  try {
    const { data, error } = await supabase.from('training_template').select('*').eq('team_id', req.params.squadraId).order('created_at', { ascending: false });
    if (error) return res.status(400).json({ error: error.message });
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/squadre/:squadraId/training-templates', authMiddleware, async (req, res) => {
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

app.delete('/api/training-templates/:id', authMiddleware, async (req, res) => {
  try {
    const { error } = await supabase.from('training_template').delete().eq('id', req.params.id);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true });
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
