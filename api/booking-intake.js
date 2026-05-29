import { createBooking } from '../lib/db-phase2.js';

// Simple NLP pattern matching for WhatsApp booking messages
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, phone } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'No message provided' });
    }

    // Extract booking details
    const extracted = extractBookingDetails(message);
    
    // Override client phone if provided
    if (phone) extracted.client_phone = phone;
    
    // Create booking record
    const booking = await createBooking(extracted);
    
    return res.status(201).json({
      success: true,
      booking,
      extracted,
      message: 'Booking intake complete'
    });
    
  } catch (error) {
    console.error('[Booking Intake] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

function extractBookingDetails(message) {
  const data = {
    client_name: null,
    client_phone: null,
    venue: null,
    event_date: null,
    event_time: null,
    staff_required: 0,
    raw_message: message,
    extracted_data: {}
  };

  // Extract client name (after "Client" or at end)
  const clientMatch = message.match(/(?:client|from):\s*([A-Za-z\s]+)/i);
  if (clientMatch) {
    data.client_name = clientMatch[1].trim();
  }

  // Extract phone number (South African format)
  const phoneMatch = message.match(/(\+?27\d{9}|0\d{9})/);
  if (phoneMatch) {
    data.client_phone = phoneMatch[1];
  }

  // Extract venue (after "at" or "venue")
  const venueMatch = message.match(/(?:at|venue):\s*([A-Za-z\s,]+?)(?:\s+on|\s+need|\s*$)/i);
  if (venueMatch) {
    data.venue = venueMatch[1].trim();
  }

  // Extract date (various formats)
  const dateMatch = message.match(/(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}|\d{4}-\d{2}-\d{2}|\d{1,2}[-\/]\d{1,2}[-\/]\d{4})/i);
  if (dateMatch) {
    data.event_date = parseDate(dateMatch[1]);
  }

  // Extract time
  const timeMatch = message.match(/(\d{1,2}:\d{2}\s*(?:AM|PM)?)/i);
  if (timeMatch) {
    data.event_time = timeMatch[1].trim();
  }

  // Extract number of staff needed
  const staffMatch = message.match(/(\d+)\s*(?:waiters?|staff|people)/i);
  if (staffMatch) {
    data.staff_required = parseInt(staffMatch[1], 10);
  }

  // Determine event type (Wedding, Corporate, etc.)
  const eventTypeMatch = message.match(/^(Wedding|Corporate|Birthday|Anniversary|Conference)/i);
  if (eventTypeMatch) {
    data.extracted_data.event_type = eventTypeMatch[1];
  }

  data.extracted_data = {
    ...data.extracted_data,
    original_message: message
  };

  return data;
}

function parseDate(dateStr) {
  // Try various date formats
  const months = {
    'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
    'may': '05', 'jun': '06', 'jul': '07', 'aug': '08',
    'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
  };

  // Format: "15 June 2026" or "15 Jun 2026"
  const match1 = dateStr.match(/(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})/i);
  if (match1) {
    const day = match1[1].padStart(2, '0');
    const month = months[match1[2].toLowerCase().substring(0, 3)];
    const year = match1[3];
    return `${year}-${month}-${day}`;
  }

  // Format: YYYY-MM-DD
  const match2 = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (match2) {
    return dateStr;
  }

  // Format: DD/MM/YYYY or DD-MM-YYYY
  const match3 = dateStr.match(/(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/);
  if (match3) {
    return `${match3[3]}-${match3[2].padStart(2, '0')}-${match3[1].padStart(2, '0')}`;
  }

  return null;
}
