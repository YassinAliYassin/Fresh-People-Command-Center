/**
 * Dashboard Data API - Phase 2 Endpoint
 * Returns today/tomorrow events, staff status, alerts
 */

import { Pool } from 'pg';
import { handleFinanceRequest } from '../lib/finance-core.js';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (String(req.query?.resource || req.query?.endpoint) === 'finance') {
    return handleFinanceRequest(req, res);
  }
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Get today's date in YYYY-MM-DD format
    const today = new Date();
    const todayStr = today.getFullYear() + '-' + 
                   String(today.getMonth() + 1).padStart(2, '0') + '-' + 
                   String(today.getDate()).padStart(2, '0');
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.getFullYear() + '-' + 
                      String(tomorrow.getMonth() + 1).padStart(2, '0') + '-' + 
                      String(tomorrow.getDate()).padStart(2, '0');
    
    // Fetch today's events
    const todayEvents = await pool.query(
      'SELECT * FROM events WHERE date LIKE $1 ORDER BY date ASC',
      [todayStr + '%']
    );
    
    // Fetch tomorrow's events
    const tomorrowEvents = await pool.query(
      'SELECT * FROM events WHERE date LIKE $1 ORDER BY date ASC',
      [tomorrowStr + '%']
    );
    
    // Get staff count (from staff table if exists, else from events)
    let staffCount = 0;
    try {
      const staffResult = await pool.query('SELECT COUNT(*) as count FROM staff');
      staffCount = parseInt(staffResult.rows[0].count) || 0;
    } catch (e) {
      // staff table might not exist
      staffCount = 0;
    }
    
    // Get pending bookings count (if bookings table exists)
    let pendingBookings = 0;
    try {
      const bookingsResult = await pool.query(
        "SELECT COUNT(*) as count FROM bookings WHERE status = 'pending'"
      );
      pendingBookings = parseInt(bookingsResult.rows[0].count) || 0;
    } catch (e) {
      // bookings table might not exist
    }
    
    // Get unconfirmed staff count (if staff_confirmations table exists)
    let unconfirmedStaff = 0;
    try {
      const confirmationsResult = await pool.query(
        "SELECT COUNT(*) as count FROM staff_confirmations WHERE status = 'pending'"
      );
      unconfirmedStaff = parseInt(confirmationsResult.rows[0].count) || 0;
    } catch (e) {
      // staff_confirmations table might not exist
    }
    
    const dashboardData = {
      today: todayStr,
      tomorrow: tomorrowStr,
      todayEvents: todayEvents.rows || [],
      tomorrowEvents: tomorrowEvents.rows || [],
      staffCount,
      pendingBookings,
      unconfirmedStaff,
      alerts: []
    };
    
    // Add alerts
    if (dashboardData.todayEvents.length === 0) {
      dashboardData.alerts.push({
        type: 'info',
        message: 'No events scheduled for today'
      });
    }
    
    if (pendingBookings > 0) {
      dashboardData.alerts.push({
        type: 'warning',
        message: `${pendingBookings} pending booking(s) need attention`
      });
    }
    
    if (unconfirmedStaff > 0) {
      dashboardData.alerts.push({
        type: 'warning',
        message: `${unconfirmedStaff} staff confirmation(s) pending`
      });
    }
    
    return res.status(200).json(dashboardData);
    
  } catch (error) {
    console.error('[Dashboard Data] Error:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch dashboard data',
      details: error.message 
    });
  }
}
