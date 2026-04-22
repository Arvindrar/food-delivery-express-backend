const db = require('../config/db');

async function migrate() {
  try {
    console.log('Starting migration: Adding fee and commission columns to orders...');
    
    await db.pool.query(`
      ALTER TABLE orders 
      ADD COLUMN IF NOT EXISTS distance DECIMAL(10,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS delivery_fee INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS handling_fee INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS platform_commission INTEGER DEFAULT 0;
    `);

    console.log('Migration successful!');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
