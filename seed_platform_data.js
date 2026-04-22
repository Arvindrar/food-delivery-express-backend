const { Pool } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function seed() {
  try {
    console.log('--- STARTING RESTORATION SEEDING ---');

    // 1. Get some entities to link to
    const restaurants = (await pool.query('SELECT id FROM restaurants')).rows;
    const users = (await pool.query('SELECT id FROM users LIMIT 2')).rows;
    const drivers = (await pool.query('SELECT id FROM drivers LIMIT 2')).rows;

    if (restaurants.length === 0 || users.length === 0) {
      console.error('No restaurants or users found. Cannot seed orders.');
      return;
    }

    // 2. Clear any existing (just in case)
    await pool.query('DELETE FROM order_items');
    await pool.query('DELETE FROM orders');

    // 3. Define some realistic orders
    const sampleOrders = [
      { restId: 1, userId: users[0].id, driverId: drivers[0]?.id, status: 'Completed', items: [{id: 1, price: 230, qty: 2}, {id: 2, price: 180, qty: 1}] },
      { restId: 1, userId: users[1]?.id || users[0].id, driverId: drivers[1]?.id, status: 'Preparing', items: [{id: 6, price: 150, qty: 1}] },
      { restId: 2, userId: users[0].id, driverId: drivers[0]?.id, status: 'Completed', items: [{id: 3, price: 80, qty: 3}, {id: 4, price: 120, qty: 1}] },
      { restId: 3, userId: users[0].id, driverId: drivers[1]?.id, status: 'Ready for Pickup', items: [{id: 5, price: 250, qty: 2}] },
      { restId: 4, userId: users[0].id, driverId: null, status: 'Pending', items: [{id: 1, price: 230, qty: 1}] },
      { restId: 2, userId: users[1]?.id || users[0].id, driverId: drivers[0]?.id, status: 'Completed', items: [{id: 3, price: 80, qty: 2}] },
    ];

    for (let i = 0; i < sampleOrders.length; i++) {
      const o = sampleOrders[i];
      const total = o.items.reduce((sum, item) => sum + (item.price * item.qty), 0);
      
      // Create Order
      const res = await pool.query(
        `INSERT INTO orders (restaurant_id, user_id, driver_id, total_amount, status, is_driver_accepted) 
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [o.restId, o.userId, o.driverId, total, o.status, o.driverId ? true : false]
      );
      const orderId = res.rows[0].id;

      // Create Order Items
      for (let item of o.items) {
        await pool.query(
          `INSERT INTO order_items (order_id, menu_item_id, quantity, price) 
           VALUES ($1, $2, $3, $4)`,
          [orderId, item.id, item.qty, item.price]
        );
      }
    }

    console.log(`Successfully seeded ${sampleOrders.length} orders and their items.`);
    console.log('--- RESTORATION COMPLETE ---');
  } catch (err) {
    console.error('Seeding failed:', err);
  } finally {
    await pool.end();
  }
}

seed();
