const db = require('../config/db');

async function migrate() {
  const pool = db.pool;
  try {
    console.log('Creating coupons table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS coupons (
        id SERIAL PRIMARY KEY,
        code VARCHAR(20) UNIQUE NOT NULL,
        discount_type VARCHAR(10) NOT NULL, -- 'percent' or 'flat'
        discount_value DECIMAL NOT NULL,
        min_order_value DECIMAL DEFAULT 0,
        max_discount DECIMAL,
        expiry_date TIMESTAMP,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('Inserting sample coupons...');
    await pool.query(`
      INSERT INTO coupons (code, discount_type, discount_value, min_order_value, max_discount)
      VALUES 
        ('WELCOME50', 'percent', 50, 100, 100),
        ('KARA20', 'percent', 20, 200, 50),
        ('FLAT100', 'flat', 100, 500, 100)
      ON CONFLICT (code) DO NOTHING;
    `);

    console.log('Migration complete!');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
