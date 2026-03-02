const logger = require('../utils/logger');


exports.verifyAdmin = (req, res, next) => {
const providedKey = req.query.apiKey || req.headers['x-api-key'];
const actualKey = process.env.ADMIN_API_KEY;

// If no API key is set in .env, allow access (for dev), otherwise enforce it
if (actualKey && providedKey !== actualKey) {
    logger.warn(`Unauthorized access attempt to Admin Panel from IP: ${req.ip}`);
    return res.status(403).json({ success: false, message: 'Forbidden: Invalid or Missing Admin API Key' });
}
next();

};