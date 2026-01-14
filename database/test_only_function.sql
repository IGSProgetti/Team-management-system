-- SOLO TEST CREAZIONE FUNZIONE (nessun trigger ancora!)
CREATE OR REPLACE FUNCTION update_activity_estimated_hours()
RETURNS TRIGGER AS $$
BEGIN
    RAISE NOTICE 'Test funzione - attività ID: %', COALESCE(NEW.attivita_id, OLD.attivita_id);
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

SELECT 'Funzione di test creata - NESSUN TRIGGER ATTIVO' as result;
