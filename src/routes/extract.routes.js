const express = require('express');
const router = express.Router();
const controller = require('../controllers/extract.controller');

// POST /api/extract/start
router.post('/start', controller.triggerScrape);

module.exports = router;
