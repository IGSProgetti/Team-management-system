-- =====================================================
-- MIGRAZIONE NUOVE LOGICHE - TEAM MANAGEMENT SYSTEM
-- Data: 22 Gennaio 2026
-- Autore: Antonio + Claude
-- Descrizione: Implementazione 4 livelli utenti + Aree + Margini + Bonus
-- =====================================================

-- =====================================================
-- PARTE 1: AGGIORNAMENTO ENUM
-- =====================================================

-- Aggiorna ENUM ruolo utenti (se non esiste già)
DO $$ 
BEGIN
    -- Verifica se il tipo esiste
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ruolo_utente') THEN
        CREATE TYPE ruolo_utente AS ENUM ('risorsa', 'coordinatore', 'manager', 'super_admin');
    ELSE
        -- Se esiste, aggiungi i valori mancanti
        BEGIN
            ALTER TYPE ruolo_utente ADD VALUE IF NOT EXISTS 'coordinatore';
        EXCEPTION WHEN duplicate_object THEN NULL;
        END;
        BEGIN
            ALTER TYPE ruolo_utente ADD VALUE IF NOT EXISTS 'super_admin';
        EXCEPTION WHEN duplicate_object THEN NULL;
        END;
    END IF;
END $$;

-- =====================================================
-- PARTE 2: AGGIORNAMENTO TABELLA UTENTI
-- =====================================================

-- Aggiungi colonne nuove a tabella utenti
DO $$ 
BEGIN
    -- ruolo (se non esiste già)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'utenti' AND column_name = 'ruolo'
    ) THEN
        ALTER TABLE utenti ADD COLUMN ruolo VARCHAR(20) DEFAULT 'risorsa';
    END IF;

    -- compenso_annuo
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'utenti' AND column_name = 'compenso_annuo'
    ) THEN
        ALTER TABLE utenti ADD COLUMN compenso_annuo DECIMAL(10, 2) DEFAULT 0;
    END IF;

    -- costo_orario (calcolato automaticamente)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'utenti' AND column_name = 'costo_orario'
    ) THEN
        ALTER TABLE utenti ADD COLUMN costo_orario DECIMAL(10, 2) DEFAULT 0;
    END IF;

    -- ore_annue_totali (1920)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'utenti' AND column_name = 'ore_annue_totali'
    ) THEN
        ALTER TABLE utenti ADD COLUMN ore_annue_totali INTEGER DEFAULT 1920;
    END IF;

    -- ore_annue_normali (1100)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'utenti' AND column_name = 'ore_annue_normali'
    ) THEN
        ALTER TABLE utenti ADD COLUMN ore_annue_normali INTEGER DEFAULT 1100;
    END IF;

    -- ore_annue_tesoretto (820)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'utenti' AND column_name = 'ore_annue_tesoretto'
    ) THEN
        ALTER TABLE utenti ADD COLUMN ore_annue_tesoretto INTEGER DEFAULT 820;
    END IF;

    -- cliente_assegnato_id (FK a clienti)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'utenti' AND column_name = 'cliente_assegnato_id'
    ) THEN
        ALTER TABLE utenti ADD COLUMN cliente_assegnato_id INTEGER REFERENCES cliente(id) ON DELETE SET NULL;
    END IF;

    -- area_assegnata_id (FK a aree - per coordinatori, sarà creata dopo)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'utenti' AND column_name = 'area_assegnata_id'
    ) THEN
        ALTER TABLE utenti ADD COLUMN area_assegnata_id INTEGER;
    END IF;
END $$;

-- =====================================================
-- PARTE 3: CREAZIONE TABELLA AREE
-- =====================================================

CREATE TABLE IF NOT EXISTS aree (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(200) NOT NULL,
    descrizione TEXT,
    progetto_id INTEGER NOT NULL REFERENCES progetto(id) ON DELETE CASCADE,
    coordinatore_id INTEGER REFERENCES utenti(id) ON DELETE SET NULL,
    budget_stimato DECIMAL(10, 2) DEFAULT 0,
    ore_stimate DECIMAL(10, 2) DEFAULT 0,
    ore_effettive DECIMAL(10, 2) DEFAULT 0,
    data_scadenza TIMESTAMP,
    stato VARCHAR(50) DEFAULT 'programmata',
    attivo BOOLEAN DEFAULT true,
    data_creazione TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_aggiornamento TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_aree_progetto ON aree(progetto_id);
CREATE INDEX IF NOT EXISTS idx_aree_coordinatore ON aree(coordinatore_id);
CREATE INDEX IF NOT EXISTS idx_aree_attivo ON aree(attivo);

-- Ora possiamo aggiungere la FK per area_assegnata_id
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'utenti_area_assegnata_id_fkey'
    ) THEN
        ALTER TABLE utenti 
        ADD CONSTRAINT utenti_area_assegnata_id_fkey 
        FOREIGN KEY (area_assegnata_id) REFERENCES aree(id) ON DELETE SET NULL;
    END IF;
END $$;

-- =====================================================
-- PARTE 4: AGGIORNAMENTO TABELLA ATTIVITA
-- =====================================================

-- Aggiungi area_id a tabella attivita
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'attivita' AND column_name = 'area_id'
    ) THEN
        ALTER TABLE attivita ADD COLUMN area_id INTEGER REFERENCES aree(id) ON DELETE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_attivita_area ON attivita(area_id);

-- =====================================================
-- PARTE 5: TABELLA MARGINI PROGETTO
-- =====================================================

CREATE TABLE IF NOT EXISTS margini_progetto (
    id SERIAL PRIMARY KEY,
    progetto_id INTEGER NOT NULL REFERENCES progetto(id) ON DELETE CASCADE,
    risorsa_id INTEGER NOT NULL REFERENCES utenti(id) ON DELETE CASCADE,
    costo_orario_base DECIMAL(10, 2) NOT NULL,
    
    -- Percentuali margini (checkbox selezionabili)
    costo_azienda_perc DECIMAL(5, 2) DEFAULT 25.00,
    utile_gestore_azienda_perc DECIMAL(5, 2) DEFAULT 12.50,
    utile_igs_perc DECIMAL(5, 2) DEFAULT 12.50,
    costi_professionista_perc DECIMAL(5, 2) DEFAULT 20.00,
    bonus_professionista_perc DECIMAL(5, 2) DEFAULT 5.00,
    gestore_societa_perc DECIMAL(5, 2) DEFAULT 3.00,
    commerciale_perc DECIMAL(5, 2) DEFAULT 8.00,
    centrale_igs_perc DECIMAL(5, 2) DEFAULT 4.00,
    network_igs_perc DECIMAL(5, 2) DEFAULT 10.00,
    
    -- Flags per voci attive (true = inclusa nel calcolo)
    costo_azienda_attivo BOOLEAN DEFAULT true,
    utile_gestore_azienda_attivo BOOLEAN DEFAULT true,
    utile_igs_attivo BOOLEAN DEFAULT true,
    costi_professionista_attivo BOOLEAN DEFAULT true,
    bonus_professionista_attivo BOOLEAN DEFAULT true,
    gestore_societa_attivo BOOLEAN DEFAULT true,
    commerciale_attivo BOOLEAN DEFAULT true,
    centrale_igs_attivo BOOLEAN DEFAULT true,
    network_igs_attivo BOOLEAN DEFAULT true,
    
    -- Costo orario finale calcolato
    costo_orario_finale DECIMAL(10, 2) DEFAULT 0,
    
    -- Ore assegnate a questa risorsa per questo progetto
    ore_assegnate DECIMAL(10, 2) DEFAULT 0,
    
    data_creazione TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(progetto_id, risorsa_id)
);

CREATE INDEX IF NOT EXISTS idx_margini_progetto ON margini_progetto(progetto_id);
CREATE INDEX IF NOT EXISTS idx_margini_risorsa ON margini_progetto(risorsa_id);

-- =====================================================
-- PARTE 6: TABELLA BONUS RISORSE
-- =====================================================

CREATE TABLE IF NOT EXISTS bonus_risorse (
    id SERIAL PRIMARY KEY,
    risorsa_id INTEGER NOT NULL REFERENCES utenti(id) ON DELETE CASCADE,
    task_id INTEGER NOT NULL REFERENCES task(id) ON DELETE CASCADE,
    
    -- Tipo differenza
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('positivo', 'zero', 'negativo')),
    
    -- Ore
    ore_stimate DECIMAL(10, 2) NOT NULL,
    ore_effettive DECIMAL(10, 2) NOT NULL,
    differenza_ore DECIMAL(10, 2) NOT NULL, -- può essere negativa
    
    -- Bonus/Penalità
    importo_bonus DECIMAL(10, 2) DEFAULT 0, -- può essere negativo
    percentuale_bonus DECIMAL(5, 2) DEFAULT 0, -- 5% o 2.5%
    costo_orario_base DECIMAL(10, 2) DEFAULT 0, -- costo pieno (es: 205€)
    
    -- Stato approvazione
    stato VARCHAR(20) DEFAULT 'pending' CHECK (stato IN ('pending', 'approvato', 'rifiutato')),
    
    -- Azione per negativi
    azione_negativo VARCHAR(50) CHECK (azione_negativo IN ('penalita_economica', 'sottrai_ore_future', NULL)),
    
    -- Approvazione manager
    manager_id INTEGER REFERENCES utenti(id) ON DELETE SET NULL,
    data_approvazione TIMESTAMP,
    commento_manager TEXT,
    
    data_creazione TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bonus_risorsa ON bonus_risorse(risorsa_id);
CREATE INDEX IF NOT EXISTS idx_bonus_task ON bonus_risorse(task_id);
CREATE INDEX IF NOT EXISTS idx_bonus_stato ON bonus_risorse(stato);
CREATE INDEX IF NOT EXISTS idx_bonus_tipo ON bonus_risorse(tipo);

-- =====================================================
-- PARTE 7: TABELLA LOG REDISTRIBUZIONE ORE
-- =====================================================

CREATE TABLE IF NOT EXISTS log_redistribuzione_ore (
    id SERIAL PRIMARY KEY,
    manager_id INTEGER NOT NULL REFERENCES utenti(id) ON DELETE CASCADE,
    
    -- Tipo azione
    tipo_azione VARCHAR(50) NOT NULL CHECK (tipo_azione IN (
        'redistribuzione_ore',
        'approvazione_bonus',
        'rifiuto_bonus',
        'gestione_negativo',
        'creazione_task',
        'altro'
    )),
    
    -- Da/A risorse
    da_risorsa_id INTEGER REFERENCES utenti(id) ON DELETE SET NULL,
    a_risorsa_id INTEGER REFERENCES utenti(id) ON DELETE SET NULL,
    
    -- Da/A progetti
    da_progetto_id INTEGER REFERENCES progetto(id) ON DELETE SET NULL,
    a_progetto_id INTEGER REFERENCES progetto(id) ON DELETE SET NULL,
    
    -- Da/A aree
    da_area_id INTEGER REFERENCES aree(id) ON DELETE SET NULL,
    a_area_id INTEGER REFERENCES aree(id) ON DELETE SET NULL,
    
    -- Ore/Importi
    ore_spostate DECIMAL(10, 2) DEFAULT 0,
    importo_bonus DECIMAL(10, 2) DEFAULT 0,
    
    -- Dettagli
    commento TEXT NOT NULL, -- obbligatorio!
    dettagli_json JSONB, -- per dati aggiuntivi
    
    data_creazione TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_log_manager ON log_redistribuzione_ore(manager_id);
CREATE INDEX IF NOT EXISTS idx_log_tipo_azione ON log_redistribuzione_ore(tipo_azione);
CREATE INDEX IF NOT EXISTS idx_log_data ON log_redistribuzione_ore(data_creazione);

-- =====================================================
-- PARTE 8: TRIGGER AUTOMATICI
-- =====================================================

-- Trigger per calcolare automaticamente il costo_orario quando cambia il compenso_annuo
CREATE OR REPLACE FUNCTION calcola_costo_orario()
RETURNS TRIGGER AS $$
BEGIN
    -- Formula: compenso_annuo ÷ 220 giorni ÷ 5 ore
    NEW.costo_orario = ROUND(NEW.compenso_annuo / 220.0 / 5.0, 2);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_calcola_costo_orario ON utenti;
CREATE TRIGGER trigger_calcola_costo_orario
    BEFORE INSERT OR UPDATE OF compenso_annuo ON utenti
    FOR EACH ROW
    EXECUTE FUNCTION calcola_costo_orario();

-- Trigger per calcolare il costo_orario_finale nei margini
CREATE OR REPLACE FUNCTION calcola_costo_orario_finale()
RETURNS TRIGGER AS $$
DECLARE
    totale_percentuale DECIMAL(10, 2) := 0;
    costo_finale DECIMAL(10, 2);
BEGIN
    -- Somma solo le percentuali attive
    IF NEW.costo_azienda_attivo THEN 
        totale_percentuale := totale_percentuale + NEW.costo_azienda_perc;
    END IF;
    IF NEW.utile_gestore_azienda_attivo THEN 
        totale_percentuale := totale_percentuale + NEW.utile_gestore_azienda_perc;
    END IF;
    IF NEW.utile_igs_attivo THEN 
        totale_percentuale := totale_percentuale + NEW.utile_igs_perc;
    END IF;
    IF NEW.costi_professionista_attivo THEN 
        totale_percentuale := totale_percentuale + NEW.costi_professionista_perc;
    END IF;
    IF NEW.bonus_professionista_attivo THEN 
        totale_percentuale := totale_percentuale + NEW.bonus_professionista_perc;
    END IF;
    IF NEW.gestore_societa_attivo THEN 
        totale_percentuale := totale_percentuale + NEW.gestore_societa_perc;
    END IF;
    IF NEW.commerciale_attivo THEN 
        totale_percentuale := totale_percentuale + NEW.commerciale_perc;
    END IF;
    IF NEW.centrale_igs_attivo THEN 
        totale_percentuale := totale_percentuale + NEW.centrale_igs_perc;
    END IF;
    IF NEW.network_igs_attivo THEN 
        totale_percentuale := totale_percentuale + NEW.network_igs_perc;
    END IF;
    
    -- Calcola costo finale: costo_base × 100 ÷ costi_professionista_perc
    -- Questo dà il totale al 100%, poi sottraiamo le voci non attive
    costo_finale := NEW.costo_orario_base * 100.0 / NEW.costi_professionista_perc;
    
    -- Calcola quanto vale ogni voce in euro
    -- Poi sottrai le voci non attive
    IF NOT NEW.costo_azienda_attivo THEN 
        costo_finale := costo_finale - (NEW.costo_orario_base * 100.0 / NEW.costi_professionista_perc * NEW.costo_azienda_perc / 100.0);
    END IF;
    IF NOT NEW.utile_gestore_azienda_attivo THEN 
        costo_finale := costo_finale - (NEW.costo_orario_base * 100.0 / NEW.costi_professionista_perc * NEW.utile_gestore_azienda_perc / 100.0);
    END IF;
    IF NOT NEW.utile_igs_attivo THEN 
        costo_finale := costo_finale - (NEW.costo_orario_base * 100.0 / NEW.costi_professionista_perc * NEW.utile_igs_perc / 100.0);
    END IF;
    IF NOT NEW.bonus_professionista_attivo THEN 
        costo_finale := costo_finale - (NEW.costo_orario_base * 100.0 / NEW.costi_professionista_perc * NEW.bonus_professionista_perc / 100.0);
    END IF;
    IF NOT NEW.gestore_societa_attivo THEN 
        costo_finale := costo_finale - (NEW.costo_orario_base * 100.0 / NEW.costi_professionista_perc * NEW.gestore_societa_perc / 100.0);
    END IF;
    IF NOT NEW.commerciale_attivo THEN 
        costo_finale := costo_finale - (NEW.costo_orario_base * 100.0 / NEW.costi_professionista_perc * NEW.commerciale_perc / 100.0);
    END IF;
    IF NOT NEW.centrale_igs_attivo THEN 
        costo_finale := costo_finale - (NEW.costo_orario_base * 100.0 / NEW.costi_professionista_perc * NEW.centrale_igs_perc / 100.0);
    END IF;
    IF NOT NEW.network_igs_attivo THEN 
        costo_finale := costo_finale - (NEW.costo_orario_base * 100.0 / NEW.costi_professionista_perc * NEW.network_igs_perc / 100.0);
    END IF;
    
    NEW.costo_orario_finale := ROUND(costo_finale, 2);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_calcola_costo_orario_finale ON margini_progetto;
CREATE TRIGGER trigger_calcola_costo_orario_finale
    BEFORE INSERT OR UPDATE ON margini_progetto
    FOR EACH ROW
    EXECUTE FUNCTION calcola_costo_orario_finale();

-- =====================================================
-- PARTE 9: VIEW PER BUDGET CONTROL
-- =====================================================

-- View per ore disponibili risorsa per giorno
CREATE OR REPLACE VIEW ore_disponibili_giornaliere AS
SELECT 
    u.id as risorsa_id,
    u.nome,
    u.email,
    DATE(t.data_scadenza) as giorno,
    COALESCE(SUM(t.ore_stimate), 0) as ore_assegnate,
    8 - COALESCE(SUM(t.ore_stimate), 0) as ore_disponibili
FROM utenti u
LEFT JOIN task t ON t.utente_assegnato = u.id 
    AND t.attivo = true
GROUP BY u.id, u.nome, u.email, DATE(t.data_scadenza);

-- View per calcolo totale bonus/penalità per risorsa
CREATE OR REPLACE VIEW totale_bonus_risorse AS
SELECT 
    risorsa_id,
    COUNT(*) as totale_task,
    SUM(CASE WHEN tipo = 'positivo' THEN 1 ELSE 0 END) as task_positive,
    SUM(CASE WHEN tipo = 'zero' THEN 1 ELSE 0 END) as task_precise,
    SUM(CASE WHEN tipo = 'negativo' THEN 1 ELSE 0 END) as task_negative,
    SUM(CASE WHEN stato = 'approvato' THEN importo_bonus ELSE 0 END) as bonus_approvato,
    SUM(CASE WHEN stato = 'pending' THEN importo_bonus ELSE 0 END) as bonus_pending,
    SUM(CASE WHEN stato = 'rifiutato' THEN importo_bonus ELSE 0 END) as bonus_rifiutato
FROM bonus_risorse
GROUP BY risorsa_id;

-- =====================================================
-- PARTE 10: DATI DEMO (OPZIONALE)
-- =====================================================

-- Aggiorna utenti esistenti con nuovi campi
UPDATE utenti SET 
    ruolo = 'manager',
    compenso_annuo = 45000,
    ore_annue_totali = 1920,
    ore_annue_normali = 1100,
    ore_annue_tesoretto = 820
WHERE email = 'manager@team.com';

UPDATE utenti SET 
    ruolo = 'risorsa',
    compenso_annuo = 30000,
    ore_annue_totali = 1920,
    ore_annue_normali = 1100,
    ore_annue_tesoretto = 820
WHERE email = 'mario@team.com';

-- =====================================================
-- FINE MIGRAZIONE
-- =====================================================

-- Verifica finale
SELECT 'MIGRAZIONE COMPLETATA CON SUCCESSO!' as status;

-- Mostra tabelle create
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('aree', 'margini_progetto', 'bonus_risorse', 'log_redistribuzione_ore')
ORDER BY table_name;
