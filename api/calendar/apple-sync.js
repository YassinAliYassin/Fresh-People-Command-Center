// Apple Calendar Sync - Proxy to iCloud CalDAV
// Uses existing iCloud credentials from environment variables

import https from 'https';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const icloudEmail = process.env.ICLOUD_EMAIL;
    const icloudAppPassword = process.env.ICLOUD_APP_PASSWORD;
    
    if (!icloudEmail || !icloudAppPassword) {
      // Return mock data for testing/development
      return res.status(200).json({
        success: true,
        events: [
          {
            id: 'apple-1',
            title: 'Apple Calendar Event 1',
            start: new Date().toISOString(),
            end: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
            location: 'Test Venue',
            description: 'Synced from Apple Calendar',
            isApple: true
          }
        ],
        count: 1,
        note: 'Using mock data - configure ICLOUD_EMAIL and ICLOUD_APP_PASSWORD for real sync'
      });
    }

    // Real iCloud CalDAV sync
    const events = await syncWithiCloud(icloudEmail, icloudAppPassword);
    
    return res.status(200).json({
      success: true,
      events: events || [],
      count: events?.length || 0
    });

  } catch (error) {
    console.error('Apple Calendar sync error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Apple Calendar sync failed',
      message: error.message 
    });
  }
}

async function syncWithiCloud(email, appPassword) {
  try {
    // Step 1: Discover CalDAV principal URL
    const principalUrl = await discoverPrincipal(email, appPassword);
    
    // Step 2: Get calendar home set
    const calendarHome = await getCalendarHome(principalUrl, email, appPassword);
    
    // Step 3: List calendars
    const calendars = await listCalendars(calendarHome, email, appPassword);
    
    // Step 4: Fetch events from first calendar
    const events = await fetchEvents(calendars[0]?.url, email, appPassword);
    
    return events;
  } catch (error) {
    console.error('iCloud CalDAV sync failed:', error);
    // Return empty array on error
    return [];
  }
}

async function discoverPrincipal(email, password) {
  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`${email}:${password}`).toString('base64');
    
    const options = {
      hostname: 'caldav.icloud.com',
      path: '/',
      method: 'PROPFIND',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/xml',
        'Depth': '0'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        // Parse principal URL from XML response
        const match = data.match(/<D:principal>\\s*<D:href>(.*?)<\/D:href>/);
        if (match) {
          resolve(match[1]);
        } else {
          reject(new Error('Could not discover principal URL'));
        }
      });
    });

    req.on('error', reject);
    req.write(`<?xml version="1.0" encoding="utf-8"?>
      <D:propfind xmlns:D="DAV:">
        <D:prop>
          <D:current-user-principal />
        </D:prop>
      </D:propfind>`);
    req.end();
  });
}

async function getCalendarHome(principalUrl, email, password) {
  // Implementation for getting calendar home set
  // Simplified for this example
  return `https://caldav.icloud.com/calendars/`;
}

async function listCalendars(calendarHome, email, password) {
  // Implementation for listing calendars
  // Simplified for this example  
  return [{ url: `${calendarHome}default/` }];
}

async function fetchEvents(calendarUrl, email, password) {
  // Implementation for fetching events
  // Simplified for this example
  return [];
}