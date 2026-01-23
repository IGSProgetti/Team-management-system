-- Migrazione: Assegnazione Risorse a Clienti
CREATE TABLE IF NOT EXISTS assegnazione_cliente_risorsa (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cliente_id UUID NOT NULL REFERENCES clienti(id) ON DELETE CASCADE,
    risorsa_id UUID NOT NULL REFERENCES utenti(id) ON DELETE CASCADE,
    ore_assegnate DECIMAL(10, 2) NOT NULL DEFAULT 0,
    costo_orario_base DECIMAL(10, 2) NOT NULL,
    
    -- Percentuali margini
    costo_azienda_perc DECIMAL(5, 2) DEFAULT 25.00,
    utile_gestore_azienda_perc DECIMAL(5, 2) DEFAULT 12.50,
    utile_igs_perc DECIMAL(5, 2) DEFAULT 12.50,
    costi_professionista_perc DECIMAL(5, 2) DEFAULT 20.00,
    bonus_professionista_perc DECIMAL(5, 2) DEFAULT 5.00,
    gestore_societa_perc DECIMAL(5, 2) DEFAULT 3.00,
    commerciale_perc DECIMAL(5, 2) DEFAULT 8.00,
    centrale_igs_perc DECIMAL(5, 2) DEFAULT 4.00,
    network_igs_perc DECIMAL(5, 2) DEFAULT 10.00,
    
    -- Flags attivazione
    costo_azienda_attivo BOOLEAN DEFAULT true,
    utile_gestore_azienda_attivo BOOLEAN DEFAULT true,
    utile_igs_attivo BOOLEAN DEFAULT true,
    costi_professionista_attivo BOOLEAN DEFAULT true,
    bonus_professionista_attivo BOOLEAN DEFAULT true,
    gestore_societa_attivo BOOLEAN DEFAULT true,
    commerciale_attivo BOOLEAN DEFAULT true,
    centrale_igs_attivo BOOLEAN DEFAULT true,
    network_igs_attivo BOOLEAN DEFAULT true,
    
    costo_orario_finale DECIMAL(10, 2) DEFAULT 0,
    budget_risorsa DECIMAL(10, 2) DEFAULT 0,
    data_assegnazione TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_aggiornamento TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(cliente_id, risorsa_id)
);

CREATE INDEX idx_assegnazione_cliente ON assegnazione_cliente_risorsa(cliente_id);
CREATE INDEX idx_assegnazione_risorsa ON assegnazione_cliente_risorsa(risorsa_id);