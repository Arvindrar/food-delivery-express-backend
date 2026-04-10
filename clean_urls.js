const db = require('./config/db');
const path = require('path');

async function cleanUrls() {
  try {
    console.log('--- Cleaning Image URLs in Database ---');
    
    // Helper to strip protocol and host
    const stripUrl = (url) => {
      if (!url) return url;
      if (url.startsWith('blob:')) return null; // Remove broken blob URLs
      if (url.includes('/api/uploads/')) {
        return path.basename(url.split('?')[0]); 
      }
      if (url.startsWith('http') && !url.includes('unsplash.com')) {
         // This handles cases like http://192.168...
         return path.basename(url.split('?')[0]);
      }
      return url;
    };

    // 1. Clean Categories
    const cats = await db.pool.query("SELECT id, image_url FROM categories");
    for (let row of cats.rows) {
      const clean = stripUrl(row.image_url);
      if (clean !== row.image_url) {
        await db.pool.query("UPDATE categories SET image_url = $1 WHERE id = $2", [clean, row.id]);
        console.log(`Updated Category ${row.id}: ${row.image_url} -> ${clean}`);
      }
    }

    // 2. Clean Restaurants
    const rests = await db.pool.query("SELECT id, image_url FROM restaurants");
    for (let row of rests.rows) {
      const clean = stripUrl(row.image_url);
      if (clean !== row.image_url) {
        await db.pool.query("UPDATE restaurants SET image_url = $1 WHERE id = $2", [clean, row.id]);
        console.log(`Updated Restaurant ${row.id}: ${row.image_url} -> ${clean}`);
      }
    }

    // 3. Clean Menu Items
    const items = await db.pool.query("SELECT id, image_url FROM menu_items");
    for (let row of items.rows) {
      const clean = stripUrl(row.image_url);
      if (clean !== row.image_url) {
        await db.pool.query("UPDATE menu_items SET image_url = $1 WHERE id = $2", [clean, row.id]);
        console.log(`Updated Menu Item ${row.id}: ${row.image_url} -> ${clean}`);
      }
    }

    console.log('\nCleanup Complete!');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

cleanUrls();
