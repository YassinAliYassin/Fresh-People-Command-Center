/**
 * Unified Calendar API
 * Provides Apple Calendar events via Nylas (serverless)
 * Google Calendar is handled client-side via OAuth (see /src/lib/googleCalendar.ts)
 */

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      error: 'Method not allowed. Use GET.' 
    });
  }

  try {
    const result = {
      google: { 
        connected: false, 
        events: [], 
        error: 'Google Calendar fetched client-side via OAuth. See /src/lib/googleCalendar.ts',
        note: 'Use browser OAuth token to fetch Google Calendar events directly.'
      },
      apple: { connected: false, events: [], error: null, calendars: [], count: 0 },
      all: [],
      totalCount: 0,
      timestamp: new Date().toISOString()
    };

    // ========== APPLE CALENDAR (via Nylas) ==========
    try {
      const nylasApiKey = process.env.NYLAS_API_KEY;
      const nylasGrantId = process.env.NYLAS_GRANT_ID;
      
      if (!nylasApiKey || !nylasGrantId) {
        result.apple.error = 'Nylas not configured. Connect iCloud at: https://dashboard.nylas.com';
        result.apple.setupUrl = 'https://dashboard.nylas.com';
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
        
        // Fetch events from all calendars (last 30 days to next 90 days)
        const now = new Date();
        const startTime = Math.floor((now.getTime() - 30 * 24 * 60 * 60 * 1000) / 1000);
        const endTime = Math.floor((now.getTime() + 90 * 24 * 60 * 60 * 1000) / 1000);
        
        let allAppleEvents = [];
        
        for (const calendar of calendars) {
          try {
            const eventsResponse = await fetch(
              `https://api.us.nylas.com/v3/grants/${nylasGrantId}/events?calendar_id=${calendar.id}&start_time=${startTime}&end_time=${endTime}&limit=250`,
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
                sourceType: 'nylas',
                color: '#34C759'
              }));
              allAppleEvents.push(...events);
            }
          } catch (e) {
            console.error(`[Nylas] Error fetching ${calendar.name}:`, e.message);
          }
        }
        
        result.apple = {
          connected: true,
          events: allAppleEvents,
          error: null,
          calendars: calendars.map(c => ({ id: c.id, name: c.name })),
          count: allAppleEvents.length
        };
      }
    } catch (error) {
      console.error('[Unified] Apple Calendar (Nylas) error:', error.message);
      result.apple.error = error.message;
    }

    // ========== COMBINE (Apple events only - Google fetched client-side) ==========
    result.all = result.apple.events || [];
    result.totalCount = result.all.length;
    
    return res.status(200).json(result);
    
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