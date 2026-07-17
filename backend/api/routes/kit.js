const express = require('express');
const router = express.Router();
const { authMiddleware, requirePermission } = require('../middleware/auth.middleware');
const { Pool } = require('pg');
const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres.csxdlxbhcnyfppojwwzy:Yfm2026Secure!@aws-0-eu-west-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

let supabase;
function init(sb) { supabase = sb; }

module.exports = { router, init };

// ═══════════════════════════════════════════
// KIT TEMPLATES
// ═══════════════════════════════════════════

router.get('/api/kit-templates', authMiddleware, async (req, res) => {
  try {
    const { workspace_id } = req.query;
    if (!workspace_id) return res.status(400).json({ error: 'workspace_id richiesto' });
    const { data, error } = await supabase.from('kit_template').select('*')
      .eq('workspace_id', workspace_id).order('created_at', { ascending: true });
    if (error) return res.status(400).json({ error: error.message });
    res.json(data || []);
  } catch (err) { res.status(500).json({ error: 'Errore server' }); }
});

router.post('/api/kit-templates', authMiddleware, requirePermission('kit', 'write'), async (req, res) => {
  try {
    const { workspace_id, nome, settore, articoli, numerazione, numerazione_start, taglie, tipo } = req.body;
    if (!workspace_id || !nome || !articoli?.length) return res.status(400).json({ error: 'Campi obbligatori: workspace_id, nome, articoli' });
    const { data, error } = await supabase.from('kit_template').insert({
      workspace_id, nome, settore: settore || 'settore_giovanile',
      articoli, numerazione: numerazione || 'nessuna',
      numerazione_start: numerazione_start || 13, taglie: taglie || null,
      tipo: tipo || 'squadra'
    }).select().single();
    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json(data);
  } catch (err) { res.status(500).json({ error: 'Errore server' }); }
});

router.put('/api/kit-templates/:id', authMiddleware, requirePermission('kit', 'write'), async (req, res) => {
  try {
    const { nome, settore, articoli, numerazione, numerazione_start, taglie, attivo, tipo } = req.body;
    const update = {};
    if (nome !== undefined) update.nome = nome;
    if (settore !== undefined) update.settore = settore;
    if (articoli !== undefined) update.articoli = articoli;
    if (numerazione !== undefined) update.numerazione = numerazione;
    if (numerazione_start !== undefined) update.numerazione_start = numerazione_start;
    if (taglie !== undefined) update.taglie = taglie;
    if (attivo !== undefined) update.attivo = attivo;
    if (tipo !== undefined) update.tipo = tipo;
    const { data, error } = await supabase.from('kit_template').update(update).eq('id', req.params.id).select().single();
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (err) { res.status(500).json({ error: 'Errore server' }); }
});

router.delete('/api/kit-templates/:id', authMiddleware, requirePermission('kit', 'write'), async (req, res) => {
  try {
    const { error } = await supabase.from('kit_template').delete().eq('id', req.params.id);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Errore server' }); }
});

// ═══════════════════════════════════════════
// KIT BUNDLES
// ═══════════════════════════════════════════

// GET /api/kit-bundles?template_id=X — lista bundle con contatori aggregati (no limite 1000)
router.get('/api/kit-bundles', authMiddleware, async (req, res) => {
  try {
    const { template_id, workspace_id } = req.query;
    if (!template_id && !workspace_id) return res.status(400).json({ error: 'template_id o workspace_id richiesto' });

    const conditions = [];
    const params = [];
    if (template_id) { params.push(template_id); conditions.push(`kb.template_id = $${params.length}`); }
    if (workspace_id) { params.push(workspace_id); conditions.push(`kb.workspace_id = $${params.length}`); }
    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const { rows } = await pgPool.query(`
      SELECT
        kb.id, kb.template_id, kb.workspace_id, kb.taglia, kb.numero_kit, kb.stato,
        CASE WHEN kb.pezzi_in_attesa IS NULL THEN '[]'::jsonb ELSE kb.pezzi_in_attesa END as pezzi_in_attesa,
        (SELECT ks2.numero FROM kit_stock ks2
         JOIN kit_template kt ON kt.id = kb.template_id
         WHERE ks2.bundle_id = kb.id AND ks2.numero IS NOT NULL
           AND EXISTS (SELECT 1 FROM jsonb_array_elements(kt.articoli) art WHERE (art->>'nome') = ks2.articolo AND (art->>'ha_numero')::boolean = true)
         LIMIT 1) AS numero_maglia,
        COALESCE(COUNT(ks.id) FILTER (WHERE ks.stato = 'disponibile'), 0)::int  AS pezzi_disponibili,
        COALESCE(COUNT(ks.id) FILTER (WHERE ks.stato = 'assegnato'),   0)::int  AS pezzi_assegnati,
        COALESCE(COUNT(ks.id) FILTER (WHERE ks.stato IN ('perso','danneggiato')), 0)::int AS pezzi_mancanti,
        COALESCE(COUNT(ks.id), 0)::int AS tot_pezzi
      FROM kit_bundle kb
      LEFT JOIN kit_stock ks ON ks.bundle_id = kb.id
      ${where}
      GROUP BY kb.id
      ORDER BY kb.taglia, kb.numero_kit
    `, params);

    // pg restituisce JSONB come stringa — deserializza
    rows.forEach(r => {
      if (typeof r.pezzi_in_attesa === 'string') r.pezzi_in_attesa = JSON.parse(r.pezzi_in_attesa);
    });

    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Errore server' }); }
});

// DELETE /api/kit-bundles/:id — elimina bundle + pezzi stock (solo se nessun pezzo assegnato)
router.delete('/api/kit-bundles/:id', authMiddleware, requirePermission('kit', 'write'), async (req, res) => {
  try {
    const { data: pezzi } = await supabase.from('kit_stock').select('id, stato').eq('bundle_id', req.params.id);
    const assegnati = (pezzi || []).filter(p => p.stato === 'assegnato');
    if (assegnati.length) return res.status(400).json({ error: `Impossibile eliminare: ${assegnati.length} pezzi già assegnati. Rimuovi prima le assegnazioni.` });
    const stockIds = (pezzi || []).map(p => p.id);
    if (stockIds.length) await supabase.from('kit_stock').delete().in('id', stockIds);
    const { error } = await supabase.from('kit_bundle').delete().eq('id', req.params.id);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Errore server' }); }
});

// PUT /api/kit-bundles/segna-arrivati
// body: { template_id, taglia, articolo, quantita }
// Marca N bundle della taglia come ricevuti per quell'articolo
router.put('/api/kit-bundles/segna-arrivati', authMiddleware, requirePermission('kit', 'write'), async (req, res) => {
  try {
    const { template_id, taglia, articoli_quantita } = req.body;
    if (!template_id || !taglia || !articoli_quantita?.length) return res.status(400).json({ error: 'Campi obbligatori' });

    // Fetch bundle parziali con i loro assignment esistenti (per ricavare player_id, team_id, season_id)
    const { data: bundles } = await supabase.from('kit_bundle')
      .select('id, pezzi_in_attesa')
      .eq('template_id', template_id)
      .eq('taglia', taglia)
      .eq('stato', 'parziale');

    if (!bundles?.length) return res.json({ success: true, updated: 0 });

    // Recupera assignment esistenti per questi bundle (per sapere player_id/team_id/season_id)
    const bundleIds = bundles.map(b => b.id);
    const { data: existingStocks } = await supabase.from('kit_stock')
      .select('id, articolo, bundle_id').in('bundle_id', bundleIds).eq('stato', 'disponibile');
    // Usa bundle_id_originale direttamente — molto più semplice e affidabile
    const { data: existingAssigns } = await supabase.from('kit_assignment')
      .select('player_id, team_id, season_id, bundle_id_originale')
      .in('bundle_id_originale', bundleIds);
    const bundleAssignMap = {};
    (existingAssigns || []).forEach(a => {
      if (!bundleAssignMap[a.bundle_id_originale])
        bundleAssignMap[a.bundle_id_originale] = { player_id: a.player_id, team_id: a.team_id, season_id: a.season_id };
    });

    let totalUpdated = 0;
    const newAssignments = [];
    const stocksToAssign = [];

    for (const { articolo, quantita } of articoli_quantita) {
      if (!quantita || quantita <= 0) continue;
      const targets = bundles
        .filter(b => (b.pezzi_in_attesa || []).includes(articolo))
        .slice(0, quantita);

      for (const bundle of targets) {
        const nuoviInAttesa = (bundle.pezzi_in_attesa || []).filter(a => a !== articolo);
        const nuovoStato = nuoviInAttesa.length === 0 ? 'assegnato' : 'parziale';
        await supabase.from('kit_bundle')
          .update({ pezzi_in_attesa: nuoviInAttesa, stato: nuovoStato })
          .eq('id', bundle.id);
        bundle.pezzi_in_attesa = nuoviInAttesa;
        totalUpdated++;

        // Trova il kit_stock disponibile per questo articolo in questo bundle
        const stock = (existingStocks || []).find(s => s.bundle_id === bundle.id && s.articolo === articolo);
        const assignCtx = bundleAssignMap[bundle.id];
        if (stock && assignCtx) {
          stocksToAssign.push(stock.id);
          newAssignments.push({
            kit_stock_id: stock.id,
            player_id: assignCtx.player_id,
            team_id: assignCtx.team_id,
            season_id: assignCtx.season_id,
            bundle_id_originale: bundle.id
          });
        }
      }
    }

    // Batch: aggiorna stock + crea assignment
    if (stocksToAssign.length) {
      await supabase.from('kit_stock').update({ stato: 'assegnato' }).in('id', stocksToAssign);
      await supabase.from('kit_assignment').insert(newAssignments);
    }

    res.json({ success: true, updated: totalUpdated });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Errore server' }); }
});

// ═══════════════════════════════════════════
// KIT STOCK
// ═══════════════════════════════════════════

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

// Funzione condivisa: genera bundle+pezzi in batch (2 query per taglia invece di 2N)
async function _generateBundles(workspace_id, template_id, items, tmpl) {
  const numerazione = tmpl.numerazione || 'nessuna';
  const startNum = tmpl.numerazione_start || 13;
  const articoli = tmpl.articoli || [];

  // Numero progressivo bundle per taglia
  const { data: existingBundles } = await supabase.from('kit_bundle')
    .select('taglia, numero_kit').eq('template_id', template_id);
  const maxNumMap = {};
  (existingBundles || []).forEach(b => {
    maxNumMap[b.taglia] = Math.max(maxNumMap[b.taglia] || 0, b.numero_kit);
  });

  // Numero sequenziale pezzi
  let nextNumMap = {};
  if (numerazione === 'sequenziale') {
    const { data: existing } = await supabase.from('kit_stock')
      .select('articolo, taglia, numero').eq('template_id', template_id).not('numero', 'is', null);
    (existing || []).forEach(s => {
      const key = `${s.articolo}|${s.taglia}`;
      nextNumMap[key] = Math.max(nextNumMap[key] || startNum, (s.numero || 0) + 1);
    });
  }

  let totalBundles = 0;
  let totalPezzi = 0;

  for (const item of items) {
    const { taglia, quantita } = item;
    if (!quantita || quantita < 1) continue;
    const base = maxNumMap[taglia] || 0;

    // Batch insert tutti i bundle della taglia in una query
    const bundleRows = Array.from({ length: quantita }, (_, k) => ({
      template_id, workspace_id, taglia, numero_kit: base + k + 1, stato: 'integro'
    }));
    const { data: createdBundles, error: bErr } = await supabase.from('kit_bundle').insert(bundleRows).select('id, numero_kit');
    if (bErr) throw new Error(bErr.message);

    // Batch insert tutti i pezzi di tutti i bundle della taglia in una query
    const pezziRows = [];
    for (const bundle of createdBundles) {
      for (const art of articoli) {
        const qty = art.qty || 1;
        for (let q = 0; q < qty; q++) {
          const hasNumero = art.ha_numero && numerazione !== 'nessuna';
          let numero = null;
          if (hasNumero && numerazione === 'sequenziale') {
            const key = `${art.nome}|${taglia}`;
            numero = nextNumMap[key] || startNum;
            nextNumMap[key] = numero + 1;
          }
          pezziRows.push({ workspace_id, template_id, bundle_id: bundle.id, articolo: art.nome, taglia, numero, stato: 'disponibile' });
        }
      }
    }
    const { error: pErr } = await supabase.from('kit_stock').insert(pezziRows);
    if (pErr) throw new Error(pErr.message);

    totalBundles += createdBundles.length;
    totalPezzi += pezziRows.length;
    maxNumMap[taglia] = base + quantita;
  }
  return { totalBundles, totalPezzi };
}

// POST /api/kit-stock/generate
router.post('/api/kit-stock/generate', authMiddleware, requirePermission('kit', 'write'), async (req, res) => {
  try {
    const { workspace_id, template_id, items } = req.body;
    if (!workspace_id || !template_id || !items?.length) return res.status(400).json({ error: 'Campi obbligatori' });
    const { data: tmpl } = await supabase.from('kit_template')
      .select('numerazione, numerazione_start, articoli').eq('id', template_id).single();
    if (!tmpl) return res.status(404).json({ error: 'Template non trovato' });
    const { totalBundles, totalPezzi } = await _generateBundles(workspace_id, template_id, items, tmpl);
    res.status(201).json({ success: true, bundles: totalBundles, pezzi: totalPezzi });
  } catch (err) { res.status(500).json({ error: err.message || 'Errore server' }); }
});

// POST /api/kit-stock/restock
router.post('/api/kit-stock/restock', authMiddleware, requirePermission('kit', 'write'), async (req, res) => {
  try {
    const { workspace_id, template_id, items } = req.body;
    if (!workspace_id || !template_id || !items?.length) return res.status(400).json({ error: 'Campi obbligatori' });
    const { data: tmpl } = await supabase.from('kit_template').select('articoli').eq('id', template_id).single();
    if (!tmpl) return res.status(404).json({ error: 'Template non trovato' });
    const { totalBundles } = await _generateBundles(workspace_id, template_id, items, tmpl);
    res.status(201).json({ success: true, added: totalBundles });
  } catch (err) { res.status(500).json({ error: err.message || 'Errore server' }); }
});

// ═══════════════════════════════════════════
// KIT ASSIGNMENTS
// ═══════════════════════════════════════════

router.get('/api/kit-assignments', authMiddleware, async (req, res) => {
  try {
    const { team_id, season_id } = req.query;
    if (!team_id) return res.status(400).json({ error: 'team_id richiesto' });

    // Fetch assignments per team (giocatori) + staff del workspace cross-categoria
    // Per lo staff: mostra tutti gli assignment dove staff_id è presente nello staff del team
    const { data: teamData } = await supabase.from('team').select('workspace_id').eq('id', team_id).single();
    const workspaceId = teamData?.workspace_id;

    // Staff assegnato a questo team
    const { data: teamStaff } = await supabase.from('team_staff').select('staff_id').eq('team_id', team_id);
    const staffIds = (teamStaff || []).map(ts => ts.staff_id);

    let query = supabase.from('kit_assignment').select('*, kit_stock(*)').eq('team_id', team_id);
    if (season_id) query = query.eq('season_id', season_id);
    const { data: playerAssignments, error } = await query;
    if (error) return res.status(400).json({ error: error.message });

    // Assignment staff: cross-categoria (tutti gli assignment con staff_id in staffIds)
    let staffAssignments = [];
    if (staffIds.length) {
      const { data: sa } = await supabase.from('kit_assignment')
        .select('*, kit_stock(*)')
        .in('staff_id', staffIds);
      staffAssignments = sa || [];
    }

    // Fetch dati staff per arricchire la risposta
    let staffMap = {};
    if (staffIds.length) {
      const { data: staffRows } = await supabase.from('staff')
        .select('id, nome, cognome, ruolo, taglia').in('id', staffIds);
      (staffRows || []).forEach(s => { staffMap[s.id] = s; });
    }
    staffAssignments = staffAssignments.map(a => ({
      ...a,
      staff: staffMap[a.staff_id] || null
    }));

    res.json({ players: playerAssignments || [], staff: staffAssignments });
  } catch (err) { res.status(500).json({ error: 'Errore server' }); }
});

// POST /api/kit-assignments — assegna pezzo a giocatore
router.post('/api/kit-assignments', authMiddleware, requirePermission('kit', 'write'), async (req, res) => {
  try {
    const { kit_stock_id, player_id, team_id, season_id } = req.body;
    if (!kit_stock_id || !player_id || !team_id || !season_id) return res.status(400).json({ error: 'Campi obbligatori mancanti' });

    const { data: stock } = await supabase.from('kit_stock').select('stato, bundle_id').eq('id', kit_stock_id).single();
    if (!stock || stock.stato !== 'disponibile') return res.status(400).json({ error: 'Pezzo non disponibile' });

    const [{ data: assignment, error: aErr }, { error: sErr }] = await Promise.all([
      supabase.from('kit_assignment').insert({
        kit_stock_id, player_id, team_id, season_id,
        bundle_id_originale: stock.bundle_id
      }).select().single(),
      supabase.from('kit_stock').update({ stato: 'assegnato' }).eq('id', kit_stock_id)
    ]);
    if (aErr) return res.status(400).json({ error: aErr.message });
    if (sErr) return res.status(400).json({ error: sErr.message });
    res.status(201).json(assignment);
  } catch (err) { res.status(500).json({ error: 'Errore server' }); }
});

// POST /api/kit-assignments-batch
// Il frontend passa bundle_id già scelto — il backend verifica e assegna
// body: { template_id, team_id, season_id, assignments: [{player_id, bundle_id, pezzi_in_attesa?}] }
router.post('/api/kit-assignments-batch', authMiddleware, requirePermission('kit', 'write'), async (req, res) => {
  try {
    const { template_id, team_id, season_id, assignments, numero_maglia, is_staff } = req.body;
    if (!template_id || !team_id || !season_id || !assignments?.length) return res.status(400).json({ error: 'Campi obbligatori' });

    const { data: tmpl } = await supabase.from('kit_template').select('articoli').eq('id', template_id).single();
    if (!tmpl) return res.status(404).json({ error: 'Template non trovato' });
    const nArticoli = (tmpl.articoli || []).reduce((s, a) => s + (a.qty || 1), 0);

    const created = [];
    const skipped = [];

    for (const { player_id, staff_id, bundle_id, pezzi_in_attesa, taglia } of assignments) {
      const entityId = is_staff ? staff_id : player_id;
      if (!bundle_id) { skipped.push({ id: entityId, reason: 'bundle_id mancante' }); continue; }

      const inAttesa = pezzi_in_attesa || [];
      const { data: pezzi } = await supabase.from('kit_stock')
        .select('id, articolo').eq('bundle_id', bundle_id).eq('stato', 'disponibile');

      const pezziDaAssegnare = inAttesa.length
        ? (pezzi || []).filter(p => !inAttesa.includes(p.articolo))
        : (pezzi || []);

      if (!pezziDaAssegnare.length) {
        skipped.push({ id: entityId, reason: 'stock insufficiente' }); continue;
      }

      const assignmentBase = { team_id, season_id, bundle_id_originale: bundle_id };
      if (is_staff) assignmentBase.staff_id = staff_id;
      else assignmentBase.player_id = player_id;

      pezziDaAssegnare.forEach(p => created.push({ kit_stock_id: p.id, ...assignmentBase }));

      // Aggiorna taglia staff se fornita
      if (is_staff && staff_id && taglia) {
        await supabase.from('staff').update({ taglia }).eq('id', staff_id);
      }

      if (inAttesa.length) {
        await supabase.from('kit_bundle').update({ pezzi_in_attesa: inAttesa, stato: 'parziale' }).eq('id', bundle_id);
      }
    }

    if (created.length) {
      const { error: aErr } = await supabase.from('kit_assignment').insert(created);
      if (aErr) return res.status(400).json({ error: aErr.message });
      const stockIds = created.map(c => c.kit_stock_id);
      const assignedPlayerIds = [...new Set(created.map(c => c.player_id))];
      const assignedBundleIds = [...new Set(created.map(c => c.bundle_id_originale))];

      await supabase.from('kit_stock').update({ stato: 'assegnato' }).in('id', stockIds);
      if (numero_maglia) {
        await supabase.from('kit_stock').update({ numero: numero_maglia }).in('id', stockIds);
      }
      if (!is_staff) {
        // Aggiorna taglia su team_player per ogni giocatore assegnato
        const { data: bundleTaglie } = await supabase.from('kit_bundle').select('id, taglia').in('id', assignedBundleIds);
        const bundleTagliaMap = {};
        (bundleTaglie || []).forEach(b => { bundleTagliaMap[b.id] = b.taglia; });
        const { data: tpRows } = await supabase.from('team_player').select('id, player_id').eq('team_id', team_id).in('player_id', assignedPlayerIds);
        const tpMap = {};
        (tpRows || []).forEach(tp => { tpMap[tp.player_id] = tp.id; });
        await Promise.all(
          created
            .filter((c, i, arr) => arr.findIndex(x => x.player_id === c.player_id) === i)
            .map(c => {
              const taglia = bundleTagliaMap[c.bundle_id_originale];
              const tpId = tpMap[c.player_id];
              if (!taglia || !tpId) return Promise.resolve();
              return supabase.from('team_player').update({ taglia, da_ordinare_kit: false }).eq('id', tpId);
            })
        );
      }
      // Azzera da_ordinare_kit per staff assegnati
      if (is_staff) {
        const assignedStaffIds = [...new Set(created.map(c => c.staff_id).filter(Boolean))];
        if (assignedStaffIds.length) {
          await supabase.from('staff').update({ da_ordinare_kit: false }).in('id', assignedStaffIds);
        }
      }
      // Aggiorna stato bundle (solo quelli senza pezzi_in_attesa — gli altri già impostati a parziale)
      const bundleSenzaAttesa = assignments
        .filter(a => !a.pezzi_in_attesa?.length)
        .map(a => a.bundle_id)
        .filter(Boolean);
      await Promise.all(bundleSenzaAttesa.map(id => _updateBundleStato(id)));
    }

    res.json({ success: true, assigned: created.length / Math.max(nArticoli, 1), skipped });
  } catch (err) { res.status(500).json({ error: 'Errore server' }); }
});

// PUT /api/kit-da-ordinare — setta/rimuove flag da_ordinare_kit su team_player o staff
router.put('/api/kit-da-ordinare', authMiddleware, requirePermission('kit', 'write'), async (req, res) => {
  try {
    const { team_player_id, staff_id, da_ordinare, taglia } = req.body;
    if (!team_player_id && !staff_id) return res.status(400).json({ error: 'team_player_id o staff_id richiesto' });
    const update = { da_ordinare_kit: !!da_ordinare };
    if (taglia) update.taglia = taglia;
    if (staff_id) {
      const { error } = await supabase.from('staff').update(update).eq('id', staff_id);
      if (error) return res.status(400).json({ error: error.message });
    } else {
      const { error } = await supabase.from('team_player').update(update).eq('id', team_player_id);
      if (error) return res.status(400).json({ error: error.message });
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Errore server' }); }
});

// POST /api/kit-assignments/:id/sostituisci — sostituzione pezzo con saccheggio intelligente
// body: { articolo, motivo ('perso'|'danneggiato'), note, costo }
router.post('/api/kit-assignments/:id/sostituisci', authMiddleware, requirePermission('kit', 'write'), async (req, res) => {
  try {
    const { articolo, motivo, note, costo } = req.body;
    if (!articolo || !motivo) return res.status(400).json({ error: 'articolo e motivo richiesti' });

    // Fetch assignment con kit_stock
    const { data: assignment } = await supabase.from('kit_assignment')
      .select('*, kit_stock(template_id, taglia, bundle_id)').eq('id', req.params.id).single();
    if (!assignment) return res.status(404).json({ error: 'Assegnazione non trovata' });

    const templateId = assignment.kit_stock?.template_id;
    const taglia = assignment.kit_stock?.taglia;
    const stockOriginaleId = assignment.kit_stock_id;

    // 1. Marca il pezzo originale come perso/danneggiato
    await supabase.from('kit_stock').update({ stato: motivo }).eq('id', stockOriginaleId);

    // 2. Saccheggio intelligente: cerca prima nei bundle già saccheggiati, poi negli integri
    // Fetch bundle con pezzi disponibili per questo articolo+taglia
    const { data: bundles } = await supabase.from('kit_bundle')
      .select('id, stato, numero_kit').eq('template_id', templateId)
      .in('stato', ['saccheggiato', 'integro']).order('stato').order('numero_kit');
    // saccheggiato < integro alfabeticamente → saccheggiati vengono prima ✓

    const bundleIds = (bundles || []).map(b => b.id);
    let pezzoSostituto = null;
    let bundleSaccheggiato = null;

    if (bundleIds.length) {
      const { data: disponibili } = await supabase.from('kit_stock')
        .select('id, bundle_id').in('bundle_id', bundleIds)
        .eq('articolo', articolo).eq('taglia', taglia).eq('stato', 'disponibile')
        .limit(1);

      if (disponibili?.length) {
        pezzoSostituto = disponibili[0];
        bundleSaccheggiato = bundles.find(b => b.id === pezzoSostituto.bundle_id);
      }
    }

    if (!pezzoSostituto) {
      // Nessun pezzo disponibile — aggiorna comunque le sostituzioni con stato 'in_attesa'
      const sostituzioni = [...(assignment.sostituzioni || []), {
        articolo, motivo, note: note || null, costo: costo || null,
        data: new Date().toISOString().split('T')[0],
        kit_stock_id_originale: stockOriginaleId,
        kit_stock_id_sostituto: null,
        stato: 'in_attesa'
      }];
      await supabase.from('kit_assignment').update({ sostituzioni }).eq('id', req.params.id);
      // Nessun sostituto trovato — bundle originale diventa incompleto
      if (assignment.kit_stock?.bundle_id)
        await supabase.from('kit_bundle').update({ stato: 'incompleto' }).eq('id', assignment.kit_stock.bundle_id);
      return res.status(200).json({ success: true, sostituto: null, message: 'Nessun pezzo disponibile in magazzino — aggiunto in lista attesa' });
    }

    // 3. Assegna il pezzo sostituto
    await supabase.from('kit_stock').update({ stato: 'assegnato' }).eq('id', pezzoSostituto.id);

    // 4. Aggiorna sostituzioni sull'assignment
    const sostituzioni = [...(assignment.sostituzioni || []), {
      articolo, motivo, note: note || null, costo: costo || null,
      data: new Date().toISOString().split('T')[0],
      kit_stock_id_originale: stockOriginaleId,
      kit_stock_id_sostituto: pezzoSostituto.id,
      bundle_id_fonte: pezzoSostituto.bundle_id,
      stato: 'completata'
    }];
    await supabase.from('kit_assignment').update({ sostituzioni }).eq('id', req.params.id);

    // 5. Aggiorna stato bundle saccheggiato e bundle originale
    await _updateBundleStato(pezzoSostituto.bundle_id);
    if (assignment.kit_stock?.bundle_id) await _updateBundleStato(assignment.kit_stock.bundle_id);

    res.json({
      success: true,
      sostituto: pezzoSostituto,
      bundle_saccheggiato: bundleSaccheggiato ? `Kit ${taglia} #${bundleSaccheggiato.numero_kit}` : null
    });
  } catch (err) { res.status(500).json({ error: 'Errore server' }); }
});

// POST /api/kit-evadi-ordine
// Gestisce l'arrivo della merce per un ordine in attesa.
// Tipo 1 (kit completo): crea bundle+stock, assegna se richiesto, azzera da_ordinare_kit
// Tipo 2 (pezzi sfusi): rimuove articoli da pezzi_in_attesa del bundle, aggiorna stato
// body: { tipo_ordine: 'kit'|'pezzi', player_id?, staff_id?, template_id, taglia, assegna_subito?, articoli_arrivati?, bundle_id? }
router.post('/api/kit-evadi-ordine', authMiddleware, requirePermission('kit', 'write'), async (req, res) => {
  try {
    const { tipo_ordine, player_id, staff_id, template_id, taglia, assegna_subito, articoli_arrivati, bundle_id, team_id, season_id } = req.body;
    if (!tipo_ordine || !template_id || !taglia) return res.status(400).json({ error: 'tipo_ordine, template_id, taglia richiesti' });

    if (tipo_ordine === 'kit') {
      // Tipo 1: crea 1 bundle + pezzi per la taglia
      const { data: tmpl } = await supabase.from('kit_template').select('*').eq('id', template_id).single();
      if (!tmpl) return res.status(404).json({ error: 'Template non trovato' });

      const { data: wsRow } = await supabase.from('kit_template').select('workspace_id').eq('id', template_id).single();
      const workspace_id = wsRow?.workspace_id;

      // Articoli arrivati: se parziale usa articoli_arrivati, altrimenti tutti
      const tuttiArticoli = tmpl.articoli || [];
      const arrivati = articoli_arrivati?.length ? articoli_arrivati : tuttiArticoli.map(a => a.nome);
      const inAttesa = tuttiArticoli.map(a => a.nome).filter(n => !arrivati.includes(n));

      // Crea bundle
      const { data: bundle, error: bErr } = await supabase.from('kit_bundle').insert({
        template_id, workspace_id, taglia, numero_kit: 1, stato: inAttesa.length ? 'parziale' : 'integro',
        pezzi_in_attesa: inAttesa.length ? inAttesa : []
      }).select().single();
      if (bErr) return res.status(400).json({ error: bErr.message });

      // Crea pezzi stock per gli articoli arrivati
      const pezziRows = [];
      for (const art of tuttiArticoli) {
        if (!arrivati.includes(art.nome)) continue;
        const qty = art.qty || 1;
        for (let q = 0; q < qty; q++) {
          pezziRows.push({ workspace_id, template_id, bundle_id: bundle.id, articolo: art.nome, taglia, stato: 'disponibile' });
        }
      }
      if (pezziRows.length) {
        const { error: pErr } = await supabase.from('kit_stock').insert(pezziRows);
        if (pErr) return res.status(400).json({ error: pErr.message });
      }

      // Azzera da_ordinare_kit
      if (player_id) {
        const { data: tp } = await supabase.from('team_player').select('id').eq('player_id', player_id).eq('team_id', team_id).single();
        if (tp) await supabase.from('team_player').update({ da_ordinare_kit: false }).eq('id', tp.id);
      } else if (staff_id) {
        await supabase.from('staff').update({ da_ordinare_kit: false }).eq('id', staff_id);
      }

      // Assegna subito se richiesto
      if (assegna_subito && (player_id || staff_id) && team_id && season_id) {
        const { data: pezziCreati } = await supabase.from('kit_stock').select('id').eq('bundle_id', bundle.id).eq('stato', 'disponibile');
        if (pezziCreati?.length) {
          const assignBase = { team_id, season_id, bundle_id_originale: bundle.id };
          if (staff_id) assignBase.staff_id = staff_id;
          else assignBase.player_id = player_id;
          const assignRows = pezziCreati.map(p => ({ kit_stock_id: p.id, ...assignBase }));
          await supabase.from('kit_assignment').insert(assignRows);
          await supabase.from('kit_stock').update({ stato: 'assegnato' }).in('id', pezziCreati.map(p => p.id));
          await _updateBundleStato(bundle.id);
        }
      }

      return res.json({ success: true, bundle_id: bundle.id, pezzi: pezziRows.length, assegnato: !!assegna_subito });
    }

    if (tipo_ordine === 'pezzi') {
      // Tipo 2: rimuove articoli arrivati da pezzi_in_attesa del bundle
      if (!bundle_id || !articoli_arrivati?.length) return res.status(400).json({ error: 'bundle_id e articoli_arrivati richiesti per tipo pezzi' });

      const { data: bundle } = await supabase.from('kit_bundle').select('pezzi_in_attesa, template_id').eq('id', bundle_id).single();
      if (!bundle) return res.status(404).json({ error: 'Bundle non trovato' });

      const nuoviInAttesa = (bundle.pezzi_in_attesa || []).filter(a => !articoli_arrivati.includes(a));
      const nuovoStato = nuoviInAttesa.length === 0 ? 'assegnato' : 'parziale';

      // Crea stock per i pezzi arrivati
      const { data: wsRow } = await supabase.from('kit_template').select('workspace_id').eq('id', bundle.template_id).single();
      const workspace_id = wsRow?.workspace_id;
      const { data: tmpl } = await supabase.from('kit_template').select('articoli').eq('id', bundle.template_id).single();

      const pezziRows = [];
      for (const artNome of articoli_arrivati) {
        const artDef = (tmpl?.articoli || []).find(a => a.nome === artNome);
        const qty = artDef?.qty || 1;
        for (let q = 0; q < qty; q++) {
          pezziRows.push({ workspace_id, template_id: bundle.template_id, bundle_id, articolo: artNome, taglia, stato: 'disponibile' });
        }
      }
      if (pezziRows.length) {
        const { error: pErr } = await supabase.from('kit_stock').insert(pezziRows);
        if (pErr) return res.status(400).json({ error: pErr.message });
      }

      // Assegna subito i pezzi arrivati se il bundle ha già un assignment
      const { data: existingAssign } = await supabase.from('kit_assignment')
        .select('player_id, staff_id, team_id, season_id').eq('bundle_id_originale', bundle_id).limit(1).single();
      if (existingAssign && pezziRows.length) {
        const { data: nuoviStock } = await supabase.from('kit_stock').select('id').eq('bundle_id', bundle_id).eq('stato', 'disponibile');
        if (nuoviStock?.length) {
          const assignBase = { team_id: existingAssign.team_id, season_id: existingAssign.season_id, bundle_id_originale: bundle_id };
          if (existingAssign.staff_id) assignBase.staff_id = existingAssign.staff_id;
          else if (existingAssign.player_id) assignBase.player_id = existingAssign.player_id;
          await supabase.from('kit_assignment').insert(nuoviStock.map(s => ({ kit_stock_id: s.id, ...assignBase })));
          await supabase.from('kit_stock').update({ stato: 'assegnato' }).in('id', nuoviStock.map(s => s.id));
        }
      }

      await supabase.from('kit_bundle').update({ pezzi_in_attesa: nuoviInAttesa, stato: nuovoStato }).eq('id', bundle_id);

      return res.json({ success: true, pezzi_rimasti_in_attesa: nuoviInAttesa.length, stato_bundle: nuovoStato });
    }

    return res.status(400).json({ error: 'tipo_ordine non valido' });
  } catch (err) { res.status(500).json({ error: 'Errore server' }); }
});

// DELETE /api/kit-assignments/:id
router.delete('/api/kit-assignments/:id', authMiddleware, requirePermission('kit', 'write'), async (req, res) => {
  try {
    const { data: assignment } = await supabase.from('kit_assignment')
      .select('kit_stock_id, kit_stock(bundle_id)').eq('id', req.params.id).single();
    if (!assignment) return res.status(404).json({ error: 'Assegnazione non trovata' });
    await Promise.all([
      supabase.from('kit_assignment').delete().eq('id', req.params.id),
      supabase.from('kit_stock').update({ stato: 'disponibile' }).eq('id', assignment.kit_stock_id)
    ]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Errore server' }); }
});

// ═══════════════════════════════════════════
// HELPER PRIVATO: aggiorna stato bundle
// ═══════════════════════════════════════════
async function _updateBundleStato(bundleId) {
  const { data: bundle } = await supabase.from('kit_bundle').select('pezzi_in_attesa').eq('id', bundleId).single();
  const { data: pezzi } = await supabase.from('kit_stock').select('stato').eq('bundle_id', bundleId);
  if (!pezzi?.length) return;
  const persiDanneggiati = pezzi.filter(p => p.stato === 'perso' || p.stato === 'danneggiato').length;
  const assegnati = pezzi.filter(p => p.stato === 'assegnato').length;
  const inAttesa = (bundle?.pezzi_in_attesa || []).length;
  let stato;
  if (persiDanneggiati === pezzi.length) stato = 'da_riordinare';
  else if (persiDanneggiati > 0) stato = 'saccheggiato';
  else if (inAttesa > 0) stato = 'parziale';               // kit assegnato con pezzi mancanti dal fornitore
  else if (assegnati === pezzi.length) stato = 'assegnato'; // kit completo al giocatore
  else if (assegnati > 0) stato = 'saccheggiato';           // pezzi prelevati per sostituzione
  else stato = 'integro';
  await supabase.from('kit_bundle').update({ stato }).eq('id', bundleId);
}
