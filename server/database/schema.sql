-- Database Schema per Sistema Gestione Team
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum Types
CREATE TYPE ruolo_utente AS ENUM ('risorsa', 'manager');
CREATE TYPE stato_task AS ENUM ('programmata', 'in_esecuzione', 'completata');
CREATE TYPE stato_attivita AS ENUM ('pianificata', 'in_esecuzione', 'completata');
CREATE TYPE stato_approvazione AS ENUM ('pending_approval', 'approvata', 'rifiutata');

-- Tabella UTENTI
CREATE TABLE utenti (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    ruolo ruolo_utente NOT NULL,
    compenso_annuale DECIMAL(10,2) NOT NULL,
    costo_orario DECIMAL(10,2),
    attivo BOOLEAN DEFAULT true,
    data_creazione TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_aggiornamento TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Dati demo
INSERT INTO utenti (nome, email, password_hash, ruolo, compenso_annuale, costo_orario) VALUES 
('Manager Sistema', 'manager@team.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'manager', 50000.00, 22.73),
('Mario Rossi', 'mario@team.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'risorsa', 35000.00, 15.91);
