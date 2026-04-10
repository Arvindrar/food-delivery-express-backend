const db = require('../config/db');

async function upgrade() {
  try {
    console.log('🆙 Starting Database Upgrade (Phase 13 & 14)...');

    // 1. Create Addresses Table (Phase 13)
    await db.pool.query(`
      CREATE TABLE IF NOT EXISTS addresses (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        label VARCHAR(50) NOT NULL, -- Home, Work, etc.
        address_text TEXT NOT NULL,
        is_default BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Created addresses table');

    // 2. Create Favorites Table (Phase 14)
    await db.pool.query(`
      CREATE TABLE IF NOT EXISTS favorites (
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        restaurant_id INTEGER REFERENCES restaurants(id) ON DELETE CASCADE,
        PRIMARY KEY (user_id, restaurant_id)
      );
    `);
    console.log('✅ Created favorites table');

  } catch (err) {
    console.error('❌ Upgrade failed:', err);
  } finally {
    process.exit();
  }
}

upgrade();
