const caldav = require('caldav');

/**
 * Test connection to iCloud CalDAV and list available calendars
 * @returns {Promise<{connected: boolean, calendars?: Array, error?: string}>}
 */
async function testConnection() {
  const email = process.env.ICLOUD_EMAIL;
  const appPassword = process.env.ICLOUD_APP_PASSWORD;

  // Validate credentials
  if (!email || !appPassword) {
    return {
      connected: false,
      error: 'Missing required credentials: ICLOUD_EMAIL or ICLOUD_APP_PASSWORD'
    };
  }

  try {
    // Create CalDAV server instance for iCloud
    const server = caldav.createServer({
      url: 'https://caldav.icloud.com',
      username: email,
      password: appPassword,
    });

    // Test connection by fetching calendars
    const calendars = await server.getCalendars();
    
    // Mask password in any logs
    const safeEmail = email.replace(/(.{3}).+(@.+)/, '$1***$2');
    
    console.log(`Apple Calendar: Connected successfully as ${safeEmail}`);

    return {
      connected: true,
      calendars: calendars.map(cal => ({
        id: cal.href || cal.uid || cal.url,
        name: cal.summary || cal.displayName || 'Unnamed Calendar',
        description: cal.description || '',
        timezone: cal.timezone || 'UTC',
      })),
      user: safeEmail,
    };
  } catch (error) {
    // Mask sensitive data in error messages
    const safeError = error.message
      .replace(new RegExp(appPassword, 'g'), '****')
      .replace(new RegExp(email, 'g'), '****');
    
    console.error('Apple Calendar connection error:', safeError);
    
    return {
      connected: false,
      error: safeError,
    };
  }
}

module.exports = { testConnection };
