// send_emails.js — invia email a tutte le società con email valida e traccia lo stato nel CSV
require('dotenv').config();
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const CSV_PATH = path.join(__dirname, 'societa_lazio.csv');
const TEMPLATE_PATH = path.join(__dirname, '../../press-kit/email-societa.md');
const DELAY_MS = 2000; // 2 secondi tra un invio e l'altro per evitare blocchi Gmail

// Leggi template
const raw = fs.readFileSync(TEMPLATE_PATH, 'utf8');
const oggettoMatch = raw.match(/\*\*Oggetto:\*\* (.+)/);
const oggetto = oggettoMatch ? oggettoMatch[1].trim() : 'Youth Football Manager';
const corpo = raw.split('---').slice(1).join('---').trim();

// Leggi CSV
const csvRaw = fs.readFileSync(CSV_PATH, 'utf8');
const lines = csvRaw.split('\n');
const header = lines[0];
const rows = lines.slice(1).filter(l => l.trim());

// Filtra società con email valida (non vuota, non N/D) e non già inviate
const toSend = rows.map((line, i) => {
  const cols = line.split(',');
  return { index: i + 1, line, cols };
}).filter(({ cols }) => {
  const email = cols[1]?.trim();
  const stato = cols[3]?.trim();
  return email && email !== 'N/D' && email !== '' && stato === 'Da contattare';
});

console.log(`📋 Società da contattare: ${toSend.length}`);
console.log('─'.repeat(50));

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
});

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function updateCsv(rowIndex, cols) {
  const today = new Date().toISOString().split('T')[0];
  cols[3] = 'Inviato';
  cols[4] = today;
  rows[rowIndex - 1] = cols.join(',');
  const newCsv = [header, ...rows].join('\n');
  fs.writeFileSync(CSV_PATH, newCsv, 'utf8');
}

async function run() {
  let sent = 0, failed = 0;

  for (const { index, cols } of toSend) {
    const nome = cols[0]?.trim();
    const email = cols[1]?.trim();

    try {
      await transporter.sendMail({
        from: `"Raffaele Coppola – YFM" <${process.env.GMAIL_USER}>`,
        to: email,
        subject: oggetto,
        text: corpo
      });

      updateCsv(index, cols);
      sent++;
      console.log(`✅ [${sent}/${toSend.length}] ${nome} → ${email}`);
    } catch (e) {
      failed++;
      console.log(`❌ ERRORE ${nome} (${email}): ${e.message}`);
    }

    await sleep(DELAY_MS);
  }

  console.log('─'.repeat(50));
  console.log(`✅ Inviate: ${sent} | ❌ Errori: ${failed}`);
}

run().catch(e => { console.error('Errore fatale:', e.message); process.exit(1); });
