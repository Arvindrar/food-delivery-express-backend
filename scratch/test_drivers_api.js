const http = require('http');

http.get('http://localhost:5000/api/admin/drivers', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('--- DRIVERS API RESPONSE ---');
    try {
        const json = JSON.parse(data);
        console.log(JSON.stringify(json, null, 2));
    } catch(e) {
        console.log('Raw:', data);
    }
  });
}).on('error', (err) => {
  console.log('Error: ' + err.message);
});
