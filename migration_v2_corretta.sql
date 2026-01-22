-- =====================================================
-- MIGRAZIONE NUOVE LOGICHE V2 - COMPATIBILE CON SCHEMA ESISTENTE
-- Data: 22 Gennaio 2026
-- Database: UUID-based con tabelle clienti/progetti/attivita/task
-- =====================================================

-- =====================================================
-- PARTE 1: AGGIORNAMENTO ENUM RUOLI
-- =====================================================

-- Aggiungi nuovi ruoli all'ENUM esistente
ALTER TYPE ruolo_utente ADD VALUE IF NOT EXISTS 'coordinatore';
ALTER TYPE ruolo_utente ADD VALUE IF NOT EXISTS 'super_admin';

-- =====================================================
-- PARTE 2: AGGIORNAMENTO TABELLA UTENTI
-- =====================================================

-- Aggiungi colonne mancanti (alcune potrebbero già esistere)
DO $$ 
BEGIN
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

    -- cliente_assegnato_id (FK a clienti - UUID)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'utenti' AND column_name = 'cliente_assegnato_id'
    ) THEN
        ALTER TABLE utenti ADD COLUMN cliente_assegnato_id UUID REFERENCES clienti(id) ON DELETE SET NULL;
    END IF;

    -- area_assegnata_id (FK a aree - UUID, sarà creata dopo)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'utenti' AND column_name = 'area_assegnata_id'
    ) THEN
        ALTER TABLE utenti ADD COLUMN area_assegnata_id UUID;
    END IF;
END $$;

-- =====================================================
-- PARTE 3: CREAZIONE TABELLA AREE
-- =====================================================

CREATE TABLE IF NOT EXISTS aree (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(200) NOT NULL,
    descrizione TEXT,
    progetto_id UUID NOT NULL REFERENCES progetti(id) ON DELETE CASCADE,
    coordinatore_id UUID REFERENCES utenti(id) ON DELETE SET NULL,
    budget_stimato DECIMAL(10, 2) DEFAULT 0,
    ore_stimate INTEGER DEFAULT 0, -- minuti
    ore_effettive INTEGER DEFAULT 0, -- minuti
    scadenza TIMESTAMP,
    stato VARCHAR(50) DEFAULT 'pianificata',
    attivo BOOLEAN DEFAULT true,
    data_creazione TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_aggiornamento TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_aree_progetto ON aree(progetto_id);
CREATE INDEX IF NOT EXISTS idx_aree_coordinatore ON aree(coordinatore_id);
CREATE INDEX IF NOT EXISTS idx_aree_attivo ON aree(attivo);

-- Ora aggiungiamo la FK per area_assegnata_id
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

-- Aggiungi area_id alla tabella attivita
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'attivita' AND column_name = 'area_id'
    ) THEN
        ALTER TABLE attivita ADD COLUMN area_id UUID REFERENCES aree(id) ON DELETE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_attivita_area ON attivita(area_id);

-- =====================================================
-- PARTE 5: TABELLA MARGINI PROGETTO
-- =====================================================

CREATE TABLE IF NOT EXISTS margini_progetto (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    progetto_id UUID NOT NULL REFERENCES progetti(id) ON DELETE CASCADE,
    risorsa_id UUID NOT NULL REFERENCES utenti(id) ON DELETE CASCADE,
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
    
    -- Ore assegnate (in minuti)
    ore_assegnate INTEGER DEFAULT 0,
    
    data_creazione TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(progetto_id, risorsa_id)
);

CREATE INDEX IF NOT EXISTS idx_margini_progetto ON margini_progetto(progetto_id);
CREATE INDEX IF NOT EXISTS idx_margini_risorsa ON margini_progetto(risorsa_id);

-- =====================================================
-- PARTE 6: TABELLA BONUS RISORSE
-- =====================================================

CREATE TABLE IF NOT EXISTS bonus_risorse (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    risorsa_id UUID NOT NULL REFERENCES utenti(id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES task(id) ON DELETE CASCADE,
    
    -- Tipo differenza
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('positivo', 'zero', 'negativo')),
    
    -- Ore (in minuti)
    ore_stimate INTEGER NOT NULL,
    ore_effettive INTEGER NOT NULL,
    differenza_ore INTEGER NOT NULL, -- può essere negativo
    
    -- Bonus/Penalità
    importo_bonus DECIMAL(10, 2) DEFAULT 0, -- può essere negativo
    percentuale_bonus DECIMAL(5, 2) DEFAULT 0, -- 5% o 2.5%
    costo_orario_base DECIMAL(10, 2) DEFAULT 0, -- costo pieno (es: 205€)
    
    -- Stato approvazione
    stato VARCHAR(20) DEFAULT 'pending' CHECK (stato IN ('pending', 'approvato', 'rifiutato')),
    
    -- Azione per negativi
    azione_negativo VARCHAR(50) CHECK (azione_negativo IN ('penalita_economica', 'sottrai_ore_future', NULL)),
    
    -- Approvazione manager
    manager_id UUID REFERENCES utenti(id) ON DELETE SET NULL,
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
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    manager_id UUID NOT NULL REFERENCES utenti(id) ON DELETE CASCADE,
    
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
    da_risorsa_id UUID REFERENCES utenti(id) ON DELETE SET NULL,
    a_risorsa_id UUID REFERENCES utenti(id) ON DELETE SET NULL,
    
    -- Da/A progetti
    da_progetto_id UUID REFERENCES progetti(id) ON DELETE SET NULL,
    a_progetto_id UUID REFERENCES progetti(id) ON DELETE SET NULL,
    
    -- Da/A aree
    da_area_id UUID REFERENCES aree(id) ON DELETE SET NULL,
    a_area_id UUID REFERENCES aree(id) ON DELETE SET NULL,
    
    -- Ore/Importi (ore in minuti)
    ore_spostate INTEGER DEFAULT 0,
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

-- Trigger per calcolare automaticamente il costo_orario quando cambia compenso_annuale
CREATE OR REPLACE FUNCTION calcola_costo_orario()
RETURNS TRIGGER AS $$
BEGIN
    -- Formula: compenso_annuale ÷ 220 giorni ÷ 5 ore
    NEW.costo_orario = ROUND(NEW.compenso_annuale / 220.0 / 5.0, 2);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_calcola_costo_orario ON utenti;
CREATE TRIGGER trigger_calcola_costo_orario
    BEFORE INSERT OR UPDATE OF compenso_annuale ON utenti
    FOR EACH ROW
    WHEN (NEW.costo_orario_manuale = false OR NEW.costo_orario_manuale IS NULL)
    EXECUTE FUNCTION calcola_costo_orario();

-- Trigger per calcolare il costo_orario_finale nei margini
CREATE OR REPLACE FUNCTION calcola_costo_orario_finale()
RETURNS TRIGGER AS $$
DECLARE
    costo_base_100 DECIMAL(10, 2);
    costo_finale DECIMAL(10, 2);
BEGIN
    -- Calcola costo al 100%: costo_base × 100 ÷ costi_professionista_perc
    costo_base_100 := NEW.costo_orario_base * 100.0 / NEW.costi_professionista_perc;
    
    -- Inizia con il costo al 100%
    costo_finale := costo_base_100;
    
    -- Sottrai le voci NON attive
    IF NOT NEW.costo_azienda_attivo THEN 
        costo_finale := costo_finale - (costo_base_100 * NEW.costo_azienda_perc / 100.0);
    END IF;
    IF NOT NEW.utile_gestore_azienda_attivo THEN 
        costo_finale := costo_finale - (costo_base_100 * NEW.utile_gestore_azienda_perc / 100.0);
    END IF;
    IF NOT NEW.utile_igs_attivo THEN 
        costo_finale := costo_finale - (costo_base_100 * NEW.utile_igs_perc / 100.0);
    END IF;
    IF NOT NEW.bonus_professionista_attivo THEN 
        costo_finale := costo_finale - (costo_base_100 * NEW.bonus_professionista_perc / 100.0);
    END IF;
    IF NOT NEW.gestore_societa_attivo THEN 
        costo_finale := costo_finale - (costo_base_100 * NEW.gestore_societa_perc / 100.0);
    END IF;
    IF NOT NEW.commerciale_attivo THEN 
        costo_finale := costo_finale - (costo_base_100 * NEW.commerciale_perc / 100.0);
    END IF;
    IF NOT NEW.centrale_igs_attivo THEN 
        costo_finale := costo_finale - (costo_base_100 * NEW.centrale_igs_perc / 100.0);
    END IF;
    IF NOT NEW.network_igs_attivo THEN 
        costo_finale := costo_finale - (costo_base_100 * NEW.network_igs_perc / 100.0);
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
    DATE(t.scadenza) as giorno,
    COALESCE(SUM(t.ore_stimate), 0) as minuti_assegnati,
    480 - COALESCE(SUM(t.ore_stimate), 0) as minuti_disponibili -- 8 ore = 480 minuti
FROM utenti u
LEFT JOIN task t ON t.utente_assegnato = u.id 
    AND t.stato IN ('programmata', 'in_esecuzione')
GROUP BY u.id, u.nome, u.email, DATE(t.scadenza);

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
-- PARTE 10: AGGIORNAMENTO DATI ESISTENTI
-- =====================================================

-- Aggiorna utenti esistenti con nuovi campi (solo se non già impostati)
UPDATE utenti SET 
    ore_annue_totali = 1920,
    ore_annue_normali = 1100,
    ore_annue_tesoretto = 820
WHERE ore_annue_totali IS NULL OR ore_annue_totali = 0;

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

-- Mostra nuove colonne tabella utenti
SELECT column_name, data_type
FROM information_schema.columns 
WHERE table_name = 'utenti' 
AND column_name IN ('ore_annue_totali', 'ore_annue_normali', 'ore_annue_tesoretto', 'cliente_assegnato_id', 'area_assegnata_id')
ORDER BY column_name;
