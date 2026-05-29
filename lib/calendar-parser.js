import ical from 'node-ical';
import { parseISO, format, isValid } from 'date-fns';
import { tz } from 'date-fns-tz';

const DEFAULT_TIMEZONE = 'Africa/Johannesburg';

export function parseCalendarEvents(icsText) {
  const events = [];
  let parsed;
  
  try {
    parsed = ical.parseICS(icsText);
  } catch (error) {
    console.error('[Calendar Parser] Failed to parse ICS:', error.message);
    return events;
  }

  for (const [key, value] of Object.entries(parsed)) {
    if (value.type !== 'VEVENT') continue;
    if (value.status === 'CANCELLED') continue; // Skip canceled

    try {
      const event = normalizeEvent(value);
      if (event) events.push(event);
    } catch (error) {
      console.warn(`[Calendar Parser] Skipping malformed event ${key}:`, error.message);
    }
  }

  return events;
}

function normalizeEvent(vevent) {
  const uid = vevent.uid || '';
  if (!uid) return null;

  // Handle summary/title
  const title = vevent.summary || 'Untitled Event';

  // Parse dates (handle timezone)
  let startAt, endAt;
  const tzid = vevent.start?.tz || vevent.timezone || DEFAULT_TIMEZONE;

  try {
    if (vevent.start?.date) {
      startAt = parseDate(vevent.start.date, tzid);
    } else if (vevent.dtstart) {
      startAt = parseDate(vevent.dtstart, tzid);
    }

    if (vevent.end?.date) {
      endAt = parseDate(vevent.end.date, tzid);
    } else if (vevent.dtend) {
      endAt = parseDate(vevent.dtend, tzid);
    }

    // Default end = start + 1 hour if missing
    if (startAt && !endAt) {
      endAt = new Date(startAt.getTime() + 60 * 60 * 1000);
    }

    if (!startAt) return null; // Malformed

    // Attendees
    const attendees = [];
    if (vevent.attendee) {
      const attendeeList = Array.isArray(vevent.attendee) ? vevent.attendee : [vevent.attendee];
      for (const att of attendeeList) {
        if (att.params?.cn) {
          attendees.push(att.params.cn);
        } else if (att.val) {
          attendees.push(att.val.replace('mailto:', ''));
        }
      }
    }

    // Description & Location
    const description = vevent.description || '';
    const location = vevent.location || '';

    // Recurrence (basic support)
    const recurrence = vevent.rrule ? vevent.rrule.toString() : null;

    return {
      uid,
      title,
      start_at: startAt.toISOString(),
      end_at: endAt.toISOString(),
      timezone: tzid,
      attendees,
      description: sanitizeText(description),
      location: sanitizeText(location),
      recurrence,
      source: 'icloud'
    };
  } catch (error) {
    throw new Error(`Event ${uid} normalization failed: ${error.message}`);
  }
}

function parseDate(dateObj, tzid) {
  if (dateObj instanceof Date) return dateObj;
  
  if (typeof dateObj === 'string') {
    const parsed = parseISO(dateObj);
    if (isValid(parsed)) return parsed;
  }

  // Handle ICAL.Date objects
  if (dateObj?.toJSDate) return dateObj.toJSDate();
  if (dateObj?.toISOString) return new Date(dateObj.toISOString());

  return null;
}

function sanitizeText(text) {
  if (!text) return '';
  return text
    .replace(/\\n/g, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .substring(0, 5000); // Prevent huge descriptions
}
