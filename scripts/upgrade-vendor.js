const db = require('../config/db');
const bcrypt = require('bcryptjs');

async function upgrade() {
  try {
    await db.pool.query(`ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS password VARCHAR(255)`);
    console.log("Added password column to restaurants table");

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);

    await db.pool.query(
      `UPDATE restaurants SET password = $1 WHERE id = 1`,
      [hashedPassword]
    );
    console.log("Updated Restaurant #1 with default password 'password123'");
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}
upgrade();
