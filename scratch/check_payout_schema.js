const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'food_delivery',
  password: '03091992',
  port: 5432,
});

async function check() {
  try {
    const tables = ['payout_requests', 'drivers', 'orders'];
    for (const table of tables) {
      console.log(`--- Table: ${table} ---`);
      const res = await pool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '${table}'`);
      console.log(JSON.stringify(res.rows, null, 2));
    }
    await pool.end();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
check();
