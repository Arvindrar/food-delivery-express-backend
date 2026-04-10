const db = require('../config/db');

const migrate = async () => {
  try {
    console.log('🚀 Adding latitude and longitude columns to orders and addresses...');
    
    // DECIMAL(10,8) for latitude: ranges from -90.00000000 to 90.00000000
    // DECIMAL(11,8) for longitude: ranges from -180.00000000 to 180.00000000
    
    await db.pool.query(`
      ALTER TABLE addresses ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,8);
      ALTER TABLE addresses ADD COLUMN IF NOT EXISTS longitude DECIMAL(11,8);
    `);

    await db.pool.query(`
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,8);
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS longitude DECIMAL(11,8);
    `);

    console.log('🎉 Migration successful!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
};

migrate();
