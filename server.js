import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import db from './db.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(express.json());
app.use(cors());

// CREATE event
app.post('/api/events', (req, res) => {
  const { id, title, date, duration, staffName, dressCode, uniformType, arrivalTime, staffPhone, staffEmail, clientName, clientPhone, clientEmail } = req.body;
  const sql = `INSERT INTO events (id, title, date, duration, staffName, dressCode, uniformType, arrivalTime, staffPhone, staffEmail, clientName, clientPhone, clientEmail) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
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
    clientName || '',
    clientPhone || '',
    clientEmail || ''
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
    SELECT sa.id, sa.eventId, sa.staffId, sa.shift_type,
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
      fullName: row.fullName,
      phone: row.phone,
      role: row.role
    }));
    res.json({ assignments });
  });
});

// ASSIGN staff to event
app.post('/api/events/:id/assignments', (req, res) => {
  const { staffId, shiftType } = req.body;
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

// ==================
// EVENTS ENDPOINTS (Updated to include assignments)
// ==================

// READ all events (with assigned staff)
app.get('/api/events', (req, res) => {
  db.all(`SELECT * FROM events ORDER BY date DESC`, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    // For each event, fetch assignments
    const eventPromises = rows.map(row => {
      return new Promise((resolve) => {
        const event = {
          id: row.id,
          title: row.title,
          date: row.date,
          duration: row.duration,
          staffName: row.staffName,
          staffPhone: row.staffPhone,
          staffEmail: row.staffEmail,
          clientName: row.clientName,
          clientPhone: row.clientPhone,
          clientEmail: row.clientEmail,
          dressCode: row.dressCode,
          uniformType: row.uniformType,
          arrivalTime: row.arrivalTime,
          createdAt: row.created_at
        };
        
        // Fetch assigned staff with shift type
        const sql = `
          SELECT s.id, s.fullName, s.phone, s.role, sa.shift_type 
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
              shiftType: s.shift_type || 'Full Shift'
            }));
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
  const { title, date, duration, staffName, dressCode, uniformType, arrivalTime, staffPhone, staffEmail, clientName, clientPhone, clientEmail } = req.body;
  const sql = `UPDATE events SET title = ?, date = ?, duration = ?, staffName = ?, dressCode = ?, uniformType = ?, arrivalTime = ?, staffPhone = ?, staffEmail = ?, clientName = ?, clientPhone = ?, clientEmail = ? WHERE id = ?`;
  db.run(sql, [
    title,
    date,
    duration,
    staffName || '',
    dressCode || '',
    uniformType || '',
    arrivalTime || '',
    staffPhone || '',
    staffEmail || '',
    clientName || '',
    clientPhone || '',
    clientEmail || '',
    req.params.id
  ], function(err) {
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

app.listen(port, () => {
  console.log(`Backend server running on http://localhost:${port}`);
});
