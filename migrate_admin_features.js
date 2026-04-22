const db = require('./config/db');

async function migrateAdminFeatures() {
  try {
    // Add display_order column for sorting
    await db.pool.query(`
      ALTER TABLE restaurants 
      ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0
    `);
    console.log('Added display_order column to restaurants');

    // Add is_deleted column for soft deletes
    await db.pool.query(`
      ALTER TABLE restaurants 
      ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false
    `);
    console.log('Added is_deleted column to restaurants');

    // Set initial display_order to id order
    await db.pool.query(`
      UPDATE restaurants
      SET display_order = id
      WHERE display_order = 0
    `);
    console.log('Synchronized display_order with numeric ID to set a baseline mapping');

    console.log('\nMigration complete!');
    process.exit(0);
  } catch (e) {
    console.error('Migration failed:', e.message);
    process.exit(1);
  }
}

migrateAdminFeatures();
