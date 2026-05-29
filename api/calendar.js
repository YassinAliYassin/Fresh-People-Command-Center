import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = process.env.NODE_ENV === 'production' ? '/tmp/events.db' : path.join(__dirname, '..', 'events.db');

function getDB() {
  return new sqlite3.Database(dbPath);
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const db = getDB();
  
  db.all('SELECT * FROM events ORDER BY date', [], (err, events) => {
    db.close();
    if (err) return res.status(500).json({ error: err.message });
    
    let ics = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Fresh People//Events//EN\r\n';
    
    events.forEach(event => {
      const start = new Date(event.date + 'T' + (event.startTime || '09:00'));
      const end = new Date(event.date + 'T' + (event.endTime || '13:00'));
      
      const formatDate = (d) => {
        return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      };
      
      ics += 'BEGIN:VEVENT\r\n';
      ics += `UID:${event.id}@fresh-people.co.za\r\n`;
      ics += `DTSTART:${formatDate(start)}\r\n`;
      ics += `DTEND:${formatDate(end)}\r\n`;
      ics += `SUMMARY:${event.clientName || 'Event'}\r\n`;
      ics += `DESCRIPTION:${event.uniformType || 'Formal All Black'}\r\n`;
      ics += 'END:VEVENT\r\n';
    });
    
    ics += 'END:VCALENDAR\r\n';
    
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="FreshPeople-Events.ics"');
    res.send(ics);
  });
}
