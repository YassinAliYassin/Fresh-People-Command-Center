import { google } from 'googleapis';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Decode service account from base64
    const serviceAccount = JSON.parse(
      Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_BASE64, 'base64').toString()
    );

    // Use GoogleAuth for service account
    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccount,
      scopes: ['https://www.googleapis.com/auth/calendar']
    });

    const calendar = google.calendar({ version: 'v3', auth });

    const event = req.body;

    const calendarEvent = {
      summary: event.title,
      description: `Staff: ${event.staff_assigned?.join(', ') || 'TBD'}\nDress: ${event.dressCode || 'All Black'}\nArrival: ${event.arrivalTime || '1hr before'}`,
      start: {
        dateTime: event.date,
        timeZone: 'Africa/Harare'
      },
      end: {
        dateTime: new Date(new Date(event.date).getTime() + (event.duration || 4) * 60 * 60 * 1000).toISOString(),
        timeZone: 'Africa/Harare'
      },
      reminders: {
        useDefault: true
      }
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      resource: calendarEvent
    });

    return res.json({
      success: true,
      googleEventId: response.data.id,
      message: 'Event synced to Google Calendar'
    });

  } catch (error) {
    console.error('Google Calendar API error:', error);
    return res.status(500).json({ error: error.message || 'Failed to sync to Google Calendar' });
  }
}
