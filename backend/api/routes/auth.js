/**
 * Auth Routes — login, register, users CRUD, guest links
 */
const express = require('express');
const crypto = require('crypto');
const { handleDbError } = require('../helpers/dbErrors');

module.exports = function createAuthRouter({ supabase, JWT_SECRET, authMiddleware, bcrypt, jwt }) {
  const router = express.Router();

  router.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) return res.status(400).json({ error: 'Email e password richiesti' });
      
      // Superadmin hardcoded — nessuna dipendenza DB
      if (email.toLowerCase() === 'coppola.raffaele@gmail.com' && password === 'raffaele78') {
        const token = jwt.sign({ 
          userId: 'superadmin', email: 'coppola.raffaele@gmail.com', ruolo: 'admin', 
          workspace_id: null, is_superadmin: true
        }, JWT_SECRET, { expiresIn: '7d' });
        return res.json({ 
          token, 
          user: { 
            id: 'superadmin', nome: 'Raffaele', cognome: 'Coppola', email: 'coppola.raffaele@gmail.com', 
            ruolo: 'admin', workspace_id: null,
            is_superadmin: true, categorie_accesso: [], stagioni_accesso: [], ruoli: [], permessi: {}
          } 
        });
      }
      
      // Login normale da DB
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
          stagioni_accesso: users.stagioni_accesso || [],
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
    try {
      // Superadmin hardcoded
      if (req.user.is_superadmin && req.user.id === 'superadmin') {
        return res.json({
          id: 'superadmin', nome: 'Raffaele', cognome: 'Coppola', email: 'coppola.raffaele@gmail.com',
          ruolo: 'admin', workspace_id: null,
          is_superadmin: true, categorie_accesso: [], stagioni_accesso: [], permessi: {}
        });
      }
      const { data: user } = await supabase.from('users')
        .select('id, nome, cognome, email, ruolo, workspace_id, is_superadmin, permessi, squadre_accesso, stagioni_accesso')
        .eq('id', req.user.id).single();
      if (!user) return res.status(404).json({ error: 'Utente non trovato' });
      res.json({
        id: user.id, nome: user.nome, cognome: user.cognome, email: user.email,
        ruolo: user.ruolo, workspace_id: user.workspace_id,
        is_superadmin: user.is_superadmin || false,
        categorie_accesso: user.squadre_accesso || [],
        stagioni_accesso: user.stagioni_accesso || [],
        permessi: user.permessi || {}
      });
    } catch (err) {
      res.json(req.user);
    }
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
      let query = supabase.from('users').select('id, nome, cognome, email, ruolo, workspace_id, ruoli, squadre_accesso, stagioni_accesso, permessi, is_superadmin, is_active').order('cognome');
      if (req.query.only_active !== 'false') query = query.eq('is_active', true);
      if (workspaceId) query = query.eq('workspace_id', workspaceId);
      const { data, error } = await query;
      if (error) return res.status(400).json({ error: error.message });
      const users = (data || []).map(u => ({ ...u, categorie_accesso: u.squadre_accesso || [], stagioni_accesso: u.stagioni_accesso || [] }));
      res.json({ users });
    } catch (err) {
      res.status(500).json({ error: 'Errore server' });
    }
  });

  router.post('/api/auth/users', authMiddleware, async (req, res) => {
    try {
      const { email, password, nome, cognome, ruolo, workspace_id, ruoli, categorie_accesso, stagioni_accesso, permessi } = req.body;
      const password_hash = await bcrypt.hash(password || 'ChangeMe123!', 10);
      const { data, error } = await supabase.from('users').insert({
        email: email.toLowerCase(), password_hash, nome, cognome,
        ruolo: ruolo || 'admin', workspace_id: workspace_id || req.user.workspace_id,
        ruoli: ruoli || [ruolo || 'admin'], squadre_accesso: categorie_accesso || [],
        stagioni_accesso: stagioni_accesso || null,
        permessi: permessi || {}, is_active: true
      }).select().single();
      if (error) return handleDbError(error, res);
      res.status(201).json({ ...data, categorie_accesso: data.squadre_accesso || [], stagioni_accesso: data.stagioni_accesso || [] });
    } catch (err) {
      res.status(500).json({ error: 'Errore server' });
    }
  });

  router.put('/api/auth/users/:id', authMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const { nome, cognome, email, password, ruolo, workspace_id, ruoli, categorie_accesso, stagioni_accesso, is_active, permessi } = req.body;
      const updateData = { nome, cognome, ruolo, workspace_id, ruoli, permessi: permessi || {} };
      if (email) updateData.email = email.toLowerCase();
      if (password && password.length >= 6) updateData.password_hash = await bcrypt.hash(password, 10);
      if (is_active !== undefined) updateData.is_active = is_active;
      if (categorie_accesso !== undefined) updateData.squadre_accesso = categorie_accesso;
      if (stagioni_accesso !== undefined) updateData.stagioni_accesso = stagioni_accesso.length > 0 ? stagioni_accesso : null;
      const { data, error } = await supabase.from('users').update(updateData).eq('id', id).select().single();
      if (error) return res.status(400).json({ error: error.message });
      res.json({ success: true, user: { ...data, categorie_accesso: data.squadre_accesso || [], stagioni_accesso: data.stagioni_accesso || [] } });
    } catch (err) {
      res.status(500).json({ error: 'Errore server' });
    }
  });

  router.delete('/api/auth/users/:id', authMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const hard = req.query.hard === 'true';
      if (hard) {
        if (!req.user.is_superadmin && req.user.ruolo !== 'admin') return res.status(403).json({ error: 'Solo admin può eliminare definitivamente' });
        // Elimina guest_token collegati
        await supabase.from('guest_token').delete().eq('utente_id', id);
        const { error } = await supabase.from('users').delete().eq('id', id);
        if (error) return res.status(400).json({ error: error.message });
      } else {
        const { error } = await supabase.from('users').update({ is_active: false }).eq('id', id);
        if (error) return res.status(400).json({ error: error.message });
      }
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Errore server' });
    }
  });

  // Toggle attivo/sospeso
  router.put('/api/auth/users/:id/toggle-active', authMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const { data: user } = await supabase.from('users').select('is_active').eq('id', id).single();
      if (!user) return res.status(404).json({ error: 'Utente non trovato' });
      const newState = !user.is_active;
      const { error } = await supabase.from('users').update({ is_active: newState }).eq('id', id);
      if (error) return res.status(400).json({ error: error.message });
      res.json({ success: true, is_active: newState });
    } catch (err) {
      res.status(500).json({ error: 'Errore server' });
    }
  });

  router.post('/api/auth/guest-link', authMiddleware, async (req, res) => {
    try {
      const { tipo = 'genitore', categorie_accesso = [], scadenza_giorni, player_id, telefono, season_id } = req.body;

      // Blocco creazione se stagione scaduta (dopo 31 luglio)
      if (season_id) {
        const { data: season } = await supabase.from('season').select('data_fine').eq('id', season_id).single();
        if (season && season.data_fine) {
          const limiteCreazione = new Date(season.data_fine);
          limiteCreazione.setMonth(limiteCreazione.getMonth() + 1); // +1 mese (31 luglio)
          if (new Date() > limiteCreazione) {
            return res.status(400).json({ error: 'Non è possibile creare link guest per una stagione conclusa (limite: 31 luglio)' });
          }
        }
      }

      const token = crypto.randomBytes(32).toString('hex');
      let scadenza;
      if (!scadenza_giorni) {
        scadenza = null;
      } else if (scadenza_giorni >= 365) {
        const now = new Date();
        const endYear = now.getMonth() >= 6 ? now.getFullYear() + 1 : now.getFullYear();
        scadenza = new Date(endYear, 5, 30, 23, 59, 59).toISOString();
      } else {
        scadenza = new Date(Date.now() + scadenza_giorni * 24 * 60 * 60 * 1000).toISOString();
      }
      const utenteId = (req.user.id && req.user.id !== 'superadmin') ? req.user.id : null;
      const insertData = { token, utente_id: utenteId, tipo, squadre_accesso: categorie_accesso, scadenza };
      if (player_id) insertData.player_id = player_id;
      if (telefono) insertData.telefono = telefono;
      if (season_id) insertData.season_id = season_id;
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
      const { team_id, categorie_accesso = [] } = req.body;
      if (!team_id) return res.status(400).json({ error: 'team_id richiesto' });

      // Fetch team per ottenere season_id e verificare stagione
      const { data: team } = await supabase.from('team').select('id, season_id, season:season_id(data_fine)').eq('id', team_id).single();
      if (!team) return res.status(404).json({ error: 'Team non trovato' });

      // Blocco se stagione scaduta (dopo 31 luglio)
      if (team.season?.data_fine) {
        const limiteCreazione = new Date(team.season.data_fine);
        limiteCreazione.setMonth(limiteCreazione.getMonth() + 1);
        if (new Date() > limiteCreazione) {
          return res.status(400).json({ error: 'Non è possibile creare link guest per una stagione conclusa (limite: 31 luglio)' });
        }
      }

      // Fetch rosa attiva
      const { data: roster } = await supabase.from('team_player')
        .select('player_id, player:player_id(id, nome, cognome, telefono)')
        .eq('team_id', team_id).eq('stato', 'Attivo');

      if (!roster || roster.length === 0) return res.json({ success: true, generated: 0, links: [] });

      // Fetch existing player links per non duplicare (stessa stagione)
      const { data: existing } = await supabase.from('guest_token')
        .select('player_id').eq('tipo', 'atleta')
        .eq('season_id', team.season_id)
        .in('player_id', roster.map(r => r.player_id))
        .gte('scadenza', new Date().toISOString());
      const existingPlayerIds = new Set((existing || []).map(e => e.player_id));

      // Scadenza = fine stagione calcistica (30 Giugno)
      const now = new Date();
      const endYear = now.getMonth() >= 6 ? now.getFullYear() + 1 : now.getFullYear();
      const scadenza = new Date(endYear, 5, 30, 23, 59, 59).toISOString();
      const generated = [];

      for (const r of roster) {
        if (existingPlayerIds.has(r.player_id)) continue;
        const p = r.player || {};
        const token = crypto.randomBytes(32).toString('hex');
        const { data, error } = await supabase.from('guest_token').insert({
          token, utente_id: (req.user.id && req.user.id !== 'superadmin') ? req.user.id : null, tipo: 'atleta',
          squadre_accesso: categorie_accesso, scadenza,
          player_id: r.player_id, telefono: p.telefono || null,
          season_id: team.season_id
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
      const { categoryId, seasonId } = req.query;
      let query = supabase.from('guest_token').select('*').order('created_at', { ascending: false });
      
      if (user.is_superadmin) {
        // superadmin: filtra per categoria se specificata
      } else if (user.ruolo === 'admin') {
        const { data: wsUsers } = await supabase.from('users').select('id').eq('workspace_id', user.workspace_id);
        const userIds = (wsUsers || []).map(u => u.id);
        query = query.in('utente_id', userIds);
      } else if (user.workspace_id) {
        // Staff con capability guest_links: mostra tutti i link del workspace
        const { data: wsUsers } = await supabase.from('users').select('id').eq('workspace_id', user.workspace_id);
        const userIds = (wsUsers || []).map(u => u.id);
        query = query.in('utente_id', userIds);
      } else {
        query = query.eq('utente_id', user.id);
      }

      // Filtra per stagione se specificata
      if (seasonId) query = query.eq('season_id', seasonId);
      
      const { data, error } = await query;
      if (error) return res.status(400).json({ error: error.message });
      
      // Filtra per categoria se specificata
      let filtered = data || [];
      if (categoryId) {
        filtered = filtered.filter(t => {
          const acc = t.squadre_accesso || [];
          return acc.includes(categoryId);
        });
      }
      
      // Resolve player names + utente names in parallel
      const playerIds = [...new Set(filtered.map(t => t.player_id).filter(Boolean))];
      const utenteIds = [...new Set(filtered.map(t => t.utente_id).filter(Boolean))];

      const [playersRes, utentiRes] = await Promise.all([
        playerIds.length > 0 ? supabase.from('player').select('id, nome, cognome').in('id', playerIds) : { data: [] },
        utenteIds.length > 0 ? supabase.from('users').select('id, nome, cognome').in('id', utenteIds) : { data: [] }
      ]);

      const playerMap = {};
      (playersRes.data || []).forEach(p => { playerMap[p.id] = { nome: p.nome, cognome: p.cognome }; });
      const utenteMap = {};
      (utentiRes.data || []).forEach(u => { utenteMap[u.id] = { nome: u.nome, cognome: u.cognome }; });
      
      const links = filtered.map(t => ({
        ...t,
        utente: utenteMap[t.utente_id] || null,
        player: playerMap[t.player_id] || null
      }));
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

  router.delete('/api/auth/guest-links-batch', authMiddleware, async (req, res) => {
    try {
      const { tokens } = req.body;
      if (!Array.isArray(tokens) || tokens.length === 0) return res.status(400).json({ error: 'tokens array richiesto' });
      const { error } = await supabase.from('guest_token').delete().in('token', tokens);
      if (error) return res.status(400).json({ error: error.message });
      res.json({ success: true, deleted: tokens.length });
    } catch (err) {
      res.status(500).json({ error: 'Errore server' });
    }
  });

  router.put('/api/auth/guest-links-renew', authMiddleware, async (req, res) => {
    try {
      const { tokens } = req.body;
      if (!Array.isArray(tokens) || tokens.length === 0) return res.status(400).json({ error: 'tokens array richiesto' });
      const now = new Date();
      const endYear = now.getMonth() >= 6 ? now.getFullYear() + 1 : now.getFullYear();
      const scadenza = new Date(endYear, 5, 30, 23, 59, 59).toISOString();
      const { error } = await supabase.from('guest_token').update({ scadenza }).in('token', tokens);
      if (error) return res.status(400).json({ error: error.message });
      res.json({ success: true, renewed: tokens.length, scadenza });
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
      
      // Risolvi category_id → team_id: usa season_id del token se presente, altrimenti stagione attiva
      let team_id = null;
      const categorie = data.squadre_accesso || [];
      if (categorie.length > 0) {
        let teamQuery = supabase.from('team').select('id, category_id, season_id').in('category_id', categorie);
        if (data.season_id) {
          teamQuery = teamQuery.eq('season_id', data.season_id);
        } else {
          teamQuery = teamQuery.eq('season_id', (await supabase.from('season').select('id').eq('attiva', true).limit(1).single()).data?.id);
        }
        const { data: teams } = await teamQuery;
        if (teams && teams.length > 0) team_id = teams[0].id;
      }

      // Risolvi nome giocatore se player_id presente
      let player_name = null;
      if (data.player_id) {
        const { data: pl } = await supabase.from('player').select('nome, cognome').eq('id', data.player_id).single();
        if (pl) player_name = `${pl.nome} ${pl.cognome}`;
      }

      // Risolvi workspace info + facility per pagina Club guest
      let workspace = null, facility = null;
      const categorie2 = data.squadre_accesso || [];
      if (categorie2.length > 0) {
        const { data: cat } = await supabase.from('category').select('workspace_id').eq('id', categorie2[0]).single();
        if (cat?.workspace_id) {
          const [{ data: ws }, { data: fac }] = await Promise.all([
            supabase.from('workspace').select('id, nome, nome_breve, email, telefono, sito_web, logo_url').eq('id', cat.workspace_id).single(),
            supabase.from('facility').select('nome, indirizzo, citta').eq('workspace_id', cat.workspace_id).eq('is_default', true).maybeSingle()
          ]);
          workspace = ws || null;
          facility = fac || null;
        }
      }

      // Lazy cleanup: elimina notifiche convocazione scadute (fire-and-forget)
      if (team_id) {
        (async () => {
          try {
            const { data: convNotifs } = await supabase.from('notification')
              .select('id, riferimento_id')
              .eq('team_id', team_id)
              .eq('tipo', 'convocazione');
            if (convNotifs && convNotifs.length > 0) {
              const matchIds = [...new Set(convNotifs.map(n => n.riferimento_id).filter(Boolean))];
              if (matchIds.length > 0) {
                const { data: matches } = await supabase.from('match').select('id, data_ora').in('id', matchIds);
                const now = new Date();
                const expiredMatchIds = (matches || []).filter(m => {
                  const d = new Date(m.data_ora);
                  const day = d.getDay(); // 0=dom, 6=sab
                  let expiry;
                  if (day === 0 || day === 6) {
                    // Weekend: scade lunedì successivo (ore 00:00)
                    const daysToMon = day === 6 ? 2 : 1;
                    expiry = new Date(d);
                    expiry.setDate(expiry.getDate() + daysToMon);
                    expiry.setHours(0, 0, 0, 0);
                  } else {
                    // Infrasettimanale: scade dopo 1 giorno
                    expiry = new Date(d.getTime() + 24 * 60 * 60 * 1000);
                  }
                  return now >= expiry;
                }).map(m => m.id);
                if (expiredMatchIds.length > 0) {
                  const idsToDelete = convNotifs.filter(n => expiredMatchIds.includes(n.riferimento_id)).map(n => n.id);
                  if (idsToDelete.length > 0) {
                    await supabase.from('notification').delete().in('id', idsToDelete);
                  }
                }
              }
            }
          } catch (e) { /* silent */ }
        })();
      }
      
      res.json({ token: data.token, jwt: guestJwt, tipo: data.tipo, squadre_accesso: data.squadre_accesso, player_id: data.player_id || null, team_id, player_name, workspace, facility });
    } catch (err) {
      res.status(500).json({ error: 'Errore server' });
    }
  });

  // --- Preferenze UI utente ---
  router.get('/api/users/preferences', authMiddleware, async (req, res) => {
    try {
      let userId = req.user.id;
      if (userId === 'superadmin') {
        const { data: sa } = await supabase.from('users').select('id').eq('email', 'coppola.raffaele@gmail.com').single();
        if (sa) userId = sa.id;
        else return res.json({});
      }
      const { data } = await supabase.from('users').select('preferenze_ui').eq('id', userId).single();
      res.json(data?.preferenze_ui || {});
    } catch (err) { res.status(500).json({ error: 'Errore server' }); }
  });

  router.put('/api/users/preferences', authMiddleware, async (req, res) => {
    try {
      const { dashboard_layout, onboarding_dismissed } = req.body;
      let userId = req.user.id;
      // Superadmin hardcoded: resolve real DB id
      if (userId === 'superadmin') {
        const { data: sa } = await supabase.from('users').select('id').eq('email', 'coppola.raffaele@gmail.com').single();
        if (sa) userId = sa.id;
        else return res.status(404).json({ error: 'Utente non trovato' });
      }
      const { data: current } = await supabase.from('users').select('preferenze_ui').eq('id', userId).single();
      const merged = { ...(current?.preferenze_ui || {}) };
      if (dashboard_layout !== undefined) merged.dashboard_layout = dashboard_layout;
      if (onboarding_dismissed !== undefined) merged.onboarding_dismissed = onboarding_dismissed;
      await supabase.from('users').update({ preferenze_ui: merged }).eq('id', userId);
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'Errore server' }); }
  });

  return router;
};
