const db = require('../config/db');

async function upgrade() {
  try {
    await db.pool.query(`ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT TRUE`);
    console.log("Added is_available column to menu_items table");
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}
upgrade();
