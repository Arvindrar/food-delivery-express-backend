const db = require('../config/db');

const migrate = async () => {
  try {
    console.log('🚀 Adding landmark column to addresses and orders...');
    
    await db.pool.query(`
      ALTER TABLE addresses ADD COLUMN IF NOT EXISTS landmark TEXT;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS landmark TEXT;
    `);

    console.log('🎉 Migration v8 successful!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
};

migrate();
