const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

// Configurazione pool - supporta sia DATABASE_URL (Render) che variabili separate (locale)
const poolConfig = process.env.DATABASE_URL 
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false
      } : false
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'team_management',
      user: process.env.DB_USER || 'team_user',
      password: process.env.DB_PASSWORD || 'team_password',
    };

const pool = new Pool(poolConfig);

async function runMigration() {
  console.log('🔄 Applicazione Migration 007: Soft Delete Support');
  console.log(`📍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log('');
  
  try {
    // Test connection
    await pool.query('SELECT 1');
    console.log('✅ Connessione al database stabilita');
    console.log('');

    // Leggi il file SQL della migration
    const migrationPath = path.join(__dirname, '..', 'database', 'migrations', '007_add_soft_delete.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📋 Esecuzione migration SQL...');
    console.log('');
    
    // Esegui la migration
    const result = await pool.query(migrationSQL);
    
    console.log('');
    console.log('✅ Migration completata con successo!');
    console.log('');
    console.log('📊 Verifica delle modifiche:');
    
    // Verifica che i campi siano stati aggiunti
    const checkResult = await pool.query(`
      SELECT 
        table_name, 
        column_name, 
        data_type,
        column_default
      FROM information_schema.columns 
      WHERE column_name = 'attivo' 
      AND table_schema = 'public'
      ORDER BY table_name;
    `);
    
    console.log('');
    console.log('Tabelle con campo "attivo":');
    checkResult.rows.forEach(row => {
      console.log(`  ✓ ${row.table_name}.${row.column_name} (${row.data_type}) - default: ${row.column_default}`);
    });
    
    console.log('');
    console.log('🎉 Database pronto per soft delete!');
    
  } catch (error) {
    console.error('');
    console.error('❌ Errore durante la migration:', error.message);
    console.error('');
    console.error('Dettagli:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Esegui se chiamato direttamente
if (require.main === module) {
  runMigration();
}

module.exports = { runMigration };