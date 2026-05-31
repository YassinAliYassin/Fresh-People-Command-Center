export default async function handler(req, res) {
  try {
    const { Pool } = await import('pg');
    
    if (!process.env.DATABASE_URL) {
      return res.status(500).json({ error: 'DATABASE_URL not set' });
    }
    
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 1,
      idleTimeoutMillis: 100
    });
    
    // Create table if not exists (original schema only)
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS events (
          id TEXT PRIMARY KEY,
          title TEXT,
          date TEXT,
          duration INTEGER,
          staff_assigned TEXT
        )
      `);
    } catch (e) {
      console.log('Table creation note:', e.message);
    }
    
    const { id } = req.query;
    
    // Single event operations
    if (id) {
      if (req.method === 'GET') {
        const { rows } = await pool.query('SELECT * FROM events WHERE id = $1', [id]);
        if (rows.length === 0) {
          await pool.end();
          return res.status(404).json({ error: 'Event not found' });
        }
        const event = {
          ...rows[0],
          staff_assigned: typeof rows[0].staff_assigned === 'string' ? JSON.parse(rows[0].staff_assigned) : rows[0].staff_assigned
        };
        await pool.end();
        return res.json({ event });
      }
      
      if (req.method === 'PATCH') {
        const { title, date, duration, staff_assigned } = req.body;
        await pool.query(
          'UPDATE events SET title=$1, date=$2, duration=$3, staff_assigned=$4 WHERE id=$5',
          [title, date, duration, JSON.stringify(staff_assigned), id]
        );
        await pool.end();
        return res.json({ id, message: 'Event updated successfully' });
      }
      
      if (req.method === 'DELETE') {
        await pool.query('DELETE FROM events WHERE id=$1', [id]);
        await pool.end();
        return res.json({ message: 'Event deleted successfully' });
      }
      
      await pool.end();
      return res.status(405).json({ error: 'Method not allowed' });
    }
    
    // Collection operations
    if (req.method === 'GET') {
      const { rows } = await pool.query('SELECT * FROM events ORDER BY date ASC');
      const events = rows.map(row => ({
        ...row,
        staff_assigned: typeof row.staff_assigned === 'string' ? JSON.parse(row.staff_assigned) : row.staff_assigned
      }));
      await pool.end();
      return res.json({ events });
    }
    
    if (req.method === 'POST') {
      const { id, title, date, duration, staff_assigned, sendWhatsApp } = req.body;
      
      await pool.query(
        'INSERT INTO events (id, title, date, duration, staff_assigned) VALUES ($1, $2, $3, $4, $5)',
        [id, title, date, duration, JSON.stringify(staff_assigned)]
      );
      
      // Send WhatsApp notifications if requested
      let whatsappResults = [];
      if (sendWhatsApp && staff_assigned && staff_assigned.length > 0) {
        const eventDate = new Date(date);
        const whatsappMessage = `📅 NEW BOOKING ASSIGNED\n\nEvent: ${title}\nDate: ${eventDate.toLocaleDateString()}\nTime: ${eventDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}\nDuration: ${duration || 4}hrs\n\nPlease confirm availability. Thank you!`;
        
        for (const staffName of staff_assigned) {
          const staffResult = await pool.query('SELECT phone FROM staff WHERE name = $1', [staffName]);
          if (staffResult.rows.length > 0 && staffResult.rows[0].phone) {
            const phone = staffResult.rows[0].phone;
            const sent = await sendWhatsAppMessage(phone, whatsappMessage);
            whatsappResults.push({ staff: staffName, phone, sent });
          }
        }
      }
      
      await pool.end();
      return res.json({ 
        id, 
        message: 'Event created successfully',
        whatsapp: whatsappResults.length > 0 ? whatsappResults : undefined
      });
    }
    
    await pool.end();
    return res.status(405).json({ error: 'Method not allowed' });
    
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
}

async function sendWhatsAppMessage(phone, message) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  
  if (!token || !phoneId || !phone) {
    console.log('[WhatsApp] Missing credentials or phone, skipping');
    return false;
  }
  
  try {
    const response = await fetch(`https://graph.facebook.com/v22.0/${phoneId}/messages`, {
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
    
    const result = await response.json();
    if (result.error) {
      console.error('[WhatsApp] Error:', result.error);
      return false;
    }
    return true;
  } catch (e) {
    console.error('[WhatsApp] Send failed:', e.message);
    return false;
  }
}
