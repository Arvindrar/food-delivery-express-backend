const fetch = require('node-fetch');

async function testAdminAPI() {
  try {
    const res = await fetch('http://localhost:5000/api/admin/restaurants');
    const data = await res.json();
    console.log('Status:', res.status);
    console.log('Data:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Fetch error:', err.message);
  }
}

testAdminAPI();
