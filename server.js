const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Razorpay = require('razorpay');
const fetch = require('node-fetch');

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

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

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

// Proxy for Google Places Autocomplete to avoid CORS on web
app.get('/api/location/search', async (req, res) => {
  try {
    const { input } = req.query;
    if (!input) return res.json({ predictions: [] });
    
    const apiKey = 'AIzaSyCQstmhdPUAGpwxkOofOZFwLed_I0vTU4o'; // Google Maps Key
    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&key=${apiKey}&components=country:in`;
    
    const response = await fetch(url);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('[PROXY ERROR]', err);
    res.status(500).json({ error: 'Failed to fetch location predictions' });
  }
});

app.get('/api/location/details', async (req, res) => {
  try {
    const { place_id } = req.query;
    if (!place_id) return res.status(400).json({ error: 'place_id is required' });
    
    const apiKey = 'AIzaSyCQstmhdPUAGpwxkOofOZFwLed_I0vTU4o'; // Google Maps Key
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place_id}&fields=geometry&key=${apiKey}`;
    
    const response = await fetch(url);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('[DETAILS PROXY ERROR]', err);
    res.status(500).json({ error: 'Failed to fetch location details' });
  }
});

app.get('/api/search/category/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { is_veg } = req.query;
    // Get category name for fuzzy matching
    const catRes = await db.pool.query('SELECT name FROM categories WHERE id = $1', [id]);
    const catName = catRes.rows.length > 0 ? catRes.rows[0].name : '';

    let queryText = `
      SELECT m.*, r.name as restaurant_name, r.address as restaurant_address, r.image_url as restaurant_image
      FROM menu_items m
      JOIN restaurants r ON m.restaurant_id = r.id
      WHERE (m.category_id = $1 OR m.name ILIKE $2) AND m.is_available = true
    `;
    const params = [id, `%${catName}%`];
    
    if (is_veg === 'true') {
      queryText += ' AND m.is_veg = true ORDER BY m.id ASC';
    } else {
      queryText += ' ORDER BY m.id ASC';
    }

    const result = await db.pool.query(queryText, params);
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
        CAST((SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE status = 'Completed') AS INTEGER) as total_revenue,
        CAST((SELECT COUNT(*) FROM restaurants) AS INTEGER) as total_restaurants,
        CAST((SELECT COUNT(*) FROM users) AS INTEGER) as total_users,
        CAST((SELECT COUNT(*) FROM categories) AS INTEGER) as total_categories,
        CAST((SELECT COUNT(*) FROM drivers) AS INTEGER) as total_drivers,
        CAST((SELECT COALESCE(SUM(platform_commission), 0) FROM orders WHERE status = 'Completed') AS INTEGER) as total_commissions
    `);
    
    const recentOrders = await db.pool.query(`
      SELECT 
        o.*, 
        r.name as restaurant_name, 
        u.name as user_name, 
        r.latitude as restaurant_lat, 
        r.longitude as restaurant_lng, 
        r.image_url as r_image_url,
        d.name as driver_name
      FROM orders o
      LEFT JOIN restaurants r ON o.restaurant_id = r.id
      LEFT JOIN users u ON o.user_id = u.id
      LEFT JOIN drivers d ON o.driver_id = d.id
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
      SELECT u.id, u.name, u.phone, u.created_at,
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
      WHERE r.is_deleted = false
      ORDER BY r.display_order ASC, r.id ASC
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

app.put('/api/admin/restaurants/reorder', async (req, res) => {
  try {
    const { items } = req.body; // Array of {id, display_order}
    if (!Array.isArray(items)) return res.status(400).json({ error: 'Invalid items array' });
    
    console.log('[ADMIN] Reordering restaurants:', items.length, 'items');
    
    const promises = items.map(item => 
      db.pool.query('UPDATE restaurants SET display_order = $1 WHERE id = $2', [item.display_order, item.id])
    );
    
    await Promise.all(promises);
    res.json({ success: true });
  } catch (err) {
    console.error('[ADMIN ERROR] Reorder failed:', err);
    res.status(500).json({ error: 'Failed to reorder restaurants' });
  }
});

app.get('/api/admin/commissions', async (req, res) => {
  try {
    const result = await db.pool.query(`
      SELECT o.id, o.created_at, o.total_amount, o.delivery_fee, o.handling_fee, o.platform_commission, o.driver_earnings,
             r.name as restaurant_name, u.name as user_name, d.name as driver_name
      FROM orders o
      JOIN restaurants r ON o.restaurant_id = r.id
      JOIN users u ON o.user_id = u.id
      LEFT JOIN drivers d ON o.driver_id = d.id
      WHERE o.status = 'Completed'
      ORDER BY o.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch commissions' });
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
    const { name, address, cuisines, delivery_time, cost_for_two, is_veg_only, image_url, password, category_id, login_id, rating, reviews_count } = req.body;
    
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const result = await db.pool.query(
      `INSERT INTO restaurants (name, address, cuisines, delivery_time, cost_for_two, is_veg_only, image_url, password, password_plain, category_id, is_active, login_id, rating, reviews_count, latitude, longitude) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, TRUE, $11, $12, $13, $14, $15) RETURNING id`,
      [name, address, cuisines, delivery_time, cost_for_two, is_veg_only, image_url, hashedPassword, password, category_id, login_id || null, rating || 0, reviews_count || 0, latitude || null, longitude || null]
    );
    
    res.json({ success: true, id: result.rows[0].id });
  } catch (err) {
    console.error(err);
    if (err.code === '23505' && err.constraint && err.constraint.includes('login_id')) {
      return res.status(400).json({ error: 'Login ID already exists. Please choose a unique one.' });
    }
    res.status(500).json({ error: 'Failed to create restaurant' });
  }
});

app.put('/api/admin/restaurants/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, address, cuisines, delivery_time, cost_for_two, is_veg_only, image_url, password, category_id, login_id, rating, reviews_count, latitude, longitude } = req.body;
    
    let query = 'UPDATE restaurants SET name=$1, address=$2, cuisines=$3, delivery_time=$4, cost_for_two=$5, is_veg_only=$6, image_url=$7, category_id=$8, login_id=$9, rating=$10, reviews_count=$11, latitude=$12, longitude=$13';
    let params = [name, address, cuisines, delivery_time, cost_for_two, is_veg_only, image_url, category_id, login_id || null, rating || 0, reviews_count || 0, latitude || null, longitude || null];
    
    if (password) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      query += ', password=$14, password_plain=$15 WHERE id=$16';
      params.push(hashedPassword, password, id);
    } else {
      query += ' WHERE id=$14';
      params.push(id);
    }
    
    console.log('[ADMIN] Updating restaurant:', { id, name, category_id, login_id, hasPassword: !!password });
    await db.pool.query(query, params);
    res.json({ success: true });
  } catch (err) {
    console.error('[ADMIN ERROR] Restaurant update failed:', err);
    if (err.code === '23505' && err.detail && err.detail.includes('login_id')) {
      return res.status(400).json({ error: 'Login ID already in use by another restaurant.' });
    }
    res.status(500).json({ error: 'Failed to update restaurant' });
  }
});

// Admin: Reorder Restaurants
app.put('/api/admin/restaurants/reorder', async (req, res) => {
  try {
    const { items } = req.body; // Expects [{ id: 1, display_order: 1 }, ...]
    await db.pool.query('BEGIN');
    
    for (const item of items) {
      await db.pool.query(
        'UPDATE restaurants SET display_order = $1 WHERE id = $2',
        [item.display_order, item.id]
      );
    }
    
    await db.pool.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await db.pool.query('ROLLBACK');
    console.error('Reorder failed:', err);
    res.status(500).json({ error: 'Failed to reorder restaurants' });
  }
});

// Admin: Soft Delete Restaurant
app.put('/api/admin/restaurants/:id/soft-delete', async (req, res) => {
  try {
    const { id } = req.params;
    await db.pool.query('UPDATE restaurants SET is_deleted = true, is_active = false WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to archive restaurant' });
  }
});

// Admin: Hard Delete Restaurant
app.delete('/api/admin/restaurants/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.pool.query('DELETE FROM restaurants WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    // 23503 is foreign_key_violation
    if (err.code === '23503') {
      return res.status(400).json({ error: 'Cannot hard delete: Restaurant has attached orders or dependencies. Use archive instead.' });
    }
    res.status(500).json({ error: 'Failed to delete restaurant' });
  }
});

// Admin: Categories Management
app.post('/api/admin/categories', async (req, res) => {
  try {
    const { name, image_url, veg_type } = req.body;
    console.log('[ADMIN] Creating category:', { name, image_url, veg_type });
    const result = await db.pool.query('INSERT INTO categories (name, image_url, veg_type) VALUES ($1, $2, $3) RETURNING id', [name, image_url, veg_type || 'both']);
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
    const { name, image_url, veg_type } = req.body;
    console.log('[ADMIN] Updating category:', { id, name, image_url, veg_type });
    await db.pool.query('UPDATE categories SET name = $1, image_url = $2, veg_type = $3 WHERE id = $4', [name, image_url, veg_type || 'both', id]);
    res.json({ success: true });
  } catch (err) {
    console.error('[ADMIN ERROR] Category update failed:', err);
    res.status(500).json({ error: 'Failed to update category' });
  }
});


// Admin: Driver Management
app.get('/api/admin/drivers', async (req, res) => {
  try {
    const result = await db.pool.query("SELECT id, name, phone, created_at, is_online, latitude, longitude, password_plain FROM drivers ORDER BY created_at DESC");
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
      'INSERT INTO drivers (name, phone, password, password_plain) VALUES ($1, $2, $3, $4) RETURNING id',
      [name, phone, hashedPassword, password]
    );
    res.json({ success: true, id: result.rows[0].id });
  } catch (err) {
    console.error('[ADMIN ERROR] Driver creation failed:', err);
    if (err.code === '23505') {
      res.status(400).json({ error: 'Phone number already registered' });
    } else {
      res.status(500).json({ error: 'Failed to create driver' });
    }
  }
});

app.put('/api/admin/drivers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, password } = req.body;
    let query = 'UPDATE drivers SET name=$1, phone=$2';
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
    console.error(err);
    res.status(500).json({ error: 'Failed to update driver' });
  }
});

app.delete('/api/admin/drivers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.pool.query('DELETE FROM drivers WHERE id = $1', [id]);
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
    
    await db.pool.query('UPDATE drivers SET is_online = $1 WHERE id = $2', [is_online, driver_id]);
    res.json({ success: true, is_online });
  } catch (err) {
    console.error('[DRIVER ERROR] Failed to update status:', err);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

app.put('/api/driver/location', async (req, res) => {
  try {
    const { driver_id, latitude, longitude } = req.body;
    await db.pool.query(
      'UPDATE drivers SET latitude = $1, longitude = $2 WHERE id = $3',
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
      SELECT o.*, r.name as restaurant_name, u.name as user_name
      FROM orders o 
      JOIN restaurants r ON o.restaurant_id = r.id 
      JOIN users u ON o.user_id = u.id
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
    
    // Get the current driver and restaurant before nullifying
    const orderData = await db.pool.query('SELECT driver_id, restaurant_id FROM orders WHERE id = $1', [id]);
    if (orderData.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
    
    const { driver_id: rejectingDriverId, restaurant_id } = orderData.rows[0];

    if (rejectingDriverId) {
      await db.pool.query(
        'UPDATE orders SET driver_id = NULL, is_driver_accepted = false, rejected_by = array_append(rejected_by, $1) WHERE id = $2',
        [rejectingDriverId, id]
      );
    } else {
      await db.pool.query(
        'UPDATE orders SET driver_id = NULL, is_driver_accepted = false WHERE id = $1',
        [id]
      );
    }
    
    // Notify previous driver (they won't see it anymore)
    io.emit('status_updated', { order_id: id, status: 'Pending' }); 
    
    // Auto-assign to next eligible driver in rotation
    autoAssignDriver(id, restaurant_id);
    
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
    
    // Fetch order to get delivery fee and distance for commission calculation
    const orderData = await db.pool.query('SELECT * FROM orders WHERE id = $1', [order_id]);
    if (orderData.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
    
    const order = orderData.rows[0];
    if (order.status === 'Completed') return res.status(400).json({ error: 'Order already completed' });

    const fees = calculateOrderFees(parseFloat(order.distance || 0));
    const driverEarnings = fees.driverCommission;
    // Restaurant earnings = Total - Platform Commission - Delivery Fee
    const restaurantEarnings = order.total_amount - fees.platformCommission - fees.deliveryFee;

    await db.pool.query('BEGIN');

    // 1. Update Order Status and Earnings
    const result = await db.pool.query(
      'UPDATE orders SET status = \'Completed\', driver_earnings = $1, platform_commission = $2 WHERE id = $3 RETURNING *',
      [driverEarnings, fees.platformCommission, order_id]
    );

    // 2. Credit Driver Wallet
    await db.pool.query('UPDATE drivers SET wallet_balance = wallet_balance + $1 WHERE id = $2', [driverEarnings, order.driver_id]);

    // 3. Credit Restaurant Wallet
    await db.pool.query('UPDATE restaurants SET wallet_balance = wallet_balance + $1 WHERE id = $2', [restaurantEarnings, order.restaurant_id]);

    // 4. Handle Referral Logic (If it's user's first order)
    const orderCount = await db.pool.query('SELECT COUNT(*) FROM orders WHERE user_id = $1 AND status = \'Completed\'', [order.user_id]);
    if (parseInt(orderCount.rows[0].count) === 0) {
      const userRes = await db.pool.query('SELECT referred_by FROM users WHERE id = $1', [order.user_id]);
      const referrerId = userRes.rows[0]?.referred_by;
      if (referrerId) {
        // Credit referrer with 100 "Veg Coins"
        await db.pool.query('UPDATE users SET wallet_balance = wallet_balance + 100 WHERE id = $1', [referrerId]);
        console.log(`[REFERRAL] Credited 100 to user ${referrerId} for referring user ${order.user_id}`);
      }
    }

    await db.pool.query('COMMIT');

    const updatedOrder = result.rows[0];
    io.emit('status_updated', { order_id: updatedOrder.id, status: 'Completed' });

    res.json(updatedOrder);
  } catch (err) {
    await db.pool.query('ROLLBACK');
    console.error('[DELIVERY ERROR]', err);
    res.status(500).json({ error: 'Failed to complete delivery' });
  }
});

// --- SWIGGY CLONE API ROUTES ---
app.get('/api/restaurants', async (req, res) => {
  try {
    const { sort, category_id, is_veg, min_rating } = req.query;
    let queryText = `SELECT r.*, 
                     (SELECT image_url FROM menu_items m WHERE m.restaurant_id = r.id AND m.image_url IS NOT NULL LIMIT 1) as menu_image_url
                     FROM restaurants r WHERE r.is_deleted = false AND r.is_active = true`;
    const queryParams = [];

    if (category_id) {
      // Get category name for fuzzy matching in restaurant items
      const catRes = await db.pool.query('SELECT name FROM categories WHERE id = $1', [category_id]);
      const catName = catRes.rows.length > 0 ? catRes.rows[0].name : '';

      queryParams.push(category_id);
      queryParams.push(`%${catName}%`);
      // Filter restaurants that either belong to the category or have menu items matching name/category
      queryText += ` AND (r.category_id = $${queryParams.length - 1} OR EXISTS (SELECT 1 FROM menu_items m WHERE m.restaurant_id = r.id AND (m.category_id = $${queryParams.length - 1} OR m.name ILIKE $${queryParams.length})))`;
    }

    if (is_veg === 'true') {
       queryText += ' AND r.is_veg_only = TRUE';
    }

    if (min_rating) {
      queryParams.push(parseFloat(min_rating));
      queryText += ` AND rating >= $${queryParams.length}`;
    }

    // Sorting Logic
    let orderBy = [];
    if (sort === 'rating') {
      orderBy.push('rating DESC NULLS LAST, display_order ASC');
    } else if (sort === 'cost_asc' || sort === 'cost') {
      orderBy.push('cost_for_two ASC, display_order ASC');
    } else if (sort === 'cost_desc') {
      orderBy.push('cost_for_two DESC, display_order ASC');
    } else if (sort === 'time') {
      // Extract the first number from '30-35 mins' for proper numeric sorting
      orderBy.push("NULLIF(regexp_replace(delivery_time, '[^0-9].*', '', 'g'), '')::INT ASC, display_order ASC");
    } else {
      orderBy.push('display_order ASC, r.id ASC');
    }

    queryText += ' ORDER BY ' + orderBy.join(', ');

    const result = await db.pool.query(queryText, queryParams);
    const rows = result.rows.map(r => ({
      ...r,
      image_url: r.menu_image_url ? getUploadUrl(req, r.menu_image_url) : (r.image_url ? getUploadUrl(req, r.image_url) : null)
    }));
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error fetching restaurants' });
  }
});

app.get('/api/categories', async (req, res) => {
  try {
    const { is_veg } = req.query;
    let queryText = 'SELECT * FROM categories';
    if (is_veg === 'true') {
      queryText += " WHERE LOWER(veg_type) != 'non-veg'";
    }
    const result = await db.pool.query(queryText);
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
    const result = await db.pool.query(`
      SELECT r.*, 
             (SELECT image_url FROM menu_items m WHERE m.restaurant_id = r.id AND m.image_url IS NOT NULL LIMIT 1) as menu_image_url
      FROM restaurants r WHERE r.id = $1
    `, [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Restaurant not found' });
    
    const r = result.rows[0];
    r.image_url = r.menu_image_url ? getUploadUrl(req, r.menu_image_url) : (r.image_url ? getUploadUrl(req, r.image_url) : null);
    res.json(r);
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

// Haversine distance calculation (returns km)
const haversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// Fee and Commission Calculation Logic
const calculateOrderFees = (distance) => {
  const handlingFee = 9;
  let deliveryFee = 15;
  
  if (distance > 2) {
    deliveryFee += Math.ceil(distance - 2) * 9;
  }
  
  // New Progressive Admin Commission Logic:
  // Till 3km: Admin gets 0
  // 4km: Admin gets 3 (Total 33, Driver 30)
  // 5km: Admin gets 4 (Total 42, Driver 38)
  // 6km: Admin gets 5 (Total 51, Driver 46)
  // Formula: Math.floor(distance) - 1 for distance >= 4
  
  const adminDeliveryCut = (distance >= 4) ? (Math.floor(distance) - 1) : 0;
  const driverEarnings = deliveryFee - adminDeliveryCut;
  const platformCommission = handlingFee + adminDeliveryCut;
  
  return {
    distance: parseFloat(distance.toFixed(2)),
    handlingFee,
    deliveryFee,
    driverCommission: driverEarnings, // Renaming internally for clarity
    driverEarnings, 
    platformCommission
  };
};

app.get('/api/orders/calculate-fee', async (req, res) => {
  try {
    const { restaurant_id, latitude, longitude } = req.query;
    console.log(`[FEE_CALC] Request: rest=${restaurant_id}, lat=${latitude}, lng=${longitude}`);

    if (!restaurant_id || !latitude || !longitude) {
      console.log('[FEE_CALC] Error: Missing parameters');
      return res.status(400).json({ error: 'Missing parameters' });
    }

    const restResult = await db.pool.query('SELECT name, latitude, longitude FROM restaurants WHERE id = $1', [restaurant_id]);
    if (restResult.rows.length === 0) {
      console.log(`[FEE_CALC] Error: Restaurant ${restaurant_id} not found`);
      return res.status(404).json({ error: 'Restaurant not found' });
    }
    
    const restName = restResult.rows[0].name;
    const restLat = parseFloat(restResult.rows[0].latitude);
    const restLng = parseFloat(restResult.rows[0].longitude);
    const userLat = parseFloat(latitude);
    const userLng = parseFloat(longitude);

    console.log(`[FEE_CALC] Data: Restaurant="${restName}" (${restLat}, ${restLng}), User=(${userLat}, ${userLng})`);

    if (isNaN(restLat) || isNaN(restLng) || isNaN(userLat) || isNaN(userLng)) {
      console.log('[FEE_CALC] Error: Invalid coordinates (NaN)');
      return res.status(400).json({ error: 'Invalid coordinates' });
    }

    const distance = haversineDistance(restLat, restLng, userLat, userLng);
    const fees = calculateOrderFees(distance);
    
    console.log(`[FEE_CALC] Success: Distance=${distance.toFixed(2)} km, Fee=₹${fees.deliveryFee}`);
    res.json(fees);
  } catch (err) {
    console.error('[FEE_CALC] Critical error:', err);
    res.status(500).json({ error: 'Failed to calculate fees' });
  }
});

// Auto-assign order to nearest available online driver within 10 km, using rotation (longest waiting)
const autoAssignDriver = async (orderId, restaurantId) => {
  try {
    // Get restaurant coordinates
    const restResult = await db.pool.query('SELECT latitude, longitude FROM restaurants WHERE id = $1', [restaurantId]);
    if (restResult.rows.length === 0) return null;
    const restLat = parseFloat(restResult.rows[0].latitude);
    const restLng = parseFloat(restResult.rows[0].longitude);
    if (isNaN(restLat) || isNaN(restLng)) {
      console.log('[AUTO-ASSIGN] Restaurant has no coordinates, skipping auto-assign');
      return null;
    }

    // Get excluded drivers (who rejected)
    const orderResult = await db.pool.query('SELECT rejected_by FROM orders WHERE id = $1', [orderId]);
    const rejectedBy = orderResult.rows.length > 0 ? (orderResult.rows[0].rejected_by || []) : [];

    // Get online drivers with coordinates who are NOT currently assigned to ANY active order
    const driversResult = await db.pool.query(`
      SELECT 
        d.id, d.name, d.latitude, d.longitude,
        (SELECT MAX(created_at) FROM orders o2 WHERE o2.driver_id = d.id AND o2.status = 'Completed') as last_assigned
      FROM drivers d
      WHERE d.is_online = true
        AND d.latitude IS NOT NULL AND d.latitude != ''
        AND d.longitude IS NOT NULL AND d.longitude != ''
        AND d.id NOT IN (
          SELECT COALESCE(o.driver_id, 0) FROM orders o 
          WHERE o.driver_id IS NOT NULL 
            AND o.status NOT IN ('Completed', 'Cancelled', 'Driver Rejected')
        )
    `);

    const availableDrivers = driversResult.rows.filter(d => !rejectedBy.includes(d.id));
    console.log(`[AUTO-ASSIGN] Found ${availableDrivers.length} available online drivers`);

    if (availableDrivers.length === 0) {
      console.log('[AUTO-ASSIGN] No available online drivers found');
      return null;
    }

    // Filter by distance (10km)
    let eligibleDrivers = [];
    for (const driver of availableDrivers) {
      const dLat = parseFloat(driver.latitude);
      const dLng = parseFloat(driver.longitude);
      if (isNaN(dLat) || isNaN(dLng)) continue;

      const dist = haversineDistance(restLat, restLng, dLat, dLng);
      if (dist <= 50) { // Increased to 50km for better demo/coverage
        eligibleDrivers.push({
          ...driver,
          distance: dist,
          last_assigned_time: driver.last_assigned ? new Date(driver.last_assigned).getTime() : 0
        });
      }
    }

    if (eligibleDrivers.length > 0) {
      // Rotation: Sort primarily by last_assigned_time (older first), secondary by distance
      eligibleDrivers.sort((a, b) => {
        if (a.last_assigned_time !== b.last_assigned_time) {
          return a.last_assigned_time - b.last_assigned_time;
        }
        return a.distance - b.distance;
      });

      const closestDriver = eligibleDrivers[0];

      await db.pool.query(
        'UPDATE orders SET driver_id = $1, is_driver_accepted = false WHERE id = $2',
        [closestDriver.id, orderId]
      );
      console.log(`[AUTO-ASSIGN] ✅ Assigned driver ${closestDriver.name} (${closestDriver.distance.toFixed(2)} km) to order #${orderId}`);
      
      // Notify via socket, avoid overriding status to something the frontend Stepper can't read
      io.emit('driver_order_assigned', { driver_id: closestDriver.id, order_id: orderId });
      
      return closestDriver;
    } else {
      console.log('[AUTO-ASSIGN] No drivers within 10 km radius');
      return null;
    }
  } catch (err) {
    console.error('[AUTO-ASSIGN ERROR]', err);
    return null;
  }
};

app.post('/api/payment/create-order', async (req, res) => {
  try {
    const { amount, currency = 'INR' } = req.body;
    
    const options = {
      amount: amount * 100, // Razorpay expects amount in paise
      currency,
      receipt: `receipt_order_${Date.now()}`
    };

    const order = await razorpay.orders.create(options);
    console.log('[RAZORPAY] Order created:', order.id);
    res.json(order);
  } catch (err) {
    console.error('[RAZORPAY ERROR] Failed to create order:', err);
    res.status(500).json({ error: 'Failed to create Razorpay order' });
  }
});

app.post('/api/payment/verify', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
    hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
    const generated_signature = hmac.digest('hex');

    if (generated_signature === razorpay_signature) {
      console.log('[RAZORPAY] Payment verified:', razorpay_payment_id);
      res.json({ success: true, message: 'Payment verified successfully' });
    } else {
      console.warn('[RAZORPAY] Signature mismatch for order:', razorpay_order_id);
      res.status(400).json({ success: false, message: 'Invalid signature' });
    }
  } catch (err) {
    console.error('[RAZORPAY ERROR] Verification failed:', err);
    res.status(500).json({ error: 'Verification failed' });
  }
});

app.post('/api/orders', async (req, res) => {
  try {
    const { 
      user_id, restaurant_id, total_amount, items, delivery_address, customer_name, latitude, longitude,
      secondary_contact_name, secondary_contact_phone, subtotal 
    } = req.body;
    
    // Explicitly parse coordinates as numbers to avoid null/string conversion issues in DB
    const lat = latitude !== null && latitude !== undefined ? Number(latitude) : null;
    const lng = longitude !== null && longitude !== undefined ? Number(longitude) : null;

    console.log(`[ORDER] Creating for user ${user_id} at ${lat}, ${lng}`);
    
    // Start transaction
    await db.pool.query('BEGIN');
    
    // Calculate distance and fees
    const restResult = await db.pool.query('SELECT latitude, longitude FROM restaurants WHERE id = $1', [restaurant_id]);
    let distance = 0;
    let fees = { handlingFee: 9, deliveryFee: 40, driverCommission: 30, platformCommission: 19 }; // Defaults

    if (restResult.rows.length > 0 && lat !== null && lng !== null) {
      const restLat = parseFloat(restResult.rows[0].latitude);
      const restLng = parseFloat(restResult.rows[0].longitude);
      if (!isNaN(restLat) && !isNaN(restLng)) {
        distance = haversineDistance(restLat, restLng, lat, lng);
        fees = calculateOrderFees(distance);
      }
    }

    // Apply Free Delivery/Handling offer if subtotal > 1000
    // Apply 20% Delivery Discount if subtotal > 700
    // Driver still gets paid their full commission, admin absorbs the cost.
    const isFree = subtotal > 1000;
    const hasDiscount = subtotal > 700 && !isFree;
    const finalDeliveryFee = isFree ? 0 : (hasDiscount ? Math.round(fees.deliveryFee * 0.8) : fees.deliveryFee);
    const finalHandlingFee = isFree ? 0 : fees.handlingFee;
    
    // Insert Order with snapshotted address, name, coordinates, landmark and fees
    const orderResult = await db.pool.query(
      `INSERT INTO orders 
       (user_id, restaurant_id, total_amount, delivery_address, customer_name, latitude, longitude, landmark, 
        distance, delivery_fee, handling_fee, platform_commission, driver_earnings, payment_method, payment_id,
        secondary_contact_name, secondary_contact_phone) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17) RETURNING id`,
      [user_id, restaurant_id, total_amount, delivery_address, customer_name, lat, lng, req.body.landmark || null,
       fees.distance || distance, finalDeliveryFee, finalHandlingFee, fees.platformCommission, fees.driverCommission || fees.driverEarnings || 0,
       req.body.payment_method || 'COD', req.body.payment_id || null,
       secondary_contact_name || null, secondary_contact_phone || null]
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
    
    // Auto-assign nearest available driver (non-blocking)
    autoAssignDriver(orderId, restaurant_id);
    
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
    
    // Check if customer exists
    const userExists = await db.pool.query('SELECT * FROM users WHERE phone = $1', [phone]);
    if (userExists.rows.length > 0) return res.status(400).json({ error: 'Account already exists' });

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await db.pool.query(
      'INSERT INTO users (name, phone, address, password) VALUES ($1, $2, $3, $4) RETURNING id, name, phone, address',
      [name, phone, address, hashedPassword]
    );

    const user = newUser.rows[0];
    const token = jwt.sign({ id: user.id, role: 'customer' }, JWT_SECRET, { expiresIn: '7d' });

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
    if (userResult.rows.length === 0) return res.status(400).json({ error: 'Account not found' });

    const user = userResult.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, role: 'customer' }, JWT_SECRET, { expiresIn: '7d' });
    
    delete user.password;
    res.json({ token, user });
  } catch (err) {
    console.error('Login failed:', err);
    res.status(500).json({ error: 'Failed to login' });
  }
});

app.post('/api/auth/phone-login', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'Phone number required' });

    // Clean phone number (strip +91 and spaces)
    const cleanPhone = phone.replace('+91', '').replace(/\s/g, '').trim();

    // Check if user exists
    let result = await db.pool.query('SELECT * FROM users WHERE phone = $1', [cleanPhone]);
    let user;

    if (result.rows.length === 0) {
      // Auto-register new user
      const insertResult = await db.pool.query(
        'INSERT INTO users (name, phone, address) VALUES ($1, $2, $3) RETURNING *',
        ['New Customer', cleanPhone, '']
      );
      user = insertResult.rows[0];
      console.log('[AUTH] New user auto-registered via phone:', cleanPhone);
    } else {
      user = result.rows[0];
    }

    const token = jwt.sign({ id: user.id, role: 'customer' }, JWT_SECRET, { expiresIn: '30d' });
    delete user.password;
    
    res.json({ token, user });
  } catch (err) {
    console.error('[AUTH ERROR] Phone login failed:', err);
    res.status(500).json({ error: 'Server error during phone login' });
  }
});

// --- NEW ISOLATED AUTH ENDPOINTS ---

app.post('/api/driver/login', async (req, res) => {
  try {
    const { phone, password } = req.body;
    const result = await db.pool.query('SELECT * FROM drivers WHERE phone = $1', [phone]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Driver account not found' });

    const driver = result.rows[0];
    const isMatch = await bcrypt.compare(password, driver.password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid phone or password' });

    const token = jwt.sign({ id: driver.id, role: 'driver' }, JWT_SECRET, { expiresIn: '30d' });
    delete driver.password;
    res.json({ token, user: driver });
  } catch (err) {
    console.error('Driver login error:', err);
    res.status(500).json({ error: 'Server error during login' });
  }
});

app.post('/api/admin/login', async (req, res) => {
  try {
    const { phone, password } = req.body;
    const result = await db.pool.query('SELECT * FROM admins WHERE phone = $1', [phone]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Admin account not found' });

    const admin = result.rows[0];
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid phone or password' });

    const token = jwt.sign({ id: admin.id, role: 'admin' }, JWT_SECRET, { expiresIn: '30d' });
    delete admin.password;
    res.json({ token, user: admin });
  } catch (err) {
    console.error('Admin login error:', err);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// --- VENDOR AUTH ROUTES ---
app.post('/api/vendor/login', async (req, res) => {
  try {
    const { restaurant_id, login_id, password } = req.body;
    if ((!restaurant_id && !login_id) || !password) return res.status(400).json({ error: 'Missing credentials' });

    let result;
    if (login_id) {
      // Login via login_id (string username)
      result = await db.pool.query('SELECT * FROM restaurants WHERE login_id = $1', [login_id.trim()]);
    } else {
      // Login via numeric restaurant_id (legacy)
      result = await db.pool.query('SELECT * FROM restaurants WHERE id = $1', [parseInt(restaurant_id)]);
    }
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: login_id ? 'Login ID not found' : 'Restaurant ID not found' });
    }

    const restaurant = result.rows[0];
    
    const validPassword = await bcrypt.compare(password, restaurant.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    const token = jwt.sign(
      { restaurant_id: restaurant.id },
      JWT_SECRET,
      { expiresIn: '365d' }
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
    const words = q.trim().split(/\s+/);
    const searchParam = `%${words.join('%')}%`; // Allows "chi bri" to match "chicken briyani"
    
    // Search restaurants by name (fuzzy + partial)
    const restResult = await db.pool.query(
      `SELECT r.*,
             (SELECT image_url FROM menu_items mi WHERE mi.restaurant_id = r.id AND mi.image_url IS NOT NULL LIMIT 1) as menu_image_url
       FROM restaurants r 
       WHERE r.name ILIKE $1 
          OR similarity(r.name, $2) > 0.1
          OR word_similarity($2, r.name) > 0.1
       ORDER BY 
          CASE WHEN r.name ILIKE $1 THEN 1 ELSE 0 END DESC,
          GREATEST(similarity(r.name, $2), word_similarity($2, r.name)) DESC`,
      [searchParam, q]
    );

    // Search menu items by name, returning the joined restaurant info (fuzzy + partial)
    const itemResult = await db.pool.query(
      `SELECT m.*, r.name as restaurant_name 
       FROM menu_items m 
       JOIN restaurants r ON m.restaurant_id = r.id 
       WHERE m.name ILIKE $1 
          OR similarity(m.name, $2) > 0.1
          OR word_similarity($2, m.name) > 0.1
       ORDER BY 
          CASE WHEN m.name ILIKE $1 THEN 1 ELSE 0 END DESC,
          GREATEST(similarity(m.name, $2), word_similarity($2, m.name)) DESC`,
      [searchParam, q]
    );

    res.json({
      restaurants: restResult.rows.map(r => ({
        ...r,
        image_url: r.menu_image_url ? getUploadUrl(req, r.menu_image_url) : (r.image_url ? getUploadUrl(req, r.image_url) : null)
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
        d.longitude as driver_lng,
        u.phone as customer_phone
      FROM orders o
      JOIN restaurants r ON o.restaurant_id = r.id
      LEFT JOIN drivers d ON o.driver_id = d.id
      LEFT JOIN users u ON o.user_id = u.id
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
      `SELECT r.*,
             (SELECT image_url FROM menu_items m WHERE m.restaurant_id = r.id AND m.image_url IS NOT NULL LIMIT 1) as menu_image_url
       FROM restaurants r 
       JOIN favorites f ON r.id = f.restaurant_id 
       WHERE f.user_id = $1`, 
      [user_id]
    );
    const restaurants = result.rows.map(r => ({
      ...r,
      image_url: r.menu_image_url ? getUploadUrl(req, r.menu_image_url) : (r.image_url ? getUploadUrl(req, r.image_url) : null)
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

app.put('/api/admin/menu-items/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, is_veg, category_id, image_url } = req.body;
    await db.pool.query(
      'UPDATE menu_items SET name = $1, description = $2, price = $3, is_veg = $4, category_id = $5, image_url = $6 WHERE id = $7',
      [name, description, price, is_veg, category_id || null, image_url || null, id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update menu item' });
  }
});

app.put('/api/admin/menu-items/:id/availability', async (req, res) => {
  try {
    const { id } = req.params;
    const { is_available } = req.body;
    await db.pool.query('UPDATE menu_items SET is_available = $1 WHERE id = $2', [is_available, id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update availability' });
  }
});

app.delete('/api/admin/menu-items/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.pool.query('DELETE FROM menu_items WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete menu item' });
  }
});


app.put('/api/vendor/:id/veg-status', async (req, res) => {
  try {
    const { id } = req.params;
    const { is_veg_only } = req.body;
    await db.pool.query('UPDATE restaurants SET is_veg_only = $1 WHERE id = $2', [is_veg_only, id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update veg status' });
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

// --- PHASE 2 & 3: WALLETS, CHAT & SUBSCRIPTIONS ---

// 1. Payout Requests
app.post('/api/payouts/request', async (req, res) => {
  try {
    const { user_type, user_id, amount } = req.body;
    
    // Check balance
    let balanceRes;
    if (user_type === 'driver') {
      balanceRes = await db.pool.query('SELECT wallet_balance FROM drivers WHERE id = $1', [user_id]);
    } else {
      balanceRes = await db.pool.query('SELECT wallet_balance FROM restaurants WHERE id = $1', [user_id]);
    }

    if (balanceRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const balance = parseFloat(balanceRes.rows[0].wallet_balance);

    if (amount > balance) return res.status(400).json({ error: 'Insufficient balance' });

    // Create request with 'pending' status
    await db.pool.query(
      'INSERT INTO payout_requests (user_type, user_id, amount, status) VALUES ($1, $2, $3, $4)',
      [user_type, user_id, amount, 'pending']
    );

    await db.pool.query('COMMIT');
    res.json({ success: true, message: 'Payout request submitted successfully' });
  } catch (err) {
    await db.pool.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to submit payout request' });
  }
});

// Admin: Get all payout requests
app.get('/api/admin/payouts', async (req, res) => {
  try {
    const result = await db.pool.query(`
      SELECT p.*, 
             CASE WHEN p.user_type = 'driver' THEN d.name ELSE r.name END as user_name,
             CASE WHEN p.user_type = 'driver' THEN d.phone ELSE r.phone END as user_phone
      FROM payout_requests p
      LEFT JOIN drivers d ON p.user_type = 'driver' AND p.user_id = d.id
      LEFT JOIN restaurants r ON p.user_type = 'restaurant' AND p.user_id = r.id
      ORDER BY p.requested_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch payout requests' });
  }
});

// Admin: Approve Payout
app.put('/api/admin/payouts/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    await db.pool.query('BEGIN');

    // Get request details
    const requestRes = await db.pool.query('SELECT * FROM payout_requests WHERE id = $1', [id]);
    if (requestRes.rows.length === 0) {
      await db.pool.query('ROLLBACK');
      return res.status(404).json({ error: 'Request not found' });
    }

    const request = requestRes.rows[0];
    if (request.status !== 'pending') {
      await db.pool.query('ROLLBACK');
      return res.status(400).json({ error: 'Request already processed' });
    }

    // Deduct from wallet now
    if (request.user_type === 'driver') {
      await db.pool.query('UPDATE drivers SET wallet_balance = wallet_balance - $1 WHERE id = $2', [request.amount, request.user_id]);
    } else {
      await db.pool.query('UPDATE restaurants SET wallet_balance = wallet_balance - $1 WHERE id = $2', [request.amount, request.user_id]);
    }

    // Update status
    await db.pool.query(
      'UPDATE payout_requests SET status = $1, processed_at = NOW() WHERE id = $2',
      ['approved', id]
    );

    await db.pool.query('COMMIT');
    res.json({ success: true, message: 'Payout approved and deducted' });
  } catch (err) {
    await db.pool.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to approve payout' });
  }
});

// Admin: Reject Payout
app.put('/api/admin/payouts/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    await db.pool.query(
      "UPDATE payout_requests SET status = 'rejected', processed_at = NOW() WHERE id = $1",
      [id]
    );
    res.json({ success: true, message: 'Payout rejected' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to reject payout' });
  }
});
app.post('/api/messages', async (req, res) => {
  try {
    const { order_id, sender_type, sender_id, message } = req.body;
    const result = await db.pool.query(
      'INSERT INTO messages (order_id, sender_type, sender_id, message) VALUES ($1, $2, $3, $4) RETURNING *',
      [order_id, sender_type, sender_id, message]
    );
    
    // Broadcast to room
    io.to(`order_${order_id}`).emit('new_message', result.rows[0]);
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

app.get('/api/orders/:id/messages', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.pool.query('SELECT * FROM messages WHERE order_id = $1 ORDER BY created_at ASC', [id]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// 3. Subscriptions
app.post('/api/subscriptions/purchase', async (req, res) => {
  try {
    const { user_id, plan_name, price, duration_days } = req.body;
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + duration_days);

    const result = await db.pool.query(
      'INSERT INTO subscriptions (user_id, plan_name, price, end_date) VALUES ($1, $2, $3, $4) RETURNING *',
      [user_id, plan_name, price, endDate]
    );
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to purchase subscription' });
  }
});

// 4. Referral / Wallet Info
app.get('/api/user/:id/wallet', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.pool.query('SELECT wallet_balance, referral_code FROM users WHERE id = $1', [id]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch wallet info' });
  }
});

app.get('/api/driver/:id/wallet', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.pool.query('SELECT wallet_balance FROM drivers WHERE id = $1', [id]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch driver wallet' });
  }
});

app.get('/api/vendor/:id/wallet', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.pool.query('SELECT wallet_balance FROM restaurants WHERE id = $1', [id]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch vendor wallet' });
  }
});

// Start the server
http.listen(PORT, '0.0.0.0', () => {
  console.log(`Server (with Socket.io) is running on http://0.0.0.0:${PORT}`);
});
