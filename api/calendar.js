import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export default async function handler(req, res) {
  try {
    // Fetch from both tables
    const [eventsResult, calendarResult] = await Promise.all([
      pool.query('SELECT * FROM events ORDER BY date ASC'),
      pool.query('SELECT uid as id, title, start_at as date, end_at, timezone, attendees as staff_assigned, description as "dressCode", location FROM calendar_events ORDER BY start_at ASC')
    ]);

    const ics = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Fresh People//Command Center//EN\r\nCALSCALE:GREGORIAN\r\nMETHOD:PUBLISH\r\n';
    
    // Process original events table
    for (const event of eventsResult.rows) {
      const startDate = new Date(event.date);
      const duration = event.duration || 4;
      const endDate = new Date(startDate.getTime() + duration * 60 * 60 * 1000);
      
      ics += generateEventBlock(event, startDate, endDate);
    }

    // Process synced iCloud events
    for (const event of calendarResult.rows) {
      const startDate = new Date(event.date);
      const endDate = event.end_at ? new Date(event.end_at) : new Date(startDate.getTime() + 4 * 60 * 60 * 1000);
      
      ics += generateEventBlock({
        id: event.id,
        title: event.title,
        dressCode: event.dressCode || 'All Black',
        staff_assigned: event.staff_assigned
      }, startDate, endDate);
    }
    
    const finalIcs = ics + 'END:VCALENDAR';
    
    res.setHeader('Content-Type', 'text/calendar');
    res.setHeader('Content-Disposition', 'attachment; filename="fresh-people-events.ics"');
    res.send(finalIcs);
    
  } catch (error) {
    console.error('[Calendar API Error]', error);
    return res.status(500).json({ error: 'Failed to generate calendar' });
  }
}

function generateEventBlock(event, startDate, endDate) {
  const uid = `${event.id}@fresh-people.co.za`;
  const dtstamp = formatDate(new Date());
  const dtstart = formatDate(startDate);
  const dtend = formatDate(endDate);
  const summary = event.title || 'Untitled Event';
  const description = `Dress: ${event.dressCode || 'Formal All Black'}\\nArrival: 1hr before\\nStaff: ${Array.isArray(event.staff_assigned) ? event.staff_assigned.join(', ') : (event.staff_assigned || 'TBD')}`;
  
  return `BEGIN:VEVENT\r\nUID:${uid}\r\nDTSTAMP:${dtstamp}\r\nDTSTART:${dtstart}\r\nDTEND:${dtend}\r\nSUMMARY:${summary}\r\nDESCRIPTION:${description}\r\nLOCATION:Fresh People Event\r\nEND:VEVENT\r\n`;
}

function formatDate(date) {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}
