export default async function handler(req, res) {
  try {
    const { Pool } = await import('pg');
    
    if (!process.env.DATABASE_URL) {
      return res.status(500).json({ error: 'DATABASE_URL not set' });
    }
    
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 1,
      idleTimeoutMillis: 100
    });
    
    // Create table if not exists and add missing columns
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS staff (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          phone TEXT DEFAULT '',
          role TEXT DEFAULT ''
        )
      `);
      
      // Add missing columns if they don't exist
      await pool.query(`
        ALTER TABLE staff ADD COLUMN IF NOT EXISTS rate REAL DEFAULT 0
      `);
      await pool.query(`
        ALTER TABLE staff ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT ''
      `);
    } catch (e) {
      console.log('Table creation note:', e.message);
    }
    
    if (req.method === 'GET') {
      const { rows } = await pool.query('SELECT * FROM staff ORDER BY name ASC');
      await pool.end();
      return res.json({ staff: rows });
    }
    
    if (req.method === 'POST') {
      const { name, phone, role, rate, notes } = req.body;
      const { rows } = await pool.query(
        'INSERT INTO staff (name, phone, role, rate, notes) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [name || '', phone || '', role || '', rate || 0, notes || '']
      );
      await pool.end();
      return res.json({ staff: rows[0], message: 'Staff added successfully' });
    }
    
    if (req.method === 'PATCH') {
      const { id, name, phone, role, rate, notes } = req.body;
      await pool.query(
        'UPDATE staff SET name=$1, phone=$2, role=$3, rate=$4, notes=$5 WHERE id=$6',
        [name, phone, role, rate, notes, id]
      );
      await pool.end();
      return res.json({ message: 'Staff updated successfully' });
    }
    
    if (req.method === 'DELETE') {
      const { id } = req.body;
      await pool.query('DELETE FROM staff WHERE id=$1', [id]);
      await pool.end();
      return res.json({ message: 'Staff deleted successfully' });
    }
    
    await pool.end();
    return res.status(405).json({ error: 'Method not allowed' });
    
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
}
