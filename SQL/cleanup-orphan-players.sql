-- ===================================================================
-- SCRIPT DI PULIZIA: Rimuove riferimenti a giocatori inesistenti
-- ===================================================================
-- Eseguire in Supabase Dashboard -> SQL Editor
-- ===================================================================

-- 1. TROVA CALCIATORI ORFANI IN VALUTAZIONE_PARTITA
-- Questi sono record che puntano a calciatori_id che non esistono
-- ===================================================================
SELECT 
    'valutazione_partita' as tabella,
    vp.id as record_id,
    vp.calciatore_id,
    vp.partita_id,
    vp.voto
FROM valutazione_partita vp
LEFT JOIN calciatore c ON c.id = vp.calciatore_id
WHERE c.id IS NULL;

-- 2. TROVA CALCIATORI ORFANI IN EVENTO_PARTITA (calciatore_principale)
-- ===================================================================
SELECT 
    'evento_partita.principale' as tabella,
    ep.id as record_id,
    ep.calciatore_principale_id,
    ep.partita_id,
    ep.tipo_evento_codice
FROM evento_partita ep
LEFT JOIN calciatore c ON c.id = ep.calciatore_principale_id
WHERE c.id IS NULL AND ep.calciatore_principale_id IS NOT NULL;

-- 3. TROVA CALCIATORI ORFANI IN EVENTO_PARTITA (calciatore_secondario)
-- ===================================================================
SELECT 
    'evento_partita.secondario' as tabella,
    ep.id as record_id,
    ep.calciatore_secondario_id,
    ep.partita_id,
    ep.tipo_evento_codice
FROM evento_partita ep
LEFT JOIN calciatore c ON c.id = ep.calciatore_secondario_id
WHERE c.id IS NULL AND ep.calciatore_secondario_id IS NOT NULL;

-- 4. CONTA TOTALI PRIMA DELLA PULIZIA
-- ===================================================================
SELECT 
    'valutazione_partita' as tabella, COUNT(*) as totale_orfani
FROM valutazione_partita vp
LEFT JOIN calciatore c ON c.id = vp.calciatore_id
WHERE c.id IS NULL
UNION ALL
SELECT 
    'evento_partita (principale)' as tabella, COUNT(*) as totale_orfani
FROM evento_partita ep
LEFT JOIN calciatore c ON c.id = ep.calciatore_principale_id
WHERE c.id IS NULL AND ep.calciatore_principale_id IS NOT NULL
UNION ALL
SELECT 
    'evento_partita (secondario)' as tabella, COUNT(*) as totale_orfani
FROM evento_partita ep
LEFT JOIN calciatore c ON c.id = ep.calciatore_secondario_id
WHERE c.id IS NULL AND ep.calciatore_secondario_id IS NOT NULL;

-- ===================================================================
-- AZIONE: ELIMINA I RECORD ORFANI
-- ATTENZIONE: Decommenta solo dopo aver verificato i dati sopra!
-- ===================================================================

-- Elimina valutazioni con calciatori orfani
-- DELETE FROM valutazione_partita 
-- WHERE calciatore_id IN (
--     SELECT vp.calciatore_id 
--     FROM valutazione_partita vp
--     LEFT JOIN calciatore c ON c.id = vp.calciatore_id
--     WHERE c.id IS NULL
-- );

-- Elimina eventi con calciatori principali orfani
-- DELETE FROM evento_partita
-- WHERE calciatore_principale_id IN (
--     SELECT ep.calciatore_principale_id 
--     FROM evento_partita ep
--     LEFT JOIN calciatore c ON c.id = ep.calciatore_principale_id
--     WHERE c.id IS NULL AND ep.calciatore_principale_id IS NOT NULL
-- );

-- Elimina eventi con calciatori secondari orfani
-- DELETE FROM evento_partita
-- WHERE calciatore_secondario_id IN (
--     SELECT ep.calciatore_secondario_id 
--     FROM evento_partita ep
--     LEFT JOIN calciatore c ON c.id = ep.calciatore_secondario_id
--     WHERE c.id IS NULL AND ep.calciatore_secondario_id IS NOT NULL
-- );

-- ===================================================================
-- VERIFICA POST-PULIZIA
-- ===================================================================
-- SELECT 'Valutazioni orfane rimanenti:' as info, COUNT(*) as count
-- FROM valutazione_partita vp
-- LEFT JOIN calciatore c ON c.id = vp.calciatore_id
-- WHERE c.id IS NULL;
