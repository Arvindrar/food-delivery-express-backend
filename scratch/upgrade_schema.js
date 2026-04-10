const db = require('../config/db');

async function upgradeSchema() {
  try {
    console.log('Upgrading addresses table...');
    await db.pool.query('ALTER TABLE addresses ADD COLUMN IF NOT EXISTS latitude character varying');
    await db.pool.query('ALTER TABLE addresses ADD COLUMN IF NOT EXISTS longitude character varying');
    await db.pool.query('ALTER TABLE addresses ADD COLUMN IF NOT EXISTS landmark character varying');

    console.log('Upgrading users table...');
    await db.pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS password_plain character varying');
    await db.pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS is_online boolean DEFAULT false');
    await db.pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS latitude character varying');
    await db.pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS longitude character varying');
    await db.pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP');

    console.log('Upgrading restaurants table...');
    await db.pool.query('ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS latitude character varying');
    await db.pool.query('ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS longitude character varying');

    console.log('Schema upgrade complete!');
    process.exit(0);
  } catch (err) {
    console.error('Error during schema upgrade:', err);
    process.exit(1);
  }
}

upgradeSchema();
