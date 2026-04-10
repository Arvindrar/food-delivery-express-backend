const db = require('../config/db');

async function testOrderCreation() {
  try {
    const user_id = 1; // Assuming 1 exists locally
    const restaurant_id = 1; // Assuming 1 exists locally
    const total_amount = 100;
    const delivery_address = 'Test Address';
    const customer_name = 'Test User';
    const lat = 10.123;
    const lng = 78.456;
    const landmark = 'Test Landmark';

    await db.pool.query('BEGIN');
    
    // Insert Order
    const orderResult = await db.pool.query(
      'INSERT INTO orders (user_id, restaurant_id, total_amount, delivery_address, customer_name, latitude, longitude, landmark) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id',
      [user_id, restaurant_id, total_amount, delivery_address, customer_name, lat, lng, landmark]
    );
    const orderId = orderResult.rows[0].id;
    console.log('Order created successfully with ID:', orderId);
    
    // Insert Items
    await db.pool.query(
      'INSERT INTO order_items (order_id, menu_item_id, quantity, price) VALUES ($1, $2, $3, $4)',
      [orderId, 1, 1, 100] // Assuming menu_item_id 1 exists locally
    );
    console.log('Order items inserted successfully.');

    await db.pool.query('ROLLBACK'); // Rollback just to be safe
    console.log('Test complete and rolled back.');
    process.exit(0);
  } catch (err) {
    await db.pool.query('ROLLBACK');
    console.error('Order creation failed:', err.message, err.detail);
    process.exit(1);
  }
}

testOrderCreation();
