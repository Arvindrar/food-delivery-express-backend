const http = require('http');

const postData = JSON.stringify({
  name: 'Rupen Test',
  phone: '3333333333',
  password: 'testpassword'
});

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/admin/drivers',
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
    console.log('--- CREATE DRIVER RESPONSE ---');
    console.log('Status:', res.statusCode);
    console.log('Body:', data);
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.write(postData);
req.end();
