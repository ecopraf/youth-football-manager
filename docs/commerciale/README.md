# Database Commerciale — Youth Football Manager

Ultimo aggiornamento: luglio 2026

---

## Struttura

```
docs/commerciale/
├── societa_lazio.csv       ← fonte di verità (339 società laziali)
├── send_emails.js          ← invio massivo email + tracciamento CSV
├── test_email.js           ← test invio su indirizzo personale
├── run_gironi.js           ← scraper TC: recupera email per girone
├── fill_emails.js          ← scraper TC: riempie email mancanti nel CSV
├── clean_csv.js            ← pulizia: rimuove fake, duplicati, non laziali
├── scraper.js              ← scraper base TC
├── scraper_one.js          ← scraper singola società TC
├── test_girone.js          ← test scraper su singolo girone
├── fix_gironeA.js          ← fix manuale girone A
├── gironi_status.json      ← stato avanzamento scraping per girone
├── .env                    ← credenziali Gmail (non committare)
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

1. **Scraping email** → `node run_gironi.js` (recupera email da TC per girone)
2. **Pulizia** → `node clean_csv.js` (rimuove fake, duplicati, non laziali)
3. **Test invio** → `node test_email.js` (invia a coppola.raffaele@gmail.com)
4. **Invio massivo** → `node send_emails.js` (invia solo `Da contattare`, traccia `Inviato`)
5. **Risposte** → aggiornare manualmente colonna `risposta` nel CSV

> ⚠️ `send_emails.js` è rieseguibile senza duplicati: salta automaticamente `Inviato` ed `Escluso`

---

## Credenziali

- **Gmail mittente**: youthfootballmanager@gmail.com
- **App Password**: nel file `.env` (non committare mai)
- **Scraper TC**: credenziali in `.env` o hardcoded negli script (account `infinitipiani/paralleli`)

---

## Stato Attuale (luglio 2026)

| Stato | Conteggio |
|---|---|
| Inviate | ~128 |
| Da contattare | ~0 (batch completato) |
| Escluse | ~17 |
| Senza email | ~198 |
| **Totale società** | **327** |

---

## Fonti per trovare le società

- **Tuttocampo Lazio** → https://www.tuttocampo.it/Lazio
- **FIGC Lazio** → https://www.figclazio.it
- **LND Lazio** → https://lazio.lnd.it
