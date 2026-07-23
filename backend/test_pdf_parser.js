/**
 * Test suite per pdfCalendarioParser.js
 * Verifica che tutti i PDF calendario regionali vengano parsati correttamente.
 *
 * Uso: node test_pdf_parser.js
 *
 * Aggiungere nuovi PDF alla lista TEST_CASES con:
 *   - file: nome file nella cartella PDF_DIR
 *   - team: stringa di ricerca (parziale, maiuscolo)
 *   - minMatches: numero minimo di partite attese
 *   - campania: true se formato Campania lineare
 */

const fs = require('fs');
const path = require('path');
const { findTeamInPdf, extractCalendar, isCampaniaFormat, findTeamInCampaniaPdf, extractCampaniaCalendar } = require('./api/pdfCalendarioParser');

const PDF_DIR = '/Users/Raffaele/Documents/Youth-Foorball-Manager/Calendari SGS/';

const TEST_CASES = [
  // Lazio — formato standard SGS con *
  { file: 'LAZIO_Calendario SGS.pdf',                                              team: 'REAL',     minMatches: 28, campania: false, label: 'Lazio SGS U17' },
  { file: 'LAZIO_Calendario SGS Elite.pdf',                                        team: 'REAL',     minMatches: 14, campania: false, label: 'Lazio Elite' },
  // Lombardia — formato I/! border
  { file: 'LOMBARDIA_07.Calendari definitivi Giovanissimi Under 14.pdf',           team: 'ORTE',     minMatches: 28, campania: false, label: 'Lombardia U14' },
  // Sicilia/Lombardia VA — formato I/! border (rinominato da SICILIA_Calendario_U17.pdf)
  { file: 'LOMBARDIA_Calendario_U17.pdf',                                          team: 'VARESE',   minMatches: 24, campania: false, label: 'Lombardia VA U17' },
  // Sicilia — formato standard SGS con *, multi-categoria (U17+U15 provincia CT)
  { file: 'Sicilia_U17_CUCT 10 25_calendari sgs.pdf',                             team: 'CATANIA',  minMatches: 20, campania: false, label: 'Sicilia U17 CT' },
  // Piemonte — multi-girone, formato I/! border
  { file: 'PIEMONTE_CALENDARI-SGS.pdf',                                            team: 'CHIERI',   minMatches: 24, campania: false, label: 'Piemonte multi-girone' },
  // Campania — formato lineare
  { file: 'CAMPANIA_CALENDARIO_UNDER_15_A_2025-2026.pdf',                          team: 'AVELLINO', minMatches: 22, campania: true,  label: 'Campania U15' },
  { file: 'CAMPANIA_CALENDARIO_UNDER_17_A_2025-2026.pdf',                          team: 'CERCOLA',  minMatches: 20, campania: true,  label: 'Campania U17' },
  // Veneto — formato Comitato Regionale (GIRONE: A inline, senza *)
  { file: 'Veneto-Juniores-Elite.pdf',                                             team: 'ZEVIO',    minMatches: 28, campania: false, label: 'Veneto Juniores Elite' },
  // Emilia Romagna — categoria + girone su due righe
  { file: 'EmiliaRomagna_CALENDARIO_20UNDER_2014_20PRO_2025_2026.pdf',             team: 'BOLOGNA',  minMatches: 18, campania: false, label: 'Emilia Romagna U14 Pro' },
  { file: 'EmiliaRomagna_CALENDARI_20CAMPIONATI_20GIOVANILI_202025_20-_202025_20.pdf', team: 'IMOLESE', minMatches: 20, campania: false, label: 'Emilia Romagna U17 Elite' },
  { file: 'EmiliaRomagna_CALENDARI_20CAMPIONATI_20GIOVANILI_202025_20-_202025_20.pdf', team: 'JUNIOR CALCIO CERVIA', minMatches: 20, campania: false, label: 'Emilia Romagna U15 Girone C (inline header)', categoriaTarget: 'UNDER 15 REGIONALE', gironeTarget: 'C' },
];

let passed = 0, failed = 0, skipped = 0;

async function runTest(tc) {
  const filePath = path.join(PDF_DIR, tc.file);
  if (!fs.existsSync(filePath)) {
    console.log(`  ⏭  SKIP  ${tc.label} (file non trovato)`);
    skipped++;
    return;
  }
  const buf = fs.readFileSync(filePath);
  try {
    let partite = [];
    let categoria = '?', girone = '?';
    if (tc.campania) {
      const found = await findTeamInCampaniaPdf(buf, tc.team);
      if (!found.exactMatch) throw new Error(`squadra "${tc.team}" non trovata`);
      const result = await extractCampaniaCalendar(buf, tc.team);
      partite = result.partite;
      categoria = result.categoria; girone = result.girone;
    } else {
      const found = await findTeamInPdf(buf, tc.team);
      if (!found.exactMatch) throw new Error(`squadra "${tc.team}" non trovata. Suggestions: ${found.suggestions.join(', ')}`);
      // Se specificato, usa la categoria/girone target; altrimenti prende la prima
      const match = tc.categoriaTarget
        ? found.categorie.find(c => c.categoria === tc.categoriaTarget && c.girone === tc.gironeTarget)
        : found.categorie[0];
      if (!match) throw new Error(`categoria "${tc.categoriaTarget}" girone "${tc.gironeTarget}" non trovata`);
      ({ categoria, girone } = match);
      const result = await extractCalendar(buf, tc.team, categoria, girone);
      partite = result.partite;
    }
    if (partite.length < tc.minMatches) {
      throw new Error(`solo ${partite.length} partite (min ${tc.minMatches})`);
    }
    console.log(`  ✅ PASS  ${tc.label.padEnd(35)} ${partite.length} partite  cat="${categoria}" girone="${girone}"`);
    passed++;
  } catch (e) {
    console.log(`  ❌ FAIL  ${tc.label.padEnd(35)} ${e.message}`);
    failed++;
  }
}

async function main() {
  console.log('\n🧪 PDF Calendar Parser — Test Suite\n');
  for (const tc of TEST_CASES) await runTest(tc);
  console.log(`\n📊 Risultati: ${passed} passed, ${failed} failed, ${skipped} skipped\n`);
  if (failed > 0) process.exit(1);
}
main().catch(e => { console.error(e); process.exit(1); });
