const fs = require('fs');
let server = fs.readFileSync('server.js', 'utf8');

const calendarEndpoint = `
// --- APPLE CALENDAR INTEGRATION ---
app.get('/api/calendar.ics', (req, res) => {
  db.all('SELECT * FROM events', [], (err, events) => {
    if (err) {
      return res.status(500).send('Error fetching events');
    }

    let icsContent = \`BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//FreshPeople//CommandCenter//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH\`;

    events.forEach(evt => {
      const startDate = new Date(evt.date);
      const dtstart = startDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      const endDate = new Date(startDate.getTime() + (evt.duration || 4) * 60 * 60 * 1000);
      const dtend = endDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      
      icsContent += \`
BEGIN:VEVENT
UID:\${evt.id}@freshpeople.co.za
DTSTAMP:\${dtstart}
DTSTART:\${dtstart}
DTEND:\${dtend}
SUMMARY:\${evt.title}
DESCRIPTION:Staff: \${evt.staff_assigned || 'None'}\\\\nDress: \${evt.dressCode || 'All Black'}
END:VEVENT\`;
    });

    icsContent += \`
END:VCALENDAR\`;

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="FreshPeople-Events.ics"');
    res.send(icsContent);
  });
});
`;

// Inject before app.listen
if (!server.includes('/api/calendar.ics')) {
    server = server.replace('app.listen', `${calendarEndpoint}\napp.listen`);
    fs.writeFileSync('server.js', server);
    console.log('✓ Calendar endpoint injected successfully.');
} else {
    console.log('Calendar endpoint already exists.');
}
