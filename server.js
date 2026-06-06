import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Apple Calendar API
app.post('/api/calendar/apple', async (req, res) => {
  try {
    const { calendarUrl } = req.body;
    
    if (!calendarUrl) {
      return res.json({ 
        success: false, 
        events: [], 
        count: 0, 
        error: 'Calendar URL required' 
      });
    }

    // Mock data for testing
    const mockEvents = [
      {
        id: 'apple-1',
        title: 'Team Meeting',
        start: new Date(Date.now() + 86400000).toISOString(),
        end: new Date(Date.now() + 86400000 + 3600000).toISOString(),
        description: 'Weekly team sync',
        location: 'Office'
      }
    ];

    res.json({
      success: true,
      events: mockEvents,
      count: mockEvents.length
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      events: [], 
      count: 0, 
      error: error.message 
    });
  }
});

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
