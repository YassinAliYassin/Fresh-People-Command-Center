import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Ensure table exists
export async function initCalendarEventsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS calendar_events (
      id SERIAL PRIMARY KEY,
      uid TEXT UNIQUE NOT NULL,
      title TEXT,
      description TEXT,
      start_at TIMESTAMPTZ,
      end_at TIMESTAMPTZ,
      timezone TEXT,
      attendees JSONB DEFAULT '[]',
      location TEXT,
      recurrence TEXT,
      source TEXT,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_calendar_events_uid ON calendar_events(uid);
    CREATE INDEX IF NOT EXISTS idx_calendar_events_start ON calendar_events(start_at);
  `);
}

// Upsert event (update if exists, insert if new)
export async function upsertEvent(event) {
  const query = `
    INSERT INTO calendar_events (
      uid, title, description, start_at, end_at, timezone,
      attendees, location, recurrence, source, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
    ON CONFLICT (uid) DO UPDATE SET
      title = EXCLUDED.title,
      description = EXCLUDED.description,
      start_at = EXCLUDED.start_at,
      end_at = EXCLUDED.end_at,
      timezone = EXCLUDED.timezone,
      attendees = EXCLUDED.attendees,
      location = EXCLUDED.location,
      recurrence = EXCLUDED.recurrence,
      source = EXCLUDED.source,
      updated_at = NOW()
    RETURNING id, uid;
  `;

  const values = [
    event.uid,
    event.title,
    event.description || '',
    event.start_at,
    event.end_at,
    event.timezone || 'Africa/Johannesburg',
    JSON.stringify(event.attendees || []),
    event.location || '',
    event.recurrence || null,
    event.source || 'icloud'
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
}

// Get sync statistics
export async function getSyncStats() {
  const result = await pool.query(`
    SELECT 
      source,
      COUNT(*) as count,
      MAX(updated_at) as last_sync
    FROM calendar_events
    GROUP BY source
  `);
  return result.rows;
}
