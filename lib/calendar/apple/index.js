// Apple Calendar Service - using native fetch (Node 18+)

// Mask secrets in logs
function maskEmail(email) {
  if (!email) return '***';
  const [user, domain] = email.split('@');
  if (!domain) return '***';
  return user.substring(0, 3) + '***@' + domain;
}

function maskPassword(pwd) {
  return pwd ? '****' : 'NOT_SET';
}

// Simple XML parser for CalDAV responses (handles namespace attributes)
function parseMultiStatus(xmlText) {
  const responses = [];
  // Match response tags with any attributes
  const responseRegex = /<response[^>]*>([\s\S]*?)<\/response>/g;
  let match;
  
  while ((match = responseRegex.exec(xmlText)) !== null) {
    const responseXml = match[1];
    const hrefMatch = responseXml.match(/<href[^>]*>([\s\S]*?)<\/href>/);
    const href = hrefMatch ? hrefMatch[1].trim() : '';
    
    // Match propstat tags with any attributes
    const propstatRegex = /<propstat[^>]*>([\s\S]*?)<\/propstat>/g;
    let propMatch;
    while ((propMatch = propstatRegex.exec(responseXml)) !== null) {
      const propXml = propMatch[1];
      const statusMatch = propXml.match(/<status[^>]*>([\s\S]*?)<\/status>/);
      const status = statusMatch ? statusMatch[1].trim() : '';
      
      if (status.includes('200 OK')) {
        const propContentMatch = propXml.match(/<prop[^>]*>([\s\S]*?)<\/prop>/);
        if (propContentMatch) {
          responses.push({
            href: href,
            prop: propContentMatch[1]
          });
        }
      }
    }
  }
  
  return responses;
}

function getTagContent(xml, tag) {
  // Match tag with any attributes
  const regex = new RegExp('<' + tag + '[^>]*>([\\s\\S]*?)<\\/' + tag + '>');
  const match = xml.match(regex);
  return match ? match[1].trim() : '';
}

export async function testConnection() {
  const email = process.env.ICLOUD_EMAIL;
  const appPassword = process.env.ICLOUD_APP_PASSWORD;

  console.log('[Apple Calendar] Testing connection for ' + maskEmail(email) + ' (password: ' + maskPassword(appPassword) + ')');

  if (!email || !appPassword) {
    return {
      connected: false,
      error: 'Missing ICLOUD_EMAIL or ICLOUD_APP_PASSWORD environment variables',
      calendars: []
    };
  }

  try {
    // Helper function for CalDAV requests
    async function caldavRequest(url, body, depth) {
      depth = depth || '0';
      const auth = 'Basic ' + Buffer.from(email + ':' + appPassword).toString('base64');
      
      const resp = await fetch(url, {
        method: 'PROPFIND',
        headers: {
          'Depth': depth,
          'Content-Type': 'application/xml',
          'Authorization': auth
        },
        body: body
      });
      
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error('HTTP ' + resp.status + ': ' + text.substring(0, 200));
      }
      return await resp.text();
    }

    // Step1: Get principal URL
    const principalXml = await caldavRequest('https://caldav.icloud.com', '<?xml version="1.0"?><propfind xmlns="DAV:"><prop><current-user-principal/></prop></propfind>');
    
    const principalResponses = parseMultiStatus(principalXml);
    if (!principalResponses.length) {
      console.error('[Apple Calendar] No principal responses. XML:', principalXml.substring(0, 500));
      throw new Error('No principal response');
    }
    
    let principalHref = '';
    const principalProp = principalResponses[0].prop;
    const principalContent = getTagContent(principalProp, 'current-user-principal');
    if (principalContent) {
      const hrefMatch = principalContent.match(/<href[^>]*>([\s\S]*?)<\/href>/);
      principalHref = hrefMatch ? hrefMatch[1].trim() : '';
    }
    
    if (!principalHref) throw new Error('Could not find principal URL');
    console.log('[Apple Calendar] Principal URL: ' + principalHref);

    // Step2: Get calendar home
    const principalUrl = principalHref.startsWith('http') 
      ? principalHref 
      : 'https://caldav.icloud.com' + principalHref;
    
    const homeXml = await caldavRequest(principalUrl, '<?xml version="1.0"?><propfind xmlns="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav"><prop><C:calendar-home-set/></prop></propfind>');
    
    const homeResponses = parseMultiStatus(homeXml);
    if (!homeResponses.length) throw new Error('No calendar home response');
    
    let calendarHome = '';
    const homeProp = homeResponses[0].prop;
    const homeSetContent = getTagContent(homeProp, 'calendar-home-set');
    if (homeSetContent) {
      const hrefMatch = homeSetContent.match(/<href[^>]*>([\s\S]*?)<\/href>/);
      calendarHome = hrefMatch ? hrefMatch[1].trim() : '';
    }
    
    if (!calendarHome) throw new Error('Could not find calendar home URL');
    console.log('[Apple Calendar] Calendar home: ' + calendarHome);

    // Step3: List calendars
    const calendarsUrl = calendarHome.startsWith('http') 
      ? calendarHome 
      : 'https://caldav.icloud.com' + calendarHome;
    
    const calendarsXml = await caldavRequest(calendarsUrl, '<?xml version="1.0"?><propfind xmlns="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav"><prop><displayname/><resourcetype/></prop></propfind>', '1');
    
    const calResponses = parseMultiStatus(calendarsXml);
    const calendars = calResponses
      .filter(function(r) {
        if (r.href.endsWith('/calendars/')) return false;
        const resourcetype = getTagContent(r.prop, 'resourcetype');
        return resourcetype.includes('calendar');
      })
      .map(function(r) {
        return {
          id: r.href,
          name: getTagContent(r.prop, 'displayname') || 'Unnamed Calendar',
          description: '',
          timezone: 'UTC'
        };
      });

    console.log('[Apple Calendar] Found ' + calendars.length + ' calendars for ' + maskEmail(email));

    return {
      connected: true,
      user: maskEmail(email),
      calendars: calendars
    };
  } catch (error) {
    console.error('[Apple Calendar] Connection failed for ' + maskEmail(email) + ': ' + error.message);
    return {
      connected: false,
      error: error.message,
      calendars: []
    };
  }
}