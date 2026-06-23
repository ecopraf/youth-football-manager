# Youth Football Manager - Manuale Utente

Guida completa all'utilizzo della piattaforma per la gestione di una società di calcio giovanile.

---

## Indice

1. [Introduzione](#introduzione)
2. [Accesso e Autenticazione](#accesso-e-autenticazione)
3. [Ruoli e Permessi](#ruoli-e-permessi)
4. [Dashboard](#dashboard)
5. [Rosa Giocatori](#rosa-giocatori)
6. [Calendario Partite](#calendario-partite)
7. [Gestione Partita](#gestione-partita)
8. [Allenamenti](#allenamenti)
9. [Statistiche](#statistiche)
10. [Report](#report)
11. [Impostazioni](#impostazioni)
12. [Gestione Utenti (Admin)](#gestione-utenti-admin)
13. [Link Guest](#link-guest)
14. [FAQ e Supporto](#faq-e-supporto)

---

## Introduzione

**Youth Football Manager** è una piattaforma web per la gestione completa di una società di calcio giovanile.

### Requisiti
- Browser moderno (Chrome, Firefox, Edge, Safari)
- Connessione internet
- Account utente con credenziali

### Struttura dell'Interfaccia
- **Header**: Logo, nome società, categoria selezionata, logout
- **Sidebar**: Menu di navigazione principale
- **Area Contenuto**: Contenuto della pagina selezionata

---

## Accesso e Autenticazione

### Login
1. Accedi a https://youth-football-manager.vercel.app
2. Inserisci **Email** e **Password**
3. Clicca su **Accedi**

### Logout
- Clicca sul pulsante **Logout** nell'header in alto a destra

### Accesso come Guest
Se hai ricevuto un link di accesso via email/SMS:
1. Clicca sul link ricevuto
2. Verrai reindirizzato automaticamente alla Dashboard
3. Potrai accedere solo alle sezioni consentite

---

## Ruoli e Permessi

Il sistema prevede 4 livelli di accesso:

| Ruolo | Descrizione | Accesso |
|-------|-------------|---------|
| **Admin** | Amministratore | Tutto + gestione utenti |
| **Allenatore** | Responsabile tecnico | Rosa, Partite, Convocazioni, Formazioni |
| **Staff** | Assistente | Funzionalità limitate assegnate |
| **Guest** | Ospite temporaneo | Solo lettura, categorie limitate |

### Admin
Ha il controllo completo del sistema:
- Gestisce tutti i moduli
- Può creare e modificare utenti
- Può generare link di accesso guest
- Accede alle impostazioni complete

### Allenatore
Responsabile dell'aspetto tecnico-sportivo:
- Gestisce la rosa giocatori
- Crea e gestisce partite
- Compila formazioni e convocazioni
- Inserisce eventi e valutazioni

### Staff
Ruolo con accesso limitato:
- Funzionalità definite dall'Admin
- Dipende dalla configurazione specifica

### Guest
Accesso temporaneo per genitori/atleti:
- Riceve un link personalizzato
- Accesso limitato a categorie specifiche
- Solo lettura (non può modificare dati)

---

## Dashboard

La Dashboard è la **homepage** dell'applicazione e mostra un riepilogo della stagione.

### Elementi della Dashboard

#### Prossima Partita (Evidenziata)
- **Avversario**: Nome della squadra avversaria
- **Data e Ora**: Quando si gioca
- **Luogo**: Casa o Trasferta
- **Competizione**: Campionato, Coppa, Amichevole
- **Pulsanti**: Convocazioni, Dettagli

#### Widget Statistiche
- **Punti**: Punteggio totale in classifica
- **Giocate**: Partite disputate
- **V/P/S**: Vittorie, Pareggi, Sconfitte
- **GF/GS**: Gol Fatti, Gol Subiti
- **DR**: Differenza Reti

#### Top 3
- **Marcatori**: I 3 giocatori con più gol
- **Assist**: I 3 giocatori con più assist
- **Presenze**: I 3 giocatori più presenti

#### Migliori per Media Voto
Classifica dei giocatori con la migliore media voti nelle partite.

#### Ultimi Risultati
Elenco delle ultime 5 partite con:
- Trend visivo (V/P/S)
- Gol fatti e subiti nelle ultime 5
- Dettaglio per competizione

#### Staff
Visualizza lo staff della squadra:
- Allenatore
- Dirigenti
- Preparatore Atletico
- Allenatore Portieri

---

## Rosa Giocatori

Gestione completa della rosa della squadra.

### Aggiungere un Giocatore
1. Vai su **Rosa**
2. Clicca su **+ Aggiungi Giocatore**
3. Compila i campi:
   - Nome e Cognome
   - Data di Nascita
   - Numero di Maglia
   - Ruolo (Portiere, Difensore, Centrocampista, Attaccante)
   - Telefono (opzionale)
   - Scadenza Visita Medica
4. Clicca su **Salva**

### Modificare un Giocatore
1. Clicca sulla **scheda del giocatore**
2. Modifica i campi desiderati
3. Clicca su **Salva**

### Scheda Giocatore
Cliccando su un giocatore si apre la scheda completa con:
- Dati anagrafici
- Statistiche stagionali
- Storico partite giocate
- Eventi e gol realizzati
- Valutazioni ricevute

### Scadenze Mediche
La sezione mostra i giocatori con visita medica in scadenza (entro 30 giorni).

---

## Calendario Partite

### Vista Calendario
Le partite sono organizzate in 3 sezioni:
1. **⚽ PROSSIMA PARTITA** - Evidenziata in verde
2. **📅 PROSSIME PARTITE** - Da giocare (ordinate per data)
3. **🏆 PARTITE GIOCATE** - Già disputate (ordinate per data decrescente)

### Creare una Nuova Partita
1. Vai su **Calendario**
2. Clicca su **+ Nuova Partita**
3. Compila i campi:
   - **Data e Ora**
   - **Avversario**
   - **Luogo**: Casa / Trasferta
   - **Competizione**: Campionato, Coppa, Amichevole
   - **Giornata**: Numero giornata (opzionale)
4. Clicca su **Salva**

### Modificare/Eliminare una Partita
- **Modifica**: Clicca sull'icona ✏️
- **Elimina**: Clicca sull'icona 🗑️ (solo partite future senza eventi)

### Archiviare una Partita
Dopo aver inserito il risultato:
1. Clicca su **📦 Archivia**
2. La partita diventa di sola lettura
3. Per sbloccare: clicca su **🔓 Sblocca**

---

## Gestione Partita

Dalla lista partite, ogni partita mostra pulsanti contestuali:

### Partite Future (senza risultato)
| Pulsante | Funzione |
|----------|----------|
| 📋 Formazione | Definisci titolari e panchina |
| 📝 Note | Note tattiche sull'avversario |
| 👥 Convocazioni | Seleziona i giocatori convocati |
| 🖨️ Distinta | Genera PDF FIGC |
| ✏️ Modifica | Modifica dati partita |
| 🗑️ Elimina | Elimina partita |

### Partite Future (con risultato)
| Pulsante | Funzione |
|----------|----------|
| 📋 Formazione | Visualizza/modifica formazione |
| 📝 Note | Note tattiche |
| 👥 Convocazioni | Visualizza convocazioni |
| 🖨️ Distinta | PDF FIGC |
| ✏️ Eventi | Inserisci gol, assist, cartellini |
| ✏️ Modifica | Modifica dati |
| 🗑️ Elimina | Elimina partita |

### Partite Passate
| Pulsante | Funzione |
|----------|----------|
| 📋 Formazione | Visualizza formazione |
| 👥 Convocazioni | Visualizza convocazioni |
| 🖨️ Distinta | PDF FIGC |
| 📦 Archivia | Blocca modifiche |

### Inserire Risultato ed Eventi
1. Clicca su **✏️ Eventi** (solo per partite con risultato)
2. Inserisci il **Risultato Finale**
3. Aggiungi **Eventi**:
   - ⚽ **Gol** - Seleziona giocatore e minuto
   - 🅰️ **Assist** - Giocatore che ha servito il gol
   - 🟨 **Ammonizione** - Giocatore e minuto
   - 🟥 **Espulsione** - Giocatore e minuto
   - 🔄 **Sostituzione** - Giocatori IN/OUT e minuto
4. Clicca su **Salva**

### Convoca Giocatori
1. Clicca su **👥 Convocazioni**
2. Seleziona i giocatori dalla lista
3. Eventuali osservazioni nel campo note
4. Clicca su **Salva**

### Genera Distinta FIGC
1. Clicca su **🖨️ Distinta**
2. Sistema compila automaticamente campi e giocatori
3. Clicca su **Stampa PDF**

---

## Allenamenti

Gestione del calendario allenamenti e presenze.

### Creare un Allenamento
1. Vai su **Allenamenti**
2. Clicca su **+ Nuovo Allenamento**
3. Inserisci:
   - Data e ora
   - Durata
   - Luogo
   - Descrizione/Note
   - Materiali necessari
4. Salva

### Segnare Presenze
1. Apri l'allenamento
2. Segna presente/assente per ogni giocatore
3. Eventuali note individuali

---

## Statistiche

### Statistiche Disciplina
Visualizza:
- Ammonizioni totali per giocatore
- Espulsioni
- Squalifiche automatiche (3 ammonizioni)

---

## Report

### Report Partita
Genera un report dettagliato per singola partita:
- Eventi
- Statistiche
- Valutazioni

### Report Stagionale
Riepilogo completo della stagione:
- Classifica marcatori
- Statistiche di squadra
- Andamento

### Report Giocatore
Scheda dettagliata singolo giocatore:
- Presenze
- Gol e assist
- Valutazioni medie

---

## Impostazioni

### Dati Società
- Nome società
- Logo
- Contatti

### Stagione
- Anno inizio/fine
- Categorie attive

### Staff Squadra
- Allenatore
- Dirigenti
- Preparatore Atletico
- Allenatore Portieri

---

## Gestione Utenti (Admin)

Sezione riservata agli amministratori per gestire gli account.

### Accedere
1. Clicca su **Utenti** nel menu
2. Richiede account con ruolo **Admin**

### Creare un Nuovo Utente
1. Clicca su **+ Nuovo Utente**
2. Compila:
   - Nome e Cognome
   - Email
   - Password
   - Ruolo (Admin/Allenatore/Staff)
   - **Categorie Accesso**: Seleziona quali categorie può vedere
   - **Attivo**: Sì/No
3. Clicca su **Salva**

### Modificare un Utente
1. Clicca sull'icona ✏️ accanto all'utente
2. Modifica i campi desiderati
3. Clicca su **Salva**

### Disattivare un Utente
1. Clicca sull'icona 🗑️
2. L'utente non potrà più accedere

### Assegnare Categorie
Nel campo **Categorie Accesso** seleziona le squadre/categorie che l'utente può gestire. L'utente vedrà solo quelle.

---

## Link Guest

Sistema per dare accesso temporaneo a genitori o atleti.

### Accedere
1. Vai su **Link Guest** nel menu
2. Richiede account **Admin**

### Generare un Link
1. Clicca su **+ Genera Link**
2. Compila:
   - **Tipo**: Atleta o Genitore
   - **Categorie**: Seleziona le categorie accessibili
   - **Scadenza**: Numero di giorni di validità
3. Clicca su **Genera**
4. **Copia il link** generato
5. Invia il link via email/SMS al destinatario

### Revocare un Link
1. Clicca su **🗑️ Revoca** accanto al link
2. Il link diventa immediatamente non utilizzabile

### Usare un Link Guest
1. Il destinatario clicca sul link
2. Viene reindirizzato alla Dashboard
3. Può vedere solo le categorie e le funzionalità consentite

---

## FAQ e Supporto

### Ho dimenticato la password
Contatta l'amministratore del sistema per un reset.

### Non vedo tutte le categorie
Verifica con l'Admin che ti siano state assegnate le categorie corrette.

### Il link guest non funziona
- Verifica che non sia scaduto
- Controlla di aver copiato l'intero URL
- Il link potrebbe essere stato revocato

### Non posso modificare una partita
La partita potrebbe essere stata archiviata. Contatta un Admin per sbloccarla.

### Come aggiungo un nuovo allenatore?
Solo un Admin può creare account. Contatta l'amministratore.

### Posso vedere le statistiche di un giocatore specifico?
Sì, clicca sulla scheda del giocatore dalla Rosa.

---

## Contatti e Supporto

Per assistenza tecnica o segnalazione bug:
- **Email**: support@example.com
- **GitHub Issues**: https://github.com/ecopraf/youth-football-manager/issues

---

*Documento aggiornato: Giugno 2026*
*Versione: 1.0*
