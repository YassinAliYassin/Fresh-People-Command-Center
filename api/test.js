/**
 * Minimal test API - no external calls
 */
module.exports = async function handler(req, res) {
  return res.status(200).json({
    test: true,
    message: 'API is working',
    query: req.query,
    method: req.method
  });
}