/**
 * Import Calendario routes — PDF, testo SGS, import-log
 */
const express = require('express');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const { findTeamInPdf, extractCalendar } = require('../pdfCalendarioParser');
const { parseMatchesFromText, logImport } = require('../helpers/importUtils');

function createImportCalendarioRouter({ supabase, authMiddleware, requirePermission }) {
  const router = express.Router();

  // POST /api/calendario/parse-pdf
  router.post('/api/calendario/parse-pdf', authMiddleware, upload.single('pdf'), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'File PDF richiesto' });
      const searchName = req.body.searchName;
      if (!searchName) return res.status(400).json({ error: 'Nome squadra richiesto' });
      const result = await findTeamInPdf(req.file.buffer, searchName);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: 'Errore parsing PDF: ' + err.message });
    }
  });

  // POST /api/calendario/extract
  router.post('/api/calendario/extract', authMiddleware, upload.single('pdf'), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'File PDF richiesto' });
      const { searchName, categoria, girone } = req.body;
      if (!searchName || !categoria || !girone) return res.status(400).json({ error: 'Parametri mancanti' });
      const result = await extractCalendar(req.file.buffer, searchName, categoria, girone);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: 'Errore estrazione: ' + err.message });
    }
  });

  // POST /api/calendario/import
  router.post('/api/calendario/import', authMiddleware, requirePermission('partite', 'write'), async (req, res) => {
    try {
      const { squadraId, partite } = req.body;
      if (!squadraId || !partite || !partite.length) return res.status(400).json({ error: 'Dati mancanti' });

      const inserts = partite.map(p => ({
        team_id: squadraId, data_ora: p.data, avversario: p.avversario,
        luogo: p.luogo, giornata: p.giornata, indirizzo_campo: p.indirizzo_campo || null, stato: 'Programmata'
      }));

      const { data, error } = await supabase.from('match').insert(inserts).select();
      if (error) return res.status(400).json({ error: error.message });

      const team = await supabase.from('team').select('season_id').eq('id', squadraId).single();
      const season = team.data ? await supabase.from('season').select('workspace_id').eq('id', team.data.season_id).single() : null;
      await logImport(supabase, {
        workspace_id: season?.data?.workspace_id, team_id: squadraId, user_id: req.user.id,
        tipo: 'calendario_pdf', fonte: 'PDF SGS/LND',
        record_importati: data.length, record_saltati: 0
      });
      res.json({ inserite: data.length });
    } catch (err) {
      res.status(500).json({ error: 'Errore inserimento: ' + err.message });
    }
  });

  // POST /api/calendario/parse-text
  router.post('/api/calendario/parse-text', authMiddleware, requirePermission('partite', 'write'), async (req, res) => {
    try {
      const { text, searchName } = req.body;
      if (!text || !searchName) return res.status(400).json({ error: 'Testo e nome squadra richiesti' });

      const searchUpper = searchName.toUpperCase().trim();
      const HEADER_REGEX = /\*\s+(UNDER\s+\d+[^*]+?)\s+GIRONE:\s*([A-Z](?:\s*[A-Z]*)?)\s*\*/g;
      const headers = [];
      let m;
      while ((m = HEADER_REGEX.exec(text)) !== null) {
        headers.push({ idx: m.index, cat: m[1].trim().replace(/\s+/g, ' '), girone: m[2].trim().replace(/\s+/g, ' ') });
      }

      const categorie = [];
      for (let i = 0; i < headers.length; i++) {
        const start = headers[i].idx;
        const end = i + 1 < headers.length ? headers[i + 1].idx : text.length;
        const section = text.substring(start, end);
        if (section.toUpperCase().includes(searchUpper)) {
          const { cat, girone } = headers[i];
          if (!categorie.find(r => r.categoria === cat && r.girone === girone)) {
            categorie.push({ categoria: cat, girone });
          }
        }
      }

      if (categorie.length === 0) return res.json({ categorie: [], partite: [], message: 'Squadra non trovata nel testo' });

      const allPartite = [];
      for (let i = 0; i < headers.length; i++) {
        const { cat, girone } = headers[i];
        if (!categorie.find(c => c.categoria === cat && c.girone === girone)) continue;
        const start = headers[i].idx;
        const end = i + 1 < headers.length ? headers[i + 1].idx : text.length;
        const section = text.substring(start, end);
        const partite = parseMatchesFromText(section, searchUpper);
        allPartite.push(...partite.map(p => ({ ...p, _cat: cat + ' G.' + girone })));
      }
      res.json({ categorie, partite: allPartite });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/import-log
  router.get('/api/import-log', authMiddleware, async (req, res) => {
    try {
      const teamId = req.query.team_id;
      let query = supabase.from('import_log').select('*').order('created_at', { ascending: false }).limit(50);
      if (teamId) query = query.eq('team_id', teamId);
      const { data, error } = await query;
      if (error) return res.status(400).json({ error: error.message });
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}

module.exports = createImportCalendarioRouter;
