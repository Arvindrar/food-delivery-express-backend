const db = require('./config/db');

async function checkSchema() {
  try {
    const tables = ['categories', 'restaurants', 'users'];
    for (const table of tables) {
      const res = await db.pool.query(`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = $1
      `, [table]);
      console.log(`\nTable: ${table}`);
      console.table(res.rows);
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkSchema();
