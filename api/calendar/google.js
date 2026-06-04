// Google Calendar API - Ultra Lightweight
// Uses only built-in Node.js modules (no npm packages)
// Requires: GOOGLE_SERVICE_ACCOUNT_BASE64 in Vercel env vars

import crypto from 'crypto';
import https from 'https';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_BASE64) {
      return res.status(500).json({ error: 'Missing GOOGLE_SERVICE_ACCOUNT_BASE64' });
    }

    const serviceAccount = JSON.parse(
      Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_BASE64, 'base64').toString()
    );

    // Get access token using JWT
    const token = await getAccessToken(serviceAccount);
    
    const calendarId = 'primary';
    const baseUrl = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}`;

    // GET - Fetch events
    if (req.method === 'GET') {
      const timeMin = new Date().toISOString();
      const timeMax = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      
      const url = `${baseUrl}/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`;
      
      const data = await fetchGoogleAPI(url, token);
      
      return res.status(200).json({
        success: true,
        events: (data.items || []).map(event => ({
          id: event.id,
          title: event.summary || 'Untitled',
          start: event.start?.dateTime || event.start?.date,
          end: event.end?.dateTime || event.end?.date,
          description: event.description || '',
          location: event.location || ''
        })),
        count: data.items?.length || 0
      });
    }

    // POST - Create event
    if (req.method === 'POST') {
      const { title, start, end, description, location } = req.body;
      
      const event = {
        summary: title || 'New Event',
        start: { dateTime: new Date(start).toISOString() },
        end: { dateTime: new Date(end).toISOString() },
        description: description || '',
        location: location || ''
      };
      
      const url = `${baseUrl}/events`;
      const data = await fetchGoogleAPI(url, token, 'POST', event);
      
      return res.status(200).json({
        success: true,
        eventId: data.id,
        message: 'Event created in Google Calendar ✓'
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ error: error.message });
  }
}

// Helper: Fetch Google API with token
function fetchGoogleAPI(url, token, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      method: method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };
    
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });
    
    req.on('error', reject);
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    
    req.end();
  });
}

// Helper: Get Google access token using JWT
async function getAccessToken(serviceAccount) {
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  
  const claim = {
    iss: serviceAccount.client_email,
    sub: serviceAccount.client_email,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/calendar'
  };
  
  const encodedHeader = base64urlEncode(JSON.stringify(header));
  const encodedClaim = base64urlEncode(JSON.stringify(claim));
  const signatureInput = `${encodedHeader}.${encodedClaim}`;
  
  const privateKey = serviceAccount.private_key;
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(signatureInput);
  sign.end();
  const signature = sign.sign(privateKey);
  
  const encodedSignature = base64urlEncode(signature);
  const jwt = `${signatureInput}.${encodedSignature}`;
  
  // Exchange JWT for access token
  const tokenData = await postToGoogle(jwt);
  return tokenData.access_token;
}

function postToGoogle(jwt) {
  return new Promise((resolve, reject) => {
    const postData = new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    }).toString();
    
    const options = {
      hostname: 'oauth2.googleapis.com',
      path: '/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': postData.length
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    });
    
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function base64urlEncode(data) {
  if (typeof data === 'string') {
    data = Buffer.from(data);
  }
  return Buffer.from(data).toString('base64url');
}
