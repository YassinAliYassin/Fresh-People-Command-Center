// Google Calendar API endpoint (Vercel serverless function)
import { google } from 'googleapis';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Parse service account from base64 env var
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_BASE64) {
      return res.status(500).json({ error: 'Missing GOOGLE_SERVICE_ACCOUNT_BASE64' });
    }

    const serviceAccount = JSON.parse(
      Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_BASE64, 'base64').toString()
    );

    // Authenticate with Google
    const jwtClient = new google.auth.JWT({
      email: serviceAccount.client_email,
      key: serviceAccount.private_key,
      scopes: ['https://www.googleapis.com/auth/calendar']
    });

    await jwtClient.authorize();
    const calendar = google.calendar({ version: 'v3', auth: jwtClient });

    // Get events from Google Calendar (next 30 days)
    if (req.method === 'GET') {
      const response = await calendar.events.list({
        calendarId: 'primary', // Use your Google Calendar ID here
        timeMin: new Date().toISOString(),
        timeMax: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        singleEvents: true,
        orderBy: 'startTime'
      });

      return res.status(200).json({
        success: true,
        events: response.data.items.map(event => ({
          id: event.id,
          title: event.summary,
          start: event.start.dateTime || event.start.date,
          end: event.end.dateTime || event.end.date,
          description: event.description
        }))
      });
    }

    // Add event to Google Calendar
    if (req.method === 'POST') {
      const { title, start, end, description } = req.body;
      
      const response = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: {
          summary: title,
          start: { dateTime: start },
          end: { dateTime: end },
          description: description || ''
        }
      });

      return res.status(200).json({
        success: true,
        eventId: response.data.id
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Google Calendar API error:', error);
    return res.status(500).json({ error: error.message });
  }
}
