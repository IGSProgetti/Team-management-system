-- Aggiorna la funzione per il calcolo reale
CREATE OR REPLACE FUNCTION update_activity_estimated_hours()
RETURNS TRIGGER AS $$
BEGIN
    RAISE NOTICE 'Ricalcolo ore stimate per attività: %', COALESCE(NEW.attivita_id, OLD.attivita_id);
    
    -- Calcola ore_stimate sommando tutte le task
    UPDATE attivita 
    SET ore_stimate = (
        SELECT COALESCE(SUM(ore_stimate), 0) 
        FROM task 
        WHERE attivita_id = COALESCE(NEW.attivita_id, OLD.attivita_id)
    ),
    data_aggiornamento = CURRENT_TIMESTAMP
    WHERE id = COALESCE(NEW.attivita_id, OLD.attivita_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Crea UN SOLO trigger per test (solo su UPDATE ore_stimate task)
DROP TRIGGER IF EXISTS test_trigger_update_estimated ON task;
CREATE TRIGGER test_trigger_update_estimated
    AFTER UPDATE OF ore_stimate ON task
    FOR EACH ROW
    EXECUTE FUNCTION update_activity_estimated_hours();

SELECT 'Trigger di test creato - solo per UPDATE ore_stimate' as result;
