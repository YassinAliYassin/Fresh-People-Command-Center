import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Init table
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS staff (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT,
      role TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

export default async function handler(req, res) {
  await initDB();
  
  if (req.method === 'GET') {
    const { rows } = await pool.query('SELECT * FROM staff ORDER BY name ASC');
    return res.json({ staff: rows });
  }
  
  if (req.method === 'POST') {
    // Admin auth check for write operations
    const authHeader = req.headers.authorization;
    const adminSecret = process.env.ADMIN_SECRET;
    if (!adminSecret || authHeader !== `Bearer ${adminSecret}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { name, phone, role } = req.body;
    const { rows } = await pool.query(
      'INSERT INTO staff (name, phone, role) VALUES ($1, $2, $3) RETURNING *',
      [name, phone, role]
    );
    return res.json({ staff: rows[0], message: 'Staff added successfully' });
  }
  
  res.status(405).json({ error: 'Method not allowed' });
}
