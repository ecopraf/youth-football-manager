-- Migrazione: Aggiunge workspace_id a category per supporto multi-tenant
-- Data: Luglio 2026

ALTER TABLE category ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspace(id);

-- Aggiorna le categorie esistenti assegnandole al workspace SSD New Team
UPDATE category SET workspace_id = '22222222-2222-2222-2222-222222222222' WHERE workspace_id IS NULL;
