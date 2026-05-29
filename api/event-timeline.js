import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export default async function handler(req, res) {
  // Admin auth check for write operations (POST)
  if (req.method === 'POST') {
    const authHeader = req.headers.authorization;
    const adminSecret = process.env.ADMIN_SECRET;
    if (!adminSecret || authHeader !== `Bearer ${adminSecret}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  if (req.method === 'GET') {
    return getTimeline(req, res);
  } else if (req.method === 'POST') {
    return addTimelineStage(req, res);
  }
  return res.status(405).json({ error: 'Method not allowed' });
}

// Get timeline for an event
async function getTimeline(req, res) {
  const eventId = req.query.event_id;
  
  if (!eventId) {
    return res.status(400).json({ error: 'Missing event_id' });
  }

  try {
    const result = await pool.query(`
      SELECT * FROM event_timeline
      WHERE event_id = $1
      ORDER BY created_at ASC
    `, [eventId]);

    return res.status(200).json({
      event_id: eventId,
      stages: result.rows,
      current_stage: result.rows.length > 0 ? result.rows[result.rows.length - 1].stage : null
    });

  } catch (error) {
    console.error('[Timeline] GET error:', error);
    return res.status(500).json({ error: error.message });
  }
}

// Add new timeline stage
async function addTimelineStage(req, res) {
  const { event_id, stage, notes, metadata } = req.body;

  if (!event_id || !stage) {
    return res.status(400).json({ error: 'Missing event_id or stage' });
  }

  const validStages = [
    'booking_received', 'staff_assigned', 'staff_confirmed',
    'event_started', 'event_completed', 'payroll_processed'
  ];

  if (!validStages.includes(stage)) {
    return res.status(400).json({ error: `Invalid stage. Valid: ${validStages.join(', ')}` });
  }

  try {
    const result = await pool.query(`
      INSERT INTO event_timeline (event_id, stage, status, notes, metadata)
      VALUES ($1, $2, 'completed', $3, $4)
      RETURNING *
    `, [event_id, stage, notes || '', JSON.stringify(metadata || {})]);

    // Auto-trigger next actions based on stage
    await handleStageTransition(event_id, stage);

    return res.status(201).json({
      success: true,
      timeline: result.rows[0]
    });

  } catch (error) {
    console.error('[Timeline] POST error:', error);
    return res.status(500).json({ error: error.message });
  }
}

// Handle automatic actions when timeline stage changes
async function handleStageTransition(eventId, stage) {
  try {
    switch (stage) {
      case 'booking_received':
        // Auto-create calendar event placeholder
        console.log(`[Timeline] Booking received for ${eventId}`);
        break;

      case 'staff_assigned':
        // Trigger WhatsApp dispatch to assigned staff
        await triggerStaffDispatch(eventId);
        break;

      case 'staff_confirmed':
        // Send event reminder (24h before)
        console.log(`[Timeline] Staff confirmed for ${eventId}`);
        break;

      case 'event_completed':
        // Trigger payroll processing
        console.log(`[Timeline] Event completed: ${eventId}`);
        break;

      case 'payroll_processed':
        // Send confirmation to client
        console.log(`[Timeline] Payroll processed for ${eventId}`);
        break;
    }
  } catch (error) {
    console.error('[Timeline] Stage transition error:', error);
  }
}

// Trigger WhatsApp dispatch (placeholder)
async function triggerStaffDispatch(eventId) {
  try {
    // Get event details
    const eventResult = await pool.query(
      'SELECT * FROM calendar_events WHERE uid = $1',
      [eventId]
    );

    if (eventResult.rows.length === 0) return;

    const event = eventResult.rows[0];
    console.log(`[Timeline] Dispatching to staff for event: ${event.title}`);

    // This would call api/dispatch-staff.js in real implementation
    // For now, just log
    console.log('[Timeline] Staff dispatch triggered');

  } catch (error) {
    console.error('[Timeline] Dispatch error:', error);
  }
}
