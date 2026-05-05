const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function check() {
  try {
    const res = await pool.query('SELECT id, name, image_url FROM restaurants');
    console.log('RESTAURANTS:');
    console.table(res.rows);

    const cats = await pool.query('SELECT id, name FROM categories');
    console.log('CATEGORIES:');
    console.table(cats.rows);

    const menus = await pool.query('SELECT id, name, restaurant_id FROM menu_items ORDER BY id DESC LIMIT 5');
    console.log('LATEST MENU ITEMS:');
    console.table(menus.rows);

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

check();
