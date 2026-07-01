# Youth Football Manager - Manuale Utente

Guida completa all'utilizzo della piattaforma per la gestione di squadre di calcio giovanili.

**Versione**: v3.15 | **Ultimo aggiornamento**: Luglio 2026

---

## Indice

1. [Introduzione](#introduzione)
2. [Accesso](#accesso)
3. [Ruoli e Permessi](#ruoli-e-permessi)
4. [Dashboard](#dashboard)
5. [Rosa Giocatori](#rosa-giocatori)
6. [Calendario Partite](#calendario-partite)
7. [Gestione Partita](#gestione-partita)
8. [Formazione](#formazione)
9. [Allenamenti](#allenamenti)
10. [Statistiche](#statistiche)
11. [Report](#report)
12. [Impostazioni](#impostazioni)
13. [Gestione Utenti (Admin)](#gestione-utenti-admin)
14. [Link Guest](#link-guest)
15. [Help Contestuale](#help-contestuale)
16. [FAQ](#faq)

---

## Introduzione

**Youth Football Manager** è una piattaforma web per la gestione completa di società di calcio giovanili. Permette di gestire rosa, partite, formazioni, allenamenti, statistiche e molto altro.

### Requisiti
- Browser moderno (Chrome, Firefox, Edge, Safari)
- Connessione internet
- Account utente fornito dall'amministratore

### Struttura dell'Interfaccia
- **Sidebar** (sinistra): Menu di navigazione con sezioni espandibili
- **Header** (alto): Logo società, selettore squadra/categoria, profilo utente
- **Area Contenuto** (centro): Pagina attiva
- **Bottone ?** (basso destra): Help contestuale per la pagina corrente

---

## Accesso

### Login
1. Vai su https://youth-football-manager.vercel.app
2. Inserisci **Email** e **Password**
3. Clicca su **🔐 Accedi**

> ⚠️ Non hai un account? Contatta il tuo amministratore. La registrazione è riservata ad admin/superadmin.

### Logout
- Clicca sull'avatar in alto a destra → **🚪 Logout**

### Cambio Squadra/Categoria
- Usa il selettore nel header per passare tra le categorie (es. Under 15, Under 16)

### Cambio Workspace (Superadmin)
- Il superadmin può gestire più società: usa il selettore nella sidebar

---

## Ruoli e Permessi

| Ruolo | Descrizione | Accesso |
|-------|-------------|---------|
| **Superadmin** | Sviluppatore/Owner | Tutto + multi-workspace |
| **Admin** | Amministratore società | Tutto + gestione utenti e link guest |
| **Allenatore** | Responsabile tecnico | Rosa, Partite, Formazioni, Allenamenti |
| **Staff** | Assistente | Funzionalità limitate assegnate |
| **Guest** | Ospite temporaneo | Solo lettura via link |

---

## Dashboard

La homepage mostra un riepilogo della stagione:

### Widget Statistiche (8)
Punti | Giocate | V | P | S | GF | GS | DR

### Prossima Partita
- Avversario, data/ora, luogo, competizione
- Pulsante rapido **Convocazioni**

### Top 3
- ⚽ **Marcatori**: i 3 con più gol
- 🅰️ **Assistmen**: i 3 con più assist
- 🏃 **Presenze**: i 3 più presenti

### Ultimi Risultati
- Trend ultime 5 partite (V/P/S colorati)
- GF, GS, DR delle ultime 5
- Click su una partita → apre il dettaglio

### Staff
- Allenatore, Dirigente, Preparatore, All. Portieri

---

## Rosa Giocatori

### Visualizzazione
- Giocatori raggruppati per ruolo (Portieri, Difensori, Centrocampisti, Attaccanti)
- Conteggio per ruolo nel sottotitolo
- Badge stato (Attivo/Infortunato)

### Aggiungere un Giocatore
1. Clicca **+ Aggiungi**
2. Compila: Nome, Cognome, Data Nascita, Ruolo, N. Maglia, Telefono, Visita Medica, Matricola FIGC, Documenti
3. **Salva**

### Scheda Giocatore
Click su un giocatore → scheda completa con:
- Dati anagrafici
- Statistiche stagionali (gol, assist, presenze)
- Storico partite

### Scadenze Mediche
Alert automatico per certificati in scadenza (entro 30 giorni).

### Selezione Multipla (Admin)
- **☐ Seleziona** → attiva modalità selezione
- **🗑️ Elimina** multipli
- **↗️ Sposta** in altra categoria

---

## Calendario Partite

### Layout
- **🟢 PROSSIMA**: partita evidenziata in verde
- **📅 IN ARRIVO**: partite future
- **🏆 GIOCATE**: partite passate

### Card Partita
Ogni partita mostra:
- **Avversario** (grande)
- **Badge**: 🏠 Casa / ✈️ Trasferta, Competizione, Giornata
- **Data compatta**: es. "Sab 12 Lug · 15:30"
- **Risultato**: badge colorato (verde vittoria, rosso sconfitta, giallo pareggio)
- **Progress dots** (partite future): Conv → Form → Ris → Ev
- **Bordo sinistro** colorato per esito

### Indicatore LIVE
Se una partita futura ha già un risultato inserito → mostra pallino rosso lampeggiante + "LIVE"

### Azioni
- **+ Nuova**: crea partita
- **📥 Importa CSV**: importazione massiva
- **📦 Archivia**: blocca modifiche (partite concluse)
- **🔓 Sblocca**: riabilita modifiche

### Pulsanti per Partita
| Pulsante | Funzione |
|----------|----------|
| 📋 Convoca | Gestisci convocazioni |
| 🏟️ Formazione | Campo visuale con drag&drop |
| 📄 Distinta | Genera PDF FIGC |
| 📝 Note | Note tattiche sull'avversario |
| ⚽ Risultato/Eventi | Inserisci gol, assist, cartellini |

---

## Gestione Partita

### Convocazioni
1. Clicca **📋 Convoca**
2. Seleziona i giocatori (min 11, max 20)
3. **💾 Salva** (salvataggio batch, veloce)

### Risultato ed Eventi
1. Clicca **⚽ Risultato**
2. Aggiungi eventi: Gol, Assist, Ammonizione, Espulsione, Sostituzione
3. Per ogni evento: seleziona giocatore + minuto
4. **💾 Salva Eventi**

### Note Avversario
- Note tattiche ereditate automaticamente da partite precedenti contro lo stesso avversario
- Modificabili per ogni partita

### Distinta FIGC
1. Clicca **📄 Distinta**
2. Se c'è formazione → ordina titolari per numero maglia, poi riserve
3. Se solo convocati → ordine alfabetico
4. **👥 Staff**: seleziona da dropdown o inserisci manualmente (nome, matricola, tessera)
5. **🖨️ Stampa** → genera PDF formato FIGC

---

## Formazione

### Campo Visuale
La formazione si gestisce su un **campo da calcio visuale**:

#### Desktop
- **Seleziona modulo** (4-3-3, 4-4-2, 3-5-2, ecc. — 8 moduli disponibili)
- **Trascina** giocatori dalla lista a destra verso gli slot sul campo
- **Sposta** pallini liberamente sul campo (pointer drag)
- **Click** su un pallino per rimuoverlo

#### Mobile
- **Tap** su un giocatore nella lista (si evidenzia in viola)
- **Tap** su uno slot vuoto per posizionarlo
- **Tap** su slot occupato per sostituire (swap immediato)
- **Long-press + drag** per spostare posizioni custom

### Suggerimenti Ruolo
Quando selezioni un giocatore:
- 🟡 **Slot gialli** (pulsanti): posizione suggerita per il suo ruolo
- ⚪ **Slot bianchi**: posizioni alternative (fuori ruolo, consentite)
- 🔴 **Slot bloccati**: portiere ↔ non-portiere (vincolo hard)

### Validazione
- Esattamente **11 titolari** richiesti
- Esattamente **1 portiere** tra i titolari
- Posizioni custom salvate nel DB (persistenti)

---

## Allenamenti

La sezione Allenamenti è divisa in **3 sotto-pagine** (menu espandibile nella sidebar):

### 📋 Sedute
Pianificazione del programma di allenamento:

1. **Calendario mensile**: seleziona un giorno programmato (pallino verde)
2. **Programma seduta**:
   - Tipo (Tattico, Tecnico, Atletico, Partita a tema, Possesso palla, Difensivo, Misto)
   - Obiettivo
   - Fasi strutturate (Riscaldamento → Tecnica → Tattica → Atletica → Partita → Defaticamento)
   - Materiale (coni, paletti, over, casacche, ecc.)
   - Note
3. **Template**: salva un programma come template per riutilizzarlo

### 🙋 Presenze
Gestione presenze/assenze:

1. **Calendario**: seleziona il giorno
2. **Segna assenti**: checkbox rossa + motivo (Impegni Scolastici, Motivi Familiari, Infortunio, Malattia)
3. **💾 Salva Presenze** (batch, una sola chiamata)
4. **Riepilogo**: tabella con % presenze per giocatore (verde ≥80%, giallo ≥60%, rosso <60%)

### ⚙️ Impostazioni
Configurazione:

1. **Settimana tipo**: giorni e orari di allenamento (+ Aggiungi giorno)
2. **Template sedute**: card compatte con dettaglio (tipo, durata, fasi colorate)
   - Click su card → modale modifica completa
   - **+ Nuovo Template** per crearne uno da zero

### Calendario Allenamenti
- 🟢 **Pallino verde pieno**: presenze registrate
- 🟢 **Pallino verde chiaro**: giorno programmato (dalla settimana tipo)
- 🟠 **Riquadro arancione**: giorno partita (con dettaglio avversario)
- 🔵 **Bordo blu**: oggi
- I giorni partita **non** permettono la creazione di sedute

---

## Statistiche

### Widget (5)
| Partite | ⚽ Gol | 🅰️ Assist | 🟨 Amm. | 🟥 Esp. |

### Alert Diffidati
Box arancione con giocatori a 4 ammonizioni (prossimo giallo = squalifica).

### Tabella Giocatori
| Giocatore | Ruolo | Pres. | Min | ⚽ | 🅰️ | 🟨 | 🟥 |

- **Click su colonna** per ordinare (toggle ▲/▼)
- **Badge ruolo** colorati: POR giallo, DIF blu, CEN verde, ATT rosso
- **Minutaggio**: calcolato per categoria (U15=70', U16=80', U17+=90')
- Valori zero in grigio `-`, positivi colorati e bold

---

## Report

### Report Partita
Seleziona una partita terminata → genera report con eventi, statistiche, valutazioni.

### Report Stagionale
Riepilogo completo: classifica marcatori, statistiche squadra, andamento.

### Report Giocatore
Scheda individuale: presenze, gol, assist, valutazioni medie.

Tutti i report sono stampabili in **PDF** (🖨️ Stampa).

---

## Impostazioni

### Dati Società (Workspace)
- Nome, Logo, Indirizzo, Contatti

### Stagione
- Anno inizio/fine, Stagione attiva

### Staff Squadra
- Gestito tramite la sezione Staff (assegnazione ruoli alla squadra)

---

## Gestione Utenti (Admin)

Sezione riservata agli amministratori.

### Creare un Utente
1. Vai su **👥 Utenti**
2. Clicca **+ Nuovo Utente**
3. Compila: Nome, Cognome, Email, Password, Ruolo, Categorie Accesso
4. **Salva**

### Modificare/Disattivare
- ✏️ Modifica ruolo, categorie, stato attivo
- 🗑️ Disattiva (soft delete, non elimina)

---

## Link Guest

Accesso temporaneo per genitori o atleti.

### Generare un Link
1. Vai su **🔗 Link Guest**
2. Clicca **+ Genera Link**
3. Seleziona: Tipo (Atleta/Genitore), Categorie, Scadenza
4. **Copia il link** e invialo

### Revocare
- Clicca 🗑️ accanto al link → diventa immediatamente non utilizzabile

---

## Help Contestuale

Su ogni pagina è presente un **bottone ?** viola in basso a destra.

- **Click** → apre un popover con la guida della pagina corrente
- **Chiusura**: click su ×, click fuori, o re-click su ?
- Disponibile su: Dashboard, Rosa, Calendario, Sedute, Presenze, Impostazioni, Statistiche, Report

---

## FAQ

### Non ho un account
Contatta l'amministratore della tua società. Solo admin/superadmin possono creare utenti.

### Non vedo tutte le categorie
L'admin potrebbe aver limitato il tuo accesso a categorie specifiche.

### Il link guest non funziona
- Potrebbe essere scaduto
- Potrebbe essere stato revocato
- Verifica di aver copiato l'URL completo

### Non posso modificare una partita
La partita è stata archiviata. Chiedi a un admin di sbloccarla (🔓).

### Come salvo la formazione?
Posiziona esattamente 11 titolari (con 1 portiere) → il bottone 💾 si abilita.

### Le presenze non si salvano
Verifica di aver selezionato un giorno dal calendario prima di cliccare Salva.

---

## Contatti

- **Email**: youthfootballmanager@gmail.com
- **GitHub**: https://github.com/ecopraf/youth-football-manager
- **Demo**: https://youth-football-manager-demo.vercel.app

---

*Versione documento: 2.0 | Luglio 2026*
