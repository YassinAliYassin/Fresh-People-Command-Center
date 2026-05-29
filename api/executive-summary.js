import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Helper: check if request is for timeline (no auth needed for GET)
function isTimelineRequest(req) {
  return req.query.event_id && req.method === 'GET';
}

//DASHBOARD DATA
async function getDashboardData() {
  try {
    // Today's events
    const todayEvents = await pool.query(`
      SELECT * FROM calendar_events 
      WHERE DATE(start_at) = CURRENT_DATE 
      ORDER BY start_at ASC
    `);
    
    // Tomorrow's events
    const tomorrowEvents = await pool.query(`
      SELECT * FROM calendar_events 
      WHERE DATE(start_at) = CURRENT_DATE + INTERVAL '1 day' 
      ORDER BY start_at ASC
    `);
    
    // Staff confirmations
    const pendingConfirmations = await pool.query(`
      SELECT COUNT(*) as count FROM staff_confirmations 
      WHERE status = 'pending'
    `);
    
    return {
      today: todayEvents.rows,
      tomorrow: tomorrowEvents.rows,
      stats: {
        todayEvents: todayEvents.rows.length,
        tomorrowEvents: tomorrowEvents.rows.length,
        pendingConfirmations: parseInt(pendingConfirmations.rows[0].count)
      }
    };
  } catch (error) {
    return { error: error.message };
  }
}

//HERMES COMMANDS
async function handleHermesCommand(command) {
  try {
    switch (command) {
      case 'today': {
        const { rows } = await pool.query(`
          SELECT title, start_at, venue FROM calendar_events 
          WHERE DATE(start_at) = CURRENT_DATE 
          ORDER BY start_at ASC
        `);
        return { command: 'today', events: rows, count: rows.length };
      }
      
      case 'tomorrow': {
        const { rows } = await pool.query(`
          SELECT title, start_at, venue FROM calendar_events 
          WHERE DATE(start_at) = CURRENT_DATE + INTERVAL '1 day' 
          ORDER BY start_at ASC
        `);
        return { command: 'tomorrow', events: rows, count: rows.length };
      }
      
      case 'open-bookings': {
        const { rows } = await pool.query(`
          SELECT booking_ref, client_name, event_date, status FROM bookings 
          WHERE status IN ('pending', 'confirmed') 
          ORDER BY event_date ASC
        `);
        return { command: 'open-bookings', bookings: rows, count: rows.length };
      }
      
      case 'unconfirmed-staff': {
        const { rows } = await pool.query(`
          SELECT event_id, staff_name, staff_phone, status FROM staff_confirmations 
          WHERE status = 'pending' 
          ORDER BY event_id ASC
        `);
        return { command: 'unconfirmed-staff', staff: rows, count: rows.length };
      }
      
      case 'find-staff': {
        const { rows } = await pool.query(`SELECT * FROM staff ORDER BY name ASC`);
        return { command: 'find-staff', staff: rows, count: rows.length };
      }
      
      case 'client-summary': {
        const { rows } = await pool.query(`
          SELECT client_name, COUNT(*) as booking_count, MAX(event_date) as last_event 
          FROM bookings 
          GROUP BY client_name 
          ORDER BY booking_count DESC
        `);
        return { command: 'client-summary', clients: rows };
      }
      
      case 'payroll-summary': {
        const { rows } = await pool.query(`
          SELECT s.name, COUNT(sc.event_id) as events_worked 
          FROM staff s 
          LEFT JOIN staff_confirmations sc ON s.name = sc.staff_name AND sc.status = 'confirmed' 
          GROUP BY s.name 
          ORDER BY events_worked DESC
        `);
        return { command: 'payroll-summary', payroll: rows };
      }
      
      case 'executive-summary': {
        const dashboard = await getDashboardData();
        const openBookings = await pool.query(`SELECT COUNT(*) as count FROM bookings WHERE status IN ('pending', 'confirmed')`);
        const confirmedStaff = await pool.query(`SELECT COUNT(*) as count FROM staff_confirmations WHERE status = 'confirmed'`);
        const unconfirmedStaff = await pool.query(`SELECT COUNT(*) as count FROM staff_confirmations WHERE status = 'pending'`);
        
        return {
          command: 'executive-summary',
          todayEvents: dashboard.today.length,
          tomorrowEvents: dashboard.tomorrow.length,
          totalStaffRequired: dashboard.today.reduce((sum, e) => sum + (e.staff_required || 0), 0),
          confirmedStaff: parseInt(confirmedStaff.rows[0].count),
          outstandingConfirmations: parseInt(unconfirmedStaff.rows[0].count),
          openBookings: parseInt(openBookings.rows[0].count),
          systemHealth: 'Operational',
          timestamp: new Date().toISOString()
        };
      }
      
      default:
        return { error: 'Unknown command', available: ['today', 'tomorrow', 'open-bookings', 'unconfirmed-staff', 'find-staff', 'client-summary', 'payroll-summary', 'executive-summary'] };
    }
  } catch (error) {
    return { error: error.message };
  }
}

//EVENT TIMELINE (GET)
async function getTimeline(eventId) {
  try {
    const { rows } = await pool.query(`
      SELECT * FROM event_timeline 
      WHERE event_id = $1 
      ORDER BY created_at ASC
    `, [eventId]);
    return { event_id: eventId, timeline: rows, count: rows.length };
  } catch (error) {
    return { error: error.message };
  }
}

//MAIN HANDLER
export default async function handler(req, res) {
  // Timeline GET (no auth needed)
  if (isTimelineRequest(req)) {
    const eventId = req.query.event_id;
    const timeline = await getTimeline(eventId);
    return res.json(timeline);
  }
  
  // POST: Add timeline stage (requires auth)
  if (req.method === 'POST' && req.query.action === 'add-timeline') {
    const authHeader = req.headers.authorization;
    const adminSecret = process.env.ADMIN_SECRET;
    if (!adminSecret || authHeader !== `Bearer ${adminSecret}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const { event_id, stage, notes, metadata } = req.body;
    try {
      const result = await pool.query(`
        INSERT INTO event_timeline (event_id, stage, status, notes, metadata)
        VALUES ($1, $2, 'completed', $3, $4)
        RETURNING *
      `, [event_id, stage, notes, JSON.stringify(metadata || {})]);
      return res.json({ success: true, entry: result.rows[0] });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }
  
  // Dashboard data (GET, no auth for simplicity)
  if (req.method === 'GET' && !req.query.command) {
    const data = await getDashboardData();
    return res.json(data);
  }
  
  // Hermes commands (GET)
  if (req.method === 'GET' && req.query.command) {
    const result = await handleHermesCommand(req.query.command);
    return res.json(result);
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}
