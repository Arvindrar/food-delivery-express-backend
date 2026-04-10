const http = require('http');

const postData = JSON.stringify({
  user_id: 1,
  label: 'Home',
  address_text: 'Test Schema Address',
  is_default: true,
  latitude: '10.123',
  longitude: '78.456',
  landmark: 'Near Test'
});

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/user/addresses',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': postData.length
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('--- CREATE ADDRESS RESPONSE ---');
    console.log('Status:', res.statusCode);
    console.log('Body:', data);
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.write(postData);
req.end();
