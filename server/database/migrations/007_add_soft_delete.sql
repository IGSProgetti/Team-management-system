-- ============================================================================
-- MIGRATION 002: Soft Delete Support
-- Aggiunge campo 'attivo' alle tabelle che non ce l'hanno
-- Sicuro per Render e Locale
-- ============================================================================

-- NOTA: Questa migration è IDEMPOTENTE (può essere eseguita più volte senza problemi)

-- 1. ATTIVITA: Aggiungi campo attivo
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'attivita' AND column_name = 'attivo'
    ) THEN
        ALTER TABLE attivita ADD COLUMN attivo BOOLEAN DEFAULT true;
        RAISE NOTICE 'Campo attivo aggiunto a tabella attivita';
    ELSE
        RAISE NOTICE 'Campo attivo già presente in tabella attivita';
    END IF;
END $$;

-- 2. TASK: Aggiungi campo attivo
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'task' AND column_name = 'attivo'
    ) THEN
        ALTER TABLE task ADD COLUMN attivo BOOLEAN DEFAULT true;
        RAISE NOTICE 'Campo attivo aggiunto a tabella task';
    ELSE
        RAISE NOTICE 'Campo attivo già presente in tabella task';
    END IF;
END $$;

-- 3. ASSEGNAZIONI_PROGETTO: Aggiungi campo attivo
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'assegnazioni_progetto' AND column_name = 'attivo'
    ) THEN
        ALTER TABLE assegnazioni_progetto ADD COLUMN attivo BOOLEAN DEFAULT true;
        RAISE NOTICE 'Campo attivo aggiunto a tabella assegnazioni_progetto';
    ELSE
        RAISE NOTICE 'Campo attivo già presente in tabella assegnazioni_progetto';
    END IF;
END $$;

-- 4. ASSEGNAZIONI_ATTIVITA: Aggiungi campo attivo
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'assegnazioni_attivita' AND column_name = 'attivo'
    ) THEN
        ALTER TABLE assegnazioni_attivita ADD COLUMN attivo BOOLEAN DEFAULT true;
        RAISE NOTICE 'Campo attivo aggiunto a tabella assegnazioni_attivita';
    ELSE
        RAISE NOTICE 'Campo attivo già presente in tabella assegnazioni_attivita';
    END IF;
END $$;

-- 5. TIMESHEET: Aggiungi campo attivo
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'timesheet' AND column_name = 'attivo'
    ) THEN
        ALTER TABLE timesheet ADD COLUMN attivo BOOLEAN DEFAULT true;
        RAISE NOTICE 'Campo attivo aggiunto a tabella timesheet';
    ELSE
        RAISE NOTICE 'Campo attivo già presente in tabella timesheet';
    END IF;
END $$;

-- 6. Aggiorna tutti i record esistenti per essere sicuri che attivo = true
UPDATE attivita SET attivo = true WHERE attivo IS NULL;
UPDATE task SET attivo = true WHERE attivo IS NULL;
UPDATE assegnazioni_progetto SET attivo = true WHERE attivo IS NULL;
UPDATE assegnazioni_attivita SET attivo = true WHERE attivo IS NULL;
UPDATE timesheet SET attivo = true WHERE attivo IS NULL;

-- 7. Crea indici per performance su query filtrate per 'attivo'
-- Solo se non esistono già
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_attivita_attivo') THEN
        CREATE INDEX idx_attivita_attivo ON attivita(attivo);
        RAISE NOTICE 'Indice idx_attivita_attivo creato';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_task_attivo') THEN
        CREATE INDEX idx_task_attivo ON task(attivo);
        RAISE NOTICE 'Indice idx_task_attivo creato';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_utenti_attivo') THEN
        CREATE INDEX idx_utenti_attivo ON utenti(attivo);
        RAISE NOTICE 'Indice idx_utenti_attivo creato';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_clienti_attivo') THEN
        CREATE INDEX idx_clienti_attivo ON clienti(attivo);
        RAISE NOTICE 'Indice idx_clienti_attivo creato';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_progetti_attivo') THEN
        CREATE INDEX idx_progetti_attivo ON progetti(attivo);
        RAISE NOTICE 'Indice idx_progetti_attivo creato';
    END IF;
END $$;

-- ============================================================================
-- MIGRATION COMPLETATA
-- Tutte le tabelle ora hanno il campo 'attivo' per soft delete
-- ============================================================================

SELECT 'Migration 002 completata con successo!' as status;