// Nylas Calendar API endpoint (Vercel serverless function)
// Uses existing NYLAS_API_KEY and NYLAS_GRANT_ID from Vercel env vars

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const apiKey = process.env.NYLAS_API_KEY;
    const grantId = process.env.NYLAS_GRANT_ID;

    if (!apiKey || !grantId) {
      return res.status(500).json({ 
        error: 'Missing Nylas credentials',
        hasCredentials: false 
      });
    }

    const authHeader = `Bearer ${apiKey}`;
    const baseUrl = 'https://api.us.nylas.com/v3';

    // GET - Fetch events from Apple Calendar via Nylas
    if (req.method === 'GET') {
      const startTime = Math.floor(Date.now() / 1000);
      const endTime = Math.floor((Date.now() + 30 * 24 * 60 * 60 * 1000) / 1000);

      const response = await fetch(
        `${baseUrl}/grants/${grantId}/events?start_time=${startTime}&end_time=${endTime}&limit=100`,
        {
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Nylas API error:', errorText);
        return res.status(response.status).json({ 
          error: 'Failed to fetch events from Nylas',
          details: errorText 
        });
      }

      const data = await response.json();
      
      return res.status(200).json({
        success: true,
        hasCredentials: true,
        events: (data.data || []).map(event => ({
          id: event.id,
          title: event.title || 'Untitled Event',
          start: event.when?.start_time ? new Date(event.when.start_time * 1000).toISOString() : new Date().toISOString(),
          end: event.when?.end_time ? new Date(event.when.end_time * 1000).toISOString() : new Date().toISOString(),
          description: event.description || '',
          location: event.location || '',
          participants: event.participants || []
        })),
        count: data.data?.length || 0
      });
    }

    // POST - Add event to Apple Calendar via Nylas
    if (req.method === 'POST') {
      const { title, start, end, description, location } = req.body;

      const eventData = {
        title: title || 'New Event',
        when: {
          start_time: Math.floor(new Date(start).getTime() / 1000),
          end_time: Math.floor(new Date(end).getTime() / 1000)
        },
        description: description || '',
        location: location || ''
      };

      const response = await fetch(
        `${baseUrl}/grants/${grantId}/events`,
        {
          method: 'POST',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(eventData)
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Nylas POST error:', errorText);
        return res.status(response.status).json({ 
          error: 'Failed to create event',
          details: errorText 
        });
      }

      const data = await response.json();
      
      return res.status(200).json({
        success: true,
        eventId: data.data?.id,
        message: 'Event added to Apple Calendar via Nylas'
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Nylas Calendar API error:', error);
    return res.status(500).json({ 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
