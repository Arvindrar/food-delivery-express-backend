const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT
});

async function addPaymentColumns() {
  try {
    console.log('Adding payment columns to orders table...');
    await pool.query(`
      ALTER TABLE orders 
      ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'COD',
      ADD COLUMN IF NOT EXISTS payment_id VARCHAR(255)
    `);
    console.log('Columns added successfully.');
    await pool.end();
  } catch (err) {
    console.error('Error adding columns:', err);
    process.exit(1);
  }
}

addPaymentColumns();
