import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = process.env.NODE_ENV === 'production' ? '/tmp/events.db' : path.join(__dirname, '..', '..', 'events.db');

function getDB() {
  return new sqlite3.Database(dbPath);
}

export default async function handler(req, res) {
  const { id } = req.query;
  
  if (req.method === 'PATCH') {
    const { totalHours, dateWorked } = req.body;
    const db = getDB();
    
    db.run('UPDATE event_assignments SET totalHours = ?, dateWorked = ? WHERE id = ?', 
      [totalHours, dateWorked, id], function(err) {
        db.close();
        if (err) return res.status(500).json({ error: err.message });
        res.json({ updated: this.changes });
      });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
