const { pool } = require('../config/db');
require('dotenv').config();

async function checkData() {
  const tables = ['users', 'restaurants', 'orders', 'order_items', 'drivers', 'admins'];
  for (const table of tables) {
    const res = await pool.query(`SELECT COUNT(*) FROM ${table}`);
    console.log(`Table ${table}: ${res.rows[0].count} rows`);
  }
  
  const rev = await pool.query(`SELECT SUM(total_amount) FROM orders WHERE status = 'Completed'`);
  console.log(`Total Completed Revenue: ${rev.rows[0].sum || 0}`);
  
  process.exit();
}

checkData();
