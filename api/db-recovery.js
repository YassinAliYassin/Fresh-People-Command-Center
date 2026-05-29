import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export default async function handler(req, res) {
  // Admin auth check
  const authHeader = req.headers.authorization;
  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret || authHeader !== `Bearer ${adminSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const results = [];
  
  try {
    // 1. Create staff table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS staff (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT,
        role TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    results.push({ table: 'staff', status: 'ready' });
    
    // 2. Create events table
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
    results.push({ table: 'events', status: 'ready' });
    
    // 3. Create calendar_events table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS calendar_events (
        uid TEXT PRIMARY KEY,
        title TEXT,
        start_at TIMESTAMPTZ,
        end_at TIMESTAMPTZ,
        timezone TEXT DEFAULT 'Africa/Johannesburg',
        attendees TEXT,
        description TEXT,
        location TEXT,
        source TEXT DEFAULT 'icloud',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    results.push({ table: 'calendar_events', status: 'ready' });
    
    // 4. Create bookings table
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
    results.push({ table: 'bookings', status: 'ready' });
    
    // 5. Create staff_confirmations table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS staff_confirmations (
        id SERIAL PRIMARY KEY,
        event_id TEXT REFERENCES calendar_events(uid) ON DELETE CASCADE,
        staff_name TEXT,
        staff_phone TEXT,
        status TEXT DEFAULT 'pending',
        response_message TEXT,
        responded_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    results.push({ table: 'staff_confirmations', status: 'ready' });
    
    // 6. Create event_timeline table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS event_timeline (
        id SERIAL PRIMARY KEY,
        event_id TEXT REFERENCES calendar_events(uid) ON DELETE CASCADE,
        event_ref TEXT,
        stage TEXT,
        status TEXT DEFAULT 'pending',
        notes TEXT,
        metadata JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    results.push({ table: 'event_timeline', status: 'ready' });
    
    // 7. Create whatsapp_messages table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS whatsapp_messages (
        id SERIAL PRIMARY KEY,
        direction TEXT,
        sender_phone TEXT,
        recipient_phone TEXT,
        message_type TEXT,
        content TEXT,
        status TEXT DEFAULT 'sent',
        related_event TEXT,
        related_booking TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    results.push({ table: 'whatsapp_messages', status: 'ready' });
    
    // Get row counts
    for (const r of results) {
      const countResult = await pool.query(`SELECT COUNT(*) as count FROM ${r.table}`);
      r.rowCount = parseInt(countResult.rows[0].count);
    }
    
    await pool.end();
    
    return res.status(200).json({
      success: true,
      message: 'Database recovery complete',
      tables: results
    });
    
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
      results
    });
  }
}
