#!/usr/bin/env node
/**
 * Batch import loghi da Gazzetta Regionale
 * Naviga levels → championships → groups, scarica loghi mancanti
 * 
 * Uso: cd backend && node scripts/import-loghi-gr.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const LOGOS_DIR = path.join(__dirname, '../../frontend-v2/public/logos');
const BASE = 'https://v2.apiweb.gazzettaregionale.it';
const SUPABASE_URL = 'https://csxdlxbhcnyfppojwwzy.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzeGRseGJoY255ZnBwb2p3d3p5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTc1MTMxMywiZXhwIjoyMDk3MzI3MzEzfQ.HZXGk1Xfz0EvSqewAoSCcgZ6gIQYLOP-54mE3YVHgBo';

// Levels da scansionare (1=Giovanili, 2=Dilettanti)
const LEVELS_TO_SCAN = [1, 2];

// Delay tra richieste per non sovraccaricare l'API
const DELAY_MS = 300;
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Normalizza nome per filename
function normalizeLogoName(name) {
  return name.toLowerCase()
    .replace(/\b(s\.?s\.?d\.?|s\.?r\.?l\.?|a\.?s\.?d\.?|a\.?r\.?l\.?|s\.?s\.?|a\.?c\.?|f\.?c\.?)\b\.?/gi, '')
    .replace(/[^a-z0-9\u00e0-\u00fa]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// Fetch JSON da URL
async function fetchJson(url) {
  const resp = await fetch(url, { headers: { 'Accept': 'application/json' } });
  if (!resp.ok) return null;
  return resp.json();
}

// Download immagine
async function downloadImage(url) {
  const resp = await fetch(url);
  if (!resp.ok) return null;
  return Buffer.from(await resp.arrayBuffer());
}

// Upsert logo in Supabase
async function upsertLogo(nome, nomeNorm, logoPath) {
  await fetch(`${SUPABASE_URL}/rest/v1/team_logo`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Prefer': 'resolution=merge-duplicates'
    },
    body: JSON.stringify({ nome, nome_normalizzato: nomeNorm, logo_path: logoPath })
  });
}

// Estrai loghi da calendario di un group
async function extractLogosFromGroup(level, championship, group) {
  const url = `${BASE}/calendari/levels/${level}/${championship}/${group}/calendario`;
  const data = await fetchJson(url);
  if (!data) return [];

  const logos = {};
  const rounds = [...(data.matches_first || []), ...(data.matches_second || [])];
  for (const round of rounds) {
    if (!Array.isArray(round)) continue;
    for (const match of round) {
      if (match.home_logo && match.home_club_name) logos[match.home_club_name] = match.home_logo;
      if (match.away_logo && match.away_club_name) logos[match.away_club_name] = match.away_logo;
    }
  }
  return Object.entries(logos).map(([nome, url]) => ({ nome, url }));
}

async function main() {
  if (!fs.existsSync(LOGOS_DIR)) fs.mkdirSync(LOGOS_DIR, { recursive: true });

  let totalImported = 0, totalSkipped = 0, totalErrors = 0;
  let groupsScanned = 0;

  console.log('🔍 Batch import loghi da Gazzetta Regionale');
  console.log(`📁 Directory: ${LOGOS_DIR}`);
  console.log(`📡 Levels da scansionare: ${LEVELS_TO_SCAN.join(', ')}\n`);

  for (const levelId of LEVELS_TO_SCAN) {
    const championships = await fetchJson(`${BASE}/classifiche/levels/${levelId}`);
    if (!championships || !Array.isArray(championships)) continue;

    console.log(`\n📂 Level ${levelId}: ${championships.length} campionati`);

    for (const champ of championships) {
      await sleep(DELAY_MS);
      const groups = await fetchJson(`${BASE}/classifiche/levels/${levelId}/${champ.id}`);
      if (!groups || !Array.isArray(groups) || groups.length === 0) continue;

      console.log(`  📋 ${champ.text} — ${groups.length} girone/i`);

      for (const group of groups) {
        await sleep(DELAY_MS);
        groupsScanned++;
        const logos = await extractLogosFromGroup(levelId, champ.id, group.id);
        if (logos.length === 0) continue;

        let imported = 0, skipped = 0, errors = 0;
        for (const logo of logos) {
          const nomeNorm = normalizeLogoName(logo.nome);
          if (!nomeNorm) { errors++; continue; }
          const fileName = nomeNorm + '.png';
          const filePath = path.join(LOGOS_DIR, fileName);

          if (fs.existsSync(filePath)) { skipped++; continue; }

          try {
            const buffer = await downloadImage(logo.url);
            if (!buffer || buffer.length < 100) { errors++; continue; }
            fs.writeFileSync(filePath, buffer);
            await upsertLogo(logo.nome, nomeNorm, '/logos/' + fileName);
            imported++;
          } catch (e) {
            errors++;
          }
        }

        if (imported > 0) {
          console.log(`    ✅ Girone ${group.text}: +${imported} nuovi, ${skipped} già presenti, ${errors} errori`);
        }
        totalImported += imported;
        totalSkipped += skipped;
        totalErrors += errors;
      }
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`✅ COMPLETATO`);
  console.log(`   Gironi scansionati: ${groupsScanned}`);
  console.log(`   Loghi scaricati:    ${totalImported}`);
  console.log(`   Già presenti:       ${totalSkipped}`);
  console.log(`   Errori:             ${totalErrors}`);
  console.log(`   Totale in ${LOGOS_DIR}: ${fs.readdirSync(LOGOS_DIR).filter(f => f.endsWith('.png')).length} file`);
}

main().catch(e => { console.error('❌ Errore fatale:', e.message); process.exit(1); });
