import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env.production' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function init() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id SERIAL PRIMARY KEY,
        booking_ref TEXT UNIQUE DEFAULT 'BK-' || to_char(NOW(), 'YYYYMMDD-') || LPAD(nextval('bookings_id_seq')::text, 3, '0'),
        client_name TEXT,
        client_phone TEXT,
        venue TEXT,
        event_date TIMESTAMPTZ,
        event_time TEXT,
        staff_required INTEGER DEFAULT 0,
        status TEXT DEFAULT 'pending',
        raw_message TEXT,
        extracted_data JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('✓ bookings table ready');
    
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(event_date)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status)`);
    console.log('✓ Indexes created');
    
    await pool.end();
    console.log('Done!');
  } catch (error) {
    console.error('Error:', error.message);
  }
}

init();
