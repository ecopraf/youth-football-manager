/**
 * Workspace Routes — workspace CRUD, facility, stagioni, staff, categorie
 */
const express = require('express');
const fs = require('fs');
const path = require('path');

module.exports = function createWorkspaceRouter({ supabase, authMiddleware }) {
  const router = express.Router();

  // ── WORKSPACE ──
  router.get('/api/auth/workspaces', authMiddleware, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Non autenticato' });
      const { data: user } = await supabase.from('users').select('workspace_id, is_superadmin').eq('id', userId).single();
      if (!user) return res.json([]);
      let query = supabase.from('workspace').select('*');
      if (!user.is_superadmin && user.workspace_id) query = query.eq('id', user.workspace_id);
      const { data: workspaces, error } = await query;
      if (error) return res.status(400).json({ error: error.message });
      res.json(workspaces || []);
    } catch (err) {
      res.status(500).json({ error: 'Errore server' });
    }
  });

  router.post('/api/workspaces', authMiddleware, async (req, res) => {
    try {
      if (!req.user.is_superadmin) return res.status(403).json({ error: 'Solo superadmin può creare workspace' });
      const { nome, logo_url, indirizzo, telefono, email, sito_web, colori_sociali, sponsor_tecnico } = req.body;
      if (!nome) return res.status(400).json({ error: 'Nome richiesto' });
      const { data, error } = await supabase.from('workspace').insert({ nome, logo_url, indirizzo, telefono, email, sito_web, colori_sociali, sponsor_tecnico }).select().single();
      if (error) return res.status(400).json({ error: error.message });
      res.status(201).json(data);
    } catch (err) {
      res.status(500).json({ error: 'Errore server' });
    }
  });

  router.put('/api/workspaces/:id', authMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const { nome, logo_url, indirizzo, telefono, email, sito_web, colori_sociali, sponsor_tecnico } = req.body;
      const { data, error } = await supabase.from('workspace').update({ nome, logo_url, indirizzo, telefono, email, sito_web, colori_sociali, sponsor_tecnico }).eq('id', id).select().single();
      if (error) return res.status(400).json({ error: error.message });
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: 'Errore server' });
    }
  });

  // ── RECAP per cascade delete ──
  router.get('/api/workspaces/:id/recap', authMiddleware, async (req, res) => {
    try {
      if (!req.user.is_superadmin) return res.status(403).json({ error: 'Solo superadmin' });
      const { id } = req.params;
      const { data: seasons } = await supabase.from('season').select('id').eq('workspace_id', id);
      const seasonIds = (seasons || []).map(s => s.id);
      const { data: teams } = seasonIds.length > 0
        ? await supabase.from('team').select('id').in('season_id', seasonIds)
        : { data: [] };
      const teamIds = (teams || []).map(t => t.id);

      let teamPlayers = 0, matches = 0, trainings = 0;
      if (teamIds.length > 0) {
        const { count: tpCount } = await supabase.from('team_player').select('id', { count: 'exact', head: true }).in('team_id', teamIds);
        const { count: mCount } = await supabase.from('match').select('id', { count: 'exact', head: true }).in('team_id', teamIds);
        const { count: trCount } = await supabase.from('training').select('id', { count: 'exact', head: true }).in('team_id', teamIds);
        teamPlayers = tpCount || 0;
        matches = mCount || 0;
        trainings = trCount || 0;
      }
      const { count: catCount } = await supabase.from('category').select('id', { count: 'exact', head: true }).eq('workspace_id', id);
      const { count: staffCount } = await supabase.from('staff').select('id', { count: 'exact', head: true }).eq('workspace_id', id);
      const { count: usersCount } = await supabase.from('users').select('id', { count: 'exact', head: true }).eq('workspace_id', id);
      const { count: facCount } = await supabase.from('facility').select('id', { count: 'exact', head: true }).eq('workspace_id', id);

      res.json({
        stagioni: seasonIds.length,
        squadre: teamIds.length,
        giocatori: teamPlayers,
        partite: matches,
        allenamenti: trainings,
        categorie: catCount || 0,
        staff: staffCount || 0,
        utenti: usersCount || 0,
        facility: facCount || 0
      });
    } catch (err) {
      res.status(500).json({ error: 'Errore server' });
    }
  });

  // ── CASCADE DELETE ──
  router.delete('/api/workspaces/:id', authMiddleware, async (req, res) => {
    try {
      if (!req.user.is_superadmin) return res.status(403).json({ error: 'Solo superadmin può eliminare workspace' });
      const { id } = req.params;

      // Raccogli IDs
      const { data: seasons } = await supabase.from('season').select('id').eq('workspace_id', id);
      const seasonIds = (seasons || []).map(s => s.id);
      const { data: teams } = seasonIds.length > 0
        ? await supabase.from('team').select('id').in('season_id', seasonIds)
        : { data: [] };
      const teamIds = (teams || []).map(t => t.id);

      if (teamIds.length > 0) {
        // Match-related
        const { data: matchRows } = await supabase.from('match').select('id').in('team_id', teamIds);
        const matchIds = (matchRows || []).map(m => m.id);
        if (matchIds.length > 0) {
          await supabase.from('match_event').delete().in('match_id', matchIds);
          await supabase.from('match_formation').delete().in('match_id', matchIds);
          await supabase.from('match_statistics').delete().in('match_id', matchIds);
          await supabase.from('convocation').delete().in('match_id', matchIds);
          await supabase.from('valutazione_partita').delete().in('partita_id', matchIds);
          await supabase.from('match').delete().in('id', matchIds);
        }
        // Training-related
        const { data: trainingRows } = await supabase.from('training').select('id').in('team_id', teamIds);
        const trainingIds = (trainingRows || []).map(t => t.id);
        if (trainingIds.length > 0) {
          await supabase.from('training_attendance').delete().in('training_id', trainingIds);
          await supabase.from('training').delete().in('id', trainingIds);
        }
        await supabase.from('training_config').delete().in('team_id', teamIds);
        await supabase.from('training_template').delete().in('team_id', teamIds);
        // Team player & staff
        await supabase.from('team_player').delete().in('team_id', teamIds);
        await supabase.from('team_staff').delete().in('team_id', teamIds);
        // Teams
        await supabase.from('team').delete().in('id', teamIds);
      }

      // Seasons, categories, staff, facility, users, import_log
      if (seasonIds.length > 0) await supabase.from('season').delete().in('id', seasonIds);
      await supabase.from('category').delete().eq('workspace_id', id);
      await supabase.from('staff').delete().eq('workspace_id', id);
      await supabase.from('facility').delete().eq('workspace_id', id);
      await supabase.from('import_log').delete().eq('workspace_id', id);
      await supabase.from('guest_token').delete().in('utente_id',
        (await supabase.from('users').select('id').eq('workspace_id', id)).data?.map(u => u.id) || ['x']
      );
      await supabase.from('users').delete().eq('workspace_id', id);

      // Workspace itself
      const { error } = await supabase.from('workspace').delete().eq('id', id);
      if (error) return res.status(400).json({ error: error.message });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message || 'Errore server' });
    }
  });

  router.put('/api/workspaces/:id/logo', authMiddleware, async (req, res) => {
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

  // ── LOGOS disponibili ──
  router.get('/api/logos', authMiddleware, async (req, res) => {
    try {
      const logosDir = path.join(__dirname, '../../..', 'frontend-v2/public/logos');
      if (!fs.existsSync(logosDir)) return res.json([]);
      const files = fs.readdirSync(logosDir).filter(f => /\.(png|jpg|jpeg|svg|webp)$/i.test(f));
      res.json(files.map(f => '/logos/' + f));
    } catch (err) {
      res.json([]);
    }
  });

  // ── FACILITY ──
  router.get('/api/workspaces/:id/facility', authMiddleware, async (req, res) => {
    try {
      const { data } = await supabase.from('facility').select('*').eq('workspace_id', req.params.id).eq('is_default', true).maybeSingle();
      res.json(data || null);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.put('/api/workspaces/:id/facility', authMiddleware, async (req, res) => {
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

  // ── STAGIONI per workspace ──
  router.get('/api/workspaces/:id/stagioni', authMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const { data, error } = await supabase.from('season').select('*').eq('workspace_id', id).order('data_inizio', { ascending: false });
      if (error) return res.status(400).json({ error: error.message });
      res.json(data || []);
    } catch (err) {
      res.status(500).json({ error: 'Errore server' });
    }
  });

  router.post('/api/workspaces/:id/stagioni', authMiddleware, async (req, res) => {
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

  // ── STAFF per workspace ──
  router.get('/api/workspaces/:id/staff', authMiddleware, async (req, res) => {
    try {
      const wsId = req.params.id;
      const { data: staffData, error } = await supabase.from('staff').select('*').eq('workspace_id', wsId).order('cognome');
      if (error) return res.status(400).json({ error: error.message });
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
        return { ...s, categorie: catIds.map(id => ({ id, nome: catMap[id] || '?' })), ruolo_squadra: assignments[0]?.ruolo_squadra || s.ruolo };
      });
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: 'Errore server' });
    }
  });

  router.post('/api/workspaces/:id/staff', authMiddleware, async (req, res) => {
    try {
      const wsId = req.params.id;
      const { nome, cognome, ruolo, telefono, email, qualifiche, categorie_ids } = req.body;
      const { data: staff, error } = await supabase.from('staff').insert({
        nome, cognome, ruolo, telefono, email, qualifiche: qualifiche || {}, workspace_id: wsId
      }).select().single();
      if (error) return res.status(400).json({ error: error.message });

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

  router.put('/api/staff/:id', authMiddleware, async (req, res) => {
    try {
      const { nome, cognome, ruolo, telefono, email, qualifiche, categorie_ids, workspace_id } = req.body;
      const updateData = { nome, cognome, ruolo, telefono, email, qualifiche: qualifiche || {} };
      const { data: staff, error } = await supabase.from('staff').update(updateData).eq('id', req.params.id).select().single();
      if (error) return res.status(400).json({ error: error.message });

      if (categorie_ids !== undefined && workspace_id) {
        const { data: seasons } = await supabase.from('season').select('id').eq('workspace_id', workspace_id);
        const seasonIds = (seasons || []).map(s => s.id);
        const { data: teams } = await supabase.from('team').select('id, category_id').in('season_id', seasonIds);
        const teamIds = (teams || []).map(t => t.id);
        await supabase.from('team_staff').delete().eq('staff_id', req.params.id).in('team_id', teamIds);
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

  router.delete('/api/staff/:id', authMiddleware, async (req, res) => {
    try {
      const staffId = req.params.id;
      // Rimuovi da convocation
      await supabase.from('convocation').update({ convocato_da: null }).eq('convocato_da', staffId);
      // Rimuovi da team_staff
      await supabase.from('team_staff').delete().eq('staff_id', staffId);
      // Elimina staff
      const { error } = await supabase.from('staff').delete().eq('id', staffId);
      if (error) return res.status(400).json({ error: error.message });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Errore server' });
    }
  });

  // ── CATEGORIE ──
  router.get('/api/workspaces/:id/categorie', authMiddleware, async (req, res) => {
    try {
      const { data, error } = await supabase.from('category').select('*').eq('workspace_id', req.params.id).order('nome');
      if (error) return res.status(400).json({ error: error.message });
      res.json(data || []);
    } catch (err) {
      res.status(500).json({ error: 'Errore server' });
    }
  });

  router.post('/api/workspaces/:id/categorie', authMiddleware, async (req, res) => {
    try {
      const { nome, anno_da, anno_a, genere, descrizione, tipo_campionato } = req.body;
      if (!nome) return res.status(400).json({ error: 'Nome richiesto' });
      const { data, error } = await supabase.from('category').insert({
        workspace_id: req.params.id, nome, anno_da: anno_da || 0, anno_a: anno_a || 0, genere: genere || 'M', descrizione, tipo_campionato: tipo_campionato || null
      }).select().single();
      if (error) return res.status(400).json({ error: error.message });
      res.status(201).json(data);
    } catch (err) {
      res.status(500).json({ error: 'Errore server' });
    }
  });

  router.put('/api/categorie/:id', authMiddleware, async (req, res) => {
    try {
      const { nome, anno_da, anno_a, genere, descrizione, tipo_campionato } = req.body;
      const { data, error } = await supabase.from('category').update({ nome, anno_da, anno_a, genere, descrizione, tipo_campionato }).eq('id', req.params.id).select().single();
      if (error) return res.status(400).json({ error: error.message });
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: 'Errore server' });
    }
  });

  router.delete('/api/categorie/:id', authMiddleware, async (req, res) => {
    try {
      const { data: teams } = await supabase.from('team').select('id').eq('category_id', req.params.id);
      if (teams && teams.length > 0) return res.status(400).json({ error: 'Elimina prima le squadre associate a questa categoria' });
      const { error } = await supabase.from('category').delete().eq('id', req.params.id);
      if (error) return res.status(400).json({ error: error.message });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Errore server' });
    }
  });

  return router;
};
