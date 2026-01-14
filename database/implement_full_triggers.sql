-- FUNZIONE ORE EFFETTIVE
CREATE OR REPLACE FUNCTION update_activity_actual_hours()
RETURNS TRIGGER AS $$
BEGIN
    RAISE NOTICE 'Ricalcolo ore effettive per attività: %', COALESCE(NEW.attivita_id, OLD.attivita_id);
    
    UPDATE attivita 
    SET ore_effettive = (
        SELECT COALESCE(SUM(ore_effettive), 0) 
        FROM task 
        WHERE attivita_id = COALESCE(NEW.attivita_id, OLD.attivita_id) 
        AND stato = 'completata'
        AND ore_effettive IS NOT NULL
    ),
    data_aggiornamento = CURRENT_TIMESTAMP
    WHERE id = COALESCE(NEW.attivita_id, OLD.attivita_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- TRIGGER INSERT TASK
DROP TRIGGER IF EXISTS trigger_task_insert_update_estimated_hours ON task;
CREATE TRIGGER trigger_task_insert_update_estimated_hours
    AFTER INSERT ON task
    FOR EACH ROW
    EXECUTE FUNCTION update_activity_estimated_hours();

-- TRIGGER DELETE TASK  
DROP TRIGGER IF EXISTS trigger_task_delete_update_estimated_hours ON task;
CREATE TRIGGER trigger_task_delete_update_estimated_hours
    AFTER DELETE ON task
    FOR EACH ROW
    EXECUTE FUNCTION update_activity_estimated_hours();

-- TRIGGER ORE EFFETTIVE
DROP TRIGGER IF EXISTS trigger_task_update_actual_hours ON task;
CREATE TRIGGER trigger_task_update_actual_hours
    AFTER UPDATE OF ore_effettive, stato ON task
    FOR EACH ROW
    WHEN (NEW.stato = 'completata' OR OLD.stato = 'completata')
    EXECUTE FUNCTION update_activity_actual_hours();

SELECT 'Sistema completo implementato con successo!' as result;
