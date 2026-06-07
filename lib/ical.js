// Shared iCal parser & iCloud fetcher for FPCC
// Used by: api/calendar.js, api/calendar/apple.js, server.js, sync-icloud cron
// Single source of truth for ICS handling (DRY).

import ical from 'node-ical';

const DEFAULT_TIMEZONE = 'Africa/Johannesburg';

// Default iCloud URL (publicly published Fresh People calendar).
// Used as fallback when ICLOUD_CALENDAR_URL env var is not set.
// Regenerate from: Apple Calendar → Share Calendar → Public Calendar
export const DEFAULT_ICLOUD_URL = 'https://p56-caldav.icloud.com/published/2/MjA3NTMxODM0NzYyMDc1M_MJWBML9PYYcak11gdiRE00jIWbogtgWyD9NtdzTpGoU6oXGhtZYzSDjGnia66w7NxkexZbSwm_tUVl14qv7-g';

/**
 * Fetch raw iCal text from an iCloud published calendar URL.
 * Adds UA header (some CalDAV servers reject default Node fetch UA).
 */
export async function fetchICalendar(icloudUrl, { timeout = 25000 } = {}) {
  if (!icloudUrl) {
    throw new Error('iCloud URL not configured');
  }

  // Vercel/Node 18+ have global fetch. We also need AbortController.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(icloudUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Fresh-People-Command-Center/1.0',
        'Accept': 'text/calendar, text/plain, */*',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`iCloud fetch HTTP ${response.status}: ${response.statusText}`);
    }

    const text = await response.text();

    if (!text.includes('BEGIN:VCALENDAR') || !text.includes('END:VCALENDAR')) {
      throw new Error('Invalid iCalendar format (missing VCALENDAR wrapper)');
    }

    return text;
  } catch (err) {
    // Re-throw with more context for debugging
    if (err.name === 'AbortError') {
      throw new Error(`iCloud fetch timed out after ${timeout}ms (URL: ${icloudUrl.substring(0, 60)}...)`);
    }
    throw new Error(`iCloud fetch failed: ${err.message} (URL: ${icloudUrl.substring(0, 60)}...)`);
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Parse iCal text into normalized event objects.
 * Uses node-ical for robust RFC 5545 parsing.
 * Returns array of { uid, title, start, end, source, ... } in ISO 8601 UTC.
 */
export function parseICalendar(icsText) {
  if (!icsText) return [];
  const events = [];
  let parsed;
  try {
    parsed = ical.parseICS(icsText);
  } catch (err) {
    console.error('[iCal] parseICS failed:', err.message);
    return events;
  }

  for (const [key, value] of Object.entries(parsed)) {
    if (value.type !== 'VEVENT') continue;
    if (value.status === 'CANCELLED') continue;

    try {
      const event = normalizeEvent(value);
      if (event) events.push(event);
    } catch (err) {
      console.warn(`[iCal] Skipping event ${key}:`, err.message);
    }
  }
  return events;
}

function normalizeEvent(vevent) {
  const uid = vevent.uid;
  if (!uid) return null;

  const start = toDate(vevent.start);
  const end = toDate(vevent.end) || (start ? new Date(start.getTime() + 60 * 60 * 1000) : null);
  if (!start) return null;

  return {
    id: uid,
    uid,
    title: vevent.summary || 'Untitled Event',
    start: start.toISOString(),
    end: end.toISOString(),
    location: vevent.location || '',
    description: sanitizeText(vevent.description || ''),
    attendees: extractAttendees(vevent.attendee),
    source: 'icloud',
    dressCode: 'Formal All Black',
    clientName: '',
    staff_assigned: '',
  };
}

function toDate(dateObj) {
  if (!dateObj) return null;
  if (dateObj instanceof Date) return dateObj;
  if (dateObj?.toJSDate) return dateObj.toJSDate();
  if (typeof dateObj === 'string') {
    const d = new Date(dateObj);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function extractAttendees(att) {
  if (!att) return [];
  const list = Array.isArray(att) ? att : [att];
  return list
    .map(a => a.params?.cn || a.val?.replace('mailto:', ''))
    .filter(Boolean);
}

function sanitizeText(text) {
  if (!text) return '';
  return String(text)
    .replace(/\\n/g, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .substring(0, 5000);
}

/**
 * Convenience: fetch + parse in one call.
 */
export async function fetchAndParseICalendar(icloudUrl) {
  const text = await fetchICalendar(icloudUrl);
  return parseICalendar(text);
}
