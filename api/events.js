import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Init table
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      title TEXT,
      date TEXT,
      duration INTEGER,
      staff_assigned TEXT,
      dressCode TEXT,
      arrivalTime TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

export default async function handler(req, res) {
  await initDB();
  
  const { id } = req.query; // id from /api/events/[id] or undefined for /api/events
  
  // Single event operations (events/[id])
  if (id) {
    if (req.method === 'GET') {
      const { rows } = await pool.query('SELECT * FROM events WHERE id = $1', [id]);
      if (rows.length === 0) return res.status(404).json({ error: 'Event not found' });
      const event = {
        ...rows[0],
        staff_assigned: typeof rows[0].staff_assigned === 'string' ? JSON.parse(rows[0].staff_assigned) : rows[0].staff_assigned
      };
      return res.json({ event });
    }
    
    if (req.method === 'PATCH' || req.method === 'DELETE') {
      // Admin auth check for write operations
      const authHeader = req.headers.authorization;
      const adminSecret = process.env.ADMIN_SECRET;
      if (!adminSecret || authHeader !== `Bearer ${adminSecret}`) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      if (req.method === 'PATCH') {
        const { title, date, duration, staff_assigned, dressCode, arrivalTime } = req.body;
        await pool.query(
          'UPDATE events SET title=$1, date=$2, duration=$3, staff_assigned=$4, dressCode=$5, arrivalTime=$6 WHERE id=$7',
          [title, date, duration, JSON.stringify(staff_assigned), dressCode, arrivalTime, id]
        );
        return res.json({ id, message: 'Event updated successfully' });
      }
      
      if (req.method === 'DELETE') {
        await pool.query('DELETE FROM events WHERE id=$1', [id]);
        return res.json({ message: 'Event deleted successfully' });
      }
    }
    
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // Collection operations (events/)
  if (req.method === 'GET') {
    const { rows } = await pool.query('SELECT * FROM events ORDER BY date ASC');
    const events = rows.map(row => ({
      ...row,
      staff_assigned: typeof row.staff_assigned === 'string' ? JSON.parse(row.staff_assigned) : row.staff_assigned
    }));
    return res.json({ events });
  }
  
  if (req.method === 'POST') {
    // Admin auth check for write operations
    const authHeader = req.headers.authorization;
    const adminSecret = process.env.ADMIN_SECRET;
    if (!adminSecret || authHeader !== `Bearer ${adminSecret}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const { id, title, date, duration, staff_assigned, dressCode, arrivalTime } = req.body;
    await pool.query(
      'INSERT INTO events (id, title, date, duration, staff_assigned, dressCode, arrivalTime) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [id, title, date, duration, JSON.stringify(staff_assigned), dressCode, arrivalTime]
    );
    return res.json({ id, message: 'Event created successfully' });
  }
  
  res.status(405).json({ error: 'Method not allowed' });
}
