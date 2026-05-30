import { Pool } from 'pg';

// Create pool inside handler to avoid module-level issues in serverless
function getPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL not set');
  }
  
  return new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 1, // Serverless-friendly
    idleTimeoutMillis: 100
  });
}

// Init table
async function initDB(pool) {
  try {
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
  } catch (e) {
    console.log('DB init error (non-fatal):', e.message);
  }
}

export default async function handler(req, res) {
  let pool;
  
  try {
    pool = getPool();
    await initDB(pool);
    
    if (req.method === 'GET') {
      const { rows } = await pool.query('SELECT * FROM staff ORDER BY fullName ASC');
      return res.json({ staff: rows });
    }
    
    if (req.method === 'POST') {
      const { fullName, phone, role, rate, notes } = req.body;
      const { rows } = await pool.query(
        'INSERT INTO staff (fullName, phone, role, rate, notes) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [fullName || '', phone || '', role || '', rate || 0, notes || '']
      );
      return res.json({ staff: rows[0], message: 'Staff added successfully' });
    }
    
    if (req.method === 'PATCH') {
      const { id, fullName, phone, role, rate, notes } = req.body;
      await pool.query(
        'UPDATE staff SET fullName=$1, phone=$2, role=$3, rate=$4, notes=$5 WHERE id=$6',
        [fullName, phone, role, rate, notes, id]
      );
      return res.json({ message: 'Staff updated successfully' });
    }
    
    if (req.method === 'DELETE') {
      const { id } = req.body;
      await pool.query('DELETE FROM staff WHERE id=$1', [id]);
      return res.json({ message: 'Staff deleted successfully' });
    }
    
    return res.status(405).json({ error: 'Method not allowed' });
    
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message || 'Server error' });
  } finally {
    if (pool) {
      await pool.end().catch(e => console.log('Pool close error:', e.message));
    }
  }
}
