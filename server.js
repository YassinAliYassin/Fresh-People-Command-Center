// Local Express dev server (NOT used by Vercel - Vercel uses /api/*.js serverless functions).
// Mirrors the production API for local development.
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { fetchAndParseICalendar, DEFAULT_ICLOUD_URL } from './lib/ical.js';
import { signToken, verifyToken } from './lib/auth.js';
import { handleFinanceRequest } from './lib/finance-core.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Basic in-memory rate limiting for writes (per IP, simple for small team / dev)
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 min
const RATE_LIMIT_MAX = 30; // writes per window

function rateLimitWrites(req, res, next) {
  if (req.method === 'GET' || req.method === 'OPTIONS') return next();
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';
  const now = Date.now();
  const entry = rateLimitMap.get(ip) || { count: 0, reset: now + RATE_LIMIT_WINDOW_MS };
  if (now > entry.reset) {
    entry.count = 0;
    entry.reset = now + RATE_LIMIT_WINDOW_MS;
  }
  entry.count++;
  rateLimitMap.set(ip, entry);
  if (entry.count > RATE_LIMIT_MAX) {
    return res.status(429).json({ error: 'Rate limit exceeded. Try again later.' });
  }
  next();
}

// Basic login for token bootstrap (mirrors /api/login serverless)
app.post('/api/login', (req, res) => {
  const { password, pin } = req.body || {};
  const provided = password || pin;
  if (!provided) return res.status(400).json({ error: 'password or pin required' });

  const adminPass = process.env.FPCC_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || 'change-this-strong-secret-now';
  const fallback = '0000';
  const valid = provided === adminPass || (provided === fallback && !process.env.FPCC_ADMIN_PASSWORD);

  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = signToken({ role: 'admin', sub: 'ops' });
  res.json({ success: true, token, expiresIn: '8h' });
});

function requireWriteAuth(req, res, next) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : req.headers['x-admin-token'];
  const user = verifyToken(token);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized - admin token required (POST /api/login)' });
  }
  req.user = user;
  next();
}

// Apple Calendar API - mirrors api/calendar/apple.js (uses shared lib)
app.post('/api/calendar/apple', rateLimitWrites, async (req, res) => {
  try {
    const icloudUrl = req.body?.calendarUrl || process.env.ICLOUD_CALENDAR_URL || DEFAULT_ICLOUD_URL;
    if (!icloudUrl) {
      return res.json({
        success: false,
        events: [],
        count: 0,
        error: 'No iCloud URL configured (set ICLOUD_CALENDAR_URL or pass in body)',
      });
    }
    const events = await fetchAndParseICalendar(icloudUrl);
    return res.json({ success: true, events, count: events.length });
  } catch (error) {
    console.error('Apple Calendar sync error:', error);
    return res.status(500).json({ success: false, events: [], count: 0, error: error.message });
  }
});

// Calendar unified API - mirrors api/calendar.js
app.get('/api/calendar', async (req, res) => {
  try {
    const icloudUrl = process.env.ICLOUD_CALENDAR_URL || DEFAULT_ICLOUD_URL;
    let iCloudEvents = [];
    if (icloudUrl) {
      try {
        iCloudEvents = await fetchAndParseICalendar(icloudUrl);
      } catch (e) {
        console.log('[Calendar] iCloud fetch/parse error:', e.message);
      }
    }
    if (req.query.format === 'json') {
      return res.json({ local: [], icloud: iCloudEvents });
    }
    // ICS format
    let ics = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Fresh People//Command Center//EN\r\n';
    for (const event of iCloudEvents) {
      ics += `BEGIN:VEVENT\r\nUID:${event.uid}\r\nDTSTART:${event.start.replace(/[-:]/g, '').split('.')[0]}Z\r\nDTEND:${event.end.replace(/[-:]/g, '').split('.')[0]}Z\r\nSUMMARY:${event.title}\r\nEND:VEVENT\r\n`;
    }
    ics += 'END:VCALENDAR';
    res.setHeader('Content-Type', 'text/calendar');
    return res.send(ics);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to generate calendar' });
  }
});

// WhatsApp Staff Dispatch - mirrors api/dispatch-staff.js
// For local dev, returns mock response (no real DB)
app.post('/api/dispatch-staff', rateLimitWrites, requireWriteAuth, async (req, res) => {
  const { eventId, staffIds } = req.body || {};
  if (!eventId || !Array.isArray(staffIds) || staffIds.length === 0) {
    return res.status(400).json({ success: false, error: 'eventId and staffIds required', dispatched: 0 });
  }
  // Local mock: just confirm the request shape is valid
  return res.json({
    success: true,
    note: 'Local dev: WhatsApp dispatch is mock. Production: api/dispatch-staff.js uses real DB + Meta API. Authenticated.',
    eventId,
    dispatched: staffIds.length,
    details: staffIds.map(id => ({ staffId: id, status: 'mock-sent' })),
  });
});

// Google Calendar API (mock for local dev)
app.post('/api/calendar/google', (req, res) => {
  res.json({
    success: true,
    events: [],
    note: 'Local dev: configure GOOGLE_SERVICE_ACCOUNT_BASE64 in .env for real Google Calendar sync',
  });
});

// Finance API - invoices, quotations, statements, and staff-hours reconciliation.
// Vercel Hobby allows 12 functions, so this is mounted through /api/dashboard-data
// and routed by resource=finance instead of a separate /api/finance function.
app.use('/api/dashboard-data', rateLimitWrites, async (req, res) => {
  if (String(req.query?.resource || req.query?.endpoint) !== 'finance') {
    return res.status(404).json({ error: 'Local dashboard-data route not configured' });
  }
  await handleFinanceRequest(req, res);
});

// Serve static build
app.use(express.static(path.join(__dirname, 'dist')));

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📅 Apple Calendar: POST http://localhost:${PORT}/api/calendar/apple`);
  console.log(`📅 Calendar JSON: GET http://localhost:${PORT}/api/calendar?format=json`);
  console.log(`📤 Dispatch: POST http://localhost:${PORT}/api/dispatch-staff (protected)`);
  console.log(`🧾 Finance: GET/POST/PATCH/DELETE http://localhost:${PORT}/api/dashboard-data?resource=finance&financeResource=docs`);
  console.log(`⏱️ Staff hours: GET/POST http://localhost:${PORT}/api/dashboard-data?resource=finance&financeResource=staff-hours`);
  console.log(`🔐 Login for token: POST http://localhost:${PORT}/api/login {password: '...'}`);
  console.log(`🛡️ Writes to /api/staff and /api/events now require admin token (see SECURITY.md)`);
});
