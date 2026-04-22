const { pool } = require('./config/db');

async function test() {
  try {
    const res = await pool.query(`
      SELECT 
        similarity('Biryani', 'Briyani') as sim,
        word_similarity('Briyani', 'Chicken Biryani') as wsim1,
        word_similarity('Briyani', 'Mutton Biryani') as wsim2
    `);
    console.log(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

test();
