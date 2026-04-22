const db = require('../config/db');
const bcrypt = require('bcryptjs');

async function setupAdmin() {
  try {
    const phone = '8838374152';
    const pass = '123';
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(pass, salt);

    // Check if table exists
    await db.pool.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255),
        phone VARCHAR(20) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Check if admin exists
    const exists = await db.pool.query('SELECT * FROM admins WHERE phone = $1', [phone]);
    if (exists.rows.length > 0) {
      await db.pool.query('UPDATE admins SET password = $1 WHERE phone = $2', [hashed, phone]);
      console.log('Admin password updated');
    } else {
      await db.pool.query('INSERT INTO admins (name, phone, password) VALUES ($1, $2, $3)', ['Platform Admin', phone, hashed]);
      console.log('Admin account created');
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

setupAdmin();
