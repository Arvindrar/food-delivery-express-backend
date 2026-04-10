const db = require('../config/db');

const seedDatabase = async () => {
  try {
    console.log('🔄 Starting Database Initialization...');

    // 1. Drop existing tables to refresh data
    await db.pool.query(`
      DROP TABLE IF EXISTS order_items;
      DROP TABLE IF EXISTS orders;
      DROP TABLE IF EXISTS menu_items;
      DROP TABLE IF EXISTS categories;
      DROP TABLE IF EXISTS restaurants;
      DROP TABLE IF EXISTS users;
    `);

    // 2. Create Core Tables for the Swiggy Clone
    await db.pool.query(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        phone VARCHAR(15) UNIQUE,
        address TEXT,
        password VARCHAR(255)
      );

      CREATE TABLE restaurants (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        image_url TEXT,
        address TEXT,
        rating DECIMAL(2,1),
        delivery_time VARCHAR(20),
        is_veg_only BOOLEAN DEFAULT FALSE,
        cost_for_two INTEGER
      );

      CREATE TABLE categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) NOT NULL,
        image_url TEXT
      );

      CREATE TABLE menu_items (
        id SERIAL PRIMARY KEY,
        restaurant_id INTEGER REFERENCES restaurants(id) ON DELETE CASCADE,
        category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        price INTEGER NOT NULL,
        is_veg BOOLEAN DEFAULT TRUE,
        image_url TEXT
      );

      CREATE TABLE orders (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        restaurant_id INTEGER REFERENCES restaurants(id) ON DELETE CASCADE,
        total_amount INTEGER NOT NULL,
        status VARCHAR(20) DEFAULT 'Pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE order_items (
        id SERIAL PRIMARY KEY,
        order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
        menu_item_id INTEGER REFERENCES menu_items(id),
        quantity INTEGER NOT NULL,
        price INTEGER NOT NULL
      );
    `);
    console.log('✅ Tables created successfully!');

    // 3. Insert specific Karaikudi Restaurant and Category Data!
    await db.pool.query(`
      INSERT INTO users (id, name, phone, address) VALUES
      (1, 'Swiggy Guest', '9876543210', 'Alagappapuram, Karaikudi');

      INSERT INTO categories (name, image_url) VALUES
      ('Biryani', 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=200'),
      ('Meals', 'https://images.unsplash.com/photo-1626776876729-ab4ea2da784e?w=200'),
      ('Dosa', 'https://images.unsplash.com/photo-1589301760014-d929f39ce9b1?w=200'),
      ('Chettinad', 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=200');

      INSERT INTO restaurants (name, image_url, rating, delivery_time, is_veg_only, cost_for_two) VALUES
      ('Sri Meyyappa Chettinad', 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400', 4.5, '30-35 mins', false, 400),
      ('Annapoorna Veg', 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400', 4.8, '20-25 mins', true, 200),
      ('Karaikudi Annalakshmi', 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400', 4.2, '40-45 mins', false, 350),
      ('Buhari Hotel', 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=400', 4.0, '25-30 mins', false, 300);

      INSERT INTO menu_items (restaurant_id, category_id, name, description, price, is_veg, image_url) VALUES
      (1, 1, 'Chettinad Chicken Biryani', 'Authentic spicy biryani cooked with seeraga samba rice', 220, false, 'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?w=200'),
      (1, 4, 'Pepper Chicken Dry', 'Spicy Chettinad pepper chicken roast', 180, false, null),
      (2, 3, 'Ghee Roast Dosa', 'Crispy dosa made with pure cow ghee', 80, true, 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=200'),
      (2, 2, 'South Indian Meals', 'Unlimited rice with sambar, rasam, kootu, poriyal', 120, true, 'https://images.unsplash.com/photo-1615486171448-4afd351993d0?w=200'),
      (3, 4, 'Mutton Chukka', 'Tender pieces of mutton cooked with traditional spices', 250, false, null);
    `);
    
    console.log('🍗 Populated database with local Karaikudi dummy data!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
