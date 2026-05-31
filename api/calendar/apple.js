/**
 * Apple Calendar via Nylas API
 * Replaces local VPS server approach with serverless Nylas cloud API
 */

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      connected: false, 
      error: 'Method not allowed. Use GET.' 
    });
  }

  try {
    const nylasApiKey = process.env.NYLAS_API_KEY;
    const nylasGrantId = process.env.NYLAS_GRANT_ID;
    
    if (!nylasApiKey || !nylasGrantId) {
      return res.status(200).json({
        connected: false,
        error: 'Nylas API key or Grant ID not configured. Please set NYLAS_API_KEY and NYLAS_GRANT_ID environment variables.',
        calendars: [],
        events: [],
        source: 'nylas'
      });
    }

    // Fetch calendars from Nylas
    const calendarsResponse = await fetch(
      `https://api.nylas.com/v3/grants/${nylasGrantId}/calendars`,
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
    const startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const endTime = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString();

    let allEvents = [];

    for (const calendar of calendars) {
      try {
        const eventsResponse = await fetch(
          `https://api.nylas.com/v3/grants/${nylasGrantId}/events?calendar_id=${calendar.id}&start_time=${startTime}&end_time=${endTime}&limit=100`,
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
            sourceType: 'nylas'
          }));
          allEvents.push(...events);
        }
      } catch (e) {
        console.error(`[Nylas] Error fetching events for calendar ${calendar.name}:`, e.message);
      }
    }

    return res.status(200).json({
      connected: true,
      user: 'yassin.ali@freshpeople.co.za',
      calendars: calendars.map(c => ({ id: c.id, name: c.name })),
      events: allEvents,
      count: allEvents.length,
      source: 'nylas'
    });

  } catch (error) {
    console.error('[Apple Calendar Nylas] Error:', error.message);
    return res.status(200).json({
      connected: false,
      error: `Nylas API error: ${error.message}`,
      calendars: [],
      events: [],
      source: 'nylas'
    });
  }
}
