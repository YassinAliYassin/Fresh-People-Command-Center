/**
 * Unified Calendar API
 * Fetches events from both Google Calendar and Apple Calendar (via Nylas)
 * Returns combined, sorted events for unified view
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
      google: { connected: false, events: [], error: null },
      apple: { connected: false, events: [], error: null },
      all: []
    };

    // Fetch Google Calendar events
    try {
      const googleApiUrl = `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}/api/calendar/google`;
      const googleResponse = await fetch(googleApiUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (googleResponse.ok) {
        const googleData = await googleResponse.json();
        results.google = {
          connected: googleData.connected || false,
          events: googleData.events || [],
          error: googleData.error || null,
          calendars: googleData.calendars || [],
          count: (googleData.events || []).length
        };
      } else {
        results.google.error = `HTTP ${googleResponse.status}`;
      }
    } catch (error) {
      console.error('[Unified] Google Calendar fetch error:', error.message);
      results.google.error = error.message;
    }

    // Fetch Apple Calendar events (via Nylas)
    try {
      const appleApiUrl = `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}/api/calendar/apple`;
      const appleResponse = await fetch(appleApiUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (appleResponse.ok) {
        const appleData = await appleResponse.json();
        results.apple = {
          connected: appleData.connected || false,
          events: appleData.events || [],
          error: appleData.error || null,
          calendars: appleData.calendars || [],
          count: (appleData.events || []).length
        };
      } else {
        results.apple.error = `HTTP ${appleResponse.status}`;
      }
    } catch (error) {
      console.error('[Unified] Apple Calendar fetch error:', error.message);
      results.apple.error = error.message;
    }

    // Combine and sort all events
    const allEvents = [
      ...(results.google.events || []).map(e => ({ ...e, source: 'google' })),
      ...(results.apple.events || []).map(e => ({ ...e, source: 'apple' }))
    ];

    // Sort by start date
    allEvents.sort((a, b) => {
      const dateA = new Date(a.start || 0);
      const dateB = new Date(b.start || 0);
      return dateA - dateB;
    });

    results.all = allEvents;
    results.totalCount = allEvents.length;
    results.timestamp = new Date().toISOString();

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
