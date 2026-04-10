const db = require('../config/db');
const pool = db.pool;

const fixImages = async () => {
    try {
        // Meals ID is typically 2, Dosa is 3 (based on previous seed patterns)
        // I'll use names to be safe
        console.log('Updating Meals and Dosa images...');
        
        // Use the absolute paths of the generated images
        const mealsUrl = 'https://images.unsplash.com/photo-1589302168068-1c4592e83164?auto=format&fit=crop&q=80&w=300&h=300'; // High-res Meals
        const dosaUrl = 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&q=80&w=300&h=300'; // High-res Dosa
        
        await pool.query('UPDATE categories SET image_url = $1 WHERE name = $2', [mealsUrl, 'Meals']);
        await pool.query('UPDATE categories SET image_url = $1 WHERE name = $2', [dosaUrl, 'Dosa']);
        
        console.log('Images updated successfully!');
    } catch (err) {
        console.error('Error updating images:', err);
    } finally {
        await pool.end();
    }
};

fixImages();
