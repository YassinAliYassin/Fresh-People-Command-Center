import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export default async function handler(req, res) {
  const authHeader = req.headers.authorization;
  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret || authHeader !== `Bearer ${adminSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    // Add unique constraint for ON CONFLICT
    await pool.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'staff_confirmations_event_id_staff_phone_key'
        ) THEN
          ALTER TABLE staff_confirmations 
          ADD CONSTRAINT staff_confirmations_event_id_staff_phone_key 
          UNIQUE (event_id, staff_phone);
        END IF;
      END $$;
    `);
    
    // Verify
    const result = await pool.query(`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename = 'staff_confirmations'
    `);
    
    await pool.end();
    
    return res.status(200).json({
      success: true,
      message: 'Unique constraint added',
      indexes: result.rows
    });
    
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
