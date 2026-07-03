/**
 * Auth Routes — login, register, users CRUD, guest links
 */
const express = require('express');
const crypto = require('crypto');

module.exports = function createAuthRouter({ supabase, JWT_SECRET, authMiddleware, bcrypt, jwt }) {
  const router = express.Router();

  router.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) return res.status(400).json({ error: 'Email e password richiesti' });
      
      const { data: users, error } = await supabase.from('users').select('*').eq('email', email.toLowerCase()).eq('is_active', true).single();
      if (error || !users) return res.status(401).json({ error: 'Credenziali non valide' });
      
      const validPassword = await bcrypt.compare(password, users.password_hash);
      if (!validPassword) return res.status(401).json({ error: 'Credenziali non valide' });
      
      const token = jwt.sign({ 
        userId: users.id, email: users.email, ruolo: users.ruolo, 
        workspace_id: users.workspace_id, is_superadmin: users.is_superadmin || false
      }, JWT_SECRET, { expiresIn: '7d' });
      res.json({ 
        token, 
        user: { 
          id: users.id, nome: users.nome, cognome: users.cognome, email: users.email, 
          ruolo: users.ruolo, workspace_id: users.workspace_id,
          is_superadmin: users.is_superadmin || false,
          categorie_accesso: users.squadre_accesso || [],
          ruoli: users.ruoli || [], permessi: users.permessi || {}
        } 
      });
    } catch (err) {
      res.status(500).json({ error: 'Errore server' });
    }
  });

  router.post('/api/auth/register', authMiddleware, async (req, res) => {
    try {
      if (!req.user.is_superadmin && req.user.ruolo !== 'admin') {
        return res.status(403).json({ error: 'Solo admin possono registrare nuovi utenti' });
      }
      const { email, password, nome, cognome, ruolo, workspace_id } = req.body;
      if (!email || !password || !nome || !cognome) return res.status(400).json({ error: 'Tutti i campi sono richiesti' });
      if (ruolo === 'superadmin' && !req.user.is_superadmin) {
        return res.status(403).json({ error: 'Solo superadmin può creare altri superadmin' });
      }
      const { data: existing } = await supabase.from('users').select('id').eq('email', email.toLowerCase()).single();
      if (existing) return res.status(409).json({ error: 'Email già registrata' });
      
      const password_hash = await bcrypt.hash(password, 10);
      const { data: newUser, error } = await supabase.from('users').insert({
        email: email.toLowerCase(), password_hash, nome, cognome, 
        ruolo: ruolo || 'allenatore', workspace_id: workspace_id || req.user.workspace_id, is_active: true
      }).select().single();
      if (error) return res.status(400).json({ error: error.message });
      res.status(201).json({ success: true, user: { id: newUser.id, nome: newUser.nome, cognome: newUser.cognome, email: newUser.email, ruolo: newUser.ruolo, workspace_id: newUser.workspace_id } });
    } catch (err) {
      res.status(500).json({ error: 'Errore server' });
    }
  });

  router.get('/api/auth/me', authMiddleware, async (req, res) => {
    res.json(req.user);
  });

  router.post('/api/auth/logout', authMiddleware, async (req, res) => {
    res.json({ success: true });
  });

  router.put('/api/auth/profile', authMiddleware, async (req, res) => {
    try {
      const { nome, cognome, telefono } = req.body;
      const { data, error } = await supabase.from('users').update({ nome, cognome, telefono }).eq('id', req.user.id).select().single();
      if (error) return res.status(400).json({ error: error.message });
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: 'Errore server' });
    }
  });

  router.get('/api/auth/users', authMiddleware, async (req, res) => {
    try {
      const workspaceId = req.query.workspace_id;
      let query = supabase.from('users').select('id, nome, cognome, email, ruolo, workspace_id, ruoli, squadre_accesso, permessi, is_superadmin, is_active').eq('is_active', true).order('cognome');
      if (workspaceId) query = query.eq('workspace_id', workspaceId);
      const { data, error } = await query;
      if (error) return res.status(400).json({ error: error.message });
      const users = (data || []).map(u => ({ ...u, categorie_accesso: u.squadre_accesso || [] }));
      res.json({ users });
    } catch (err) {
      res.status(500).json({ error: 'Errore server' });
    }
  });

  router.post('/api/auth/users', authMiddleware, async (req, res) => {
    try {
      const { email, password, nome, cognome, ruolo, workspace_id, ruoli, categorie_accesso, permessi } = req.body;
      const password_hash = await bcrypt.hash(password || 'ChangeMe123!', 10);
      const { data, error } = await supabase.from('users').insert({
        email: email.toLowerCase(), password_hash, nome, cognome,
        ruolo: ruolo || 'admin', workspace_id: workspace_id || req.user.workspace_id,
        ruoli: ruoli || [ruolo || 'admin'], squadre_accesso: categorie_accesso || [],
        permessi: permessi || {}, is_active: true
      }).select().single();
      if (error) return res.status(400).json({ error: error.message });
      res.status(201).json({ ...data, categorie_accesso: data.squadre_accesso || [] });
    } catch (err) {
      res.status(500).json({ error: 'Errore server' });
    }
  });

  router.put('/api/auth/users/:id', authMiddleware, async (req, res) => {
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

  router.delete('/api/auth/users/:id', authMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const { error } = await supabase.from('users').update({ is_active: false }).eq('id', id);
      if (error) return res.status(400).json({ error: error.message });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Errore server' });
    }
  });

  router.post('/api/auth/guest-link', authMiddleware, async (req, res) => {
    try {
      const { tipo = 'genitore', categorie_accesso = [], scadenza_giorni, player_id, telefono } = req.body;
      const token = crypto.randomBytes(32).toString('hex');
      const hours = scadenza_giorni ? scadenza_giorni * 24 : 720 * 24;
      const scadenza = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
      const insertData = { token, utente_id: req.user.id, tipo, squadre_accesso: categorie_accesso, scadenza };
      if (player_id) insertData.player_id = player_id;
      if (telefono) insertData.telefono = telefono;
      const { data, error } = await supabase.from('guest_token').insert(insertData).select().single();
      if (error) return res.status(400).json({ error: error.message });
      const link = `${req.headers.origin || 'https://youth-football-manager.vercel.app'}/guest/${data.token}`;
      res.status(201).json({ success: true, token: data.token, scadenza: data.scadenza, tipo: data.tipo, link, player_id: data.player_id });
    } catch (err) {
      res.status(500).json({ error: 'Errore server' });
    }
  });

  // POST /api/auth/guest-links-batch — genera link atleta per tutti i giocatori della rosa
  router.post('/api/auth/guest-links-batch', authMiddleware, async (req, res) => {
    try {
      const { team_id, categorie_accesso = [], scadenza_giorni } = req.body;
      if (!team_id) return res.status(400).json({ error: 'team_id richiesto' });

      // Fetch rosa attiva
      const { data: roster } = await supabase.from('team_player')
        .select('player_id, player:player_id(id, nome, cognome, telefono)')
        .eq('team_id', team_id).eq('stato', 'Attivo');

      if (!roster || roster.length === 0) return res.json({ success: true, generated: 0, links: [] });

      // Fetch existing player links per non duplicare
      const { data: existing } = await supabase.from('guest_token')
        .select('player_id').eq('tipo', 'atleta')
        .in('player_id', roster.map(r => r.player_id))
        .gte('scadenza', new Date().toISOString());
      const existingPlayerIds = new Set((existing || []).map(e => e.player_id));

      const hours = scadenza_giorni ? scadenza_giorni * 24 : 720 * 24;
      const scadenza = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
      const generated = [];

      for (const r of roster) {
        if (existingPlayerIds.has(r.player_id)) continue;
        const p = r.player || {};
        const token = crypto.randomBytes(32).toString('hex');
        const { data, error } = await supabase.from('guest_token').insert({
          token, utente_id: req.user.id, tipo: 'atleta',
          squadre_accesso: categorie_accesso, scadenza,
          player_id: r.player_id, telefono: p.telefono || null
        }).select().single();
        if (!error && data) {
          generated.push({
            token: data.token, player_id: r.player_id,
            nome: p.nome, cognome: p.cognome, telefono: p.telefono || null,
            link: `${req.headers.origin || 'https://youth-football-manager.vercel.app'}/guest/${data.token}`
          });
        }
      }

      res.json({ success: true, generated: generated.length, skipped: existingPlayerIds.size, links: generated });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/api/auth/guest-links', authMiddleware, async (req, res) => {
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

  router.delete('/api/auth/guest-link/:token', authMiddleware, async (req, res) => {
    try {
      const { token } = req.params;
      const { error } = await supabase.from('guest_token').delete().eq('token', token);
      if (error) return res.status(400).json({ error: error.message });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Errore server' });
    }
  });

  router.get('/api/guest/:token', async (req, res) => {
    try {
      const { token } = req.params;
      const { data, error } = await supabase.from('guest_token').select('*').eq('token', token).gte('scadenza', new Date().toISOString()).single();
      if (error || !data) return res.status(404).json({ error: 'Link non valido o scaduto' });
      
      const payload = {
        isGuest: true, tipo: data.tipo, squadre_accesso: data.squadre_accesso || [], guestTokenId: data.id
      };
      if (data.player_id) payload.player_id = data.player_id;
      const guestJwt = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
      
      res.json({ token: data.token, jwt: guestJwt, tipo: data.tipo, squadre_accesso: data.squadre_accesso, player_id: data.player_id || null });
    } catch (err) {
      res.status(500).json({ error: 'Errore server' });
    }
  });

  return router;
};
