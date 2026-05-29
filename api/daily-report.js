import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_ID = process.env.WHATSAPP_PHONE_ID;
const YASSIN_PHONE = process.env.YASSIN_PHONE || '+27672961272';

export default async function handler(req, res) {
  // Verify cron secret (optional security)
  const secret = req.query.secret || req.headers['x-cron-secret'];
  if (secret && secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const report = await generateDailyReport();
    
    // Send via WhatsApp if not a test
    if (req.query.send !== 'false') {
      await sendWhatsAppReport(report.text);
    }

    return res.status(200).json({
      success: true,
      report: report.text,
      stats: report.stats
    });

  } catch (error) {
    console.error('[Daily Report] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

async function generateDailyReport() {
  const stats = {
    today_events: 0,
    confirmed_staff: 0,
    pending_staff: 0,
    pending_bookings: 0,
    payroll_alerts: 0
  };

  let report = `☀️ GOOD MORNING, YASSIN!\n\n`;
  report += `📊 DAILY OPERATIONS REPORT\n`;
  report += `${new Date().toLocaleDateString('en-ZA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}\n\n`;

  // 1. Today's events
  const todayResult = await pool.query(`
    SELECT ce.title, ce.start_at, ce.location,
           COUNT(sc.id) FILTER (WHERE sc.status = 'confirmed') as confirmed,
           COUNT(sc.id) FILTER (WHERE sc.status = 'pending') as pending
    FROM calendar_events ce
    LEFT JOIN staff_confirmations sc ON ce.uid = sc.event_id
    WHERE DATE(ce.start_at) = CURRENT_DATE
    GROUP BY ce.uid, ce.title, ce.start_at, ce.location
    ORDER BY ce.start_at ASC
  `);

  stats.today_events = todayResult.rows.length;
  report += `📅 TODAY'S EVENTS (${todayResult.rows.length}):\n`;

  if (todayResult.rows.length === 0) {
    report += `  No events scheduled for today.\n\n`;
  } else {
    for (const event of todayResult.rows) {
      const time = new Date(event.start_at).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
      report += `  • ${event.title}\n`;
      report += `    Time: ${time}\n`;
      report += `    Venue: ${event.location || 'TBA'}\n`;
      report += `    Staff: ✅${event.confirmed} confirmed, ⚠️${event.pending} pending\n`;
    }
    report += `\n`;
  }

  // 2. Staff status
  const staffResult = await pool.query(`
    SELECT 
      COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed,
      COUNT(*) FILTER (WHERE status = 'pending') as pending,
      COUNT(*) FILTER (WHERE status = 'declined') as declined
    FROM staff_confirmations
    WHERE DATE(created_at) >= CURRENT_DATE
  `);

  if (staffResult.rows[0]) {
    stats.confirmed_staff = parseInt(staffResult.rows[0].confirmed, 10);
    stats.pending_staff = parseInt(staffResult.rows[0].pending, 10);
    
    report += `👥 STAFF STATUS:\n`;
    report += `  ✅ Confirmed: ${staffResult.rows[0].confirmed}\n`;
    report += `  ⚠️ Pending: ${staffResult.rows[0].pending}\n`;
    report += `  ❌ Declined: ${staffResult.rows[0].declined}\n\n`;
  }

  // 3. Pending bookings
  const bookingsResult = await pool.query(`
    SELECT COUNT(*) as pending FROM bookings WHERE status = 'pending'
  `);

  if (bookingsResult.rows[0]) {
    stats.pending_bookings = parseInt(bookingsResult.rows[0].pending, 10);
    report += `📋 PENDING BOOKINGS: ${bookingsResult.rows[0].pending}\n\n`;
  }

  // 4. Payroll alerts (staff who confirmed but no payroll processed)
  const payrollResult = await pool.query(`
    SELECT COUNT(DISTINCT sc.staff_phone) as unpaid
    FROM staff_confirmations sc
    LEFT JOIN event_timeline et ON sc.event_id = et.event_id AND et.stage = 'payroll_processed'
    WHERE sc.status = 'confirmed'
    AND sc.responded_at >= DATE_TRUNC('month', CURRENT_DATE)
    AND et.id IS NULL
  `);

  if (payrollResult.rows[0] && parseInt(payrollResult.rows[0].unpaid, 10) > 0) {
    stats.payroll_alerts = parseInt(payrollResult.rows[0].unpaid, 10);
    report += `💰 PAYROLL ALERT: ${payrollResult.rows[0].unpaid} staff members need payment this month\n\n`;
  }

  // 5. Client follow-ups (bookings without confirmation in 3+ days)
  const followupResult = await pool.query(`
    SELECT client_name, event_date FROM bookings
    WHERE status = 'pending'
    AND event_date <= CURRENT_DATE + INTERVAL '3 days'
    AND event_date >= CURRENT_DATE
  `);

  if (followupResult.rows.length > 0) {
    report += `📞 CLIENT FOLLOW-UPS NEEDED (${followupResult.rows.length}):\n`;
    for (const booking of followupResult.rows) {
      const date = new Date(booking.event_date).toLocaleDateString('en-ZA');
      report += `  • ${booking.client_name} - Event on ${date}\n`;
    }
    report += `\n`;
  }

  report += `✅ Report generated at ${new Date().toLocaleTimeString('en-ZA')}\n`;

  return { text: report, stats };
}

async function sendWhatsAppReport(reportText) {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${PHONE_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: YASSIN_PHONE,
          type: 'text',
          text: { body: reportText }
        })
      }
    );

    if (!response.ok) {
      console.error('[Daily Report] WhatsApp send failed:', await response.text());
    } else {
      console.log('[Daily Report] Sent successfully');
    }

  } catch (error) {
    console.error('[Daily Report] Send error:', error);
  }
}
