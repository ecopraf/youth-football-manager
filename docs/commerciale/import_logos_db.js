/**
 * Import loghi nel DB — upsert su team_logo
 * Usage: node import_logos_db.js
 *        node import_logos_db.js --dry-run
 *
 * Per ogni regione in logos/{regione}/index.json:
 *   - Estrae tc_team_id dal nome file ({teamId}_Nome.png)
 *   - Upsert su team_logo: logo_path = URL Supabase, tc_team_id, nome
 *   - Conflict su tc_team_id → aggiorna logo_path (non sovrascrive record esistenti senza tc_team_id)
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');
const SUPABASE_URL = 'https://csxdlxbhcnyfppojwwzy.supabase.co';
const BUCKET = 'club-logos';
const LOGOS_DIR = path.join(__dirname, 'logos');

const pool = new Pool({
  connectionString: 'postgresql://postgres.csxdlxbhcnyfppojwwzy:Yfm2026Secure!@aws-0-eu-west-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

const REGIONI = [
  'abruzzo', 'altoadige', 'basilicata', 'calabria', 'campania',
  'emiliaromagna', 'friuliveneziagiulia', 'lazio', 'liguria', 'lombardia',
  'marche', 'molise', 'nazionali', 'piemonte', 'puglia',
  'sardegna', 'sicilia', 'toscana', 'trentino', 'umbria', 'veneto'
];

function extractTcTeamId(filename) {
  const m = filename.match(/^(\d+)_/);
  return m ? m[1] : null;
}

function publicUrl(regione, filename) {
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${regione}/${encodeURIComponent(filename)}`;
}

(async () => {
  const client = await pool.connect();
  try {
    // Verifica colonna tc_team_id esiste su team_logo
    const { rows: cols } = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'team_logo' AND column_name = 'tc_team_id'
    `);
    if (cols.length === 0) {
      console.log('⚠️  Colonna tc_team_id mancante su team_logo — eseguo migrazione...');
      if (!DRY_RUN) {
        await client.query(`ALTER TABLE public.team_logo ADD COLUMN IF NOT EXISTS tc_team_id TEXT`);
        await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS team_logo_tc_team_id_idx ON public.team_logo(tc_team_id) WHERE tc_team_id IS NOT NULL`);
        console.log('✅ Colonna tc_team_id aggiunta + indice unique');
      }
    }
    // Verifica colonna regione
    const { rows: colsReg } = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'team_logo' AND column_name = 'regione'
    `);
    if (colsReg.length === 0) {
      console.log('⚠️  Colonna regione mancante su team_logo — eseguo migrazione...');
      if (!DRY_RUN) {
        await client.query(`ALTER TABLE public.team_logo ADD COLUMN IF NOT EXISTS regione TEXT`);
        console.log('✅ Colonna regione aggiunta');
      }
    }

    let totInserted = 0, totUpdated = 0, totSkipped = 0;

    for (const regione of REGIONI) {
      const indexPath = path.join(LOGOS_DIR, regione, 'index.json');
      if (!fs.existsSync(indexPath)) {
        console.log(`⚠️  ${regione}: index.json non trovato, skip`);
        continue;
      }

      const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
      const entries = Object.entries(index);
      console.log(`\n📂 ${regione}: ${entries.length} società`);

      let regIns = 0, regUpd = 0, regSkip = 0;

      for (const [nome, value] of entries) {
        // index.json può avere filename o URL Supabase come valore
        const filename = value.startsWith('http') ? value.split('/').pop() : value;
        const tcTeamId = extractTcTeamId(filename);
        const logoPath = publicUrl(regione, filename);
        const nomePulito = nome.trim();

        if (!tcTeamId) { regSkip++; continue; }

        if (DRY_RUN) {
          regIns++;
          continue;
        }

        // Upsert: se tc_team_id esiste → aggiorna logo_path; altrimenti inserisce
        const nomeNorm = nomePulito.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
        const { rows } = await client.query(`
          INSERT INTO public.team_logo (nome, nome_normalizzato, logo_path, tc_team_id, regione)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (tc_team_id) DO UPDATE
            SET logo_path = EXCLUDED.logo_path,
                nome = EXCLUDED.nome,
                nome_normalizzato = EXCLUDED.nome_normalizzato,
                regione = EXCLUDED.regione
          RETURNING (xmax = 0) AS inserted
        `, [nomePulito, nomeNorm, logoPath, tcTeamId, regione]);

        if (rows[0]?.inserted) regIns++; else regUpd++;
      }

      console.log(`  ✅ inseriti: ${regIns}, aggiornati: ${regUpd}, skippati: ${regSkip}`);
      totInserted += regIns;
      totUpdated += regUpd;
      totSkipped += regSkip;
    }

    console.log(`\n🎉 Completato${DRY_RUN ? ' (DRY RUN)' : ''}:`);
    console.log(`   Inseriti: ${totInserted}`);
    console.log(`   Aggiornati: ${totUpdated}`);
    console.log(`   Skippati: ${totSkipped}`);

  } finally {
    client.release();
    await pool.end();
  }
})().catch(e => { console.error(e); process.exit(1); });
