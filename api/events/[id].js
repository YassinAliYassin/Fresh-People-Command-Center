import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export default async function handler(req, res) {
  const { id } = req.query;
  
  // Admin auth check for write operations
  if (req.method === 'PATCH' || req.method === 'DELETE') {
    const authHeader = req.headers.authorization;
    const adminSecret = process.env.ADMIN_SECRET;
    if (!adminSecret || authHeader !== `Bearer ${adminSecret}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
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
  
  res.status(405).json({ error: 'Method not allowed' });
}
