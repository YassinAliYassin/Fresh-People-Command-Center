// Calendar API v2.0 - Uses shared lib/ical.js (DRY, robust node-ical parser)
import { fetchAndParseICalendar, fetchICalendar, parseICalendar } from '../lib/ical.js';

export default async function handler(req, res) {
  try {
    // Dynamic import for pg (serverless-compatible)
    const { Pool } = await import('pg');

    if (!process.env.DATABASE_URL) {
      return res.status(500).json({ error: 'DATABASE_URL not set' });
    }

    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 1,
      idleTimeoutMillis: 100
    });

    // Fetch local events from database
    let eventsResult = { rows: [] };
    try {
      eventsResult = await pool.query('SELECT * FROM events ORDER BY date ASC');
    } catch (e) {
      console.log('[Calendar] DB query failed:', e.message);
    }

    // Fetch from iCloud calendar (shared lib handles validation + parsing)
    let iCloudEvents = [];
    const iCloudUrl = process.env.ICLOUD_CALENDAR_URL;

    if (iCloudUrl) {
      try {
        console.log('[Calendar] Fetching iCloud URL:', iCloudUrl.substring(0, 60) + '...');
        iCloudEvents = await fetchAndParseICalendar(iCloudUrl);
        console.log('[Calendar] Parsed iCloud events count:', iCloudEvents.length);
      } catch (e) {
        console.log('[Calendar] iCloud fetch/parse error:', e.message);
      }
    } else {
      console.log('[Calendar] No ICLOUD_CALENDAR_URL set');
    }

    await pool.end();
    
    // If JSON format requested (for frontend calendar UI)
    const format = req.query.format;
    if (format === 'json') {
      const localEvents = eventsResult.rows.map(event => ({
        id: event.id,
        title: event.title,
        start: event.date,
        end: new Date(new Date(event.date).getTime() + (event.duration || 4) * 60 * 60 * 1000).toISOString(),
        source: 'local',
        staff_assigned: event.staff_assigned || '',
        dressCode: 'Formal All Black',
        clientName: ''
      }));
      
      return res.status(200).json({
        local: localEvents,
        icloud: iCloudEvents
      });
    }
    
    // Otherwise return ICS file (original behavior)
    const ics = generateICS(eventsResult.rows, iCloudEvents);
    res.setHeader('Content-Type', 'text/calendar');
    res.setHeader('Content-Disposition', 'attachment; filename="fresh-people-events.ics"');
    return res.send(ics);
    
  } catch (error) {
    console.error('[Calendar API Error]', error);
    return res.status(500).json({ error: 'Failed to generate calendar' });
  }
}

// parseICS / formatICSDate removed — use lib/ical.js (fetchAndParseICalendar / parseICalendar)

function generateICS(localEvents, iCloudEvents) {
  let ics = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Fresh People//Command Center//EN\r\nCALSCALE:GREGORIAN\r\nMETHOD:PUBLISH\r\n';
  
  for (const event of localEvents) {
    ics += generateEventBlock(event);
  }
  
  for (const event of iCloudEvents) {
    ics += generateEventBlock(event);
  }
  
  ics += 'END:VCALENDAR';
  return ics;
}

function generateEventBlock(event) {
  const uid = `${event.id}@fresh-people.co.za`;
  const dtstamp = formatDate(new Date());
  const dtstart = event.start || new Date().toISOString();
  const dtend = event.end || new Date(new Date(dtstart).getTime() + 4 * 60 * 60 * 1000).toISOString();
  const summary = event.title || 'Untitled Event';
  const description = `Dress: ${event.dressCode || 'Formal All Black'}\\nArrival: 1hr before\\nStaff: ${event.staff_assigned || 'TBD'}`;
  
  return `BEGIN:VEVENT\r\nUID:${uid}\r\nDTSTAMP:${dtstamp}\r\nDTSTART:${formatDateForICS(dtstart)}\r\nDTEND:${formatDateForICS(dtend)}\r\nSUMMARY:${summary}\r\nDESCRIPTION:${description}\r\nLOCATION:Fresh People Event\r\nEND:VEVENT\r\n`;
}

function formatDate(date) {
  try {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  } catch (e) {
    return new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  }
}

function formatDateForICS(isoString) {
  try {
    return new Date(isoString).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  } catch (e) {
    return new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  }
}
