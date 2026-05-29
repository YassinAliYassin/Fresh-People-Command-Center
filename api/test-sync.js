export default async function handler(req, res) {
  try {
    // Test basic functionality
    const data = {
      status: 'ok',
      env: {
        hasDbUrl: !!process.env.DATABASE_URL,
        hasIcloudUrl: !!process.env.ICLOUD_CALENDAR_URL,
        hasSyncSecret: !!process.env.SYNC_SECRET
      }
    };
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
