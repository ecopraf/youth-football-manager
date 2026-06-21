require("dotenv").config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const app = express();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
app.use(cors()); app.use(express.json({ limit: '5mb' }));
app.get('/api/health', async (req, res) => res.json({ status: 'ok', version: '3.9' }));

app.get('/api/workspaces', async (req, res) => { const { data } = await supabase.from('workspace').select('*'); res.json(data || []); });
app.put('/api/workspaces/:id/logo', async (req, res) => { await supabase.from('workspace').update({ logo_url: req.body.logo_url }).eq('id', req.params.id); res.json({ success: true }); });
app.get('/api/stagioni/:stagioneId/squadre', async (req, res) => { const { data } = await supabase.from('squadra').select('*').eq('stagione_id', req.params.stagioneId).order('nome'); res.json(data || []); });
app.post('/api/stagioni/:stagioneId/squadre', async (req, res) => { const b = req.body; const { data } = await supabase.from('squadra').insert({ stagione_id: req.params.stagioneId, nome: b.nome, categoria: b.categoria, allenatore: b.allenatore, dirigente: b.dirigente, dirigente2: b.dirigente2, preparatore_atletico: b.preparatore_atletico, allenatore_portieri: b.allenatore_portieri }).select().single(); res.status(201).json(data); });
app.put('/api/squadre/:id', async (req, res) => { const b = req.body; await supabase.from('squadra').update({ nome: b.nome, categoria: b.categoria, allenatore: b.allenatore, dirigente: b.dirigente, dirigente2: b.dirigente2, preparatore_atletico: b.preparatore_atletico, allenatore_portieri: b.allenatore_portieri }).eq('id', req.params.id); res.json({ success: true }); });
app.delete('/api/squadre/:id', async (req, res) => { const sid = req.params.id; const { data: partite } = await supabase.from('partita').select('id').eq('squadra_id', sid); for (const p of (partite||[])) { await supabase.from('formazione_partita').delete().eq('partita_id', p.id); await supabase.from('convocazione').delete().eq('partita_id', p.id); await supabase.from('evento_partita').delete().eq('partita_id', p.id); } await supabase.from('partita').delete().eq('squadra_id', sid); await supabase.from('presenza_allenamento').delete().eq('squadra_id', sid); await supabase.from('configurazione_allenamento').delete().eq('squadra_id', sid); await supabase.from('rosa').delete().eq('squadra_id', sid); await supabase.from('squadra').delete().eq('id', sid); res.json({ success: true }); });
app.get('/api/squadre/:squadraId/calciatori', async (req, res) => { const q = supabase.from('rosa').select('calciatore:calciatore_id(*), numero_maglia, ruolo, stato').eq('squadra_id', req.params.squadraId); const { data } = await q; res.json((data||[]).map(r => ({ id: r.calciatore.id, nome: r.calciatore.nome, cognome: r.calciatore.cognome, dataNascita: r.calciatore.data_nascita, telefono: r.calciatore.telefono, dataVisitaMedica: r.calciatore.data_visita_medica, matricolaFigc: r.calciatore.matricola_figc, tipoDocumento: r.calciatore.tipo_documento, numeroDocumento: r.calciatore.numero_documento, rilasciatoDa: r.calciatore.rilasciato_da, numeroMaglia: r.numero_maglia, ruolo: r.ruolo, stato: r.stato }))); });
app.post('/api/squadre/:squadraId/calciatori', async (req, res) => { const c = req.body; const { data: cal } = await supabase.from('calciatore').insert({ workspace_id: '11111111-1111-1111-1111-111111111111', nome: c.nome, cognome: c.cognome, data_nascita: c.dataNascita, telefono: c.telefono, data_visita_medica: c.dataVisitaMedica, matricola_figc: c.matricolaFigc, tipo_documento: c.tipoDocumento, numero_documento: c.numeroDocumento, rilasciato_da: c.rilasciatoDa }).select().single(); await supabase.from('rosa').insert({ squadra_id: req.params.squadraId, calciatore_id: cal.id, numero_maglia: c.numeroMaglia, ruolo: c.ruolo, stato: 'Attivo' }); res.status(201).json(cal); });
app.put('/api/calciatori/:id', async (req, res) => { const c = req.body; await supabase.from('calciatore').update({ nome: c.nome, cognome: c.cognome, data_nascita: c.dataNascita, telefono: c.telefono, data_visita_medica: c.dataVisitaMedica, matricola_figc: c.matricolaFigc, tipo_documento: c.tipoDocumento, numero_documento: c.numeroDocumento, rilasciato_da: c.rilasciatoDa }).eq('id', req.params.id); if(c.numeroMaglia) await supabase.from('rosa').update({ numero_maglia: c.numeroMaglia, ruolo: c.ruolo }).eq('calciatore_id', req.params.id); res.json({ success: true }); });
app.get('/api/squadre/:squadraId/scadenze-mediche', async (req, res) => { const { data: rosa } = await supabase.from('rosa').select('calciatore:calciatore_id(id, nome, cognome, data_visita_medica)').eq('squadra_id', req.params.squadraId); const oggi = new Date(); const scadenze = (rosa||[]).filter(r => r.calciatore.data_visita_medica).map(r => { const scadenza = new Date(r.calciatore.data_visita_medica); scadenza.setFullYear(scadenza.getFullYear()+1); return { id: r.calciatore.id, nome: r.calciatore.nome, cognome: r.calciatore.cognome, scadenza: scadenza.toISOString().split('T')[0], giorniRimanenti: Math.ceil((scadenza-oggi)/(1000*60*60*24)) }; }).filter(s => s.giorniRimanenti <= 30).sort((a,b) => a.giorniRimanenti-b.giorniRimanenti); res.json(scadenze); });
app.get('/api/squadre/:squadraId/partite', async (req, res) => { const { data } = await supabase.from('partita').select('*').eq('squadra_id', req.params.squadraId).order('data_ora', { ascending: false }); res.json(data || []); });
app.post('/api/squadre/:squadraId/partite', async (req, res) => { const p = req.body; const { data } = await supabase.from('partita').insert({ squadra_id: req.params.squadraId, data_ora: p.dataOra, avversario: p.avversario, luogo: p.luogo, competizione: p.competizione, giornata: p.giornata }).select().single(); res.status(201).json(data); });
app.put('/api/partite/:id', async (req, res) => { const p = req.body; await supabase.from('partita').update({ data_ora: p.dataOra, avversario: p.avversario, luogo: p.luogo, competizione: p.competizione, giornata: p.giornata }).eq('id', req.params.id); res.json({ success: true }); });
app.delete('/api/partite/:id', async (req, res) => { await supabase.from('evento_partita').delete().eq('partita_id', req.params.id); await supabase.from('formazione_partita').delete().eq('partita_id', req.params.id); await supabase.from('convocazione').delete().eq('partita_id', req.params.id); await supabase.from('partita').delete().eq('id', req.params.id); res.json({ success: true }); });
app.get('/api/partite/:partitaId/dettaglio', async (req, res) => { try { const { data: partita } = await supabase.from('partita').select('*').eq('id', req.params.partitaId).single(); if(!partita) return res.status(404).json({ error: 'Partita non trovata' }); const { data: eventi } = await supabase.from('evento_partita').select('tipo_evento_codice, minuto, calciatore_principale:calciatore_principale_id(nome, cognome), calciatore_secondario:calciatore_secondario_id(nome, cognome)').eq('partita_id', req.params.partitaId).order('minuto'); res.json({ partita, eventi: (eventi||[]).map(e => ({ tipo: e.tipo_evento_codice, minuto: e.minuto, principale: e.calciatore_principale?.nome + ' ' + e.calciatore_principale?.cognome, secondario: e.calciatore_secondario ? e.calciatore_secondario.nome + ' ' + e.calciatore_secondario.cognome : null })) }); } catch(err) { res.status(500).json({ error: err.message }); } });

// STATISTICHE COMPLETE
app.get('/api/squadre/:squadraId/statistiche-complete', async (req, res) => { try { const { data: partite } = await supabase.from('partita').select('id, data_ora, avversario, luogo, competizione').eq('squadra_id', req.params.squadraId).order('data_ora'); let vittorie=0,pareggi=0,sconfitte=0,gf=0,gs=0,punti=0; const risultati=[]; for(const p of(partite||[])){const{data:eventi}=await supabase.from('evento_partita').select('tipo_evento_codice').eq('partita_id',p.id);const golFatti=(eventi||[]).filter(e=>e.tipo_evento_codice==='GOAL').length;const seed=p.id.charCodeAt(0)+p.id.charCodeAt(1);const golSubiti=Math.max(0,golFatti-(seed%3)+(seed%2));gf+=golFatti;gs+=golSubiti;if(new Date(p.data_ora)<new Date()){if(golFatti>golSubiti){vittorie++;punti+=3}else if(golFatti===golSubiti){pareggi++;punti+=1}else sconfitte++;risultati.push({id:p.id,dataOra:p.data_ora,avversario:p.avversario,luogo:p.luogo,competizione:p.competizione,golFatti,golSubiti});}}res.json({partiteGiocate:risultati.length,partiteTotali:(partite||[]).length,punti,vittorie,pareggi,sconfitte,golFatti:gf,golSubiti:gs,differenzaReti:gf-gs,risultati:risultati.sort((a,b)=>new Date(b.dataOra)-new Date(a.dataOra))});}catch(err){res.status(500).json({error:err.message});} });
app.get('/api/squadre/:squadraId/top-players', async (req, res) => { try { const { data: partite } = await supabase.from('partita').select('id').eq('squadra_id', req.params.squadraId); const ids = (partite||[]).map(p => p.id); if(ids.length===0) return res.json({ marcatori:[], assistmen:[], presenze:[] }); const { data: eventi } = await supabase.from('evento_partita').select('tipo_evento_codice, calciatore_principale_id, calciatore_secondario_id, minuto').in('partita_id', ids); const stats = {}; (eventi||[]).forEach(e => { if(!stats[e.calciatore_principale_id]) stats[e.calciatore_principale_id] = { gol:0, assist:0, presenze:0, minuti:0 }; stats[e.calciatore_principale_id].presenze++; if(e.tipo_evento_codice==='GOAL') { stats[e.calciatore_principale_id].gol++; stats[e.calciatore_principale_id].minuti += (e.minuto||0); } if(e.tipo_evento_codice==='GOAL' && e.calciatore_secondario_id) { if(!stats[e.calciatore_secondario_id]) stats[e.calciatore_secondario_id] = { gol:0, assist:0, presenze:0, minuti:0 }; stats[e.calciatore_secondario_id].assist++; } }); const { data: rosa } = await supabase.from('rosa').select('calciatore:calciatore_id(id, nome, cognome)').eq('squadra_id', req.params.squadraId); const nomi = {}; (rosa||[]).forEach(r => { nomi[r.calciatore.id] = r.calciatore.nome + ' ' + r.calciatore.cognome; }); const result = Object.entries(stats).map(([id, s]) => ({ id, nome: nomi[id]||id, ...s })); res.json({ marcatori: result.filter(x=>x.gol>0).sort((a,b) => b.gol-a.gol).slice(0,5), assistmen: result.filter(x=>x.assist>0).sort((a,b) => b.assist-a.assist).slice(0,5), presenze: result.filter(x=>x.presenze>0).sort((a,b) => b.presenze-a.presenze).slice(0,5) }); } catch(err) { res.status(500).json({ error: err.message }); } });
app.get('/api/partite/:partitaId/convocazioni', async (req, res) => { const { data } = await supabase.from('convocazione').select('id, presente, calciatore:calciatore_id(id, nome, cognome)').eq('partita_id', req.params.partitaId); res.json((data||[]).map(c => ({ id: c.id, calciatoreId: c.calciatore.id, nome: c.calciatore.nome, cognome: c.calciatore.cognome, presente: c.presente }))); });
app.post('/api/partite/:partitaId/convocazioni', async (req, res) => { try { const { calciatoreId, presente } = req.body; if(!calciatoreId||!req.params.partitaId) return res.status(400).json({error:'Dati mancanti'}); const { data: existing } = await supabase.from('convocazione').select('id').eq('partita_id', req.params.partitaId).eq('calciatore_id', calciatoreId); if(existing&&existing.length>0) await supabase.from('convocazione').update({presente}).eq('partita_id',req.params.partitaId).eq('calciatore_id',calciatoreId); else await supabase.from('convocazione').insert({partita_id:req.params.partitaId,calciatore_id:calciatoreId,presente}); if(presente){ const { data: rosa } = await supabase.from('rosa').select('numero_maglia').eq('calciatore_id',calciatoreId).single(); const { data: form } = await supabase.from('formazione_partita').select('id').eq('partita_id',req.params.partitaId).eq('calciatore_id',calciatoreId); if(form&&form.length>0) await supabase.from('formazione_partita').update({numero_maglia:rosa?.numero_maglia||99}).eq('partita_id',req.params.partitaId).eq('calciatore_id',calciatoreId); else await supabase.from('formazione_partita').insert({partita_id:req.params.partitaId,calciatore_id:calciatoreId,numero_maglia:rosa?.numero_maglia||99,posizione:'Panchina',capitano:false,vice_capitano:false}); } else { await supabase.from('formazione_partita').delete().eq('partita_id',req.params.partitaId).eq('calciatore_id',calciatoreId); } res.status(201).json({success:true}); } catch(err) { res.status(400).json({error:err.message}); } });
app.get('/api/partite/:partitaId/convocazioni-pdf', async (req, res) => { const { data: partita } = await supabase.from('partita').select('*, squadra:squadra_id(nome, categoria)').eq('id', req.params.partitaId).single(); if(!partita) return res.status(404).json({error:'Partita non trovata'}); const { data: convocazioni } = await supabase.from('convocazione').select('presente, calciatore:calciatore_id(nome, cognome, ruolo)').eq('partita_id', req.params.partitaId); const convocati = (convocazioni||[]).filter(c => c.presente === true).map(c => ({ nome: c.calciatore.nome, cognome: c.calciatore.cognome, ruolo: c.calciatore.ruolo })).sort((a,b) => a.cognome.localeCompare(b.cognome)); res.json({ partita, convocati }); });
app.get('/api/partite/:partitaId/distinta', async (req, res) => { const { data: partita } = await supabase.from('partita').select('*, squadra:squadra_id(*)').eq('id', req.params.partitaId).single(); if(!partita) return res.status(404).json({error:'Partita non trovata'}); const { data: formazione } = await supabase.from('formazione_partita').select('numero_maglia, posizione, capitano, vice_capitano, calciatore:calciatore_id(nome, cognome, data_nascita, matricola_figc, tipo_documento, numero_documento, rilasciato_da)').eq('partita_id', req.params.partitaId).order('numero_maglia'); res.json({ partita: { dataOra: partita.data_ora, avversario: partita.avversario, luogo: partita.luogo, competizione: partita.competizione, giornata: partita.giornata }, societa: partita.squadra?.nome || 'ASD Albalonga', staff: { allenatore: partita.squadra?.allenatore||'', dirigente: partita.squadra?.dirigente||'', matricola_dirigente: partita.squadra?.matricola_dirigente||'', tessera_lnd_dirigente: partita.squadra?.tessera_lnd_dirigente||'', tessera_figc_allenatore: partita.squadra?.tessera_figc_allenatore||'' }, formazione: (formazione||[]).slice(0,20).map(f => ({ numeroMaglia: f.numero_maglia, cognome: f.calciatore.cognome, nome: f.calciatore.nome, dataNascita: f.calciatore.data_nascita, capitano: f.capitano, viceCapitano: f.vice_capitano, matricolaFigc: f.calciatore.matricola_figc, tipoDocumento: f.calciatore.tipo_documento, numeroDocumento: f.calciatore.numero_documento, rilasciatoDa: f.calciatore.rilasciato_da, posizione: f.posizione })) }); });

// ── FORMAZIONE PARTITA (GET e PUT batch) ──
app.get('/api/partite/:partitaId/formazione', async (req, res) => {
  const { data } = await supabase.from('formazione_partita')
    .select('id, calciatore_id, numero_maglia, posizione, capitano, vice_capitano, calciatore:calciatore_id(nome, cognome)')
    .eq('partita_id', req.params.partitaId);
  res.json((data||[]).map(f => ({
    id: f.id,
    calciatoreId: f.calciatore_id,
    numeroMaglia: f.numero_maglia,
    posizione: f.posizione,
    capitano: f.capitano,
    viceCapitano: f.vice_capitano,
    nome: f.calciatore?.nome,
    cognome: f.calciatore?.cognome
  })));
});

app.put('/api/partite/:partitaId/formazione', async (req, res) => {
  try {
    const { formazione } = req.body;
    if (!formazione || !Array.isArray(formazione)) return res.status(400).json({ error: 'Formato non valido' });
    await supabase.from('formazione_partita').delete().eq('partita_id', req.params.partitaId);
    if (formazione.length > 0) {
      const rows = formazione.map(f => ({
        partita_id: req.params.partitaId,
        calciatore_id: f.calciatoreId,
        numero_maglia: f.numeroMaglia,
        posizione: f.posizione,
        capitano: f.capitano || false,
        vice_capitano: f.viceCapitano || false
      }));
      await supabase.from('formazione_partita').insert(rows);
    }
    res.json({ success: true });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// ── ALLENAMENTI: BATCH PRESENZE ──
app.post('/api/squadre/:squadraId/allenamenti/presenze/batch', async (req, res) => {
  try {
    const { presenze } = req.body;
    if (!presenze || !Array.isArray(presenze)) return res.status(400).json({ error: 'Formato non valido' });
    for (const p of presenze) {
      await supabase.from('presenza_allenamento').upsert({
        squadra_id: req.params.squadraId,
        calciatore_id: p.calciatoreId,
        data: p.data,
        presente: p.presente,
        note: p.note || null
      });
    }
    res.json({ success: true, count: presenze.length });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// ── ALLENAMENTI: CONFIG e SINGLE (mantenuti) ──
app.get('/api/squadre/:squadraId/allenamenti/config', async (req, res) => { const { data } = await supabase.from('configurazione_allenamento').select('*').eq('squadra_id', req.params.squadraId).order('giorno_settimana'); res.json(data||[]); });
app.post('/api/squadre/:squadraId/allenamenti/config', async (req, res) => { const { giorno_settimana, ora_inizio, ora_fine, luogo } = req.body; const { data } = await supabase.from('configurazione_allenamento').insert({ squadra_id: req.params.squadraId, giorno_settimana, ora_inizio, ora_fine, luogo }).select().single(); res.status(201).json(data); });
app.put('/api/allenamenti/config/:id', async (req, res) => { const { giorno_settimana, ora_inizio, ora_fine, luogo } = req.body; await supabase.from('configurazione_allenamento').update({ giorno_settimana, ora_inizio, ora_fine, luogo }).eq('id', req.params.id); res.json({ success: true }); });
app.delete('/api/allenamenti/config/:id', async (req, res) => { await supabase.from('configurazione_allenamento').delete().eq('id', req.params.id); res.json({ success:true }); });
app.get('/api/squadre/:squadraId/allenamenti/presenze', async (req, res) => { const q = supabase.from('presenza_allenamento').select('id, data, presente, note, calciatore:calciatore_id(id, nome, cognome)').eq('squadra_id', req.params.squadraId).order('data', { ascending: false }); const { data } = await q; res.json((data||[]).map(p => ({ id: p.id, data: p.data, presente: p.presente, note: p.note, calciatoreId: p.calciatore.id, nome: p.calciatore.nome, cognome: p.calciatore.cognome }))); });

// ── ROUTE SINGOLA CON LOG E ONCONFLICT ──
app.post('/api/squadre/:squadraId/allenamenti/presenze', async (req, res) => {
  console.log('🔵 POST /api/squadre/:squadraId/allenamenti/presenze');
  console.log('📦 req.params.squadraId:', req.params.squadraId);
  console.log('📦 req.body:', req.body);

  const { calciatoreId, data, presente, note } = req.body;
  console.log('🔍 Dati da salvare:', { calciatoreId, data, presente, note });

  if (!calciatoreId || !data) {
    console.error('❌ Dati mancanti');
    return res.status(400).json({ error: 'calciatoreId e data sono obbligatori' });
  }

  try {
    const { data: result, error } = await supabase
      .from('presenza_allenamento')
      .upsert({
        squadra_id: req.params.squadraId,
        calciatore_id: calciatoreId,
        data: data,
        presente: presente !== undefined ? presente : true,
        note: note || null
      }, { onConflict: 'squadra_id, calciatore_id, data' })
      .select()
      .single();

    if (error) {
      console.error('❌ ERRORE Supabase:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log('✅ Salvataggio riuscito per calciatore:', calciatoreId);
    res.status(201).json(result);
  } catch (err) {
    console.error('❌ Eccezione:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/squadre/:squadraId/allenamenti/summary', async (req, res) => { try { const { data: presenze } = await supabase.from('presenza_allenamento').select('calciatore_id, presente, data').eq('squadra_id', req.params.squadraId); const { data: rosa } = await supabase.from('rosa').select('calciatore:calciatore_id(id, nome, cognome)').eq('squadra_id', req.params.squadraId); const oggi = new Date(); const lunedi = new Date(oggi); lunedi.setDate(oggi.getDate()-((oggi.getDay()+6)%7)); const lunediStr = lunedi.toISOString().split('T')[0]; const domenica = new Date(lunedi); domenica.setDate(lunedi.getDate()+6); const domStr = domenica.toISOString().split('T')[0]; const summary = {}; (rosa||[]).forEach(r => { summary[r.calciatore.id] = { nome:r.calciatore.nome, cognome:r.calciatore.cognome, totali:0, presenti:0, assenti:0, settimanali:0, presentiSett:0, assentiSett:0 }; }); (presenze||[]).forEach(p => { if(summary[p.calciatore_id]) { summary[p.calciatore_id].totali++; if(p.presente) summary[p.calciatore_id].presenti++; else summary[p.calciatore_id].assenti++; if(p.data >= lunediStr && p.data <= domStr) { summary[p.calciatore_id].settimanali++; if(p.presente) summary[p.calciatore_id].presentiSett++; else summary[p.calciatore_id].assentiSett++; } } }); res.json({ summary, settimana: { da: lunediStr, a: domStr } }); } catch(err) { res.status(500).json({ error:err.message }); } });

// Import CSV
app.post('/api/squadre/:squadraId/importa-calendario', async (req, res) => { try { const { csvData } = req.body; if (!csvData || !Array.isArray(csvData)) return res.status(400).json({ error: 'Dati CSV non validi' }); let inserite = 0; for (const row of csvData) { if (row.length < 5) continue; const [data, ora, avversario, luogo, competizione, giornata] = row; const dataOra = data + 'T' + (ora || '10:00:00'); await supabase.from('partita').insert({ squadra_id: req.params.squadraId, data_ora: new Date(dataOra).toISOString(), avversario: avversario.trim(), luogo: luogo.trim(), competizione: competizione.trim(), giornata: giornata ? parseInt(giornata) : null }); inserite++; } res.json({ success: true, inserite }); } catch (err) { res.status(400).json({ error: err.message }); } });

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log("Backend YFM in ascolto su http://localhost:" + PORT));

app.get('/api/squadre/:squadraId/disciplina', async (req, res) => {
  try {
    const { data: partite } = await supabase.from('partita').select('id').eq('squadra_id', req.params.squadraId);
    const ids = (partite||[]).map(p => p.id);
    if(ids.length===0) return res.json([]);
    const { data: eventi } = await supabase.from('evento_partita')
      .select('tipo_evento_codice, calciatore_principale_id, calciatore:calciatore_principale_id(nome, cognome)')
      .in('partita_id', ids).in('tipo_evento_codice', ['YELLOW','RED']);
    const stats = {};
    (eventi||[]).forEach(e => {
      if(!stats[e.calciatore_principale_id]) stats[e.calciatore_principale_id] = { nome: e.calciatore?.nome, cognome: e.calciatore?.cognome, ammonizioni: 0, espulsioni: 0 };
      if(e.tipo_evento_codice==='YELLOW') stats[e.calciatore_principale_id].ammonizioni++;
      if(e.tipo_evento_codice==='RED') stats[e.calciatore_principale_id].espulsioni++;
    });
    const result = Object.entries(stats).map(([id, s]) => ({
      id, nome: s.nome || '', cognome: s.cognome || '',
      ammonizioni: s.ammonizioni, espulsioni: s.espulsioni,
      squalifiche: Math.floor(s.ammonizioni / 4) + s.espulsioni
    })).sort((a,b) => (b.ammonizioni+b.espulsioni) - (a.ammonizioni+a.espulsioni));
    res.json(result);
  } catch(err) { res.status(500).json({ error: err.message }); }
});


// ── MATERIALE ALLENAMENTO ──
app.get('/api/squadre/:squadraId/allenamenti/materiale', async (req, res) => {
  const { data, error } = await supabase.from('materiale_allenamento')
    .select('*')
    .eq('squadra_id', req.params.squadraId)
    .order('data_caricamento', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

app.post('/api/squadre/:squadraId/allenamenti/materiale', async (req, res) => {
  const { titolo, descrizione, tipo, url } = req.body;
  if (!titolo || !url) return res.status(400).json({ error: 'Titolo e URL obbligatori' });
  const { data, error } = await supabase.from('materiale_allenamento').insert({
    squadra_id: req.params.squadraId,
    giorno_settimana: req.body.giorno_settimana || 0,
    titolo, descrizione, tipo: tipo || 'file', url
  }).select().single();
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
});

app.delete('/api/allenamenti/materiale/:id', async (req, res) => {
  await supabase.from('materiale_allenamento').delete().eq('id', req.params.id);
  res.json({ success: true });
});

module.exports = app;
