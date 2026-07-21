/**
 * Fees Routes — gestione quote economiche con configurazione per categoria
 */
const express = require('express');
const multer = require('multer');
const { handleDbError } = require('../helpers/dbErrors');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

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
          destinatario_tipo: ['famiglia'],
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

  // ═══════════════════════════════════════════
  // EPIC 21 — BONIFICO + UPLOAD RICEVUTA
  // ═══════════════════════════════════════════

  // 21.5 — PUT /api/fee-configs/:id/payment-info — salva causale_template
  router.put('/api/fee-configs/:id/payment-info', authMiddleware, async (req, res) => {
    try {
      const { causale_template } = req.body;
      const { data, error } = await supabase.from('fee_config')
        .update({ causale_template, updated_at: new Date().toISOString() })
        .eq('id', req.params.id)
        .select().single();
      if (error) return res.status(400).json({ error: error.message });
      res.json(data);
    } catch (err) { res.status(500).json({ error: 'Errore server' }); }
  });

  // 21.6 — POST /api/fee-installments/:id/upload-ricevuta
  router.post('/api/fee-installments/:id/upload-ricevuta', authMiddleware, upload.single('ricevuta'), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'File mancante' });

      const instId = req.params.id;
      const { data: inst, error: instErr } = await supabase.from('fee_installment')
        .select('*, fee:fee_id(player_id, team_id, season_id, fee_config_id)')
        .eq('id', instId).single();
      if (instErr || !inst) return res.status(404).json({ error: 'Rata non trovata' });

      // Verifica che il guest stia caricando per il proprio player
      if (req.user.isGuest && req.user.player_id !== inst.fee.player_id)
        return res.status(403).json({ error: 'Non autorizzato' });

      const ext = req.file.mimetype === 'application/pdf' ? 'pdf'
        : req.file.mimetype === 'image/png' ? 'png' : 'jpg';
      const path = `${inst.fee.season_id}/${inst.fee.player_id}/${instId}.${ext}`;

      const { error: upErr } = await supabase.storage.from('ricevute')
        .upload(path, req.file.buffer, { contentType: req.file.mimetype, upsert: true });
      if (upErr) return res.status(500).json({ error: 'Upload fallito: ' + upErr.message });

      await supabase.from('fee_installment').update({
        ricevuta_path: path,
        ricevuta_uploaded_at: new Date().toISOString()
      }).eq('id', instId);

      // Notifica segreteria
      const { data: player } = await supabase.from('player').select('nome, cognome').eq('id', inst.fee.player_id).single();
      const { data: feeConfig } = await supabase.from('fee_config').select('nome, workspace_id').eq('id', inst.fee.fee_config_id).single();
      const playerName = player ? `${player.cognome} ${player.nome}` : 'Giocatore';
      await supabase.from('notification').insert({
        workspace_id: feeConfig?.workspace_id,
        team_id: inst.fee.team_id,
        tipo: 'ricevuta_caricata',
        titolo: `📎 Ricevuta caricata`,
        messaggio: `${playerName} ha caricato la ricevuta per ${feeConfig?.nome || 'quota'} — Rata ${inst.numero_rata}`,
        riferimento_id: instId,
        destinatario_profilo: ['segreteria', 'admin'],
        destinatario_tipo: ['segreteria', 'admin'],
        created_by: req.user.isGuest ? null : (req.user.id || null),
        letto: false
      });

      res.json({ success: true, path });
    } catch (err) { res.status(500).json({ error: 'Errore server' }); }
  });

  // 21.7 — GET /api/fee-installments/:id/ricevuta — signed URL (1h)
  router.get('/api/fee-installments/:id/ricevuta', authMiddleware, async (req, res) => {
    try {
      const { data: inst } = await supabase.from('fee_installment')
        .select('ricevuta_path, fee:fee_id(player_id)').eq('id', req.params.id).single();
      if (!inst?.ricevuta_path) return res.status(404).json({ error: 'Nessuna ricevuta' });

      if (req.user.isGuest && req.user.player_id !== inst.fee.player_id)
        return res.status(403).json({ error: 'Non autorizzato' });

      const { data, error } = await supabase.storage.from('ricevute')
        .createSignedUrl(inst.ricevuta_path, 3600);
      if (error) return res.status(500).json({ error: error.message });
      res.json({ url: data.signedUrl });
    } catch (err) { res.status(500).json({ error: 'Errore server' }); }
  });

  // 21.8 — PUT /api/fee-installments/:id/conferma-pagamento
  router.put('/api/fee-installments/:id/conferma-pagamento', authMiddleware, async (req, res) => {
    try {
      const { azione } = req.body; // 'conferma' | 'rifiuta'
      if (!['conferma', 'rifiuta'].includes(azione)) return res.status(400).json({ error: 'azione non valida' });

      const { data: inst } = await supabase.from('fee_installment')
        .select('*, fee:fee_id(player_id, team_id, fee_config_id, season_id)')
        .eq('id', req.params.id).single();
      if (!inst) return res.status(404).json({ error: 'Rata non trovata' });
      const feeId = inst.fee_id; // stringa UUID — inst.fee è l'oggetto joinato

      if (azione === 'conferma') {
        // Segna come pagata e rileggi subito il risultato
        await supabase.from('fee_installment').update({
          stato: 'pagata',
          data_pagamento: new Date().toISOString().split('T')[0],
          metodo_pagamento: 'Bonifico',
          conferma_user_id: req.user.id
        }).eq('id', req.params.id).select();

        // Rileggi TUTTE le rate della fee dopo l'update
        const { data: allInst } = await supabase.from('fee_installment')
          .select('importo, stato').eq('fee_id', feeId);
        const pagato = (allInst || []).filter(i => i.stato === 'pagata').reduce((s, i) => s + parseFloat(i.importo || 0), 0);
        const totale = (allInst || []).reduce((s, i) => s + parseFloat(i.importo || 0), 0);
        await supabase.from('fee').update({
          importo_pagato: pagato,
          stato: pagato >= totale ? 'pagata' : pagato > 0 ? 'parziale' : 'da_pagare'
        }).eq('id', feeId).select();
      } else {
        // Rifiuta: reset ricevuta
        await supabase.from('fee_installment').update({
          ricevuta_path: null,
          ricevuta_uploaded_at: null
        }).eq('id', req.params.id);

        // Notifica genitore
        const { data: feeConfig } = await supabase.from('fee_config').select('nome, workspace_id').eq('id', inst.fee.fee_config_id).single();
        await supabase.from('notification').insert({
          workspace_id: feeConfig?.workspace_id,
          team_id: inst.fee.team_id,
          tipo: 'ricevuta_rifiutata',
          titolo: '❌ Ricevuta non valida',
          messaggio: `La ricevuta per ${feeConfig?.nome || 'quota'} Rata ${inst.numero_rata} non è stata accettata. Ricaricare un documento leggibile.`,
          riferimento_id: req.params.id,
          destinatario_tipo: ['famiglia'],
          destinatario_player_id: inst.fee.player_id,
          created_by: req.user.id,
          letto: false
        });
      }

      res.json({ success: true, azione });
    } catch (err) { res.status(500).json({ error: 'Errore server' }); }
  });

  // 21.9 — GET /api/fees/guest — rate giocatore con info bonifico (guest + admin)
  router.get('/api/fees/guest', authMiddleware, async (req, res) => {
    try {
      const playerId = req.user.isGuest ? req.user.player_id : req.query.player_id;
      const teamId = req.query.team_id;
      if (!playerId) return res.status(400).json({ error: 'player_id mancante' });

      const { data: fees, error } = await supabase.from('fee')
        .select('*, fee_config:fee_config_id(nome, causale_template, workspace_id), fee_installment(*), season:season_id(nome)')
        .eq('player_id', playerId)
        .eq('team_id', teamId)
        .order('created_at', { ascending: false });
      if (error) return res.status(400).json({ error: error.message });

      // Leggi IBAN, intestatario, stagione, categoria in parallelo
      let iban = null, intestatario = null, stagione = '', categoria = '', annoNascita = '';

      const wsId = fees?.[0]?.fee_config?.workspace_id;
      const feeTeamId = teamId || fees?.[0]?.team_id;

      const [anaRes, wsRes, playerRes, teamRes] = await Promise.all([
        wsId ? supabase.from('workspace_anagrafica').select('iban, nome_banca').eq('workspace_id', wsId).single() : Promise.resolve({}),
        wsId ? supabase.from('workspace').select('nome').eq('id', wsId).single() : Promise.resolve({}),
        supabase.from('player').select('nome, cognome, data_nascita').eq('id', playerId).single(),
        feeTeamId ? supabase.from('team').select('category:category_id(nome)').eq('id', feeTeamId).single() : Promise.resolve({})
      ]);

      iban = anaRes.data?.iban || null;
      const nomeBanca = anaRes.data?.nome_banca || null;
      intestatario = wsRes.data?.nome || null;

      const player = playerRes.data;
      const playerName = player ? `${player.cognome} ${player.nome}` : '';
      if (player?.data_nascita) annoNascita = new Date(player.data_nascita).getFullYear().toString();


      stagione = fees?.[0]?.season?.nome || '';
      categoria = teamRes.data?.category?.nome || '';

      // Variabili disponibili per il template causale
      const compilaCausale = (template, numeroRata) =>
        (template || `Iscrizione {stagione} {categoria} ({anno_nascita}) Rata {rata} - {nome}`)
          .replace('{stagione}', stagione)
          .replace('{categoria}', categoria)
          .replace('{anno_nascita}', annoNascita)
          .replace('{rata}', numeroRata || '')
          .replace('{nome}', playerName)
          .trim().replace(/\s+/g, ' '); // rimuove spazi doppi se variabile vuota

      const result = (fees || []).map(fee => ({
        ...fee,
        fee_installment: (fee.fee_installment || [])
          .sort((a, b) => (a.numero_rata || 0) - (b.numero_rata || 0))
          .map(inst => ({ ...inst, causale_compilata: compilaCausale(fee.fee_config?.causale_template, inst.numero_rata) })),
        iban,
        nome_banca: nomeBanca,
        intestatario
      }));

      res.json(result);
    } catch (err) { res.status(500).json({ error: 'Errore server' }); }
  });

  return router;
};
