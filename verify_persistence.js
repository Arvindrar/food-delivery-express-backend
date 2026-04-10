const db = require('./config/db');

async function verifyPersistence() {
  try {
    console.log('--- Verifying Database Persistence ---');
    
    const cats = await db.pool.query("SELECT id, name, image_url FROM categories ORDER BY id DESC LIMIT 5");
    console.log('\nRecent Categories:');
    console.table(cats.rows);

    const rests = await db.pool.query("SELECT id, name, image_url, password FROM restaurants ORDER BY id DESC LIMIT 5");
    console.log('\nRecent Restaurants (image_url checks):');
    console.table(rests.rows.map(r => ({ ...r, password: r.password ? 'HASHED' : 'NULL' })));

    const drivers = await db.pool.query("SELECT id, name, phone, password FROM users WHERE is_driver = TRUE ORDER BY id DESC LIMIT 5");
    console.log('\nRecent Drivers (phone/password checks):');
    console.table(drivers.rows.map(d => ({ ...d, password: d.password ? 'HASHED' : 'NULL' })));

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

verifyPersistence();
