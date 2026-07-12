/**
 * Fees Routes — gestione quote economiche con configurazione per categoria
 */
const express = require('express');
const { handleDbError } = require('../helpers/dbErrors');

module.exports = function createFeesRouter({ supabase, authMiddleware }) {
  const router = express.Router();

  // ═══════════════════════════════════════════
  // FEE CONFIG — configurazione quote per workspace/categoria
  // ═══════════════════════════════════════════

  // GET /api/fee-configs?workspace_id=X
  router.get('/api/fee-configs', authMiddleware, async (req, res) => {
    try {
      const { workspace_id } = req.query;
      if (!workspace_id) return res.status(400).json({ error: 'workspace_id richiesto' });
      const { data, error } = await supabase.from('fee_config')
        .select('*')
        .eq('workspace_id', workspace_id)
        .eq('attiva', true)
        .order('created_at', { ascending: false });
      if (error) return res.status(400).json({ error: error.message });
      res.json(data || []);
    } catch (err) {
      res.status(500).json({ error: 'Errore server' });
    }
  });

  // POST /api/fee-configs — crea configurazione quota
  // body: { workspace_id, category_id?, nome, importo_totale, rate: [{importo, scadenza_label}] }
  router.post('/api/fee-configs', authMiddleware, async (req, res) => {
    try {
      const { workspace_id, category_id, nome, importo_totale, rate } = req.body;
      if (!workspace_id || !nome || !importo_totale || !rate?.length) {
        return res.status(400).json({ error: 'Campi obbligatori: workspace_id, nome, importo_totale, rate' });
      }
      const { data, error } = await supabase.from('fee_config').insert({
        workspace_id,
        category_id: category_id || null,
        nome,
        importo_totale: parseFloat(importo_totale),
        rate
      }).select().single();
      if (error) return handleDbError(error, res);
      res.status(201).json(data);
    } catch (err) {
      res.status(500).json({ error: 'Errore server' });
    }
  });

  // PUT /api/fee-configs/:id
  router.put('/api/fee-configs/:id', authMiddleware, async (req, res) => {
    try {
      const { nome, importo_totale, rate, category_id, attiva } = req.body;
      const updates = { updated_at: new Date().toISOString() };
      if (nome !== undefined) updates.nome = nome;
      if (importo_totale !== undefined) updates.importo_totale = parseFloat(importo_totale);
      if (rate !== undefined) updates.rate = rate;
      if (category_id !== undefined) updates.category_id = category_id || null;
      if (attiva !== undefined) updates.attiva = attiva;
      const { data, error } = await supabase.from('fee_config').update(updates).eq('id', req.params.id).select().single();
      if (error) return handleDbError(error, res);
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: 'Errore server' });
    }
  });

  // DELETE /api/fee-configs/:id — disattiva (soft delete)
  router.delete('/api/fee-configs/:id', authMiddleware, async (req, res) => {
    try {
      const { error } = await supabase.from('fee_config').update({ attiva: false }).eq('id', req.params.id);
      if (error) return res.status(400).json({ error: error.message });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Errore server' });
    }
  });

  // ═══════════════════════════════════════════
  // FEE — quote assegnate ai giocatori
  // ═══════════════════════════════════════════

  // GET /api/fees?team_id=X&season_id=Y&player_id=Z
  router.get('/api/fees', authMiddleware, async (req, res) => {
    try {
      const { team_id, season_id, player_id } = req.query;
      let query = supabase.from('fee').select('*, fee_installment(*)');
      if (team_id) query = query.eq('team_id', team_id);
      if (season_id) query = query.eq('season_id', season_id);
      if (player_id) query = query.eq('player_id', player_id);
      query = query.order('created_at', { ascending: false });
      const { data, error } = await query;
      if (error) return res.status(400).json({ error: error.message });
      res.json(data || []);
    } catch (err) {
      res.status(500).json({ error: 'Errore server' });
    }
  });

  // POST /api/fees-generate — genera quote per squadra da fee_config
  // body: { fee_config_id, team_id, season_id, player_ids, scadenze: [{data}] }
  router.post('/api/fees-generate', authMiddleware, async (req, res) => {
    try {
      const { fee_config_id, team_id, season_id, player_ids, scadenze } = req.body;
      if (!fee_config_id || !team_id || !season_id || !player_ids?.length) {
        return res.status(400).json({ error: 'Campi obbligatori: fee_config_id, team_id, season_id, player_ids' });
      }

      // Fetch config
      const { data: config, error: cfgErr } = await supabase.from('fee_config')
        .select('*').eq('id', fee_config_id).single();
      if (cfgErr || !config) return res.status(404).json({ error: 'Configurazione non trovata' });

      // Crea fee + installments per ogni giocatore
      const feeRows = player_ids.map(pid => ({
        fee_config_id,
        player_id: pid,
        team_id,
        season_id,
        importo_totale: config.importo_totale,
        stato: 'da_pagare'
      }));

      const { data: fees, error: feeErr } = await supabase.from('fee').insert(feeRows).select();
      if (feeErr) return handleDbError(feeErr, res);

      // Genera installments
      const installments = [];
      fees.forEach(fee => {
        config.rate.forEach((rata, idx) => {
          installments.push({
            fee_id: fee.id,
            numero_rata: idx + 1,
            importo: parseFloat(rata.importo),
            scadenza_label: rata.scadenza_label || null,
            scadenza: scadenze?.[idx]?.data || rata.scadenza || null,
            stato: 'da_pagare'
          });
        });
      });

      if (installments.length > 0) {
        const { error: instErr } = await supabase.from('fee_installment').insert(installments);
        if (instErr) return handleDbError(instErr, res);
      }

      res.status(201).json({ success: true, created: fees.length, installments: installments.length });
    } catch (err) {
      res.status(500).json({ error: 'Errore server' });
    }
  });

  // DELETE /api/fees/:id — elimina quota e relative rate
  router.delete('/api/fees/:id', authMiddleware, async (req, res) => {
    try {
      const { error } = await supabase.from('fee').delete().eq('id', req.params.id);
      if (error) return res.status(400).json({ error: error.message });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Errore server' });
    }
  });

  // ═══════════════════════════════════════════
  // FEE INSTALLMENT — pagamento singola rata
  // ═══════════════════════════════════════════

  // PUT /api/fee-installments/:id/pay — segna rata come pagata
  router.put('/api/fee-installments/:id/pay', authMiddleware, async (req, res) => {
    try {
      const { data_pagamento, metodo_pagamento, ricevuta_numero, note } = req.body;
      const { data: inst, error } = await supabase.from('fee_installment').update({
        stato: 'pagata',
        data_pagamento: data_pagamento || new Date().toISOString().split('T')[0],
        metodo_pagamento: metodo_pagamento || null,
        ricevuta_numero: ricevuta_numero || null,
        note: note || null
      }).eq('id', req.params.id).select().single();
      if (error) return handleDbError(error, res);

      // Aggiorna stato fee in base alle rate
      const { data: allInst } = await supabase.from('fee_installment')
        .select('stato').eq('fee_id', inst.fee_id);
      const tuttePagate = (allInst || []).every(i => i.stato === 'pagata');
      const almenaUnaPagata = (allInst || []).some(i => i.stato === 'pagata');
      const nuovoStato = tuttePagate ? 'pagata' : almenaUnaPagata ? 'parziale' : 'da_pagare';
      await supabase.from('fee').update({ stato: nuovoStato, updated_at: new Date().toISOString() }).eq('id', inst.fee_id);

      res.json({ ...inst, fee_stato: nuovoStato });
    } catch (err) {
      res.status(500).json({ error: 'Errore server' });
    }
  });

  // PUT /api/fee-installments/:id/unpay — annulla pagamento rata
  router.put('/api/fee-installments/:id/unpay', authMiddleware, async (req, res) => {
    try {
      const { data: inst, error } = await supabase.from('fee_installment').update({
        stato: 'da_pagare',
        data_pagamento: null,
        metodo_pagamento: null,
        ricevuta_numero: null
      }).eq('id', req.params.id).select().single();
      if (error) return handleDbError(error, res);

      // Ricalcola stato fee
      const { data: allInst } = await supabase.from('fee_installment')
        .select('stato').eq('fee_id', inst.fee_id);
      const tuttePagate = (allInst || []).every(i => i.stato === 'pagata');
      const almenaUnaPagata = (allInst || []).some(i => i.stato === 'pagata');
      const nuovoStato = tuttePagate ? 'pagata' : almenaUnaPagata ? 'parziale' : 'da_pagare';
      await supabase.from('fee').update({ stato: nuovoStato, updated_at: new Date().toISOString() }).eq('id', inst.fee_id);

      res.json({ ...inst, fee_stato: nuovoStato });
    } catch (err) {
      res.status(500).json({ error: 'Errore server' });
    }
  });

  // ═══════════════════════════════════════════
  // CHECK SCADENZE — genera notifiche per rate in scadenza (7gg)
  // Chiamato al login segreteria/admin e apertura pagina Quote
  // ═══════════════════════════════════════════
  router.post('/api/fees/check-scadenze', authMiddleware, async (req, res) => {
    try {
      const { workspace_id, team_id } = req.body;
      if (!workspace_id || !team_id) return res.status(400).json({ error: 'workspace_id e team_id richiesti' });

      const oggi = new Date();
      const tra7gg = new Date(oggi);
      tra7gg.setDate(tra7gg.getDate() + 7);
      const oggiStr = oggi.toISOString().split('T')[0];
      const tra7ggStr = tra7gg.toISOString().split('T')[0];

      // Rate non pagate con scadenza entro 7 giorni
      const { data: rateInScadenza } = await supabase.from('fee_installment')
        .select('id, fee_id, importo, scadenza, scadenza_label, fee:fee_id(player_id, team_id)')
        .eq('stato', 'da_pagare')
        .gte('scadenza', oggiStr)
        .lte('scadenza', tra7ggStr);

      if (!rateInScadenza?.length) return res.json({ created: 0 });

      // Filtra per team_id
      const rateTeam = rateInScadenza.filter(r => r.fee?.team_id === team_id);
      if (!rateTeam.length) return res.json({ created: 0 });

      // Controlla notifiche già create oggi per evitare duplicati
      const { data: existing } = await supabase.from('notification')
        .select('riferimento_id')
        .eq('workspace_id', workspace_id)
        .eq('tipo', 'scadenza_quota')
        .gte('created_at', oggiStr + 'T00:00:00');
      const existingIds = new Set((existing || []).map(n => n.riferimento_id));

      // Crea notifiche per rate non ancora notificate
      const notifiche = rateTeam
        .filter(r => !existingIds.has(r.id))
        .map(r => ({
          workspace_id,
          team_id,
          tipo: 'scadenza_quota',
          titolo: `Rata in scadenza: ${r.scadenza_label || 'Rata'} - €${parseFloat(r.importo).toFixed(2)}`,
          messaggio: `Scadenza: ${new Date(r.scadenza).toLocaleDateString('it-IT')}`,
          riferimento_id: r.id,
          destinatario_tipo: ['genitore'],
          destinatario_profilo: ['segreteria', 'admin'],
          priorita: 'importante',
          letto: false
        }));

      if (!notifiche.length) return res.json({ created: 0 });
      const { error } = await supabase.from('notification').insert(notifiche);
      if (error) return res.status(400).json({ error: error.message });
      res.json({ created: notifiche.length });
    } catch (err) {
      res.status(500).json({ error: 'Errore server' });
    }
  });

  return router;
};
