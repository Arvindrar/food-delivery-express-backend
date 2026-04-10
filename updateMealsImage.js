const db = require('./config/db.js');

async function updateCategory() {
  try {
    const res = await db.query("UPDATE categories SET image_url = '/uploads/meals.png' WHERE name ILIKE '%meal%' RETURNING *");
    console.log("Updated categories:", res.rows);
  } catch (err) {
    console.error("Error updating categories:", err);
  } finally {
    process.exit(0);
  }
}

updateCategory();
