import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_ID = process.env.WHATSAPP_PHONE_ID;

// Admin auth check helper
function checkAuth(req) {
  const authHeader = req.headers.authorization;
  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret || authHeader !== `Bearer ${adminSecret}`) {
    return false;
  }
  return true;
}

//BOOKING INTAKE (POST /api/operations?action=booking-intake)
async function handleBookingIntake(req, res) {
  const { message, phone } = req.body;
  
  if (!message) {
    return res.status(400).json({ error: 'No message provided' });
  }
  
  // Simple NLP extraction
  const extracted = extractBookingDetails(message);
  if (phone) extracted.client_phone = phone;
  
  // Create booking record
  try {
    const result = await pool.query(`
      INSERT INTO bookings (client_name, client_phone, venue, event_date, event_time, staff_required, raw_message, extracted_data)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [extracted.client_name, extracted.client_phone, extracted.venue, extracted.event_date, extracted.event_time, extracted.staff_required, message, JSON.stringify(extracted)]);
    
    return res.status(201).json({
      success: true,
      booking: result.rows[0],
      extracted,
      message: 'Booking intake complete'
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

//STAFF DISPATCH (POST /api/operations?action=dispatch-staff)
async function handleDispatchStaff(req, res) {
  const { event_id, staff_list, event_details } = req.body;
  
  if (!event_id || !staff_list || staff_list.length === 0) {
    return res.status(400).json({ error: 'Missing event_id or staff_list' });
  }
  
  try {
    const results = [];
    
    for (const staff of staff_list) {
      const staffName = typeof staff === 'string' ? staff : staff.name;
      const staffPhone = typeof staff === 'string' ? '' : staff.phone;
      
      // Send WhatsApp message
      if (staffPhone && WHATSAPP_TOKEN) {
        const message = `Hello ${staffName}, you have a new event assignment: ${event_details?.title || 'Event'}. Date: ${event_details?.date || 'TBD'}. Venue: ${event_details?.venue || 'TBD'}. Reply YES to confirm or NO to decline.`;
        
        await fetch(`https://graph.facebook.com/v18.0/${PHONE_ID}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: staffPhone,
            text: { body: message }
          })
        });
      }
      
      // Insert into staff_confirmations
      await pool.query(`
        INSERT INTO staff_confirmations (event_id, staff_name, staff_phone, status)
        VALUES ($1, $2, $3, 'pending')
        ON CONFLICT (event_id, staff_phone)
        DO UPDATE SET status = 'pending', updated_at = NOW()
      `, [event_id, staffName, staffPhone]);
      
      // Log WhatsApp message
      await pool.query(`
        INSERT INTO whatsapp_messages (direction, recipient_phone, message_type, content, status, related_event)
        VALUES ('outbound', $1, 'staff_assignment', $2, 'sent', $3)
      `, [staffPhone, message, event_id]);
      
      results.push({ staff: staffName, status: 'assigned' });
    }
    
    return res.json({ success: true, dispatched: results.length, staff: results });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

// Simple NLP extraction
function extractBookingDetails(message) {
  const lower = message.toLowerCase();
  
  // Extract client name (capitalized words before "at" or similar)
  let client_name = 'Unknown';
  const nameMatch = message.match(/client\s+([A-Z][a-z]+)/i);
  if (nameMatch) client_name = nameMatch[1];
  
  // Extract phone
  let client_phone = '';
  const phoneMatch = message.match(/(\d{10,})/);
  if (phoneMatch) client_phone = phoneMatch[1];
  
  // Extract venue (after "at")
  let venue = '';
  const venueMatch = message.match(/at\s+([A-Z][a-zA-Z\s]+?)(?:\s+on|\s+need|\s*$)/i);
  if (venueMatch) venue = venueMatch[1].trim();
  
  // Extract date
  let event_date = null;
  const dateMatch = message.match(/(\d{1,2}\s+[A-Z][a-z]{2,}\s+\d{4})/);
  if (dateMatch) event_date = new Date(dateMatch[1]);
  
  // Extract staff count
  let staff_required = 0;
  const staffMatch = message.match(/(\d+)\s+(?:waiters|staff)/i);
  if (staffMatch) staff_required = parseInt(staffMatch[1]);
  
  return { client_name, client_phone, venue, event_date, staff_required, event_time: '18:00' };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // Auth check for all write operations
  if (!checkAuth(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const action = req.query.action || 'booking-intake';
  
  if (action === 'booking-intake') {
    return handleBookingIntake(req, res);
  } else if (action === 'dispatch-staff') {
    return handleDispatchStaff(req, res);
  }
  
  return res.status(400).json({ error: 'Invalid action' });
}
