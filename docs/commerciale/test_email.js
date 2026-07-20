// test_email.js — invia email di test a coppola.raffaele@gmail.com
require('dotenv').config();
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const templatePath = path.join(__dirname, '../../press-kit/email-societa.md');
const raw = fs.readFileSync(templatePath, 'utf8');

// Estrai oggetto e corpo dal markdown
const oggettoMatch = raw.match(/\*\*Oggetto:\*\* (.+)/);
const oggetto = oggettoMatch ? oggettoMatch[1].trim() : 'Youth Football Manager';

// Corpo: tutto dopo il separatore ---
const corpo = raw.split('---').slice(1).join('---').trim();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
});

async function sendTest() {
  console.log('Invio email di test a coppola.raffaele@gmail.com...');
  console.log('Oggetto:', oggetto);
  console.log('---');

  await transporter.sendMail({
    from: `"Raffaele Coppola – YFM" <${process.env.GMAIL_USER}>`,
    to: 'coppola.raffaele@gmail.com',
    subject: oggetto,
    text: corpo
  });

  console.log('✅ Email inviata!');
}

sendTest().catch(e => { console.error('❌ Errore:', e.message); process.exit(1); });
