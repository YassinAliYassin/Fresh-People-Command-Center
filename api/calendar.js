// Calendar API v1.2 - Robust iCloud + local DB unification for Fresh People Command Center
// Supports both Postgres (Vercel) and graceful fallback. Stronger ICS parsing.
export default async function handler(req, res) {
  const startTime = Date.now();
  
  try {
    let pool = null;
    let eventsResult = { rows: [] };
    
    // Dynamic import + optional DB (serverless safe)
    if (process.env.DATABASE_URL) {
      try {
        const { Pool } = await import('pg');
        pool = new Pool({
          connectionString: process.env.DATABASE_URL,
          ssl: { rejectUnauthorized: false },
          max: 1,
          idleTimeoutMillis: 8000
        });
        
        eventsResult = await pool.query('SELECT * FROM events ORDER BY date ASC').catch(e => {
          console.log('[Calendar] DB query failed (non-fatal):', e.message);
          return { rows: [] };
        });
      } catch (dbErr) {
        console.log('[Calendar] Postgres client error (falling back):', dbErr.message);
      }
    } else {
      console.log('[Calendar] No DATABASE_URL — serving iCloud-only (or empty local)');
    }
    
    // Fetch from iCloud calendar (primary external source)
    let iCloudEvents = [];
    const iCloudUrl = process.env.ICLOUD_CALENDAR_URL;
    
    if (iCloudUrl) {
      try {
        console.log('[Calendar] Fetching iCloud URL (masked):', iCloudUrl.substring(0, 42) + '...');
        const response = await fetch(iCloudUrl, { 
          headers: { 'User-Agent': 'Fresh-People-Command-Center/1.2' },
          signal: AbortSignal.timeout ? AbortSignal.timeout(8000) : undefined
        });
        console.log('[Calendar] iCloud fetch status:', response.status);
        
        if (response.ok) {
          const icsText = await response.text();
          console.log('[Calendar] iCloud ICS length:', icsText.length);
          iCloudEvents = parseICS(icsText);
          console.log('[Calendar] Parsed iCloud events count:', iCloudEvents.length);
        } else {
          console.log('[Calendar] iCloud fetch failed:', response.status, response.statusText);
        }
      } catch (e) {
        console.log('[Calendar] iCloud fetch/parse error (non-fatal):', e.message);
      }
    } else {
      console.log('[Calendar] No ICLOUD_CALENDAR_URL set');
    }
    
    if (pool) {
      await pool.end().catch(() => {});
    }
    
    const format = req.query.format;
    if (format === 'json') {
      const localEvents = (eventsResult.rows || []).map(event => ({
        id: event.id || `local-${Date.now()}`,
        title: event.title || 'Untitled Event',
        start: event.date,
        end: new Date(new Date(event.date).getTime() + (event.duration || 4) * 60 * 60 * 1000).toISOString(),
        source: 'local',
        staff_assigned: event.staff_assigned || '',
        dressCode: event.dress_code || 'Formal All Black',
        clientName: event.client_name || ''
      }));
      
      return res.status(200).json({
        local: localEvents,
        icloud: iCloudEvents,
        meta: {
          source: 'fresh-people-command-center',
          generatedAt: new Date().toISOString(),
          tookMs: Date.now() - startTime
        }
      });
    }
    
    // ICS output
    const ics = generateICS(eventsResult.rows || [], iCloudEvents);
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="fresh-people-events.ics"');
    res.setHeader('Cache-Control', 'no-cache');
    return res.send(ics);
    
  } catch (error) {
    console.error('[Calendar API Error]', error);
    return res.status(500).json({ 
      error: 'Failed to generate calendar',
      message: error.message 
    });
  }
}

function parseICS(icsText) {
  const events = [];
  
  // Unfold folded lines (RFC 5545)
  const unfolded = icsText.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '');
  const lines = unfolded.split('\n');
  
  let currentEvent = null;
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
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
          staff_assigned: '',
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
        if (val) currentEvent.dtstart = formatICSDate(val);
      } else if (trimmed.startsWith('DTEND')) {
        const val = trimmed.split(':')[1];
        if (val) currentEvent.dtend = formatICSDate(val);
      }
    }
  }
  
  return events;
}

function formatICSDate(icsDate) {
  if (!icsDate) return new Date().toISOString();
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
  const description = `Dress: ${event.dressCode || 'Formal All Black'}\nArrival: 1hr before\nStaff: ${event.staff_assigned || 'TBD'}`;
  
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