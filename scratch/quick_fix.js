const db = require('../config/db');
const bcrypt = require('bcryptjs');

async function fixPayoutAndLogin() {
  try {
    console.log('Fixing orders table schema...');
    
    // Add missing columns to orders to resolve the 500 error during payout
    await db.pool.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS latitude character varying');
    await db.pool.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS longitude character varying');
    await db.pool.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS landmark character varying');
    console.log('orders schema upgraded.');

    console.log('Fixing login for user 8838374152...');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);
    
    // Update the synced user so the test password works locally
    await db.pool.query(
      "UPDATE users SET password = $1, password_plain = 'password123' WHERE phone = '8838374152'",
      [hashedPassword]
    );
    console.log('Login credentials fixed.');

    process.exit(0);
  } catch (err) {
    console.error('Error during quick break fix:', err);
    process.exit(1);
  }
}

fixPayoutAndLogin();
