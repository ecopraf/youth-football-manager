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

  // PUT /api/fee-configs/:id — aggiorna solo il template config
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

  // POST /api/fee-configs/:id/rigenera — rigenera installments da config aggiornata
  router.post('/api/fee-configs/:id/rigenera', authMiddleware, async (req, res) => {
    try {
      const { data: config } = await supabase.from('fee_config').select('*').eq('id', req.params.id).single();
      if (!config) return res.status(404).json({ error: 'Configurazione non trovata' });

      const { data: fees } = await supabase.from('fee').select('id, importo_pagato').eq('fee_config_id', req.params.id);
      if (!fees?.length) return res.json({ success: true, rigenerati: 0 });

      const newImporto = parseFloat(config.importo_totale);
      const newRate = config.rate;
      const feeIds = fees.map(f => f.id);

      // 2. Elimina tutte le installments in batch
      await supabase.from('fee_installment').delete().in('fee_id', feeIds);

      // 3. Aggiorna importo_totale su tutte le fee
      await supabase.from('fee').update({ importo_totale: newImporto, updated_at: new Date().toISOString() }).in('id', feeIds);

      // 3. Genera nuove installments per tutte le fee
      const allNewInsts = [];
      const feeStatusUpdates = [];
      for (const fee of fees) {
        const totalePagato = parseFloat(fee.importo_pagato) || 0;
        let residuoPagato = totalePagato;
        const insts = [];
        let primaRataNonCoperta = -1;
        for (let idx = 0; idx < newRate.length; idx++) {
          const importoRata = parseFloat(newRate[idx].importo);
          if (residuoPagato >= importoRata - 0.01) {
            residuoPagato = Math.round((residuoPagato - importoRata) * 100) / 100;
            insts.push({ fee_id: fee.id, numero_rata: idx + 1, importo: importoRata, scadenza_label: newRate[idx].scadenza_label || null, scadenza: newRate[idx].scadenza || null, stato: 'pagata', data_pagamento: new Date().toISOString().split('T')[0] });
          } else { primaRataNonCoperta = idx; break; }
        }
        const rateRimanenti = newRate.length - insts.length;
        if (rateRimanenti > 0) {
          const residuoDaSaldare = Math.round((newImporto - totalePagato) * 100) / 100;
          if (residuoDaSaldare > 0) {
            // Prima rata non coperta: ridotta del residuo pagato rimasto
            // Rate successive: importo originale da config
            for (let idx = primaRataNonCoperta; idx < newRate.length; idx++) {
              const isFirst = idx === primaRataNonCoperta;
              const importoConfig = parseFloat(newRate[idx].importo);
              const importoRata = isFirst ? Math.round((importoConfig - residuoPagato) * 100) / 100 : importoConfig;
              const note = isFirst && residuoPagato > 0.01 ? `Residuo \u20ac${residuoPagato.toFixed(2)} applicato dalla rata precedente` : null;
              insts.push({ fee_id: fee.id, numero_rata: idx + 1, importo: importoRata, scadenza_label: newRate[idx].scadenza_label || null, scadenza: newRate[idx].scadenza || null, stato: 'da_pagare', note });
            }
          } else {
            for (let idx = primaRataNonCoperta; idx < newRate.length; idx++) {
              insts.push({ fee_id: fee.id, numero_rata: idx + 1, importo: 0, scadenza_label: newRate[idx].scadenza_label || null, scadenza: newRate[idx].scadenza || null, stato: 'pagata', data_pagamento: new Date().toISOString().split('T')[0] });
            }
          }
        }
        allNewInsts.push(...insts);
        const tuttePagate = insts.every(i => i.stato === 'pagata');
        const almenaUna = insts.some(i => i.stato === 'pagata');
        feeStatusUpdates.push({ id: fee.id, stato: tuttePagate ? 'pagata' : almenaUna ? 'parziale' : 'da_pagare' });
      }

      // 5. Insert batch (chunk da 500)
      for (let i = 0; i < allNewInsts.length; i += 500) {
        await supabase.from('fee_installment').insert(allNewInsts.slice(i, i + 500));
      }

      // 6. Aggiorna stati fee in batch
      const byStato = {};
      feeStatusUpdates.forEach(f => { (byStato[f.stato] = byStato[f.stato] || []).push(f.id); });
      for (const [stato, ids] of Object.entries(byStato)) {
        await supabase.from('fee').update({ stato }).in('id', ids);
      }

      res.json({ success: true, rigenerati: fees.length });
    } catch (err) {
      console.error('fee-config rigenera error:', err);
      res.status(500).json({ error: 'Errore server' });
    }
  });

  // DELETE /api/fee-configs/:id — elimina config + tutte le fee collegate
  router.delete('/api/fee-configs/:id', authMiddleware, async (req, res) => {
    try {
      // Elimina tutte le fee (cascade elimina anche fee_installment)
      await supabase.from('fee').delete().eq('fee_config_id', req.params.id);
      // Elimina la config
      const { error } = await supabase.from('fee_config').delete().eq('id', req.params.id);
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
      let query = supabase.from('fee').select('*, fee_installment(*), fee_config:fee_config_id(nome)');
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

  // DELETE /api/fees-batch — elimina quote multiple
  router.delete('/api/fees-batch', authMiddleware, async (req, res) => {
    try {
      const { ids } = req.body;
      if (!ids?.length) return res.status(400).json({ error: 'ids richiesti' });
      const { error } = await supabase.from('fee').delete().in('id', ids);
      if (error) return res.status(400).json({ error: error.message });
      res.json({ success: true, deleted: ids.length });
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
      }).eq('id', req.params.id).select('*, fee:fee_id(player_id, team_id, season_id)').single();
      if (error) return handleDbError(error, res);

      // Aggiorna stato fee e importo_pagato in base alle rate
      const { data: allInst } = await supabase.from('fee_installment')
        .select('stato, importo').eq('fee_id', inst.fee_id);
      const tuttePagate = (allInst || []).every(i => i.stato === 'pagata');
      const almenaUnaPagata = (allInst || []).some(i => i.stato === 'pagata');
      const nuovoStato = tuttePagate ? 'pagata' : almenaUnaPagata ? 'parziale' : 'da_pagare';
      const importoPagato = (allInst || []).filter(i => i.stato === 'pagata').reduce((s, i) => s + parseFloat(i.importo), 0);
      await supabase.from('fee').update({ stato: nuovoStato, importo_pagato: importoPagato, updated_at: new Date().toISOString() }).eq('id', inst.fee_id);

      // Auto-aggiorna checklist item 'quota' se fee completamente pagata (dati già in inst.fee)
      if (tuttePagate && inst.fee) {
        const { checklistAutoUpdate } = require('../helpers/checklistAutoUpdate');
        checklistAutoUpdate(supabase, inst.fee.player_id, inst.fee.team_id, inst.fee.season_id, 'quota', true);
      }

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

      // Ricalcola stato fee e importo_pagato
      const { data: allInst } = await supabase.from('fee_installment')
        .select('stato, importo').eq('fee_id', inst.fee_id);
      const tuttePagate = (allInst || []).every(i => i.stato === 'pagata');
      const almenaUnaPagata = (allInst || []).some(i => i.stato === 'pagata');
      const nuovoStato = tuttePagate ? 'pagata' : almenaUnaPagata ? 'parziale' : 'da_pagare';
      const importoPagato = (allInst || []).filter(i => i.stato === 'pagata').reduce((s, i) => s + parseFloat(i.importo), 0);
      await supabase.from('fee').update({ stato: nuovoStato, importo_pagato: importoPagato, updated_at: new Date().toISOString() }).eq('id', inst.fee_id);

      res.json({ ...inst, fee_stato: nuovoStato });
    } catch (err) {
      res.status(500).json({ error: 'Errore server' });
    }
  });

  // ═══════════════════════════════════════════
  // NOTIFICA QUOTE — invio manuale a guest link famiglia
  // ═══════════════════════════════════════════
  router.post('/api/fees/notify', authMiddleware, async (req, res) => {
    try {
      const { notifications } = req.body; // [{player_id, messaggio, titolo}]
      if (!notifications || !notifications.length) return res.status(400).json({ error: 'Nessuna notifica da inviare' });

      const playerIds = [...new Set(notifications.map(n => n.player_id))];
      // Trova guest_token collegati ai player
      const { data: tokens } = await supabase.from('guest_token')
        .select('id, player_id, tipo')
        .in('player_id', playerIds);

      const tokenMap = {};
      (tokens || []).forEach(t => {
        if (!tokenMap[t.player_id]) tokenMap[t.player_id] = [];
        tokenMap[t.player_id].push(t);
      });

      const wsId = req.user.workspace_id;
      const teamId = req.body.team_id;
      const notifRows = [];
      const noLink = [];

      notifications.forEach(n => {
        const playerTokens = tokenMap[n.player_id];
        if (!playerTokens || !playerTokens.length) {
          noLink.push(n.player_id);
          return;
        }
        // Crea una notifica per il guest (destinatario_tipo genitore/atleta)
        notifRows.push({
          workspace_id: wsId,
          team_id: teamId,
          tipo: 'promemoria_quota',
          titolo: n.titolo,
          messaggio: n.messaggio,
          riferimento_id: n.fee_id || null,
          destinatario_tipo: ['genitore', 'atleta'],
          destinatario_profilo: ['segreteria', 'admin'],
          destinatario_player_id: n.player_id,
          created_by: req.user.id,
          letto: false
        });
      });

      let created = 0;
      if (notifRows.length) {
        const { error } = await supabase.from('notification').insert(notifRows);
        if (error) return res.status(400).json({ error: error.message });
        created = notifRows.length;
      }

      res.json({ created, noLink });
    } catch (err) {
      res.status(500).json({ error: 'Errore server' });
    }
  });

  return router;
};
