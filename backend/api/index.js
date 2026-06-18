const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', async (req, res) => {
  const { data, error } = await supabase.from('workspace').select('count');
  if (error) return res.status(500).json({ status: 'error', message: error.message });
  res.json({ status: 'ok', database: 'connected' });
});

// Workspaces
app.get('/api/workspaces', async (req, res) => {
  const { data, error } = await supabase.from('workspace').select('*');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Calciatori
app.get('/api/squadre/:squadraId/calciatori', async (req, res) => {
  const { data, error } = await supabase
    .from('rosa')
    .select('calciatore:calciatore_id(id, nome, cognome), numero_maglia, ruolo, stato')
    .eq('squadra_id', req.params.squadraId);
  if (error) return res.status(500).json({ error: error.message });
  
  res.json(data.map(r => ({
    id: r.calciatore.id,
    nome: r.calciatore.nome,
    cognome: r.calciatore.cognome,
    numeroMaglia: r.numero_maglia,
    ruolo: r.ruolo,
    stato: r.stato
  })));
});

// Statistiche
app.get('/api/squadre/:squadraId/statistiche', async (req, res) => {
  const { data: partite } = await supabase.from('partita').select('id').eq('squadra_id', req.params.squadraId);
  const { count } = await supabase.from('rosa').select('*', { count: 'exact', head: true }).eq('squadra_id', req.params.squadraId);
  res.json({ partiteGiocate: partite?.length || 0, calciatoriInRosa: count || 0 });
});

module.exports = app;
