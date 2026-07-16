/**
 * Workspace Routes — workspace CRUD, facility, stagioni, staff, categorie
 */
const express = require('express');
const fs = require('fs');
const path = require('path');
const { getLatestSeason } = require('../helpers/seasons');

module.exports = function createWorkspaceRouter({ supabase, authMiddleware }) {
  const router = express.Router();

  // ── WORKSPACE ──
  router.get('/api/auth/workspaces', authMiddleware, async (req, res) => {
    try {
      // Superadmin hardcoded — vede tutti i workspace
      if (req.user.is_superadmin) {
        const { data: workspaces, error } = await supabase.from('workspace').select('*');
        if (error) return res.status(400).json({ error: error.message });
        return res.json(workspaces || []);
      }
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Non autenticato' });
      const { data: user } = await supabase.from('users').select('workspace_id').eq('id', userId).single();
      if (!user) return res.json([]);
      let query = supabase.from('workspace').select('*');
      if (user.workspace_id) query = query.eq('id', user.workspace_id);
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
      const { nome, logo_url } = req.body;
      if (!nome) return res.status(400).json({ error: 'Nome richiesto' });
      const { data, error } = await supabase.from('workspace').insert({ nome, logo_url }).select().single();
      if (error) return res.status(400).json({ error: error.message });
      res.status(201).json(data);
    } catch (err) {
      res.status(500).json({ error: 'Errore server' });
    }
  });

  router.put('/api/workspaces/:id', authMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const { nome, nome_breve, logo_url } = req.body;
      const { data, error } = await supabase.from('workspace').update({ nome, nome_breve, logo_url }).eq('id', id).select().single();
      if (error) return res.status(400).json({ error: error.message });
      res.json(data);
    } catch (err) { res.status(500).json({ error: 'Errore server' }); }
  });

  // GET anagrafica societaria
  router.get('/api/workspaces/:id/anagrafica', authMiddleware, async (req, res) => {
    try {
      const { data } = await supabase.from('workspace_anagrafica').select('*').eq('workspace_id', req.params.id).single();
      res.json(data || {});
    } catch (err) { res.status(500).json({ error: 'Errore server' }); }
  });

  // PUT anagrafica societaria (admin/segreteria)
  router.put('/api/workspaces/:id/anagrafica', authMiddleware, async (req, res) => {
    try {
      const user = req.user;
      if (!user.is_superadmin && user.ruolo !== 'admin') {
        const caps = user.permessi?.capabilities || user.permessi || {};
        if (caps.tesseramento !== 'write' && caps.rosa !== 'write') return res.status(403).json({ error: 'Non autorizzato' });
      }
      const { forma_giuridica, matricola_figc, p_iva, codice_fiscale, sdi, indirizzo, telefono, email, sito_web, facebook, instagram, colori_sociali, sponsor_tecnico, nome_campo, indirizzo_campo, iban } = req.body;
      const fields = { forma_giuridica, matricola_figc, p_iva, codice_fiscale, sdi, indirizzo, telefono, email, sito_web, facebook, instagram, colori_sociali, sponsor_tecnico, nome_campo, indirizzo_campo, iban, updated_at: new Date().toISOString() };
      const { data: existing } = await supabase.from('workspace_anagrafica').select('id').eq('workspace_id', req.params.id).single();
      let result;
      if (existing) {
        result = await supabase.from('workspace_anagrafica').update(fields).eq('workspace_id', req.params.id).select().single();
      } else {
        result = await supabase.from('workspace_anagrafica').insert({ workspace_id: req.params.id, ...fields }).select().single();
      }
      if (result.error) return res.status(400).json({ error: result.error.message });
      res.json(result.data);
    } catch (err) { res.status(500).json({ error: 'Errore server' }); }
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
      if (fs.existsSync(logosDir)) {
        const files = fs.readdirSync(logosDir).filter(f => /\.(png|jpg|jpeg|svg|webp)$/i.test(f));
        if (files.length) return res.json(files.map(f => '/logos/' + f));
      }
      // Fallback: leggi da team_logo (produzione Vercel)
      const { data } = await supabase.from('team_logo').select('logo_path');
      const paths = [...new Set((data || []).map(r => r.logo_path).filter(Boolean))];
      res.json(paths);
    } catch (err) {
      res.json([]);
    }
  });

  // GET /api/teams/search?q=alb — ricerca squadre da team_logo (dedup per logo)
  router.get('/api/teams/search', authMiddleware, async (req, res) => {
    try {
      const q = (req.query.q || '').trim().toLowerCase();
      if (q.length < 2) return res.json([]);
      const { data } = await supabase.from('team_logo')
        .select('nome, logo_path')
        .ilike('nome', `%${q}%`)
        .order('nome')
        .limit(50);
      if (!data || data.length === 0) return res.json([]);
      // Dedup: keep best name per logo_path (prefer full name over abbreviations)
      const byLogo = {};
      const abbrPrefixes = /^(c\.|pol\.|acc\.|atl\.|s\.|ss\.|asd\.|ssd\.) /i;
      data.forEach(r => {
        const key = r.logo_path;
        if (!byLogo[key]) { byLogo[key] = r; return; }
        const curIsAbbr = abbrPrefixes.test(byLogo[key].nome);
        const newIsAbbr = abbrPrefixes.test(r.nome);
        // Prefer non-abbreviated; if both same, prefer shorter
        if (curIsAbbr && !newIsAbbr) byLogo[key] = r;
        else if (curIsAbbr === newIsAbbr && r.nome.length < byLogo[key].nome.length) byLogo[key] = r;
      });
      const results = Object.values(byLogo).sort((a, b) => a.nome.localeCompare(b.nome)).slice(0, 15);
      res.json(results);
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
      const seasons = data || [];
      const latest = getLatestSeason(seasons);
      const result = seasons.map(s => ({ ...s, is_latest: s.id === latest?.id }));
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: 'Errore server' });
    }
  });

  // GET teams per stagione
  router.get('/api/workspaces/:id/stagioni/:seasonId/teams', authMiddleware, async (req, res) => {
    try {
      const { data, error } = await supabase.from('team')
        .select('id, nome, category_id, season_id, category:category_id(nome, tipo_campionato, genere)')
        .eq('season_id', req.params.seasonId);
      if (error) return res.status(400).json({ error: error.message });
      // Flatten category fields
      const result = (data || []).map(t => ({
        ...t,
        category_name: t.category?.nome || t.nome,
        category_tipo: t.category?.tipo_campionato || null,
        category_genere: t.category?.genere || 'M'
      }));
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: 'Errore server' });
    }
  });


  // POST nuova stagione — input: { anno_inizio: 2026 }
  // Auto-genera nome "2026/27", date 01/07/2026→30/06/2027
  // Auto-crea un team per ogni categoria del workspace
  // Disattiva stagione precedente
  router.post('/api/workspaces/:id/stagioni', authMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const { anno_inizio, nome, data_inizio, data_fine, skip_auto_teams } = req.body;

      let seasonName, startDate, endDate;
      if (anno_inizio) {
        const anno = parseInt(anno_inizio);
        if (isNaN(anno) || anno < 2020 || anno > 2050) return res.status(400).json({ error: 'Anno non valido' });
        seasonName = `${anno}/${(anno + 1).toString().slice(2)}`;
        startDate = `${anno}-07-01`;
        endDate = `${anno + 1}-06-30`;
      } else if (nome && data_inizio && data_fine) {
        seasonName = nome; startDate = data_inizio; endDate = data_fine;
      } else {
        return res.status(400).json({ error: 'anno_inizio richiesto' });
      }

      // Check duplicato
      const { data: existing } = await supabase.from('season').select('id').eq('workspace_id', id).eq('nome', seasonName);
      if (existing && existing.length > 0) return res.status(400).json({ error: `Stagione ${seasonName} già esistente` });

      // Crea stagione
      const { data: season, error } = await supabase.from('season').insert({
        workspace_id: id, nome: seasonName, data_inizio: startDate, data_fine: endDate, attiva: true
      }).select().single();
      if (error) return res.status(400).json({ error: error.message });

      // Auto-crea team per ogni categoria (skip se migrazione gestirà i team)
      const createdTeams = [];
      if (!skip_auto_teams) {
        const { data: categories } = await supabase.from('category').select('id, nome').eq('workspace_id', id);
        const { data: ws } = await supabase.from('workspace').select('nome, nome_breve').eq('id', id).single();
        const teamName = ws?.nome_breve || ws?.nome || 'Squadra';
        for (const cat of (categories || [])) {
          const { data: team } = await supabase.from('team').insert({
            season_id: season.id, category_id: cat.id, nome: teamName
          }).select().single();
          if (team) createdTeams.push(team);
        }
      }

      res.status(201).json({ ...season, teams_created: createdTeams.length });
    } catch (err) {
      res.status(500).json({ error: 'Errore server' });
    }
  });

  // POST migrazione dati dalla stagione precedente alla nuova
  // body: { from_season_id, migrations: [{from_team_id, from_category_id, new_category_name, new_tipo_campionato, genere}], migra_rosa, migra_staff, migra_config }
  router.post('/api/stagioni/:id/migra', authMiddleware, async (req, res) => {
    try {
      const newSeasonId = req.params.id;
      const { from_season_id, migrations, migra_rosa, migra_staff, migra_config } = req.body;
      if (!from_season_id) return res.status(400).json({ error: 'from_season_id richiesto' });

      // Recupera workspace_id dalla nuova stagione
      const { data: newSeason } = await supabase.from('season').select('workspace_id').eq('id', newSeasonId).single();
      const wsId = newSeason?.workspace_id;
      const { data: ws } = await supabase.from('workspace').select('nome, nome_breve').eq('id', wsId).single();
      const teamName = ws?.nome_breve || ws?.nome || 'Squadra';

      const result = { rosa: 0, staff: 0, config: 0, categories_created: 0 };

      // Nuovo formato con promozione categoria
      if (Array.isArray(migrations) && migrations.length > 0) {
        const { data: existingCats } = await supabase.from('category').select('id, nome, tipo_campionato').eq('workspace_id', wsId);

        for (const mig of migrations) {
          // Trova o crea la categoria di destinazione
          let targetCat = (existingCats || []).find(c => c.nome === mig.new_category_name && c.tipo_campionato === mig.new_tipo_campionato);
          if (!targetCat) {
            // Crea nuova categoria
            const { data: newCat } = await supabase.from('category').insert({
              workspace_id: wsId, nome: mig.new_category_name,
              tipo_campionato: mig.new_tipo_campionato, genere: mig.genere || 'M',
              anno_da: 0, anno_a: 0
            }).select().single();
            if (newCat) { targetCat = newCat; existingCats.push(newCat); result.categories_created++; }
            else continue;
          }

          // Crea team nella nuova stagione per questa categoria
          const { data: newTeam } = await supabase.from('team').insert({
            season_id: newSeasonId, category_id: targetCat.id, nome: teamName
          }).select().single();
          if (!newTeam) continue;

          const oldTeamId = mig.from_team_id;

          if (migra_rosa) {
            const { data: oldPlayers } = await supabase.from('team_player')
              .select('player_id, numero_maglia, ruolo_preferito, stato, taglia')
              .eq('team_id', oldTeamId).in('stato', ['Attivo', 'Infortunato']);
            if (oldPlayers?.length) {
              const inserts = oldPlayers.map(p => ({
                team_id: newTeam.id, player_id: p.player_id,
                numero_maglia: p.numero_maglia, ruolo_preferito: p.ruolo_preferito,
                stato: p.stato === 'Infortunato' ? 'Infortunato' : 'Attivo', aggregato: false,
                taglia: p.taglia || null
              }));
              const { data: inserted } = await supabase.from('team_player').insert(inserts).select();
              result.rosa += (inserted || []).length;
              // Migrare infortuni aperti al nuovo team
              const injPlayerIds = oldPlayers.filter(p => p.stato === 'Infortunato').map(p => p.player_id);
              if (injPlayerIds.length) {
                await supabase.from('injury').update({ team_id: newTeam.id })
                  .eq('team_id', oldTeamId).in('player_id', injPlayerIds).is('data_rientro_effettiva', null);
              }
              // Auto-genera checklist per i giocatori migrati
              const { data: ws } = await supabase.from('workspace').select('checklist_template').eq('id', workspaceId).single();
              const defaultItems = [{ key: 'iscrizione', label: 'Iscrizione società' }, { key: 'certificato', label: 'Certificato medico' }, { key: 'gdpr', label: 'Consenso GDPR' }, { key: 'quota', label: 'Quota stagionale' }, { key: 'kit', label: 'Kit sportivo' }, { key: 'foto', label: 'Foto tessera' }, { key: 'tesseramento', label: 'Tesseramento FIGC' }];
              const chkItems = (ws?.checklist_template || defaultItems).map(i => ({ ...i, done: false }));
              const chkInserts = oldPlayers.map(p => ({ player_id: p.player_id, team_id: newTeam.id, season_id: req.params.id, items: chkItems, completamento_pct: 0 }));
              await supabase.from('registration_checklist').insert(chkInserts).select('id');
            }
          }

          if (migra_staff) {
            const { data: oldStaff } = await supabase.from('team_staff')
              .select('staff_id, ruolo_squadra').eq('team_id', oldTeamId);
            if (oldStaff?.length) {
              const inserts = oldStaff.map(s => ({
                team_id: newTeam.id, staff_id: s.staff_id, ruolo_squadra: s.ruolo_squadra
              }));
              const { data: inserted } = await supabase.from('team_staff').insert(inserts).select();
              result.staff += (inserted || []).length;
            }
          }

          if (migra_config) {
            const { data: oldConfig } = await supabase.from('training_config')
              .select('giorno_settimana, ora_inizio, ora_fine, luogo').eq('team_id', oldTeamId);
            if (oldConfig?.length) {
              const inserts = oldConfig.map(c => ({ ...c, team_id: newTeam.id }));
              const { data: inserted } = await supabase.from('training_config').insert(inserts).select();
              result.config += (inserted || []).length;
            }
          }
        }
      } else {
        // Fallback: vecchio formato (match per category_id)
        const { data: oldTeams } = await supabase.from('team').select('id, category_id').eq('season_id', from_season_id);
        const { data: newTeams } = await supabase.from('team').select('id, category_id').eq('season_id', newSeasonId);
        if (oldTeams?.length && newTeams?.length) {
          for (const newTeam of newTeams) {
            const oldTeam = oldTeams.find(t => t.category_id === newTeam.category_id);
            if (!oldTeam) continue;
            if (migra_rosa) {
              const { data: oldPlayers } = await supabase.from('team_player')
                .select('player_id, numero_maglia, ruolo_preferito, stato, taglia')
                .eq('team_id', oldTeam.id).in('stato', ['Attivo', 'Infortunato']);
              if (oldPlayers?.length) {
                const inserts = oldPlayers.map(p => ({ team_id: newTeam.id, player_id: p.player_id, numero_maglia: p.numero_maglia, ruolo_preferito: p.ruolo_preferito, stato: p.stato === 'Infortunato' ? 'Infortunato' : 'Attivo', aggregato: false, taglia: p.taglia || null }));
                const { data: inserted } = await supabase.from('team_player').insert(inserts).select();
                result.rosa += (inserted || []).length;
                // Migrare infortuni aperti al nuovo team
                const injPlayerIds = oldPlayers.filter(p => p.stato === 'Infortunato').map(p => p.player_id);
                if (injPlayerIds.length) {
                  await supabase.from('injury').update({ team_id: newTeam.id })
                    .eq('team_id', oldTeam.id).in('player_id', injPlayerIds).is('data_rientro_effettiva', null);
                }
              }
            }
            if (migra_staff) {
              const { data: oldStaff } = await supabase.from('team_staff').select('staff_id, ruolo_squadra').eq('team_id', oldTeam.id);
              if (oldStaff?.length) {
                const inserts = oldStaff.map(s => ({ team_id: newTeam.id, staff_id: s.staff_id, ruolo_squadra: s.ruolo_squadra }));
                const { data: inserted } = await supabase.from('team_staff').insert(inserts).select();
                result.staff += (inserted || []).length;
              }
            }
            if (migra_config) {
              const { data: oldConfig } = await supabase.from('training_config').select('giorno_settimana, ora_inizio, ora_fine, luogo').eq('team_id', oldTeam.id);
              if (oldConfig?.length) {
                const inserts = oldConfig.map(c => ({ ...c, team_id: newTeam.id }));
                const { data: inserted } = await supabase.from('training_config').insert(inserts).select();
                result.config += (inserted || []).length;
              }
            }
          }
        }
      }

      res.json({ success: true, migrated: result });
    } catch (err) {
      res.status(500).json({ error: err.message || 'Errore server' });
    }
  });

  // ── STAFF per workspace ──
  router.get('/api/workspaces/:id/staff', authMiddleware, async (req, res) => {
    try {
      const wsId = req.params.id;
      const seasonId = req.query.season_id;
      const { data: staffData, error } = await supabase.from('staff').select('*').eq('workspace_id', wsId).order('cognome');
      if (error) return res.status(400).json({ error: error.message });
      const staffIds = (staffData || []).map(s => s.id);
      if (staffIds.length === 0) return res.json({ staff: [], categories: [], seasonTeamIds: [] });

      const [{ data: tsData }, { data: categories }, { data: seasons }] = await Promise.all([
        supabase.from('team_staff').select('staff_id, team_id, ruolo_squadra').in('staff_id', staffIds),
        supabase.from('category').select('id, nome').eq('workspace_id', wsId),
        supabase.from('season').select('id').eq('workspace_id', wsId)
      ]);
      const seasonIds = (seasons || []).map(s => s.id);
      const { data: teams } = await supabase.from('team').select('id, category_id, season_id').in('season_id', seasonIds.length > 0 ? seasonIds : ['x']);

      const catMap = {};
      (categories || []).forEach(c => { catMap[c.id] = c.nome; });
      const teamCatMap = {};
      (teams || []).forEach(t => { teamCatMap[t.id] = t.category_id; });

      // Team IDs della stagione richiesta (per filtro frontend)
      const seasonTeamIds = seasonId ? (teams || []).filter(t => t.season_id === seasonId).map(t => t.id) : [];

      const staff = (staffData || []).map(s => {
        const assignments = (tsData || []).filter(ts => ts.staff_id === s.id);
        const catIds = [...new Set(assignments.map(a => teamCatMap[a.team_id]).filter(Boolean))];
        return { ...s, team_staff: assignments, categorie: catIds.map(id => ({ id, nome: catMap[id] || '?' })), ruolo_squadra: assignments[0]?.ruolo_squadra || s.ruolo };
      });
      res.json({ staff, categories: categories || [], seasonTeamIds });
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
        const { data: seasons } = await supabase.from('season').select('id, nome').eq('workspace_id', wsId);
        const latestSeason = getLatestSeason(seasons);
        const seasonIds = (seasons || []).map(s => s.id);
        const { data: teams } = await supabase.from('team').select('id, category_id, season_id').in('season_id', seasonIds.length > 0 ? seasonIds : ['x']);
        const inserts = [];
        categorie_ids.forEach(catId => {
          const team = (teams || []).find(t => t.category_id === catId && t.season_id === latestSeason?.id)
            || (teams || []).find(t => t.category_id === catId);
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
        const { data: seasons } = await supabase.from('season').select('id, nome').eq('workspace_id', workspace_id);
        const latestSeason = getLatestSeason(seasons);
        const seasonIds = (seasons || []).map(s => s.id);
        const { data: teams } = await supabase.from('team').select('id, category_id, season_id').in('season_id', seasonIds.length > 0 ? seasonIds : ['x']);
        const teamIds = (teams || []).map(t => t.id);
        await supabase.from('team_staff').delete().eq('staff_id', req.params.id).in('team_id', teamIds.length > 0 ? teamIds : ['x']);
        // Assegna al team della stagione più recente per ogni categoria
        const inserts = [];
        categorie_ids.forEach(catId => {
          const team = (teams || []).find(t => t.category_id === catId && t.season_id === latestSeason?.id)
            || (teams || []).find(t => t.category_id === catId);
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

  // ── STAFF MIGRATE (copia da altra stagione) ──
  router.post('/api/workspaces/:id/staff/migrate', authMiddleware, async (req, res) => {
    try {
      const { from_season_id, to_season_id, staff_ids } = req.body;
      if (!from_season_id || !to_season_id || !staff_ids?.length) {
        return res.status(400).json({ error: 'Parametri mancanti' });
      }
      // Get teams della stagione destinazione
      const { data: toTeams } = await supabase.from('team').select('id, category_id').eq('season_id', to_season_id);
      if (!toTeams?.length) return res.status(400).json({ error: 'Nessun team nella stagione destinazione' });
      // Get assegnazioni correnti dalla stagione sorgente
      const { data: fromTeams } = await supabase.from('team').select('id, category_id').eq('season_id', from_season_id);
      const fromTeamIds = fromTeams.map(t => t.id);
      const { data: fromAssignments } = await supabase.from('team_staff')
        .select('staff_id, team_id, ruolo_squadra')
        .in('team_id', fromTeamIds)
        .in('staff_id', staff_ids);
      // Get existing assignments nella destinazione per skip duplicati
      const toTeamIds = toTeams.map(t => t.id);
      const { data: existingAssignments } = await supabase.from('team_staff')
        .select('staff_id, team_id')
        .in('team_id', toTeamIds);
      const existingSet = new Set((existingAssignments || []).map(a => `${a.staff_id}_${a.team_id}`));
      // Map category_id from source team to dest team
      const catToDestTeam = {};
      toTeams.forEach(t => { catToDestTeam[t.category_id] = t.id; });
      const fromTeamCatMap = {};
      fromTeams.forEach(t => { fromTeamCatMap[t.id] = t.category_id; });
      // Build inserts
      const inserts = [];
      for (const a of (fromAssignments || [])) {
        const srcCatId = fromTeamCatMap[a.team_id];
        const destTeamId = catToDestTeam[srcCatId] || toTeams[0].id;
        const key = `${a.staff_id}_${destTeamId}`;
        if (existingSet.has(key)) continue;
        inserts.push({ staff_id: a.staff_id, team_id: destTeamId, ruolo_squadra: a.ruolo_squadra });
        existingSet.add(key);
      }
      if (inserts.length) {
        await supabase.from('team_staff').insert(inserts);
      }
      res.json({ success: true, migrated: inserts.length, skipped: staff_ids.length - inserts.length });
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
