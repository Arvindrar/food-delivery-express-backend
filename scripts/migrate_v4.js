const db = require('../config/db');

const migrate = async () => {
  try {
    console.log('🚀 Adding delivery_address and customer_name to orders...');
    
    await db.pool.query(`
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_address TEXT;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_name VARCHAR(100);
    `);

    console.log('✅ Columns added. Backfilling existing orders from user profile...');

    await db.pool.query(`
      UPDATE orders o
      SET delivery_address = u.address,
          customer_name = u.name
      FROM users u
      WHERE o.user_id = u.id AND (o.delivery_address IS NULL OR o.customer_name IS NULL);
    `);

    console.log('🎉 Migration successful!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
};

migrate();
