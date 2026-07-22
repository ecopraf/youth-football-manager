const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const { authMiddleware } = require('../middleware/auth.middleware');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SUPPORT_EMAIL_USER,
    pass: process.env.SUPPORT_EMAIL_PASS
  }
});

const TIPO_LABEL = { bug: '🐛 Bug', suggerimento: '💡 Suggerimento', domanda: '❓ Domanda' };
const TIPO_COLOR = { bug: '#E74C3C', suggerimento: '#667eea', domanda: '#F39C12' };

function buildTicketHtml({ tipo, descrizione, user, workspace_name, url_pagina, build_version, user_agent, timestamp }) {
  const tipoLabel = TIPO_LABEL[tipo] || tipo;
  const tipoColor = TIPO_COLOR[tipo] || '#667eea';
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px;">
  <div style="max-width:600px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
    <div style="background:${tipoColor};padding:20px 24px;">
      <h2 style="color:white;margin:0;font-size:20px;">${tipoLabel} — Youth Football Manager</h2>
      <p style="color:rgba(255,255,255,0.85);margin:4px 0 0;font-size:13px;">${timestamp}</p>
    </div>
    <div style="padding:24px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:10px 0;border-bottom:1px solid #eee;">
          <strong style="color:#555;font-size:12px;text-transform:uppercase;">Descrizione</strong><br>
          <p style="margin:6px 0 0;font-size:15px;line-height:1.5;white-space:pre-wrap;">${descrizione.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</p>
        </td></tr>
        <tr><td style="padding:10px 0;">
          <strong style="color:#555;font-size:12px;text-transform:uppercase;">Contesto Tecnico</strong><br>
          <table style="margin-top:8px;font-size:13px;color:#444;width:100%;">
            <tr><td style="padding:2px 0;color:#888;">Mittente</td><td><strong>${[user.nome, user.cognome].filter(Boolean).join(' ') || user.email || '—'}</strong></td></tr>
            <tr><td style="padding:2px 0;color:#888;">Account</td><td><a href="mailto:${user.email||''}" style="color:#667eea;">${user.email||'—'}</a> · ${user.ruolo||'—'}</td></tr>
            <tr><td style="padding:2px 0;color:#888;">Società</td><td>${workspace_name||'—'}</td></tr>
            <tr><td style="padding:2px 0;color:#888;">Pagina</td><td style="word-break:break-all;">${(url_pagina||'—').replace(/</g,'&lt;')}</td></tr>
            <tr><td style="padding:2px 0;color:#888;">Build</td><td>${build_version||'—'}</td></tr>
            <tr><td style="padding:2px 0;color:#888;">Timestamp</td><td>${timestamp}</td></tr>
            <tr><td style="padding:2px 0;color:#888;font-size:10px;">User Agent</td><td style="word-break:break-all;font-size:10px;">${(user_agent||'—').substring(0,150)}</td></tr>
          </table>
        </td></tr>
      </table>
    </div>
    <div style="background:#f9f9f9;padding:12px 24px;border-top:1px solid #eee;">
      <p style="margin:0;font-size:12px;color:#999;">Rispondere a questa email per contattare direttamente l'utente.</p>
    </div>
  </div>
</body></html>`;
}

// POST /support/ticket — invia email + salva nel DB
router.post('/support/ticket', authMiddleware, async (req, res) => {
  try {
    const { tipo = 'bug', descrizione, url_pagina, screenshot_base64, build_version, workspace_name, user_agent } = req.body;
    if (!descrizione || descrizione.trim().length < 5)
      return res.status(400).json({ success: false, error: 'Descrizione troppo breve' });

    const user = req.user;

    // Rate limit: max 5 ticket per utente nelle ultime 24h
    if (user.id && user.id !== 'superadmin') {
      const { rows } = await pool.query(
        `SELECT COUNT(*) FROM support_ticket WHERE user_id = $1 AND created_at > now() - interval '1 day'`,
        [user.id]
      );
      if (parseInt(rows[0].count) >= 5)
        return res.status(429).json({ success: false, error: 'Limite segnalazioni giornaliero raggiunto (5/giorno). Riprova domani.' });
    }

    const isSuperadmin = !user.id || user.id === 'superadmin';
    const userId = isSuperadmin ? null : user.id;

    const tipoLabel = TIPO_LABEL[tipo] || tipo;
    const timestamp = new Date().toLocaleString('it-IT', { timeZone: 'Europe/Rome' });

    const screenshotHtml = screenshot_base64
      ? `<tr><td style="padding:12px 0;border-top:1px solid #eee;"><strong style="color:#555;">📸 Screenshot</strong><br>
           <img src="${screenshot_base64}" style="max-width:100%;border-radius:8px;margin-top:8px;border:1px solid #ddd;"></td></tr>`
      : '';

    const baseHtml = buildTicketHtml({ tipo, descrizione, user, workspace_name, url_pagina, build_version, user_agent, timestamp });
    const htmlWithScreenshot = baseHtml.replace('</table>\n    </div>', `${screenshotHtml}</table>\n    </div>`);

    await transporter.sendMail({
      from: `"YFM Support" <${process.env.SUPPORT_EMAIL_USER}>`,
      to: process.env.SUPPORT_EMAIL_USER,
      replyTo: user.email ? `${[user.nome, user.cognome].filter(Boolean).join(' ') || user.email} <${user.email}>` : process.env.SUPPORT_EMAIL_USER,
      subject: `[YFM] ${tipoLabel}: ${descrizione.substring(0, 60)}${descrizione.length > 60 ? '…' : ''}`,
      html: htmlWithScreenshot
    });

    // Salva nel DB (senza screenshot — troppo pesante)
    await pool.query(
      `INSERT INTO support_ticket (workspace_id, user_id, email, nome, ruolo, pagina, tipo, descrizione, build, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        user.workspace_id || null,
        userId,
        user.email || null,
        [user.nome, user.cognome].filter(Boolean).join(' ') || null,
        user.ruolo || null,
        url_pagina || null,
        tipo,
        descrizione,
        build_version || null,
        (user_agent || req.headers['user-agent'] || '').substring(0, 300) || null
      ]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('Support ticket error:', err.message);
    res.status(500).json({ success: false, error: 'Errore invio segnalazione' });
  }
});

// GET /support/tickets — lista ticket (solo superadmin)
router.get('/support/tickets', authMiddleware, async (req, res) => {
  if (!req.user.is_superadmin)
    return res.status(403).json({ success: false, error: 'Accesso negato' });

  const { stato, workspace_id } = req.query;
  let where = [];
  let params = [];
  if (stato && stato !== 'tutti') { params.push(stato); where.push(`stato = $${params.length}`); }
  if (workspace_id) { params.push(workspace_id); where.push(`workspace_id = $${params.length}`); }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const { rows } = await pool.query(
    `SELECT * FROM support_ticket ${whereClause} ORDER BY created_at DESC`,
    params
  );
  res.json({ success: true, data: rows });
});

// PUT /support/tickets/:id/rispondi — risponde + chiude
router.put('/support/tickets/:id/rispondi', authMiddleware, async (req, res) => {
  if (!req.user.is_superadmin)
    return res.status(403).json({ success: false, error: 'Accesso negato' });

  const { risposta } = req.body;
  if (!risposta || risposta.trim().length < 3)
    return res.status(400).json({ success: false, error: 'Risposta troppo breve' });

  const { rows } = await pool.query(
    `UPDATE support_ticket SET risposta=$1, risposta_at=now(), stato='chiuso' WHERE id=$2 RETURNING *`,
    [risposta, req.params.id]
  );
  if (!rows.length) return res.status(404).json({ success: false, error: 'Ticket non trovato' });

  const ticket = rows[0];
  if (ticket.email) {
    const timestamp = new Date().toLocaleString('it-IT', { timeZone: 'Europe/Rome' });
    const tipoLabel = TIPO_LABEL[ticket.tipo] || ticket.tipo;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px;">
  <div style="max-width:600px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
    <div style="background:#27AE60;padding:20px 24px;">
      <h2 style="color:white;margin:0;font-size:20px;">✅ Risposta al tuo ticket</h2>
      <p style="color:rgba(255,255,255,0.85);margin:4px 0 0;font-size:13px;">${timestamp}</p>
    </div>
    <div style="padding:24px;">
      <p style="color:#555;font-size:14px;">Ciao ${ticket.nome || ''},</p>
      <p style="color:#555;font-size:14px;">abbiamo risposto al tuo <strong>Ticket #${ticket.id.substring(0,8)}</strong> (${tipoLabel})</p>
      <div style="background:#f9f9f9;border-left:4px solid #27AE60;padding:12px 16px;border-radius:0 8px 8px 0;margin:16px 0;">
        <p style="margin:0;font-size:14px;color:#333;white-space:pre-wrap;">${risposta.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</p>
      </div>
      <p style="color:#888;font-size:12px;margin-top:16px;">La tua segnalazione originale:<br>
        <em style="color:#aaa;">${(ticket.descrizione||'').substring(0,200).replace(/</g,'&lt;')}</em>
      </p>
    </div>
    <div style="background:#f9f9f9;padding:12px 24px;border-top:1px solid #eee;">
      <p style="margin:0;font-size:12px;color:#999;">Youth Football Manager — youthfootballmanager@gmail.com</p>
    </div>
  </div>
</body></html>`;

    await transporter.sendMail({
      from: `"Youth Football Manager" <${process.env.SUPPORT_EMAIL_USER}>`,
      to: ticket.email,
      subject: `[YFM] Risposta al Ticket #${ticket.id.substring(0,8)}`,
      html
    }).catch(e => console.error('Errore invio risposta email:', e.message));
  }

  res.json({ success: true });
});

// PUT /support/tickets/:id/stato — cambia stato senza risposta
router.put('/support/tickets/:id/stato', authMiddleware, async (req, res) => {
  if (!req.user.is_superadmin)
    return res.status(403).json({ success: false, error: 'Accesso negato' });

  const { stato } = req.body;
  if (!['aperto', 'chiuso'].includes(stato))
    return res.status(400).json({ success: false, error: 'Stato non valido' });

  const { rows } = await pool.query(
    `UPDATE support_ticket SET stato=$1 WHERE id=$2 RETURNING id`,
    [stato, req.params.id]
  );
  if (!rows.length) return res.status(404).json({ success: false, error: 'Ticket non trovato' });
  res.json({ success: true });
});

// DELETE /support/tickets/chiusi — elimina tutti i ticket chiusi
router.delete('/support/tickets/chiusi', authMiddleware, async (req, res) => {
  if (!req.user.is_superadmin)
    return res.status(403).json({ success: false, error: 'Accesso negato' });

  const { rowCount } = await pool.query(`DELETE FROM support_ticket WHERE stato='chiuso'`);
  res.json({ success: true, deleted: rowCount });
});

// DELETE /support/tickets/:id — elimina singolo ticket
router.delete('/support/tickets/:id', authMiddleware, async (req, res) => {
  if (!req.user.is_superadmin)
    return res.status(403).json({ success: false, error: 'Accesso negato' });

  const { rowCount } = await pool.query(`DELETE FROM support_ticket WHERE id=$1`, [req.params.id]);
  if (!rowCount) return res.status(404).json({ success: false, error: 'Ticket non trovato' });
  res.json({ success: true });
});

module.exports = router;
