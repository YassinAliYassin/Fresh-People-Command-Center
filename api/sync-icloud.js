import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export default async function handler(req, res) {
  // Security check
  const secret = req.query.secret || req.headers['x-sync-secret'];
  if (!secret || secret !== process.env.SYNC_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'POST' && !req.query.trigger) {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Test database connection
    await pool.query('SELECT NOW()');
    
    // Fetch iCloud calendar
    const response = await fetch(process.env.ICLOUD_CALENDAR_URL, {
      headers: { 'User-Agent': 'Fresh-People/1.0' }
    });
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const icsText = await response.text();
    
    // Parse events (simple regex-based, no node-ical)
    const events = parseICSBasic(icsText);
    
    // Initialize table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS calendar_events (
        uid TEXT PRIMARY KEY,
        title TEXT,
        start_at TIMESTAMPTZ,
        end_at TIMESTAMPTZ,
        timezone TEXT,
        attendees JSONB DEFAULT '[]',
        description TEXT,
        location TEXT,
        source TEXT,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `).catch(() => {});
    
    // Upsert events
    let imported = 0, updated = 0, failed = 0;
    
    for (const event of events) {
      try {
        const result = await pool.query(`
          INSERT INTO calendar_events (uid, title, start_at, end_at, timezone, attendees, description, location, source)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (uid) DO UPDATE SET
            title = EXCLUDED.title,
            start_at = EXCLUDED.start_at,
            end_at = EXCLUDED.end_at,
            timezone = EXCLUDED.timezone,
            attendees = EXCLUDED.attendees,
            description = EXCLUDED.description,
            location = EXCLUDED.location,
            source = EXCLUDED.source,
            updated_at = NOW()
          RETURNING (xmax::text = 'INSERT').*
        `, [
          event.uid,
          event.title,
          event.start_at,
          event.end_at,
          event.timezone,
          JSON.stringify(event.attendees || []),
          event.description,
          event.location,
          'icloud'
        ]);
        
        if (result.rows[0]?.xmax == 0) imported++;
        else updated++;
      } catch (e) {
        failed++;
        console.error('Upsert error:', e.message);
      }
    }
    
    return res.json({ imported, updated, failed, total: events.length });
    
  } catch (error) {
    console.error('Sync error:', error);
    return res.status(500).json({ error: error.message });
  }
}

function parseICSBasic(icsText) {
  const events = [];
  const veventBlocks = icsText.split('BEGIN:VEVENT').slice(1);
  
  for (const block of veventBlocks) {
    const endIdx = block.indexOf('END:VEVENT');
    if (endIdx === -1) continue;
    const content = block.substring(0, endIdx);
    
    const getField = (field) => {
      const match = content.match(new RegExp(`^${field}:(.*)$`, 'm'));
      return match ? match[1].trim() : null;
    };
    
    const dtstart = getField('DTSTART');
    const dtend = getField('DTEND');
    
    if (!dtstart) continue;
    
    events.push({
      uid: getField('UID') || `event-${Date.now()}`,
      title: getField('SUMMARY') || 'Untitled',
      start_at: parseICalDate(dtstart),
      end_at: dtend ? parseICalDate(dtend) : null,
      timezone: 'Africa/Johannesburg',
      attendees: [],
      description: getField('DESCRIPTION') || '',
      location: getField('LOCATION') || ''
    });
  }
  
  return events;
}

function parseICalDate(icalDate) {
  // Simple parser for YYYYMMDDTHHMMSS or YYYYMMDD
  const clean = icalDate.replace(/[TZ:]/g, '');
  if (clean.length >= 8) {
    const year = clean.substring(0, 4);
    const month = clean.substring(4, 6);
    const day = clean.substring(6, 8);
    const hour = clean.length >= 10 ? clean.substring(8, 10) : '00';
    const min = clean.length >= 12 ? clean.substring(10, 12) : '00';
    const sec = clean.length >= 14 ? clean.substring(12, 14) : '00';
    return new Date(`${year}-${month}-${day}T${hour}:${min}:${sec}`).toISOString();
  }
  return new Date().toISOString();
}
