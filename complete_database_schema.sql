-- Database Schema Completo per Team Management System
-- Rimuovi schema esistente e ricrea tutto
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum Types
CREATE TYPE ruolo_utente AS ENUM ('risorsa', 'manager');
CREATE TYPE stato_task AS ENUM ('programmata', 'in_esecuzione', 'completata');
CREATE TYPE stato_attivita AS ENUM ('pianificata', 'in_esecuzione', 'completata');
CREATE TYPE stato_approvazione AS ENUM ('pending_approval', 'approvata', 'rifiutata');

-- TABELLA UTENTI
CREATE TABLE utenti (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    ruolo ruolo_utente NOT NULL,
    compenso_annuale DECIMAL(10,2) NOT NULL,
    costo_orario DECIMAL(10,2),
    costo_orario_manuale BOOLEAN DEFAULT false,
    ore_disponibili_anno INTEGER DEFAULT 1760,
    ore_disponibili_manuale BOOLEAN DEFAULT false,
    attivo BOOLEAN DEFAULT true,
    data_creazione TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_aggiornamento TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TABELLA CLIENTI
CREATE TABLE clienti (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(255) NOT NULL,
    descrizione TEXT,
    budget DECIMAL(12,2),
    budget_utilizzato DECIMAL(12,2) DEFAULT 0,
    stato_approvazione stato_approvazione DEFAULT 'pending_approval',
    approvato_da UUID REFERENCES utenti(id),
    data_approvazione TIMESTAMP,
    creato_da UUID NOT NULL REFERENCES utenti(id),
    data_creazione TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_aggiornamento TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    attivo BOOLEAN DEFAULT true
);

-- TABELLA PROGETTI
CREATE TABLE progetti (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(255) NOT NULL,
    descrizione TEXT,
    cliente_id UUID NOT NULL REFERENCES clienti(id),
    budget_assegnato DECIMAL(12,2),
    budget_utilizzato DECIMAL(12,2) DEFAULT 0,
    stato_approvazione stato_approvazione DEFAULT 'pending_approval',
    approvato_da UUID REFERENCES utenti(id),
    data_approvazione TIMESTAMP,
    data_inizio DATE,
    data_fine DATE,
    scadenza TIMESTAMP,
    creato_da UUID NOT NULL REFERENCES utenti(id),
    data_creazione TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_aggiornamento TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    attivo BOOLEAN DEFAULT true
);

-- TABELLA ASSEGNAZIONI PROGETTO
CREATE TABLE assegnazioni_progetto (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    progetto_id UUID NOT NULL REFERENCES progetti(id),
    utente_id UUID NOT NULL REFERENCES utenti(id),
    ore_assegnate INTEGER NOT NULL,
    data_assegnazione TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TABELLA ATTIVITA
CREATE TABLE attivita (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(255) NOT NULL,
    descrizione TEXT,
    progetto_id UUID NOT NULL REFERENCES progetti(id),
    ore_stimate INTEGER, -- minuti
    ore_effettive INTEGER DEFAULT 0, -- minuti
    stato stato_attivita DEFAULT 'pianificata',
    scadenza TIMESTAMP,
    data_creazione TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_aggiornamento TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    creata_da UUID NOT NULL REFERENCES utenti(id)
);

-- TABELLA ASSEGNAZIONI ATTIVITA
CREATE TABLE assegnazioni_attivita (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attivita_id UUID NOT NULL REFERENCES attivita(id),
    utente_id UUID NOT NULL REFERENCES utenti(id),
    data_assegnazione TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TABELLA TASK
CREATE TABLE task (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(255) NOT NULL,
    descrizione TEXT,
    attivita_id UUID NOT NULL REFERENCES attivita(id),
    utente_assegnato UUID NOT NULL REFERENCES utenti(id),
    ore_stimate INTEGER, -- minuti
    ore_effettive INTEGER, -- minuti, solo quando completata
    stato stato_task DEFAULT 'programmata',
    scadenza TIMESTAMP,
    task_collegata_id UUID REFERENCES task(id), -- task che viene creata automaticamente
    task_madre_id UUID REFERENCES task(id), -- task che ha creato questa
    data_creazione TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_completamento TIMESTAMP,
    data_aggiornamento TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    creata_da UUID NOT NULL REFERENCES utenti(id)
);

-- TABELLA TIMESHEET (Tracking Ore Giornaliere)
CREATE TABLE timesheet (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    utente_id UUID NOT NULL REFERENCES utenti(id),
    task_id UUID REFERENCES task(id),
    data DATE NOT NULL,
    ore_lavorate INTEGER NOT NULL, -- minuti
    descrizione TEXT,
    data_registrazione TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Utenti demo (incluso quello che già funziona)
INSERT INTO utenti (nome, email, password_hash, ruolo, compenso_annuale, costo_orario, ore_disponibili_anno) VALUES 
('Test Manager', 'testmanager@team.com', '$2b$12$LQv3c1yqBwlVHpPjrPyFUOHXfxvxUDAHL.UkeF/An4U16Q3HDbLHG', 'manager', 50000.00, 22.73, 1760),
('Mario Rossi', 'mario@team.com', '$2b$12$LQv3c1yqBwlVHpPjrPyFUOHXfxvxUDAHL.UkeF/An4U16Q3HDbLHG', 'risorsa', 35000.00, 15.91, 1760),
('Anna Verdi', 'anna@team.com', '$2b$12$LQv3c1yqBwlVHpPjrPyFUOHXfxvxUDAHL.UkeF/An4U16Q3HDbLHG', 'risorsa', 32000.00, 14.55, 1760);

-- Cliente demo
INSERT INTO clienti (nome, descrizione, budget, stato_approvazione, creato_da, approvato_da, data_approvazione) VALUES 
('Acme Corporation', 'Cliente principale per sviluppo software', 100000.00, 'approvata', 
 (SELECT id FROM utenti WHERE email = 'testmanager@team.com' LIMIT 1),
 (SELECT id FROM utenti WHERE email = 'testmanager@team.com' LIMIT 1), 
 CURRENT_TIMESTAMP);

-- Progetto demo
INSERT INTO progetti (nome, descrizione, cliente_id, budget_assegnato, stato_approvazione, data_inizio, data_fine, creato_da, approvato_da, data_approvazione) VALUES 
('Sistema Management', 'Sviluppo sistema gestione team', 
 (SELECT id FROM clienti LIMIT 1), 
 50000.00, 'approvata', CURRENT_DATE, CURRENT_DATE + INTERVAL '6 months',
 (SELECT id FROM utenti WHERE email = 'testmanager@team.com' LIMIT 1),
 (SELECT id FROM utenti WHERE email = 'testmanager@team.com' LIMIT 1),
 CURRENT_TIMESTAMP);

-- Assegnazione progetto alle risorse
INSERT INTO assegnazioni_progetto (progetto_id, utente_id, ore_assegnate) VALUES 
((SELECT id FROM progetti LIMIT 1), (SELECT id FROM utenti WHERE email = 'mario@team.com' LIMIT 1), 800),
((SELECT id FROM progetti LIMIT 1), (SELECT id FROM utenti WHERE email = 'anna@team.com' LIMIT 1), 600);

-- Attività demo
INSERT INTO attivita (nome, descrizione, progetto_id, ore_stimate, stato, scadenza, creata_da) VALUES 
('Setup Iniziale', 'Configurazione ambiente e setup progetto', 
 (SELECT id FROM progetti LIMIT 1), 480, 'completata', CURRENT_TIMESTAMP + INTERVAL '1 week',
 (SELECT id FROM utenti WHERE email = 'testmanager@team.com' LIMIT 1)),
('Sviluppo Frontend', 'Creazione interfaccia utente React', 
 (SELECT id FROM progetti LIMIT 1), 960, 'in_esecuzione', CURRENT_TIMESTAMP + INTERVAL '2 weeks',
 (SELECT id FROM utenti WHERE email = 'testmanager@team.com' LIMIT 1)),
('Sviluppo Backend', 'API REST e database PostgreSQL', 
 (SELECT id FROM progetti LIMIT 1), 720, 'pianificata', CURRENT_TIMESTAMP + INTERVAL '3 weeks',
 (SELECT id FROM utenti WHERE email = 'testmanager@team.com' LIMIT 1));

-- Assegnazioni attività
INSERT INTO assegnazioni_attivita (attivita_id, utente_id) VALUES 
((SELECT id FROM attivita WHERE nome = 'Setup Iniziale' LIMIT 1), (SELECT id FROM utenti WHERE email = 'mario@team.com' LIMIT 1)),
((SELECT id FROM attivita WHERE nome = 'Sviluppo Frontend' LIMIT 1), (SELECT id FROM utenti WHERE email = 'mario@team.com' LIMIT 1)),
((SELECT id FROM attivita WHERE nome = 'Sviluppo Frontend' LIMIT 1), (SELECT id FROM utenti WHERE email = 'anna@team.com' LIMIT 1)),
((SELECT id FROM attivita WHERE nome = 'Sviluppo Backend' LIMIT 1), (SELECT id FROM utenti WHERE email = 'mario@team.com' LIMIT 1));

-- Task demo
INSERT INTO task (nome, descrizione, attivita_id, utente_assegnato, ore_stimate, ore_effettive, stato, scadenza, creata_da) VALUES 
('Configurazione Git', 'Setup repository e branching strategy', 
 (SELECT id FROM attivita WHERE nome = 'Setup Iniziale' LIMIT 1), 
 (SELECT id FROM utenti WHERE email = 'mario@team.com' LIMIT 1), 
 60, 45, 'completata', CURRENT_TIMESTAMP + INTERVAL '1 day',
 (SELECT id FROM utenti WHERE email = 'testmanager@team.com' LIMIT 1)),
('Setup Database', 'Installazione e configurazione PostgreSQL', 
 (SELECT id FROM attivita WHERE nome = 'Setup Iniziale' LIMIT 1), 
 (SELECT id FROM utenti WHERE email = 'mario@team.com' LIMIT 1), 
 120, 105, 'completata', CURRENT_TIMESTAMP + INTERVAL '2 days',
 (SELECT id FROM utenti WHERE email = 'testmanager@team.com' LIMIT 1)),
('Login Component', 'Creazione componente autenticazione', 
 (SELECT id FROM attivita WHERE nome = 'Sviluppo Frontend' LIMIT 1), 
 (SELECT id FROM utenti WHERE email = 'anna@team.com' LIMIT 1), 
 180, NULL, 'in_esecuzione', CURRENT_TIMESTAMP + INTERVAL '3 days',
 (SELECT id FROM utenti WHERE email = 'testmanager@team.com' LIMIT 1)),
('Dashboard Layout', 'Layout responsive per dashboard', 
 (SELECT id FROM attivita WHERE nome = 'Sviluppo Frontend' LIMIT 1), 
 (SELECT id FROM utenti WHERE email = 'mario@team.com' LIMIT 1), 
 240, NULL, 'programmata', CURRENT_TIMESTAMP + INTERVAL '4 days',
 (SELECT id FROM utenti WHERE email = 'testmanager@team.com' LIMIT 1));

-- Indici per performance
CREATE INDEX idx_task_utente_assegnato ON task(utente_assegnato);
CREATE INDEX idx_task_attivita_id ON task(attivita_id);
CREATE INDEX idx_task_stato ON task(stato);
CREATE INDEX idx_task_scadenza ON task(scadenza);
CREATE INDEX idx_attivita_progetto_id ON attivita(progetto_id);
CREATE INDEX idx_progetti_cliente_id ON progetti(cliente_id);
CREATE INDEX idx_timesheet_utente_data ON timesheet(utente_id, data);
