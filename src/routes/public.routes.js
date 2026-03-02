const express = require('express');
const router = express.Router();
const controller = require('../controllers/player.controller');


// Vercel will call this: /api/public/episode?hianimeId=solo-leveling-episode-1
router.get('/episode', controller.getEpisodeData);

module.exports = router;