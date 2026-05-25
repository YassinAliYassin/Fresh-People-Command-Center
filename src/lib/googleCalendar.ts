/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Event } from '../types';

interface GoogleEventDateTime {
  dateTime?: string;
  date?: string;
  timeZone?: string;
}

export interface GoogleCalendarEvent {
  id: string;
  summary?: string;
  description?: string;
  start?: GoogleEventDateTime;
  end?: GoogleEventDateTime;
  location?: string;
  extendedProperties?: {
    private?: {
      freshPeopleEventId?: string;
      clientId?: string;
      venueId?: string;
      staffIds?: string;
    };
  };
}

/**
 * Fetches events from primary Google Calendar
 */
export async function fetchGoogleCalendarEvents(
  token: string,
  timeMin: string = '2026-01-01T00:00:00Z',
  timeMax: string = '2026-12-31T23:59:59Z'
): Promise<GoogleCalendarEvent[]> {
  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(
    timeMin
  )}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime&maxResults=250`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Google API Server error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error('Failed to list Google Calendar events:', error);
    throw error;
  }
}

/**
 * Pushes a newly-designed local Event to the user's Google Calendar.
 */
export async function pushEventToGoogleCalendar(
  token: string,
  event: Event,
  clientName: string,
  venueName: string,
  venueAddress: string
): Promise<string> {
  const url = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

  // Construct ISO start & end strings in UTC/Z
  const startISO = `${event.date}T${event.startTime}:00`;
  const endISO = `${event.date}T${event.endTime}:00`;

  const body = {
    summary: event.title,
    description: `Fresh People Command Center Scheduled Event\n\nClient Partner: ${clientName}\nVenue Location: ${venueName} (${venueAddress})\n\nNotes: ${event.notes || 'No manual notes specified.'}`,
    location: venueAddress || venueName,
    start: {
      dateTime: startISO,
      timeZone: 'Europe/Paris', // Set corresponding client zone or let device locale determine
    },
    end: {
      dateTime: endISO,
      timeZone: 'Europe/Paris',
    },
    extendedProperties: {
      private: {
        freshPeopleEventId: event.id,
        clientId: event.clientId,
        venueId: event.venueId,
        staffIds: event.staffIds.join(','),
      },
    },
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorMsg = await response.text();
      throw new Error(`Insert failed: ${response.status} - ${errorMsg}`);
    }

    const createdEvent = await response.json();
    return createdEvent.id;
  } catch (error) {
    console.error('Failed to export event to Google Calendar:', error);
    throw error;
  }
}

/**
 * Deletes a synced event coordinates from Google Calendar
 */
export async function deleteEventFromGoogleCalendar(token: string, googleEventId: string): Promise<void> {
  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events/${googleEventId}`;

  try {
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok && response.status !== 404) {
      throw new Error(`Deletion failed: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Failed to delete Google Calendar reference:', error);
    throw error;
  }
}
