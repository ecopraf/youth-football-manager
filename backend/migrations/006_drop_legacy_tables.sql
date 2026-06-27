-- ============================================================
-- YOUTH FOOTBALL MANAGER - DROP TABELLE LEGACY (v1.0)
-- Versione: 1.0 - 2026-06-27
--
-- ATTENZIONE: Questo script ELIMINA i dati in modo permanente!
-- Eseguire SOLO DOPO:
-- 1. Aver eseguito 001_new_schema.sql (nuove tabelle)
-- 2. Aver migrato i dati dalle tabelle legacy (se necessario)
-- 3. Aver verificato che il backend funzioni con le nuove tabelle
-- 4. Aver fatto un BACKUP COMPLETO del database
--
-- Questo script elimina le tabelle vecchie in italiano che sono
-- state sostituite dalle nuove tabelle in inglese (schema v2.0)
--
-- ============================================================


-- ============================================================
-- VERIFICA PRELIMINARE
-- ============================================================

-- Mostra quali tabelle legacy esistono ancora
SELECT 'Tabelle legacy ancora presenti:' AS status;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'utente', 'stagione', 'calciatore', 'squadra', 
    'partita', 'rosa', 'evento_partita', 'convocazione',
    'formazione_partita', 'allenamento', 'presenza_allenamento',
    'configurazione_allenamento'
)
ORDER BY table_name;


-- ============================================================
-- CONTEGGIO DATI PRIMA DELLA CANCELLAZIONE
-- ============================================================

SELECT 'Conteggio dati nelle tabelle legacy:' AS status;

SELECT 'utente' AS tabella, COUNT(*) AS records FROM utente
UNION ALL
SELECT 'stagione', COUNT(*) FROM stagione
UNION ALL
SELECT 'calciatore', COUNT(*) FROM calciatore
UNION ALL
SELECT 'squadra', COUNT(*) FROM squadra
UNION ALL
SELECT 'partita', COUNT(*) FROM partita
UNION ALL
SELECT 'rosa', COUNT(*) FROM rosa
UNION ALL
SELECT 'evento_partita', COUNT(*) FROM evento_partita
UNION ALL
SELECT 'convocazione', COUNT(*) FROM convocazione
UNION ALL
SELECT 'formazione_partita', COUNT(*) FROM formazione_partita
UNION ALL
SELECT 'allenamento', COUNT(*) FROM allenamento
UNION ALL
SELECT 'presenza_allenamento', COUNT(*) FROM presenza_allenamento
UNION ALL
SELECT 'configurazione_allenamento', COUNT(*) FROM configurazione_allenamento;


-- ============================================================
-- DROP TABELLE LEGACY
-- ============================================================
-- Ordine: prima quelle senza dipendenze, poi quelle che referenziano

-- Disabilita temporaneamente i check di foreign key
SET session_replication_role = replica;


-- 1. Tabelle con minori dipendenze (prima)

-- configurazione_allenamento (nessuna tabella la referenzia)
DROP TABLE IF EXISTS configurazione_allenamento CASCADE;

-- presenza_allenamento (referenziata da allenamento)
DROP TABLE IF EXISTS presenza_allenamento CASCADE;

-- allenamento (referenziata da presenza_allenamento)
DROP TABLE IF EXISTS allenamento CASCADE;

-- formazione_partita (referenziata da partita)
DROP TABLE IF EXISTS formazione_partita CASCADE;

-- evento_partita (referenziata da partita)
DROP TABLE IF EXISTS evento_partita CASCADE;

-- convocazione (referenziata da partita)
DROP TABLE IF EXISTS convocazione CASCADE;

-- rosa (referenziata da squadra)
DROP TABLE IF EXISTS rosa CASCADE;

-- partita (referenziata da rosa, evento_partita, formazione_partita, convocazione)
DROP TABLE IF EXISTS partita CASCADE;

-- 2. Tabelle principali (dopo)

-- calciatore (referenziata da rosa)
DROP TABLE IF EXISTS calciatore CASCADE;

-- squadra (referenziata da partita, rosa, stagione)
DROP TABLE IF EXISTS squadra CASCADE;

-- stagione (referenziata da squadra)
DROP TABLE IF EXISTS stagione CASCADE;

-- utente (tabella auth, verificare che non sia più usata)
-- Attenzione: questa tabella potrebbe essere ancora usata per l'autenticazione
-- Verificare che sia stata sostituita da 'users' prima di eliminarla
DROP TABLE IF EXISTS utente CASCADE;


-- Riabilita i check di foreign key
SET session_replication_role = DEFAULT;


-- ============================================================
-- VERIFICA POST-CANCELLAZIONE
-- ============================================================

SELECT 'Tabelle rimaste nel database:' AS status;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

SELECT 'Tabelle legacy rimanenti:' AS status;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'utente', 'stagione', 'calciatore', 'squadra', 
    'partita', 'rosa', 'evento_partita', 'convocazione',
    'formazione_partita', 'allenamento', 'presenza_allenamento',
    'configurazione_allenamento'
);

SELECT 'Cleanup completato!' AS status;


-- ============================================================
-- NOTE OPERATIVE
-- ============================================================

/*
PRIMA DI ESEGUIRE QUESTO SCRIPT:

1. VERIFICA BACKUP
   - Assicurati di avere un backup completo del database
   - Testa il restore su un ambiente di staging

2. VERIFICA MIGRATION DATI
   - Se hai dati nelle tabelle legacy che devono essere preservati,
     esegui prima uno script di migrazione per spostarli nelle nuove tabelle

3. VERIFICA APPLICAZIONE
   - Assicurati che il backend (index.js) sia stato aggiornato 
     per usare le nuove tabelle (users, player, team, season, match, etc.)
   - Testa l'applicazione in staging prima di procedere in produzione

4. ORDINE DI ESECUZIONE
   - 001_new_schema.sql (crea nuove tabelle)
   - 003_populate_data.sql (popola dati iniziali)
   - [Eventuale script migrazione dati legacy]
   - 006_drop_legacy_tables.sql (elimina tabelle vecchie)

5. IN CASO DI ERRORI
   - Ripristina dal backup
   - Verifica le dipendenze con:
     SELECT * FROM information_schema.table_constraints 
     WHERE constraint_schema = 'public';
*/
