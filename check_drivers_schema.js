const db = require('./config/db');

async function checkDriversSchema() {
  try {
    const res = await db.pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'drivers'");
    console.log(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

checkDriversSchema();
