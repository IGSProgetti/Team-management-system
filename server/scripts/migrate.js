const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'team_management',
  user: process.env.DB_USER || 'team_user',
  password: process.env.DB_PASSWORD || 'team_password',
});

async function runMigration() {
  console.log('🚀 Starting database migration...');
  
  try {
    // Test connection
    await pool.query('SELECT 1');
    console.log('✅ Database connection successful');

    // Read and execute schema
    const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('📋 Executing database schema...');
    await pool.query(schema);
    
    console.log('✅ Database migration completed successfully!');
    console.log('');
    console.log('🎯 Your Team Management System database is ready!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Start the server: npm run dev-server');
    console.log('2. Start the client: npm run dev-client');
    console.log('3. Visit: http://localhost:3000');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('');
    console.error('Common solutions:');
    console.error('1. Make sure PostgreSQL is running');
    console.error('2. Check database credentials in .env file');
    console.error('3. Ensure database and user exist');
    
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Handle different invocation methods
if (require.main === module) {
  runMigration();
}

module.exports = { runMigration };
