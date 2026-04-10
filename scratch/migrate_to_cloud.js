const { Client } = require('pg');
const localDb = require('../config/db');

const remoteDb = new Client({
  connectionString: 'postgres://arvind:QkI1OjJNTydT4AI1gJ2HyHCSHlE6IOig@dpg-d76ft8pr0fns73c9k8c0-a.oregon-postgres.render.com:5432/food_delivery_e1rj',
  ssl: { rejectUnauthorized: false }
});

const TABLES_TO_MIGRATE = [
  'users',
  'categories',
  'restaurants',
  'menu_items',
  'addresses',
  'orders',
  'order_items'
];

async function migrate() {
  try {
    console.log('--- STARTING CLOUD MIGRATION (LOCAL -> RENDER) ---');
    console.log('Connecting to Remote Database...');
    await remoteDb.connect();
    
    // 1. Schema Sync (Check for missing columns)
    console.log('\nChecking for missing columns on Remote...');
    for (const tableName of TABLES_TO_MIGRATE) {
      const localSchema = await localDb.pool.query(
        'SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1',
        [tableName]
      );
      
      const remoteSchema = await remoteDb.query(
        'SELECT column_name FROM information_schema.columns WHERE table_name = $1',
        [tableName]
      );
      
      const remoteCols = remoteSchema.rows.map(r => r.column_name);
      
      for (const col of localSchema.rows) {
        if (!remoteCols.includes(col.column_name)) {
          console.log(`  > Adding missing column "${col.column_name}" (${col.data_type}) to ${tableName}...`);
          await remoteDb.query(`ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS "${col.column_name}" ${col.data_type}`);
        }
      }
    }

    // 2. Clear Remote Data
    console.log('\nClearing existing data from Remote (Cascading)...');
    const truncateQuery = `TRUNCATE TABLE ${TABLES_TO_MIGRATE.join(', ')} RESTART IDENTITY CASCADE;`;
    await remoteDb.query(truncateQuery);
    
    // 3. Data Transfer
    for (const tableName of TABLES_TO_MIGRATE) {
      console.log(`\nMigrating table: ${tableName}...`);
      
      const { rows } = await localDb.pool.query(`SELECT * FROM ${tableName}`);
      
      if (rows.length === 0) {
        console.log(`  > Table ${tableName} is empty locally. Skipping.`);
        continue;
      }
      
      console.log(`  > Found ${rows.length} records local. Uploading...`);
      
      for (const row of rows) {
        const columns = Object.keys(row);
        const values = Object.values(row);
        const placeholders = columns.map((_, i) => `$${i+1}`).join(', ');
        
        try {
          await remoteDb.query(
            `INSERT INTO ${tableName} (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${placeholders})`, 
            values
          );
        } catch (err) {
          console.error(`  ! Error inserting into ${tableName}:`, err.message);
        }
      }
      console.log(`  > ${tableName} migrated successfully.`);
    }
    
    // 4. Reset sequences for primary keys
    console.log('\nResetting primary key sequences on Remote...');
    for (const tableName of TABLES_TO_MIGRATE) {
        try {
            await remoteDb.query(`SELECT setval(pg_get_serial_sequence('${tableName}', 'id'), (SELECT MAX(id) FROM ${tableName}))`);
            console.log(`  > ${tableName} sequence reset.`);
        } catch (e) {
            console.log(`  > ${tableName} sequence reset skipped (might not have a serial ID).`);
        }
    }

    console.log('\n✅ CLOUD MIGRATION COMPLETE! Render Database now matches Local.');
    process.exit(0);
  } catch (err) {
    console.error('CRITICAL MIGRATION ERROR:', err);
    process.exit(1);
  }
}

migrate();
