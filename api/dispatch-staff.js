// WhatsApp Staff Dispatch API - Enhanced with better validation
// Sends booking notifications via WhatsApp Business API

export default async function handler(req, res) {
  // Set CORS headers
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
    const { eventId, staffIds } = req.body;
    
    // Validate input
    if (!eventId || typeof eventId !== 'number') {
      return res.status(400).json({ 
        success: false, 
        error: 'Valid eventId (number) required',
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
    
    // Validate all staffIds are numbers
    if (!staffIds.every(id => typeof id === 'number')) {
      return res.status(400).json({ 
        success: false, 
        error: 'All staffIds must be numbers',
        dispatched: 0 
      });
    }

    // Mock event and staff data - in production, fetch from database
    const mockEvent = {
      id: eventId,
      title: "Corporate Gala - MTN",
      date: "June 15, 2026", 
      time: "6:00 PM - 11:00 PM",
      venue: "Hyatt Regency JHB",
      rate: "R180/hour"
    };

    const mockStaff = [
      { id: 1, name: "Amara Diallo", phone: "+27710010001" },
      { id: 2, name: "Themba Nkosi", phone: "+27710010002" },
      { id: 3, name: "Priya Moodley", phone: "+27710010003" },
      { id: 4, name: "Lerato Khumalo", phone: "+27710010004" }
    ];

    const results = {
      success: true,
      dispatched: 0,
      skipped: 0,
      failed: 0,
      details: []
    };

    // WhatsApp message template
    const message = `🎉 NEW BOOKING ALERT

Event: ${mockEvent.title}
Date: ${mockEvent.date}
Time: ${mockEvent.time}
Venue: ${mockEvent.venue}
Rate: ${mockEvent.rate}

Reply YES to accept
Reply NO to decline
Questions? Call +27 67 296 1272

Fresh People Event Staffing
www.fresh-people.co.za`;

    // Process each staff member
    for (const staffId of staffIds) {
      const staff = mockStaff.find(s => s.id === staffId);
      
      if (!staff || !staff.phone) {
        results.skipped++;
        results.details.push({
          staffId,
          status: 'skipped',
          reason: 'No phone number found'
        });
        continue;
      }

      try {
        // Send WhatsApp message via Meta Business API
        const whatsappResult = await sendWhatsAppMessage(staff.phone, message);
        
        if (whatsappResult.success) {
          results.dispatched++;
          results.details.push({
            staffId,
            name: staff.name,
            phone: staff.phone,
            status: 'sent',
            messageId: whatsappResult.messageId
          });
        } else {
          results.failed++;
          results.details.push({
            staffId,
            name: staff.name,
            phone: staff.phone,
            status: 'failed',
            error: whatsappResult.error
          });
        }
      } catch (error) {
        results.failed++;
        results.details.push({
          staffId,
          name: staff.name,
          phone: staff.phone,
          status: 'failed',
          error: error.message
        });
      }
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
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  
  if (!whatsappToken || !phoneNumberId) {
    return {
      success: false,
      error: 'WhatsApp credentials not configured'
    };
  }

  try {
    const response = await fetch(`https://graph.facebook.com/v22.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${whatsappToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phoneNumber.replace(/[^\d+]/g, ''), // Clean phone number
        type: 'text',
        text: { body: message }
      })
    });

    const data = await response.json();
    
    if (response.ok && data.messages?.[0]?.id) {
      return {
        success: true,
        messageId: data.messages[0].id
      };
    } else {
      return {
        success: false,
        error: data.error?.message || 'WhatsApp API error'
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}
