const db = require('./config/db');

async function check() {
  try {
    const res = await db.pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'orders'");
    console.log('Orders columns:', res.rows.map(r => r.column_name));
    process.exit(0);
  } catch (err) {
    console.error('Error checking columns:', err);
    process.exit(1);
  }
}
check();
