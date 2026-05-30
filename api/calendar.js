import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export default async function handler(req, res) {
  const format = req.query.format || 'ics';
  
  try {
    // Fetch local events from database
    const eventsResult = await pool.query('SELECT * FROM events ORDER BY date ASC').catch(() => ({ rows: [] }));
    
    // Fetch from iCloud calendar
    let iCloudEvents = [];
    const iCloudUrl = process.env.ICLOUD_CALENDAR_URL;
    
    if (iCloudUrl) {
      try {
        const response = await fetch(iCloudUrl);
        const icsText = await response.text();
        iCloudEvents = parseICS(icsText);
      } catch (e) {
        console.log('[Calendar] iCloud fetch failed:', e.message);
      }
    }
    
    // If JSON format requested (for frontend calendar UI)
    if (format === 'json') {
      const localEvents = eventsResult.rows.map(event => ({
        id: event.id,
        title: event.title,
        start: event.date,
        end: new Date(new Date(event.date).getTime() + (event.duration || 4) * 60 * 60 * 1000).toISOString(),
        source: 'local',
        staff_assigned: event.staffname || '',
        dressCode: event.uniformtype || 'Formal All Black',
        clientName: event.clientname || ''
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

function parseICS(icsText) {
  const events = [];
  const lines = icsText.split('\n');
  let currentEvent = null;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    if (trimmed === 'BEGIN:VEVENT') {
      currentEvent = {};
    } else if (trimmed === 'END:VEVENT') {
      if (currentEvent && currentEvent.start) {
        events.push({
          id: currentEvent.uid || `icloud-${Date.now()}`,
          title: currentEvent.summary || 'Untitled Event',
          start: currentEvent.dtstart,
          end: currentEvent.dtend || currentEvent.dtstart,
          source: 'icloud',
          staff_assigned: currentEvent.attendees || '',
          dressCode: 'Formal All Black',
          clientName: ''
        });
      }
      currentEvent = null;
    } else if (currentEvent) {
      if (trimmed.startsWith('UID:')) {
        currentEvent.uid = trimmed.substring(4);
      } else if (trimmed.startsWith('SUMMARY:')) {
        currentEvent.summary = trimmed.substring(8);
      } else if (trimmed.startsWith('DTSTART')) {
        const val = trimmed.split(':')[1];
        currentEvent.dtstart = formatICSDate(val);
      } else if (trimmed.startsWith('DTEND')) {
        const val = trimmed.split(':')[1];
        currentEvent.dtend = formatICSDate(val);
      }
    }
  }
  
  return events;
}

function formatICSDate(icsDate) {
  if (!icsDate) return new Date().toISOString();
  // Handle format like 20260531T180000Z
  const year = icsDate.substring(0, 4);
  const month = icsDate.substring(4, 6);
  const day = icsDate.substring(6, 8);
  const hour = icsDate.substring(9, 11);
  const minute = icsDate.substring(11, 13);
  return new Date(`${year}-${month}-${day}T${hour}:${minute}:00Z`).toISOString();
}

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
