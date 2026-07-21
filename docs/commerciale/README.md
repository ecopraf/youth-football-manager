# Database Commerciale — Youth Football Manager

Ultimo aggiornamento: luglio 2026

---

## Struttura

```
docs/commerciale/
├── societa_lazio.csv           ← fonte di verità (~400+ società laziali)
├── societa_<regione>.csv       ← generati da scrape_golee_regione.js (es. societa_campania.csv)
├── send_emails.js              ← invio massivo email + tracciamento CSV (accetta CSV path da CLI)
├── test_email.js               ← test invio su indirizzo personale
├── scrape_golee.js             ← scraper golee.it per provincia RM (Lazio — legacy)
├── scrape_golee_regione.js     ← scraper golee.it generico per qualsiasi regione/province
├── golee_results.json          ← output scraper lazio: tutti i club con email trovata
├── golee_diff.json             ← diff lazio: nuovi/aggiornamenti rispetto al CSV
├── golee_<regione>.json        ← output scraper per altre regioni
├── run_gironi.js               ← scraper TC: recupera email per girone
├── fill_emails.js              ← scraper TC: riempie email mancanti nel CSV
├── clean_csv.js                ← pulizia: rimuove fake, duplicati, non laziali
├── scraper.js                  ← scraper base TC
├── scraper_one.js              ← scraper singola società TC
├── test_girone.js              ← test scraper su singolo girone
├── fix_gironeA.js              ← fix manuale girone A
├── gironi_status.json          ← stato avanzamento scraping per girone
├── .env                        ← credenziali Gmail (non committare)
├── package.json
└── README.md
```

```
press-kit/
├── email-societa.md        ← template email per società sportive ← USATO DA send_emails.js
├── email-generica.md       ← template per redazioni/media
├── email-tuttocampo.md     ← template per Tuttocampo
└── email-sportinoro.md     ← template per Sportinoro
```

---

## Campi CSV (`societa_lazio.csv`)

| Campo | Descrizione |
|---|---|
| `nome_societa` | Nome della società |
| `email` | Email di contatto |
| `scheda_tc` | URL scheda Tuttocampo |
| `stato` | Vedi legenda sotto |
| `data_contatto` | Data invio email (YYYY-MM-DD) |
| `note` | Note libere |
| `risposta` | Esito risposta (vedi legenda) |

---

## Legenda Stato

| Valore | Significato |
|---|---|
| `Da contattare` | Email valida, non ancora inviata |
| `Inviato` | Email inviata — aggiornato automaticamente da `send_emails.js` |
| `Escluso` | Esclusa dall'invio (contatto diretto, duplicato, sqB, ecc.) |

## Legenda Risposta

| Valore | Significato |
|---|---|
| *(vuoto)* | Nessuna risposta ricevuta |
| `Interessato` | Ha risposto positivamente |
| `Richiesta demo` | Ha chiesto una demo |
| `Non interessato` | Ha declinato |
| `Email errata` | Bounce o indirizzo non valido |

---

## Workflow

### Nuova regione (workflow completo)
1. **Scraping** → `node scrape_golee_regione.js <regione>` (province auto-rilevate)
   ```bash
   node scrape_golee_regione.js campania
   node scrape_golee_regione.js lombardia
   node scrape_golee_regione.js italia        # tutte le regioni in un colpo
   node scrape_golee_regione.js --list        # mostra regioni disponibili
   ```
2. **Output**: `societa_<regione>.csv` già pronto con stato `Da contattare`
3. **Test invio** → `node test_email.js`
4. **Invio massivo** → `node send_emails.js societa_<regione>.csv`
5. **Risposte** → aggiornare manualmente colonna `risposta` nel CSV

> ⚠️ `send_emails.js` accetta il CSV come argomento CLI. Senza argomento usa `societa_lazio.csv` (default).
> ⚠️ Le province sono mappate internamente in `scrape_golee_regione.js` — non serve passarle manualmente.

### Fonte Tuttocampo (TC)
1. **Scraping email** → `node run_gironi.js` (recupera email da TC per girone)
2. **Pulizia** → `node clean_csv.js` (rimuove fake, duplicati, non laziali)

### Fonte Golee — Lazio (aggiornamento CSV esistente)
1. **Scraping** → `node scrape_golee.js` (visita golee.it/clubs/?sports=Calcio&provinces=RM)
2. **Analisi diff** → leggere `golee_diff.json`:
   - `nuovi`: società non nel CSV o con email mancante → aggiungere/aggiornare CSV
   - `aggiornamenti`: email diversa da CSV → aggiungere come **nuova riga** (non sovrascrivere — entrambe potrebbero essere valide)
3. **Aggiornamento CSV** → aggiornare email mancanti + appendere nuove righe
4. **Reset stato** → impostare `Da contattare` sulle righe aggiornate

### Note operative Golee (valide per tutti gli script)
- Le email NON sono in `mailto:` links ma nel testo della pagina → regex su `document.body.innerText`
- Filtrare sempre: `.pec.`, `golee`, `lnd.it` (indirizzi di sistema inutili)
- Timeout: usare `domcontentloaded` + 3000ms wait (non `networkidle2` che causa timeout)
- Se Golee ha email diversa da CSV: aggiungere come riga separata con suffisso `(2)` nel nome, non sovrascrivere
- Alcuni club appaiono in più province → `scrape_golee_regione.js` deduplica automaticamente per nome normalizzato

---

## Credenziali

- **Gmail mittente**: youthfootballmanager@gmail.com
- **App Password**: nel file `.env` (non committare mai)
- **Scraper TC**: credenziali in `.env` o hardcoded negli script (account `infinitipiani/paralleli`)

---

## Stato Attuale (luglio 2026)

### Lazio (`societa_lazio.csv`)
| Stato | Conteggio |
|---|---|
| Inviate | ~173 (128 batch TC + 45 batch Golee RM) |
| Da contattare | ~0 |
| Escluse | ~17 |
| **Totale** | **400+** |

### CSV regionali raccolti (Golee — pronti per invio)
| Regione | Club con email | File CSV |
|---|---|---|
| Lombardia | 575 | `societa_lombardia.csv` |
| Emilia-Romagna | 219 | `societa_emilia-romagna.csv` |
| Veneto | 194 | `societa_veneto.csv` |
| Piemonte | 165 | `societa_piemonte.csv` |
| Campania | 111 | `societa_campania.csv` |
| Toscana | 80 | `societa_toscana.csv` |
| Friuli | 80 | `societa_friuli.csv` |
| Sardegna | 74 | `societa_sardegna.csv` |
| Sicilia | 78 | `societa_sicilia.csv` |
| Puglia | 72 | `societa_puglia.csv` |
| Calabria | 63 | `societa_calabria.csv` |
| Trentino | 57 | `societa_trentino.csv` |
| Abruzzo | 46 | `societa_abruzzo.csv` |
| Marche | 43 | `societa_marche.csv` |
| Liguria | 37 | `societa_liguria.csv` |
| Umbria | 33 | `societa_umbria.csv` |
| Basilicata | 15 | `societa_basilicata.csv` |
| Molise | 5 | `societa_molise.csv` |
| Valle d'Aosta | 5 | `societa_valle-d-aosta.csv` |
| **TOTALE** | **~1.953** | |

### Batch inviati
| Data | Regione | Fonte | Quantità | Esito |
|---|---|---|---|---|
| luglio 2026 | Lazio | Tuttocampo (gironi) | ~128 | ✅ |
| luglio 2026 | Lazio | Golee.it (RM) | 45 | ✅ |

---

## Fonti per trovare le società

- **Tuttocampo Lazio** → https://www.tuttocampo.it/Lazio
- **Golee.it (per regione)** → https://golee.it/clubs/?sports=Calcio&provinces=XX (sostituire XX con sigla provincia)
- **FIGC Lazio** → https://www.figclazio.it
- **LND Lazio** → https://lazio.lnd.it

> Le province per ogni regione sono mappate internamente in `scrape_golee_regione.js`.
> Usa `node scrape_golee_regione.js --list` per vedere l'elenco completo.
