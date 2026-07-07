/**
 * Calcolo Codice Fiscale italiano
 * Algoritmo completo con lookup codici catastali (Belfiore)
 */

const MESI = { 1:'A', 2:'B', 3:'C', 4:'D', 5:'E', 6:'H', 7:'L', 8:'M', 9:'P', 10:'R', 11:'S', 12:'T' };

const DISPARI = { '0':1,'1':0,'2':5,'3':7,'4':9,'5':13,'6':15,'7':17,'8':19,'9':21,
  'A':1,'B':0,'C':5,'D':7,'E':9,'F':13,'G':15,'H':17,'I':19,'J':21,'K':2,'L':4,'M':18,
  'N':20,'O':11,'P':3,'Q':6,'R':8,'S':12,'T':14,'U':16,'V':10,'W':22,'X':25,'Y':24,'Z':23 };

const PARI = { '0':0,'1':1,'2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,
  'A':0,'B':1,'C':2,'D':3,'E':4,'F':5,'G':6,'H':7,'I':8,'J':9,'K':10,'L':11,'M':12,
  'N':13,'O':14,'P':15,'Q':16,'R':17,'S':18,'T':19,'U':20,'V':21,'W':22,'X':23,'Y':24,'Z':25 };

function consonanti(s) { return s.replace(/[^BCDFGHJKLMNPQRSTVWXYZ]/g, ''); }
function vocali(s) { return s.replace(/[^AEIOU]/g, ''); }

function codCognome(cognome) {
  const s = cognome.toUpperCase().replace(/[^A-Z]/g, '');
  const c = consonanti(s), v = vocali(s);
  let r = c + v + 'XXX';
  return r.substring(0, 3);
}

function codNome(nome) {
  const s = nome.toUpperCase().replace(/[^A-Z]/g, '');
  const c = consonanti(s);
  if (c.length >= 4) return c[0] + c[2] + c[3];
  const v = vocali(s);
  let r = c + v + 'XXX';
  return r.substring(0, 3);
}

function codDataSesso(data, sesso) {
  // data: YYYY-MM-DD, sesso: M/F
  const [y, m, d] = data.split('-').map(Number);
  const anno = String(y).slice(-2);
  const mese = MESI[m];
  let giorno = d;
  if (sesso === 'F') giorno += 40;
  return anno + mese + String(giorno).padStart(2, '0');
}

function carattereControllo(partial) {
  const s = partial.toUpperCase();
  let sum = 0;
  for (let i = 0; i < 15; i++) {
    sum += (i % 2 === 0) ? DISPARI[s[i]] : PARI[s[i]];
  }
  return String.fromCharCode(65 + (sum % 26));
}

/**
 * Calcola il codice fiscale
 * @param {string} cognome
 * @param {string} nome
 * @param {string} dataNascita - formato YYYY-MM-DD
 * @param {string} sesso - 'M' o 'F'
 * @param {string} codiceBelfiore - codice catastale del comune (es. 'H501' per Roma)
 * @returns {string} codice fiscale di 16 caratteri
 */
export function calcolaCodiceFiscale(cognome, nome, dataNascita, sesso, codiceBelfiore) {
  if (!cognome || !nome || !dataNascita || !codiceBelfiore) return '';
  const partial = codCognome(cognome) + codNome(nome) + codDataSesso(dataNascita, sesso || 'M') + codiceBelfiore.toUpperCase();
  return partial + carattereControllo(partial);
}

/**
 * Cerca comuni per nome (fuzzy)
 * @param {string} query - testo da cercare
 * @returns {Promise<Array<{nome: string, codice: string, provincia: string}>>}
 */
let comuniCache = null;
export async function cercaComune(query) {
  if (!query || query.length < 2) return [];
  if (!comuniCache) {
    const resp = await fetch('/data/comuni.json');
    const raw = await resp.json();
    // Format: [[nome, codice, provincia], ...]
    comuniCache = raw.map(c => ({ nome: c[0], codice: c[1], provincia: c[2] }));
  }
  const q = query.toLowerCase();
  return comuniCache.filter(c => c.nome.toLowerCase().startsWith(q)).slice(0, 10);
}
