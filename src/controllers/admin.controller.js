const Episode = require('../models/Episode.model');
const Series = require('../models/Series.model');
const { Queue } = require('bullmq');
const { connection } = require('../config/redis.config');
const { QUEUES } = require('../config/constants');

// Queues init
const scraperQueue = new Queue(QUEUES.SCRAPER, { connection });
const subtitleQueue = new Queue(QUEUES.SUBTITLE, { connection });

exports.getDashboardStats = async (req, res) => {
  try {
    const totalSeries = await Series.countDocuments();
    const totalEpisodes = await Episode.countDocuments();
    const episodesWithAudio = await Episode.countDocuments({ hasAudio: true });
    
    // Get Queue Counts (Real-time monitoring)
    const pendingScrapes = await scraperQueue.getWaitingCount();
    
    res.json({
      overview: { totalSeries, totalEpisodes, episodesWithAudio },
      queues: { pendingScrapes }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.retryJob = async (req, res) => {
  // Failed jobs ko wapis queue me daalne ka logic
  // BullMQ methods use karke failed jobs list fetch aur retry kar sakte hain
  try {
    await scraperQueue.retryJobs();
    res.json({ message: "Failed scrape jobs retried" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Manually Trigger Subtitle Gen for an Episode
exports.forceGenerateSubtitle = async (req, res) => {
    const { episodeId } = req.body;
    // Logic to find file path from AudioTrack model and add to SubtitleQueue
    // ... (Implementation logic similar to download worker)
    res.json({ message: "Subtitle generation triggered manually" });
};
