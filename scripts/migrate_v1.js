const db = require('../config/db');

const migrate = async () => {
  try {
    console.log('🔄 Starting Database Migration...');

    // 1. Add cuisines to restaurants
    console.log('Adding "cuisines" to restaurants...');
    await db.pool.query(`
      ALTER TABLE restaurants 
      ADD COLUMN IF NOT EXISTS cuisines TEXT;
    `);

    // 2. Add is_admin to users
    console.log('Adding "is_admin" to users...');
    await db.pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
    `);

    // 3. Update existing data with dummy cuisines
    console.log('Updating existing restaurant data with cuisines...');
    await db.pool.query(`
      UPDATE restaurants SET cuisines = 'Chettinad, Non-Veg' WHERE id = 1;
      UPDATE restaurants SET cuisines = 'South Indian, Pure Veg' WHERE id = 2;
      UPDATE restaurants SET cuisines = 'Chettinad, Multi-Cuisine' WHERE id = 3;
      UPDATE restaurants SET cuisines = 'Non-Veg, Biryani' WHERE id = 4;
    `);

    // 4. Set the test user as admin for Phase 4 testing
    console.log('Setting test user ID 1 as admin...');
    await db.pool.query(`
      UPDATE users SET is_admin = TRUE WHERE id = 1;
    `);

    console.log('✅ Migration completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
};

migrate();
