-- SISTEMA RIASSEGNAZIONI ORE - SCHEMA DATABASE CORRETTO
-- Supporta parzializzazione crediti e tracciabilità completa

-- 1. PRIMA: Creo l'ENUM type
CREATE TYPE stato_riassegnazione AS ENUM ('attiva', 'annullata');

-- 2. SECONDA: Creo la tabella principale
CREATE TABLE riassegnazioni_ore (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- SORGENTE (da dove prendo le ore - solo task completate)
    task_sorgente_id UUID NOT NULL REFERENCES task(id),
    minuti_prelevati INTEGER NOT NULL, -- quanti minuti prendo (può essere < al credito totale)
    
    -- DESTINAZIONE (dove metto le ore)
    task_destinazione_id UUID REFERENCES task(id), -- NULL se creo nuova task
    attivita_destinazione_id UUID REFERENCES attivita(id), -- per nuove task
    progetto_destinazione_id UUID NOT NULL REFERENCES progetti(id),
    minuti_assegnati INTEGER NOT NULL, -- di solito = minuti_prelevati
    
    -- METADATI OPERAZIONE
    creato_da UUID NOT NULL REFERENCES utenti(id), -- manager
    motivo TEXT, -- "Compensazione eccedenza Task API Login"
    data_riassegnazione TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- GESTIONE STATO
    stato stato_riassegnazione DEFAULT 'attiva',
    
    -- AUDIT ANNULLAMENTI
    data_annullamento TIMESTAMP,
    annullato_da UUID REFERENCES utenti(id),
    motivo_annullamento TEXT,
    
    -- VINCOLI
    CONSTRAINT minuti_positivi CHECK (minuti_prelevati > 0 AND minuti_assegnati > 0),
    CONSTRAINT sorgente_destinazione_diverse CHECK (task_sorgente_id != task_destinazione_id)
);

-- 3. TERZO: Creo gli indici per performance
CREATE INDEX idx_riassegnazioni_task_sorgente ON riassegnazioni_ore(task_sorgente_id);
CREATE INDEX idx_riassegnazioni_task_destinazione ON riassegnazioni_ore(task_destinazione_id);
CREATE INDEX idx_riassegnazioni_stato ON riassegnazioni_ore(stato);
CREATE INDEX idx_riassegnazioni_data ON riassegnazioni_ore(data_riassegnazione);
CREATE INDEX idx_riassegnazioni_manager ON riassegnazioni_ore(creato_da);

-- 4. QUARTO: Creo le viste (ora che la tabella esiste)

-- Vista per crediti disponibili per task
CREATE OR REPLACE VIEW crediti_task_disponibili AS
WITH task_crediti AS (
    -- Calcola crediti originali (ore stimate - ore effettive)
    SELECT 
        t.id as task_id,
        t.nome as task_nome,
        t.ore_stimate,
        t.ore_effettive,
        t.utente_assegnato,
        u.nome as risorsa_nome,
        p.id as progetto_id,
        p.nome as progetto_nome,
        c.id as cliente_id, 
        c.nome as cliente_nome,
        a.nome as attivita_nome,
        -- Credito = ore stimate - ore effettive (solo se positivo)
        CASE 
            WHEN t.ore_stimate > t.ore_effettive THEN (t.ore_stimate - t.ore_effettive)
            ELSE 0
        END as credito_originale_minuti
    FROM task t
    JOIN attivita a ON t.attivita_id = a.id
    JOIN progetti p ON a.progetto_id = p.id  
    JOIN clienti c ON p.cliente_id = c.id
    JOIN utenti u ON t.utente_assegnato = u.id
    WHERE t.stato = 'completata' -- Solo task completate
      AND t.ore_effettive IS NOT NULL
      AND t.ore_stimate > t.ore_effettive -- Solo se c'è credito
),
crediti_utilizzati AS (
    -- Calcola crediti già utilizzati in riassegnazioni attive
    SELECT 
        task_sorgente_id,
        SUM(minuti_prelevati) as minuti_utilizzati
    FROM riassegnazioni_ore
    WHERE stato = 'attiva'
    GROUP BY task_sorgente_id
)
SELECT 
    tc.*,
    COALESCE(cu.minuti_utilizzati, 0) as credito_utilizzato_minuti,
    (tc.credito_originale_minuti - COALESCE(cu.minuti_utilizzati, 0)) as credito_disponibile_minuti,
    ROUND((tc.credito_originale_minuti - COALESCE(cu.minuti_utilizzati, 0))::decimal / 60, 2) as credito_disponibile_ore
FROM task_crediti tc
LEFT JOIN crediti_utilizzati cu ON tc.task_id = cu.task_sorgente_id
WHERE (tc.credito_originale_minuti - COALESCE(cu.minuti_utilizzati, 0)) > 0 -- Solo crediti disponibili
ORDER BY tc.cliente_nome, tc.progetto_nome, tc.task_nome;

-- Vista per debiti task (eccedenze)
CREATE OR REPLACE VIEW debiti_task AS
SELECT 
    t.id as task_id,
    t.nome as task_nome,
    t.ore_stimate,
    t.ore_effettive,
    t.utente_assegnato,
    u.nome as risorsa_nome,
    p.id as progetto_id,
    p.nome as progetto_nome,
    c.id as cliente_id,
    c.nome as cliente_nome,
    a.nome as attivita_nome,
    -- Debito = ore effettive - ore stimate (solo se positivo)
    (t.ore_effettive - t.ore_stimate) as debito_minuti,
    ROUND((t.ore_effettive - t.ore_stimate)::decimal / 60, 2) as debito_ore,
    -- Calcola debito compensato da riassegnazioni
    COALESCE(SUM(r.minuti_assegnati), 0) as compensato_minuti,
    -- Debito rimanente
    ((t.ore_effettive - t.ore_stimate) - COALESCE(SUM(r.minuti_assegnati), 0)) as debito_residuo_minuti
FROM task t
JOIN attivita a ON t.attivita_id = a.id
JOIN progetti p ON a.progetto_id = p.id
JOIN clienti c ON p.cliente_id = c.id
JOIN utenti u ON t.utente_assegnato = u.id
LEFT JOIN riassegnazioni_ore r ON t.id = r.task_destinazione_id AND r.stato = 'attiva'
WHERE t.stato = 'completata'
  AND t.ore_effettive IS NOT NULL 
  AND t.ore_effettive > t.ore_stimate -- Solo eccedenze
GROUP BY t.id, t.nome, t.ore_stimate, t.ore_effettive, t.utente_assegnato, 
         u.nome, p.id, p.nome, c.id, c.nome, a.nome
HAVING ((t.ore_effettive - t.ore_stimate) - COALESCE(SUM(r.minuti_assegnati), 0)) > 0 -- Solo debiti non completamente compensati
ORDER BY c.nome, p.nome, t.nome;

-- Vista riassegnazioni con dettagli (CORRETTA - Syntax error fix)
CREATE OR REPLACE VIEW riassegnazioni_dettagliate AS
SELECT 
    r.id as riassegnazione_id,
    r.minuti_prelevati,
    r.minuti_assegnati,
    r.motivo,
    r.data_riassegnazione,
    r.stato,
    
    -- Task sorgente
    ts.nome as task_sorgente_nome,
    us.nome as risorsa_sorgente_nome,
    ps.nome as progetto_sorgente_nome,
    cs.nome as cliente_sorgente_nome,
    
    -- Task destinazione (può essere NULL se nuova task)
    td.nome as task_destinazione_nome,
    ud.nome as risorsa_destinazione_nome,
    pd.nome as progetto_destinazione_nome,
    cd.nome as cliente_destinazione_nome,
    
    -- Manager che ha fatto la riassegnazione
    um.nome as manager_nome,
    
    -- Info annullamento
    r.data_annullamento,
    r.motivo_annullamento,
    ua.nome as annullato_da_nome
    
FROM riassegnazioni_ore r
-- Task sorgente (sempre presente)
JOIN task ts ON r.task_sorgente_id = ts.id
JOIN attivita ass ON ts.attivita_id = ass.id  -- FIX: alias corretto
JOIN progetti ps ON ass.progetto_id = ps.id
JOIN clienti cs ON ps.cliente_id = cs.id
JOIN utenti us ON ts.utente_assegnato = us.id
-- Manager
JOIN utenti um ON r.creato_da = um.id
-- Task destinazione (opzionale)
LEFT JOIN task td ON r.task_destinazione_id = td.id
LEFT JOIN attivita ad ON td.attivita_id = ad.id  
LEFT JOIN progetti pd ON ad.progetto_id = pd.id
LEFT JOIN clienti cd ON pd.cliente_id = cd.id
LEFT JOIN utenti ud ON td.utente_assegnato = ud.id
-- Manager annullamento (opzionale)
LEFT JOIN utenti ua ON r.annullato_da = ua.id
ORDER BY r.data_riassegnazione DESC;

-- 5. QUINTO: Funzione per validare riassegnazione
CREATE OR REPLACE FUNCTION valida_riassegnazione(
    p_task_sorgente_id UUID,
    p_minuti_prelevati INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
    v_credito_disponibile INTEGER;
BEGIN
    -- Ottieni credito disponibile per la task sorgente
    SELECT credito_disponibile_minuti INTO v_credito_disponibile
    FROM crediti_task_disponibili 
    WHERE task_id = p_task_sorgente_id;
    
    -- Se non trova la task, nessun credito disponibile
    IF v_credito_disponibile IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Verifica se ci sono abbastanza minuti disponibili
    RETURN v_credito_disponibile >= p_minuti_prelevati;
END;
$$ LANGUAGE plpgsql;

-- 6. SESTO: Test di verifica (opzionale)
-- Query per verificare che tutto funzioni
-- SELECT 'Setup completato!' as status;

-- Verifica che le viste siano state create
-- \dv crediti_task_disponibili
-- \dv debiti_task
-- \dv riassegnazioni_dettagliate