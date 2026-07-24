const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
const DIR = path.join(__dirname, 'logos', args[0] || 'campania');
const APPLY = process.argv.includes('--apply');

// Stripping solo suffisso categoria per raggruppare duplicati della stessa società
function groupKey(filename) {
  return filename
    .replace(/^\d+_/, '')              // rimuove teamId_
    .replace(/\.png$/i, '')            // rimuove .png
    .replace(/_U1[4-9]$/i, '')         // rimuove _U14..U19
    .replace(/_+$/, '');               // rimuove underscore finali
}

const files = fs.readdirSync(DIR).filter(f => f.endsWith('.png'));

// Raggruppa per groupKey — mantieni il più grande, a parità il primo
const groups = new Map(); // groupKey → { keeper, keeperSize, others[] }
for (const f of files) {
  const key = groupKey(f);
  const size = fs.statSync(path.join(DIR, f)).size;
  if (!groups.has(key)) {
    groups.set(key, { keeper: f, keeperSize: size, others: [] });
  } else {
    const g = groups.get(key);
    if (size > g.keeperSize) {
      g.others.push(g.keeper);
      g.keeper = f;
      g.keeperSize = size;
    } else {
      g.others.push(f);
    }
  }
}

let removed = 0;
const index = {};

for (const [key, { keeper, keeperSize, others }] of groups) {
  if (others.length > 0) {
    console.log(`KEEP  ${keeper} (${keeperSize}b)`);
    for (const f of others) {
      const size = fs.statSync(path.join(DIR, f)).size;
      console.log(`  DEL ${f} (${size}b)`);
      if (APPLY) {
        const fp = path.join(DIR, f);
        if (fs.existsSync(fp)) { fs.unlinkSync(fp); removed++; }
      } else {
        removed++;
      }
    }
  }

  // Index: nome leggibile (senza teamId prefix e suffisso categoria) → filename keeper
  const label = key.replace(/^\d+_/, '').replace(/_/g, ' ');
  index[label] = keeper;
}

if (APPLY) {
  fs.writeFileSync(path.join(DIR, 'index.json'), JSON.stringify(index, null, 2));
  const remaining = fs.readdirSync(DIR).filter(f => f.endsWith('.png')).length;
  console.log(`\n✅ Rimossi: ${removed}`);
  console.log(`📁 File rimanenti: ${remaining} (da ${files.length})`);
  console.log(`📋 index.json: ${Object.keys(index).length} società`);
} else {
  console.log(`\n🔍 DRY RUN — da eliminare: ${removed} file, rimarrebbero: ${files.length - removed} (da ${files.length})`);
  console.log(`📋 Società uniche: ${Object.keys(index).length}`);
  console.log(`\nRilancia con --apply per eseguire`);
}
