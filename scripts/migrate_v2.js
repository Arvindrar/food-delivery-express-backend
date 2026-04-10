const db = require('../config/db');

const migrate = async () => {
  try {
    console.log('🔄 Starting Database Migration for Delivery Agent Ecosystem...');

    // 1. Add is_driver to users
    console.log('Adding "is_driver" to users...');
    await db.pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS is_driver BOOLEAN DEFAULT FALSE;
    `);

    // 2. Add driver_id to orders
    console.log('Adding "driver_id" to orders...');
    await db.pool.query(`
      ALTER TABLE orders 
      ADD COLUMN IF NOT EXISTS driver_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
    `);

    // 3. Add driver_earnings to orders
    console.log('Adding "driver_earnings" to orders...');
    await db.pool.query(`
      ALTER TABLE orders 
      ADD COLUMN IF NOT EXISTS driver_earnings INTEGER DEFAULT 0;
    `);

    // 4. Create a test driver user
    console.log('Setting test user ID 2 as driver...');
    await db.pool.query(`
      UPDATE users SET is_driver = TRUE WHERE id = 2;
    `);

    // 5. Update existing orders to have a base earnings amount if completed
    console.log('Updating completed orders with base earnings...');
    await db.pool.query(`
      UPDATE orders SET driver_earnings = 30 WHERE status = 'Completed';
    `);

    console.log('✅ Migration completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
};

migrate();
