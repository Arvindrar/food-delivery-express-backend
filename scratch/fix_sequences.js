const db = require('../config/db');

const TABLES = [
  'users',
  'categories',
  'restaurants',
  'menu_items',
  'addresses',
  'orders',
  'order_items'
];

async function fixSequences() {
  try {
    console.log('Fixing auto-increment sequences after data sync...');
    for (let table of TABLES) {
      // Find the name of the sequence
      const seqQuery = `SELECT pg_get_serial_sequence('${table}', 'id') AS seq_name;`;
      const seqRes = await db.pool.query(seqQuery);
      const seqName = seqRes.rows[0].seq_name;
      
      if (seqName) {
        // Set the sequence to the MAX(id) + 1
        const query = `SELECT setval('${seqName}', COALESCE(MAX(id), 1)) FROM ${table};`;
        await db.pool.query(query);
        console.log(`✅ Fixed sequence for ${table}: ${seqName}`);
      } else {
        console.log(`⚠️ No sequence found for ${table}`);
      }
    }
    console.log('\nAll sequences correctly synchronized!');
    process.exit(0);
  } catch (err) {
    console.error('Sequence fix failed:', err);
    process.exit(1);
  }
}

fixSequences();
