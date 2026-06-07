// WhatsApp Staff Dispatch API v2 - Uses real DB (no mock data)
// Sends booking notifications via WhatsApp Business API to staff assigned to an event.

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      dispatched: 0
    });
  }

  try {
    const { eventId, staffIds } = req.body || {};

    if (!eventId) {
      return res.status(400).json({
        success: false,
        error: 'eventId required',
        dispatched: 0
      });
    }

    if (!Array.isArray(staffIds) || staffIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'staffIds must be a non-empty array',
        dispatched: 0
      });
    }

    if (!process.env.DATABASE_URL) {
      return res.status(500).json({
        success: false,
        error: 'DATABASE_URL not configured',
        dispatched: 0
      });
    }

    // Dynamic pg import (serverless-compatible)
    const { Pool } = await import('pg');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 1,
      idleTimeoutMillis: 100,
    });

    // Fetch event details
    const eventResult = await pool.query(
      'SELECT * FROM events WHERE id = $1',
      [String(eventId)]
    );
    if (eventResult.rows.length === 0) {
      await pool.end();
      return res.status(404).json({
        success: false,
        error: `Event ${eventId} not found`,
        dispatched: 0
      });
    }
    const event = eventResult.rows[0];

    // Fetch staff by IDs (numeric or string)
    const staffResult = await pool.query(
      'SELECT id, name, phone, role FROM staff WHERE id = ANY($1::int[])',
      [staffIds.map(id => Number(id))]
    );
    const staffList = staffResult.rows;

    await pool.end();

    // Format booking alert message
    const eventDate = new Date(event.date);
    const dateStr = eventDate.toLocaleDateString('en-ZA', {
      weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
    });
    const startTime = eventDate.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
    const endTime = event.end_time
      ? new Date(event.end_time).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })
      : '';
    const timeStr = endTime ? `${startTime} - ${endTime}` : startTime;

    const message = `🎉 NEW BOOKING — ${event.title}

📅 ${dateStr}
⏰ ${timeStr}
📍 ${event.venue || 'TBD'}
👔 ${event.dresscode || 'Formal All Black'}
${event.clientname ? `🤝 Client: ${event.clientname}` : ''}

Reply YES to accept, NO to decline.
Questions? Call +27 67 296 1272

— Fresh People Event Staffing`;

    const results = {
      success: true,
      eventId,
      eventTitle: event.title,
      dispatched: 0,
      sent: 0,
      skipped: 0,
      failed: 0,
      details: [],
    };

    for (const member of staffList) {
      if (!member.phone) {
        results.skipped++;
        results.details.push({ staffId: member.id, name: member.name, status: 'skipped', reason: 'no phone' });
        continue;
      }

      const whatsappResult = await sendWhatsAppMessage(member.phone, message);
      const entry = { staffId: member.id, name: member.name, phone: member.phone, status: whatsappResult.success ? 'sent' : 'failed' };
      if (whatsappResult.success) {
        results.sent++;
        results.dispatched++;
        entry.messageId = whatsappResult.messageId;
      } else {
        results.failed++;
        entry.error = whatsappResult.error;
      }
      results.details.push(entry);
    }

    return res.status(200).json(results);

  } catch (error) {
    console.error('Dispatch error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
      dispatched: 0
    });
  }
}

async function sendWhatsAppMessage(phoneNumber, message) {
  const whatsappToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!whatsappToken || !phoneId) {
    return { success: false, error: 'WhatsApp credentials not configured (set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID)' };
  }

  try {
    const response = await fetch(`https://graph.facebook.com/v22.0/${phoneId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${whatsappToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: String(phoneNumber).replace(/[^\d+]/g, ''),
        type: 'text',
        text: { body: message },
      }),
    });

    const data = await response.json();
    if (response.ok && data.messages?.[0]?.id) {
      return { success: true, messageId: data.messages[0].id };
    }
    return { success: false, error: data.error?.message || `HTTP ${response.status}` };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
