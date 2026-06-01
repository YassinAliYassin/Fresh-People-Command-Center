import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import db from './db.js';
import ical from 'ical';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(express.json());
app.use(cors());
app.use(express.static('public')); // Serve static files

// Health check endpoint for deployment readiness
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// Fetch iCloud calendar events (JSON)
app.get('/api/calendar', async (req, res) => {
  try {
    const icloudUrl = process.env.ICLOUD_CALENDAR_URL;
    if (!icloudUrl) {
      return res.status(500).json({ error: 'ICLOUD_CALENDAR_URL not configured' });
    }

    const response = await fetch(icloudUrl);
    if (!response.ok) throw new Error(`Failed to fetch iCloud calendar: ${response.statusText}`);
    
    const icsText = await response.text();
    const parsed = ical.parseICS(icsText);
    
    const events = Object.values(parsed)
      .filter(obj => obj.type === 'VEVENT')
      .map(event => ({
        id: event.uid,
        title: event.summary || 'Untitled Event',
        start: event.start ? event.start.toISOString() : null,
        end: event.end ? event.end.toISOString() : null,
        description: event.description || '',
        location: event.location || '',
        source: 'icloud'
      }))
      .filter(e => e.start);

    res.json({ events });
  } catch (err) {
    console.error('iCloud calendar fetch failed:', err);
    res.status(500).json({ error: err.message });
  }
});

// Region pricing multiplier calculator (South African Provinces)
const getMultiplier = (region, pricingTier, availabilityStatus) => {
  let multiplier = 1.0;
  
  // South African Province ISO codes
  const regionMultipliers = {
    'ZA-GP': 1.2,    // Gauteng
    'ZA-WC': 1.1,    // Western Cape
    'ZA-KZN': 1.05,  // KwaZulu-Natal
    'ZA': 1.0        // Default fallback
};
  
  // Pricing tier multipliers
  const tierMultipliers = {
    'Standard': 1.0,
    'Premium': 1.3,
    'VIP': 1.6,
    'Corporate': 1.5
  };
  
  // Availability status multipliers (peak times)
  const availabilityMultipliers = {
    'Available': 1.0,
    'Peak': 1.25,
    'High Demand': 1.4,
    'Limited': 1.15
  };
  
  multiplier *= regionMultipliers[region] || regionMultipliers['ZA'];
  multiplier *= tierMultipliers[pricingTier] || 1.0;
  multiplier *= availabilityMultipliers[availabilityStatus] || 1.0;
  
  return multiplier.toFixed(2);
};

// Calculate current payroll cycle (26th of previous month to 25th of current month)
function getCurrentCycle() {
  const now = new Date();
  const currentDay = now.getDate();
  const currentMonth = now.getMonth(); // 0-indexed
  const currentYear = now.getFullYear();
  
  let startDate, endDate;
  
  if (currentDay >= 26) {
    // After 26th: cycle starts this month on 26th, ends 25th next month
    startDate = new Date(currentYear, currentMonth, 26);
    endDate = new Date(currentYear, currentMonth + 1, 25, 23, 59, 59, 999);
  } else {
    // Before 26th: cycle started last month on 26th, ends 25th this month
    startDate = new Date(currentYear, currentMonth - 1, 26);
    endDate = new Date(currentYear, currentMonth, 25, 23, 59, 59, 999);
  }
  
  return {
    start: startDate.toISOString().split('T')[0],
    end: endDate.toISOString().split('T')[0]
  };
}

// Recalculate staff total hours for current cycle (SQLite version)
function recalculateStaffHoursSQLite() {
  return new Promise((resolve, reject) => {
    const cycle = getCurrentCycle();
    
    // Get all events in current cycle
    db.all(`
      SELECT staff_assigned, duration, date FROM events 
      WHERE date >= ? AND date <= ?
    `, [cycle.start, cycle.end], (err, events) => {
      if (err) {
        console.error('Error fetching events for cycle:', err);
        return reject(err);
      }
      
      const staffHours = {};
      
      events.forEach(event => {
        const staffAssigned = typeof event.staff_assigned === 'string' 
          ? JSON.parse(event.staff_assigned) 
          : event.staff_assigned;
        const duration = event.duration || 5;
        
        if (Array.isArray(staffAssigned)) {
          staffAssigned.forEach(staffName => {
            if (!staffHours[staffName]) {
              staffHours[staffName] = 0;
            }
            staffHours[staffName] += duration;
          });
        }
      });
      
      // Update each staff member's total hours
      const staffNames = Object.keys(staffHours);
      let updated = 0;
      
      if (staffNames.length === 0) {
        // Reset all staff hours to 0 if no events in cycle
        db.run(`UPDATE staff SET total_hours = 0`, [], (err) => {
          if (err) console.error('Error resetting staff hours:', err);
          console.log('Staff total hours recalculated for cycle:', cycle.start, 'to', cycle.end);
          resolve();
        });
        return;
      }
      
      staffNames.forEach(staffName => {
        db.run(`UPDATE staff SET total_hours = ? WHERE fullName = ?`, 
          [staffHours[staffName], staffName], (err) => {
          if (err) console.error(`Error updating hours for ${staffName}:`, err);
          updated++;
          if (updated === staffNames.length) {
            console.log('Staff total hours recalculated for cycle:', cycle.start, 'to', cycle.end);
            resolve();
          }
        });
      });
    });
  });
}

// CREATE event
app.post('/api/events', async (req, res) => {
  const { 
    id, title, date, duration, staff_assigned, dressCode, uniformType, arrivalTime, 
    staffPhone, staffEmail, clientID, clientBudget, clientName, clientPhone, clientEmail,
    miscExpenses, region, pricing_tier, availability_status, base_price 
  } = req.body;
  
  // Validate required fields
  if (!title || !date) {
    return res.status(400).json({ error: 'Title and date are required' });
  }
  
  // Validate minimum 5-hour charge
  if (!duration || duration < 5) {
    return res.status(400).json({ error: 'Minimum event duration is 5 hours' });
  }

  // Calculate multiplier
  const multiplier = getMultiplier(region || 'ZA-GP', pricing_tier || 'Standard', availability_status || 'Available');
  
  const sql = `INSERT INTO events (id, title, date, duration, staffName, dressCode, uniformType, arrivalTime, staffPhone, staffEmail, clientID, clientBudget, clientName, clientPhone, clientEmail, misc_expenses, region, pricing_tier, availability_status, base_price, multiplier) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  
  db.run(sql, [
    id,
    title,
    date,
    duration || 5,
    Array.isArray(staff_assigned) ? staff_assigned.join(', ') : (staff_assigned || ''),
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
    miscExpenses ? JSON.stringify(miscExpenses) : '[]',
    region || 'ZA-GP',
    pricing_tier || 'Standard',
    availability_status || 'Available',
    base_price || 0,
    multiplier
  ], async function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    const eventId = id;
    // Recalculate staff hours after event creation
    await recalculateStaffHoursSQLite().catch(e => console.error('Recalculation error:', e));
    
    const eventDate = new Date(date);
    const formattedDate = eventDate.toLocaleDateString('en-ZA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const formattedTime = eventDate.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
    
    const whatsappResults = [];
    
    // Process staff assignments and send WhatsApp notifications
    if (Array.isArray(staff_assigned) && staff_assigned.length > 0) {
      // Fetch staff details for assigned staff
      const staffPlaceholders = staff_assigned.map(() => '?').join(',');
      const fetchStaffSql = `SELECT id, fullName, phone FROM staff WHERE fullName IN (${staffPlaceholders})`;
      
      db.all(fetchStaffSql, staff_assigned, async (err, staffRows) => {
        if (err) {
          console.error('Failed to fetch staff for event:', err);
          return res.status(201).json({ 
            message: 'Event created', 
            id: eventId, 
            whatsapp: [],
            warning: 'WhatsApp notifications failed: staff lookup error' 
          });
        }
        
        // Insert staff assignments
        staffRows.forEach(staff => {
          db.run('INSERT INTO staff_assignments (eventId, staffId) VALUES (?, ?)', [eventId, staff.id], (err) => {
            if (err) console.error('Failed to assign staff:', err);
          });
        });
        
        // Send WhatsApp notifications and track results
        const token = process.env.WHATSAPP_ACCESS_TOKEN;
        const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
        
        for (const staff of staffRows) {
          if (!token || !phoneId || !staff.phone) {
            whatsappResults.push({ 
              staff: staff.fullName, 
              phone: staff.phone || 'No phone', 
              sent: false, 
              error: !token ? 'Missing WhatsApp token' : !phoneId ? 'Missing phone ID' : 'No staff phone' 
            });
            continue;
          }
          
          // Format phone to E.164 (remove spaces, ensure + prefix)
          const formattedPhone = staff.phone.replace(/\s+/g, '');
          const e164Phone = formattedPhone.startsWith('+') ? formattedPhone : `+${formattedPhone}`;
          
          const message = `🎉 New Event Assignment!\n\nEvent: ${title}\nDate: ${formattedDate}\nTime: ${formattedTime}\nDuration: ${duration || 5} hours (Minimum 5-hour charge applies)\nArrival Time: ${arrivalTime || 'Not specified'}\nDress Code: ${dressCode || 'All Black'}\nClient: ${clientName || 'Not specified'}\n\nPlease confirm your availability.`;
          
          try {
            const response = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                messaging_product: 'whatsapp',
                to: e164Phone,
                text: { body: message }
              })
            });
            
            const responseData = await response.json();
            
            if (!response.ok) {
              console.error(`WhatsApp send failed to ${staff.fullName}:`, responseData.error?.message || response.statusText);
              whatsappResults.push({ 
                staff: staff.fullName, 
                phone: e164Phone, 
                sent: false, 
                error: responseData.error?.message || response.statusText 
              });
            } else {
              console.log(`WhatsApp sent to ${staff.fullName} (${e164Phone})`);
              whatsappResults.push({ 
                staff: staff.fullName, 
                phone: e164Phone, 
                sent: true 
              });
            }
          } catch (err) {
            console.error(`WhatsApp send failed to ${staff.fullName}:`, err);
            whatsappResults.push({ 
              staff: staff.fullName, 
              phone: e164Phone, 
              sent: false, 
              error: err.message 
            });
          }
        }
        
        res.status(201).json({ 
          message: 'Event created', 
          id: eventId, 
          whatsapp: whatsappResults 
        });
      });
    } else {
      res.status(201).json({ 
        message: 'Event created', 
        id: eventId, 
        whatsapp: [] 
      });
    }
  });
});

// ==================
// STAFF ENDPOINTS
// ==================

// GET all staff
app.get('/api/staff', (req, res) => {
  db.all('SELECT id, fullName, phone, role, rate, total_hours FROM staff ORDER BY fullName', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ staff: rows });
  });
});

// CREATE staff
app.post('/api/staff', (req, res) => {
  const { fullName, phone, role, rate, notes } = req.body;
  if (!fullName) return res.status(400).json({ error: 'fullName required' });
  
  const sql = `INSERT INTO staff (fullName, phone, role, rate, notes) VALUES (?, ?, ?, ?, ?)`;
  db.run(sql, [fullName, phone || '', role || '', rate || 0, notes || ''], function(err) {
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
  
  // Validate minimum 5-hour charge if duration is being updated
  if (duration !== undefined && duration < 5) {
    return res.status(400).json({ error: 'Minimum event duration is 5 hours' });
  }
  
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
  
  db.run(sql, values, async function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    // Recalculate staff hours after update
    await recalculateStaffHoursSQLite().catch(e => console.error('Recalculation error:', e));
    res.json({ message: 'Event updated', changes: this.changes });
  });
});

// DELETE event
app.delete('/api/events/:id', async (req, res) => {
  db.run(`DELETE FROM events WHERE id = ?`, req.params.id, async function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    // Recalculate staff hours after deletion
    await recalculateStaffHoursSQLite().catch(e => console.error('Recalculation error:', e));
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

// ==================
// DISPATCH STAFF - Send WhatsApp notifications
// ==================

app.post('/api/dispatch-staff', (req, res) => {
  const { eventId, staffIds } = req.body;
  
  if (!eventId || !staffIds || !Array.isArray(staffIds)) {
    return res.status(400).json({ error: 'eventId and staffIds array required' });
  }

  // Fetch event details
  db.get('SELECT * FROM events WHERE id = ?', [eventId], (err, event) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!event) return res.status(404).json({ error: 'Event not found' });

    // Fetch staff details
    const placeholders = staffIds.map(() => '?').join(',');
    db.all(`SELECT * FROM staff WHERE id IN (${placeholders})`, staffIds, (err, staffList) => {
      if (err) return res.status(500).json({ error: err.message });

      const token = process.env.WHATSAPP_ACCESS_TOKEN;
      const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
      const results = [];

      // Send WhatsApp to each staff
      let completed = 0;
      staffList.forEach(staff => {
        if (!staff.phone || !token || !phoneId) {
          results.push({ staffId: staff.id, staffName: staff.fullName, status: 'skipped' });
          completed++;
          return;
        }

        const message = `📅 *EVENT ASSIGNMENT*

🎫 *Event:* ${event.title}
📅 *Date:* ${new Date(event.date).toLocaleDateString('en-ZA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
🕐 *Time:* ${new Date(event.date).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}
📍 *Location:* ${event.location || 'TBA'}

Please confirm your availability. Reply YES to accept or NO to decline.

Thank you!
Fresh People Team`;

        const formattedPhone = staff.phone.replace(/[\s\+\-]/g, '');

        fetch(`https://graph.facebook.com/v22.0/${phoneId}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: formattedPhone,
            type: 'text',
            text: { body: message }
          })
        })
        .then(res => res.json())
        .then(data => {
          if (data.error) {
            results.push({ staffId: staff.id, staffName: staff.fullName, status: 'failed', error: data.error.message });
          } else {
            results.push({ staffId: staff.id, staffName: staff.fullName, status: 'sent', messageId: data.messages?.[0]?.id });
          }
          completed++;
        })
        .catch(err => {
          results.push({ staffId: staff.id, staffName: staff.fullName, status: 'failed', error: err.message });
          completed++;
        });
      });

      // Wait for all messages to send (simple polling)
      const checkComplete = setInterval(() => {
        if (completed === staffList.length) {
          clearInterval(checkComplete);
          res.json({
            success: true,
            event: { id: event.id, title: event.title },
            dispatched: results.filter(r => r.status === 'sent').length,
            skipped: results.filter(r => r.status === 'skipped').length,
            failed: results.filter(r => r.status === 'failed').length,
            results
          });
        }
      }, 100);
    });
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
