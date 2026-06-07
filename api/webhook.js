import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export default async function handler(req, res) {
  // GET: Meta WhatsApp webhook verification
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'fresh_people_verify_token';

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }
    return res.status(403).json({ error: 'Verification failed' });
  }

  // POST: Handle incoming messages
  if (req.method === 'POST') {
    try {
      const body = req.body;

      // Check if it's a WhatsApp message
      if (body.object === 'whatsapp_business_account') {
        for (const entry of body.entry || []) {
          for (const change of entry.changes || []) {
            if (change.field === 'messages') {
              const messages = change.value?.messages || [];
              
              for (const message of messages) {
                await handleWhatsAppMessage(message, change.value?.metadata);
              }
            }
          }
        }
      } 
      // Check if it's an event sync (from iCloud or other source)
      else if (body.id || body.title) {
        await handleEventSync(body);
      }

      return res.status(200).json({ success: true });

    } catch (error) {
      console.error('[Webhook] Error:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

// Handle incoming WhatsApp messages (YES/NO replies)
async function handleWhatsAppMessage(message, metadata) {
  try {
    const from = message.from; // Phone number
    const msgBody = message.text?.body?.toLowerCase().trim() || '';

    console.log(`[Webhook] Received from ${from}: "${msgBody}"`);

    // Determine response type
    let status = 'pending';
    if (msgBody === 'yes' || msgBody === 'confirm' || msgBody === 'confirmed') {
      status = 'confirmed';
    } else if (msgBody === 'no' || msgBody === 'decline' || msgBody === 'declined') {
      status = 'declined';
    } else {
      console.log(`[Webhook] Unrecognized response: ${msgBody}`);
      return;
    }

    // Find pending confirmation for this phone number
    const confResult = await pool.query(`
      SELECT * FROM staff_confirmations 
      WHERE staff_phone = $1 AND status = 'pending'
      ORDER BY created_at DESC
      LIMIT 1
    `, [from]);

    if (confResult.rows.length === 0) {
      console.log(`[Webhook] No pending confirmation found for ${from}`);
      return;
    }

    const confirmation = confResult.rows[0];

    // Update confirmation status
    await pool.query(`
      UPDATE staff_confirmations
      SET status = $1, response_message = $2, responded_at = NOW()
      WHERE id = $3
    `, [status, msgBody, confirmation.id]);

    // Log to whatsapp_messages table
    await pool.query(`
      INSERT INTO whatsapp_messages (direction, sender_phone, message_type, content, status, related_event)
      VALUES ('inbound', $1, 'staff_response', $2, 'read', $3)
    `, [from, msgBody, confirmation.event_id]);

    console.log(`[Webhook] Updated confirmation for ${from} to ${status}`);

    // Send acknowledgment message
    await sendAcknowledgment(from, status);

  } catch (error) {
    console.error('[Webhook] Handle message error:', error);
  }
}

// Send acknowledgment message
async function sendAcknowledgment(phone, status) {
  try {
    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_ID;

    const message = status === 'confirmed' 
      ? 'Thank you! Your attendance has been confirmed. See you at the event!'
      : 'Thank you for your response. We will assign another staff member.';

    await fetch(`https://graph.facebook.com/v18.0/${phoneId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phone,
        type: 'text',
        text: { body: message }
      })
    });

  } catch (error) {
    console.error('[Webhook] Send acknowledgment error:', error);
  }
}

// Handle event sync (from iCloud or other sources)
async function handleEventSync(event) {
  try {
    const id = event.id || `FP-${Date.now()}`;
    
    await pool.query(`
      INSERT INTO events (id, title, date, duration, staff_assigned, dressCode, arrivalTime)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        date = EXCLUDED.date,
        duration = EXCLUDED.duration,
        staff_assigned = EXCLUDED.staff_assigned,
        dressCode = EXCLUDED.dressCode,
        arrivalTime = EXCLUDED.arrivalTime
    `, [
      id,
      event.title,
      event.date,
      event.duration || 4,
      JSON.stringify(event.staff_assigned || []),
      event.dressCode || 'Formal All Black',
      event.arrivalTime || '1hr before'
    ]);

    console.log(`[Webhook] Event synced: ${id}`);
  } catch (error) {
    console.error('[Webhook] Event sync error:', error);
  }
}
