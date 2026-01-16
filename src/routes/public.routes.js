const express = require('express');
const router = express.Router();
const controller = require('../controllers/player.controller');

// GET /api/public/episode/:episodeId
router.get('/episode/:episodeId', controller.getEpisodeData);

module.exports = router;
