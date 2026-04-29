const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const DATABASE_URL = 'postgresql://arvind:QkI1OjJNTydT4AI1gJ2HyHCSHlE6IOig@dpg-d76ft8pr0fns73c9k8c0-a.oregon-postgres.render.com/food_delivery_e1rj';

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const uploadsDir = path.join(__dirname, 'public/uploads');

async function fixImages() {
  console.log('--- Starting Image Fix Script ---');
  
  if (!fs.existsSync(uploadsDir)) {
    console.error('Uploads directory not found!');
    process.exit(1);
  }

  const files = fs.readdirSync(uploadsDir);
  const renamedFiles = {};

  for (const file of files) {
    const ext = path.extname(file);
    if (!ext || ext === '') {
      const oldPath = path.join(uploadsDir, file);
      const newName = file + '.jpg';
      const newPath = path.join(uploadsDir, newName);
      
      try {
        if (!fs.existsSync(newPath)) {
            fs.renameSync(oldPath, newPath);
            renamedFiles[file] = newName;
            console.log(`Renamed: ${file} -> ${newName}`);
        } else {
            console.log(`Skipping rename, ${newName} already exists.`);
        }
      } catch (e) {
        console.error(`Failed to rename ${file}:`, e.message);
      }
    }
  }

  console.log('\n--- Updating Database ---');
  
  try {
    // 1. Update Restaurants
    const res = await pool.query('SELECT id, image_url FROM restaurants');
    for (const row of res.rows) {
      if (row.image_url && !row.image_url.includes('.') && !row.image_url.startsWith('http')) {
        const newUrl = row.image_url + '.jpg';
        await pool.query('UPDATE restaurants SET image_url = $1 WHERE id = $2', [newUrl, row.id]);
        console.log(`DB Update (Restaurant ${row.id}): ${row.image_url} -> ${newUrl}`);
      }
    }

    // 2. Update Menu Items
    const menuRes = await pool.query('SELECT id, image_url FROM menu_items');
    for (const row of menuRes.rows) {
      if (row.image_url && !row.image_url.includes('.') && !row.image_url.startsWith('http')) {
        const newUrl = row.image_url + '.jpg';
        await pool.query('UPDATE menu_items SET image_url = $1 WHERE id = $2', [newUrl, row.id]);
        console.log(`DB Update (MenuItem ${row.id}): ${row.image_url} -> ${newUrl}`);
      }
    }

    // 3. Update Categories
    const catRes = await pool.query('SELECT id, image_url FROM categories');
    for (const row of catRes.rows) {
      if (row.image_url && !row.image_url.includes('.') && !row.image_url.startsWith('http')) {
        const newUrl = row.image_url + '.jpg';
        await pool.query('UPDATE categories SET image_url = $1 WHERE id = $2', [newUrl, row.id]);
        console.log(`DB Update (Category ${row.id}): ${row.image_url} -> ${newUrl}`);
      }
    }

    console.log('\n--- SUCCESS: Database and Filesystem synchronized ---');
  } catch (err) {
    console.error('Database error:', err.message);
  } finally {
    await pool.end();
  }
}

fixImages();
