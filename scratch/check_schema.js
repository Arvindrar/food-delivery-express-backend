const db = require('../config/db');

async function main() {
  try {
    // Check if restaurants have category_id and is_active columns
    const r = await db.pool.query(
      `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'restaurants' ORDER BY ordinal_position`
    );
    console.log('Full restaurants schema:');
    r.rows.forEach(row => console.log(`  ${row.column_name} (${row.data_type})`));

    // Check if password_plain exists for restaurants
    const check = r.rows.find(row => row.column_name === 'password_plain');
    console.log('\npassword_plain exists:', !!check);

    // Check if login_id exists for restaurants
    const loginId = r.rows.find(row => row.column_name === 'login_id');
    console.log('login_id exists:', !!loginId);

    // Sample restaurant data
    const sample = await db.pool.query('SELECT id, name, password FROM restaurants LIMIT 3');
    console.log('\nSample restaurants:');
    sample.rows.forEach(row => console.log(`  ID=${row.id}, Name=${row.name}, HasPassword=${!!row.password}`));

    process.exit(0);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
main();
