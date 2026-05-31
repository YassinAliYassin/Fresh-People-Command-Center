export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      connected: false, 
      error: 'Method not allowed. Use GET.' 
    });
  }

  try {
    // Call the Apple Calendar API server on VPS
    const apiUrl = process.env.APPLE_CALENDAR_API_URL 
      || 'https://solidai.solidsolutions.africa/apple-calendar/api/calendar/apple/test';
    
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Fresh-People-Command-Center'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeout);
    
    if (!response.ok) {
      throw new Error(`VPS API returned ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    // Log success (mask secrets)
    console.log('[Apple Calendar] Connected:', result.connected);
    console.log('[Apple Calendar] User:', result.user);
    console.log('[Apple Calendar] Calendars:', result.calendars?.length || 0);
    
    return res.status(200).json(result);
  } catch (error) {
    console.error('[Apple Calendar] Error:', error.message);
    
    // Check if it's a timeout
    const isTimeout = error.name === 'AbortError';
    const errorMsg = isTimeout 
      ? 'Request to Apple Calendar API timed out after 30s' 
      : `Failed to reach Apple Calendar API: ${error.message}`;
    
    return res.status(200).json({
      connected: false,
      error: errorMsg,
      calendars: [],
      debug: {
        apiUrl: process.env.APPLE_CALENDAR_API_URL || 'default VPS endpoint',
        errorType: error.name || 'unknown'
      }
    });
  }
}