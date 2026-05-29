import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Main matching function
export async function matchStaff(eventDate, staffRequired, eventType = 'general') {
  try {
    // Get all active staff
    const staffResult = await pool.query(`
      SELECT * FROM staff 
      WHERE availability_status != 'Inactive'
      ORDER BY 
        CASE WHEN availability_status = 'Available' THEN 1
             WHEN availability_status = 'Limited' THEN 2
             ELSE 3 END,
        rating DESC NULLS LAST
    `);

    const allStaff = staffResult.rows;
    const availableStaff = [];

    // Check each staff's availability for the event date
    for (const staff of allStaff) {
      const isAvailable = await checkStaffAvailability(staff.id, eventDate);
      
      if (isAvailable) {
        // Calculate match score
        const score = calculateMatchScore(staff, eventType, eventDate);
        availableStaff.push({
          ...staff,
          match_score: score,
          conflicts: []
        });
      }
    }

    // Sort by match score (highest first)
    availableStaff.sort((a, b) => b.match_score - a.match_score);

    // Return top N staff
    return availableStaff.slice(0, staffRequired || 5);

  } catch (error) {
    console.error('[Staff Matcher] Error:', error);
    throw error;
  }
}

// Check if staff is available on a specific date
async function checkStaffAvailability(staffId, eventDate) {
  try {
    // Check calendar_events table for conflicts
    const conflictResult = await pool.query(`
      SELECT COUNT(*) as conflict_count
      FROM calendar_events
      WHERE staff_assigned @> $1::jsonb
      AND DATE(start_at) = DATE($2)
      AND source = 'icloud'
    `, [JSON.stringify([staffId]), eventDate]);

    const conflictCount = parseInt(conflictResult.rows[0].conflict_count, 10);
    return conflictCount === 0; // No conflicts = available

  } catch (error) {
    console.error('[Staff Matcher] Availability check error:', error);
    return false; // Assume not available if error
  }
}

// Calculate match score (0-100)
function calculateMatchScore(staff, eventType, eventDate) {
  let score = 50; // Base score

  // Availability status bonus
  if (staff.availability_status === 'Available') score += 30;
  else if (staff.availability_status === 'Limited') score += 15;

  // Rating bonus
  if (staff.rating) {
    score += (staff.rating / 5) * 20; // 0-20 points
  }

  // Experience bonus (based on created_at)
  if (staff.created_at) {
    const daysSinceJoin = (new Date() - new Date(staff.created_at)) / (1000 * 60 * 60 * 24);
    if (daysSinceJoin > 365) score += 10; // 1+ years
    else if (daysSinceJoin > 180) score += 5; // 6+ months
  }

  // Event type match (if staff has role)
  if (staff.role) {
    const roleLower = staff.role.toLowerCase();
    const typeLower = eventType.toLowerCase();
    
    if (typeLower.includes('wedding') && roleLower.includes('waiter')) score += 10;
    if (typeLower.includes('corporate') && roleLower.includes('chef')) score += 10;
    // Add more event type matches as needed
  }

  // Cap at 100
  return Math.min(100, Math.max(0, score));
}

// Get staff by IDs
export async function getStaffByIds(staffIds) {
  try {
    const result = await pool.query(`
      SELECT * FROM staff 
      WHERE id IN (${staffIds.map((_, i) => `$${i + 1}`).join(', ')})
    `, staffIds);
    return result.rows;
  } catch (error) {
    console.error('[Staff Matcher] Get by IDs error:', error);
    return [];
  }
}

// Update staff availability status
export async function updateStaffAvailability(staffId, status) {
  try {
    const result = await pool.query(`
      UPDATE staff 
      SET availability_status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [status, staffId]);
    return result.rows[0];
  } catch (error) {
    console.error('[Staff Matcher] Update availability error:', error);
    throw error;
  }
}
