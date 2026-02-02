-- ============================================
-- MIGRATION 010 FIX: Aggiungi colonne mancanti a assegnazioni_attivita
-- ============================================

-- Aggiungi colonne mancanti
ALTER TABLE assegnazioni_attivita 
ADD COLUMN IF NOT EXISTS ore_assegnate DECIMAL(10, 2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS costo_orario_base DECIMAL(10, 2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS costo_orario_finale DECIMAL(10, 2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS budget_risorsa DECIMAL(10, 2) NOT NULL DEFAULT 0;

-- Rimuovi i DEFAULT dopo averli aggiunti (vogliamo che siano obbligatori in futuro)
ALTER TABLE assegnazioni_attivita 
ALTER COLUMN ore_assegnate DROP DEFAULT,
ALTER COLUMN costo_orario_base DROP DEFAULT,
ALTER COLUMN costo_orario_finale DROP DEFAULT,
ALTER COLUMN budget_risorsa DROP DEFAULT;

-- Commenti
COMMENT ON COLUMN assegnazioni_attivita.ore_assegnate IS 'Ore assegnate alla risorsa per questa attività';
COMMENT ON COLUMN assegnazioni_attivita.costo_orario_base IS 'Costo orario base della risorsa (dal cliente)';
COMMENT ON COLUMN assegnazioni_attivita.costo_orario_finale IS 'Costo orario finale con eventuali maggiorazioni';
COMMENT ON COLUMN assegnazioni_attivita.budget_risorsa IS 'Budget calcolato: ore_assegnate × costo_orario_finale';

-- ============================================
-- FINE MIGRATION 010 FIX
-- ============================================