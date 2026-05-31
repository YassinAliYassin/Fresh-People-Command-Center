const https = require('https');
const http = require('http');
const { Buffer } = require('buffer');

// Mask secrets in logs
function maskEmail(email) {
  if (!email) return '***';
  const parts = email.split('@');
  if (parts.length < 2) return '***';
  return parts[0].substring(0, 3) + '***@' + parts[1];
}

// Simple XML parser for CalDAV
function parseMultiStatus(xmlText) {
  const responses = [];
  const responseRegex = /<response[^>]*>([\s\S]*?)<\/response>/g;
  let match;
  while ((match = responseRegex.exec(xmlText)) !== null) {
    const responseXml = match[1];
    const hrefMatch = responseXml.match(/<href[^>]*>([\s\S]*?)<\/href>/);
    const href = hrefMatch ? hrefMatch[1].trim() : '';
    const propstatRegex = /<propstat[^>]*>([\s\S]*?)<\/propstat>/g;
    let propMatch;
    while ((propMatch = propstatRegex.exec(responseXml)) !== null) {
      const propXml = propMatch[1];
      const statusMatch = propXml.match(/<status[^>]*>([\s\S]*?)<\/status>/);
      const status = statusMatch ? statusMatch[1].trim() : '';
      if (status.includes('200 OK')) {
        const propContentMatch = propXml.match(/<prop[^>]*>([\s\S]*?)<\/prop>/);
        if (propContentMatch) {
          responses.push({ href: href, prop: propContentMatch[1] });
        }
      }
    }
  }
  return responses;
}

function getTagContent(xml, tag) {
  const regex = new RegExp('<' + tag + '[^>]*>([\\s\\S]*?)<\\/' + tag + '>');
  const match = xml.match(regex);
  return match ? match[1].trim() : '';
}

// CalDAV request with timeout
function caldavRequest(url, body, depth, email, password, timeoutMs) {
  timeoutMs = timeoutMs || 10000; // 10 second timeout
  return new Promise((resolve, reject) => {
    const auth = 'Basic ' + Buffer.from(email + ':' + password).toString('base64');
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + (urlObj.search || ''),
      method: 'PROPFIND',
      headers: {
        'Depth': depth || '0',
        'Content-Type': 'application/xml',
        'Authorization': auth,
        'Content-Length': Buffer.byteLength(body)
      },
      timeout: timeoutMs
    };
    
    const lib = urlObj.protocol === 'https:' ? https : http;
    const req = lib.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data);
        } else {
          reject(new Error('HTTP ' + res.statusCode + ': ' + data.substring(0, 200)));
        }
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout after ' + timeoutMs + 'ms'));
    });
    req.write(body);
    req.end();
  });
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ connected: false, error: 'Method not allowed' });
  }

  const email = process.env.ICLOUD_EMAIL;
  const appPassword = process.env.ICLOUD_APP_PASSWORD;
  
  if (!email || !appPassword) {
    return res.status(200).json({ connected: false, error: 'Missing credentials' });
  }

  try {
    // Step 1: Get principal
    const principalXml = await caldavRequest('https://caldav.icloud.com', 
      '<?xml version="1.0"?><propfind xmlns="DAV:"><prop><current-user-principal/></prop></propfind>', 
      '0', email, appPassword, 10000);
    
    const principalResponses = parseMultiStatus(principalXml);
    if (!principalResponses.length) throw new Error('No principal response');
    
    let principalHref = '';
    const principalProp = principalResponses[0].prop;
    const principalContent = getTagContent(principalProp, 'current-user-principal');
    if (principalContent) {
      const hrefMatch = principalContent.match(/<href[^>]*>([\s\S]*?)<\/href>/);
      principalHref = hrefMatch ? hrefMatch[1].trim() : '';
    }
    if (!principalHref) throw new Error('No principal href');
    
    // Step 2: Get calendar home
    const principalUrl = principalHref.startsWith('http') 
      ? principalHref 
      : 'https://caldav.icloud.com' + principalHref;
    
    const homeXml = await caldavRequest(principalUrl, 
      '<?xml version="1.0"?><propfind xmlns="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav"><prop><C:calendar-home-set/></prop></propfind>', 
      '0', email, appPassword, 10000);
    
    const homeResponses = parseMultiStatus(homeXml);
    if (!homeResponses.length) throw new Error('No home response');
    
    let calendarHome = '';
    const homeProp = homeResponses[0].prop;
    const homeSetContent = getTagContent(homeProp, 'calendar-home-set');
    if (homeSetContent) {
      const hrefMatch = homeSetContent.match(/<href[^>]*>([\s\S]*?)<\/href>/);
      calendarHome = hrefMatch ? hrefMatch[1].trim() : '';
    }
    if (!calendarHome) throw new Error('No calendar home');
    
    // Step 3: List calendars
    const calendarsUrl = calendarHome.startsWith('http') 
      ? calendarHome 
      : 'https://caldav.icloud.com' + calendarHome;
    
    const calendarsXml = await caldavRequest(calendarsUrl, 
      '<?xml version="1.0"?><propfind xmlns="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav"><prop><displayname/><resourcetype/></prop></propfind>', 
      '1', email, appPassword, 15000);
    
    const calResponses = parseMultiStatus(calendarsXml);
    const calendars = calResponses
      .filter(r => !r.href.endsWith('/calendars/'))
      .filter(r => {
        const resourcetype = getTagContent(r.prop, 'resourcetype');
        return resourcetype.includes('calendar');
      })
      .map(r => ({
        id: r.href,
        name: getTagContent(r.prop, 'displayname') || 'Unnamed Calendar',
        description: '',
        timezone: 'UTC'
      }));
    
    return res.status(200).json({
      connected: true,
      user: maskEmail(email),
      calendars: calendars
    });
  } catch (error) {
    return res.status(200).json({
      connected: false,
      error: error.message,
      calendars: []
    });
  }
};