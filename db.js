import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = resolve(__dirname, process.env.DB_PATH || 'events.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err);
  } else {
    console.log('Connected to SQLite database at', dbPath);
    db.run(`CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      date TEXT NOT NULL,
      duration INTEGER DEFAULT 4,
      staffName TEXT,
      staffPhone TEXT DEFAULT '',
      staffEmail TEXT DEFAULT '',
      clientName TEXT DEFAULT '',
      clientPhone TEXT DEFAULT '',
      clientEmail TEXT DEFAULT '',
      dressCode TEXT DEFAULT 'All Black',
      uniformType TEXT DEFAULT 'Formal All Black',
      arrivalTime TEXT,
      region TEXT DEFAULT 'ZA-GP',
      pricing_tier TEXT DEFAULT 'Standard',
      availability_status TEXT DEFAULT 'Available',
      base_price REAL DEFAULT 0,
      multiplier REAL DEFAULT 1.0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
      if (err) {
        console.error('Error creating events table', err);
      } else {
        console.log('Events table ready');
      }
    });
    
    // Create staff table
    db.run(`CREATE TABLE IF NOT EXISTS staff (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fullName TEXT NOT NULL,
      phone TEXT DEFAULT '',
      email TEXT DEFAULT '',
      role TEXT DEFAULT '',
      rate REAL DEFAULT 0,
      notes TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
      if (err) {
        console.error('Error creating staff table', err);
      } else {
        console.log('Staff table ready');
      }
    });
    
    // Create staff_assignments table
    db.run(`CREATE TABLE IF NOT EXISTS staff_assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      eventId TEXT NOT NULL,
      staffId INTEGER NOT NULL,
      assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(eventId) REFERENCES events(id),
      FOREIGN KEY(staffId) REFERENCES staff(id)
    )`, (err) => {
      if (err) {
        console.error('Error creating staff_assignments table', err);
      } else {
        console.log('Staff_assignments table ready');
      }
    });
  }
});

export default db;
