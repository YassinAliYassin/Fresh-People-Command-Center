// Apple Calendar API - iCloud CalDAV integration
// Uses iCloud public calendar feed (iCal format)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // iCloud Calendar iCal URL (public feed)
    // User needs to provide their iCloud calendar public URL
    const icloudUrl = process.env.ICLOUD_CALENDAR_URL || 
      'https://calendar.apple.com/ical/freshpeople.ics'; // Replace with actual URL
    
    const response = await fetch(icloudUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch Apple Calendar: ${response.statusText}`);
    }
    
    const icalData = await response.text();
    
    // Parse iCal format (simple parser)
    const events = parseICal(icalData);
    
    return res.status(200).json({
      success: true,
      events: events,
      count: events.length
    });
    
  } catch (error) {
    console.error('Apple Calendar sync error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}

function parseICal(icalData) {
  const events = [];
  const lines = icalData.split('\n');
  let currentEvent = null;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    if (trimmed === 'BEGIN:VEVENT') {
      currentEvent = {};
    } else if (trimmed === 'END:VEVENT') {
      if (currentEvent && currentEvent.uid) {
        events.push({
          id: currentEvent.uid,
          title: currentEvent.summary || 'Untitled',
          start: currentEvent.dtstart || new Date().toISOString(),
          end: currentEvent.dtend || new Date().toISOString(),
          description: currentEvent.description || '',
          location: currentEvent.location || ''
        });
      }
      currentEvent = null;
    } else if (currentEvent) {
      const [key, ...valueParts] = trimmed.split(':');
      const value = valueParts.join(':');
      
      switch (key.toUpperCase()) {
        case 'UID':
          currentEvent.uid = value;
          break;
        case 'SUMMARY':
          currentEvent.summary = value;
          break;
        case 'DTSTART':
          currentEvent.dtstart = parseICalDate(value);
          break;
        case 'DTEND':
          currentEvent.dtend = parseICalDate(value);
          break;
        case 'DESCRIPTION':
          currentEvent.description = value;
          break;
        case 'LOCATION':
          currentEvent.location = value;
          break;
      }
    }
  }
  
  return events;
}

function parseICalDate(dateStr) {
  // Simple iCal date parser (handles YYYYMMDDTHHMMSS format)
  if (!dateStr) return new Date().toISOString();
  
  const match = dateStr.match(/(\d{4})(\d{2})(\d{2})T?(\d{2})?(\d{2})?(\d{2})?/);
  if (match) {
    const [_, year, month, day, hour = '00', minute = '00', second = '00'] = match;
    return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`).toISOString();
  }
  
  return dateStr;
}
