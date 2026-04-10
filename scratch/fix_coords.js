const db = require('../config/db');

async function fixCoords() {
  try {
    console.log('Injecting mock coordinates for distance testing...');
    
    // Restaurant location (Karaikudi area based on previous logs)
    const restLat = '10.0748';
    const restLng = '78.7848';
    
    await db.pool.query('UPDATE restaurants SET latitude = $1, longitude = $2', [restLat, restLng]);
    
    // Driver 1: Arvind (Close to restaurant)
    await db.pool.query(
      'UPDATE users SET latitude = $1, longitude = $2 WHERE phone = \'8888888888\' AND is_driver = TRUE', 
      ['10.0848', '78.7948']
    );
    
    // Driver 2: Rupen (A bit further)
    await db.pool.query(
      'UPDATE users SET latitude = $1, longitude = $2 WHERE phone = \'8838374152\' AND is_driver = TRUE', 
      ['10.1048', '78.8148']
    );

    console.log('✅ Mock coordinates injected successfully.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to inject coordinates:', err);
    process.exit(1);
  }
}

fixCoords();
