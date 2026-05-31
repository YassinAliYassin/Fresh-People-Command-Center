export default async function handler(req, res) {
  try {
    // Test if pg can be imported
    let pgStatus = 'not imported';
    try {
      const { Pool } = await import('pg');
      pgStatus = 'imported successfully';
      
      // Try to create a pool
      if (process.env.DATABASE_URL) {
        const pool = new Pool({
          connectionString: process.env.DATABASE_URL,
          ssl: { rejectUnauthorized: false },
          max: 1
        });
        
        // Try a simple query
        const result = await pool.query('SELECT NOW()');
        await pool.end();
        
        return res.status(200).json({
          pgStatus,
          dbConnection: 'success',
          timestamp: result.rows[0].now
        });
      } else {
        return res.status(200).json({
          pgStatus,
          dbConnection: 'skipped - no DATABASE_URL'
        });
      }
    } catch (pgError) {
      return res.status(200).json({
        pgStatus: 'import failed',
        error: pgError.message,
        stack: pgError.stack
      });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
