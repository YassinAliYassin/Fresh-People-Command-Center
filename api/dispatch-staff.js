/**
 * WhatsApp Dispatch Staff Endpoint
 * Sends event notifications to staff via WhatsApp
 */

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const wabaId = process.env.WHATSAPP_WABA_ID;
    
    if (!token || !phoneId) {
      return res.status(500).json({
        error: 'WhatsApp not configured',
        details: 'Missing WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID'
      });
    }

    const { eventId, staffIds, message } = req.body;

    if (!eventId || !staffIds || !Array.isArray(staffIds) || staffIds.length === 0) {
      return res.status(400).json({
        error: 'Invalid request',
        details: 'eventId and staffIds (array) are required'
      });
    }

    // Fetch event details from database
    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });

    const eventResult = await pool.query(
      'SELECT * FROM events WHERE id = $1',
      [eventId]
    );

    if (eventResult.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const event = eventResult.rows[0];

    // Fetch staff details
    const staffResult = await pool.query(
      'SELECT * FROM staff WHERE id = ANY($1::int[])',
      [staffIds]
    );

    const staffList = staffResult.rows;

    if (staffList.length === 0) {
      return res.status(404).json({ error: 'No staff found' });
    }

    // Format event message
    const eventMessage = message || formatEventMessage(event);

    // Send WhatsApp messages to each staff member
    const results = [];
    
    for (const staff of staffList) {
      if (!staff.phone) {
        results.push({
          staffId: staff.id,
          staffName: staff.name,
          status: 'skipped',
          reason: 'No phone number'
        });
        continue;
      }

      try {
        const whatsappResponse = await sendWhatsAppMessage(
          token,
          phoneId,
          staff.phone,
          eventMessage
        );

        results.push({
          staffId: staff.id,
          staffName: staff.name,
          staffPhone: staff.phone,
          status: 'sent',
          messageId: whatsappResponse.message_id,
          waMessageId: whatsappResponse.wa_message_id
        });
      } catch (error) {
        results.push({
          staffId: staff.id,
          staffName: staff.name,
          staffPhone: staff.phone,
          status: 'failed',
          error: error.message
        });
      }
    }

    await pool.end();

    return res.status(200).json({
      success: true,
      event: {
        id: event.id,
        title: event.title,
        start_time: event.start_time,
        location: event.location
      },
      dispatched: results.filter(r => r.status === 'sent').length,
      skipped: results.filter(r => r.status === 'skipped').length,
      failed: results.filter(r => r.status === 'failed').length,
      results: results
    });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({
      error: error.message || 'Server error',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

/**
 * Format event message for WhatsApp
 */
function formatEventMessage(event) {
  const startDate = new Date(event.start_time).toLocaleDateString('en-ZA', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  const startTime = new Date(event.start_time).toLocaleTimeString('en-ZA', {
    hour: '2-digit',
    minute: '2-digit'
  });

  return `📅 *EVENT ASSIGNMENT*

🎫 *Event:* ${event.title}
📅 *Date:* ${startDate}
🕐 *Time:* ${startTime}
📍 *Location:* ${event.location || 'TBA'}

Please confirm your availability. Reply YES to accept or NO to decline.

Thank you!
Fresh People Team`;
}

/**
 * Send WhatsApp message via Meta Graph API
 */
async function sendWhatsAppMessage(token, phoneId, to, message) {
  // Format phone number (remove + and spaces)
  const formattedPhone = to.replace(/[\s\+\-]/g, '');

  const url = `https://graph.facebook.com/v22.0/${phoneId}/messages`;
  
  const payload = {
    messaging_product: 'whatsapp',
    to: formattedPhone,
    type: 'text',
    text: {
      body: message
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || 'WhatsApp API error');
  }

  return {
    message_id: data.messages?.[0]?.id,
    wa_message_id: data.messages?.[0]?.wa_message_id
  };
}
