-- =====================================================
-- MIGRATION 009: ASSEGNAZIONI AREA
-- Aggiunge la tabella per gestire le risorse assegnate a ogni area
-- con ore e budget calcolato
-- =====================================================

-- 1. Creo la tabella assegnazioni_area
CREATE TABLE IF NOT EXISTS assegnazioni_area (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    area_id UUID NOT NULL REFERENCES aree(id) ON DELETE CASCADE,
    utente_id UUID NOT NULL REFERENCES utenti(id) ON DELETE CASCADE,
    
    -- Ore assegnate (supporta decimali per precisione)
    ore_assegnate DECIMAL(10, 2) NOT NULL CHECK (ore_assegnate > 0),
    
    -- Costi (presi da assegnazioni_progetto al momento dell'assegnazione area)
    costo_orario_base DECIMAL(10, 2) DEFAULT 0,
    costo_orario_finale DECIMAL(10, 2) DEFAULT 0,
    
    -- Budget calcolato: ore_assegnate × costo_orario_finale
    budget_risorsa DECIMAL(10, 2) DEFAULT 0,
    
    -- Metadati
    data_assegnazione TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Indice univoco: non posso assegnare la stessa risorsa 2 volte alla stessa area
    UNIQUE(area_id, utente_id)
);

-- 2. Creo indici per performance
CREATE INDEX idx_assegnazioni_area_area ON assegnazioni_area(area_id);
CREATE INDEX idx_assegnazioni_area_utente ON assegnazioni_area(utente_id);
CREATE INDEX idx_assegnazioni_area_area_utente ON assegnazioni_area(area_id, utente_id);

-- 3. Aggiungo campi alla tabella aree per tracking budget
DO $$
BEGIN
    -- budget_assegnato: somma dei budget delle risorse assegnate
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'aree' AND column_name = 'budget_assegnato'
    ) THEN
        ALTER TABLE aree ADD COLUMN budget_assegnato DECIMAL(10, 2) DEFAULT 0;
    END IF;
    
    -- budget_utilizzato: somma dei budget delle attività/task completate
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'aree' AND column_name = 'budget_utilizzato'
    ) THEN
        ALTER TABLE aree ADD COLUMN budget_utilizzato DECIMAL(10, 2) DEFAULT 0;
    END IF;
END $$;

-- 4. Commenti per documentazione
COMMENT ON TABLE assegnazioni_area IS 'Gestisce le risorse assegnate a ogni area con ore e budget';
COMMENT ON COLUMN assegnazioni_area.ore_assegnate IS 'Ore assegnate alla risorsa per questa area (supporta decimali)';
COMMENT ON COLUMN assegnazioni_area.costo_orario_finale IS 'Costo orario finale della risorsa (include margini) al momento dell''assegnazione';
COMMENT ON COLUMN assegnazioni_area.budget_risorsa IS 'Budget calcolato: ore_assegnate × costo_orario_finale';

-- =====================================================
-- FINE MIGRATION 009
-- =====================================================