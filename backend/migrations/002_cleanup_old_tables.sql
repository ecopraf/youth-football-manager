-- ============================================================
-- YOUTH FOOTBALL MANAGER - CLEANUP TABELLE VECCHIE
-- Versione: 1.0 - 2026-06-27
--
-- ATTENZIONE: Questo script ELIMINA i dati!
-- Eseguire solo se si vuole ripulire il database.
--
-- TABELLE ELIMINATE:
-- - rosa              (assegnazione giocatori - vecchio)
-- - partita           (partite - vecchio)
-- - evento_partita    (eventi partite - vecchio)
-- - allenamento      (allenamenti - vecchio)
-- - presenza_allenamento (presenze allenamenti - vecchio)
-- - convocazione      (convocazioni - vecchio)
-- - formazione_partita (formazioni - vecchio)
-- - configurazione_allenamento (configurazioni allenamenti - vecchio)
--
-- TABELLE MANTENUTE:
-- - workspace
-- - utente
-- - stagione
-- - calciatore
-- - guest_link
-- ============================================================

-- Disabilita i trigger temporaneamente per velocizzare
SET session_replication_role = replica;

-- Elimina tabelle in ordine di dipendenza (prima quelle che referenziano altre)
DROP TABLE IF EXISTS rosa CASCADE;
DROP TABLE IF EXISTS formazione_partita CASCADE;
DROP TABLE IF EXISTS evento_partita CASCADE;
DROP TABLE IF EXISTS presenza_allenamento CASCADE;
DROP TABLE IF EXISTS configurazione_allenamento CASCADE;
DROP TABLE IF EXISTS convocazione CASCADE;
DROP TABLE IF EXISTS allenamento CASCADE;
DROP TABLE IF EXISTS partita CASCADE;

-- Riabilita i trigger
SET session_replication_role = DEFAULT;

-- Verifica
SELECT 'Cleanup completato' AS status;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('workspace', 'utente', 'stagione', 'calciatore', 'guest_link')
ORDER BY table_name;
