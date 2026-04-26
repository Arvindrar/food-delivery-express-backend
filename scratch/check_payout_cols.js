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
    const res = await pool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'payout_requests'`);
    console.log('PAYOUT_REQUESTS_COLUMNS:', res.rows.map(r => r.column_name).join(', '));
    await pool.end();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
check();
