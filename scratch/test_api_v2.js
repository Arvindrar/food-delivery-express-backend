const http = require('http');

http.get('http://localhost:5000/api/admin/stats', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('--- API RESPONSE ---');
    console.log(data);
    try {
        const json = JSON.parse(data);
        console.log('\n--- FORMATTED ---');
        console.log(JSON.stringify(json, null, 2));
    } catch(e) {
        console.log('\nCould not parse JSON');
    }
  });
}).on('error', (err) => {
  console.log('Error: ' + err.message);
});
