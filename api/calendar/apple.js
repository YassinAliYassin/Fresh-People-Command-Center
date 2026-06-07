// Apple Calendar API - iCloud public feed
// Uses shared lib/ical.js for parsing (DRY: single source of truth)

import { fetchAndParseICalendar, parseICalendar } from '../../lib/ical.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  // Allow query override (handy for testing different feeds)
  const icloudUrl = req.query.url || process.env.ICLOUD_CALENDAR_URL;

  if (!icloudUrl) {
    return res.status(200).json({
      success: false,
      events: [],
      count: 0,
      error: 'ICLOUD_CALENDAR_URL not configured. Set env var or pass ?url=...',
      hint: 'Get the URL from iCloud Calendar → Share Calendar → Public Calendar',
    });
  }

  try {
    const events = await fetchAndParseICalendar(icloudUrl);
    return res.status(200).json({
      success: true,
      events,
      count: events.length,
    });
  } catch (error) {
    console.error('[Apple Calendar] sync error:', error);
    return res.status(500).json({
      success: false,
      events: [],
      count: 0,
      error: error.message,
    });
  }
}
