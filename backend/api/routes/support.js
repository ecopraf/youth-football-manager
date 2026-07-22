const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const { authMiddleware } = require('../middleware/auth.middleware');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SUPPORT_EMAIL_USER,
    pass: process.env.SUPPORT_EMAIL_PASS
  }
});

const TIPO_LABEL = { bug: '🐛 Bug', suggerimento: '💡 Suggerimento', domanda: '❓ Domanda' };
const TIPO_COLOR = { bug: '#E74C3C', suggerimento: '#667eea', domanda: '#F39C12' };

router.post('/support/ticket', authMiddleware, async (req, res) => {
  try {
    const { tipo = 'bug', descrizione, url_pagina, screenshot_base64, build_version, workspace_name, user_agent } = req.body;
    if (!descrizione || descrizione.trim().length < 5)
      return res.status(400).json({ success: false, error: 'Descrizione troppo breve' });

    const user = req.user;
    const tipoLabel = TIPO_LABEL[tipo] || tipo;
    const tipoColor = TIPO_COLOR[tipo] || '#667eea';
    const timestamp = new Date().toLocaleString('it-IT', { timeZone: 'Europe/Rome' });

    const screenshotHtml = screenshot_base64
      ? `<tr><td style="padding:12px 0;border-top:1px solid #eee;">
           <strong style="color:#555;">📸 Screenshot</strong><br>
           <img src="${screenshot_base64}" style="max-width:100%;border-radius:8px;margin-top:8px;border:1px solid #ddd;">
         </td></tr>`
      : '';

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px;">
  <div style="max-width:600px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
    <div style="background:${tipoColor};padding:20px 24px;">
      <h2 style="color:white;margin:0;font-size:20px;">${tipoLabel} — Youth Football Manager</h2>
      <p style="color:rgba(255,255,255,0.85);margin:4px 0 0;font-size:13px;">${timestamp}</p>
    </div>
    <div style="padding:24px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:10px 0;border-bottom:1px solid #eee;">
          <strong style="color:#555;font-size:12px;text-transform:uppercase;">Tipo</strong><br>
          <span style="font-size:15px;">${tipoLabel}</span>
        </td></tr>
        <tr><td style="padding:10px 0;border-bottom:1px solid #eee;">
          <strong style="color:#555;font-size:12px;text-transform:uppercase;">Descrizione</strong><br>
          <p style="margin:6px 0 0;font-size:15px;line-height:1.5;white-space:pre-wrap;">${descrizione.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</p>
        </td></tr>
        <tr><td style="padding:10px 0;border-bottom:1px solid #eee;">
          <strong style="color:#555;font-size:12px;text-transform:uppercase;">Contesto Tecnico</strong><br>
          <table style="margin-top:8px;font-size:13px;color:#444;width:100%;">
            <tr><td style="padding:2px 0;color:#888;">Mittente</td><td><strong>${[user.nome, user.cognome].filter(Boolean).join(' ') || user.email || '—'}</strong></td></tr>
            <tr><td style="padding:2px 0;color:#888;">Account</td><td><a href="mailto:${user.email || ''}" style="color:#667eea;">${user.email || '—'}</a> &middot; ${user.ruolo || '—'}</td></tr>
            <tr><td style="padding:2px 0;color:#888;">Società</td><td>${workspace_name || user.workspace_id || '—'}</td></tr>
            <tr><td style="padding:2px 0;color:#888;">Pagina</td><td style="word-break:break-all;">${(url_pagina || '—').replace(/</g,'&lt;')}</td></tr>
            <tr><td style="padding:2px 0;color:#888;">Build</td><td>${build_version || '—'}</td></tr>
            <tr><td style="padding:2px 0;color:#888;">Timestamp</td><td>${timestamp}</td></tr>
            <tr><td style="padding:2px 0;color:#888;font-size:10px;">User Agent</td><td style="word-break:break-all;font-size:10px;">${(user_agent || req.headers['user-agent'] || '—').substring(0,150)}</td></tr>
          </table>
        </td></tr>
        ${screenshotHtml}
      </table>
    </div>
    <div style="background:#f9f9f9;padding:12px 24px;border-top:1px solid #eee;">
      <p style="margin:0;font-size:12px;color:#999;">Rispondere a questa email per contattare direttamente l'utente.</p>
    </div>
  </div>
</body>
</html>`;

    await transporter.sendMail({
      from: `"YFM Support" <${process.env.SUPPORT_EMAIL_USER}>`,
      to: process.env.SUPPORT_EMAIL_USER,
      replyTo: user.email ? `${[user.nome, user.cognome].filter(Boolean).join(' ') || user.email} <${user.email}>` : process.env.SUPPORT_EMAIL_USER,
      subject: `[YFM] ${tipoLabel}: ${descrizione.substring(0, 60)}${descrizione.length > 60 ? '…' : ''}`,
      html
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Support ticket error:', err.message);
    res.status(500).json({ success: false, error: 'Errore invio segnalazione' });
  }
});

module.exports = router;
