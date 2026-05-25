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
  const sql = `INSERT INTO events (id, title, date, duration, staff_assigned, dress_code, uniform_type, arrival_time, staff_phone, staff_email, clientName, clientPhone, clientEmail) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
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

// READ all events
app.get('/api/events', (req, res) => {
  db.all(`SELECT 
    id, title, date, duration, 
    staff_assigned as staffName, 
    staff_phone as staffPhone, 
    staff_email as staffEmail,
    clientName,
    clientPhone,
    clientEmail,
    dress_code as dressCode, 
    uniform_type as uniformType,
    arrival_time as arrivalTime, 
    created_at as createdAt
  FROM events ORDER BY date DESC`, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ events: rows });
  });
});

// UPDATE event
app.put('/api/events/:id', (req, res) => {
  const { title, date, duration, staffName, dressCode, arrivalTime, staffPhone, staffEmail, clientName, clientPhone, clientEmail } = req.body;
  const sql = `UPDATE events SET title = ?, date = ?, duration = ?, staff_assigned = ?, dress_code = ?, arrival_time = ?, staff_phone = ?, staff_email = ?, clientName = ?, clientPhone = ?, clientEmail = ? WHERE id = ?`;
  db.run(sql, [
    title,
    date,
    duration,
    staffName || '',
    dressCode || '',
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
