import sqlite3 from 'sqlite3';
import { verbose } from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = process.env.NODE_ENV === 'production' ? '/tmp/events.db' : path.join(__dirname, '..', 'events.db');

function getDB() {
  const db = new sqlite3.Database(dbPath);
  return db;
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const db = getDB();
    db.all('SELECT * FROM events ORDER BY date DESC', [], (err, rows) => {
      db.close();
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    });
  } else if (req.method === 'POST') {
    const db = getDB();
    const { clientId, clientName, clientPhone, date, startTime, endTime, uniformType, region, pricing_tier, availability_status, base_price } = req.body;
    
    const multiplier = calculateMultiplier(region, pricing_tier, availability_status);
    
    db.run(`INSERT INTO events (clientId, clientName, clientPhone, date, startTime, endTime, uniformType, region, pricing_tier, availability_status, base_price, multiplier) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [clientId, clientName, clientPhone, date, startTime, endTime, uniformType || 'Formal All Black', region || 'ZA-GP', pricing_tier || 'Standard', availability_status || 'Available', base_price || 0, multiplier],
      function(err) {
        db.close();
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID });
      });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

function calculateMultiplier(region, tier, status) {
  const regionMult = { 'ZA-GP': 1.2, 'ZA-WC': 1.1, 'ZA-KZN': 1.05, 'ZA': 1.0 };
  const tierMult = { 'Standard': 1.0, 'Premium': 1.3, 'VIP': 1.6, 'Corporate': 1.5 };
  const statusMult = { 'Available': 1.0, 'Peak': 1.25, 'High Demand': 1.4, 'Limited': 1.15 };
  
  return (regionMult[region] || 1.0) * (tierMult[tier] || 1.0) * (statusMult[status] || 1.0);
}
