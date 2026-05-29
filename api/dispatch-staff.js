import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_ID = process.env.WHATSAPP_PHONE_ID;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { event_id, staff_list, event_details } = req.body;
    
    if (!event_id || staff_list.length === 0) {
      return res.status(400).json({ error: 'Missing event_id or staff_list' });
    }

    const results = [];
    
    for (const staff of staff_list) {
      try {
        // Get staff phone from database
        const staffResult = await pool.query(
          'SELECT phone FROM staff WHERE name = $1 OR id = $1',
          [staff.staff_name || staff.name]
        );
        
        const phoneNumber = staffResult.rows[0]?.phone || staff.phone;
        
        if (!phoneNumber) {
          results.push({
            staff: staff.staff_name || staff.name,
            status: 'failed',
            error: 'No phone number found'
          });
          continue;
        }

        // Send WhatsApp message
        const message = formatStaffMessage(event_details);
        
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
              to: phoneNumber,
              type: 'text',
              text: { body: message }
            })
          }
        );

        const whatsappResult = await response.json();

        // Log to whatsapp_messages table
        await pool.query(`
          INSERT INTO whatsapp_messages (direction, recipient_phone, message_type, content, status, related_event)
          VALUES ('outbound', $1, 'staff_assignment', $2, $3, $4)
        `, [phoneNumber, message, response.ok ? 'sent' : 'failed', event_id]);

        // Create confirmation tracking record
        await pool.query(`
          INSERT INTO staff_confirmations (event_id, staff_name, staff_phone, status)
          VALUES ($1, $2, $3, 'pending')
          ON CONFLICT (event_id, staff_phone) 
          DO UPDATE SET status = 'pending', updated_at = NOW()
        `, [event_id, staff.staff_name || staff.name, phoneNumber]);

        results.push({
          staff: staff.staff_name || staff.name,
          phone: phoneNumber,
          status: response.ok ? 'sent' : 'failed',
          whatsapp_message_id: whatsappResult.messages?.[0]?.id
        });

      } catch (error) {
        console.error(`[Dispatch] Error sending to ${staff}:`, error);
        results.push({
          staff: staff.staff_name || staff.name,
          status: 'error',
          error: error.message
        });
      }
    }

    return res.status(200).json({
      success: true,
      dispatched: results.length,
      results
    });

  } catch (error) {
    console.error('[Dispatch] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

function formatStaffMessage(event) {
  return `Hi ${event.staff_name || 'there'}.

You have been assigned.

Event: ${event.title || 'Event'}
Venue: ${event.venue || 'TBA'}
Date: ${event.date || 'TBA'}
Time: ${event.time || 'TBA'}

Reply YES to confirm or NO to decline.`;
}
