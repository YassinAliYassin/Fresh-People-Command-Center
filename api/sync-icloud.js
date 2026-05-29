import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export default async function handler(req, res) {
  if (req.method !== 'POST' && !req.query.trigger) {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const stats = { imported: 0, updated: 0, failed: 0, total: 0, errors: [] };

  try {
    // Create table if not exists
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
    `).catch(e => console.log('Table may exist:', e.message));

    // Fetch iCloud
    const response = await fetch(process.env.ICLOUD_CALENDAR_URL, {
      headers: { 'User-Agent': 'Fresh-People/1.0' }
    });
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const icsText = await response.text();
    
    // Parse events
    const events = parseICSBasic(icsText);
    stats.total = events.length;
    
    // Upsert
    for (const event of events) {
      try {
        await pool.query(`
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
        stats.imported++;
      } catch (e) {
        stats.failed++;
        stats.errors.push({ uid: event.uid, error: e.message });
      }
    }
    
    return res.json(stats);
    
  } catch (error) {
    return res.status(500).json({ error: error.message, stats });
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
    if (!dtstart) continue;
    
    const uid = getField('UID') || `event-${Date.now()}`;
    const title = getField('SUMMARY') || 'Untitled';
    const start_at = parseICalDate(dtstart);
    const dtend = getField('DTEND');
    const end_at = dtend ? parseICalDate(dtend) : null;
    
    events.push({
      uid,
      title,
      start_at,
      end_at,
      timezone: 'Africa/Johannesburg',
      attendees: [],
      description: getField('DESCRIPTION') || '',
      location: getField('LOCATION') || ''
    });
  }
  
  return events;
}

function parseICalDate(icalDate) {
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
