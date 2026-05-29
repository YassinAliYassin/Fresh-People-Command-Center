import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { command, params } = req.body;
    
    if (!command) {
      return res.status(400).json({ error: 'No command provided' });
    }

    const cmd = command.toLowerCase().trim();
    let result = { success: true, command: cmd, response: '' };

    // Route to appropriate handler
    if (cmd === '/today') {
      result.response = await getTodaysEvents();
    } else if (cmd === '/tomorrow') {
      result.response = await getTomorrowsEvents();
    } else if (cmd === '/open-bookings') {
      result.response = await getOpenBookings();
    } else if (cmd === '/unconfirmed-staff') {
      result.response = await getUnconfirmedStaff();
    } else if (cmd.startsWith('/find-staff')) {
      const count = parseInt(params?.count || cmd.split(' ')[1] || '5', 10);
      result.response = await findStaff(count);
    } else if (cmd === '/client-summary') {
      result.response = await getClientSummary();
    } else if (cmd === '/payroll-summary') {
      result.response = await getPayrollSummary();
    } else {
      result.response = `Unknown command: ${command}\n\nAvailable commands:\n/today\n/tomorrow\n/open-bookings\n/unconfirmed-staff\n/find-staff N\n/client-summary\n/payroll-summary`;
    }

    return res.status(200).json(result);

  } catch (error) {
    console.error('[Hermes] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

// Get today's events
async function getTodaysEvents() {
  const result = await pool.query(`
    SELECT title, start_at, location, 
           (SELECT COUNT(*) FROM staff_confirmations WHERE event_id = ce.uid AND status = 'confirmed') as confirmed,
           (SELECT COUNT(*) FROM staff_confirmations WHERE event_id = ce.uid AND status = 'pending') as pending
    FROM calendar_events ce
    WHERE DATE(start_at) = CURRENT_DATE
    ORDER BY start_at ASC
  `);

  if (result.rows.length === 0) {
    return 'No events scheduled for today.';
  }

  let response = `📅 TODAY'S EVENTS (${result.rows.length}):\n\n`;
  for (const event of result.rows) {
    const startDate = new Date(event.start_at).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
    response += `• ${event.title}\n  Time: ${startDate}\n  Venue: ${event.location || 'TBA'}\n  Staff: ✅${event.confirmed} confirmed, ⏳${event.pending} pending\n\n`;
  }
  return response.trim();
}

// Get tomorrow's events
async function getTomorrowsEvents() {
  const result = await pool.query(`
    SELECT title, start_at, location,
           (SELECT COUNT(*) FROM staff_confirmations WHERE event_id = ce.uid AND status = 'confirmed') as confirmed,
           (SELECT COUNT(*) FROM staff_confirmations WHERE event_id = ce.uid AND status = 'pending') as pending
    FROM calendar_events ce
    WHERE DATE(start_at) = CURRENT_DATE + INTERVAL '1 day'
    ORDER BY start_at ASC
  `);

  if (result.rows.length === 0) {
    return 'No events scheduled for tomorrow.';
  }

  let response = `📆 TOMORROW'S EVENTS (${result.rows.length}):\n\n`;
  for (const event of result.rows) {
    const startDate = new Date(event.start_at).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
    response += `• ${event.title}\n  Time: ${startDate}\n  Venue: ${event.location || 'TBA'}\n  Staff: ✅${event.confirmed} confirmed, ⏳${event.pending} pending\n\n`;
  }
  return response.trim();
}

// Get open/pending bookings
async function getOpenBookings() {
  const result = await pool.query(`
    SELECT booking_ref, client_name, venue, event_date, staff_required, status
    FROM bookings
    WHERE status IN ('pending', 'confirmed')
    ORDER BY event_date ASC
    LIMIT 10
  `);

  if (result.rows.length === 0) {
    return 'No open bookings.';
  }

  let response = `📋 OPEN BOOKINGS (${result.rows.length}):\n\n`;
  for (const booking of result.rows) {
    const eventDate = new Date(booking.event_date).toLocaleDateString('en-ZA');
    response += `• ${booking.booking_ref}\n  Client: ${booking.client_name || 'TBA'}\n  Venue: ${booking.venue || 'TBA'}\n  Date: ${eventDate}\n  Staff needed: ${booking.staff_required}\n  Status: ${booking.status}\n\n`;
  }
  return response.trim();
}

// Get unconfirmed staff
async function getUnconfirmedStaff() {
  const result = await pool.query(`
    SELECT sc.event_id, ce.title as event_name, sc.staff_name, sc.staff_phone
    FROM staff_confirmations sc
    LEFT JOIN calendar_events ce ON sc.event_id = ce.uid
    WHERE sc.status = 'pending'
    AND DATE(sc.created_at) >= CURRENT_DATE - INTERVAL '3 days'
    ORDER BY sc.created_at DESC
    LIMIT 20
  `);

  if (result.rows.length === 0) {
    return 'All staff confirmed! ✅';
  }

  let response = `⚠️ UNCONFIRMED STAFF (${result.rows.length}):\n\n`;
  for (const staff of result.rows) {
    response += `• ${staff.staff_name}\n  Event: ${staff.event_name || staff.event_id}\n  Phone: ${staff.staff_phone || 'N/A'}\n\n`;
  }
  return response.trim();
}

// Find available staff
async function findStaff(count) {
  const result = await pool.query(`
    SELECT s.name, s.role, s.availability_status, s.rating,
           CASE WHEN sc.id IS NOT NULL THEN 'Assigned' ELSE 'Available' END as status
    FROM staff s
    LEFT JOIN staff_confirmations sc ON s.name = sc.staff_name AND sc.status = 'pending'
    WHERE s.availability_status != 'Inactive'
    ORDER BY s.rating DESC NULLS LAST
    LIMIT $1
  `, [count]);

  if (result.rows.length === 0) {
    return 'No staff available.';
  }

  let response = `👥 AVAILABLE STAFF (${result.rows.length}):\n\n`;
  for (const staff of result.rows) {
    const rating = staff.rating ? `⭐${staff.rating}/5` : 'No rating';
    response += `• ${staff.name}\n  Role: ${staff.role || 'General'}\n  Status: ${staff.availability_status}\n  Rating: ${rating}\n\n`;
  }
  return response.trim();
}

// Client summary
async function getClientSummary() {
  const result = await pool.query(`
    SELECT client_name, COUNT(*) as booking_count,
           MAX(event_date) as last_event
    FROM bookings
    WHERE client_name IS NOT NULL
    GROUP BY client_name
    ORDER BY booking_count DESC
    LIMIT 10
  `);

  if (result.rows.length === 0) {
    return 'No client data available.';
  }

  let response = `👤 CLIENT SUMMARY (Top 10):\n\n`;
  for (const client of result.rows) {
    const lastEvent = new Date(client.last_event).toLocaleDateString('en-ZA');
    response += `• ${client.client_name}\n  Bookings: ${client.booking_count}\n  Last event: ${lastEvent}\n\n`;
  }
  return response.trim();
}

// Payroll summary
async function getPayrollSummary() {
  const result = await pool.query(`
    SELECT 
      COUNT(DISTINCT sc.staff_name) as staff_paid,
      SUM(CASE WHEN b.staff_required > 0 THEN b.staff_required * 500 ELSE 0 END) as estimated_payout
    FROM staff_confirmations sc
    LEFT JOIN bookings b ON sc.event_id = b.booking_ref
    WHERE sc.status = 'confirmed'
    AND DATE(sc.responded_at) >= DATE_TRUNC('month', CURRENT_DATE)
  `);

  if (result.rows.length === 0 || !result.rows[0].staff_paid) {
    return 'No payroll data for this month.';
  }

  const data = result.rows[0];
  return `💰 PAYROLL SUMMARY (This Month):\n\nStaff paid: ${data.staff_paid}\nEstimated payout: R${data.estimated_payout || 0}\n\nNote: Estimated at R500/staff member.`;
}
