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
  try { await supabase.from('squadra').select('id').limit(1); } catch(e) {}
  res.json({ status: 'ok', version: '3.14', warm: true });
});

// Endpoint warmup dedicato per mantenere il backend attivo
app.get('/api/warmup', async (req, res) => {
  try { 
    await supabase.from('squadra').select('id').limit(1); 
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
    const { data: user } = await supabase.from('utente').select('*').eq('id', decoded.userId).single();
    if (!user) return res.status(401).json({ error: 'Utente non trovato' });
    if (user.is_active === false) return res.status(401).json({ error: 'Account disattivato' });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token non valido' });
  }
};

// Helper: verifica se utente è admin
const isAdmin = (user) => {
  return user.is_superadmin === true || user.ruolo === 'admin';
};

// Helper: verifica se utente ha accesso a una squadra
const hasAccessToSquadra = (user, squadraId) => {
  if (user.is_superadmin === true) return true;
  if (isAdmin(user)) return true;
  if (user.squadre_accesso && user.squadre_accesso.includes(squadraId)) return true;
  return false;
};

// ── AUTH ENDPOINTS ──

// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, nome, cognome, ruolo, workspaceId, referralCode } = req.body;
    if (!email || !password || !nome) {
      return res.status(400).json({ error: 'Email, password e nome sono obbligatori' });
    }
    // Check se email esiste già
    const { data: existing } = await supabase.from('utente').select('id').eq('email', email).single();
    if (existing) return res.status(400).json({ error: 'Email già registrata' });

    const passwordHash = await bcrypt.hash(password, 10);
    const { data: user, error } = await supabase.from('utente')
      .insert({ 
        email, 
        password_hash: passwordHash, 
        nome, 
        cognome, 
        ruolo: ruolo || 'allenatore',
        ruoli: [ruolo || 'allenatore'],
        workspace_id: workspaceId,
        is_active: true,
        is_superadmin: false
      })
      .select().single();
    if (error) return res.status(500).json({ error: error.message });

    // Tracciamento referral se presente
    if (referralCode && user.workspace_id) {
      try {
        await supabase.from('workspace')
          .update({ referral_code: referralCode })
          .eq('id', user.workspace_id);
        await supabase.from('referral_log').insert({
          referral_code: referralCode,
          utente_id: user.id,
          workspace_id: user.workspace_id,
          tipo: 'registrazione',
          commissione: 50.00,
          stato: 'pending'
        }).catch(() => {});
      } catch (refErr) { console.log('Referral error:', refErr.message); }
    }

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ 
      user: { 
        id: user.id, 
        email: user.email, 
        nome: user.nome, 
        cognome: user.cognome,
        ruolo: user.ruolo,
        ruoli: user.ruoli,
        squadre_accesso: user.squadre_accesso,
        is_superadmin: user.is_superadmin,
        workspace_id: user.workspace_id,
        referralCode: referralCode || null
      }, 
      token 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email e password obbligatori' });

    const { data: user } = await supabase.from('utente').select('*').eq('email', email).single();
    if (!user) return res.status(401).json({ error: 'Credenziali non valide' });
    if (user.is_active === false) return res.status(401).json({ error: 'Account disattivato' });

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) return res.status(401).json({ error: 'Credenziali non valide' });

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ 
      user: { 
        id: user.id, 
        email: user.email, 
        nome: user.nome, 
        cognome: user.cognome,
        ruolo: user.ruolo,
        ruoli: user.ruoli,
        squadre_accesso: user.squadre_accesso,
        is_superadmin: user.is_superadmin,
        workspace_id: user.workspace_id 
      }, 
      token 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me
app.get('/api/auth/me', authMiddleware, async (req, res) => {
  res.json({ 
    user: { 
      id: req.user.id, 
      email: req.user.email, 
      nome: req.user.nome, 
      cognome: req.user.cognome,
      ruolo: req.user.ruolo,
      ruoli: req.user.ruoli,
      squadre_accesso: req.user.squadre_accesso,
      is_superadmin: req.user.is_superadmin,
      workspace_id: req.user.workspace_id
    } 
  });
});

// POST /api/auth/logout
app.post('/api/auth/logout', authMiddleware, async (req, res) => {
  res.json({ success: true });
});

// PUT /api/auth/profile
app.put('/api/auth/profile', authMiddleware, async (req, res) => {
  try {
    const { nome, cognome, password } = req.body;
    const updateData = {};
    if (nome) updateData.nome = nome;
    if (cognome) updateData.cognome = cognome;
    if (password) updateData.password_hash = await bcrypt.hash(password, 10);
    
    await supabase.from('utente').update(updateData).eq('id', req.user.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GESTIONE UTENTI (Admin) ──

// GET /api/auth/users - Lista utenti (admin only)
app.get('/api/auth/users', authMiddleware, async (req, res) => {
  if (!isAdmin(req.user)) {
    return res.status(403).json({ error: 'Accesso negato' });
  }
  try {
    const { data: users, error } = await supabase
      .from('utente')
      .select('*')
      .order('id', { ascending: false });
    res.json({ users: users || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/users - Crea utente (admin only)
app.post('/api/auth/users', authMiddleware, async (req, res) => {
  if (!isAdmin(req.user)) {
    return res.status(403).json({ error: 'Accesso negato' });
  }
  try {
    const { email, password, nome, cognome, ruolo, squadre_accesso } = req.body;
    if (!email || !password || !nome) {
      return res.status(400).json({ error: 'Email, password e nome sono obbligatori' });
    }
    
    const { data: existing } = await supabase.from('utente').select('id').eq('email', email).single();
    if (existing) return res.status(400).json({ error: 'Email già registrata' });

    const passwordHash = await bcrypt.hash(password, 10);
    const { data: user, error } = await supabase.from('utente')
      .insert({ 
        email, 
        password_hash: passwordHash, 
        nome, 
        cognome, 
        ruolo: ruolo || 'allenatore',
        ruoli: [ruolo || 'allenatore'],
        squadre_accesso: squadre_accesso || [],
        workspace_id: req.user.workspace_id,
        is_active: true,
        is_superadmin: false
      })
      .select().single();
    
    if (error) return res.status(500).json({ error: error.message });

    // Tracciamento referral se presente
    if (referralCode && user.workspace_id) {
      try {
        await supabase.from('workspace')
          .update({ referral_code: referralCode })
          .eq('id', user.workspace_id);
        await supabase.from('referral_log').insert({
          referral_code: referralCode,
          utente_id: user.id,
          workspace_id: user.workspace_id,
          tipo: 'registrazione',
          commissione: 50.00,
          stato: 'pending'
        }).catch(() => {});
      } catch (refErr) { console.log('Referral error:', refErr.message); }
    }

    res.status(201).json({ 
      user: { 
        id: user.id, 
        email: user.email, 
        nome: user.nome, 
        cognome: user.cognome,
        ruolo: user.ruolo,
        ruoli: user.ruoli,
        squadre_accesso: user.squadre_accesso,
        is_active: user.is_active,
        workspace_id: user.workspace_id,
        referralCode: referralCode || null
      } 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/auth/users/:id - Modifica utente (admin only)
app.put('/api/auth/users/:id', authMiddleware, async (req, res) => {
  if (!isAdmin(req.user)) {
    return res.status(403).json({ error: 'Accesso negato' });
  }
  try {
    const { nome, cognome, ruolo, squadre_accesso, is_active, password, workspace_id, referralCode } = req.body;
    const updateData = {};
    if (nome !== undefined) updateData.nome = nome;
    if (cognome !== undefined) updateData.cognome = cognome;
    if (ruolo !== undefined) {
      updateData.ruolo = ruolo;
      updateData.ruoli = [ruolo];
    }
    if (squadre_accesso !== undefined) updateData.squadre_accesso = squadre_accesso;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (workspace_id !== undefined) updateData.workspace_id = workspace_id;
    if (password) updateData.password_hash = await bcrypt.hash(password, 10);
    
    // Recupera utente prima dell'update per il referral
    const { data: user } = await supabase.from('utente').select('*').eq('id', req.params.id).single();
    
    const { error } = await supabase.from('utente').update(updateData).eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });

    // Tracciamento referral se presente
    if (referralCode && user?.workspace_id) {
      try {
        await supabase.from('workspace')
          .update({ referral_code: referralCode })
          .eq('id', user.workspace_id);
        await supabase.from('referral_log').insert({
          referral_code: referralCode,
          utente_id: user.id,
          workspace_id: user.workspace_id,
          tipo: 'registrazione',
          commissione: 50.00,
          stato: 'pending'
        }).catch(() => {});
      } catch (refErr) { console.log('Referral error:', refErr.message); }
    }
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/auth/users/:id - Disattiva utente (admin only)
app.delete('/api/auth/users/:id', authMiddleware, async (req, res) => {
  if (!isAdmin(req.user)) {
    return res.status(403).json({ error: 'Accesso negato' });
  }
  try {
    // Non permettere di disattivare se stessi
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'Non puoi disattivare il tuo account' });
    }
    
    await supabase.from('utente').update({ is_active: false }).eq('id', req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GUEST TOKEN ──

// POST /api/auth/guest-link - Genera link guest (admin only)
app.post('/api/auth/guest-link', authMiddleware, async (req, res) => {
  if (!isAdmin(req.user)) {
    return res.status(403).json({ error: 'Accesso negato' });
  }
  try {
    const { tipo, squadre_accesso, giocatore_id, scadenza_giorni } = req.body;
    if (!tipo || !['atleta', 'genitore'].includes(tipo)) {
      return res.status(400).json({ error: 'Tipo non valido (atleta o genitore)' });
    }
    
    // Genera token casuale
    const token = require('crypto').randomBytes(32).toString('hex');
    const scadenza = scadenza_giorni ? new Date(Date.now() + scadenza_giorni * 24 * 60 * 60 * 1000) : null;
    
    const { data: guestToken, error } = await supabase.from('guest_token')
      .insert({
        token,
        utente_id: req.user.id,
        tipo,
        squadre_accesso: squadre_accesso || [],
        giocatore_id: giocatore_id || null,
        scadenza: scadenza,
        created_at: new Date().toISOString()
      })
      .select().single();
    
    if (error) return res.status(500).json({ error: error.message });

    // Tracciamento referral se presente
    if (referralCode && user.workspace_id) {
      try {
        await supabase.from('workspace')
          .update({ referral_code: referralCode })
          .eq('id', user.workspace_id);
        await supabase.from('referral_log').insert({
          referral_code: referralCode,
          utente_id: user.id,
          workspace_id: user.workspace_id,
          tipo: 'registrazione',
          commissione: 50.00,
          stato: 'pending'
        }).catch(() => {});
      } catch (refErr) { console.log('Referral error:', refErr.message); }
    }
    
    const baseUrl = process.env.FRONTEND_URL || 'https://youth-football-manager.vercel.app';
    const link = `${baseUrl}/guest/${token}`;
    
    res.status(201).json({ 
      id: guestToken.id,
      token,
      link,
      tipo,
      scadenza: guestToken.scadenza,
      created_at: guestToken.created_at
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/guest-links - Lista link guest (admin only)
app.get('/api/auth/guest-links', authMiddleware, async (req, res) => {
  if (!isAdmin(req.user)) {
    return res.status(403).json({ error: 'Accesso negato' });
  }
  try {
    const { data: tokens } = await supabase
      .from('guest_token')
      .select('*, utente:utente_id(nome, cognome)')
      .order('created_at', { ascending: false });
    res.json({ tokens: tokens || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/auth/guest-link/:token - Revoca link guest (admin only)
app.delete('/api/auth/guest-link/:token', authMiddleware, async (req, res) => {
  if (!isAdmin(req.user)) {
    return res.status(403).json({ error: 'Accesso negato' });
  }
  try {
    await supabase.from('guest_token').delete().eq('token', req.params.token);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/guest/:token - Accesso guest
app.get('/api/guest/:token', async (req, res) => {
  try {
    const { data: guestToken } = await supabase
      .from('guest_token')
      .select('*, utente:utente_id(nome, cognome)')
      .eq('token', req.params.token)
      .single();
    
    if (!guestToken) {
      return res.status(404).json({ error: 'Link non valido' });
    }
    
    // Verifica scadenza
    if (guestToken.scadenza && new Date(guestToken.scadenza) < new Date()) {
      return res.status(410).json({ error: 'Link scaduto' });
    }
    
    res.json({ 
      tipo: guestToken.tipo,
      squadre_accesso: guestToken.squadre_accesso,
      giocatore_id: guestToken.giocatore_id,
      creator: guestToken.utente ? `${guestToken.utente.nome} ${guestToken.utente.cognome}` : 'Admin'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/workspaces', async (req, res) => { 
  // Torna tutti i workspace (per admin/superadmin)
  const { data } = await supabase.from('workspace').select('*'); 
  res.json(data || []); 
});

// Endpoint che ritorna i workspace accessibili all'utente loggato
app.get('/api/auth/workspaces', authMiddleware, async (req, res) => {
  try {
    // Superadmin vede tutti i workspace
    if (req.user.is_superadmin || req.user.ruolo === 'admin') {
      const { data } = await supabase.from('workspace').select('*').order('nome');
      return res.json(data || []);
    }
    
    // Altrimenti ritorna solo il workspace dell'utente
    if (req.user.workspace_id) {
      const { data } = await supabase.from('workspace').select('*').eq('id', req.user.workspace_id);
      return res.json(data || []);
    }
    
    // Se non ha workspace_id, ritorna vuoto
    res.json([]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint demo: inizializza dati demo

// Endpoint per ottenere le stagioni di un workspace
app.get('/api/workspaces/:id/stagioni', async (req, res) => {
  const { data } = await supabase.from('stagione').select('*').eq('workspace_id', req.params.id).order('data_inizio', { ascending: false });
  res.json(data || []);
});

// POST /api/workspaces - Crea workspace
app.post('/api/workspaces', async (req, res) => {
  try {
    const { nome, descrizione } = req.body;
    const { data, error } = await supabase
      .from('workspace')
      .insert({ nome, descrizione })
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/workspaces/:id - Modifica workspace
app.put('/api/workspaces/:id', async (req, res) => {
  try {
    const { nome, descrizione } = req.body;
    const { error } = await supabase
      .from('workspace')
      .update({ nome, descrizione })
      .eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/workspaces/:id - Elimina workspace
app.delete('/api/workspaces/:id', async (req, res) => {
  try {
    const sid = req.params.id;
    // Elimina in ordine: squadre -> stagioni -> workspace
    const { data: stagioni } = await supabase.from('stagione').select('id').eq('workspace_id', sid);
    for (const st of (stagioni || [])) {
      const { data: squadre } = await supabase.from('squadra').select('id').eq('stagione_id', st.id);
      for (const sq of (squadre || [])) {
        await supabase.from('squadra').delete().eq('id', sq.id);
      }
      await supabase.from('stagione').delete().eq('id', st.id);
    }
    await supabase.from('workspace').delete().eq('id', sid);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/stagioni - Crea stagione
app.post('/api/stagioni', async (req, res) => {
  try {
    const { workspace_id, nome, data_inizio, data_fine } = req.body;
    const { data, error } = await supabase
      .from('stagione')
      .insert({ workspace_id, nome, data_inizio, data_fine })
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/stagioni/:id - Elimina stagione
app.delete('/api/stagioni/:id', async (req, res) => {
  try {
    await supabase.from('stagione').delete().eq('id', req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.get('/api/demo/init', async (req, res) => {
  try {
    // Trova il workspace demo (Green Academy)
    const { data: workspaces } = await supabase
      .from('workspace')
      .select('*')
      .eq('id', '00000000-0000-0000-0000-000000000001');
    
    const workspace = workspaces?.[0];
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace demo non trovato' });
    }
    
    // Trova la stagione attiva per questo workspace
    const { data: stagioni } = await supabase
      .from('stagione')
      .select('*')
      .eq('workspace_id', workspace.id)
      .eq('is_attiva', true)
      .limit(1);
    
    const stagione = stagioni?.[0];
    if (!stagione) {
      return res.status(404).json({ error: 'Stagione attiva non trovata' });
    }
    
    // Trova le squadre per questa stagione
    const { data: squadre } = await supabase
      .from('squadra')
      .select('*')
      .eq('stagione_id', stagione.id)
      .order('nome');
    
    res.json({
      workspace,
      stagione,
      squadre: squadre || [],
      primaSquadra: squadre?.[0] || null
    });
  } catch (err) {
    console.error('Errore /api/demo/init:', err);
    res.status(500).json({ error: err.message });
  }
});
app.get('/api/squadre', async (req, res) => { const { data } = await supabase.from('squadra').select('*').order('nome'); res.json(data || []); });
app.put('/api/workspaces/:id/logo', async (req, res) => { await supabase.from('workspace').update({ logo_url: req.body.logo_url }).eq('id', req.params.id); res.json({ success: true }); });
app.get('/api/stagioni/:stagioneId/squadre', async (req, res) => { const { data } = await supabase.from('squadra').select('*').eq('stagione_id', req.params.stagioneId).order('nome'); res.json(data || []); });
app.post('/api/stagioni/:stagioneId/squadre', async (req, res) => { const b = req.body; const { data } = await supabase.from('squadra').insert({ stagione_id: req.params.stagioneId, nome: b.nome, categoria: b.categoria, allenatore: b.allenatore, dirigente: b.dirigente, dirigente2: b.dirigente2, preparatore_atletico: b.preparatore_atletico, allenatore_portieri: b.allenatore_portieri }).select().single(); res.status(201).json(data); });
app.put('/api/squadre/:id', async (req, res) => { const b = req.body; await supabase.from('squadra').update({ nome: b.nome, categoria: b.categoria, allenatore: b.allenatore, dirigente: b.dirigente, dirigente2: b.dirigente2, preparatore_atletico: b.preparatore_atletico, allenatore_portieri: b.allenatore_portieri }).eq('id', req.params.id); res.json({ success: true }); });
// POST /api/squadre/:id/sposta-partite - Sposta partite verso un'altra squadra
app.post('/api/squadre/:id/sposta-partite', async (req, res) => {
  try {
    const { toSquadraId } = req.body;
    if (!toSquadraId) return res.status(400).json({ error: 'toSquadraId obbligatorio' });
    
    const { data: partite, error } = await supabase
      .from('partita')
      .update({ squadra_id: toSquadraId })
      .eq('squadra_id', req.params.id)
      .select('id');
    
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, spostate: partite?.length || 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/squadre/:id/sposta-allezioni - Sposta tutti i dati allenamento verso un'altra squadra
app.post('/api/squadre/:id/sposta-allenamenti', async (req, res) => {
  try {
    const { toSquadraId } = req.body;
    if (!toSquadraId) return res.status(400).json({ error: 'toSquadraId obbligatorio' });
    
    // Sposta configurazione allenamenti
    await supabase.from('configurazione_allenamento')
      .update({ squadra_id: toSquadraId })
      .eq('squadra_id', req.params.id);
    
    // Sposta presenze
    await supabase.from('presenza_allenamento')
      .update({ squadra_id: toSquadraId })
      .eq('squadra_id', req.params.id);
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/squadre/:id
app.delete('/api/squadre/:id', async (req, res) => { const sid = req.params.id; const { data: partite } = await supabase.from('partita').select('id').eq('squadra_id', sid); for (const p of (partite||[])) { await supabase.from('formazione_partita').delete().eq('partita_id', p.id); await supabase.from('convocazione').delete().eq('partita_id', p.id); await supabase.from('evento_partita').delete().eq('partita_id', p.id); } await supabase.from('partita').delete().eq('squadra_id', sid); await supabase.from('presenza_allenamento').delete().eq('squadra_id', sid); await supabase.from('configurazione_allenamento').delete().eq('squadra_id', sid); await supabase.from('rosa').delete().eq('squadra_id', sid); await supabase.from('squadra').delete().eq('id', sid); res.json({ success: true }); });
app.get('/api/squadre/:squadraId/calciatori', async (req, res) => { const q = supabase.from('rosa').select('calciatore:calciatore_id(*), numero_maglia, ruolo, stato').eq('squadra_id', req.params.squadraId); const { data } = await q; res.json((data||[]).map(r => ({ id: r.calciatore.id, nome: r.calciatore.nome, cognome: r.calciatore.cognome, dataNascita: r.calciatore.data_nascita, telefono: r.calciatore.telefono, dataVisitaMedica: r.calciatore.data_visita_medica, matricolaFigc: r.calciatore.matricola_figc, tipoDocumento: r.calciatore.tipo_documento, numeroDocumento: r.calciatore.numero_documento, rilasciatoDa: r.calciatore.rilasciato_da, numeroMaglia: r.numero_maglia, ruolo: r.ruolo, stato: r.stato }))); });
app.post('/api/squadre/:squadraId/calciatori', async (req, res) => { const c = req.body; const { data: cal } = await supabase.from('calciatore').insert({ workspace_id: '11111111-1111-1111-1111-111111111111', nome: c.nome, cognome: c.cognome, data_nascita: c.dataNascita, telefono: c.telefono, data_visita_medica: c.dataVisitaMedica, matricola_figc: c.matricolaFigc, tipo_documento: c.tipoDocumento, numero_documento: c.numeroDocumento, rilasciato_da: c.rilasciatoDa }).select().single(); await supabase.from('rosa').insert({ squadra_id: req.params.squadraId, calciatore_id: cal.id, numero_maglia: c.numeroMaglia, ruolo: c.ruolo, stato: 'Attivo' }); res.status(201).json(cal); });
app.get('/api/squadre/:squadraId/scadenze-mediche', async (req, res) => { const { data: rosa } = await supabase.from('rosa').select('calciatore:calciatore_id(id, nome, cognome, data_visita_medica)').eq('squadra_id', req.params.squadraId); const oggi = new Date(); const scadenze = (rosa||[]).filter(r => r.calciatore.data_visita_medica).map(r => { const scadenza = new Date(r.calciatore.data_visita_medica); scadenza.setFullYear(scadenza.getFullYear()+1); return { id: r.calciatore.id, nome: r.calciatore.nome, cognome: r.calciatore.cognome, scadenza: scadenza.toISOString().split('T')[0], giorniRimanenti: Math.ceil((scadenza-oggi)/(1000*60*60*24)) }; }).filter(s => s.giorniRimanenti <= 30).sort((a,b) => a.giorniRimanenti-b.giorniRimanenti); res.json(scadenze); });
app.get('/api/squadre/:squadraId/partite', async (req, res) => { const { data } = await supabase.from('partita').select('*').eq('squadra_id', req.params.squadraId).order('data_ora', { ascending: false }); res.json(data || []); });
// GET /api/squadre/:squadraId/partite-future - Prossime partite
app.get('/api/squadre/:squadraId/partite-future', async (req, res) => { const now = new Date().toISOString(); const { data } = await supabase.from('partita').select('*').eq('squadra_id', req.params.squadraId).gte('data_ora', now).order('data_ora', { ascending: true }).limit(5); res.json(data || []); });
app.post('/api/squadre/:squadraId/partite', async (req, res) => { const p = req.body; const { data } = await supabase.from('partita').insert({ squadra_id: req.params.squadraId, data_ora: p.dataOra, avversario: p.avversario, luogo: p.luogo, competizione: p.competizione, giornata: p.giornata }).select().single(); res.status(201).json(data); });
app.put('/api/partite/:id', async (req, res) => { const p = req.body; await supabase.from('partita').update({ data_ora: p.dataOra, avversario: p.avversario, luogo: p.luogo, competizione: p.competizione, giornata: p.giornata }).eq('id', req.params.id); res.json({ success: true }); });
app.delete('/api/partite/:id', async (req, res) => { await supabase.from('evento_partita').delete().eq('partita_id', req.params.id); await supabase.from('formazione_partita').delete().eq('partita_id', req.params.id); await supabase.from('convocazione').delete().eq('partita_id', req.params.id); await supabase.from('partita').delete().eq('id', req.params.id); res.json({ success: true }); });

// PUT /api/partite/:id/archivia - Archivia partita
app.put('/api/partite/:id/archivia', async (req, res) => {
  try {
    const { data: partita } = await supabase.from('partita').select('id, archiviata').eq('id', req.params.id).single();
    if (!partita) return res.status(404).json({ error: 'Partita non trovata' });
    await supabase.from('partita').update({ archiviata: true }).eq('id', req.params.id);
    res.json({ success: true, archiviata: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/partite/:id/sblocca - Sblocca partita archiviata
app.put('/api/partite/:id/sblocca', async (req, res) => {
  try {
    const { data: partita } = await supabase.from('partita').select('id, archiviata').eq('id', req.params.id).single();
    if (!partita) return res.status(404).json({ error: 'Partita non trovata' });
    await supabase.from('partita').update({ archiviata: false }).eq('id', req.params.id);
    res.json({ success: true, archiviata: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/partite/:partitaId/dettaglio - Dettaglio con eventi
app.get('/api/partite/:partitaId/dettaglio', async (req, res) => { try { const { data: partita } = await supabase.from('partita').select('*').eq('id', req.params.partitaId).single(); if(!partita) return res.status(404).json({ error: 'Partita non trovata' }); const { data: eventi } = await supabase.from('evento_partita').select('tipo_evento_codice, minuto, calciatore_principale_id, calciatore_principale:calciatore_principale_id(nome, cognome), calciatore_secondario:calciatore_secondario_id(nome, cognome)').eq('partita_id', req.params.partitaId).order('minuto'); const golCasa = (eventi||[]).filter(e=>e.tipo_evento_codice==='GOAL' || e.tipo_evento_codice==='AUTOGOL').length; const golOspiti = (eventi||[]).filter(e=>e.tipo_evento_codice==='SUBITO').length; res.json({ partita, golCasa, golOspiti, eventi: (eventi||[]).map(e => ({ tipo: e.tipo_evento_codice, minuto: e.minuto, principale_id: e.calciatore_principale_id, principale: e.calciatore_principale ? (e.calciatore_principale.nome || '') + ' ' + (e.calciatore_principale.cognome || '') : null, secondario: e.calciatore_secondario ? (e.calciatore_secondario.nome || '') + ' ' + (e.calciatore_secondario.cognome || '') : null })) }); } catch(err) { res.status(500).json({ error: err.message }); } });

// DELETE /api/partite/:partitaId/eventi - Elimina tutti gli eventi
app.delete('/api/partite/:partitaId/eventi', async (req, res) => {
  try {
    const { error } = await supabase
      .from('evento_partita')
      .delete()
      .eq('partita_id', req.params.partitaId);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/partite/:partitaId/eventi-batch - Elimina tutti gli eventi
app.delete('/api/partite/:partitaId/eventi-batch', async (req, res) => {
  try {
    const { error } = await supabase.from('evento_partita').delete().eq('partita_id', req.params.partitaId);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/partite/:partitaId/evento-item - Inserisci evento (FIX: no null fields)
app.post('/api/partite/:partitaId/evento-item', async (req, res) => {
  try {
    const { tipo, calciatorePrincipaleId, calciatoreSecondarioId, minuto, note } = req.body;
    if (!tipo) return res.status(400).json({ error: 'Tipo è obbligatorio' });
    
    const evento = {
      partita_id: req.params.partitaId,
      tipo_evento_codice: tipo,
      minuto: minuto || null
    };
    if (calciatorePrincipaleId) evento.calciatore_principale_id = calciatorePrincipaleId;
    if (calciatoreSecondarioId) evento.calciatore_secondario_id = calciatoreSecondarioId;
    if (note) evento.note = note;
    
    const { data, error } = await supabase.from('evento_partita').insert(evento).select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/partite/:partitaId/formazione - Inserisci in formazione
app.post('/api/partite/:partitaId/formazione-batch', async (req, res) => {
  try {
    const { formazione } = req.body; // Array di { calciatoreId, numeroMaglia, posizione }
    if (!formazione || !Array.isArray(formazione)) {
      return res.status(400).json({ error: 'formazione deve essere un array' });
    }
    // Elimina formazione esistente
    await supabase.from('formazione_partita').delete().eq('partita_id', req.params.partitaId);
    // Inserisci nuova formazione
    const toInsert = formazione.map(f => ({
      partita_id: req.params.partitaId,
      calciatore_id: f.calciatoreId,
      numero_maglia: f.numeroMaglia || 99,
      posizione: f.posizione || 'Titolare',
      capitano: f.capitano || false,
      vice_capitano: f.viceCapitano || false
    }));
    const { data, error } = await supabase.from('formazione_partita').insert(toInsert).select();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// STATISTICHE COMPLETE
app.get('/api/squadre/:squadraId/statistiche-complete', async (req, res) => {
  try {
    const { data: partite } = await supabase.from('partita').select('id, data_ora, avversario, luogo, competizione, giornata').eq('squadra_id', req.params.squadraId).order('data_ora');
    let vittorie=0,pareggi=0,sconfitte=0,gf=0,gs=0,punti=0;
    const risultati=[];
    for(const p of (partite||[])){
      const{data:eventi}=await supabase.from('evento_partita').select('tipo_evento_codice').eq('partita_id',p.id);
      const golFatti=(eventi||[]).filter(e=>e.tipo_evento_codice==='GOAL' || e.tipo_evento_codice==='AUTOGOL').length;
      const golSubiti=(eventi||[]).filter(e=>e.tipo_evento_codice==='SUBITO').length;
      gf+=golFatti; gs+=golSubiti;
      // Include TUTTE le partite con almeno un evento (passate e future)
      if(golFatti>0 || golSubiti>0){
        risultati.push({id:p.id,dataOra:p.data_ora,avversario:p.avversario,luogo:p.luogo,competizione:p.competizione,giornata:p.giornata,golFatti,golSubiti});
      }
      // Calcola statistiche solo per partite passate
      if(new Date(p.data_ora)<new Date()){
        if(golFatti>golSubiti){vittorie++;punti+=3}else if(golFatti===golSubiti){pareggi++;punti+=1}else if(golFatti>0 || golSubiti>0){sconfitte++;}
      }
    }
    res.json({partiteGiocate:risultati.filter(r=>new Date(r.dataOra)<new Date()).length,partiteTotali:(partite||[]).length,punti,vittorie,pareggi,sconfitte,golFatti:gf,golSubiti:gs,differenzaReti:gf-gs,risultati:risultati.sort((a,b)=>new Date(b.dataOra)-new Date(a.dataOra))});
  } catch(err) { res.status(500).json({error:err.message}); }
});
app.get('/api/squadre/:squadraId/top-players', async (req, res) => { try { const { data: partite } = await supabase.from('partita').select('id').eq('squadra_id', req.params.squadraId); const ids = (partite||[]).map(p => p.id); if(ids.length===0) return res.json({ marcatori:[], assistmen:[], presenze:[] }); const { data: eventi } = await supabase.from('evento_partita').select('tipo_evento_codice, calciatore_principale_id, calciatore_secondario_id, minuto').in('partita_id', ids); const stats = {}; (eventi||[]).forEach(e => { if(!stats[e.calciatore_principale_id]) stats[e.calciatore_principale_id] = { gol:0, assist:0, presenze:0, minuti:0 }; stats[e.calciatore_principale_id].presenze++; if(e.tipo_evento_codice==='GOAL') { stats[e.calciatore_principale_id].gol++; stats[e.calciatore_principale_id].minuti += (e.minuto||0); } if(e.tipo_evento_codice==='GOAL' && e.calciatore_secondario_id) { if(!stats[e.calciatore_secondario_id]) stats[e.calciatore_secondario_id] = { gol:0, assist:0, presenze:0, minuti:0 }; stats[e.calciatore_secondario_id].assist++; } }); const { data: rosa } = await supabase.from('rosa').select('calciatore:calciatore_id(id, nome, cognome)').eq('squadra_id', req.params.squadraId); const nomi = {}; (rosa||[]).forEach(r => { nomi[r.calciatore.id] = r.calciatore.nome + ' ' + r.calciatore.cognome; }); const result = Object.entries(stats).map(([id, s]) => ({ id, nome: nomi[id]||id, ...s })); res.json({ marcatori: result.filter(x=>x.gol>0).sort((a,b) => b.gol-a.gol).slice(0,5), assistmen: result.filter(x=>x.assist>0).sort((a,b) => b.assist-a.assist).slice(0,5), presenze: result.filter(x=>x.presenze>0).sort((a,b) => b.presenze-a.presenze).slice(0,5) }); } catch(err) { res.status(500).json({ error: err.message }); } });
app.get('/api/partite/:partitaId/convocazioni', async (req, res) => { const { data } = await supabase.from('convocazione').select('id, presente, calciatore:calciatore_id(id, nome, cognome)').eq('partita_id', req.params.partitaId); res.json((data||[]).map(c => ({ id: c.id, calciatoreId: c.calciatore.id, nome: c.calciatore.nome, cognome: c.calciatore.cognome, presente: c.presente }))); });
app.post('/api/partite/:partitaId/convocazioni', async (req, res) => { try { const { calciatoreId, presente } = req.body; if(!calciatoreId||!req.params.partitaId) return res.status(400).json({error:'Dati mancanti'}); const { data: existing } = await supabase.from('convocazione').select('id').eq('partita_id', req.params.partitaId).eq('calciatore_id', calciatoreId); if(existing&&existing.length>0) await supabase.from('convocazione').update({presente}).eq('partita_id',req.params.partitaId).eq('calciatore_id',calciatoreId); else await supabase.from('convocazione').insert({partita_id:req.params.partitaId,calciatore_id:calciatoreId,presente}); if(presente){ const { data: rosa } = await supabase.from('rosa').select('numero_maglia').eq('calciatore_id',calciatoreId).single(); const { data: form } = await supabase.from('formazione_partita').select('id').eq('partita_id',req.params.partitaId).eq('calciatore_id',calciatoreId); if(form&&form.length>0) await supabase.from('formazione_partita').update({numero_maglia:rosa?.numero_maglia||99}).eq('partita_id',req.params.partitaId).eq('calciatore_id',calciatoreId); else await supabase.from('formazione_partita').insert({partita_id:req.params.partitaId,calciatore_id:calciatoreId,numero_maglia:rosa?.numero_maglia||99,posizione:'Panchina',capitano:false,vice_capitano:false}); } else { await supabase.from('formazione_partita').delete().eq('partita_id',req.params.partitaId).eq('calciatore_id',calciatoreId); } res.status(201).json({success:true}); } catch(err) { res.status(400).json({error:err.message}); } });
app.get('/api/partite/:partitaId/convocazioni-pdf', async (req, res) => { const { data: partita } = await supabase.from('partita').select('*, squadra:squadra_id(nome, categoria)').eq('id', req.params.partitaId).single(); if(!partita) return res.status(404).json({error:'Partita non trovata'}); const { data: convocazioni } = await supabase.from('convocazione').select('presente, calciatore:calciatore_id(nome, cognome, ruolo)').eq('partita_id', req.params.partitaId); const convocati = (convocazioni||[]).filter(c => c.presente === true).map(c => ({ nome: c.calciatore.nome, cognome: c.calciatore.cognome, ruolo: c.calciatore.ruolo })).sort((a,b) => a.cognome.localeCompare(b.cognome)); res.json({ partita, convocati }); });
app.get('/api/partite/:partitaId/distinta', async (req, res) => { const { data: partita } = await supabase.from('partita').select('*, squadra:squadra_id(*)').eq('id', req.params.partitaId).single(); if(!partita) return res.status(404).json({error:'Partita non trovata'}); const { data: formazione } = await supabase.from('formazione_partita').select('numero_maglia, posizione, capitano, vice_capitano, calciatore:calciatore_id(nome, cognome, data_nascita, matricola_figc, tipo_documento, numero_documento, rilasciato_da)').eq('partita_id', req.params.partitaId).order('numero_maglia'); res.json({ partita: { dataOra: partita.data_ora, avversario: partita.avversario, luogo: partita.luogo, competizione: partita.competizione, giornata: partita.giornata }, societa: partita.squadra?.nome, staff: { allenatore: partita.squadra?.allenatore||'', dirigente: partita.squadra?.dirigente||'', matricola_dirigente: partita.squadra?.matricola_dirigente||'', tessera_lnd_dirigente: partita.squadra?.tessera_lnd_dirigente||'', tessera_figc_allenatore: partita.squadra?.tessera_figc_allenatore||'' }, formazione: (formazione||[]).slice(0,20).map(f => ({ numeroMaglia: f.numero_maglia, cognome: f.calciatore.cognome, nome: f.calciatore.nome, dataNascita: f.calciatore.data_nascita, capitano: f.capitano, viceCapitano: f.vice_capitano, matricolaFigc: f.calciatore.matricola_figc, tipoDocumento: f.calciatore.tipo_documento, numeroDocumento: f.calciatore.numero_documento, rilasciatoDa: f.calciatore.rilasciato_da, posizione: f.posizione })) }); });

// ── FORMAZIONE PARTITA (GET e PUT batch) ──
app.get('/api/partite/:partitaId/formazione', async (req, res) => {
  const { data } = await supabase.from('formazione_partita')
    .select('id, calciatore_id, numero_maglia, posizione, capitano, vice_capitano, calciatore:calciatore_id(nome, cognome)')
    .eq('partita_id', req.params.partitaId);
  res.json((data||[]).map(f => ({
    id: f.id,
    calciatoreId: f.calciatore_id,
    numeroMaglia: f.numero_maglia,
    posizione: f.posizione,
    capitano: f.capitano,
    viceCapitano: f.vice_capitano,
    nome: f.calciatore?.nome,
    cognome: f.calciatore?.cognome
  })));
});

app.put('/api/partite/:partitaId/formazione', async (req, res) => {
  try {
    const { formazione } = req.body;
    if (!formazione || !Array.isArray(formazione)) return res.status(400).json({ error: 'Formato non valido' });
    await supabase.from('formazione_partita').delete().eq('partita_id', req.params.partitaId);
    if (formazione.length > 0) {
      const rows = formazione.map(f => ({
        partita_id: req.params.partitaId,
        calciatore_id: f.calciatoreId,
        numero_maglia: f.numeroMaglia,
        posizione: f.posizione,
        capitano: f.capitano || false,
        vice_capitano: f.viceCapitano || false
      }));
      await supabase.from('formazione_partita').insert(rows);
    }
    res.json({ success: true });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// ── ALLENAMENTI: BATCH PRESENZE ──
app.post('/api/squadre/:squadraId/allenamenti/presenze/batch', async (req, res) => {
  try {
    const { presenze } = req.body;
    if (!presenze || !Array.isArray(presenze)) return res.status(400).json({ error: 'Formato non valido' });
    for (const p of presenze) {
      await supabase.from('presenza_allenamento').upsert({
        squadra_id: req.params.squadraId,
        calciatore_id: p.calciatoreId,
        data: p.data,
        presente: p.presente,
        note: p.note || null
      });
    }
    res.json({ success: true, count: presenze.length });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// ── ALLENAMENTI: CONFIG e SINGLE (mantenuti) ──
app.get('/api/squadre/:squadraId/allenamenti/config', async (req, res) => { const { data } = await supabase.from('configurazione_allenamento').select('*').eq('squadra_id', req.params.squadraId).order('giorno_settimana'); res.json(data||[]); });
app.post('/api/squadre/:squadraId/allenamenti/config', async (req, res) => { const { giorno_settimana, ora_inizio, ora_fine, luogo } = req.body; const { data } = await supabase.from('configurazione_allenamento').insert({ squadra_id: req.params.squadraId, giorno_settimana, ora_inizio, ora_fine, luogo }).select().single(); res.status(201).json(data); });
app.put('/api/allenamenti/config/:id', async (req, res) => { const { giorno_settimana, ora_inizio, ora_fine, luogo } = req.body; await supabase.from('configurazione_allenamento').update({ giorno_settimana, ora_inizio, ora_fine, luogo }).eq('id', req.params.id); res.json({ success: true }); });
app.delete('/api/allenamenti/config/:id', async (req, res) => { await supabase.from('configurazione_allenamento').delete().eq('id', req.params.id); res.json({ success:true }); });
app.get('/api/squadre/:squadraId/allenamenti/presenze', async (req, res) => { const q = supabase.from('presenza_allenamento').select('id, data, presente, note, calciatore:calciatore_id(id, nome, cognome)').eq('squadra_id', req.params.squadraId).order('data', { ascending: false }); const { data } = await q; res.json((data||[]).map(p => ({ id: p.id, data: p.data, presente: p.presente, note: p.note, calciatoreId: p.calciatore.id, nome: p.calciatore.nome, cognome: p.calciatore.cognome }))); });

// ── ROUTE SINGOLA CON LOG E ONCONFLICT ──
app.post('/api/squadre/:squadraId/allenamenti/presenze', async (req, res) => {
  console.log('🔵 POST /api/squadre/:squadraId/allenamenti/presenze');
  console.log('📦 req.params.squadraId:', req.params.squadraId);
  console.log('📦 req.body:', req.body);

  const { calciatoreId, data, presente, note } = req.body;
  console.log('🔍 Dati da salvare:', { calciatoreId, data, presente, note });

  if (!calciatoreId || !data) {
    console.error('❌ Dati mancanti');
    return res.status(400).json({ error: 'calciatoreId e data sono obbligatori' });
  }

  try {
    const { data: result, error } = await supabase
      .from('presenza_allenamento')
      .upsert({
        squadra_id: req.params.squadraId,
        calciatore_id: calciatoreId,
        data: data,
        presente: presente !== undefined ? presente : true,
        note: note || null
      }, { onConflict: 'squadra_id, calciatore_id, data' })
      .select()
      .single();

    if (error) {
      console.error('❌ ERRORE Supabase:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log('✅ Salvataggio riuscito per calciatore:', calciatoreId);
    res.status(201).json(result);
  } catch (err) {
    console.error('❌ Eccezione:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/squadre/:squadraId/allenamenti/summary', async (req, res) => { try { const { data: presenze } = await supabase.from('presenza_allenamento').select('calciatore_id, presente, data').eq('squadra_id', req.params.squadraId); const { data: rosa } = await supabase.from('rosa').select('calciatore:calciatore_id(id, nome, cognome)').eq('squadra_id', req.params.squadraId); const oggi = new Date(); const lunedi = new Date(oggi); lunedi.setDate(oggi.getDate()-((oggi.getDay()+6)%7)); const lunediStr = lunedi.toISOString().split('T')[0]; const domenica = new Date(lunedi); domenica.setDate(lunedi.getDate()+6); const domStr = domenica.toISOString().split('T')[0]; const summary = {}; (rosa||[]).forEach(r => { summary[r.calciatore.id] = { nome:r.calciatore.nome, cognome:r.calciatore.cognome, totali:0, presenti:0, assenti:0, settimanali:0, presentiSett:0, assentiSett:0 }; }); (presenze||[]).forEach(p => { if(summary[p.calciatore_id]) { summary[p.calciatore_id].totali++; if(p.presente) summary[p.calciatore_id].presenti++; else summary[p.calciatore_id].assenti++; if(p.data >= lunediStr && p.data <= domStr) { summary[p.calciatore_id].settimanali++; if(p.presente) summary[p.calciatore_id].presentiSett++; else summary[p.calciatore_id].assentiSett++; } } }); res.json({ summary, settimana: { da: lunediStr, a: domStr } }); } catch(err) { res.status(500).json({ error:err.message }); } });

// Import CSV
app.post('/api/squadre/:squadraId/importa-calendario', async (req, res) => { try { const { csvData } = req.body; if (!csvData || !Array.isArray(csvData)) return res.status(400).json({ error: 'Dati CSV non validi' }); let inserite = 0; for (const row of csvData) { if (row.length < 5) continue; const [data, ora, avversario, luogo, competizione, giornata] = row; const dataOra = data + 'T' + (ora || '10:00:00'); await supabase.from('partita').insert({ squadra_id: req.params.squadraId, data_ora: new Date(dataOra).toISOString(), avversario: avversario.trim(), luogo: luogo.trim(), competizione: competizione.trim(), giornata: giornata ? parseInt(giornata) : null }); inserite++; } res.json({ success: true, inserite }); } catch (err) { res.status(400).json({ error: err.message }); } });

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => console.log("Backend YFM in ascolto su http://localhost:" + PORT));

app.get('/api/squadre/:squadraId/disciplina', async (req, res) => {
  try {
    const { data: partite } = await supabase.from('partita').select('id').eq('squadra_id', req.params.squadraId);
    const ids = (partite||[]).map(p => p.id);
    if(ids.length===0) return res.json([]);
    const { data: eventi } = await supabase.from('evento_partita')
      .select('tipo_evento_codice, calciatore_principale_id, calciatore:calciatore_principale_id(nome, cognome)')
      .in('partita_id', ids).in('tipo_evento_codice', ['YELLOW','RED']);
    const stats = {};
    (eventi||[]).forEach(e => {
      if(!stats[e.calciatore_principale_id]) stats[e.calciatore_principale_id] = { nome: e.calciatore?.nome, cognome: e.calciatore?.cognome, ammonizioni: 0, espulsioni: 0 };
      if(e.tipo_evento_codice==='YELLOW') stats[e.calciatore_principale_id].ammonizioni++;
      if(e.tipo_evento_codice==='RED') stats[e.calciatore_principale_id].espulsioni++;
    });
    const result = Object.entries(stats).map(([id, s]) => ({
      id, nome: s.nome || '', cognome: s.cognome || '',
      ammonizioni: s.ammonizioni, espulsioni: s.espulsioni,
      squalifiche: Math.floor(s.ammonizioni / 4) + s.espulsioni
    })).sort((a,b) => (b.ammonizioni+b.espulsioni) - (a.ammonizioni+a.espulsioni));
    res.json(result);
  } catch(err) { res.status(500).json({ error: err.message }); }
});


// ── MATERIALE ALLENAMENTO ──
app.get('/api/squadre/:squadraId/allenamenti/materiale', async (req, res) => {
  const { data, error } = await supabase.from('materiale_allenamento')
    .select('*')
    .eq('squadra_id', req.params.squadraId)
    .order('data_caricamento', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

app.post('/api/squadre/:squadraId/allenamenti/materiale', async (req, res) => {
  const { titolo, descrizione, tipo, url } = req.body;
  if (!titolo || !url) return res.status(400).json({ error: 'Titolo e URL obbligatori' });
  const { data, error } = await supabase.from('materiale_allenamento').insert({
    squadra_id: req.params.squadraId,
    giorno_settimana: req.body.giorno_settimana || 0,
    titolo, descrizione, tipo: tipo || 'file', url
  }).select().single();
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
});

app.delete('/api/allenamenti/materiale/:id', async (req, res) => {
  await supabase.from('materiale_allenamento').delete().eq('id', req.params.id);
  res.json({ success: true });
});


// ── SCHEDA GIOCATORE ───────────────────────────────────────

// Dettaglio anagrafico giocatore
// PUT /api/calciatori/:id - Aggiorna dati giocatore
app.put('/api/calciatori/:id', async (req, res) => {
  const c = req.body;
  const updates = {};
  if (c.nome !== undefined) updates.nome = c.nome;
  if (c.cognome !== undefined) updates.cognome = c.cognome;
  if (c.data_nascita !== undefined) updates.data_nascita = c.data_nascita;
  if (c.piede_preferito !== undefined) updates.piede_preferito = c.piede_preferito;
  if (c.peso !== undefined) updates.peso = c.peso;
  if (c.altezza !== undefined) updates.altezza = c.altezza;
  if (c.telefono !== undefined) updates.telefono = c.telefono;
  if (c.data_visita_medica !== undefined) updates.data_visita_medica = c.data_visita_medica;
  if (c.matricola_figc !== undefined) updates.matricola_figc = c.matricola_figc;
  if (c.tipo_documento !== undefined) updates.tipo_documento = c.tipo_documento;
  if (c.numero_documento !== undefined) updates.numero_documento = c.numero_documento;
  if (c.rilasciato_da !== undefined) updates.rilasciato_da = c.rilasciato_da;
  await supabase.from('calciatore').update(updates).eq('id', req.params.id);
  if (c.numero_maglia || c.ruolo || c.stato) {
    await supabase.from('rosa').update({ numero_maglia: c.numero_maglia, ruolo: c.ruolo, stato: c.stato }).eq('calciatore_id', req.params.id);
  }
  res.json({ success: true });
});

// GET /api/calciatori/:id - Dettaglio giocatore con dati rosa
app.get('/api/calciatori/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('calciatore')
      .select('*')
      .eq('id', req.params.id)
      .single();
    if (error) return res.status(500).json({ error: error.message });

    // Tracciamento referral se presente
    if (referralCode && user.workspace_id) {
      try {
        await supabase.from('workspace')
          .update({ referral_code: referralCode })
          .eq('id', user.workspace_id);
        await supabase.from('referral_log').insert({
          referral_code: referralCode,
          utente_id: user.id,
          workspace_id: user.workspace_id,
          tipo: 'registrazione',
          commissione: 50.00,
          stato: 'pending'
        }).catch(() => {});
      } catch (refErr) { console.log('Referral error:', refErr.message); }
    }
    
    // Prendi i dati dalla rosa per questa squadra
    if (data && req.query.squadraId) {
      const { data: rosaData } = await supabase
        .from('rosa')
        .select('numero_maglia, ruolo, stato')
        .eq('calciatore_id', req.params.id)
        .eq('squadra_id', req.query.squadraId)
        .single();
      if (rosaData) {
        data.numero_maglia = rosaData.numero_maglia;
        data.ruolo = rosaData.ruolo;
        data.stato = rosaData.stato;
      }
    }
    
    res.json(data || null);
  } catch (err) {
    res.status(500).json({ error: err.message });

  }
});

// Statistiche stagione corrente per un giocatore
app.get('/api/calciatori/:id/stats-current', async (req, res) => {
  try {
    const stagioneId = req.query.stagioneId || null;
    const { data, error } = await supabase
      .rpc('calciatore_stats_stagione_corrente', {
        p_calciatore_id: req.params.id,
        p_stagione_id: stagioneId,
      });
    if (error) return res.status(500).json({ error: error.message });

    // Tracciamento referral se presente
    if (referralCode && user.workspace_id) {
      try {
        await supabase.from('workspace')
          .update({ referral_code: referralCode })
          .eq('id', user.workspace_id);
        await supabase.from('referral_log').insert({
          referral_code: referralCode,
          utente_id: user.id,
          workspace_id: user.workspace_id,
          tipo: 'registrazione',
          commissione: 50.00,
          stato: 'pending'
        }).catch(() => {});
      } catch (refErr) { console.log('Referral error:', refErr.message); }
    }
    if (Array.isArray(data)) return res.json(data[0] || {});
    res.json(data || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Storico carriera: una riga per stagione
app.get('/api/calciatori/:id/career', async (req, res) => {
  try {
    const { data, error } = await supabase
      .rpc('calciatore_career_by_season', {
        p_calciatore_id: req.params.id,
      });
    if (error) return res.status(500).json({ error: error.message });

    // Tracciamento referral se presente
    if (referralCode && user.workspace_id) {
      try {
        await supabase.from('workspace')
          .update({ referral_code: referralCode })
          .eq('id', user.workspace_id);
        await supabase.from('referral_log').insert({
          referral_code: referralCode,
          utente_id: user.id,
          workspace_id: user.workspace_id,
          tipo: 'registrazione',
          commissione: 50.00,
          stato: 'pending'
        }).catch(() => {});
      } catch (refErr) { console.log('Referral error:', refErr.message); }
    }
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Ultime partite del giocatore con statistiche base
app.get('/api/calciatori/:id/last-matches', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '10', 10);
    const { data, error } = await supabase
      .rpc('calciatore_last_matches', {
        p_calciatore_id: req.params.id,
        p_limit: limit,
      });
    if (error) return res.status(500).json({ error: error.message });

    // Tracciamento referral se presente
    if (referralCode && user.workspace_id) {
      try {
        await supabase.from('workspace')
          .update({ referral_code: referralCode })
          .eq('id', user.workspace_id);
        await supabase.from('referral_log').insert({
          referral_code: referralCode,
          utente_id: user.id,
          workspace_id: user.workspace_id,
          tipo: 'registrazione',
          commissione: 50.00,
          stato: 'pending'
        }).catch(() => {});
      } catch (refErr) { console.log('Referral error:', refErr.message); }
    }
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── REPORT PARTITA ──
app.get('/api/partite/:partitaId/report', async (req, res) => {
  try {
    // 1. Dati partita con join a stagione e workspace per avere il nome società
    const { data: partita } = await supabase
      .from('partita')
      .select('*, squadra:squadra_id(nome, categoria, allenatore, dirigente, stagione:stagione_id(workspace_id))')
      .eq('id', req.params.partitaId)
      .single();
    if (!partita) return res.status(404).json({ error: 'Partita non trovata' });

    // 2. Recupera il nome della società dal workspace
    const workspaceId = partita.squadra?.stagione?.workspace_id;
    let societaNome = 'ASD';
    if (workspaceId) {
      const { data: workspace } = await supabase
        .from('workspace')
        .select('nome')
        .eq('id', workspaceId)
        .single();
      societaNome = workspace?.nome || 'ASD';
    }

    // 2. Eventi
    const { data: eventi } = await supabase
      .from('evento_partita')
      .select('tipo_evento_codice, minuto, calciatore_principale:calciatore_principale_id(nome, cognome), calciatore_secondario:calciatore_secondario_id(nome, cognome)')
      .eq('partita_id', req.params.partitaId)
      .order('minuto');

    // 3. Formazione completa con stats
    const { data: formazione } = await supabase
      .from('formazione_partita')
      .select('numero_maglia, posizione, calciatore:calciatore_id(id, nome, cognome, data_nascita)')
      .eq('partita_id', req.params.partitaId)
      .order('numero_maglia');

    // 4. Convocazioni (per minuti giocati simulati se non presenti)
    const { data: convocazioni } = await supabase
      .from('convocazione')
      .select('presente, calciatore:calciatore_id(id)')
      .eq('partita_id', req.params.partitaId);

    // Calcola stats per ogni giocatore
    const statsMap = {};
    (eventi || []).forEach(e => {
      const pid = e.calciatore_principale_id;
      if (!statsMap[pid]) statsMap[pid] = { gol: 0, assist: 0, ammonizioni: 0, espulsioni: 0 };
      if (e.tipo_evento_codice === 'GOAL') statsMap[pid].gol++;
      if (e.tipo_evento_codice === 'YELLOW') statsMap[pid].ammonizioni++;
      if (e.tipo_evento_codice === 'RED') statsMap[pid].espulsioni++;
      if (e.tipo_evento_codice === 'GOAL' && e.calciatore_secondario_id) {
        const sid = e.calciatore_secondario_id;
        if (!statsMap[sid]) statsMap[sid] = { gol: 0, assist: 0, ammonizioni: 0, espulsioni: 0 };
        statsMap[sid].assist++;
      }
    });

    // Costruisci array giocatori con stats
    const giocatoriReport = (formazione || []).map(f => {
      const s = statsMap[f.calciatore.id] || { gol: 0, assist: 0, ammonizioni: 0, espulsioni: 0 };
      const convocato = (convocazioni || []).find(c => c.calciatore.id === f.calciatore.id);
      return {
        numeroMaglia: f.numero_maglia,
        nome: f.calciatore.nome,
        cognome: f.calciatore.cognome,
        ruolo: f.posizione === 'Titolare' ? 'T' : 'P',
        gol: s.gol,
        assist: s.assist,
        ammonizioni: s.ammonizioni,
        espulsioni: s.espulsioni,
        presente: convocato?.presente ?? true
      };
    });

    // Calcola score
    const golCasa = (eventi || []).filter(e => e.tipo_evento_codice === 'GOAL').length;
    const ammonizioni = (eventi || []).filter(e => e.tipo_evento_codice === 'YELLOW').length;
    const espulsioni = (eventi || []).filter(e => e.tipo_evento_codice === 'RED').length;

    res.json({
      partita: {
        dataOra: partita.data_ora,
        avversario: partita.avversario,
        luogo: partita.luogo,
        competizione: partita.competizione,
        giornata: partita.giornata,
        note: partita.note || ''
      },
      societa: societaNome,
      categoria: partita.squadra?.categoria || '',
      allenatore: partita.squadra?.allenatore || '',
      dirigente: partita.squadra?.dirigente || '',
      score: { golCasa, golOspiti: 0 },
      ammonizioni,
      espulsioni,
      eventi: (eventi || []).map(e => ({
        minuto: e.minuto,
        tipo: e.tipo_evento_codice,
        principale: e.calciatore_principale?.nome + ' ' + e.calciatore_principale?.cognome,
        secondario: e.calciatore_secondario ? e.calciatore_secondario.nome + ' ' + e.calciatore_secondario.cognome : null
      })),
      giocatori: giocatoriReport.sort((a, b) => {
        if (a.ruolo !== b.ruolo) return a.ruolo === 'T' ? -1 : 1;
        return a.numeroMaglia - b.numeroMaglia;
      })
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── REPORT STAGIONALE ──
app.get('/api/squadre/:squadraId/report-stagionale', async (req, res) => {
  try {
    const { squadraId } = req.params;
    
    // Dati squadra
    const { data: squadra } = await supabase
      .from('squadra')
      .select('*, stagione:stagione_id(nome, workspace_id)')
      .eq('id', squadraId)
      .single();
    if (!squadra) return res.status(404).json({ error: 'Squadra non trovata' });

    // Nome società
    let societaNome = 'ASD';
    if (squadra.stagione?.workspace_id) {
      const { data: workspace } = await supabase
        .from('workspace').select('nome').eq('id', squadra.stagione.workspace_id).single();
      societaNome = workspace?.nome || 'ASD';
    }

    // Tutte le partite
    const { data: partite } = await supabase
      .from('partita')
      .select('id, data_ora, avversario, luogo, competizione, giornata')
      .eq('squadra_id', squadraId)
      .order('data_ora');

    // Calcola statistiche con la stessa logica di statistiche-complete
    let golFatti = 0, golSubiti = 0;
    let vittorie = 0, pareggi = 0, sconfitte = 0, punti = 0;
    const marcatoriMap = {}, assistMap = {}, presenzeMap = {};
    const partiteResults = [];

    for (const p of (partite || [])) {
      const { data: eventi } = await supabase
        .from('evento_partita')
        .select('tipo_evento_codice, calciatore_principale_id, calciatore_secondario_id')
        .eq('partita_id', p.id);
      
      const golCasa = (eventi || []).filter(e => e.tipo_evento_codice === 'GOAL' || e.tipo_evento_codice === 'AUTOGOL').length;
      // CORRETTO: gol dal DB
      const golOspiti = (eventi || []).filter(e => e.tipo_evento_codice === 'SUBITO').length;
      
      golFatti += golCasa;
      golSubiti += golOspiti;
      
      // Calcola risultato solo per partite passate
      if (new Date(p.data_ora) < new Date()) {
        if (golCasa > golOspiti) { vittorie++; punti += 3; }
        else if (golCasa === golOspiti && golCasa > 0) { pareggi++; punti += 1; }
        else if (golOspiti > 0) { sconfitte++; }
      }
      
      partiteResults.push({
        id: p.id,
        data: p.data_ora,
        avversario: p.avversario,
        luogo: p.luogo,
        competizione: p.competizione,
        giornata: p.giornata,
        golCasa,
        golOspiti
      });
      
      // Marcatori
      (eventi || []).filter(e => e.tipo_evento_codice === 'GOAL').forEach(e => {
        marcatoriMap[e.calciatore_principale_id] = (marcatoriMap[e.calciatore_principale_id] || 0) + 1;
      });
      
      // Assist
      (eventi || []).filter(e => e.tipo_evento_codice === 'GOAL' && e.calciatore_secondario_id).forEach(e => {
        assistMap[e.calciatore_secondario_id] = (assistMap[e.calciatore_secondario_id] || 0) + 1;
      });
      
      // Presenze
      const { data: formazione } = await supabase
        .from('formazione_partita').select('calciatore_id').eq('partita_id', p.id);
      (formazione || []).forEach(f => {
        presenzeMap[f.calciatore_id] = (presenzeMap[f.calciatore_id] || 0) + 1;
      });
    }

    const partiteGiocate = vittorie + pareggi + sconfitte;

    // Top marcatori
    const topMarcatori = [];
    for (const [id, gol] of Object.entries(marcatoriMap).sort((a, b) => b[1] - a[1]).slice(0, 5)) {
      const { data: calciatore } = await supabase.from('calciatore').select('nome, cognome').eq('id', id).single();
      if (calciatore) topMarcatori.push({ id, nome: calciatore.nome, cognome: calciatore.cognome, gol });
    }

    // Top assist
    const topAssist = [];
    for (const [id, assist] of Object.entries(assistMap).sort((a, b) => b[1] - a[1]).slice(0, 5)) {
      const { data: calciatore } = await supabase.from('calciatore').select('nome, cognome').eq('id', id).single();
      if (calciatore) topAssist.push({ id, nome: calciatore.nome, cognome: calciatore.cognome, assist });
    }

    // Top presenze
    const topPresenze = [];
    for (const [id, presenze] of Object.entries(presenzeMap).sort((a, b) => b[1] - a[1]).slice(0, 5)) {
      const { data: calciatore } = await supabase.from('calciatore').select('nome, cognome').eq('id', id).single();
      if (calciatore) topPresenze.push({ id, nome: calciatore.nome, cognome: calciatore.cognome, presenze, minuti: presenze * 90 });
    }

    res.json({
      societa: societaNome,
      squadra: { nome: squadra.nome, categoria: squadra.categoria },
      stagione: squadra.stagione?.nome || '',
      partiteGiocate,
      punti, vittorie, pareggi, sconfitte,
      golFatti, golSubiti,
      differenzaReti: golFatti - golSubiti,
      partite: partiteResults,
      topMarcatori,
      topAssist,
      topPresenze
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── REPORT GIOCATORE ──
app.get('/api/calciatori/:calciatoreId/report', async (req, res) => {
  try {
    const { calciatoreId } = req.params;
    
    // Dati giocatore
    const { data: giocatore } = await supabase
      .from('calciatore').select('*').eq('id', calciatoreId).single();
    if (!giocatore) return res.status(404).json({ error: 'Giocatore non trovato' });

    // Tutti gli eventi del giocatore con join a partita
    const { data: eventi } = await supabase
      .from('evento_partita')
      .select('*, partita:partita_id(data_ora, avversario, competizione, giornata)')
      .eq('calciatore_principale_id', calciatoreId)
      .order('minuto');

    // Partite giocate
    const partiteIds = [...new Set((eventi || []).map(e => e.partita_id))];
    
    // Stats aggregate
    const stats = {
      gol: (eventi || []).filter(e => e.tipo_evento_codice === 'GOAL').length,
      assist: (eventi || []).filter(e => e.tipo_evento_codice === 'ASSIST').length,
      ammonizioni: (eventi || []).filter(e => e.tipo_evento_codice === 'YELLOW').length,
      espulsioni: (eventi || []).filter(e => e.tipo_evento_codice === 'RED').length,
      partiteGiocate: partiteIds.length
    };

    // Storico eventi con giornata
    const storico = (eventi || []).map(e => ({
      minuto: e.minuto,
      tipo: e.tipo_evento_codice,
      partita: e.partita?.avversario || '',
      data: e.partita?.data_ora,
      competizione: e.partita?.competizione || '',
      giornata: e.partita?.giornata || null
    }));

    res.json({
      giocatore: {
        id: giocatore.id,
        nome: giocatore.nome,
        cognome: giocatore.cognome,
        data_nascita: giocatore.data_nascita,
        nazionalita: giocatore.nazionalita
      },
      stats,
      storico
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── VALUTAZIONI GIOCATORE ──

// GET /api/partite/:partitaId/valutazioni - Lista valutazioni per partita
app.get('/api/partite/:partitaId/valutazioni', async (req, res) => {
  try {
    const { data: valutazioni, error } = await supabase
      .from('valutazione_partita')
      .select('*, calciatore:calciatore_id(id, nome, cognome)')
      .eq('partita_id', req.params.partitaId)
      .order('voto', { ascending: false });
    
    if (error) {
      // Tabella potrebbe non esistere ancora
      if (error.code === '42P01') {
        return res.json({ valutazioni: [], message: 'Tabella valutazioni non configurata' });
      }
      return res.status(500).json({ error: error.message });
    }
    res.json({ valutazioni: valutazioni || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/partite/:partitaId/valutazioni - Salva valutazioni (batch)
app.post('/api/partite/:partitaId/valutazioni', async (req, res) => {
  try {
    const { valutazioni } = req.body; // array di { calciatore_id, voto, nota_allenatore }
    
    if (!Array.isArray(valutazioni)) {
      return res.status(400).json({ error: 'valutazioni deve essere un array' });
    }
    
    const results = [];
    for (const v of valutazioni) {
      const { data, error } = await supabase
        .from('valutazione_partita')
        .upsert({
          partita_id: req.params.partitaId,
          calciatore_id: v.calciatore_id,
          voto: v.voto,
          nota_allenatore: v.nota_allenatore || null
        }, { onConflict: 'partita_id,calciatore_id' })
        .select()
        .single();
      
      if (error && error.code !== '42P01') {
        results.push({ calciatore_id: v.calciatore_id, error: error.message });
      } else {
        results.push({ calciatore_id: v.calciatore_id, success: true, data });
      }
    }
    
    res.json({ saved: results.filter(r => r.success).length, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/squadre/:squadraId/valutazioni-top - Top giocatori per media voto
app.get('/api/squadre/:squadraId/valutazioni-top', async (req, res) => {
  try {
    // Prima verifica se la tabella esiste
    const { error: checkError } = await supabase
      .from('valutazione_partita')
      .select('id')
      .limit(1);
    
    if (checkError && checkError.code === '42P01') {
      return res.json({ topGiocatori: [], message: 'Tabella valutazioni non configurata' });
    }
    
    // Prendi tutte le valutazioni della squadra
    const { data: partite } = await supabase
      .from('partita')
      .select('id')
      .eq('squadra_id', req.params.squadraId);
    
    const partiteIds = (partite || []).map(p => p.id);
    
    if (partiteIds.length === 0) {
      return res.json({ topGiocatori: [] });
    }
    
    const { data: valutazioni } = await supabase
      .from('valutazione_partita')
      .select('calciatore_id, voto, calciatore:calciatore_id(nome, cognome)')
      .in('partita_id', partiteIds);
    
    // Calcola media per giocatore
    const playerStats = {};
    (valutazioni || []).forEach(v => {
      if (!playerStats[v.calciatore_id]) {
        playerStats[v.calciatore_id] = { sum: 0, count: 0, nome: v.calciatore?.nome + ' ' + v.calciatore?.cognome };
      }
      playerStats[v.calciatore_id].sum += parseFloat(v.voto);
      playerStats[v.calciatore_id].count++;
    });
    
    const topGiocatori = Object.entries(playerStats)
      .map(([id, stats]) => ({
        calciatore_id: id,
        nome: stats.nome,
        media: (stats.sum / stats.count).toFixed(2),
        partiteValutate: stats.count
      }))
      .filter(p => p.partiteValutate >= 2) // minimo 2 partite
      .sort((a, b) => parseFloat(b.media) - parseFloat(a.media))
      .slice(0, 10);
    
    res.json({ topGiocatori });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/giocatori/:giocatoreId/valutazioni - Storico valutazioni giocatore
app.get('/api/giocatori/:giocatoreId/valutazioni', async (req, res) => {
  try {
    const { data: valutazioni, error } = await supabase
      .from('valutazione_partita')
      .select('*, partita:partita_id(data_ora, avversario, competizione, giornata)')
      .eq('calciatore_id', req.params.giocatoreId)
      .order('created_at', { ascending: false });
    
    if (error && error.code === '42P01') {
      return res.json({ valutazioni: [], storico: [], message: 'Tabella valutazioni non configurata' });
    }
    
    // Calcola stats
    const vals = valutazioni || [];
    const media = vals.length > 0 
      ? (vals.reduce((sum, v) => sum + parseFloat(v.voto), 0) / vals.length).toFixed(2)
      : null;
    const migliore = vals.length > 0 
      ? vals.reduce((max, v) => parseFloat(v.voto) > parseFloat(max.voto) ? v : max)
      : null;
    const peggiore = vals.length > 0 
      ? vals.reduce((min, v) => parseFloat(v.voto) < parseFloat(min.voto) ? v : min)
      : null;
    
    res.json({
      media,
      partiteValutate: vals.length,
      migliore: migliore ? { voto: migliore.voto, avversario: migliore.partita?.avversario } : null,
      peggiore: peggiore ? { voto: peggiore.voto, avversario: peggiore.partita?.avversario } : null,
      storico: vals.map(v => ({
        partita: v.partita?.avversario,
        data: v.partita?.data_ora,
        voto: v.voto,
        nota: v.nota_allenatore
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



// DELETE /api/squadre/:squadraId/calciatori/:id - Rimuovi giocatore dalla rosa
app.delete('/api/squadre/:squadraId/calciatori/:id', async (req, res) => {
  try {
    const { data: existing } = await supabase.from('rosa').select('id').eq('calciatore_id', req.params.id).eq('squadra_id', req.params.squadraId).single();
    if (!existing) return res.status(404).json({ error: 'Giocatore non presente in questa rosa' });
    await supabase.from('rosa').delete().eq('calciatore_id', req.params.id).eq('squadra_id', req.params.squadraId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/calciatori/:id/move - Sposta giocatore in altra categoria
app.post('/api/calciatori/:id/move', async (req, res) => {
  try {
    const { fromSquadraId, toSquadraId } = req.body;
    const { data: existing } = await supabase.from('rosa').select('id, numero_maglia, ruolo, stato').eq('calciatore_id', req.params.id).eq('squadra_id', fromSquadraId).single();
    if (!existing) return res.status(404).json({ error: 'Giocatore non presente nella rosa di origine' });
    const { data: alreadyThere } = await supabase.from('rosa').select('id').eq('calciatore_id', req.params.id).eq('squadra_id', toSquadraId).single();
    if (alreadyThere) {
      await supabase.from('rosa').delete().eq('calciatore_id', req.params.id).eq('squadra_id', fromSquadraId);
      return res.json({ success: true, message: 'Giocatore gia presente nella rosa di destinazione' });
    }
    await supabase.from('rosa').delete().eq('calciatore_id', req.params.id).eq('squadra_id', fromSquadraId);
    await supabase.from('rosa').insert({ calciatore_id: req.params.id, squadra_id: toSquadraId, numero_maglia: existing.numero_maglia, ruolo: existing.ruolo, stato: existing.stato });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PARTNER / REFERRAL ENDPOINTS ──

// GET /api/partners - Lista partner attivi (pubblico)
app.get('/api/partners', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('partner')
      .select('id, nome, codice, logo_url, website')
      .eq('attivo', true)
      .order('nome');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/partners/:codice - Verifica codice partner (pubblico)
app.get('/api/partners/:codice/verify', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('partner')
      .select('id, nome, codice')
      .eq('codice', req.params.codice)
      .eq('attivo', true)
      .single();
    if (error || !data) return res.status(404).json({ valid: false });
    res.json({ valid: true, partner: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/referrals - Referral log (admin only)
app.get('/api/admin/referrals', authMiddleware, async (req, res) => {
  try {
    if (!req.user.is_superadmin) return res.status(403).json({ error: 'Accesso negato' });
    const { data, error } = await supabase
      .from('referral_log')
      .select('*, partner(nome, codice), workspace(nome), utente(nome, cognome, email)')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/partner-stats - Statistiche per partner (admin only)
app.get('/api/admin/partner-stats', authMiddleware, async (req, res) => {
  try {
    if (!req.user.is_superadmin) return res.status(403).json({ error: 'Accesso negato' });
    const { data, error } = await supabase
      .from('partner')
      .select('*, referral_log(count)')
      .eq('attivo', true);
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/partners - Crea partner (admin only)
app.post('/api/admin/partners', authMiddleware, async (req, res) => {
  try {
    if (!req.user.is_superadmin) return res.status(403).json({ error: 'Accesso negato' });
    const { nome, email, codice, commissione, website } = req.body;
    if (!nome || !email || !codice) return res.status(400).json({ error: 'Nome, email e codice sono obbligatori' });
    const { data, error } = await supabase.from('partner').insert({
      nome, email, codice, commissione: commissione || 20.00, website, attivo: true
    }).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = app;
