/**
 * Google Calendar API endpoint
 * Fetches calendars and events using Google OAuth
 */

import { google } from 'googleapis';

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      connected: false, 
      error: 'Method not allowed. Use GET.' 
    });
  }

  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

    if (!clientId || !clientSecret || !refreshToken) {
      return res.status(200).json({
        connected: false,
        error: 'Google OAuth credentials not configured. Please set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN.',
        calendars: [],
        events: [],
        source: 'google'
      });
    }

    // Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      'https://fresh-people-command-center.vercel.app/api/auth/google/callback'
    );

    oauth2Client.setCredentials({
      refresh_token: refreshToken
    });

    // Create Calendar client
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Fetch calendar list
    const calendarsResponse = await calendar.calendarList.list();
    const calendars = calendarsResponse.data.items || [];

    // Fetch events from all calendars (last 30 days to next 90 days)
    const now = new Date();
    const timeMin = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const timeMax = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString();

    let allEvents = [];

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
          start: event.start?.dateTime || event.start?.date,
          end: event.end?.dateTime || event.end?.date,
          description: event.description || '',
          location: event.location || '',
          calendar: cal.summary || cal.id,
          calendarId: cal.id,
          source: 'google',
          sourceType: 'google',
          htmlLink: event.htmlLink
        }));

        allEvents.push(...events);
      } catch (e) {
        console.error(`[Google Calendar] Error fetching events for ${cal.summary}:`, e.message);
      }
    }

    return res.status(200).json({
      connected: true,
      user: 'Google Account',
      calendars: calendars.map(c => ({ id: c.id, name: c.summary })),
      events: allEvents,
      count: allEvents.length,
      source: 'google'
    });

  } catch (error) {
    console.error('[Google Calendar] Error:', error.message);
    return res.status(200).json({
      connected: false,
      error: `Google Calendar API error: ${error.message}`,
      calendars: [],
      events: [],
      source: 'google'
    });
  }
}
