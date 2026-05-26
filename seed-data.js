const BASE = 'http://localhost:3001/api';

async function seed() {
  try {
    // 1. Create sample clients
    console.log('Creating clients...');
    const clientRes1 = await fetch(`${BASE}/clients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Premier Events Zimbabwe',
        contactPerson: 'Tendai Moyo',
        email: 'tendai@premierevents.co.zw',
        phone: '+263 77 123 4567'
      })
    });
    const client1Data = await clientRes1.json();
    const client1Id = client1Data.client?.id || client1Data.id;

    const clientRes2 = await fetch(`${BASE}/clients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Harare Gala Committee',
        contactPerson: 'Sarah Chikwanha',
        email: 'sarah@gala.org.zw',
        phone: '+263 71 987 6543'
      })
    });
    const client2Data = await clientRes2.json();
    const client2Id = client2Data.client?.id || client2Data.id;

    console.log('Clients created:', client1Id, client2Id);

    // 2. Create sample staff
    console.log('Creating staff...');
    const staffRes1 = await fetch(`${BASE}/staff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Mike Anderson',
        phone: '+263 67 296 1272',
        role: 'Bartender'
      })
    });
    const staff1Data = await staffRes1.json();
    const staff1Id = staff1Data.id;

    const staffRes2 = await fetch(`${BASE}/staff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Lee-Ann Brown',
        phone: '+263 77 555 0123',
        role: 'Server'
      })
    });
    const staff2Data = await staffRes2.json();
    const staff2Id = staff2Data.id;

    const staffRes3 = await fetch(`${BASE}/staff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'James Mutasa',
        phone: '+263 71 444 5678',
        role: 'Mixologist'
      })
    });
    const staff3Data = await staffRes3.json();
    const staff3Id = staff3Data.id;

    console.log('Staff created:', staff1Id, staff2Id, staff3Id);

    // 3. Create a test event with client
    console.log('Creating event...');
    const eventRes = await fetch(`${BASE}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Corporate Gala Dinner',
        date: '2026-06-15T18:00',
        duration: 4,
        staffName: 'Mike Anderson',
        staffPhone: '+263 67 296 1272',
        clientID: client1Id,
        clientBudget: 15000
      })
    });
    const eventData = await eventRes.json();
    const eventId = eventData.id;
    console.log('Event created:', eventId);

    // 4. Assign staff to event
    console.log('Assigning staff...');
    const assignRes1 = await fetch(`${BASE}/events/${eventId}/assignments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        staffId: staff1Id,
        shiftType: 'Full Shift'
      })
    });
    const assign1 = await assignRes1.json();
    const assign1Id = assign1.id || assign1.assignment?.id;

    const assignRes2 = await fetch(`${BASE}/events/${eventId}/assignments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        staffId: staff2Id,
        shiftType: 'Full Shift'
      })
    });
    const assign2 = await assignRes2.json();

    const assignRes3 = await fetch(`${BASE}/events/${eventId}/assignments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        staffId: staff3Id,
        shiftType: 'Shift A'
      })
    });
    const assign3 = await assignRes3.json();
    const assign3Id = assign3.id || assign3.assignment?.id;

    // 5. Update status to 'Confirmed' for staff 1 and 3
    console.log('Updating assignment status...');
    await fetch(`${BASE}/events/${eventId}/assignments/${assign1Id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Confirmed' })
    });

    await fetch(`${BASE}/events/${eventId}/assignments/${assign3Id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Confirmed' })
    });

    console.log('Staff assigned and confirmed');

    // 6. Log timesheet for confirmed staff (send totalHours, not startTime/endTime)
    console.log('Logging timesheets...');
    // 18:00 to 22:00 = 4 hours
    await fetch(`${BASE}/assignments/${assign1Id}/timesheet`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        totalHours: 4,
        dateWorked: '2026-06-15'
      })
    });

    await fetch(`${BASE}/assignments/${assign3Id}/timesheet`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        totalHours: 4,
        dateWorked: '2026-06-15'
      })
    });

    console.log('Timesheets logged (4 hours each)');
    console.log('\n✅ Seed data complete!');
    console.log('Event ID:', eventId);
    console.log('Client ID:', client1Id);
    console.log('Staff assigned: 3 (2 confirmed with timesheets, 1 pending)');
    console.log('Total payroll: R320 (8 hours × R40)');

  } catch (error) {
    console.error('Seed error:', error.message);
  }
}

seed();
