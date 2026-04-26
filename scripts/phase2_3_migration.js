const db = require('../config/db');

const migrate = async () => {
  try {
    console.log('🚀 Starting Phase 2 & 3 Migration...');

    // 1. Wallets for Drivers and Restaurants
    console.log('--- Setting up Wallets ---');
    await db.pool.query(`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS wallet_balance DECIMAL(10,2) DEFAULT 0.00;`);
    await db.pool.query(`ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS wallet_balance DECIMAL(10,2) DEFAULT 0.00;`);
    await db.pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_balance DECIMAL(10,2) DEFAULT 0.00;`);
    await db.pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code VARCHAR(20) UNIQUE;`);
    await db.pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by INTEGER REFERENCES users(id);`);

    // 2. Payout Requests Table
    console.log('--- Creating Payout Requests Table ---');
    await db.pool.query(`
      CREATE TABLE IF NOT EXISTS payout_requests (
        id SERIAL PRIMARY KEY,
        user_type VARCHAR(20) NOT NULL, -- 'driver' or 'restaurant'
        user_id INTEGER NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        status VARCHAR(20) DEFAULT 'Pending', -- 'Pending', 'Approved', 'Rejected'
        requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        processed_at TIMESTAMP
      );
    `);

    // 3. Chat Messages Table
    console.log('--- Creating Chat Messages Table ---');
    await db.pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        order_id INTEGER REFERENCES orders(id),
        sender_type VARCHAR(20) NOT NULL, -- 'user', 'driver', 'restaurant'
        sender_id INTEGER NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 4. Subscriptions Table
    console.log('--- Creating Subscriptions Table ---');
    await db.pool.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        plan_name VARCHAR(50) NOT NULL, -- 'Basic', 'Gold', 'Platinum'
        price DECIMAL(10,2) NOT NULL,
        start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        end_date TIMESTAMP NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 5. Populate referral codes for existing users
    console.log('--- Populating Referral Codes ---');
    const users = await db.pool.query('SELECT id, phone FROM users WHERE referral_code IS NULL');
    for (const user of users.rows) {
      const code = 'REF' + user.id + Math.random().toString(36).substring(7).toUpperCase();
      await db.pool.query('UPDATE users SET referral_code = $1 WHERE id = $2', [code, user.id]);
    }

    console.log('🎉 Phase 2 & 3 Migration successful!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Phase 2 & 3 Migration failed:', err);
    process.exit(1);
  }
};

migrate();
