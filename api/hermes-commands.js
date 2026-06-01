/**
 * Hermes Commands API - Phase 2 Endpoint
 * Accepts natural language commands via POST
 * Commands: /today, /tomorrow, /open-bookings, /unconfirmed-staff, /find-staff N, /client-summary, /payroll-summary
 */

import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { command } = req.body;
    
    if (!command) {
      return res.status(400).json({ error: 'Command is required' });
    }
    
    console.log(`[Hermes Commands] Received command: ${command}`);
    
    // Parse command
    const cmd = command.toLowerCase().trim();
    let response = {};
    
    if (cmd === '/today') {
      // Get today's events
      const today = new Date();
      const todayStr = today.getFullYear() + '-' + 
                     String(today.getMonth() + 1).padStart(2, '0') + '-' + 
                     String(today.getDate()).padStart(2, '0');
      
      const events = await pool.query(
        'SELECT * FROM events WHERE date LIKE $1 ORDER BY date ASC',
        [todayStr + '%']
      );
      
      response = {
        command: '/today',
        date: todayStr,
        events: events.rows || [],
        count: events.rows?.length || 0
      };
      
    } else if (cmd === '/tomorrow') {
      // Get tomorrow's events
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.getFullYear() + '-' + 
                        String(tomorrow.getMonth() + 1).padStart(2, '0') + '-' + 
                        String(tomorrow.getDate()).padStart(2, '0');
      
      const events = await pool.query(
        'SELECT * FROM events WHERE date LIKE $1 ORDER BY date ASC',
        [tomorrowStr + '%']
      );
      
      response = {
        command: '/tomorrow',
        date: tomorrowStr,
        events: events.rows || [],
        count: events.rows?.length || 0
      };
      
    } else if (cmd === '/open-bookings') {
      // Get pending bookings
      try {
        const bookings = await pool.query(
          "SELECT * FROM bookings WHERE status = 'pending' ORDER BY created_at DESC"
        );
        
        response = {
          command: '/open-bookings',
          bookings: bookings.rows || [],
          count: bookings.rows?.length || 0
        };
      } catch (e) {
        response = {
          command: '/open-bookings',
          bookings: [],
          count: 0,
          note: 'Bookings table not yet created'
        };
      }
      
    } else if (cmd === '/unconfirmed-staff') {
      // Get pending staff confirmations
      try {
        const confirmations = await pool.query(
          "SELECT * FROM staff_confirmations WHERE status = 'pending' ORDER BY created_at DESC"
        );
        
        response = {
          command: '/unconfirmed-staff',
          confirmations: confirmations.rows || [],
          count: confirmations.rows?.length || 0
        };
      } catch (e) {
        response = {
          command: '/unconfirmed-staff',
          confirmations: [],
          count: 0,
          note: 'Staff confirmations table not yet created'
        };
      }
      
    } else if (cmd.startsWith('/find-staff')) {
      // Find available staff (placeholder - would need availability logic)
      const count = parseInt(cmd.split(' ')[1]) || 5;
      
      try {
        const staff = await pool.query(
          'SELECT * FROM staff LIMIT $1',
          [count]
        );
        
        response = {
          command: '/find-staff',
          staff: staff.rows || [],
          count: staff.rows?.length || 0
        };
      } catch (e) {
        response = {
          command: '/find-staff',
          staff: [],
          count: 0,
          note: 'Staff table not yet created'
        };
      }
      
    } else if (cmd === '/client-summary') {
      // Get top clients by booking count
      try {
        const clients = await pool.query(
          'SELECT client_name, COUNT(*) as booking_count FROM bookings GROUP BY client_name ORDER BY booking_count DESC LIMIT 10'
        );
        
        response = {
          command: '/client-summary',
          clients: clients.rows || [],
          count: clients.rows?.length || 0
        };
      } catch (e) {
        response = {
          command: '/client-summary',
          clients: [],
          count: 0,
          note: 'Bookings table not yet created'
        };
      }
      
    } else if (cmd === '/payroll-summary') {
      // Get monthly payroll estimate
      try {
        const staff = await pool.query('SELECT COUNT(*) as staff_count FROM staff');
        const staffCount = parseInt(staff.rows[0]?.staff_count) || 0;
        const estimatedPayroll = staffCount * 500; // R500 per staff
        
        response = {
          command: '/payroll-summary',
          staffCount,
          estimatedPayroll: `R${estimatedPayroll}`,
          note: 'Estimated at R500 per staff member'
        };
      } catch (e) {
        response = {
          command: '/payroll-summary',
          staffCount: 0,
          estimatedPayroll: 'R0',
          note: 'Staff table not yet created'
        };
      }
      
    } else {
      response = {
        error: 'Unknown command',
        command,
        availableCommands: [
          '/today',
          '/tomorrow',
          '/open-bookings',
          '/unconfirmed-staff',
          '/find-staff N',
          '/client-summary',
          '/payroll-summary'
        ]
      };
    }
    
    return res.status(200).json(response);
    
  } catch (error) {
    console.error('[Hermes Commands] Error:', error);
    return res.status(500).json({ 
      error: 'Failed to process command',
      details: error.message 
    });
  }
}
