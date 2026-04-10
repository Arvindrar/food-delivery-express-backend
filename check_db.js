const db = require('./config/db');

async function checkCols() {
  try {
    const res = await db.pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'orders'");
    console.log('Orders Columns:', res.rows);
    const res2 = await db.pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'addresses'");
    console.log('Addresses Columns:', res2.rows);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkCols();
