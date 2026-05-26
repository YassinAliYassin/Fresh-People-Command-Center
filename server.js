import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import db from './db.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(express.json());
app.use(cors());
app.use(express.static('public')); // Serve static files

// CREATE event
app.post('/api/events', (req, res) => {
  const { id, title, date, duration, staffName, dressCode, uniformType, arrivalTime, staffPhone, staffEmail, clientID, clientBudget, clientName, clientPhone, clientEmail, miscExpenses } = req.body;
  const sql = `INSERT INTO events (id, title, date, duration, staffName, dressCode, uniformType, arrivalTime, staffPhone, staffEmail, clientID, clientBudget, clientName, clientPhone, clientEmail, misc_expenses) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  db.run(sql, [
    id,
    title,
    date,
    duration || 4,
    staffName || '',
    dressCode || 'All Black',
    uniformType || 'Formal All Black',
    arrivalTime || '',
    staffPhone || '',
    staffEmail || '',
    clientID || null,
    clientBudget || 0,
    clientName || '',
    clientPhone || '',
    clientEmail || '',
    miscExpenses ? JSON.stringify(miscExpenses) : '[]'
  ], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.status(201).json({ message: 'Event created', id: this.lastID });
  });
});

// ==================
// STAFF ENDPOINTS
// ==================

// GET all staff
app.get('/api/staff', (req, res) => {
  db.all('SELECT * FROM staff ORDER BY fullName', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ staff: rows });
  });
});

// CREATE staff
app.post('/api/staff', (req, res) => {
  const { fullName, phone, role, rate } = req.body;
  if (!fullName) return res.status(400).json({ error: 'fullName required' });
  
  const sql = `INSERT INTO staff (fullName, phone, role, rate) VALUES (?, ?, ?, ?)`;
  db.run(sql, [fullName, phone || '', role || '', rate || 0], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ id: this.lastID, message: 'Staff created' });
  });
});

// UPDATE staff
app.put('/api/staff/:id', (req, res) => {
  const { fullName, phone, role, rate } = req.body;
  const sql = `UPDATE staff SET fullName = ?, phone = ?, role = ?, rate = ? WHERE id = ?`;
  db.run(sql, [fullName, phone || '', role || '', rate || 0, req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Staff updated', changes: this.changes });
  });
});

// DELETE staff
app.delete('/api/staff/:id', (req, res) => {
  // First remove any assignments
  db.run('DELETE FROM staff_assignments WHERE staffId = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    
    db.run('DELETE FROM staff WHERE id = ?', [req.params.id], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Staff deleted', changes: this.changes });
    });
  });
});

// ==================
// ASSIGNMENT ENDPOINTS
// ==================

// GET event assignments with staff details
app.get('/api/events/:id/assignments', (req, res) => {
  const sql = `
    SELECT sa.id, sa.eventId, sa.staffId, sa.shift_type, sa.status, sa.totalHours, sa.earnedAmount, sa.date_worked,
           s.fullName, s.phone, s.role
    FROM staff_assignments sa
    JOIN staff s ON s.id = sa.staffId
    WHERE sa.eventId = ?
  `;
  db.all(sql, [req.params.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const assignments = rows.map(row => ({
      id: row.id,
      eventId: row.eventId,
      staffId: row.staffId,
      shiftType: row.shift_type || 'Full Shift',
      status: row.status || 'Pending',
      totalHours: row.totalHours || 0,
      earnedAmount: row.earnedAmount || 0,
      dateWorked: row.date_worked || '',
      fullName: row.fullName,
      phone: row.phone,
      role: row.role
    }));
    res.json({ assignments });
  });
});

// ASSIGN staff to event
app.post('/api/events/:id/assignments', (req, res) => {
  const { staffId, shiftType, staffPhone } = req.body;
  if (!staffId) return res.status(400).json({ error: 'staffId required' });
  
  // Check if already assigned
  db.get('SELECT id FROM staff_assignments WHERE eventId = ? AND staffId = ?', 
    [req.params.id, staffId], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (row) return res.status(400).json({ error: 'Staff already assigned to this event' });
    
    // Shift conflict check: same staff on same day in overlapping shifts
    const checkConflict = `
      SELECT e.date, e.title FROM events e
      JOIN staff_assignments sa ON e.id = sa.eventId
      WHERE sa.staffId = ? AND e.date = (SELECT date FROM events WHERE id = ?)
      AND sa.shift_type != ? AND sa.shift_type != 'Double Shift'
    `;
    db.get(checkConflict, [staffId, req.params.id, shiftType || 'Full Shift'], (err, conflictRow) => {
      if (err) return res.status(500).json({ error: err.message });
      
      const insertSql = 'INSERT INTO staff_assignments (eventId, staffId, shift_type) VALUES (?, ?, ?)';
      db.run(insertSql, [req.params.id, staffId, shiftType || 'Full Shift'], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        
        // Send WhatsApp notification to staff
        const token = process.env.WHATSAPP_ACCESS_TOKEN;
        const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
        const phone = staffPhone || '';
        
        if (token && phoneId && phone) {
          const message = `Hello! You've been assigned to event ${req.params.id}. Shift: ${shiftType || 'Full Shift'}. Reply CONFIRM to accept.`;
          fetch(`https://graph.facebook.com/v18.0/${phoneId}/messages`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              to: phone,
              text: { body: message }
            })
          }).then(response => {
            if (!response.ok) {
              console.error('WhatsApp send failed:', response.statusText);
            } else {
              console.log(`WhatsApp sent to ${phone}`);
            }
          }).catch(err => console.error('WhatsApp send failed:', err));
        }
        
        const response = { id: this.lastID, message: 'Staff assigned' };
        if (conflictRow) {
          response.warning = `Shift conflict: Staff already assigned to "${conflictRow.title}" on same day`;
        }
        res.status(201).json(response);
      });
    });
  });
});

// REMOVE staff assignment
app.delete('/api/events/:eventId/assignments/:staffId', (req, res) => {
  db.run('DELETE FROM staff_assignments WHERE eventId = ? AND staffId = ?',
    [req.params.eventId, req.params.staffId], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Staff unassigned', changes: this.changes });
  });
});

// UPDATE staff assignment status
app.patch('/api/events/:eventId/assignments/:staffId', (req, res) => {
  const { status } = req.body;
  if (!status || !['Pending', 'Confirmed', 'Unavailable'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status. Use Pending, Confirmed, or Unavailable' });
  }
  
  const sql = 'UPDATE staff_assignments SET status = ? WHERE eventId = ? AND staffId = ?';
  db.run(sql, [status, req.params.eventId, req.params.staffId], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Assignment not found' });
    res.json({ message: `Status updated to ${status}`, changes: this.changes });
  });
});

// UPDATE timesheet (hours worked + earnings)
app.patch('/api/assignments/:id/timesheet', (req, res) => {
  const { totalHours, dateWorked } = req.body;
  if (!totalHours || !dateWorked) {
    return res.status(400).json({ error: 'totalHours and dateWorked required' });
  }
  
  const earnedAmount = totalHours * 40; // R40/hr
  const sql = 'UPDATE staff_assignments SET totalHours = ?, earnedAmount = ?, date_worked = ? WHERE id = ?';
  db.run(sql, [totalHours, earnedAmount, dateWorked, req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Assignment not found' });
    res.json({ message: 'Timesheet updated', totalHours, earnedAmount, changes: this.changes });
  });
});

// GET payroll data (26th-25th cycle)
app.get('/api/payroll', (req, res) => {
  const { cycleStart, cycleEnd } = req.query;
  
  // Default to current payroll cycle (26th of last month to 25th of this month)
  let startDate, endDate;
  const now = new Date();
  const currentDay = now.getDate();
  
  if (cycleStart && cycleEnd) {
    startDate = cycleStart;
    endDate = cycleEnd;
  } else if (currentDay >= 26) {
    // After 26th: cycle starts this month on 26th
    startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-26`;
    endDate = `${now.getFullYear()}-${String(now.getMonth() + 2).padStart(2, '0')}-25`;
  } else {
    // Before 26th: cycle started last month on 26th
    const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
    const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    startDate = `${year}-${String(lastMonth + 1).padStart(2, '0')}-26`;
    endDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-25`;
  }
  
  const sql = `
    SELECT 
      s.id as staffId,
      s.fullName,
      s.phone,
      s.role,
      COUNT(sa.id) as assignmentsCount,
      SUM(sa.totalHours) as totalHours,
      SUM(sa.earnedAmount) as totalEarned
    FROM staff s
    LEFT JOIN staff_assignments sa ON s.id = sa.staffId
    WHERE sa.date_worked BETWEEN ? AND ?
    GROUP BY s.id
    HAVING totalHours > 0
    ORDER BY totalEarned DESC
  `;
  
  db.all(sql, [startDate, endDate], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({
      cycleStart: startDate,
      cycleEnd: endDate,
      staff: rows.map(r => ({
        staffId: r.staffId,
        fullName: r.fullName,
        phone: r.phone,
        role: r.role,
        assignmentsCount: r.assignmentsCount || 0,
        totalHours: r.totalHours || 0,
        totalEarned: r.totalEarned || 0
      }))
    });
  });
});

// ==================
// EVENTS ENDPOINTS (Updated to include assignments)
// ==================

// READ all events (with assigned staff + financials)
app.get('/api/events', (req, res) => {
  db.all(`SELECT e.*, c.name as clientName, c.phone as clientPhone, c.email as clientEmail 
          FROM events e 
          LEFT JOIN clients c ON e.clientID = c.id 
          ORDER BY e.date DESC`, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    // For each event, fetch assignments and calculate financials
    const eventPromises = rows.map(row => {
      return new Promise((resolve) => {
        const miscExpenses = row.misc_expenses ? JSON.parse(row.misc_expenses) : [];
        const miscTotal = miscExpenses.reduce((sum, e) => sum + e.amount, 0);
        
        const event = {
          id: row.id,
          title: row.title,
          date: row.date,
          duration: row.duration,
          staffName: row.staffName,
          staffPhone: row.staffPhone,
          staffEmail: row.staffEmail,
          clientId: row.clientID,
          clientName: row.clientName || row.clientName, // From join or legacy
          clientPhone: row.clientPhone || row.clientPhone,
          clientEmail: row.clientEmail || row.clientEmail,
          clientBudget: row.clientBudget || 0,
          dressCode: row.dressCode,
          uniformType: row.uniformType,
          arrivalTime: row.arrivalTime,
          miscExpenses: miscExpenses,
          createdAt: row.created_at
        };
        
        // Fetch assigned staff with shift type, status, and payroll data
        const sql = `
          SELECT s.id, s.fullName, s.phone, s.role, sa.shift_type, sa.status, sa.totalHours, sa.earnedAmount, sa.date_worked 
          FROM staff s
          JOIN staff_assignments sa ON s.id = sa.staffId
          WHERE sa.eventId = ?
        `;
        db.all(sql, [row.id], (err, staffRows) => {
          if (!err && staffRows.length > 0) {
            event.assignedStaff = staffRows.map(s => ({
              id: s.id,
              fullName: s.fullName,
              phone: s.phone,
              role: s.role,
              shiftType: s.shift_type || 'Full Shift',
              status: s.status || 'Pending',
              totalHours: s.totalHours || 0,
              earnedAmount: s.earnedAmount || 0,
              dateWorked: s.date_worked || ''
            }));
            
            // Calculate totalEventCost = staff payroll + misc expenses
            const staffPayrollCost = staffRows.reduce((sum, s) => sum + (s.earnedAmount || 0), 0);
            event.totalEventCost = staffPayrollCost + miscTotal;
            event.netProfit = (event.clientBudget || 0) - event.totalEventCost;
          } else {
            event.totalEventCost = miscTotal;
            event.netProfit = (event.clientBudget || 0) - miscTotal;
          }
          
          resolve(event);
        });
      });
    });
    
    Promise.all(eventPromises).then(events => {
      res.json({ events });
    });
  });
});

// UPDATE event
app.put('/api/events/:id', (req, res) => {
  const { title, date, duration, staffName, dressCode, uniformType, arrivalTime, staffPhone, staffEmail, clientID, clientBudget, clientName, clientPhone, clientEmail, miscExpenses } = req.body;
  
  // Build dynamic SQL to preserve fields not being updated
  const fields = [];
  const values = [];
  
  if (title !== undefined) { fields.push('title = ?'); values.push(title); }
  if (date !== undefined) { fields.push('date = ?'); values.push(date); }
  if (duration !== undefined) { fields.push('duration = ?'); values.push(duration); }
  if (staffName !== undefined) { fields.push('staffName = ?'); values.push(staffName || ''); }
  if (dressCode !== undefined) { fields.push('dressCode = ?'); values.push(dressCode || ''); }
  if (uniformType !== undefined) { fields.push('uniformType = ?'); values.push(uniformType || ''); }
  if (arrivalTime !== undefined) { fields.push('arrivalTime = ?'); values.push(arrivalTime || ''); }
  if (staffPhone !== undefined) { fields.push('staffPhone = ?'); values.push(staffPhone || ''); }
  if (staffEmail !== undefined) { fields.push('staffEmail = ?'); values.push(staffEmail || ''); }
  if (clientID !== undefined) { fields.push('clientID = ?'); values.push(clientID || null); }
  if (clientBudget !== undefined) { fields.push('clientBudget = ?'); values.push(clientBudget || 0); }
  if (clientName !== undefined) { fields.push('clientName = ?'); values.push(clientName || ''); }
  if (clientPhone !== undefined) { fields.push('clientPhone = ?'); values.push(clientPhone || ''); }
  if (clientEmail !== undefined) { fields.push('clientEmail = ?'); values.push(clientEmail || ''); }
  if (miscExpenses !== undefined) { fields.push('misc_expenses = ?'); values.push(JSON.stringify(miscExpenses)); }
  
  if (fields.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }
  
  values.push(req.params.id);
  const sql = `UPDATE events SET ${fields.join(', ')} WHERE id = ?`;
  
  db.run(sql, values, function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: 'Event updated', changes: this.changes });
  });
});

// DELETE event
app.delete('/api/events/:id', (req, res) => {
  db.run(`DELETE FROM events WHERE id = ?`, req.params.id, function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: 'Event deleted', changes: this.changes });
  });
});

// ==================
// WHATSAPP WEBHOOK ENDPOINTS
// ==================

// Webhook verification (Meta requires this)
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'fresh_people_verify_token';
  
  if (mode === 'subscribe' && token === verifyToken) {
    console.log('WhatsApp webhook verified');
    res.status(200).send(challenge);
  } else {
    res.status(403).send('Verification failed');
  }
});

// Receive WhatsApp messages (staff replies)
app.post('/webhook', (req, res) => {
  const { object, entry } = req.body;
  
  if (object === 'whatsapp_business_account') {
    entry.forEach(entry => {
      entry.changes.forEach(change => {
        if (change.field === 'messages') {
          const messages = change.value.messages;
          if (messages) {
            messages.forEach(message => {
              const from = message.from;
              const text = message.text?.body?.toUpperCase() || '';
              
              console.log(`WhatsApp from ${from}: ${text}`);
              
              // Handle staff confirmation
              if (text.includes('CONFIRM')) {
                // Update staff assignment status to 'Confirmed'
                db.run(
                  `UPDATE staff_assignments SET status = 'Confirmed' 
                   WHERE staffId = (SELECT id FROM staff WHERE phone LIKE ?) 
                   AND status = 'Pending'`,
                  [`%${from}%`],
                  function(err) {
                    if (err) console.error('Status update failed:', err);
                    else console.log(`Staff ${from} confirmed assignment`);
                  }
                );
              }
            });
          }
        }
      });
    });
  }
  
  res.status(200).send('OK');
});


// --- APPLE CALENDAR INTEGRATION ---
app.get('/api/calendar.ics', (req, res) => {
  db.all('SELECT * FROM events', [], (err, events) => {
    if (err) {
      return res.status(500).send('Error fetching events');
    }

    let icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//FreshPeople//CommandCenter//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH`;

    events.forEach(evt => {
      const startDate = new Date(evt.date);
      const dtstart = startDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      const endDate = new Date(startDate.getTime() + (evt.duration || 4) * 60 * 60 * 1000);
      const dtend = endDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      
      icsContent += `
BEGIN:VEVENT
UID:${evt.id}@freshpeople.co.za
DTSTAMP:${dtstart}
DTSTART:${dtstart}
DTEND:${dtend}
SUMMARY:${evt.title}
DESCRIPTION:Staff: ${evt.staff_assigned || 'None'}\\nDress: ${evt.dressCode || 'All Black'}
END:VEVENT`;
    });

    icsContent += `
END:VCALENDAR`;

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="FreshPeople-Events.ics"');
    res.send(icsContent);
  });
});

app.listen(port, () => {
  console.log(`Backend server running on http://localhost:${port}`);
  console.log(`WhatsApp webhook: http://localhost:${port}/webhook`);
});

// ==================
// CLIENTS ENDPOINTS
// ==================

// GET all clients (with event stats)
app.get('/api/clients', (req, res) => {
  const sql = `
    SELECT c.*, 
           COUNT(DISTINCT e.id) as eventsBooked,
           COALESCE(SUM(e.clientBudget), 0) as totalRevenue
    FROM clients c
    LEFT JOIN events e ON c.id = e.clientID
    GROUP BY c.id
    ORDER BY totalRevenue DESC
  `;
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ 
      clients: rows.map(r => ({
        id: r.id,
        name: r.name,
        contactPerson: r.contactPerson,
        email: r.email,
        phone: r.phone,
        eventsBooked: r.eventsBooked || 0,
        totalRevenue: r.totalRevenue || 0
      }))
    });
  });
});

// CREATE client
app.post('/api/clients', (req, res) => {
  const { name, contactPerson, email, phone } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  
  const sql = `INSERT INTO clients (name, contactPerson, email, phone) VALUES (?, ?, ?, ?)`;
  db.run(sql, [name, contactPerson || '', email || '', phone || ''], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ id: this.lastID, message: 'Client created' });
  });
});

// UPDATE client
app.put('/api/clients/:id', (req, res) => {
  const { name, contactPerson, email, phone } = req.body;
  const sql = `UPDATE clients SET name = ?, contactPerson = ?, email = ?, phone = ? WHERE id = ?`;
  db.run(sql, [name, contactPerson || '', email || '', phone || '', req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Client updated', changes: this.changes });
  });
});

// DELETE client
app.delete('/api/clients/:id', (req, res) => {
  // Check if client has events
  db.get('SELECT id FROM events WHERE clientID = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (row) return res.status(400).json({ error: 'Cannot delete client with booked events' });
    
    db.run('DELETE FROM clients WHERE id = ?', [req.params.id], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Client deleted', changes: this.changes });
    });
  });
});
