const db = require('../config/db');

async function upgrade() {
  try {
    console.log('🆙 Final Database Upgrade (Phase 15 & 16)...');

    // 1. Create Reviews Table (Phase 16)
    await db.pool.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        restaurant_id INTEGER REFERENCES restaurants(id) ON DELETE CASCADE,
        order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE UNIQUE,
        rating INTEGER CHECK (rating >= 1 AND rating <= 5),
        comment TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Created reviews table');

  } catch (err) {
    console.error('❌ Upgrade failed:', err);
  } finally {
    process.exit();
  }
}

upgrade();
