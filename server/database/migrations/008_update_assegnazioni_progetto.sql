-- ============================================================================
-- MIGRATION 008: Update Assegnazioni Progetto - Budget Basato su Ore
-- Aggiunge campi per gestione budget calcolato dalle ore assegnate
-- ============================================================================

-- NOTA: Questa migration è IDEMPOTENTE (può essere eseguita più volte)

BEGIN;

-- 1. Aggiungi colonna costo_orario_base se non esiste
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'assegnazioni_progetto' AND column_name = 'costo_orario_base'
    ) THEN
        ALTER TABLE assegnazioni_progetto 
        ADD COLUMN costo_orario_base DECIMAL(10, 2) DEFAULT 0;
        RAISE NOTICE 'Campo costo_orario_base aggiunto a assegnazioni_progetto';
    ELSE
        RAISE NOTICE 'Campo costo_orario_base già presente in assegnazioni_progetto';
    END IF;
END $$;

-- 2. Aggiungi colonna costo_orario_finale se non esiste
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'assegnazioni_progetto' AND column_name = 'costo_orario_finale'
    ) THEN
        ALTER TABLE assegnazioni_progetto 
        ADD COLUMN costo_orario_finale DECIMAL(10, 2) DEFAULT 0;
        RAISE NOTICE 'Campo costo_orario_finale aggiunto a assegnazioni_progetto';
    ELSE
        RAISE NOTICE 'Campo costo_orario_finale già presente in assegnazioni_progetto';
    END IF;
END $$;

-- 3. Aggiungi colonna budget_risorsa se non esiste
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'assegnazioni_progetto' AND column_name = 'budget_risorsa'
    ) THEN
        ALTER TABLE assegnazioni_progetto 
        ADD COLUMN budget_risorsa DECIMAL(10, 2) DEFAULT 0;
        RAISE NOTICE 'Campo budget_risorsa aggiunto a assegnazioni_progetto';
    ELSE
        RAISE NOTICE 'Campo budget_risorsa già presente in assegnazioni_progetto';
    END IF;
END $$;

-- 4. Modifica tipo di dato ore_assegnate da INTEGER a DECIMAL(10,2)
-- Questo permette di assegnare ore con decimali (es. 10.5 ore)
DO $$ 
BEGIN
    -- Verifica il tipo attuale
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'assegnazioni_progetto' 
        AND column_name = 'ore_assegnate' 
        AND data_type = 'integer'
    ) THEN
        ALTER TABLE assegnazioni_progetto 
        ALTER COLUMN ore_assegnate TYPE DECIMAL(10, 2);
        RAISE NOTICE 'Tipo ore_assegnate cambiato da INTEGER a DECIMAL(10,2)';
    ELSE
        RAISE NOTICE 'Campo ore_assegnate già di tipo DECIMAL o non trovato';
    END IF;
END $$;

-- 5. Crea indice per migliorare performance query di calcolo budget
CREATE INDEX IF NOT EXISTS idx_assegnazioni_progetto_progetto_utente 
ON assegnazioni_progetto(progetto_id, utente_id);

-- 6. Messaggio finale
DO $$ 
BEGIN
    RAISE NOTICE '✅ Migration 008 completata con successo!';
END $$;

COMMIT;