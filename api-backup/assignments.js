import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = process.env.NODE_ENV === 'production' ? '/tmp/events.db' : path.join(__dirname, '..', 'events.db');

function getDB() {
  return new sqlite3.Database(dbPath);
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const db = getDB();
    db.all(`SELECT ea.*, s.name as staffName, s.phone 
            FROM event_assignments ea 
            JOIN staff s ON ea.staffId = s.id 
            ORDER BY ea.id DESC`, [], (err, rows) => {
      db.close();
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    });
  } else if (req.method === 'POST') {
    const db = getDB();
    const { eventId, staffId, status } = req.body;
    
    db.run('INSERT OR IGNORE INTO event_assignments (eventId, staffId, status) VALUES (?, ?, ?)', 
      [eventId, staffId, status || 'Pending'], function(err) {
        db.close();
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID });
      });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
