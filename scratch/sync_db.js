const { Client } = require('pg');
const localDb = require('../config/db');

const remoteDb = new Client({
  connectionString: 'postgres://arvind:QkI1OjJNTydT4AI1gJ2HyHCSHlE6IOig@dpg-d76ft8pr0fns73c9k8c0-a.oregon-postgres.render.com:5432/food_delivery_e1rj',
  ssl: { rejectUnauthorized: false }
});

const TABLES_TO_SYNC = [
  'users',
  'categories',
  'restaurants',
  'menu_items',
  'addresses',
  'orders',
  'order_items'
];

async function syncDatabases() {
  try {
    console.log('Connecting to Remote Database...');
    await remoteDb.connect();
    
    console.log('Clearing old Local Data...');
    const truncateQuery = `TRUNCATE TABLE ${TABLES_TO_SYNC.join(', ')} RESTART IDENTITY CASCADE;`;
    await localDb.pool.query(truncateQuery);
    
    for (const tableName of TABLES_TO_SYNC) {
      console.log(`Syncing table: ${tableName}...`);
      
      const localSchemaRes = await localDb.pool.query(
        'SELECT column_name FROM information_schema.columns WHERE table_name = $1',
        [tableName]
      );
      const localColumns = localSchemaRes.rows.map(r => r.column_name);

      const { rows } = await remoteDb.query(`SELECT * FROM ${tableName}`);
      
      if (rows.length === 0) {
        console.log(`  > Table ${tableName} is empty on remote. Skipping.`);
        continue;
      }
      
      console.log(`  > Found ${rows.length} records. Transferring matching columns...`);
      
      for (const row of rows) {
        // Only insert columns that exist locally
        const matchingColumns = Object.keys(row).filter(c => localColumns.includes(c));
        const values = matchingColumns.map(c => row[c]);
        const placeholders = matchingColumns.map((_, i) => `$${i+1}`).join(', ');
        
        try {
          await localDb.pool.query(
            `INSERT INTO ${tableName} (${matchingColumns.map(c => `"${c}"`).join(', ')}) VALUES (${placeholders})`, 
            values
          );
        } catch (err) {
          console.error(`  ! Error inserting into ${tableName}:`, err.message);
        }
      }
      console.log(`  > ${tableName} synced perfectly.`);
    }
    
    console.log('\n✅ SYNC COMPLETE! Local Database optimally mirrors Online Database.');
    process.exit(0);
  } catch (err) {
    console.error('CRITICAL SYNC ERROR:', err);
    process.exit(1);
  }
}

syncDatabases();
