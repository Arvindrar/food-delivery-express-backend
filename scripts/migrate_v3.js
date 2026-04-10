const db = require('../config/db');

const migrate = async () => {
  try {
    console.log('🚀 Adding address column to restaurants...');
    
    await db.pool.query(`
      ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS address TEXT;
    `);

    console.log('✅ Column added. Updating default addresses for Karaikudi restaurants...');

    const addresses = {
      'Sri Meyyappa Chettinad': 'Alagappapuram, Karaikudi, Tamil Nadu 630003',
      'Annapoorna Veg': 'Sekkalai Rd, Sekkalai, Karaikudi, Tamil Nadu 630001',
      'Karaikudi Annalakshmi': 'College Rd, Alagappapuram, Karaikudi, Tamil Nadu 630003',
      'Buhari Hotel': 'Subramaniapuram, Karaikudi, Tamil Nadu 630002'
    };

    for (const [name, addr] of Object.entries(addresses)) {
      await db.pool.query('UPDATE restaurants SET address = $1 WHERE name = $2', [addr, name]);
    }

    console.log('🎉 Migration successful!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
};

migrate();
