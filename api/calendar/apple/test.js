export default async function handler(req, res) {
  try {
    // Test if Vercel can reach the VPS
    const tests = [
      {
        name: 'VPS HTTP',
        url: 'http://solidai.solidsolutions.africa/apple-calendar/api/calendar/apple/test'
      },
      {
        name: 'VPS HTTPS',
        url: 'https://solidai.solidsolutions.africa/apple-calendar/api/calendar/apple/test'
      }
    ];
    
    const results = [];
    for (const test of tests) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        
        const response = await fetch(test.url, {
          method: 'GET',
          signal: controller.signal
        });
        clearTimeout(timeout);
        
        results.push({
          name: test.name,
          status: response.status,
          ok: response.ok,
          url: test.url
        });
      } catch (e) {
        results.push({
          name: test.name,
          error: e.name === 'AbortError' ? 'Timeout after 10s' : e.message,
          url: test.url
        });
      }
    }
    
    return res.status(200).json({
      tests: results,
      hint: 'Testing if Vercel can reach VPS'
    });
  } catch (error) {
    return res.status(200).json({
      error: error.message,
      stack: error.stack
    });
  }
}