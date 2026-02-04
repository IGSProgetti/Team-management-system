-- =====================================================
-- MIGRATION 012: FIX Calcolo Penalità Bonus
-- Data: 2026-02-03
-- Descrizione: Corregge il calcolo delle penalità (minuti → ore)
-- =====================================================

BEGIN;

-- =====================================================
-- FIX: Funzione calcola_bonus_task_completata() CORRETTA
-- =====================================================
CREATE OR REPLACE FUNCTION calcola_bonus_task_completata()
RETURNS TRIGGER AS $$
DECLARE
    v_cliente_id UUID;
    v_costo_orario_finale NUMERIC(10,2);
    v_costo_orario_base NUMERIC(10,2);
    v_differenza_ore INTEGER;
    v_tipo VARCHAR(20);
    v_percentuale_bonus NUMERIC(5,2);
    v_importo_bonus NUMERIC(10,2);
    v_bonus_exists BOOLEAN;
BEGIN
    -- Solo se la task passa a "completata" E ha ore_effettive compilate
    IF NEW.stato = 'completata' AND NEW.ore_effettive IS NOT NULL THEN
        
        RAISE NOTICE '🎯 Task completata: % (ID: %)', NEW.nome, NEW.id;
        
        -- Verifica se esiste già un bonus per questa task
        SELECT EXISTS(
            SELECT 1 FROM bonus_risorse WHERE task_id = NEW.id
        ) INTO v_bonus_exists;
        
        -- Se esiste già, non creare un duplicato
        IF v_bonus_exists THEN
            RAISE NOTICE '⚠️ Bonus già esistente per task %', NEW.id;
            RETURN NEW;
        END IF;
        
        -- =====================================================
        -- STEP A: Risali la gerarchia per trovare il cliente
        -- =====================================================
        SELECT p.cliente_id INTO v_cliente_id
        FROM task t
        JOIN attivita a ON t.attivita_id = a.id
        JOIN progetti p ON a.progetto_id = p.id
        WHERE t.id = NEW.id;
        
        RAISE NOTICE '📊 Cliente trovato: %', v_cliente_id;
        
        -- =====================================================
        -- STEP B: Trova il costo orario finale dalla assegnazione
        -- =====================================================
        SELECT 
            acr.costo_orario_finale,
            acr.costo_orario_base
        INTO 
            v_costo_orario_finale,
            v_costo_orario_base
        FROM assegnazione_cliente_risorsa acr
        WHERE acr.cliente_id = v_cliente_id
        AND acr.risorsa_id = NEW.utente_assegnato;
        
        -- Se non trova l'assegnazione, usa il costo orario base dalla tabella utenti
        IF v_costo_orario_finale IS NULL THEN
            RAISE NOTICE '⚠️ Nessuna assegnazione trovata, uso costo_orario da utenti';
            
            SELECT costo_orario INTO v_costo_orario_base
            FROM utenti
            WHERE id = NEW.utente_assegnato;
            
            v_costo_orario_finale := v_costo_orario_base;
        END IF;
        
        RAISE NOTICE '💰 Costi: Base=€% Finale=€%', v_costo_orario_base, v_costo_orario_finale;
        
        -- =====================================================
        -- STEP C: Calcola differenza ore e tipo bonus
        -- =====================================================
        v_differenza_ore := NEW.ore_stimate - NEW.ore_effettive;
        
        RAISE NOTICE '⏱️ Ore: Stimate=% Effettive=% Differenza=%', 
            NEW.ore_stimate, NEW.ore_effettive, v_differenza_ore;
        
        -- Determina tipo e percentuale bonus
        IF v_differenza_ore > 0 THEN
            -- Ore effettive < Ore stimate → BONUS POSITIVO 5%
            v_tipo := 'positivo';
            v_percentuale_bonus := 5.00;
        ELSIF v_differenza_ore = 0 THEN
            -- Ore effettive = Ore stimate → BONUS PERFETTO 2.5%
            v_tipo := 'zero';
            v_percentuale_bonus := 2.50;
        ELSE
            -- Ore effettive > Ore stimate → PENALITÀ
            v_tipo := 'negativo';
            v_percentuale_bonus := 0.00;
        END IF;
        
        -- =====================================================
        -- STEP D: Calcola importo bonus (FORMULA CORRETTA)
        -- =====================================================
        IF v_tipo = 'negativo' THEN
            -- ✅ FIX: Converti minuti in ore PRIMA di moltiplicare per costo orario
            -- Formula: (costo_orario / 60) × differenza_minuti × -1
            v_importo_bonus := (v_costo_orario_finale / 60.0) * ABS(v_differenza_ore) * -1;
            
            RAISE NOTICE '🔴 PENALITÀ: (€%/60) × % min × -1 = €%', 
                v_costo_orario_finale, ABS(v_differenza_ore), v_importo_bonus;
        ELSE
            -- ✅ Bonus positivi/zero: (costo_orario × ore_effettive_in_ore × percentuale) / 100
            -- Converti minuti in ore dividendo per 60
            v_importo_bonus := (v_costo_orario_finale * (NEW.ore_effettive / 60.0) * v_percentuale_bonus) / 100;
            
            RAISE NOTICE '🟢 BONUS: €% × (% min / 60) × %% / 100 = €%', 
                v_costo_orario_finale, NEW.ore_effettive, v_percentuale_bonus, v_importo_bonus;
        END IF;
        
        RAISE NOTICE '🎁 Bonus finale: Tipo=% Importo=€%', v_tipo, v_importo_bonus;
        
        -- =====================================================
        -- STEP E: Inserisci record in bonus_risorse
        -- =====================================================
        INSERT INTO bonus_risorse (
            risorsa_id,
            task_id,
            tipo,
            ore_stimate,
            ore_effettive,
            differenza_ore,
            importo_bonus,
            percentuale_bonus,
            costo_orario_base,
            costo_orario_finale,
            stato
        ) VALUES (
            NEW.utente_assegnato,
            NEW.id,
            v_tipo,
            NEW.ore_stimate,
            NEW.ore_effettive,
            v_differenza_ore,
            v_importo_bonus,
            v_percentuale_bonus,
            v_costo_orario_base,
            v_costo_orario_finale,
            'pending'
        );
        
        RAISE NOTICE '✅ Bonus creato con successo per task %', NEW.id;
        
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- =====================================================
-- STEP 2: Cancella bonus sbagliati esistenti (OPZIONALE)
-- =====================================================
-- ⚠️ ATTENZIONE: Questo cancellerà tutti i bonus esistenti per ricalcolarli!
-- Decommentare solo se vuoi resettare tutti i bonus

/*
DO $$
BEGIN
    RAISE NOTICE '🗑️ Cancellazione bonus esistenti...';
    DELETE FROM bonus_risorse;
    RAISE NOTICE '✅ Bonus cancellati';
END $$;
*/


-- =====================================================
-- STEP 3: Log finale
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ Migration 012 completata con successo!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 Fix applicati:';
    RAISE NOTICE '  1. ✅ Formula penalità corretta (minuti → ore)';
    RAISE NOTICE '  2. ✅ Formula bonus positivi corretta';
    RAISE NOTICE '';
    RAISE NOTICE '📝 Nota: I bonus esistenti NON sono stati cancellati';
    RAISE NOTICE '         Per ricalcolarli, decommenta STEP 2';
    RAISE NOTICE '';
END $$;

COMMIT;