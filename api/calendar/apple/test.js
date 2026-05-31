import { testConnection } from '../../lib/calendar/apple/index.js';

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      connected: false, 
      error: 'Method not allowed. Use GET.' 
    });
  }

  try {
    const result = await testConnection();
    return res.status(200).json(result);
  } catch (error) {
    // Mask any accidental secret exposure in errors
    const safeError = (error.message || 'Unknown error')
      .replace(/ICLOUD_APP_PASSWORD/gi, '****')
      .replace(process.env.ICLOUD_APP_PASSWORD || 'dummy', '****');
    
    console.error('Apple Calendar Test Endpoint Error:', safeError);
    
    return res.status(500).json({
      connected: false,
      error: 'Internal server error during connection test'
    });
  }
}