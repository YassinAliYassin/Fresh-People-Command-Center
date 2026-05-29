import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const dashboard = {
      today: { events: [], count: 0 },
      tomorrow: { events: [], count: 0 },
      staff: { confirmed: 0, outstanding: 0, declined: 0, total: 0 },
      bookings: { pending: 0, confirmed: 0, total: 0 },
      whatsapp: { sent: 0, delivered: 0, read: 0, failed: 0 },
      calendar: { synced_events: 0, last_sync: null },
      recent_messages: [],
      alerts: []
    };

    // 1. Today's events
    const todayResult = await pool.query(`
      SELECT ce.*, 
             COUNT(sc.id) FILTER (WHERE sc.status = 'confirmed') as confirmed_count,
             COUNT(sc.id) FILTER (WHERE sc.status = 'pending') as pending_count
      FROM calendar_events ce
      LEFT JOIN staff_confirmations sc ON ce.uid = sc.event_id
      WHERE DATE(ce.start_at) = CURRENT_DATE
      GROUP BY ce.uid, ce.title, ce.start_at, ce.end_at, ce.timezone, ce.location
      ORDER BY ce.start_at ASC
    `);
    
    dashboard.today.events = todayResult.rows;
    dashboard.today.count = todayResult.rows.length;

    // 2. Tomorrow's events
    const tomorrowResult = await pool.query(`
      SELECT ce.*, 
             COUNT(sc.id) FILTER (WHERE sc.status = 'confirmed') as confirmed_count,
             COUNT(sc.id) FILTER (WHERE sc.status = 'pending') as pending_count
      FROM calendar_events ce
      LEFT JOIN staff_confirmations sc ON ce.uid = sc.event_id
      WHERE DATE(ce.start_at) = CURRENT_DATE + INTERVAL '1 day'
      GROUP BY ce.uid, ce.title, ce.start_at, ce.end_at, ce.timezone, ce.location
      ORDER BY ce.start_at ASC
    `);
    
    dashboard.tomorrow.events = tomorrowResult.rows;
    dashboard.tomorrow.count = tomorrowResult.rows.length;

    // 3. Staff confirmation stats
    const staffStatsResult = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed,
        COUNT(*) FILTER (WHERE status = 'pending') as outstanding,
        COUNT(*) FILTER (WHERE status = 'declined') as declined,
        COUNT(*) as total
      FROM staff_confirmations
      WHERE DATE(created_at) >= CURRENT_DATE - INTERVAL '7 days'
    `);
    
    if (staffStatsResult.rows[0]) {
      dashboard.staff = staffStatsResult.rows[0];
    }

    // 4. Booking stats
    const bookingStatsResult = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed,
        COUNT(*) as total
      FROM bookings
      WHERE DATE(created_at) >= CURRENT_DATE - INTERVAL '30 days'
    `);
    
    if (bookingStatsResult.rows[0]) {
      dashboard.bookings = bookingStatsResult.rows[0];
    }

    // 5. WhatsApp message stats
    const whatsappStatsResult = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'sent') as sent,
        COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
        COUNT(*) FILTER (WHERE status = 'read') as read,
        COUNT(*) FILTER (WHERE status = 'failed') as failed
      FROM whatsapp_messages
      WHERE DATE(created_at) >= CURRENT_DATE - INTERVAL '7 days'
    `);
    
    if (whatsappStatsResult.rows[0]) {
      dashboard.whatsapp = whatsappStatsResult.rows[0];
    }

    // 6. Calendar sync status
    const calendarResult = await pool.query(`
      SELECT COUNT(*) as synced_events, MAX(updated_at) as last_sync
      FROM calendar_events
      WHERE source = 'icloud'
    `);
    
    if (calendarResult.rows[0]) {
      dashboard.calendar.synced_events = parseInt(calendarResult.rows[0].synced_events, 10);
      dashboard.calendar.last_sync = calendarResult.rows[0].last_sync;
    }

    // 7. Recent messages (last 10)
    const messagesResult = await pool.query(`
      SELECT * FROM whatsapp_messages
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    dashboard.recent_messages = messagesResult.rows;

    // 8. Alerts
    const alerts = [];
    
    // Alert: Events today with unconfirmed staff
    if (dashboard.today.events.some(e => e.pending_count > 0)) {
      alerts.push({
        type: 'warning',
        message: 'Some staff not confirmed for today\'s events'
      });
    }
    
    // Alert: Pending bookings
    if (dashboard.bookings.pending > 3) {
      alerts.push({
        type: 'info',
        message: `${dashboard.bookings.pending} pending bookings need attention`
      });
    }
    
    // Alert: Failed WhatsApp messages
    if (dashboard.whatsapp.failed > 0) {
      alerts.push({
        type: 'error',
        message: `${dashboard.whatsapp.failed} WhatsApp messages failed to send`
      });
    }
    
    dashboard.alerts = alerts;

    return res.status(200).json(dashboard);

  } catch (error) {
    console.error('[Dashboard] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
