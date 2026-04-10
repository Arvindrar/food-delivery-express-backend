const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  ssl: process.env.DB_HOST === 'localhost' ? false : {
    rejectUnauthorized: false
  }
});

async function debug() {
  try {
    console.log('--- DB Counts ---');
    const counts = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM orders) as orders,
        (SELECT COUNT(*) FROM users) as users,
        (SELECT COUNT(*) FROM restaurants) as restaurants,
        (SELECT COUNT(*) FROM users WHERE is_driver = TRUE) as drivers,
        (SELECT COUNT(*) FROM categories) as categories
    `);
    console.table(counts.rows);

    console.log('\n--- Orders with missing relations ---');
    const orphanOrders = await pool.query(`
      SELECT o.id, o.restaurant_id, o.user_id,
             (CASE WHEN r.id IS NULL THEN 'Missing Restaurant' ELSE 'OK' END) as restaurant_status,
             (CASE WHEN u.id IS NULL THEN 'Missing User' ELSE 'OK' END) as user_status
      FROM orders o
      LEFT JOIN restaurants r ON o.restaurant_id = r.id
      LEFT JOIN users u ON o.user_id = u.id
      WHERE r.id IS NULL OR u.id IS NULL
    `);
    if (orphanOrders.rows.length > 0) {
      console.table(orphanOrders.rows);
    } else {
      console.log('No orphan orders found (all have valid restaurant_id and user_id).');
    }

    console.log('\n--- Recent Orders (Top 5) ---');
    const recentOrders = await pool.query(`
      SELECT o.id, o.status, o.total_amount, o.created_at, r.name as restaurant, u.name as user
      FROM orders o
      JOIN restaurants r ON o.restaurant_id = r.id
      JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC
      LIMIT 5
    `);
    console.table(recentOrders.rows);

    console.log('\n--- Drivers ---');
    const drivers = await pool.query(`
      SELECT id, name, phone, email, is_driver
      FROM users
      WHERE is_driver = TRUE
    `);
    console.table(drivers.rows);

  } catch (err) {
    console.error('Debug Error:', err);
  } finally {
    await pool.end();
  }
}

debug();
