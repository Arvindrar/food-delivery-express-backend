const db = require('./config/db');

async function migrate() {
  try {
    // Add login_id column
    await db.pool.query(`
      ALTER TABLE restaurants 
      ADD COLUMN IF NOT EXISTS login_id VARCHAR(100) UNIQUE
    `);
    console.log('Added login_id column');

    // Add password_plain column
    await db.pool.query(`
      ALTER TABLE restaurants 
      ADD COLUMN IF NOT EXISTS password_plain VARCHAR(255)
    `);
    console.log('Added password_plain column');

    // Add is_active column if missing
    await db.pool.query(`
      ALTER TABLE restaurants
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE
    `);
    console.log('Added is_active column');

    // Add category_id column if missing
    await db.pool.query(`
      ALTER TABLE restaurants
      ADD COLUMN IF NOT EXISTS category_id INTEGER
    `);
    console.log('Added category_id column');

    // Generate default login_ids for existing restaurants
    const existing = await db.pool.query('SELECT id, name, login_id FROM restaurants');
    for (const row of existing.rows) {
      if (!row.login_id) {
        // Generate a slug from the name
        const slug = row.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/^_|_$/g, '')
          .substring(0, 30);
        const loginId = `${slug}_${row.id}`;
        await db.pool.query('UPDATE restaurants SET login_id = $1 WHERE id = $2', [loginId, row.id]);
        console.log(`  Set login_id for restaurant ${row.id} (${row.name}): ${loginId}`);
      }
    }

    console.log('\nMigration complete!');
    process.exit(0);
  } catch (e) {
    console.error('Migration failed:', e.message);
    process.exit(1);
  }
}

migrate();
