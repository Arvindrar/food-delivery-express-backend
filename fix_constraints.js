const { Pool } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function run() {
  try {
    console.log('Fixing constraints...');
    
    // 1. Find the constraint name for driver_id
    const res = await pool.query(`
      SELECT conname 
      FROM pg_constraint 
      WHERE conrelid = 'orders'::regclass 
      AND confrelid = 'users'::regclass
    `);
    
    for (let row of res.rows) {
      console.log(`Dropping constraint: ${row.conname}`);
      await pool.query(`ALTER TABLE orders DROP CONSTRAINT ${row.conname}`);
    }

    // 2. Add new constraint pointing to drivers table
    console.log('Adding new constraint pointing to "drivers" table...');
    await pool.query(`
      ALTER TABLE orders 
      ADD CONSTRAINT orders_driver_id_fkey 
      FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE SET NULL
    `);

    console.log('Constraints fixed.');
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
