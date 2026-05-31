/**
 * Unified Calendar API
 * Fetches events from both Google Calendar and Apple Calendar (via Nylas)
 * Combined, sorted events for unified view
 */

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      error: 'Method not allowed. Use GET.' 
    });
  }

  try {
    const results = {
      google: { connected: false, events: [], error: null, calendars: [], count: 0 },
      apple: { connected: false, events: [], error: null, calendars: [], count: 0 },
      all: [],
      totalCount: 0,
      timestamp: new Date().toISOString()
    };

    // ========== GOOGLE CALENDAR ==========
    try {
      const serviceAccountBase64 = process.env.GOOGLE_SERVICE_ACCOUNT_BASE64;
      
      if (!serviceAccountBase64) {
        results.google.error = 'Google service account not configured';
      } else {
        // Decode service account
        const serviceAccount = JSON.parse(
          Buffer.from(serviceAccountBase64, 'base64').toString('utf8')
        );
        
        // Dynamic import googleapis
        const { google } = await import('googleapis');
        
        // Create JWT client
        const jwtClient = new google.auth.JWT(
          serviceAccount.client_email,
          null,
          serviceAccount.private_key,
          ['https://www.googleapis.com/auth/calendar.readonly']
        );
        
        await jwtClient.authorize();
        
        const calendar = google.calendar({ version: 'v3', auth: jwtClient });
        
        // Get calendar list
        const calendarList = await calendar.calendarList.list();
        const calendars = calendarList.data.items || [];
        
        // Fetch events from all calendars (last 30 days to next 90 days)
        const now = new Date();
        const timeMin = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const timeMax = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString();
        
        let allGoogleEvents = [];
        
        for (const cal of calendars) {
          try {
            const eventsResponse = await calendar.events.list({
              calendarId: cal.id,
              timeMin: timeMin,
              timeMax: timeMax,
              maxResults: 100,
              singleEvents: true,
              orderBy: 'startTime'
            });
            
            const events = (eventsResponse.data.items || []).map(event => ({
              id: event.id,
              title: event.summary || 'Untitled Event',
              start: event.start?.dateTime || event.start?.date || null,
              end: event.end?.dateTime || event.end?.date || null,
              description: event.description || '',
              location: event.location || '',
              calendar: cal.summary || 'Unknown Calendar',
              calendarId: cal.id,
              source: 'google',
              color: '#4285F4' // Google blue
            }));
            
            allGoogleEvents.push(...events);
          } catch (e) {
            console.error(`[Google] Error fetching ${cal.summary}:`, e.message);
          }
        }
        
        results.google = {
          connected: true,
          events: allGoogleEvents,
          error: null,
          calendars: calendars.map(c => ({ id: c.id, name: c.summary })),
          count: allGoogleEvents.length
        };
      }
    } catch (error) {
      console.error('[Unified] Google Calendar error:', error.message);
      results.google.error = error.message;
    }

    // ========== APPLE CALENDAR (via Nylas) ==========
    try {
      const nylasApiKey = process.env.NYLAS_API_KEY;
      const nylasGrantId = process.env.NYLAS_GRANT_ID;
      
      if (!nylasApiKey || !nylasGrantId) {
        results.apple.error = 'Nylas API key or Grant ID not configured';
      } else {
        // Fetch calendars from Nylas
        const calendarsResponse = await fetch(
          `https://api.us.nylas.com/v3/grants/${nylasGrantId}/calendars`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${nylasApiKey}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        if (!calendarsResponse.ok) {
          const errorText = await calendarsResponse.text();
          throw new Error(`Nylas API error: ${calendarsResponse.status} - ${errorText}`);
        }
        
        const calendarsData = await calendarsResponse.json();
        const calendars = calendarsData.data || [];
        
        // Fetch events from all calendars
        const now = new Date();
        const startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const endTime = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString();
        
        let allAppleEvents = [];
        
        for (const calendar of calendars) {
          try {
            const eventsResponse = await fetch(
              `https://api.us.nylas.com/v3/grants/${nylasGrantId}/events?calendar_id=${calendar.id}&start_time=${startTime}&end_time=${endTime}&limit=100`,
              {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${nylasApiKey}`,
                  'Content-Type': 'application/json'
                }
              }
            );
            
            if (eventsResponse.ok) {
              const eventsData = await eventsResponse.json();
              const events = (eventsData.data || []).map(event => ({
                id: event.id,
                title: event.title || 'Untitled Event',
                start: event.when?.start_time ? new Date(event.when.start_time * 1000).toISOString() : null,
                end: event.when?.end_time ? new Date(event.when.end_time * 1000).toISOString() : null,
                description: event.description || '',
                location: event.location || '',
                calendar: calendar.name,
                calendarId: calendar.id,
                source: 'apple',
                color: '#34C759' // Apple green
              }));
              allAppleEvents.push(...events);
            }
          } catch (e) {
            console.error(`[Nylas] Error fetching ${calendar.name}:`, e.message);
          }
        }
        
        results.apple = {
          connected: true,
          events: allAppleEvents,
          error: null,
          calendars: calendars.map(c => ({ id: c.id, name: c.name })),
          count: allAppleEvents.length
        };
      }
    } catch (error) {
      console.error('[Unified] Apple Calendar (Nylas) error:', error.message);
      results.apple.error = error.message;
    }

    // ========== COMBINE & SORT ==========
    const allEvents = [
      ...(results.google.events || []),
      ...(results.apple.events || [])
    ];
    
    // Sort by start date
    allEvents.sort((a, b) => {
      const dateA = new Date(a.start || 0);
      const dateB = new Date(b.start || 0);
      return dateA - dateB;
    });
    
    results.all = allEvents;
    results.totalCount = allEvents.length;
    
    return res.status(200).json(results);
    
  } catch (error) {
    console.error('[Unified Calendar] Error:', error.message);
    return res.status(500).json({
      error: `Unified Calendar error: ${error.message}`,
      google: { connected: false, events: [], error: 'Failed to fetch' },
      apple: { connected: false, events: [], error: 'Failed to fetch' },
      all: []
    });
  }
}