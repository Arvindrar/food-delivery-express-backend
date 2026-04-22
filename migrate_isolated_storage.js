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

async function migrate() {
  try {
    console.log('--- STARTING MIGRATION: ISOLATED STORAGE ---');

    // 1. Create Drivers Table
    console.log('Creating "drivers" table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS drivers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        password_plain VARCHAR(255),
        is_online BOOLEAN DEFAULT FALSE,
        latitude VARCHAR(255),
        longitude VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Create Admins Table
    console.log('Creating "admins" table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 3. Migrate Existing Drivers
    console.log('Migrating existing drivers from "users"...');
    await pool.query(`
      INSERT INTO drivers (id, name, phone, password, password_plain, is_online, latitude, longitude, created_at)
      SELECT id, name, phone, password, password_plain, is_online, latitude, longitude, created_at
      FROM users WHERE is_driver = TRUE
      ON CONFLICT (id) DO NOTHING
    `);
    // Sync sequence
    await pool.query("SELECT setval('drivers_id_seq', COALESCE((SELECT MAX(id) FROM drivers), 1))");

    // 4. Migrate Existing Admins
    console.log('Migrating existing admins from "users"...');
    await pool.query(`
      INSERT INTO admins (id, name, phone, password, created_at)
      SELECT id, name, phone, password, created_at
      FROM users WHERE is_admin = TRUE
      ON CONFLICT (id) DO NOTHING
    `);
    // Sync sequence
    await pool.query("SELECT setval('admins_id_seq', COALESCE((SELECT MAX(id) FROM admins), 1))");

    // 5. Clean up Users table
    console.log('Standardizing "users" table as dedicated "customers"...');
    
    // We keep users who are ONLY customers. 
    // If a user was a driver/admin, they are now in the new tables.
    // For safety, we only delete them from 'users' if they are NOT intended to be customers too.
    // The user wants separation, so we remove the roles from 'users' records.
    await pool.query('DELETE FROM users WHERE is_driver = TRUE OR is_admin = TRUE');

    // Drop role columns from users
    await pool.query('ALTER TABLE users DROP COLUMN IF EXISTS is_driver');
    await pool.query('ALTER TABLE users DROP COLUMN IF EXISTS is_admin');
    await pool.query('ALTER TABLE users DROP COLUMN IF EXISTS password_plain');
    await pool.query('ALTER TABLE users DROP COLUMN IF EXISTS is_online');
    await pool.query('ALTER TABLE users DROP COLUMN IF EXISTS latitude');
    await pool.query('ALTER TABLE users DROP COLUMN IF EXISTS longitude');

    console.log('--- MIGRATION COMPLETE ---');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await pool.end();
  }
}

migrate();
