import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config(); // Load environment variables from .env

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

    // Apple Calendar API
    app.post('/api/calendar/apple', async (req, res) => {
      try {
        let { calendarUrl } = req.body;
        if (!calendarUrl) {
          calendarUrl = process.env.ICLOUD_CALENDAR_URL;
        }
        console.log('ICLOUD_CALENDAR_URL from env:', process.env.ICLOUD_CALENDAR_URL ? 'set' : 'not set');
        if (!calendarUrl) {
          return res.json({ 
            success: false, 
            events: [], 
            count: 0, 
            error: 'Calendar URL required (provide in request body or set ICLOUD_CALENDAR_URL env)' 
          });
        }

        const response = await fetch(calendarUrl, { 
          headers: { 'User-Agent': 'Mozilla/5.0 (Fresh People Command Center)' } 
        });
        if (!response.ok) {
          throw new Error(`Failed to fetch iCloud calendar: ${response.status} ${response.statusText}`);
        }
        const icsText = await response.text();
        const events = parseICS(icsText);

        res.json({
          success: true,
          events: events,
          count: events.length
        });
      } catch (error) {
        console.error('Apple Calendar sync error:', error);
        res.status(500).json({ 
          success: false, 
          events: [], 
          count: 0, 
          error: error.message 
        });
      }
    });

    // iCal parsing helpers
    function parseICS(icsText) {
      const events = [];

      // Unfold folded lines (RFC 5545): replace CRLF + space/tab with nothing
      const unfolded = icsText.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '');
      const lines = unfolded.split('\n');

      let currentEvent = null;

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        if (trimmed === 'BEGIN:VEVENT') {
          currentEvent = {};
        } else if (trimmed === 'END:VEVENT') {
          if (currentEvent && currentEvent.start) {
            events.push({
              id: currentEvent.uid || `icloud-${Date.now()}`,
              title: currentEvent.summary || 'Untitled Event',
              start: currentEvent.dtstart,
              end: currentEvent.dtend || currentEvent.dtstart,
              source: 'icloud',
              staff_assigned: '',
              dressCode: 'Formal All Black',
              clientName: ''
            });
          }
          currentEvent = null;
        } else if (currentEvent) {
          if (trimmed.startsWith('UID:')) {
            currentEvent.uid = trimmed.substring(4);
          } else if (trimmed.startsWith('SUMMARY:')) {
            currentEvent.summary = trimmed.substring(8);
          } else if (trimmed.startsWith('DTSTART')) {
            const val = trimmed.split(':').pop(); // get value after last colon
            if (val) currentEvent.dtstart = formatICSDate(val);
          } else if (trimmed.startsWith('DTEND')) {
            const val = trimmed.split(':').pop(); // get value after last colon
            if (val) currentEvent.dtend = formatICSDate(val);
          }
        }
      }

      return events;
    }

    function formatICSDate(icsDate) {
      if (!icsDate) return new Date().toISOString();
      // Parse basic format: YYYYMMDDTHHMMSS or YYYYMMDDTHHMM
      const match = icsDate.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?$/);
      if (!match) {
        // fallback to new Date()
        return new Date().toISOString();
      }
      let [, yearStr, monthStr, dayStr, hourStr, minuteStr, secondStr] = match;
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10) - 1; // because month in Date is 0-11
      const day = parseInt(dayStr, 10);
      const hour = parseInt(hourStr, 10);
      const minute = parseInt(minuteStr, 10);
      const second = secondStr ? parseInt(secondStr, 10) : 0;

      // Convert the given local time (SAST) to UTC.
      // South Africa Standard Time (SAST) is UTC+2, and does not observe DST.
      // So to get UTC from SAST time, subtract 2 hours.
      const utcTimeMs = Date.UTC(year, month, day, hour, minute, second) - 2 * 60 * 60 * 1000;
      const date = new Date(utcTimeMs);
      return date.toISOString();
    }

    // Dispatch Staff API
app.post('/api/dispatch-staff', async (req, res) => {
  try {
    const { eventId, staffIds } = req.body;
    
    res.json({
      success: true,
      dispatched: staffIds?.length || 0,
      skipped: 0,
      failed: 0,
      details: (staffIds || []).map(id => ({
        staffId: id,
        status: 'sent',
        messageId: `msg_${Date.now()}_${id}`
      }))
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Google Calendar API
app.post('/api/calendar/google', async (req, res) => {
  res.json({ 
    success: true, 
    events: [], 
    count: 0,
    message: 'Google Calendar integration pending'
  });
});

// Serve static files
app.use(express.static(path.join(__dirname, 'dist')));

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
