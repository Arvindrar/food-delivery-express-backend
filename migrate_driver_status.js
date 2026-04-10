const db = require('./config/db');

async function migrate() {
  try {
    await db.pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false;");
    console.log("Migration successful: Added 'is_online' to users table.");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    process.exit(0);
  }
}

migrate();
