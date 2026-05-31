import axios from 'axios';
import { parseStringPromise } from 'xml2js';

// Mask secrets in logs
function maskEmail(email) {
  if (!email) return '***';
  const [user, domain] = email.split('@');
  if (!domain) return '***';
  return `${user.substring(0, 3)}***@${domain}`;
}

function maskPassword(pwd) {
  return pwd ? '****' : 'NOT_SET';
}

// Helper to get text content from parsed XML node
function getText(node) {
  if (Array.isArray(node)) node = node[0];
  if (!node) return '';
  if (typeof node === 'string') return node;
  if (node._) return node._;
  if (node['#text']) return node['#text'];
  return '';
}

export async function testConnection() {
  const email = process.env.ICLOUD_EMAIL;
  const appPassword = process.env.ICLOUD_APP_PASSWORD;

  console.log(`[Apple Calendar] Testing connection for ${maskEmail(email)} (password: ${maskPassword(appPassword)})`);

  if (!email || !appPassword) {
    return {
      connected: false,
      error: 'Missing ICLOUD_EMAIL or ICLOUD_APP_PASSWORD environment variables',
      calendars: []
    };
  }

  try {
    // Step1: Get current-user-principal
    const principalResp = await axios({
      method: 'PROPFIND',
      url: 'https://caldav.icloud.com',
      auth: { username: email, password: appPassword },
      headers: { 'Depth': '0', 'Content-Type': 'application/xml' },
      data: `<?xml version="1.0"?>
        <propfind xmlns="DAV:">
          <prop><current-user-principal/></prop>
        </propfind>`
    });

    const principalXml = await parseStringPromise(principalResp.data);
    const principalHref = getText(principalXml?.multistatus?.response?.[0]?.propstat?.[0]?.prop?.[0]?.['current-user-principal']?.[0]?.href);
    
    if (!principalHref) throw new Error('Could not find principal URL');
    console.log(`[Apple Calendar] Principal URL: ${principalHref}`);

    // Step2: Get calendar home set
    const principalUrl = principalHref.startsWith('http') 
      ? principalHref 
      : `https://caldav.icloud.com${principalHref}`;
    
    const homeResp = await axios({
      method: 'PROPFIND',
      url: principalUrl,
      auth: { username: email, password: appPassword },
      headers: { 'Depth': '0', 'Content-Type': 'application/xml' },
      data: `<?xml version="1.0"?>
        <propfind xmlns="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
          <prop><C:calendar-home-set/></prop>
        </propfind>`
    });

    const homeXml = await parseStringPromise(homeResp.data);
    const calendarHome = getText(homeXml?.multistatus?.response?.[0]?.propstat?.[0]?.prop?.[0]?.['calendar-home-set']?.[0]?.href);
    
    if (!calendarHome) throw new Error('Could not find calendar home URL');
    console.log(`[Apple Calendar] Calendar home: ${calendarHome}`);

    // Step3: List calendars
    const calendarsUrl = calendarHome.startsWith('http') 
      ? calendarHome 
      : `https://caldav.icloud.com${calendarHome}`;
    
    const calendarsResp = await axios({
      method: 'PROPFIND',
      url: calendarsUrl,
      auth: { username: email, password: appPassword },
      headers: { 'Depth': '1', 'Content-Type': 'application/xml' },
      data: `<?xml version="1.0"?>
        <propfind xmlns="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
          <prop>
            <displayname/>
            <C:calendar-description/>
            <resourcetype/>
          </prop>
        </propfind>`
    });

    const calendarsXml = await parseStringPromise(calendarsResp.data);
    const responses = calendarsXml?.multistatus?.response || [];

    const calendars = responses
      .filter(resp => {
        const href = getText(resp?.href) || '';
        if (href.endsWith('/calendars/')) return false;
        
        const resourcetype = resp?.propstat?.[0]?.prop?.[0]?.resourcetype?.[0];
        return resourcetype?.calendar !== undefined;
      })
      .map(resp => {
        // href is an array of strings in xml2js output
        const href = Array.isArray(resp?.href) ? resp.href[0] : getText(resp?.href);
        const prop = resp?.propstat?.[0]?.prop?.[0];
        const displayname = getText(prop?.displayname);
        const calDesc = getText(prop?.['calendar-description']);
        
        return {
          id: href,
          name: displayname || 'Unnamed Calendar',
          description: calDesc || '',
          timezone: 'UTC'
        };
      });

    console.log(`[Apple Calendar] Found ${calendars.length} calendars for ${maskEmail(email)}`);

    return {
      connected: true,
      user: maskEmail(email),
      calendars
    };
  } catch (error) {
    console.error(`[Apple Calendar] Connection failed for ${maskEmail(email)}: ${error.message}`);
    return {
      connected: false,
      error: error.message,
      calendars: []
    };
  }
}