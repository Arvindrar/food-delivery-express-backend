const db = require('./config/db');

async function checkAllTables() {
  try {
    const res = await db.pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    
    for (let row of res.rows) {
       console.log(`Table: ${row.table_name}`);
       const cols = await db.pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1", [row.table_name]);
       console.log(cols.rows);
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

checkAllTables();
