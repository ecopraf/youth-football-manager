/**
 * helpData.js - Definizioni help contestuale
 * 
 * PAGE_HELP: help generale della pagina (mostrato nel popover "?")
 * ELEMENT_HELP: help specifico per elemento (mostrato al click in modalità help)
 * 
 * Convenzione data-help: "pagina.elemento" (es: "dashboard.widgets", "roster.btnAggiungi")
 */

export const PAGE_HELP = {
  dashboard: {
    title: '📊 Dashboard',
    desc: 'Panoramica completa della squadra: statistiche, prossima partita, classifiche e top players. Personalizzabile per ruolo.',
    items: [
      'Cambia squadra dal selettore in alto a destra',
      'Click su una partita per aprire il dettaglio',
      'Click su un giocatore nel podio per la scheda completa',
      'Usa ⚙️ Organizza per riordinare o nascondere i widget',
      'Segreteria: widget Certificati e Prossima Convocazione in evidenza',
      '🏥 Indisponibili = infortunati non utilizzabili per la partita',
      '❌ Assenti = giocatori che hanno comunicato assenza (non infortunio)'
    ]
  },
  roster: {
    title: '👥 Rosa',
    desc: 'Gestione completa della rosa: aggiungi, modifica, svincola giocatori.',
    items: [
      'Click su un giocatore per aprire la scheda',
      'Usa i filtri per ruolo o stato',
      'Modalità selezione per operazioni multiple'
    ]
  },
  calendar: {
    title: '📅 Calendario',
    desc: 'Tutte le partite della stagione: future e disputate.',
    items: [
      'Click sulla card per il dettaglio partita',
      'Pallini colorati indicano lo stato di completamento',
      'Usa ⚽ Match Center per gestire la partita live (eventi, formazione, note)',
      'Convoca i giocatori e genera la Distinta dai bottoni dedicati',
      'Archivia le partite concluse per bloccare modifiche',
      'Nuova partita: scegli tipo (Amichevole/Campionato/Coppa/Torneo)',
      'Autocomplete avversario con loghi dal database'
    ]
  },
  matchDetail: {
    title: '⚽ Dettaglio Partita',
    desc: 'Gestisci tutti gli aspetti di una singola partita.',
    items: [
      'Inserisci risultato, formazione, eventi e convocazioni',
      'Archivia quando tutto è completo',
      'Genera il report PDF dalla sezione Report'
    ]
  },
  matchCenter: {
    title: '⚽ Match Center',
    desc: 'Centro di comando della partita: gestisci live, eventi, formazione e note da un unico punto.',
    items: [
      'Usa le Azioni Rapide per registrare gol, ammonizioni e sostituzioni',
      'Il bottone di stato gestisce il flusso: Inizio 1°T → Fine 1°T → Inizio 2°T → Fine Partita',
      'Il bottone si disabilita per il tempo regolamentare (35-45 min) per evitare click accidentali',
      'In emergenza (partita sospesa, arbitro fischia prima): tieni premuto 3 secondi per forzare',
      'Tab Formazione: mostra Iniziale e Finale (con sub-tabs) se ci sono state sostituzioni',
      'Tab Note: appunti con timestamp automatico del minuto live',
      'Tab Import: incolla tabellino da Tuttocampo per importare eventi',
      'Max 7 sostituzioni per partita (contatore visibile)',
      'Partite passate senza live: usa "📊 Registra Risultato" per confermare il punteggio',
      'Salva per confermare risultato, eventi e note',
      'Doppio-click su ? per help interattivo sugli elementi'
    ]
  },
  stats: {
    title: '📊 Statistiche',
    desc: 'Tabella riepilogativa con tutte le statistiche individuali.',
    items: [
      'Click su intestazione colonna per ordinare',
      'Alert automatico per giocatori diffidati (4 ammonizioni)',
      'Minutaggio calcolato in base alla categoria'
    ]
  },
  reports: {
    title: '📄 Report Squadra',
    desc: 'Genera report PDF per partita, stagione o singolo giocatore.',
    items: [
      'Report Partita: formazione, eventi, statistiche individuali',
      'Report Stagionale: riepilogo completo con top marcatori e presenze',
      'Report Giocatore: statistiche, storico partite e carriera individuale',
      'Checkbox Amichevoli per includere/escludere le amichevoli dai conteggi',
      'Genera → anteprima → Stampa/Salva PDF'
    ]
  },
  printCenter: {
    title: '📄 Print Center',
    desc: 'Hub centralizzato per tutti i documenti stampabili della squadra. Seleziona una partita e genera documenti in 2 tap.',
    items: [
      'Seleziona la partita dal dropdown (auto-seleziona prossima/ultima)',
      'Card colorate indicano disponibilità: ✔ pronto, ⏳ non compilato, 🔒 post-partita',
      'Documenti Match Day: Convocazione, Distinta, Formazione, Report Gara',
      'Documenti Squadra: Registro Presenze, Elenco Tesserati, Scadenze Mediche, Report Squadra',
      'Varianti disponibili: con telefoni, con staff, formato torneo',
      'Sezione Recenti: ultimi 10 documenti aperti per accesso rapido',
      'Condividi via Web Share o copia link negli appunti'
    ]
  },
  trainingSessions: {
    title: '📋 Sedute Allenamento',
    desc: 'Pianifica le sedute settimanali con fasi e programmi.',
    items: [
      'Click su un giorno verde per aprire/creare la seduta',
      'Giorni arancioni = partita (no allenamento)',
      'Salva come Template per riutilizzare'
    ]
  },
  trainingPresenze: {
    title: '🙋 Presenze Allenamenti',
    desc: 'Registra presenze e assenze per ogni seduta.',
    items: [
      'Seleziona il giorno dal calendario',
      'Spunta gli assenti e indica il motivo',
      'Riepilogo con % presenze per giocatore'
    ]
  },
  trainingSettings: {
    title: '⚙️ Impostazioni Allenamenti',
    desc: 'Configura la settimana tipo e gestisci i template.',
    items: [
      'Settimana tipo: giorni e orari fissi',
      'Template: programmi riutilizzabili'
    ]
  },
  importCenter: {
    title: '📥 Import Center',
    desc: 'Importa dati da fonti esterne: rosa, calendario, formazioni.',
    items: [
      'Calendario PDF: carica il PDF SGS/LND con drag & drop',
      'Calendario Testo: copia-incolla dal sito SGS',
      'Rosa XLS: upload tabulato atleti FIGC (.xlsx)',
      'Portale Regionale: classifica, calendario e marcatori dal girone',
      'Preview dei dati prima della conferma',
      'Storico importazioni in basso'
    ]
  },
  staff: {
    title: '👔 Staff',
    desc: 'Gestione del personale tecnico e societario.',
    items: [
      'Aggiungi staff con ruolo e qualifiche',
      'Assegna a una o più categorie'
    ]
  },
  club: {
    title: '🏢 Società',
    desc: 'Informazioni sulla società, organigramma, riferimenti societari e campo di casa.',
    items: [
      'Visualizza staff e ruoli',
      'Riferimenti Societari: P.IVA, C.F., matricola FIGC, SDI, indirizzo, contatti, colori, sponsor',
      'Campo di Casa: nome impianto e indirizzo',
      'Modifica dati (admin/segreteria): bottone \u270F\uFE0F Modifica nella card',
      'Import rapido: incolla testo da Tuttocampo o documento ufficiale \u2192 i campi vengono precompilati automaticamente'
    ]
  },
  seasonsCategories: {
    title: '📅 Stagioni e Categorie',
    desc: 'Gestisci stagioni sportive e categorie d\'età.',
    items: [
      'Crea nuova stagione o categoria',
      'Attiva la stagione corrente',
      'Crea team per categoria+stagione'
    ]
  },
  users: {
    title: '👥 Utenti',
    desc: 'Gestione utenti, ruoli e permessi di accesso.',
    items: [
      'Crea utenti con ruolo e permessi granulari',
      'Limita accesso per categoria',
      'Disattiva utenti senza eliminarli'
    ]
  },
  guestLinks: {
    title: '🔗 Link Guest',
    desc: 'Genera link temporanei per genitori o osservatori.',
    items: [
      'Scegli tipo: genitore (vede solo il figlio) o osservatore',
      'Imposta scadenza',
      'Revoca in qualsiasi momento'
    ]
  },
  supportTickets: {
    title: '🎫 Ticket di Supporto',
    desc: 'Gestisci le segnalazioni inviate dagli utenti.',
    items: [
      'Filtri: Aperti / Chiusi / Tutti',
      'Clicca su un ticket per espandere i dettagli e scrivere una risposta',
      'Invia risposta: l\'utente riceve un\'email con il tuo messaggio',
      'Chiudi senza risposta: segna il ticket come risolto senza inviare email',
      'Pulisci ticket chiusi: elimina tutti i ticket con stato chiuso in un click'
    ]
  },
  inbox: {
    title: '📬 Inbox',
    desc: 'Tutte le comunicazioni in entrata in un unico posto.',
    items: [
      'Tab Tutti: aggrega assenze, convocazioni, bonifici e avvisi',
      'Messaggi non letti evidenziati con bordo blu e badge Nuovo',
      'Clicca su un messaggio per espandere i dettagli e segnarlo come letto',
      'Azioni rapide: vai all\'allenamento (assenze), vai al calendario (convocazioni), conferma bonifico',
      'Segna tutti letti: azzera tutti i badge in un click',
      'Archivio: messaggi letti oltre 30 giorni fa collassati in fondo'
    ]
  },
  notifications: {
    title: '🔔 Centro Notifiche',
    desc: 'Comunicazioni in-app e segnalazioni assenze in un unico punto.',
    items: [
      'Tab Inviate: comunicazioni create da te (convocazioni, promemoria quote, avvisi)',
      'Tab Ricevute: assenze, indisponibilità, ricevute bonifico caricate dalle famiglie',
      'Ricevute bonifico: ✅ Conferma (segna rata pagata), ❌ Rifiuta (notifica famiglia), 👁 Vedi (preview PDF/immagine)',
      'Click ○ per segnare come letta, click Apri per andare alla convocazione',
      'Badge campanella in header mostra il totale non lette'
    ]
  },
  convocazioni: {
    title: '📋 Convocazioni',
    desc: 'Seleziona i giocatori da convocare per la partita e genera il documento ufficiale.',
    items: [
      'Spunta i giocatori da convocare (min 11, max 20)',
      'Usa Tutti/Nessuno per selezione rapida',
      'Giocatori infortunati mostrano badge 🤕 (selezionabili se in recupero)',
      'Chi ha comunicato assenza per la data partita è congelato con badge 🚫',
      'Salva → Pubblica per inviare notifica ad atleti e genitori',
      'Dopo la pubblicazione, atleti possono segnalare indisponibilità',
      '📄 Vedi Convocazione genera il documento stampabile con intestazione società'
    ]
  },
  formazione: {
    title: '🏟️ Formazione',
    desc: 'Scegli modulo tattico, posiziona i giocatori sul campo e assegna i numeri di maglia per la partita.',
    items: [
      'Seleziona il modulo dal dropdown (4-3-3, 4-4-2, 3-5-2, ecc.)',
      'Desktop: trascina giocatori dalla lista al campo',
      'Mobile: tap giocatore → tap posizione sul campo',
      'Assegna i numeri di maglia nell\'input a sinistra di ogni giocatore (1-99)',
      'I numeri si aggiornano in tempo reale sul campo e nella lista',
      'Numeri duplicati vengono evidenziati in rosso e bloccano il salvataggio',
      'Pallini colorati indicano ruolo compatibile con la posizione',
      'Servono esattamente 11 titolari con almeno 1 portiere',
      'I non posizionati vanno automaticamente in panchina',
      'Usa "📋 Ultima" per richiamare la formazione dell\'ultima partita terminata'
    ]
  },
  playerDetail: {
    title: '👤 Scheda Giocatore',
    desc: 'Dettaglio completo del giocatore: anagrafica, statistiche, carriera e ultime partite.',
    items: [
      'Modifica dati anagrafici (admin)',
      'Visualizza statistiche stagionali',
      'Storico carriera e ultime partite',
      'Valutazioni post-partita'
    ]
  },
  fees: {
    title: '💰 Quote',
    desc: 'Gestione quote economiche della squadra: configurazione, assegnazione e monitoraggio pagamenti.',
    items: [
      '⚙️ Configura Quote: crea template con nome, importo e rate personalizzabili',
      '✏️ Modifica: cambia nome, importo, rate o categoria di una config esistente',
      '🔄 Rigenera: applica le modifiche della config alle quote già assegnate (preserva pagamenti)',
      '📋 Duplica: crea una copia della config come base per una nuova quota',
      '▶ Applica: genera quote per tutti i giocatori della rosa dalla config selezionata',
      '📩 Notifica: invia promemoria alla famiglia (singolo o batch scaduti). Messaggio personalizzato modificabile',
      'Click su un giocatore per espandere il dettaglio rate con stato pagamento',
      'Filtri per stato: Da pagare, Parziale, Pagata, Scadute, In scadenza',
      'Badge scadenze: ⚠️ scaduta, ⏳ in scadenza (7gg), 📅 prossima'
    ]
  },
  kit: {
    title: '👕 Kit Sportivo',
    desc: 'Gestione magazzino kit con 3 sezioni: Assegnazioni (chi ha il kit), Magazzino (bundle fisici), Ordini (da ordinare + in attesa fornitore).',
    items: [
      'Clicca una card per aprire la sezione — clicca di nuovo per chiuderla',
      'I numeri nelle card si aggiornano in tempo reale: completi/mancanti, bundle disponibili, pendenze ordini',
      'Tocca ⚙️ Configura, 🎯 Auto-assegna, + Ordina stock per la guida dettagliata di ogni funzione'
    ]
  },
  registration: {
    title: '📋 Tesseramento',
    desc: 'Gestione del processo di tesseramento atleti: template modulo, documenti richiesti, stato consegna e generazione PDF. La famiglia può compilare i dati mancanti dal proprio link fino alla chiusura.',
    items: [
      'Tab Template: configura intestazione, documenti richiesti e clausole del modulo società',
      '🖨️ Stampa modulo vuoto: genera il PDF del template senza dati atleta (da compilare a mano)',
      'Tab Situazione: vista aggregata per squadra con stato documenti per ogni atleta',
      'Click su un giocatore per espandere checklist documenti e dati genitore',
      '▶ Genera per tutta la rosa: crea tesseramenti batch in un click',
      '📄 Scarica PDF: modulo pre-compilato con dati atleta e logo società',
      '📩 Sollecito: invia notifica alla famiglia per documenti mancanti',
      '✅ Tesserato: chiude il tesseramento e invia notifica alla famiglia (modulo diventa read-only)',
      'Auto-check: certificato medico smarcato automaticamente se data_visita_medica valida',
      'Filtri: Tutti, Incompleti, Completi, Tesserati + ricerca per nome'
    ]
  },
  checklist: {
    title: '✅ Checklist Stagione',
    desc: 'Traccia il completamento degli adempimenti di inizio stagione per ogni giocatore. Gli item si dividono in due tipi: automatici (aggiornati dai dati reali dell\'app) e manuali (spunta della segreteria).',
    items: [
      '🔄 Item automatici: Certificato medico, Kit sportivo, Quote stagionali — aggiornati automaticamente dai dati reali al caricamento della pagina',
      '✅ Item manuali: Modulo iscrizione, GDPR, Foto tessera, Tesseramento FIGC — spuntati manualmente dalla segreteria',
      'Click su un giocatore per aprire la checklist: gli item automatici mostrano lo stato con link diretto alla pagina dedicata',
      '🔄 Genera per tutti: crea la checklist per tutta la rosa in un click',
      '⚙️ Template: personalizza gli item della checklist per il tuo workspace',
      'Filtri: Tutti, Incompleti, Completi + filtro per singolo item — quando si filtra per item specifico, i giocatori che lo hanno completato appaiono in un gruppo collassabile verde in fondo ("✅ Item completato — N giocatori"), clic per espandere',
      'Il dot dell\'item filtrato è evidenziato (leggermente più grande con alone colorato) per riconoscerlo a colpo d\'occhio nella riga',
      'Barra progresso: mostra la media di completamento della squadra',
      'Widget dashboard: mostra incompleti e percentuale media'
    ]
  },
  guestAtleta: {
    title: '⚽ Home Atleta',
    desc: 'La tua area personale: convocazioni, allenamenti, partite e statistiche.',
    items: [
      '📣 Notifiche: comunicazioni dalla società e convocazioni in evidenza',
      '❌ Comunica indisponibilità: segnala assenza per una data specifica (prima della convocazione)',
      '📅 Prossimi allenamenti e partite con orario e luogo',
      '📊 Le tue statistiche personali (gol, assist, presenze) con filtro per competizione',
      '🏆 Classifica del girone aggiornata',
      '📋 Tesseramento: compila dati genitore (documento, parentela) + dati atleta (residenza, CF). Dopo la chiusura diventa solo consultabile'
    ]
  },
  guestGenitore: {
    title: '👨‍👩‍👦 Home Famiglia',
    desc: 'Area dedicata alla famiglia: comunicazioni, convocazioni, calendario e situazione quote.',
    items: [
      '📣 Comunicazioni dalla società con badge priorità',
      '📅 Calendario partite e risultati della squadra',
      '⚽ Convocazione: stato del figlio (convocato/non convocato) per la prossima partita',
      '🏆 Classifica del girone aggiornata',
      '💰 Situazione quote: rate pagate e scadute',
      '📋 Tesseramento: compila dati mancanti, vedi documenti consegnati, scarica modulo PDF'
    ]
  },


  guestFees: {
    title: '💰 Le mie Quote',
    desc: 'Situazione pagamenti quote della stagione corrente.',
    items: [
      '💳 Ogni quota mostra le rate con importo, scadenza e stato (da pagare / parziale / pagata)',
      '🏦 IBAN per il bonifico: visibile sotto ogni quota se configurato dalla società',
      '📎 Carica ricevuta: dopo il bonifico puoi allegare la ricevuta PDF/immagine per la segreteria',
      '✅ La segreteria confermerà il pagamento dopo verifica della ricevuta'
    ]
  },
  kitMagazzino: {
    title: '📦 Magazzino Kit',
    desc: 'Bundle fisici per taglia. Tocca + Ordina stock, 🛒 Da ordinare, 📦 In attesa per la guida dettagliata.',
    items: [
      'Click sull\'intestazione taglia per espandere/collassare i bundle',
      'Badge stato: Integro → Assegnato → Parziale (pezzi in attesa) → Saccheggiato → Incompleto → Da riordinare'
    ]
  },
};

export const ELEMENT_HELP = {
  // === DASHBOARD ===
  'dashboard.widgets': {
    title: 'Widget Statistiche',
    desc: 'Riepilogo numerico della stagione: Punti, Partite Giocate, Vittorie, Pareggi, Sconfitte, Gol Fatti, Gol Subiti, Differenza Reti. I dati si aggiornano automaticamente quando inserisci risultati.'
  },
  'dashboard.prossimaPartita': {
    title: 'Prossima Partita',
    desc: 'La prossima partita in programma con data, ora, avversario e luogo. Mostra disponibilità: 🏥 indisponibili (infortunati), ❌ assenti (assenze comunicate). Il bottone "Convocazioni" permette di gestire rapidamente la lista convocati.'
  },
  'dashboard.topPlayers': {
    title: 'Top 3 Giocatori',
    desc: 'Podio dei migliori per gol, assist e presenze. Click su un giocatore per aprire la sua scheda completa con storico e statistiche dettagliate.'
  },
  'dashboard.trend': {
    title: 'Andamento Ultime 5',
    desc: 'Trend delle ultime 5 partite con risultati (V/P/S), gol fatti, gol subiti e differenza reti. Utile per capire il momento di forma della squadra.'
  },
  'dashboard.classifica': {
    title: 'Classifica',
    desc: 'Classifica del girone aggiornata dal portale regionale. La tua squadra è evidenziata in blu. Configurala da Import Center → Portale Regionale.'
  },
  'dashboard.calendario': {
    title: 'Calendario Girone',
    desc: 'Risultati della giornata con navigazione ◀ ▶. Mostra tutte le partite del girone con loghi squadre.'
  },
  'dashboard.marcatori': {
    title: 'Top Marcatori',
    desc: 'Classifica marcatori: generale (tutto il campionato regionale) e del girone. I giocatori della tua squadra sono evidenziati.'
  },
  'dashboard.staff': {
    title: 'Staff Tecnico',
    desc: 'Riepilogo dello staff assegnato alla squadra: allenatore, dirigenti, preparatore atletico, allenatore portieri.'
  },
  'dashboard.risultati': {
    title: 'Ultimi Risultati',
    desc: 'Lista delle ultime partite disputate con risultato, competizione e badge (Campionato/Coppa/Torneo/Amichevole). Click per aprire il dettaglio.'
  },

  // === ROSA ===
  'roster.btnAggiungi': {
    title: '+ Aggiungi Giocatore',
    desc: 'Apre il form per inserire un nuovo giocatore nella rosa. Compila almeno nome, cognome e data di nascita. Il giocatore sarà subito disponibile per convocazioni e formazioni.'
  },
  'roster.cerca': {
    title: 'Cerca Giocatore',
    desc: 'Filtra la rosa per nome o cognome. La ricerca è istantanea mentre digiti.'
  },
  'roster.filtroRuolo': {
    title: 'Filtro per Ruolo',
    desc: 'Mostra solo i giocatori di un ruolo specifico: Portiere, Difensore, Centrocampista o Attaccante.'
  },
  'roster.filtroStato': {
    title: 'Filtro per Stato',
    desc: 'Filtra per stato: Attivo (disponibile), Infortunato (non convocabile), Svincolato (non più in rosa).'
  },
  'roster.cardGiocatore': {
    title: 'Card Giocatore',
    desc: 'Click per aprire la scheda completa: anagrafica, statistiche, storico partite, presenze allenamenti. Il badge colorato indica il ruolo.'
  },
  'roster.alertMedico': {
    title: '⚠️ Alert Visita Medica',
    desc: 'Indica che la visita medica scade entro 30 giorni. Il giocatore non può essere convocato con certificato scaduto.'
  },
  'roster.btnSvincola': {
    title: 'Svincola',
    desc: 'Cambia lo stato dei giocatori selezionati in "Svincolato". Non saranno più visibili nella rosa attiva né convocabili. Puoi riattivare in seguito.'
  },
  'roster.btnAggrega': {
    title: 'Aggrega',
    desc: 'Aggrega giocatori da una categoria inferiore. Il giocatore resta nella sua rosa originale ma diventa disponibile anche per questa squadra (badge "AGG").'
  },
  'roster.btnRiattiva': {
    title: 'Riattiva',
    desc: 'Riporta in stato "Attivo" giocatori precedentemente svincolati. Tornano visibili nella rosa e convocabili.'
  },

  // === CALENDARIO ===
  'calendar.btnNuova': {
    title: '+ Nuova Partita',
    desc: 'Crea una nuova partita manualmente. Inserisci avversario, data/ora, luogo (Casa/Trasferta) e competizione.'
  },
  'calendar.btnImporta': {
    title: '📄 Importa da PDF',
    desc: 'Carica il file PDF del calendario federale SGS/LND. Il parser estrae automaticamente giornate, date, avversari e campi di gioco.'
  },
  'calendar.btnImportCSV': {
    title: '📥 Importa da CSV',
    desc: 'Carica il calendario da un file CSV. Utile per importare partite da un foglio di calcolo con colonne: data, avversario, luogo, competizione.'
  },
  'calendar.pallini': {
    title: 'Pallini di Stato',
    desc: '4 pallini indicano il completamento: Conv (convocazioni inserite), Form (formazione salvata), Ris (risultato inserito), Ev (eventi registrati). Verde = fatto, grigio = mancante.'
  },
  'calendar.cardPartita': {
    title: 'Card Partita',
    desc: 'Click per aprire il dettaglio completo. Mostra avversario, data, risultato e badge competizione. Le partite archiviate hanno un lucchetto.'
  },
  'calendar.archivia': {
    title: '📦 Archivia',
    desc: 'Blocca la partita: risultato, formazione ed eventi non saranno più modificabili. Usa "Sblocca" per riaprire se necessario.'
  },
  'calendar.filtroCompetizione': {
    title: 'Filtro Competizione',
    desc: 'Mostra solo le partite di una competizione specifica: Campionato, Coppa, Torneo o Amichevole.'
  },
  'calendar.eliminaTutte': {
    title: '🗑️ Elimina Tutte',
    desc: 'Elimina TUTTE le partite della squadra. Operazione irreversibile. Utile prima di un re-import completo del calendario.'
  },
  'calendar.flussoOperativo': {
    title: '🎯 Flusso Operativo Partita',
    desc: 'Gestisci la partita passo dopo passo:\n\n➀ Convoca — Seleziona i giocatori convocati per la partita\n➁ Formazione — Scegli modulo e posiziona titolari/panchinari\n➂ Distinta — Genera la distinta ufficiale da consegnare\n➃ Risultato — Inserisci il punteggio (anche live durante la partita)\n➄ Eventi — Registra gol, assist, ammonizioni, espulsioni e sostituzioni in tempo reale\n➅ Note — Appunti sull\'avversario: modulo, punti di forza/debolezza, giocatori pericolosi\n\nI pallini di stato (Conv/Form/Ris/Ev) si aggiornano automaticamente man mano che completi ogni step.'
  },
  'calendar.btnRisultato': {
    title: '⚽ Risultato',
    desc: 'Inserisci o aggiorna il risultato della partita. Puoi farlo anche in tempo reale durante il match. Dopo l\'inserimento si sbloccano gli eventi (gol, cartellini, sostituzioni).'
  },

  // === MATCH DETAIL ===
  'match.risultato': {
    title: 'Risultato',
    desc: 'Inserisci il punteggio finale. Gol Casa a sinistra, Gol Ospite a destra. Salva per aggiornare statistiche e classifica interna.'
  },
  'match.formazione': {
    title: 'Formazione',
    desc: 'Scegli il modulo (4-3-3, 4-4-2, etc.) e posiziona i giocatori. Distingui titolari e panchinari. Indica capitano e vice-capitano.'
  },
  'match.eventi': {
    title: 'Eventi Partita',
    desc: 'Registra gol, assist, ammonizioni, espulsioni e sostituzioni con minuto. Gli eventi aggiornano automaticamente le statistiche individuali.'
  },
  'match.convocazioni': {
    title: 'Convocazioni',
    desc: 'Seleziona i giocatori convocati per la partita. Solo i giocatori "Attivi" e con visita medica valida sono selezionabili.'
  },
  'match.noteAvversario': {
    title: 'Note Avversario',
    desc: 'Appunti sull\'avversario: modulo di gioco, punti di forza/debolezza, giocatori pericolosi. Visibili solo allo staff.'
  },
  'match.archivia': {
    title: 'Archivia Partita',
    desc: 'Blocca tutti i dati della partita. Nessuna modifica sarà possibile finché non si sblocca. Usa dopo aver completato risultato, formazione ed eventi.'
  },

  // === STATISTICHE ===
  'stats.tabella': {
    title: 'Tabella Statistiche',
    desc: 'Riepilogo completo per giocatore: presenze, minuti, gol, assist, ammonizioni, espulsioni. Click sull\'intestazione per ordinare.'
  },
  'stats.diffidati': {
    title: '⚠️ Diffidati',
    desc: 'Giocatori con 4 ammonizioni: alla prossima saranno squalificati per un turno. Evidenziati in giallo nella tabella.'
  },
  'stats.minutaggio': {
    title: 'Minutaggio',
    desc: 'Minuti giocati calcolati in base alla durata della partita per categoria: Under 15 = 70\', Under 16 = 80\', Under 17+ = 90\'.'
  },

  // === REPORT ===
  'reports.partita': {
    title: 'Report Partita',
    desc: 'Genera un PDF con: formazione, eventi, statistiche individuali e valutazioni. Seleziona una partita disputata dal menu.'
  },
  'reports.stagionale': {
    title: 'Report Stagionale',
    desc: 'PDF riepilogativo dell\'intera stagione: risultati per competizione, top marcatori/assist, presenze, andamento. Le amichevoli vengono raggruppate separatamente.'
  },
  'reports.giocatore': {
    title: 'Report Giocatore',
    desc: 'PDF individuale con tutte le statistiche, storico partite, presenze allenamenti e valutazioni del giocatore selezionato.'
  },

  // === ALLENAMENTI - SEDUTE ===
  'training.calendario': {
    title: 'Calendario Sedute',
    desc: 'Giorni verdi = allenamento programmato. Giorni arancioni = partita. Click su un giorno verde per aprire o creare la seduta.'
  },
  'training.fasi': {
    title: 'Fasi Allenamento',
    desc: 'Ogni seduta è divisa in fasi: Riscaldamento, Tecnica, Tattica, Partitella, Defaticamento. Ogni fase ha durata e descrizione.'
  },
  'training.template': {
    title: 'Template',
    desc: 'Programmi salvati riutilizzabili. Applica un template per compilare automaticamente le fasi. Puoi modificare dopo l\'applicazione.'
  },
  'training.tipoSeduta': {
    title: 'Tipo Seduta',
    desc: 'Classifica la seduta: Tattico, Tecnico, Atletico, Misto, Partitella. Utile per bilanciare il carico settimanale.'
  },
  'training.salvaTemplate': {
    title: 'Salva come Template',
    desc: 'Salva il programma corrente come template riutilizzabile. Sarà disponibile per tutte le sedute future della squadra.'
  },

  // === ALLENAMENTI - PRESENZE ===
  'presenze.calendario': {
    title: 'Seleziona Giorno',
    desc: 'Click su un giorno con allenamento per registrare le presenze. I giorni con presenze già salvate hanno un segno di spunta.'
  },
  'presenze.assenti': {
    title: 'Segna Assenti',
    desc: 'Spunta la checkbox rossa accanto ai giocatori assenti. Tutti gli altri saranno considerati presenti automaticamente.'
  },
  'presenze.motivo': {
    title: 'Motivo Assenza',
    desc: 'Seleziona il motivo: Infortunio, Malattia, Impegni scolastici, Motivi familiari, Ingiustificata. Utile per le statistiche.'
  },
  'presenze.salva': {
    title: '💾 Salva Presenze',
    desc: 'Salva tutte le presenze/assenze in un colpo solo. Il salvataggio è batch (veloce anche con 25+ giocatori).'
  },
  'presenze.riepilogo': {
    title: 'Riepilogo Presenze',
    desc: 'Percentuale presenze per giocatore nel periodo. Verde ≥80%, Giallo ≥60%, Rosso <60%. Utile per valutare l\'impegno.'
  },

  // === ALLENAMENTI - IMPOSTAZIONI ===
  'settings.settimana': {
    title: 'Settimana Tipo',
    desc: 'Configura i giorni fissi di allenamento con orario di inizio e fine. Le sedute vengono generate automaticamente ogni settimana.'
  },
  'settings.aggiungiGiorno': {
    title: '+ Aggiungi Giorno',
    desc: 'Aggiungi un nuovo giorno di allenamento alla settimana tipo. Seleziona giorno, ora inizio e ora fine.'
  },
  'settings.templateList': {
    title: 'Lista Template',
    desc: 'Tutti i template salvati per la squadra. Click per modificare, usa il cestino per eliminare.'
  },

  // === IMPORT CENTER ===
  'import.rosaXls': {
    title: 'Import Rosa XLS',
    desc: 'Carica il tabulato XLS scaricato dal portale FIGC. Il parser riconosce automaticamente cognomi composti e dati anagrafici.'
  },
  'import.calendarioTC': {
    title: 'Import Calendario Tuttocampo',
    desc: 'Inserisci l\'URL della pagina calendario su Tuttocampo. Importa partite con data, avversario, risultato e marcatori.'
  },
  'import.calendarioPDF': {
    title: 'Import Calendario PDF',
    desc: 'Carica il PDF del calendario SGS/LND con drag & drop o click. Inserisci il nome squadra come appare nel PDF, seleziona le categorie trovate e conferma l\'import. Il parser estrae automaticamente giornate, date, avversari e indirizzi campo.'
  },
  'import.formazioniTC': {
    title: 'Import Formazioni Tuttocampo',
    desc: 'Importa le formazioni dalle pagine partita di Tuttocampo. Richiede che le partite abbiano il campo tc_match_url compilato.'
  },
  'import.storico': {
    title: 'Storico Importazioni',
    desc: 'Log di tutte le importazioni effettuate: tipo, data, record importati/saltati, esito. Utile per debug.'
  },

  // === STAFF ===
  'staff.aggiungi': {
    title: '+ Aggiungi Staff',
    desc: 'Inserisci un nuovo membro dello staff: nome, cognome, ruolo (Allenatore, Dirigente, Preparatore, etc.), qualifiche e contatti.'
  },
  'staff.categorie': {
    title: 'Categorie Assegnate',
    desc: 'Ogni membro dello staff può essere assegnato a una o più categorie. L\'assegnazione determina la visibilità nelle distinte partita.'
  },

  // === STAGIONI E CATEGORIE ===
  'seasons.nuovaStagione': {
    title: '+ Nuova Stagione',
    desc: 'Crea una nuova stagione sportiva (es: 2026/27). La più recente viene selezionata automaticamente come default.'
  },
  'seasons.nuovaCategoria': {
    title: '+ Nuova Categoria',
    desc: 'Crea una categoria d\'età (es: Under 15). Imposta range anni nascita e tipo campionato. La categoria è persistente tra stagioni.'
  },
  'seasons.creaTeam': {
    title: 'Crea Team',
    desc: 'Crea la squadra per una combinazione categoria+stagione. Il team è l\'entità operativa a cui colleghi rosa, partite e allenamenti.'
  },

  // === UTENTI ===
  'users.crea': {
    title: '+ Nuovo Utente',
    desc: 'Crea un account con email e password. Assegna ruolo (Admin/Allenatore) e permessi granulari per modulo.'
  },
  'users.permessi': {
    title: 'Permessi',
    desc: 'Permessi per modulo: Rosa, Partite, Formazione, Allenamenti, Statistiche, Guest Links, Import, Report. Livelli: Nessuno, Lettura, Scrittura. Profili predefiniti: Allenatore, Vice, Dirigente, Preparatore, Osservatore, Segreteria.'
  },
  'users.categorie': {
    title: 'Accesso Categorie',
    desc: 'Limita la visibilità dell\'utente a categorie specifiche. Array vuoto = accesso a tutte. Utile per allenatori di una sola squadra.'
  },

  // === GUEST LINKS ===
  'guest.genera': {
    title: 'Genera Link',
    desc: 'Crea un link temporaneo. Tipo "genitore": vede solo il figlio e la rosa. Tipo "osservatore": vede tutto in sola lettura.'
  },
  'guest.scadenza': {
    title: 'Scadenza',
    desc: 'Il link scade automaticamente alla data impostata. Dopo la scadenza non è più utilizzabile. Puoi revocarlo prima.'
  },
  'guest.revoca': {
    title: 'Revoca',
    desc: 'Disattiva immediatamente il link. L\'utente guest verrà disconnesso al prossimo accesso.'
  },

  // === SCHEDA GIOCATORE ===
  'player.anagrafica': {
    title: '📋 Dati Giocatore',
    desc: 'Anagrafica completa: nome, cognome, data nascita, ruolo, numero maglia, piede preferito, documenti, certificato medico e contatti genitori. Click "Modifica Dati" (admin) per aggiornare.'
  },
  'player.stats': {
    title: '📊 Statistiche Stagionali',
    desc: 'Riepilogo della stagione corrente: partite giocate, minuti totali, gol e assist. Calcolato automaticamente dagli eventi partita registrati.'
  },
  'player.carriera': {
    title: '📈 Carriera',
    desc: 'Storico per stagione: squadra, partite, minuti, gol e assist. Mostra la progressione del giocatore nel tempo.'
  },
  'player.ultimePartite': {
    title: '⚽ Ultime Partite',
    desc: 'Dettaglio delle ultime partite disputate con minuti, gol, assist e cartellini. Click per aprire il dettaglio partita.'
  },
  'player.valutazioni': {
    title: '⭐ Valutazioni',
    desc: 'Media voti assegnati dall\'allenatore dopo ogni partita. Mostra la migliore e peggiore prestazione e lo storico completo.'
  },
  'player.azioniAdmin': {
    title: '⚙️ Azioni Admin',
    desc: 'Modifica Dati: aggiorna anagrafica e stato. Sposta Categoria: trasferisci il giocatore in un\'altra squadra. Elimina: rimuove definitivamente il giocatore dalla rosa.'
  },

  // === NOTIFICHE ===
  'notifications.tabs': {
    title: '📤/📥 Tab Inviate e Ricevute',
    desc: '<strong>Inviate</strong> — Comunicazioni create dallo staff (convocazioni pubblicate, avvisi, promemoria quote). Lo stato lettura dei destinatari è indicato da ✅ Letta / ⏳ Non letta / 👁 per broadcast.<br><br><strong>Ricevute</strong> — Segnalazioni in arrivo: assenze atleti, indisponibilità post-convocazione, <strong>ricevute bonifico caricate dalle famiglie</strong>. Badge numerico indica le non lette.<br><br>Per le ricevute: bottoni <strong>✅ Conferma</strong> (segna rata come pagata), <strong>❌ Rifiuta</strong> (notifica famiglia di ricaricare), <strong>👁 Vedi</strong> (preview immagine/PDF).'
  },

  // === MODALE CONVOCAZIONI ===
  'convocazioni.selezione': {
    title: '✅ Selezione Rapida',
    desc: 'Usa <strong>Tutti</strong> per selezionare l\'intera rosa o <strong>Nessuno</strong> per deselezionare. Il contatore mostra quanti giocatori sono convocati. Regole: minimo 11, massimo 20 convocabili.'
  },
  'convocazioni.salva': {
    title: '💾 Salva Convocazioni',
    desc: 'Salva la lista dei convocati. Il bottone si disabilita se il numero non è tra 11 e 20. Dopo il salvataggio potrai procedere con la formazione.'
  },
  'convocazioni.anteprima': {
    title: '📄 Anteprima Convocazione',
    desc: 'Genera il documento ufficiale di convocazione con intestazione società, data, orario ritrovo e lista giocatori. Puoi stamparlo direttamente o salvarlo come PDF.'
  },

  // === MODALE FORMAZIONE ===
  'formazione.modulo': {
    title: '📐 Scelta Modulo',
    desc: 'Seleziona il modulo tattico (4-3-3, 4-4-2, ecc.). Cambiando modulo le posizioni sul campo si riorganizzano automaticamente. I giocatori già posizionati restano assegnati.'
  },
  'formazione.campo': {
    title: '🏟️ Campo di Gioco',
    desc: '<strong>Desktop</strong>: trascina i giocatori dalla lista al campo. Clicca su un giocatore posizionato per rimuoverlo. Trascina un giocatore sul campo per spostarlo liberamente.<br><strong>Mobile</strong>: tocca un giocatore nella lista, poi tocca la posizione desiderata. I pallini colorati suggeriscono le posizioni compatibili col ruolo.'
  },
  'formazione.roster': {
    title: '📋 Lista Convocati',
    desc: 'I giocatori disponibili per la formazione (solo i convocati). Quelli già posizionati appaiono sbiaditi. Ordinati per ruolo: Portiere → Difensore → Centrocampista → Attaccante. L\'input numerico a sinistra permette di assegnare il numero di maglia per questa partita (i numeri non sono fissi nel calcio giovanile). I numeri salvati hanno priorità sul numero di default del profilo giocatore.'
  },
  'formazione.salva': {
    title: '💾 Salva Formazione',
    desc: 'Salva titolari, panchina e numeri di maglia. Servono esattamente 11 titolari con 1 portiere. I convocati non posizionati vanno automaticamente in panchina. Se ci sono numeri duplicati il salvataggio viene bloccato. Se mancano numeri a qualche convocato, viene chiesta conferma prima di procedere.'
  },

  // === MODALE RISULTATO/EVENTI ===
  'risultato.listaEventi': {
    title: '📜 Timeline Eventi',
    desc: 'Lista cronologica degli eventi registrati: gol, ammonizioni, espulsioni, sostituzioni. Clicca ✕ per eliminare un evento. Il risultato in alto si aggiorna automaticamente in base ai gol inseriti.'
  },
  'risultato.formEvento': {
    title: '➕ Nuovo Evento',
    desc: 'Seleziona il <strong>minuto</strong> e il <strong>tipo</strong> di evento. Per gol, ammonizioni e sostituzioni seleziona anche il giocatore. Per i gol subiti puoi indicare il numero di maglia avversario.'
  },
  'risultato.aggiungi': {
    title: '+ Aggiungi',
    desc: 'Aggiunge l\'evento alla timeline. Puoi aggiungere più eventi prima di salvare. Il risultato finale viene calcolato automaticamente contando gol fatti e subiti.'
  },

  // === MODALE TEMPLATE ALLENAMENTO ===
  'template.nome': {
    title: '📋 Nome Template',
    desc: 'Dai un nome descrittivo al template (es. "Riscaldamento + Possesso 4v2"). Lo ritroverai nella lista template e potrai applicarlo rapidamente a qualsiasi seduta.'
  },
  'template.fasi': {
    title: '🔄 Fasi della Seduta',
    desc: 'Struttura la seduta in fasi ordinate. Ogni fase ha un <strong>tipo</strong> (riscaldamento, tecnica, tattica, ecc.), un <strong>nome</strong> personalizzato e una <strong>durata</strong> in minuti. Usa le frecce ▲▼ per riordinare, ✏️ per modificare, ✕ per eliminare.'
  },
  'template.materiale': {
    title: '🎒 Materiale Necessario',
    desc: 'Seleziona il materiale da preparare per la seduta. Clicca per attivare/disattivare. Utile per organizzare in anticipo cosa portare in campo.'
  },

  // === MATCH CENTER ===
  'mc.liveBtn': {
    title: '▶️ Bottone Stato Partita',
    desc: 'Gestisce il ciclo di vita della partita:<br><strong>Inizio 1°T</strong> → avvia il cronometro (abilitato 5min prima del fischio).<br><strong>Fine 1°T</strong> → chiude il primo tempo (abilitato dopo il tempo regolamentare).<br><strong>Inizio 2°T</strong> → riprende dopo l\'intervallo.<br><strong>Fine Partita</strong> → chiude la partita e calcola i minuti giocati.<br><br>⚠️ Il bottone si blocca durante il tempo regolamentare per evitare click accidentali. In emergenza: <strong>tieni premuto 3 secondi</strong> per forzare la transizione.<br><br>Per partite già passate: "📊 Registra Risultato" conferma il punteggio calcolato dagli eventi nella timeline.'
  },
  'mc.quickActions': {
    title: '⚡ Azioni Rapide',
    desc: 'Griglia di bottoni per registrare eventi in tempo reale:<br><br>⚽ <strong>Gol</strong> — seleziona marcatore + eventuale assist<br>🟨 <strong>Ammonizione</strong> — seleziona giocatore ammonito<br>🟥 <strong>Espulsione</strong> — seleziona giocatore espulso<br>🔄 <strong>Sostituzione</strong> — chi esce e chi entra (max 7)<br>🥅 <strong>Gol Subito</strong> — gol dell\'avversario (opzionale: n° maglia)<br>🪷 <strong>Autogol</strong> — seleziona giocatore che ha segnato nella propria porta<br><br>Click su un\'azione apre il drawer laterale con il form dettagliato. Il minuto viene pre-compilato dal cronometro live.'
  },
  'mc.tabs': {
    title: '📋 Tab di Navigazione',
    desc: '<strong>Eventi</strong> — Timeline cronologica di tutti gli eventi registrati (default).<br><strong>Formazione</strong> — Visualizza formazione con numeri di maglia assegnati. Bottoni: 📄 Distinta (genera distinta con numeri cerchiati) e ✏️ Modifica. Se ci sono state sostituzioni, mostra sub-tabs Iniziale/Finale.<br><strong>Note</strong> — Appunti liberi con timestamp automatico del minuto live. Auto-save ogni 3 secondi.<br><strong>Import</strong> — Incolla il tabellino da Tuttocampo per importare eventi e formazione automaticamente.'
  },
  'mc.timeline': {
    title: '📋 Timeline Eventi',
    desc: 'Lista cronologica degli eventi registrati, ordinati per minuto. Ogni evento mostra:<br>• Minuto<br>• Icona tipo (gol, cartellino, sostituzione)<br>• Nome giocatore + badge (RIG, AUT)<br>• Punteggio progressivo dopo ogni gol<br><br>Click su ⋮ per modificare o eliminare un evento. Le modifiche si riflettono immediatamente nel punteggio in alto.'
  },
  'mc.save': {
    title: '💾 Salva Risultato ed Eventi',
    desc: 'Salva definitivamente il risultato (calcolato dai gol nella timeline) e tutti gli eventi registrati. Dopo il salvataggio:<br>• Le statistiche individuali vengono aggiornate<br>• I minuti giocati vengono calcolati in base alle sostituzioni<br>• La partita appare come "Terminata" nel calendario<br><br>⚠️ Se la partita è live, il salvataggio non chiude la partita — usa "Fine Partita" per terminare il flusso live.'
  },

  // === IMPORT GAZZETTA REGIONALE ===
  'import.grConfig': {
    title: '⚙️ Configura URL Girone',
    desc: 'Vai su <strong>gazzettaregionale.it</strong>, cerca il tuo girone e copia l\'URL della pagina classifica/calendario. Incollalo qui per collegare la squadra al girone. Serve farlo una sola volta (o quando cambia girone).'
  },
  'import.grCalendario': {
    title: '📅 Calendario + Risultati',
    desc: 'Importa automaticamente tutte le partite del girone con date, avversari e risultati aggiornati. Puoi scegliere tra: <strong>importa tutto</strong> (crea nuove partite) oppure <strong>aggiorna solo risultati</strong> (aggiorna punteggi delle partite già esistenti).'
  },
  'import.grPreview': {
    title: '👁️ Anteprima Dati',
    desc: 'Visualizza in anteprima i dati del girone senza importare nulla: classifica aggiornata, ultima giornata disputata e classifica marcatori. Utile per verificare che l\'URL configurato sia corretto.'
  },

  // === KIT SPORTIVO INTERATTIVO ===
  'kit.auto': {
    title: '🎯 Auto-assegna',
    desc: 'Assegna automaticamente un kit a tutti i giocatori che:<br>• Hanno la taglia impostata nel profilo<br>• Non hanno ancora un kit completo assegnato<br>• Hanno un bundle disponibile della loro taglia in magazzino<br><br>Il sistema usa prima i bundle <strong>saccheggiati</strong> (parzialmente usati) prima di aprire bundle integri.<br><br>I giocatori senza stock disponibile vengono saltati e mostrati nel riepilogo finale.'
  },
  'kit.stock': {
    title: '+ Ordina stock',
    desc: 'Genera i kit fisici (bundle) per taglia e quantità:<br><br>1. Inserisci quanti kit vuoi per ogni taglia (es. M: 3, L: 5)<br>2. Usa i bottoni <strong>+10 / −10</strong> per incrementi rapidi<br>3. Clicca <strong>Genera</strong><br><br>Ogni bundle è un kit fisico completo tracciato individualmente. I bundle vengono aggiunti al magazzino con stato <strong>Integro</strong>.<br><br>Dopo aver generato lo stock, usa <strong>🎯 Auto-assegna</strong> per distribuirli automaticamente.'
  },
  'kit.assegnazioni': {
    title: '📋 Card Assegnazioni',
    desc: 'Mostra lo stato kit di tutti i giocatori e staff.<br><br>I numeri nella card indicano:<br>• <strong>N/TOT completi</strong> — quanti hanno il kit completo sul totale<br>• <strong>X senza kit</strong> — giocatori senza nessun articolo assegnato<br>• <strong>🔧 X sostituzioni in attesa</strong> — pezzi persi/danneggiati da rimpiazzare<br><br>Clicca la card per aprire la lista. Usa i filtri e le tab template per navigare.'
  },
  'kit.magazzino': {
    title: '📦 Card Magazzino',
    desc: 'Mostra i bundle fisici in magazzino per il template selezionato.<br><br>I numeri nella card indicano:<br>• <strong>N bundle</strong> — totale bundle creati<br>• <strong>X integri</strong> — bundle disponibili non ancora assegnati<br>• <strong>⚠️ X incompleti</strong> — bundle con sostituzione non trovata<br><br>Clicca la card per aprire il magazzino. Usa le tab template per cambiare kit.'
  },
  'kit.ordini': {
    title: '🛒 Card Ordini',
    desc: 'Mostra le pendenze con il fornitore, distinte per tipo:<br><br>🔴 <strong>Taglie mancanti</strong> — giocatori senza stock disponibile (devi ordinare)<br>🟠 <strong>In attesa fornitore</strong> — bundle assegnati con pezzi non ancora arrivati (hai già ordinato)<br><br>Clicca la card per aprire la sezione Ordini con i dettagli completi.'
  },
  'kit.config': {
    title: '⚙️ Configura Template',
    desc: 'Crea o modifica il template del kit. Definisci:<br><br>📝 <strong>Nome</strong> — es. "Kit Allenamento SG"<br>👕 <strong>Settore</strong> — Scuola Calcio (taglie 116-158) o Settore Giovanile (XS-XXL)<br>🧤 <strong>Kit Portiere</strong> — pre-compila con articoli da portiere (maglia/pantaloncino/calzettoni portiere + rappresentanza). Completamente personalizzabile. Badge 🧤 in lista e magazzino.<br>📦 <strong>Articoli</strong> — aggiungi ogni pezzo del kit con nome e quantità (es. Maglia x2, Pantaloncino x1). Per il portiere puoi aggiungere "Guanti portiere" manualmente se la società li fornisce.<br>🔢 <strong>Numerazione</strong> — nessuna / libera / sequenziale (auto da numero maglia). Con numerazione sequenziale il magazzino mostra <strong>n°13</strong> invece di Kit #1.<br><br>Dopo aver configurato il template, usa <strong>+ Stock</strong> per generare i kit fisici in magazzino.'
  },
  'kit.filtri': {
    title: '🔍 Filtri Assegnazioni',
    desc: 'Filtra la lista giocatori nella sezione Assegnazioni:<br><br><strong>Tutti</strong> — lista completa<br><strong>Incompleti</strong> — solo giocatori con kit non ancora completo<br><strong>Completi</strong> — solo giocatori con tutti gli articoli assegnati'
  },
  'kit.lista': {
    title: '👕 Assegnazioni Giocatori',
    desc: 'Lista giocatori/staff con stato kit per il template selezionato.<br><br>🟢 <strong>Pallino verde</strong> — kit completo<br>🟡 <strong>Pallino giallo</strong> — kit parziale (alcuni articoli mancanti)<br>🔴 <strong>Pallino rosso</strong> — nessun articolo assegnato<br><br><strong>Click sulla riga</strong> — apre il dettaglio con articoli assegnati, assegnazione manuale e storico sostituzioni.<br><br>La card in alto mostra: completi/totale, senza kit, e sostituzioni in attesa (🔧) se presenti.'
  },
  'kit.magazzino': {
    title: '📦 Vista Magazzino',
    desc: 'Mostra i bundle fisici raggruppati per taglia. Ogni bundle è un kit completo tracciato individualmente.<br><br><strong>Badge stato bundle:</strong><br>🟢 <strong>Integro</strong> — tutti i pezzi disponibili<br>👕 <strong>Assegnato</strong> — tutti i pezzi assegnati al giocatore<br>🟠 <strong>Parziale</strong> — assegnato ma con pezzi in attesa dal fornitore<br>🔓 <strong>Saccheggiato</strong> — alcuni pezzi prelevati per sostituzioni<br>⚠️ <strong>Incompleto</strong> — assegnato con pezzo mancante (sostituzione non trovata)<br>🔴 <strong>Da riordinare</strong> — tutti i pezzi persi/danneggiati<br><br>Click sull\'intestazione taglia per espandere/collassare i bundle.'
  },
  'kit.stock': {
    title: '+ Stock — Genera Kit in Magazzino',
    desc: 'Genera i kit fisici (bundle) per taglia e quantità:<br><br>1. Inserisci quanti kit vuoi per ogni taglia (es. M: 3, L: 5, XL: 2)<br>2. Usa i bottoni <strong>+10 / -10</strong> per incrementi rapidi<br>3. Clicca <strong>Genera</strong><br><br>Ogni bundle è un kit fisico completo tracciato individualmente. I bundle vengono aggiunti al magazzino con stato <strong>Integro</strong>.'
  },
  'kit.auto': {
    title: '🎯 Auto-Assegna',
    desc: 'Assegna automaticamente un kit a tutti i giocatori che:<br>• Hanno la taglia impostata nel profilo<br>• Non hanno ancora un kit completo assegnato<br>• Hanno un bundle disponibile della loro taglia in magazzino<br><br>Il sistema usa prima i bundle già <strong>saccheggiati</strong> (parzialmente usati per sostituzioni) prima di aprire bundle integri.<br><br>Se mancano bundle per alcune taglie, i giocatori vengono saltati e mostrati nel riepilogo finale.'
  },

  'kit.restock': {
    title: '+ Ordina stock',
    desc: 'Aggiunge nuovi bundle al magazzino per questo template.<br><br>Inserisci la quantità per ogni taglia che vuoi aggiungere. I nuovi bundle vengono creati con stato <strong>Integro</strong> e numerati in sequenza rispetto a quelli già esistenti.'
  },
  'kit.daOrdinare': {
    title: '🔴 Da ordinare',
    desc: 'Giocatori/staff senza stock disponibile per la loro taglia — devi acquistare dal fornitore.<br><br>Raggruppati per taglia per facilitare l\'ordine. Workflow:<br>1. Ordina al fornitore le taglie mancanti<br>2. Quando arriva la merce, usa <strong>+ Ordina stock</strong> per generare i bundle<br>3. Assegna il kit al giocatore'
  },
  'kit.inAttesa': {
    title: '🟠 In attesa dal fornitore',
    desc: 'Bundle già assegnati con pezzi non ancora consegnati dal fornitore — hai già ordinato, aspetti la consegna.<br><br>Diverso da “Da ordinare”: qui il kit è già stato dato al giocatore ma mancano alcuni articoli.<br><br>Quando il fornitore consegna, clicca <strong>✅ Segna arrivati</strong> per aggiornare lo stato bundle e completare l\'assegnazione.'
  },
  'kit.segnaArrivati': {
    title: '✅ Segna arrivati',
    desc: 'Registra i pezzi arrivati dal fornitore per questa taglia.<br><br>Per ogni articolo in attesa, indica <strong>quanti pezzi sono arrivati</strong> usando i bottoni + e − (max = bundle in attesa per quell\'articolo).<br><br>Il sistema aggiorna automaticamente:<br>• Lo stato del bundle (parziale → assegnato se tutti arrivati)<br>• Il kit_stock del pezzo → assegnato<br>• L\'assegnazione al giocatore'
  }
};
