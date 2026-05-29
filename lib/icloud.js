import fetch from 'node-fetch';

export async function fetchICloudCalendar(icloudUrl) {
  if (!icloudUrl) {
    throw new Error('ICLOUD_CALENDAR_URL not configured');
  }

  try {
    const response = await fetch(icloudUrl, {
      headers: {
        'User-Agent': 'Fresh-People-Command-Center/1.0',
        'Accept': 'text/calendar, text/plain, */*'
      },
      timeout: 30000
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const text = await response.text();

    // Validate it's an iCalendar format
    if (!text.includes('BEGIN:VCALENDAR') || !text.includes('END:VCALENDAR')) {
      throw new Error('Invalid iCalendar format');
    }

    return text;
  } catch (error) {
    console.error('[iCloud Fetch Error]', error.message);
    throw new Error(`Failed to fetch iCloud calendar: ${error.message}`);
  }
}
