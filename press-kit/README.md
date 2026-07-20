# Press Kit — Youth Football Manager

Cartella con tutti i materiali per la comunicazione con redazioni e partner.

## Contenuto

| File | Descrizione |
|---|---|
| `comunicato-stampa.md` | Comunicato stampa ufficiale — per redazioni e blog sportivi |
| `brochure.md` | Testo brochure 2 pagine — da importare su Canva per il layout grafico |
| `email-sportinoro.md` | Email per redazioni sportive locali laziali (es. Sportinoro) |
| `email-tuttocampo.md` | Email per redazioni/piattaforme nazionali (es. Tuttocampo) |

## Come convertire in PDF

### Opzione 1 — Pandoc (da terminale, consigliato)
```bash
# Installa pandoc se non presente
brew install pandoc

# Converti in PDF (richiede LaTeX) o in HTML poi stampa come PDF
pandoc comunicato-stampa.md -o comunicato-stampa.pdf
pandoc brochure.md -o brochure.pdf
```

### Opzione 2 — VS Code
Installa l'estensione **Markdown PDF** → tasto destro sul file → "Markdown PDF: Export (pdf)"

### Opzione 3 — Typora
Apri il file .md con Typora → File → Export → PDF

### Opzione 4 — Canva (per la brochure)
1. Apri Canva → cerca template "brochure A4 bifold"
2. Copia il testo di `brochure.md` nelle sezioni corrispondenti
3. Aggiungi logo, screenshot e colori brand (#667eea)
4. Esporta in PDF

## Screenshot consigliati per la brochure

Da fare nell'app su mobile (375px viewport):

1. **Dashboard** — mostra prossima partita e ultimi risultati
2. **Convocazioni** — lista giocatori con stato risposta (disponibile/indisponibile)
3. **Match Center** — formazione sul campo con modulo

## Note

- Verificare sempre gli indirizzi email delle redazioni prima dell'invio
- Aggiornare la data nel comunicato stampa prima di ogni invio
- La brochure è pensata per essere stampata fronte/retro su A4
