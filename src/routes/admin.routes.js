const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');


// Dashboard UI & Search Routes
router.get('/panel', adminController.renderAdminPanel);
router.get('/search', adminController.searchAnimeForImport);

// Existing Worker & Stats Routes
router.get('/stats', adminController.getDashboardStats);
router.post('/retry', adminController.retryJob);
router.post('/force-subtitle', adminController.forceGenerateSubtitle);

module.exports = router;