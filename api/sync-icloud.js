import { fetchICloudCalendar } from '../lib/icloud.js';
import { parseCalendarEvents } from '../lib/calendar-parser.js';
import { initCalendarEventsTable, upsertEvent, getSyncStats } from '../lib/db-upsert.js';

export default async function handler(req, res) {
  // Security: Verify sync secret
  const secret = req.query.secret || req.headers['x-sync-secret'];
  if (!secret || secret !== process.env.SYNC_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'POST' && !req.query.trigger) {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const stats = {
    imported: 0,
    updated: 0,
    failed: 0,
    events: []
  };

  try {
    // Initialize database table
    await initCalendarEventsTable();

    // Fetch iCloud calendar
    console.log('[Sync] Fetching iCloud calendar...');
    const icsText = await fetchICloudCalendar(process.env.ICLOUD_CALENDAR_URL);
    console.log(`[Sync] Fetched ${icsText.length} bytes`);

    // Parse events
    const events = parseCalendarEvents(icsText);
    console.log(`[Sync] Parsed ${events.length} events`);

    // Upsert each event
    for (const event of events) {
      try {
        const existing = await checkIfExists(event.uid);
        const result = await upsertEvent(event);
        
        if (existing) {
          stats.updated++;
        } else {
          stats.imported++;
        }
        
        stats.events.push({
          uid: event.uid,
          title: event.title,
          status: existing ? 'updated' : 'imported'
        });
      } catch (error) {
        console.error(`[Sync] Failed to upsert ${event.uid}:`, error.message);
        stats.failed++;
      }
    }

    // Get overall stats
    const syncStats = await getSyncStats();
    stats.summary = syncStats;

    console.log(`[Sync] Complete: ${stats.imported} imported, ${stats.updated} updated, ${stats.failed} failed`);
    
    return res.status(200).json(stats);

  } catch (error) {
    console.error('[Sync Error]', error.message);
    return res.status(500).json({
      error: 'Sync failed',
      message: error.message,
      stats
    });
  }
}

// Helper to check if event exists
async function checkIfExists(uid) {
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  const result = await pool.query('SELECT uid FROM calendar_events WHERE uid = $1', [uid]);
  pool.end();
  return result.rows.length > 0;
}
