import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Init table with correct schema
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS staff (
      id SERIAL PRIMARY KEY,
      fullName TEXT NOT NULL,
      phone TEXT DEFAULT '',
      role TEXT DEFAULT '',
      rate REAL DEFAULT 0,
      notes TEXT DEFAULT ''
    )
  `);
}

export default async function handler(req, res) {
  await initDB();
  
  if (req.method === 'GET') {
    const { rows } = await pool.query('SELECT * FROM staff ORDER BY fullName ASC');
    return res.json({ staff: rows });
  }
  
  if (req.method === 'POST') {
    // Admin auth check
    const authHeader = req.headers.authorization;
    const adminSecret = process.env.ADMIN_SECRET;
    if (!adminSecret || authHeader !== `Bearer ${adminSecret}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const { fullName, phone, role, rate, notes } = req.body;
    const { rows } = await pool.query(
      'INSERT INTO staff (fullName, phone, role, rate, notes) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [fullName, phone || '', role || '', rate || 0, notes || '']
    );
    return res.json({ staff: rows[0], message: 'Staff added successfully' });
  }
  
  if (req.method === 'PATCH') {
    const authHeader = req.headers.authorization;
    const adminSecret = process.env.ADMIN_SECRET;
    if (!adminSecret || authHeader !== `Bearer ${adminSecret}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const { id, fullName, phone, role, rate, notes } = req.body;
    await pool.query(
      'UPDATE staff SET fullName=$1, phone=$2, role=$3, rate=$4, notes=$5 WHERE id=$6',
      [fullName, phone, role, rate, notes, id]
    );
    return res.json({ message: 'Staff updated successfully' });
  }
  
  if (req.method === 'DELETE') {
    const authHeader = req.headers.authorization;
    const adminSecret = process.env.ADMIN_SECRET;
    if (!adminSecret || authHeader !== `Bearer ${adminSecret}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const { id } = req.body;
    await pool.query('DELETE FROM staff WHERE id=$1', [id]);
    return res.json({ message: 'Staff deleted successfully' });
  }
  
  res.status(405).json({ error: 'Method not allowed' });
}
