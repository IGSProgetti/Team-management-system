-- =====================================================
-- MIGRATION 013: Gestione Bonus/Penalità
-- =====================================================
-- Aggiunge funzionalità per gestire bonus pagati e penalità recuperate
-- Data: 2025-01-22
-- =====================================================

-- STEP 1: Aggiungi campo stato_gestione
-- Questo campo traccia COSA è stato fatto con il bonus/penalità
ALTER TABLE bonus_risorse 
ADD COLUMN IF NOT EXISTS stato_gestione VARCHAR(50) DEFAULT 'non_gestito'
    CHECK (stato_gestione IN ('non_gestito', 'pagato', 'convertito_ore', 'task_creata'));

-- STEP 2: Aggiungi campi per tracciare QUANDO e DA CHI è stato gestito
ALTER TABLE bonus_risorse
ADD COLUMN IF NOT EXISTS data_gestione TIMESTAMP,
ADD COLUMN IF NOT EXISTS gestito_da UUID REFERENCES utenti(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS note_gestione TEXT;

-- STEP 3: Aggiungi riferimento alla task di recupero (se creata)
ALTER TABLE bonus_risorse
ADD COLUMN IF NOT EXISTS task_recupero_id UUID REFERENCES task(id) ON DELETE SET NULL;

-- STEP 4: Crea indici per performance
CREATE INDEX IF NOT EXISTS idx_bonus_stato_gestione ON bonus_risorse(stato_gestione);
CREATE INDEX IF NOT EXISTS idx_bonus_gestito_da ON bonus_risorse(gestito_da);
CREATE INDEX IF NOT EXISTS idx_bonus_task_recupero ON bonus_risorse(task_recupero_id);

-- STEP 5: Aggiungi commenti per documentazione
COMMENT ON COLUMN bonus_risorse.stato_gestione IS 'Stato gestione del bonus: non_gestito, pagato (bonus positivo retribuito), convertito_ore (penalità convertita in ore disponibili), task_creata (penalità convertita in task di recupero)';
COMMENT ON COLUMN bonus_risorse.data_gestione IS 'Data in cui il manager ha gestito il bonus/penalità';
COMMENT ON COLUMN bonus_risorse.gestito_da IS 'ID del manager che ha gestito il bonus/penalità';
COMMENT ON COLUMN bonus_risorse.note_gestione IS 'Note opzionali sulla gestione (es: motivazione, dettagli)';
COMMENT ON COLUMN bonus_risorse.task_recupero_id IS 'ID della task creata per recuperare la penalità (se stato_gestione = task_creata)';

-- STEP 6: Vista per bonus da gestire
CREATE OR REPLACE VIEW bonus_da_gestire AS
SELECT 
    b.id,
    b.risorsa_id,
    b.task_id,
    b.tipo,
    b.ore_stimate,
    b.ore_effettive,
    b.differenza_ore,
    b.percentuale_bonus,
    b.importo_bonus,
    b.costo_orario_finale,
    b.stato_gestione,
    b.stato AS stato_approvazione,
    b.data_gestione,
    b.gestito_da,
    b.task_recupero_id,
    u.nome AS risorsa_nome,
    u.email AS risorsa_email,
    t.nome AS task_nome,
    t.attivita_id,
    a.nome AS attivita_nome,
    a.progetto_id,
    p.nome AS progetto_nome,
    p.cliente_id,
    c.nome AS cliente_nome,
    -- Calcolo ore da gestire (converti minuti in ore decimali)
    CASE 
        WHEN b.tipo = 'negativo' THEN ABS(b.differenza_ore) / 60.0
        WHEN b.tipo = 'positivo' THEN b.differenza_ore / 60.0
        ELSE 0
    END AS ore_da_gestire,
    -- Priorità gestione (1=urgente penalità, 2=normale bonus, 3=già gestito)
    CASE
        WHEN b.tipo = 'negativo' AND b.stato_gestione = 'non_gestito' THEN 1
        WHEN b.tipo = 'positivo' AND b.stato_gestione = 'non_gestito' THEN 2
        ELSE 3
    END AS priorita
FROM bonus_risorse b
JOIN utenti u ON b.risorsa_id = u.id
JOIN task t ON b.task_id = t.id
JOIN attivita a ON t.attivita_id = a.id
JOIN progetti p ON a.progetto_id = p.id
JOIN clienti c ON p.cliente_id = c.id
WHERE b.stato = 'approvato' -- Solo bonus già approvati dal manager
ORDER BY priorita ASC, b.data_creazione DESC;

COMMENT ON VIEW bonus_da_gestire IS 'Vista dei bonus approvati che necessitano gestione da parte del manager';

-- =====================================================
-- VERIFICA FINALE
-- =====================================================

-- Mostra nuovi campi aggiunti
SELECT 
    'Campi aggiunti con successo!' as status,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'bonus_risorse' 
AND column_name IN ('stato_gestione', 'data_gestione', 'gestito_da', 'note_gestione', 'task_recupero_id')
ORDER BY column_name;