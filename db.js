import sqlite3 from 'sqlite3';
import { Pool } from 'pg';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const isProduction = process.env.NODE_ENV === 'production';
const isNeon = !!process.env.DATABASE_URL;

let db;

// Unified DB interface
const dbInterface = {
  run: (sql, params = [], callback) => {},
  get: (sql, params = [], callback) => {},
  all: (sql, params = [], callback) => {},
  close: (callback) => {}
};

if (isNeon) {
  // Neon PostgreSQL (production)
  console.log('Using Neon PostgreSQL database');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  dbInterface.run = (sql, params = [], callback) => {
    pool.query(sql, params)
      .then(res => callback?.(null, res))
      .catch(err => callback?.(err));
  };

  dbInterface.get = (sql, params = [], callback) => {
    pool.query(sql, params)
      .then(res => callback?.(null, res.rows[0]))
      .catch(err => callback?.(err));
  };

  dbInterface.all = (sql, params = [], callback) => {
    pool.query(sql, params)
      .then(res => callback?.(null, res.rows))
      .catch(err => callback?.(err));
  };

  dbInterface.close = (callback) => {
    pool.end().then(() => callback?.()).catch(err => callback?.(err));
  };

  // Test connection
  pool.query('SELECT NOW()', (err) => {
    if (err) console.error('Neon DB connection error:', err.message);
    else console.log('Connected to Neon PostgreSQL');
  });

  db = pool;
} else {
  // SQLite (development)
  console.log('Using SQLite database (development)');
  const dbPath = resolve(__dirname, process.env.DB_PATH || 'events.db');
  const sqliteDb = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error('SQLite connection error:', err.message);
    else console.log('Connected to SQLite database at', dbPath);
  });

  dbInterface.run = (sql, params = [], callback) => {
    sqliteDb.run(sql, params, function(err) {
      callback?.(err, this);
    });
  };

  dbInterface.get = (sql, params = [], callback) => {
    sqliteDb.get(sql, params, callback);
  };

  dbInterface.all = (sql, params = [], callback) => {
    sqliteDb.all(sql, params, callback);
  };

  dbInterface.close = (callback) => {
    sqliteDb.close(callback);
  };

  // Create tables for SQLite
  dbInterface.run(`CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    date TEXT NOT NULL,
    duration INTEGER DEFAULT 4,
    staffName TEXT,
    staffPhone TEXT DEFAULT '',
    clientName TEXT DEFAULT '',
    clientPhone TEXT DEFAULT '',
    clientEmail TEXT DEFAULT '',
    uniformType TEXT DEFAULT 'Formal All Black',
    arrivalTime TEXT,
    region TEXT DEFAULT 'ZA-GP',
    pricing_tier TEXT DEFAULT 'Standard',
    availability_status TEXT DEFAULT 'Available',
    base_price REAL DEFAULT 0,
    multiplier REAL DEFAULT 1.0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  dbInterface.run(`CREATE TABLE IF NOT EXISTS staff (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fullName TEXT NOT NULL,
    phone TEXT DEFAULT '',
    email TEXT DEFAULT '',
    role TEXT DEFAULT '',
    rate REAL DEFAULT 0,
    notes TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  dbInterface.run(`CREATE TABLE IF NOT EXISTS staff_assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    eventId TEXT NOT NULL,
    staffId INTEGER NOT NULL,
    assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(eventId) REFERENCES events(id),
    FOREIGN KEY(staffId) REFERENCES staff(id)
  )`);

  db = sqliteDb;
}

export default db;
export { dbInterface, isNeon, isProduction };