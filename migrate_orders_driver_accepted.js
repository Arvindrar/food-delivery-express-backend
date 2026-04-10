const db = require('./config/db');

async function migrate() {
  try {
    await db.pool.query("ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_driver_accepted BOOLEAN DEFAULT false;");
    console.log("Migration successful: Added 'is_driver_accepted' to orders table.");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    process.exit(0);
  }
}

migrate();
