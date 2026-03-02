const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { verifyAdmin } = require('../middlewares/auth.middleware');


// Apply verifyAdmin middleware to all routes
// Note: Admin will access UI via /api/admin/panel?apiKey=YOUR_ADMIN_API_KEY
router.use(verifyAdmin);

router.get('/panel', adminController.renderAdminPanel);
router.get('/search', adminController.searchAnimeForImport);
router.get('/stats', adminController.getDashboardStats);
router.post('/retry', adminController.retryJob);
router.post('/force-subtitle', adminController.forceGenerateSubtitle);

module.exports = router;