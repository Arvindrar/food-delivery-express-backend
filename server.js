const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Simple JSON Logger
const logger = (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const log = {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip
    };
    console.log(JSON.stringify(log));
  });
  next();
};

const app = express();
app.use(logger);
app.use(cors());
app.use('/api/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Load environment variables
dotenv.config();

const db = require('./config/db');

// Configure Multer for local storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

const http = require('http').createServer(app);
const io = require('socket.io')(http, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Helper to construct absolute upload URLs
const getUploadUrl = (req, fileName) => {
  if (!fileName) return null;
  if (fileName.startsWith('http')) return fileName;
  const protocol = req.get('x-forwarded-proto') || req.protocol; 
  const host = req.get('host');
  // Use the /api/uploads/ prefix as defined in the static middleware
  return `${protocol}://${host}/api/uploads/${path.basename(fileName)}`;
};

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[SERVER ERROR]', {
    timestamp: new Date().toISOString(),
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method
  });

  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'An internal server error occurred' 
      : err.message
  });
});

const PORT = process.env.PORT || 5000;

// Socket.io Connection Logic
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('join', (roomId) => {
    socket.join(roomId);
    console.log(`Socket ${socket.id} joined room ${roomId}`);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Middleware
app.use(cors());
app.use(express.json());

// Test DB Connection
db.pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Error connecting to the database:', err.stack);
  } else {
    console.log('Database connected successfully at:', res.rows[0].now);
  }
});

app.get('/api/search/category/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.pool.query(`
      SELECT m.*, r.name as restaurant_name, r.address as restaurant_address, r.image_url as restaurant_image
      FROM menu_items m
      JOIN restaurants r ON m.restaurant_id = r.id
      WHERE m.category_id = $1 AND m.is_available = true
    `, [id]);
    const rows = result.rows.map(r => ({
      ...r,
      image_url: r.image_url ? getUploadUrl(req, r.image_url) : null,
      restaurant_image: r.restaurant_image ? getUploadUrl(req, r.restaurant_image) : null
    }));
    res.json(rows);
    
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch global category items' });
  }
});

app.get('/api/admin/stats', async (req, res) => {
  try {
    const stats = await db.pool.query(`
      SELECT 
        CAST((SELECT COUNT(*) FROM orders) AS INTEGER) as total_orders,
        CAST((SELECT COALESCE(SUM(total_amount), 0) FROM orders) AS INTEGER) as total_revenue,
        CAST((SELECT COUNT(*) FROM restaurants) AS INTEGER) as total_restaurants,
        CAST((SELECT COUNT(*) FROM users) AS INTEGER) as total_users,
        CAST((SELECT COUNT(*) FROM categories) AS INTEGER) as total_categories,
        CAST((SELECT COUNT(*) FROM users WHERE is_driver = TRUE) AS INTEGER) as total_drivers
    `);
    
    const recentOrders = await db.pool.query(`
      SELECT o.*, r.name as restaurant_name, u.name as user_name, r.latitude as restaurant_lat, r.longitude as restaurant_lng, r.image_url as r_image_url
      FROM orders o
      LEFT JOIN restaurants r ON o.restaurant_id = r.id
      LEFT JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC
      LIMIT 10
    `);

    const recentOrdersMapped = recentOrders.rows.map(o => ({
      ...o,
      restaurant_image: o.r_image_url ? getUploadUrl(req, o.r_image_url) : null
    }));

    res.json({
      summary: stats.rows[0],
      recentOrders: recentOrdersMapped
    });
  } catch (err) {
    console.error('STATS ERROR:', err);
    res.status(500).json({ error: 'Failed to fetch admin stats', details: err.message });
  }
});

app.get('/api/admin/users', async (req, res) => {
  try {
    const users = await db.pool.query(`
      SELECT u.id, u.name, u.phone, u.is_admin, u.is_driver, u.created_at,
             (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) as total_orders
      FROM users u
      ORDER BY u.created_at DESC
    `);
    res.json(users.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.get('/api/admin/restaurants', async (req, res) => {
  try {
    const restaurants = await db.pool.query(`
      SELECT r.*, 
             (SELECT COUNT(*) FROM menu_items m WHERE m.restaurant_id = r.id) as item_count,
             (SELECT COUNT(*) FROM orders o WHERE o.restaurant_id = r.id) as order_count
      FROM restaurants r
      ORDER BY r.name ASC
    `);
    
    // Map absolute URLs
    const rows = restaurants.rows.map(r => ({
      ...r,
      image_url: r.image_url ? getUploadUrl(req, r.image_url) : null
    }));
    
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch restaurants' });
  }
});

app.put('/api/admin/restaurants/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;
    await db.pool.query('UPDATE restaurants SET is_active = $1 WHERE id = $2', [is_active, id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update restaurant status' });
  }
});

// Admin: Enhanced Restaurant Management
app.post('/api/admin/restaurants', async (req, res) => {
  try {
    const { name, address, cuisines, delivery_time, cost_for_two, is_veg_only, image_url, password, category_id } = req.body;
    
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const result = await db.pool.query(
      `INSERT INTO restaurants (name, address, cuisines, delivery_time, cost_for_two, is_veg_only, image_url, password, category_id, is_active) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE) RETURNING id`,
      [name, address, cuisines, delivery_time, cost_for_two, is_veg_only, image_url, hashedPassword, category_id]
    );
    
    res.json({ success: true, id: result.rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create restaurant' });
  }
});

app.put('/api/admin/restaurants/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, address, cuisines, delivery_time, cost_for_two, is_veg_only, image_url, password, category_id } = req.body;
    
    let query = 'UPDATE restaurants SET name=$1, address=$2, cuisines=$3, delivery_time=$4, cost_for_two=$5, is_veg_only=$6, image_url=$7, category_id=$8';
    let params = [name, address, cuisines, delivery_time, cost_for_two, is_veg_only, image_url, category_id];
    
    if (password) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      query += ', password=$9 WHERE id=$10';
      params.push(hashedPassword, id);
    } else {
      query += ' WHERE id=$9';
      params.push(id);
    }
    
    console.log('[ADMIN] Updating restaurant:', { id, name, category_id, hasPassword: !!password });
    await db.pool.query(query, params);
    res.json({ success: true });
  } catch (err) {
    console.error('[ADMIN ERROR] Restaurant update failed:', err);
    res.status(500).json({ error: 'Failed to update restaurant' });
  }
});

// Admin: Categories Management
app.post('/api/admin/categories', async (req, res) => {
  try {
    const { name, image_url } = req.body;
    console.log('[ADMIN] Creating category:', { name, image_url });
    const result = await db.pool.query('INSERT INTO categories (name, image_url) VALUES ($1, $2) RETURNING id', [name, image_url]);
    res.json({ success: true, id: result.rows[0].id });
  } catch (err) {
    console.error('[ADMIN ERROR] Category creation failed:', err);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

app.delete('/api/admin/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.pool.query('DELETE FROM categories WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('[ADMIN ERROR] Category deletion failed:', err);
    if (err.code === '23503') {
      return res.status(400).json({ error: 'Cannot delete: This category is still linked to one or more restaurants.' });
    }
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

app.put('/api/admin/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, image_url } = req.body;
    console.log('[ADMIN] Updating category:', { id, name, image_url });
    await db.pool.query('UPDATE categories SET name = $1, image_url = $2 WHERE id = $3', [name, image_url, id]);
    res.json({ success: true });
  } catch (err) {
    console.error('[ADMIN ERROR] Category update failed:', err);
    res.status(500).json({ error: 'Failed to update category' });
  }
});


// Admin: Driver Management
app.get('/api/admin/drivers', async (req, res) => {
  try {
    const result = await db.pool.query("SELECT id, name, phone, created_at, is_online, latitude, longitude, password_plain FROM users WHERE is_driver = TRUE ORDER BY created_at DESC");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch drivers' });
  }
});

app.post('/api/admin/drivers', async (req, res) => {
  try {
    const { name, phone, password } = req.body;
    console.log('[ADMIN] Creating driver:', { name, phone });
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const result = await db.pool.query(
      'INSERT INTO users (name, phone, password, password_plain, is_driver) VALUES ($1, $2, $3, $4, TRUE) RETURNING id',
      [name, phone, hashedPassword, password]
    );
    res.json({ success: true, id: result.rows[0].id });
  } catch (err) {
    console.error('[ADMIN ERROR] Driver creation failed:', {
      message: err.message,
      code: err.code,
      detail: err.detail,
    });
    if (err.code === '23505') {
      res.status(400).json({ error: 'Phone number already registered' });
    } else {
      res.status(500).json({ error: 'Failed to create driver: ' + (err.message || 'Internal Error') });
    }
  }
});

app.put('/api/admin/drivers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, password } = req.body;
    console.log('[ADMIN] Updating driver:', { id, name, phone, hasPassword: !!password });
    
    let query = 'UPDATE users SET name=$1, phone=$2';
    let params = [name, phone];
    
    if (password) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      query += ', password=$3, password_plain=$4 WHERE id=$5';
      params.push(hashedPassword, password, id);
    } else {
      query += ' WHERE id=$3';
      params.push(id);
    }
    
    await db.pool.query(query, params);
    res.json({ success: true });
  } catch (err) {
    console.error('[ADMIN ERROR] Driver update failed:', {
      id,
      message: err.message,
      code: err.code,
    });
    res.status(500).json({ error: 'Failed to update driver: ' + (err.message || 'Internal Error') });
  }
});

app.delete('/api/admin/drivers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.pool.query('DELETE FROM users WHERE id = $1 AND is_driver = TRUE', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete driver' });
  }
});

// --- DRIVER ECOSYSTEM API (Phases 5-7) ---
app.put('/api/driver/status', async (req, res) => {
  try {
    const { driver_id, is_online } = req.body;
    console.log('[DRIVER] Updating online status:', { driver_id, is_online });
    
    await db.pool.query('UPDATE users SET is_online = $1 WHERE id = $2 AND is_driver = TRUE', [is_online, driver_id]);
    res.json({ success: true, is_online });
  } catch (err) {
    console.error('[DRIVER ERROR] Failed to update status:', err);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

app.put('/api/driver/status', async (req, res) => {
  try {
    const { driver_id, is_online } = req.body;
    await db.pool.query('UPDATE users SET is_online = $1 WHERE id = $2', [is_online, driver_id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

app.put('/api/driver/location', async (req, res) => {
  try {
    const { driver_id, latitude, longitude } = req.body;
    await db.pool.query(
      'UPDATE users SET latitude = $1, longitude = $2 WHERE id = $3',
      [latitude, longitude, driver_id]
    );

    // Broadcast to relevant rooms (e.g., admin and customer tracking the order)
    io.emit('driver_location_updated', { driver_id, latitude, longitude });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update location' });
  }
});

app.get('/api/driver/:driver_id/active-orders', async (req, res) => {
  try {
    const { driver_id } = req.params;
    const orders = await db.pool.query(`
      SELECT o.*, r.name as restaurant_name, r.address as restaurant_address, u.name as user_name, u.address as user_address 
      FROM orders o
      JOIN restaurants r ON o.restaurant_id = r.id
      JOIN users u ON o.user_id = u.id
      WHERE o.driver_id = $1 AND o.is_driver_accepted = true AND o.status != 'Completed'
    `, [driver_id]);
    res.json(orders.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch active orders' });
  }
});

app.put('/api/admin/orders/:id/assign', async (req, res) => {
  try {
    const { id } = req.params;
    const { driver_id } = req.body;
    console.log(`[ADMIN] Assigning driver ${driver_id} to order ${id}`);
    await db.pool.query('UPDATE orders SET driver_id = $1, is_driver_accepted = false WHERE id = $2', [driver_id, id]);
    io.emit('status_updated', { order_id: id, status: 'Assigned' });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to assign driver' });
  }
});

app.get('/api/driver/:driver_id/history', async (req, res) => {
  try {
    const { driver_id } = req.params;
    const result = await db.pool.query(`
      SELECT o.*, r.name as restaurant_name 
      FROM orders o 
      JOIN restaurants r ON o.restaurant_id = r.id 
      WHERE o.driver_id = $1 AND o.status = 'Completed'
      ORDER BY o.created_at DESC
    `, [driver_id]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error fetching driver history' });
  }
});

app.get('/api/driver/:driver_id/available-orders', async (req, res) => {
  try {
    const { driver_id } = req.params;
    const orders = await db.pool.query(`
      SELECT o.*, r.name as restaurant_name, r.address as restaurant_address
      FROM orders o
      JOIN restaurants r ON o.restaurant_id = r.id
      WHERE o.driver_id = $1 AND o.is_driver_accepted = false
    `, [driver_id]);
    res.json(orders.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch available orders' });
  }
});

app.put('/api/driver/orders/:id/accept', async (req, res) => {
  try {
    const { id } = req.params;
    const { driver_id } = req.body;
    const result = await db.pool.query(
      'UPDATE orders SET is_driver_accepted = true WHERE id = $1 AND driver_id = $2 RETURNING *',
      [id, driver_id]
    );
    io.emit('status_updated', { order_id: id, status: 'Driver Accepted' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to accept order' });
  }
});

app.put('/api/driver/orders/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    await db.pool.query(
      'UPDATE orders SET driver_id = NULL, is_driver_accepted = false WHERE id = $1',
      [id]
    );
    io.emit('status_updated', { order_id: id, status: 'Driver Rejected' });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to reject order' });
  }
});

app.put('/api/driver/orders/:id/pickup', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.pool.query(
      "UPDATE orders SET status = 'Out for Delivery' WHERE id = $1 RETURNING *",
      [id]
    );
    io.emit('status_updated', { order_id: id, status: 'Out for Delivery' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to pickup order' });
  }
});

app.post('/api/driver/complete-delivery', async (req, res) => {
  try {
    const { order_id } = req.body;
    const earningsPerDelivery = 30; // Base earnings of ₹30 for Karaikudi

    const result = await db.pool.query(
      'UPDATE orders SET status = \'Completed\', driver_earnings = $1 WHERE id = $2 RETURNING *',
      [earningsPerDelivery, order_id]
    );

    const updatedOrder = result.rows[0];
    io.emit('status_updated', { order_id: updatedOrder.id, status: 'Completed' });

    res.json(updatedOrder);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to complete delivery' });
  }
});

// --- SWIGGY CLONE API ROUTES ---
app.get('/api/restaurants', async (req, res) => {
  try {
    const { sort, category_id, is_veg, min_rating } = req.query;
    let queryText = 'SELECT * FROM restaurants WHERE 1=1';
    const queryParams = [];

    if (category_id) {
      queryParams.push(category_id);
      queryText += ` AND category_id = $${queryParams.length}`;
    }

    if (is_veg === 'true') {
      queryText += ' AND is_veg_only = TRUE';
    }

    if (min_rating) {
      queryParams.push(parseFloat(min_rating));
      queryText += ` AND rating >= $${queryParams.length}`;
    }

    // Add Sorting Logic
    if (sort === 'rating') {
      queryText += ' ORDER BY rating DESC';
    } else if (sort === 'cost') {
      queryText += ' ORDER BY cost_for_two ASC';
    } else if (sort === 'time') {
      queryText += ' ORDER BY delivery_time ASC';
    } else {
      queryText += ' ORDER BY rating DESC'; // Default
    }

    const result = await db.pool.query(queryText, queryParams);
    const rows = result.rows.map(r => ({
      ...r,
      image_url: r.image_url ? getUploadUrl(req, r.image_url) : null
    }));
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error fetching restaurants' });
  }
});

app.get('/api/categories', async (req, res) => {
  try {
    const result = await db.pool.query('SELECT * FROM categories');
    const rows = result.rows.map(r => ({
      ...r,
      image_index: r.id, // for carousel grouping
      image_url: r.image_url ? getUploadUrl(req, r.image_url) : null
    }));
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error fetching categories' });
  }
});

app.get('/api/restaurants/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.pool.query('SELECT * FROM restaurants WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Restaurant not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.get('/api/restaurants/:id/menu', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.pool.query('SELECT * FROM menu_items WHERE restaurant_id = $1', [id]);
    const rows = result.rows.map(m => ({
      ...m,
      image_url: m.image_url ? getUploadUrl(req, m.image_url) : null
    }));
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Database error fetching menu' });
  }
});

app.post('/api/orders', async (req, res) => {
  try {
    const { user_id, restaurant_id, total_amount, items, delivery_address, customer_name, latitude, longitude } = req.body;
    
    // Explicitly parse coordinates as numbers to avoid null/string conversion issues in DB
    const lat = latitude !== null && latitude !== undefined ? Number(latitude) : null;
    const lng = longitude !== null && longitude !== undefined ? Number(longitude) : null;

    console.log(`[ORDER] Creating for user ${user_id} at ${lat}, ${lng}`);
    
    // Start transaction
    await db.pool.query('BEGIN');
    
    // Insert Order with snapshotted address, name, coordinates and landmark
    const orderResult = await db.pool.query(
      'INSERT INTO orders (user_id, restaurant_id, total_amount, delivery_address, customer_name, latitude, longitude, landmark) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id',
      [user_id, restaurant_id, total_amount, delivery_address, customer_name, lat, lng, req.body.landmark || null]
    );
    const orderId = orderResult.rows[0].id;
    
    // Insert Items
    for (let item of items) {
      await db.pool.query(
        'INSERT INTO order_items (order_id, menu_item_id, quantity, price) VALUES ($1, $2, $3, $4)',
        [orderId, item.menu_item_id, item.quantity, item.price]
      );
    }
    
    await db.pool.query('COMMIT');
    
    // Phase 12: Emit new_order event to the restaurant
    io.to(`restaurant_${restaurant_id}`).emit('new_order', { order_id: orderId });
    
    res.json({ success: true, order_id: orderId });
  } catch (err) {
    await db.pool.query('ROLLBACK');
    console.error('Order creation failed:', err);
    res.status(500).json({ error: 'Order failed' });
  }
});

// --- AUTHENTICATION ROUTES ---
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_swiggy_key';

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, phone, address, password } = req.body;
    
    // Check if user exists
    const userExists = await db.pool.query('SELECT * FROM users WHERE phone = $1', [phone]);
    if (userExists.rows.length > 0) return res.status(400).json({ error: 'User already exists' });

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await db.pool.query(
      'INSERT INTO users (name, phone, address, password) VALUES ($1, $2, $3, $4) RETURNING id, name, phone, address, is_admin',
      [name, phone, address, hashedPassword]
    );

    const user = newUser.rows[0];
    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({ token, user });
  } catch (err) {
    console.error('Registration failed:', err);
    res.status(500).json({ error: 'Failed to register' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { phone, password } = req.body;

    const userResult = await db.pool.query('SELECT * FROM users WHERE phone = $1', [phone]);
    if (userResult.rows.length === 0) return res.status(400).json({ error: 'Invalid phone or password' });

    const user = userResult.rows[0];
    
    if (!user.password) return res.status(400).json({ error: 'Account has no password set' });
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Invalid phone or password' });

    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
    
    delete user.password;
    res.json({ token, user });
  } catch (err) {
    console.error('Login failed:', err);
    res.status(500).json({ error: 'Failed to login' });
  }
});

// --- VENDOR AUTH ROUTES ---
app.post('/api/vendor/login', async (req, res) => {
  try {
    const { restaurant_id, password } = req.body;
    if (!restaurant_id || !password) return res.status(400).json({ error: 'Missing credentials' });

    const result = await db.pool.query('SELECT * FROM restaurants WHERE id = $1', [parseInt(restaurant_id)]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Restaurant ID not found' });
    }

    const restaurant = result.rows[0];
    
    const validPassword = await bcrypt.compare(password, restaurant.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    const token = jwt.sign(
      { restaurant_id: restaurant.id },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({ 
      token, 
      restaurant: { id: restaurant.id, name: restaurant.name, image_url: restaurant.image_url } 
    });
  } catch (err) {
    console.error('Vendor login failed:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// --- SEARCH ROUTES ---
app.get('/api/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json({ restaurants: [], items: [] });
    
    const searchParam = `%${q}%`;
    
    // Search restaurants by name
    const restResult = await db.pool.query(
      'SELECT * FROM restaurants WHERE name ILIKE $1',
      [searchParam]
    );

    // Search menu items by name, returning the joined restaurant info
    const itemResult = await db.pool.query(
      `SELECT m.*, r.name as restaurant_name 
       FROM menu_items m 
       JOIN restaurants r ON m.restaurant_id = r.id 
       WHERE m.name ILIKE $1`,
      [searchParam]
    );

    res.json({
      restaurants: restResult.rows.map(r => ({
        ...r,
        image_url: r.image_url ? getUploadUrl(req, r.image_url) : null
      })),
      items: itemResult.rows.map(m => ({
        ...m,
        image_url: m.image_url ? getUploadUrl(req, m.image_url) : null
      }))
    });
  } catch (err) {
    console.error('Search failed:', err);
    res.status(500).json({ error: 'Search failed' });
  }
});

// --- USER ORDERS ROUTE ---
app.get('/api/user/:user_id/orders', async (req, res) => {
  try {
    const { user_id } = req.params;
    
    const ordersResult = await db.pool.query(
      `SELECT o.id, o.total_amount, o.status, o.created_at, o.delivery_address, r.name as restaurant_name, r.image_url as restaurant_image
       FROM orders o
       JOIN restaurants r ON o.restaurant_id = r.id
       WHERE o.user_id = $1
       ORDER BY o.created_at DESC`,
      [user_id]
    );

    const ordersMapped = ordersResult.rows.map(o => ({
      ...o,
      restaurant_image: o.restaurant_image ? getUploadUrl(req, o.restaurant_image) : null
    }));

    for (let order of ordersMapped) {
      const itemsResult = await db.pool.query(
        `SELECT oi.quantity, m.name 
         FROM order_items oi
         JOIN menu_items m ON oi.menu_item_id = m.id
         WHERE oi.order_id = $1`,
        [order.id]
      );
      order.items = itemsResult.rows;
    }

    res.json(ordersMapped);
  } catch (err) {
    console.error('Fetching user orders failed:', err);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

app.get('/api/orders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.pool.query(`
      SELECT 
        o.*, 
        r.name as restaurant_name, 
        r.address as restaurant_address, 
        r.latitude as restaurant_lat, 
        r.longitude as restaurant_lng,
        d.name as driver_name,
        d.phone as driver_phone,
        d.latitude as driver_lat,
        d.longitude as driver_lng
      FROM orders o
      JOIN restaurants r ON o.restaurant_id = r.id
      LEFT JOIN users d ON o.driver_id = d.id
      WHERE o.id = $1
    `, [id]);
    
    if (result.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error fetching order' });
  }
});

// --- ADDRESS ROUTES (Phase 13) ---
app.get('/api/user/:user_id/addresses', async (req, res) => {
  try {
    const { user_id } = req.params;
    const result = await db.pool.query('SELECT * FROM addresses WHERE user_id = $1 ORDER BY is_default DESC, id DESC', [user_id]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/user/addresses', async (req, res) => {
  try {
    const { user_id, label, address_text, is_default, latitude, longitude, landmark } = req.body;
    
    console.log('--- ADDRESS CREATION DEBUG ---');
    console.log('Raw Payload:', JSON.stringify(req.body, null, 2));
    
    // Explicitly parse coordinates to strings to match character varying DB type
    let finalLat = null;
    let finalLng = null;

    if (latitude !== undefined && latitude !== null && String(latitude).trim() !== '') {
      finalLat = String(latitude).trim();
    }
    if (longitude !== undefined && longitude !== null && String(longitude).trim() !== '') {
      finalLng = String(longitude).trim();
    }

    console.log(`Resolved: User=${user_id}, Lab=${label}, Lat=${finalLat}, Lng=${finalLng}, Landmark=${landmark}`);
    
    if (is_default) {
      await db.pool.query('UPDATE addresses SET is_default = FALSE WHERE user_id = $1', [user_id]);
    }

    const result = await db.pool.query(
      'INSERT INTO addresses (user_id, label, address_text, is_default, latitude, longitude, landmark) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [user_id, label, address_text, is_default, finalLat, finalLng, landmark]
    );

    console.log('DB result id:', result.rows[0].id, 'Lat:', result.rows[0].latitude);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('CRITICAL ADDRESS ERROR:', err.message, err.detail);
    if (err.code === '23503') { // Foreign key constraint violation
      res.status(400).json({ error: 'User does not exist in local database. Please log out and log back in to sync your account.' });
    } else {
      res.status(500).json({ error: 'Database error', details: err.message });
    }
  }
});

app.delete('/api/user/addresses/:address_id', async (req, res) => {
  try {
    const { address_id } = req.params;
    await db.pool.query('DELETE FROM addresses WHERE id = $1', [address_id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// --- FAVORITES ROUTES (Phase 14) ---
app.get('/api/user/:user_id/favorites', async (req, res) => {
  try {
    const { user_id } = req.params;
    const result = await db.pool.query(
      `SELECT r.* FROM restaurants r 
       JOIN favorites f ON r.id = f.restaurant_id 
       WHERE f.user_id = $1`, 
      [user_id]
    );
    const restaurants = result.rows.map(r => ({
      ...r,
      image_url: r.image_url ? getUploadUrl(req, r.image_url) : null
    }));
    res.json(restaurants);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/user/favorites/toggle', async (req, res) => {
  try {
    const { user_id, restaurant_id } = req.body;
    const exists = await db.pool.query('SELECT * FROM favorites WHERE user_id = $1 AND restaurant_id = $2', [user_id, restaurant_id]);
    
    if (exists.rows.length > 0) {
      await db.pool.query('DELETE FROM favorites WHERE user_id = $1 AND restaurant_id = $2', [user_id, restaurant_id]);
      res.json({ status: 'removed' });
    } else {
      await db.pool.query('INSERT INTO favorites (user_id, restaurant_id) VALUES ($1, $2)', [user_id, restaurant_id]);
      res.json({ status: 'added' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// --- PROMO CODE ROUTES (Phase 3) ---
app.post('/api/promo/validate', async (req, res) => {
  try {
    const { code, cartTotal } = req.body;
    const result = await db.pool.query(
      'SELECT * FROM coupons WHERE code = $1 AND is_active = TRUE AND (expiry_date IS NULL OR expiry_date > CURRENT_TIMESTAMP)',
      [code.toUpperCase()]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invalid or expired promo code' });
    }

    const promo = result.rows[0];

    if (cartTotal < parseFloat(promo.min_order_value)) {
      return res.status(400).json({ error: `Min order value for this code is ₹${promo.min_order_value}` });
    }

    let discount = 0;
    if (promo.discount_type === 'percent') {
      discount = (cartTotal * parseFloat(promo.discount_value)) / 100;
      if (promo.max_discount && discount > parseFloat(promo.max_discount)) {
        discount = parseFloat(promo.max_discount);
      }
    } else {
      discount = parseFloat(promo.discount_value);
    }

    res.json({ 
      success: true, 
      discount: Math.round(discount), 
      code: promo.code,
      message: `₹${Math.round(discount)} off applied!` 
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Validation failed' });
  }
});

// --- INSIGHTS ROUTE (Phase 15) ---
app.get('/api/vendor/:restaurant_id/insights', async (req, res) => {
  try {
    const { restaurant_id } = req.params;
    
    const [stats, topDishes] = await Promise.all([
      db.pool.query(
        'SELECT COUNT(*) as total_orders, SUM(total_amount) as total_revenue FROM orders WHERE restaurant_id = $1',
        [restaurant_id]
      ),
      db.pool.query(
        `SELECT mi.name, SUM(oi.quantity) as total_sales 
         FROM order_items oi 
         JOIN menu_items mi ON oi.menu_item_id = mi.id 
         WHERE mi.restaurant_id = $1 
         GROUP BY mi.name 
         ORDER BY total_sales DESC 
         LIMIT 5`,
        [restaurant_id]
      )
    ]);

    res.json({
      total_orders: stats.rows[0].total_orders,
      total_revenue: stats.rows[0].total_revenue || 0,
      top_dishes: topDishes.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// --- REVIEWS ROUTES (Phase 16) ---
app.get('/api/restaurants/:restaurant_id/reviews', async (req, res) => {
  try {
    const { restaurant_id } = req.params;
    const result = await db.pool.query(
      `SELECT r.*, u.name as user_name 
       FROM reviews r 
       JOIN users u ON r.user_id = u.id 
       WHERE r.restaurant_id = $1 
       ORDER BY r.created_at DESC`,
      [restaurant_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/reviews', async (req, res) => {
  try {
    const { user_id, restaurant_id, order_id, rating, comment } = req.body;
    await db.pool.query(
      'INSERT INTO reviews (user_id, restaurant_id, order_id, rating, comment) VALUES ($1, $2, $3, $4, $5)',
      [user_id, restaurant_id, order_id, rating, comment]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error or duplicate review' });
  }
});

// --- VENDOR DASHBOARD ROUTES ---
app.get('/api/vendor/:restaurant_id/orders', async (req, res) => {
  try {
    const { restaurant_id } = req.params;
    
    // Fetch all orders for this restaurant
    const ordersResult = await db.pool.query(
      `SELECT o.*
       FROM orders o 
       WHERE o.restaurant_id = $1 
       ORDER BY o.created_at DESC`,
      [restaurant_id]
    );

    const orders = ordersResult.rows;

    // For each order, fetch the exact items ordered
    for (let order of orders) {
      const itemsResult = await db.pool.query(
        `SELECT oi.*, m.name 
         FROM order_items oi 
         JOIN menu_items m ON oi.menu_item_id = m.id 
         WHERE oi.order_id = $1`,
        [order.id]
      );
      order.items = itemsResult.rows;
    }

    res.json(orders);
  } catch (err) {
    console.error('Failed to fetch vendor orders:', err);
    res.status(500).json({ error: 'Database error fetching orders' });
  }
});

// --- VENDOR MENU MANAGEMENT ROUTES ---
app.post('/api/vendor/menu', async (req, res) => {
  try {
    const { restaurant_id, category_id, name, description, price, is_veg, image_url } = req.body;
    console.log('[VENDOR] Adding menu item:', { restaurant_id, name });
    
    const result = await db.pool.query(
      'INSERT INTO menu_items (restaurant_id, category_id, name, description, price, is_veg, image_url) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
      [restaurant_id, category_id || null, name, description, price, is_veg, image_url || null]
    );
    
    res.json({ success: true, id: result.rows[0].id });
  } catch (err) {
    console.error('[VENDOR ERROR] Failed to add menu item:', err);
    res.status(500).json({ error: 'Failed to add menu item' });
  }
});

app.use('/public/uploads', express.static(path.join(__dirname, 'public/uploads')));

// getUploadUrl moved to top

// Add POST /api/upload endpoint for file receiving
app.post('/api/upload', upload.single('photo'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    
    // Construct absolute public URL
    const fileUrl = getUploadUrl(req, req.file.filename);
    res.json({ 
      success: true,
      url: fileUrl,
      filename: req.file.filename 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

app.put('/api/vendor/menu/:item_id', async (req, res) => {
  try {
    const { item_id } = req.params;
    const { name, description, price, is_veg, is_available, image_url } = req.body;
    console.log('[VENDOR] Updating menu item:', { item_id, name });
    
    await db.pool.query(
      `UPDATE menu_items 
       SET name = $1, description = $2, price = $3, is_veg = $4, is_available = $5, image_url = $6 
       WHERE id = $7`,
      [name, description, price, is_veg, is_available, image_url, item_id]
    );
    
    res.json({ success: true });
  } catch (err) {
    console.error('[VENDOR ERROR] Failed to update menu item:', err);
    res.status(500).json({ error: 'Failed to update menu item' });
  }
});

app.delete('/api/vendor/menu/:item_id', async (req, res) => {
  try {
    const { item_id } = req.params;
    console.log('[VENDOR] Deleting menu item:', { item_id });
    await db.pool.query('DELETE FROM menu_items WHERE id = $1', [item_id]);
    res.json({ success: true });
  } catch (err) {
    console.error('[VENDOR ERROR] Failed to delete menu item:', err);
    res.status(500).json({ error: 'Failed to delete menu item' });
  }
});

app.put('/api/orders/:order_id/status', async (req, res) => {
  try {
    const { order_id } = req.params;
    const { status, user_id } = req.body;
    
    await db.pool.query('UPDATE orders SET status = $1 WHERE id = $2', [status, order_id]);
    
    // Phase 12: Emit status_updated event to the specific customer
    if (user_id) {
       io.to(`user_${user_id}`).emit('status_updated', { order_id, status });
    }

    res.json({ success: true, status });
  } catch (err) {
    console.error('Failed to update status:', err);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the Vendor Portal API' });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date() });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[SERVER ERROR]', {
    timestamp: new Date().toISOString(),
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method
  });

  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'An internal server error occurred' 
      : err.message
  });
});

// Start the server
http.listen(PORT, '0.0.0.0', () => {
  console.log(`Server (with Socket.io) is running on http://0.0.0.0:${PORT}`);
});
