import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Phase 2: Create all new tables
export async function initPhase2Tables() {
  try {
    // 1. Bookings table (intake from WhatsApp)
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
        status TEXT DEFAULT 'pending', -- pending, confirmed, completed, cancelled
        raw_message TEXT, -- Original WhatsApp message
        extracted_data JSONB, -- NLP extraction results
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('✓ bookings table ready');

    // 2. Staff confirmations table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS staff_confirmations (
        id SERIAL PRIMARY KEY,
        event_id TEXT REFERENCES calendar_events(uid) ON DELETE CASCADE,
        staff_name TEXT,
        staff_phone TEXT,
        status TEXT DEFAULT 'pending', -- pending, confirmed, declined, no_response
        response_message TEXT, -- YES/NO reply content
        responded_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('✓ staff_confirmations table ready');

    // 3. Event timeline table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS event_timeline (
        id SERIAL PRIMARY KEY,
        event_id TEXT REFERENCES calendar_events(uid) ON DELETE CASCADE,
        event_ref TEXT, -- Links to bookings.booking_ref
        stage TEXT, -- booking_received, staff_assigned, staff_confirmed, event_started, event_completed, payroll_processed
        status TEXT DEFAULT 'pending', -- pending, in_progress, completed
        notes TEXT,
        metadata JSONB, -- Additional context
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('✓ event_timeline table ready');

    // 4. WhatsApp message log (for client communication)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS whatsapp_messages (
        id SERIAL PRIMARY KEY,
        direction TEXT, -- 'outbound' or 'inbound'
        sender_phone TEXT,
        recipient_phone TEXT,
        message_type TEXT, -- booking_received, staff_confirmed, event_reminder, event_completed
        content TEXT,
        status TEXT DEFAULT 'sent', -- sent, delivered, read, failed
        related_event TEXT,
        related_booking TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('✓ whatsapp_messages table ready');

    // Create indexes
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(event_date)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_staff_conf_event ON staff_confirmations(event_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_staff_conf_status ON staff_confirmations(status)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_timeline_event ON event_timeline(event_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_timeline_stage ON event_timeline(stage)`);
    
    console.log('✓ All Phase 2 tables initialized');
    return { success: true, message: 'Phase 2 database ready' };
    
  } catch (error) {
    console.error('Phase 2 DB init error:', error);
    throw error;
  }
}

// Booking operations
export async function createBooking(bookingData) {
  const query = `
    INSERT INTO bookings (client_name, client_phone, venue, event_date, event_time, staff_required, raw_message, extracted_data)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `;
  const values = [
    bookingData.client_name,
    bookingData.client_phone,
    bookingData.venue,
    bookingData.event_date,
    bookingData.event_time,
    bookingData.staff_required,
    bookingData.raw_message,
    JSON.stringify(bookingData.extracted_data || {})
  ];
  const result = await pool.query(query, values);
  return result.rows[0];
}

export async function getTodaysBookings() {
  const query = `
    SELECT * FROM bookings 
    WHERE DATE(event_date) = CURRENT_DATE 
    ORDER BY event_date ASC
  `;
  const result = await pool.query(query);
  return result.rows;
}

export async function getTomorrowsBookings() {
  const query = `
    SELECT * FROM bookings 
    WHERE DATE(event_date) = CURRENT_DATE + INTERVAL '1 day'
    ORDER BY event_date ASC
  `;
  const result = await pool.query(query);
  return result.rows;
}

// Staff confirmation operations
export async function updateStaffConfirmation(eventId, staffPhone, status, responseMessage) {
  const query = `
    INSERT INTO staff_confirmations (event_id, staff_phone, status, response_message, responded_at)
    VALUES ($1, $2, $3, $4, NOW())
    ON CONFLICT (event_id, staff_phone) 
    DO UPDATE SET 
      status = EXCLUDED.status,
      response_message = EXCLUDED.response_message,
      responded_at = EXCLUDED.responded_at
    RETURNING *
  `;
  const result = await pool.query(query, [eventId, staffPhone, status, responseMessage]);
  return result.rows[0];
}

// Timeline operations
export async function addTimelineStage(eventId, stage, notes, metadata) {
  const query = `
    INSERT INTO event_timeline (event_id, stage, status, notes, metadata)
    VALUES ($1, $2, 'completed', $3, $4)
    RETURNING *
  `;
  const result = await pool.query(query, [eventId, stage, notes, JSON.stringify(metadata || {})]);
  return result.rows[0];
}
