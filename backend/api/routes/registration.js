const express = require('express');
const router = express.Router();
const supabase = require('../db/supabase');
const { authMiddleware } = require('../middleware/auth.middleware');

// GET template per workspace
router.get('/workspaces/:id/registration-template', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase.from('registration_template')
      .select('*').eq('workspace_id', req.params.id).single();
    if (error && error.code === 'PGRST116') {
      // Non esiste ancora, crea default
      const { data: created, error: e2 } = await supabase.from('registration_template')
        .insert({ workspace_id: req.params.id }).select().single();
      if (e2) return res.status(400).json({ error: e2.message });
      return res.json(created);
    }
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT template per workspace (upsert)
router.put('/workspaces/:id/registration-template', authMiddleware, async (req, res) => {
  try {
    const { titolo, intestazione, documenti_richiesti, clausole, note_aggiuntive } = req.body;
    const { data, error } = await supabase.from('registration_template')
      .upsert({
        workspace_id: req.params.id,
        titolo, intestazione, documenti_richiesti, clausole, note_aggiuntive,
        updated_at: new Date().toISOString()
      }, { onConflict: 'workspace_id' }).select().single();
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Helper: auto-check certificato medico se data_visita_medica è valida (futura)
function autoCheckCertificato(reg) {
  if (!reg?.documenti_consegnati?.length || !reg.player?.data_visita_medica) return;
  const today = new Date().toISOString().slice(0, 10);
  const valido = reg.player.data_visita_medica >= today;
  const doc = reg.documenti_consegnati.find(d => d.nome && d.nome.toLowerCase().includes('certificato medico'));
  if (doc && valido) doc.consegnato = true;
}

// GET tesseramenti per squadra
router.get('/squadre/:teamId/registrations', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase.from('registration')
      .select('*, player:player_id(id, nome, cognome, data_nascita, codice_fiscale, luogo_nascita, residenza, data_visita_medica)')
      .eq('team_id', req.params.teamId);
    if (error) return res.status(400).json({ error: error.message });
    (data || []).forEach(r => autoCheckCertificato(r));
    res.json(data || []);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST crea tesseramento singolo
router.post('/registrations', authMiddleware, async (req, res) => {
  try {
    const { player_id, team_id, season_id, template_id } = req.body;
    // Fetch template per popolare documenti_consegnati iniziali
    let documenti_consegnati = [];
    if (template_id) {
      const { data: tpl } = await supabase.from('registration_template')
        .select('documenti_richiesti').eq('id', template_id).single();
      if (tpl && tpl.documenti_richiesti) {
        documenti_consegnati = tpl.documenti_richiesti.map(d => ({
          nome: d.nome, consegnato: false, data_consegna: null
        }));
      }
    }
    const { data, error } = await supabase.from('registration')
      .insert({ player_id, team_id, season_id, template_id, documenti_consegnati, stato: 'non_iniziato' })
      .select().single();
    if (error) {
      if (error.code === '23505') return res.status(409).json({ error: 'Tesseramento già esistente per questo giocatore' });
      return res.status(400).json({ error: error.message });
    }
    res.status(201).json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST batch — genera tesseramenti per tutta la rosa
router.post('/squadre/:teamId/registrations-batch', authMiddleware, async (req, res) => {
  try {
    const { season_id, template_id } = req.body;
    // Fetch rosa attiva
    const { data: roster } = await supabase.from('team_player')
      .select('player_id').eq('team_id', req.params.teamId).eq('stato', 'Attivo');
    if (!roster || roster.length === 0) return res.json({ created: 0 });

    // Fetch template
    let documenti_consegnati = [];
    if (template_id) {
      const { data: tpl } = await supabase.from('registration_template')
        .select('documenti_richiesti').eq('id', template_id).single();
      if (tpl && tpl.documenti_richiesti) {
        documenti_consegnati = tpl.documenti_richiesti.map(d => ({
          nome: d.nome, consegnato: false, data_consegna: null
        }));
      }
    }

    const records = roster.map(r => ({
      player_id: r.player_id, team_id: req.params.teamId,
      season_id, template_id, documenti_consegnati, stato: 'non_iniziato'
    }));

    const { data, error } = await supabase.from('registration')
      .upsert(records, { onConflict: 'player_id,team_id,season_id', ignoreDuplicates: true })
      .select('id');
    if (error) return res.status(400).json({ error: error.message });
    res.json({ created: data ? data.length : 0 });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT aggiorna tesseramento
const { checklistAutoUpdate } = require('../helpers/checklistAutoUpdate');

router.put('/registrations/:id', authMiddleware, async (req, res) => {
  try {
    const { stato, dati_genitore, documenti_consegnati, data_tesseramento, note } = req.body;
    const update = { updated_at: new Date().toISOString() };
    if (stato !== undefined) update.stato = stato;
    if (dati_genitore !== undefined) update.dati_genitore = dati_genitore;
    if (documenti_consegnati !== undefined) update.documenti_consegnati = documenti_consegnati;
    if (data_tesseramento !== undefined) update.data_tesseramento = data_tesseramento;
    if (note !== undefined) update.note = note;

    const { data, error } = await supabase.from('registration')
      .update(update).eq('id', req.params.id).select().single();
    if (error) return res.status(400).json({ error: error.message });

    // Auto-aggiorna checklist item 'tesseramento'
    if (stato !== undefined) {
      checklistAutoUpdate(supabase, data.player_id, data.team_id, data.season_id, 'tesseramento', stato === 'tesserato');
    }

    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET singolo tesseramento (per print page)
router.get('/registrations/:id', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase.from('registration')
      .select('*, player:player_id(id, nome, cognome, data_nascita, codice_fiscale, luogo_nascita, residenza)')
      .eq('id', req.params.id).single();
    if (error) return res.status(404).json({ error: 'Non trovato' });
    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET tesseramento per player (guest-safe)
router.get('/registrations/player/:playerId', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase.from('registration')
      .select('*, player:player_id(id, nome, cognome, data_nascita, codice_fiscale, luogo_nascita, residenza, data_visita_medica)')
      .eq('player_id', req.params.playerId)
      .order('created_at', { ascending: false })
      .limit(1).single();
    if (error && error.code === 'PGRST116') return res.json(null);
    if (error) return res.status(400).json({ error: error.message });
    if (data) autoCheckCertificato(data);
    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT dati atleta da guest (solo campi anagrafici limitati)
router.put('/registrations/player/:playerId/anagrafica', authMiddleware, async (req, res) => {
  try {
    const { residenza, luogo_nascita, codice_fiscale, nome, cognome, data_nascita } = req.body;
    const update = {};
    if (residenza !== undefined) update.residenza = residenza;
    if (luogo_nascita !== undefined) update.luogo_nascita = luogo_nascita;
    if (codice_fiscale !== undefined) update.codice_fiscale = codice_fiscale ? codice_fiscale.toUpperCase() : null;
    if (nome !== undefined) update.nome = nome;
    if (cognome !== undefined) update.cognome = cognome;
    if (data_nascita !== undefined) update.data_nascita = data_nascita;
    if (Object.keys(update).length === 0) return res.json({ success: true });
    const { error } = await supabase.from('player').update(update).eq('id', req.params.playerId);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE singolo tesseramento
router.delete('/registrations/:id', authMiddleware, async (req, res) => {
  try {
    const { error } = await supabase.from('registration').delete().eq('id', req.params.id);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE batch per squadra (rigenera dopo cambio template)
router.delete('/squadre/:teamId/registrations-batch', authMiddleware, async (req, res) => {
  try {
    const { error, count } = await supabase.from('registration')
      .delete({ count: 'exact' }).eq('team_id', req.params.teamId);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true, deleted: count });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST sollecito documenti mancanti
router.post('/registrations/:id/sollecito', authMiddleware, async (req, res) => {
  try {
    const { data: reg, error } = await supabase.from('registration')
      .select('id, player_id, team_id, documenti_consegnati, player:player_id(nome, cognome)')
      .eq('id', req.params.id).single();
    if (error || !reg) return res.status(404).json({ error: 'Tesseramento non trovato' });

    const docs = reg.documenti_consegnati || [];
    const mancanti = docs.filter(d => !d.consegnato).map(d => d.nome);
    if (!mancanti.length) return res.status(400).json({ error: 'Tutti i documenti sono già consegnati' });

    const { data: team } = await supabase.from('team').select('season:season_id(workspace_id)').eq('id', reg.team_id).single();
    const workspace_id = team?.season?.workspace_id;

    const nomeAtleta = `${reg.player?.cognome || ''} ${reg.player?.nome || ''}`.trim();
    const elenco = mancanti.map(m => `• ${m}`).join('\n');

    const { error: insErr } = await supabase.from('notification').insert([
      { workspace_id, team_id: reg.team_id, tipo: 'avviso', titolo: '📋 Documenti mancanti',
        messaggio: `Per completare il tesseramento mancano:\n${elenco}`,
        destinatario_tipo: ['atleta', 'genitore'], destinatario_player_id: reg.player_id,
        created_by: req.user.id, letto: false }
    ]);
    if (insErr) return res.status(400).json({ error: insErr.message });
    res.json({ success: true, mancanti: mancanti.length, atleta: nomeAtleta });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
