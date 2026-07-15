const express = require('express');
const router = express.Router();
const { authMiddleware, requirePermission } = require('../middleware/auth.middleware');

let supabase;
function init(sb) { supabase = sb; }

module.exports = { router, init };

// ═══════════════════════════════════════════
// KIT TEMPLATES
// ═══════════════════════════════════════════

// GET /api/kit-templates?workspace_id=X
router.get('/api/kit-templates', authMiddleware, async (req, res) => {
  try {
    const { workspace_id } = req.query;
    if (!workspace_id) return res.status(400).json({ error: 'workspace_id richiesto' });
    const { data, error } = await supabase.from('kit_template').select('*').eq('workspace_id', workspace_id).order('created_at', { ascending: false });
    if (error) return res.status(400).json({ error: error.message });
    res.json(data || []);
  } catch (err) { res.status(500).json({ error: 'Errore server' }); }
});

// POST /api/kit-templates
router.post('/api/kit-templates', authMiddleware, requirePermission('kit', 'write'), async (req, res) => {
  try {
    const { workspace_id, nome, settore, articoli, numerazione, numerazione_start, taglie } = req.body;
    if (!workspace_id || !nome || !articoli?.length) return res.status(400).json({ error: 'Campi obbligatori: workspace_id, nome, articoli' });
    const { data, error } = await supabase.from('kit_template').insert({
      workspace_id, nome, settore: settore || 'settore_giovanile',
      articoli, numerazione: numerazione || 'nessuna',
      numerazione_start: numerazione_start || 13, taglie: taglie || null
    }).select().single();
    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json(data);
  } catch (err) { res.status(500).json({ error: 'Errore server' }); }
});

// PUT /api/kit-templates/:id
router.put('/api/kit-templates/:id', authMiddleware, requirePermission('kit', 'write'), async (req, res) => {
  try {
    const { nome, settore, articoli, numerazione, numerazione_start, taglie, attivo } = req.body;
    const update = {};
    if (nome !== undefined) update.nome = nome;
    if (settore !== undefined) update.settore = settore;
    if (articoli !== undefined) update.articoli = articoli;
    if (numerazione !== undefined) update.numerazione = numerazione;
    if (numerazione_start !== undefined) update.numerazione_start = numerazione_start;
    if (taglie !== undefined) update.taglie = taglie;
    if (attivo !== undefined) update.attivo = attivo;
    const { data, error } = await supabase.from('kit_template').update(update).eq('id', req.params.id).select().single();
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (err) { res.status(500).json({ error: 'Errore server' }); }
});

// DELETE /api/kit-templates/:id
router.delete('/api/kit-templates/:id', authMiddleware, requirePermission('kit', 'write'), async (req, res) => {
  try {
    const { error } = await supabase.from('kit_template').delete().eq('id', req.params.id);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Errore server' }); }
});

// ═══════════════════════════════════════════
// KIT STOCK
// ═══════════════════════════════════════════

// GET /api/kit-stock?workspace_id=X&template_id=Y
router.get('/api/kit-stock', authMiddleware, async (req, res) => {
  try {
    const { workspace_id, template_id } = req.query;
    let query = supabase.from('kit_stock').select('*');
    if (workspace_id) query = query.eq('workspace_id', workspace_id);
    if (template_id) query = query.eq('template_id', template_id);
    query = query.order('articolo').order('taglia').order('numero');
    const { data, error } = await query;
    if (error) return res.status(400).json({ error: error.message });
    res.json(data || []);
  } catch (err) { res.status(500).json({ error: 'Errore server' }); }
});

// POST /api/kit-stock/generate — genera stock da template (taglia × quantità)
// body: { workspace_id, template_id, items: [{articolo, taglia, quantita}] }
router.post('/api/kit-stock/generate', authMiddleware, requirePermission('kit', 'write'), async (req, res) => {
  try {
    const { workspace_id, template_id, items } = req.body;
    if (!workspace_id || !template_id || !items?.length) return res.status(400).json({ error: 'Campi obbligatori: workspace_id, template_id, items' });

    // Fetch template per numerazione
    const { data: tmpl } = await supabase.from('kit_template').select('numerazione, numerazione_start, articoli').eq('id', template_id).single();
    const numerazione = tmpl?.numerazione || 'nessuna';
    const startNum = tmpl?.numerazione_start || 13;

    // Per numerazione sequenziale: trova il prossimo numero disponibile per articolo+taglia
    let nextNumMap = {};
    if (numerazione === 'sequenziale') {
      const { data: existing } = await supabase.from('kit_stock').select('articolo, taglia, numero').eq('template_id', template_id).not('numero', 'is', null);
      (existing || []).forEach(s => {
        const key = `${s.articolo}|${s.taglia}`;
        nextNumMap[key] = Math.max(nextNumMap[key] || startNum, (s.numero || 0) + 1);
      });
    }

    const rows = [];
    for (const item of items) {
      const { articolo, taglia, quantita } = item;
      const artDef = (tmpl?.articoli || []).find(a => a.nome === articolo);
      const hasNumero = artDef?.ha_numero && numerazione !== 'nessuna';

      for (let i = 0; i < (quantita || 1); i++) {
        let numero = null;
        if (hasNumero && numerazione === 'sequenziale') {
          const key = `${articolo}|${taglia}`;
          numero = nextNumMap[key] || startNum;
          nextNumMap[key] = numero + 1;
        }
        rows.push({ workspace_id, template_id, articolo, taglia: taglia || null, numero, stato: 'disponibile' });
      }
    }

    if (!rows.length) return res.status(400).json({ error: 'Nessun pezzo da generare' });
    const { data, error } = await supabase.from('kit_stock').insert(rows).select();
    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json({ success: true, generated: data.length });
  } catch (err) { res.status(500).json({ error: 'Errore server' }); }
});

// POST /api/kit-stock/restock — aggiungere stock (nuovo ordine parziale)
router.post('/api/kit-stock/restock', authMiddleware, requirePermission('kit', 'write'), async (req, res) => {
  try {
    const { workspace_id, template_id, items } = req.body;
    if (!workspace_id || !template_id || !items?.length) return res.status(400).json({ error: 'Campi obbligatori' });
    const rows = items.map(i => ({ workspace_id, template_id, articolo: i.articolo, taglia: i.taglia || null, numero: i.numero || null, stato: 'ordinato' }));
    const { data, error } = await supabase.from('kit_stock').insert(rows).select();
    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json({ success: true, added: data.length });
  } catch (err) { res.status(500).json({ error: 'Errore server' }); }
});

// ═══════════════════════════════════════════
// KIT ASSIGNMENTS
// ═══════════════════════════════════════════

// GET /api/kit-assignments?team_id=X&season_id=Y
router.get('/api/kit-assignments', authMiddleware, async (req, res) => {
  try {
    const { team_id, season_id } = req.query;
    if (!team_id) return res.status(400).json({ error: 'team_id richiesto' });
    let query = supabase.from('kit_assignment').select('*, kit_stock(*)').eq('team_id', team_id);
    if (season_id) query = query.eq('season_id', season_id);
    const { data, error } = await query;
    if (error) return res.status(400).json({ error: error.message });
    res.json(data || []);
  } catch (err) { res.status(500).json({ error: 'Errore server' }); }
});

// POST /api/kit-assignments — assegna pezzo a giocatore
// body: { kit_stock_id, player_id, team_id, season_id }
router.post('/api/kit-assignments', authMiddleware, requirePermission('kit', 'write'), async (req, res) => {
  try {
    const { kit_stock_id, player_id, team_id, season_id } = req.body;
    if (!kit_stock_id || !player_id || !team_id || !season_id) return res.status(400).json({ error: 'Campi obbligatori: kit_stock_id, player_id, team_id, season_id' });

    // Verifica stock disponibile
    const { data: stock } = await supabase.from('kit_stock').select('stato').eq('id', kit_stock_id).single();
    if (!stock || stock.stato !== 'disponibile') return res.status(400).json({ error: 'Pezzo non disponibile' });

    // Crea assegnazione + aggiorna stato stock
    const [{ data: assignment, error: aErr }, { error: sErr }] = await Promise.all([
      supabase.from('kit_assignment').insert({ kit_stock_id, player_id, team_id, season_id }).select().single(),
      supabase.from('kit_stock').update({ stato: 'assegnato' }).eq('id', kit_stock_id)
    ]);
    if (aErr) return res.status(400).json({ error: aErr.message });
    if (sErr) return res.status(400).json({ error: sErr.message });
    res.status(201).json(assignment);
  } catch (err) { res.status(500).json({ error: 'Errore server' }); }
});

// POST /api/kit-assignments-batch — auto-assegna kit a giocatori con taglia
router.post('/api/kit-assignments-batch', authMiddleware, requirePermission('kit', 'write'), async (req, res) => {
  try {
    const { template_id, team_id, season_id, assignments } = req.body;
    // assignments: [{player_id, taglia}]
    if (!template_id || !team_id || !season_id || !assignments?.length) return res.status(400).json({ error: 'Campi obbligatori' });

    // Fetch template articoli
    const { data: tmpl } = await supabase.from('kit_template').select('articoli').eq('id', template_id).single();
    if (!tmpl) return res.status(404).json({ error: 'Template non trovato' });
    const articoliNomi = (tmpl.articoli || []).map(a => a.nome);

    // Fetch stock disponibile per questo template
    const { data: stockAll } = await supabase.from('kit_stock').select('id, articolo, taglia')
      .eq('template_id', template_id).eq('stato', 'disponibile');

    // Già assegnati per questo team/season/template
    const { data: existingAssigns } = await supabase.from('kit_assignment').select('player_id, kit_stock(template_id)')
      .eq('team_id', team_id).eq('season_id', season_id);
    const alreadyAssigned = new Set((existingAssigns || []).filter(a => a.kit_stock?.template_id === template_id).map(a => a.player_id));

    // Group stock by taglia
    const stockByTaglia = {};
    (stockAll || []).forEach(s => {
      const key = s.taglia || '_null';
      if (!stockByTaglia[key]) stockByTaglia[key] = [];
      stockByTaglia[key].push(s);
    });

    const created = [];
    const skipped = [];

    for (const { player_id, taglia } of assignments) {
      if (alreadyAssigned.has(player_id)) { skipped.push({ player_id, reason: 'già assegnato' }); continue; }
      const available = stockByTaglia[taglia || '_null'] || [];
      // Need one piece per articolo
      const toAssign = [];
      for (const art of articoliNomi) {
        const idx = available.findIndex(s => s.articolo === art && !toAssign.some(a => a.id === s.id));
        if (idx >= 0) toAssign.push(available[idx]);
      }
      if (toAssign.length < articoliNomi.length) { skipped.push({ player_id, reason: 'stock insufficiente' }); continue; }
      // Remove used from available pool
      toAssign.forEach(s => { const i = available.indexOf(s); if (i >= 0) available.splice(i, 1); });
      created.push(...toAssign.map(s => ({ kit_stock_id: s.id, player_id, team_id, season_id })));
      alreadyAssigned.add(player_id);
    }

    if (created.length) {
      const { error: aErr } = await supabase.from('kit_assignment').insert(created);
      if (aErr) return res.status(400).json({ error: aErr.message });
      const stockIds = created.map(c => c.kit_stock_id);
      await supabase.from('kit_stock').update({ stato: 'assegnato' }).in('id', stockIds);
    }

    res.json({ success: true, assigned: created.length / Math.max(articoliNomi.length, 1), skipped });
  } catch (err) { res.status(500).json({ error: 'Errore server' }); }
});

// DELETE /api/kit-assignments/:id — rimuovi assegnazione (stock torna disponibile)
router.delete('/api/kit-assignments/:id', authMiddleware, requirePermission('kit', 'write'), async (req, res) => {
  try {
    const { data: assignment } = await supabase.from('kit_assignment').select('kit_stock_id').eq('id', req.params.id).single();
    if (!assignment) return res.status(404).json({ error: 'Assegnazione non trovata' });
    await Promise.all([
      supabase.from('kit_assignment').delete().eq('id', req.params.id),
      supabase.from('kit_stock').update({ stato: 'disponibile' }).eq('id', assignment.kit_stock_id)
    ]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Errore server' }); }
});
