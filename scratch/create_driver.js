const db = require('../config/db');
const bcrypt = require('bcryptjs');

async function createDriver() {
  try {
    console.log('Creating driver...');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);
    
    await db.pool.query(
      `INSERT INTO users (name, phone, password, password_plain, is_driver) 
       VALUES ('Rupen', '8838374152', $1, 'password123', true)`,
      [hashedPassword]
    );
    console.log('Driver created successfully! You can now log in.');
    process.exit(0);
  } catch (err) {
    if (err.code === '23505') {
       console.log('Driver already exists. Try logging in!');
    } else {
       console.error('Error:', err);
    }
    process.exit(1);
  }
}

createDriver();
