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

      // Validazione formato file
      const ext = (req.file.originalname || '').toLowerCase();
      if (!ext.endsWith('.pdf')) {
        return res.status(400).json({ error: 'Formato file non valido. Richiesto un file PDF (.pdf) del calendario SGS/LND.' });
      }
      // Check PDF magic bytes
      if (req.file.buffer.length < 5 || req.file.buffer.slice(0, 5).toString() !== '%PDF-') {
        return res.status(400).json({ error: 'Il file non è un documento PDF valido. Assicurati di caricare il calendario SGS/LND in formato PDF.' });
      }

      const searchName = req.body.searchName;
      if (!searchName) return res.status(400).json({ error: 'Nome squadra richiesto' });
      const result = await findTeamInPdf(req.file.buffer, searchName);

      // Validazione contenuto: verifica che il PDF contenga dati di calendario
      if (!result.categorie || result.categorie.length === 0) {
        const hint = result.suggestions && result.suggestions.length > 0
          ? ' Squadre trovate nel PDF: ' + result.suggestions.slice(0, 5).join(', ')
          : ' Il PDF potrebbe non essere un calendario SGS/LND valido.';
        return res.status(400).json({ error: 'Nessuna categoria/girone trovata per "' + searchName + '".' + hint });
      }

      res.json(result);
    } catch (err) {
      if (err.message && err.message.includes('Invalid PDF')) {
        return res.status(400).json({ error: 'Il file non è un PDF valido o è corrotto. Scarica nuovamente il calendario dal sito SGS.' });
      }
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
