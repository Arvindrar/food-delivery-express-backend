const { Pool } = require('pg');
const pool = new Pool({
  user: 'arvind',
  password: 'QkI1OjJNTydT4AI1gJ2HyHCSHlE6IOig',
  host: 'dpg-d76ft8pr0fns73c9k8c0-a.oregon-postgres.render.com',
  database: 'food_delivery_e1rj',
  port: 5432,
  ssl: { rejectUnauthorized: false }
});

async function checkSchema() {
  try {
    const res = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'addresses'");
    console.log('Columns in addresses table:');
    console.table(res.rows);
    await pool.end();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkSchema();
