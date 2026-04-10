const db = require('../config/db');

const migrate = async () => {
  try {
    console.log('🚀 Adding missing columns to orders table...');
    
    await db.pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_address TEXT;`);
    await db.pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_name VARCHAR(100);`);

    console.log('🎉 Migration v7 (v2) successful!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration v7 (v2) failed:', err);
    process.exit(1);
  }
};

migrate();
