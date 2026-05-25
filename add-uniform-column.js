import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = resolve(__dirname, 'events.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err);
    process.exit(1);
  }
  
  console.log('Connected to SQLite database at', dbPath);
  
  // Add uniform_type column
  db.run("ALTER TABLE events ADD COLUMN uniform_type TEXT DEFAULT 'Formal All Black'", (err) => {
    if (err) {
      if (err.message.includes('duplicate column')) {
        console.log('Column uniform_type already exists');
      } else {
        console.error('Error adding column:', err.message);
      }
    } else {
      console.log('Column uniform_type added successfully');
    }
    
    // Close the database
    db.close((closeErr) => {
      if (closeErr) {
        console.error('Error closing database:', closeErr);
      } else {
        console.log('Database connection closed');
      }
      process.exit(0);
    });
  });
});
