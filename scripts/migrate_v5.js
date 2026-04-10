const db = require('../config/db');

const migrate = async () => {
  try {
    console.log('🚀 Adding category_id to restaurants and creating favorites/reviews tables if missing...');
    
    // 1. Add category_id if not exists
    await db.pool.query(`
      ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS category_id INTEGER;
    `);

    // 2. Ensure we have some categories
    const categories = await db.pool.query('SELECT id FROM categories LIMIT 1');
    if (categories.rows.length === 0) {
      console.log('Inserting default categories...');
      await db.pool.query(`
        INSERT INTO categories (name, image_url) VALUES 
        ('South Indian', 'south_indian.png'),
        ('North Indian', 'north_indian.png'),
        ('Burgers', 'burgers.png'),
        ('Fast Food', 'fast_food.png')
        ON CONFLICT DO NOTHING;
      `);
    }

    // 3. Backfill categories for restaurants
    // Let's assign id 1 (South Indian) to all for now as a default
    await db.pool.query(`
      UPDATE restaurants SET category_id = (SELECT id FROM categories ORDER BY id ASC LIMIT 1) 
      WHERE category_id IS NULL;
    `);

    console.log('🎉 Migration successful!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
};

migrate();
