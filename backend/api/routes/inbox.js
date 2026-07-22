const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth.middleware');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// GET /api/inbox
router.get('/inbox', authMiddleware, async (req, res) => {
  try {
    const { workspace_id, team_id, tipo = 'all', letto = 'all', limit = 50, offset = 0, days = 30 } = req.query;
    if (!workspace_id) return res.status(400).json({ success: false, error: 'workspace_id richiesto' });
    const since = parseInt(days) < 9999 ? new Date(Date.now() - parseInt(days) * 86400000).toISOString() : null;

    const items = [];

    // --- notification ---
    if (tipo === 'all' || tipo === 'avvisi' || tipo === 'convocazioni' || tipo === 'bonifici') {
      let whereN = [`n.workspace_id = $1`];
      let paramsN = [workspace_id];
      if (since) { paramsN.push(since); whereN.push(`n.created_at >= $${paramsN.length}`); }
      if (team_id) { paramsN.push(team_id); whereN.push(`n.team_id = $${paramsN.length}`); }
      if (letto === 'true') whereN.push(`n.letto = true`);
      if (letto === 'false') whereN.push(`n.letto = false`);
      if (tipo === 'avvisi') whereN.push(`n.tipo = 'avviso'`);
      if (tipo === 'convocazioni') whereN.push(`n.tipo = 'convocazione' AND n.destinatario_profilo IS NOT NULL`);
      if (tipo === 'bonifici') whereN.push(`n.tipo IN ('ricevuta_bonifico','ricevuta_caricata')`);
      // Per 'all': esclude convocazioni destinate solo ad atleti/genitori (senza destinatario_profilo)
      if (tipo === 'all') whereN.push(`NOT (n.tipo = 'convocazione' AND n.destinatario_profilo IS NULL)`);

      const { rows: notifs } = await pool.query(
        `SELECT n.id, n.tipo, n.titolo, n.messaggio, n.letto, n.created_at,
                n.riferimento_id, n.team_id,
                t.category_id,
                c.nome as categoria_nome,
                fi.stato as stato_rata,
                fi.ricevuta_path
         FROM notification n
         LEFT JOIN team t ON t.id = n.team_id
         LEFT JOIN category c ON c.id = t.category_id
         LEFT JOIN fee_installment fi ON fi.id = n.riferimento_id AND n.tipo IN ('ricevuta_bonifico','ricevuta_caricata')
         WHERE ${whereN.join(' AND ')}
         ORDER BY n.created_at DESC`,
        paramsN
      );
      notifs.forEach(n => items.push({
        id: n.id,
        source: 'notification',
        tipo: ['ricevuta_bonifico','ricevuta_caricata'].includes(n.tipo) ? 'bonifico' : n.tipo,
        titolo: n.titolo,
        messaggio: n.messaggio,
        letto: n.letto,
        created_at: n.created_at,
        riferimento_id: n.riferimento_id,
        team_id: n.team_id,
        categoria_nome: n.categoria_nome,
        stato_rata: n.stato_rata || null,
        ricevuta_path: n.ricevuta_path || null
      }));
    }

    // Ordina per data desc e pagina
    items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const total = items.length;
    const paginated = items.slice(Number(offset), Number(offset) + Number(limit));

    // Contatori per tipo (su tutti gli items, non solo la pagina)
    const contatori = {
      all: items.length,
      non_letti: items.filter(i => !i.letto).length,
      avvisi: items.filter(i => i.tipo === 'avviso').length,
      avvisi_non_letti: items.filter(i => i.tipo === 'avviso' && !i.letto).length,
      convocazioni: items.filter(i => i.tipo === 'convocazione').length,
      convocazioni_non_lette: items.filter(i => i.tipo === 'convocazione' && !i.letto).length,
      bonifici: items.filter(i => i.tipo === 'bonifico').length,
      bonifici_non_letti: items.filter(i => i.tipo === 'bonifico' && !i.letto).length,
    };

    res.json({ success: true, data: paginated, total, contatori });
  } catch (err) {
    console.error('Inbox error:', err.message);
    res.status(500).json({ success: false, error: 'Errore caricamento inbox' });
  }
});

// PUT /api/inbox/mark-read — segna letti in batch
router.put('/inbox/mark-read', authMiddleware, async (req, res) => {
  try {
    const { ids, source } = req.body; // source: 'notification' | 'absence'
    if (!ids?.length) return res.json({ success: true });

    if (source === 'absence') {
      await pool.query(`UPDATE absence_notification SET letto=true WHERE id = ANY($1::uuid[])`, [ids]);
    } else {
      await pool.query(`UPDATE notification SET letto=true WHERE id = ANY($1::uuid[])`, [ids]);
    }
    res.json({ success: true });
  } catch (err) {
    console.error('mark-read error:', err.message);
    res.status(500).json({ success: false, error: 'Errore' });
  }
});

// PUT /api/inbox/mark-all-read — segna tutti letti per workspace+team
router.put('/inbox/mark-all-read', authMiddleware, async (req, res) => {
  try {
    const { workspace_id, team_id, tipo } = req.body;
    if (!workspace_id) return res.status(400).json({ success: false, error: 'workspace_id richiesto' });

    if (!tipo || tipo === 'all' || tipo === 'avvisi' || tipo === 'convocazioni' || tipo === 'bonifici') {
      let where = [`workspace_id = $1`];
      let params = [workspace_id];
      if (team_id) { params.push(team_id); where.push(`team_id = $${params.length}`); }
      if (tipo === 'avvisi') where.push(`tipo = 'avviso'`);
      if (tipo === 'convocazioni') where.push(`tipo = 'convocazione'`);
      if (tipo === 'bonifici') where.push(`tipo = 'ricevuta_bonifico'`);
      await pool.query(`UPDATE notification SET letto=true WHERE ${where.join(' AND ')}`, params);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('mark-all-read error:', err.message);
    res.status(500).json({ success: false, error: 'Errore' });
  }
});

module.exports = router;
