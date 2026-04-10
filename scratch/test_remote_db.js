const { Client } = require('pg');

const remoteDb = new Client({
  connectionString: 'postgres://arvind:QkI1OjJNTydT4AI1gJ2HyHCSHlE6IOig@dpg-d76ft8pr0fns73c9k8c0-a.oregon-postgres.render.com:5432/food_delivery_e1rj',
  ssl: { rejectUnauthorized: false }
});

async function testRemoteConnection() {
  try {
    await remoteDb.connect();
    console.log('Successfully connected to remote database!');
    const res = await remoteDb.query('SELECT table_name FROM information_schema.tables WHERE table_schema = \'public\'');
    console.log('Tables found:', res.rows.map(r => r.table_name));
    await remoteDb.end();
  } catch (err) {
    console.error('Remote DB connection error:', err);
  }
}

testRemoteConnection();
