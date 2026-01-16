const { Queue } = require('bullmq');
const { connection } = require('../config/redis.config');
const { QUEUES } = require('../config/constants');
const Series = require('../models/Series.model');
const Episode = require('../models/Episode.model');
const hianimeService = require('../services/hianime.service');

const scraperQueue = new Queue(QUEUES.SCRAPER, { connection });

exports.triggerScrape = async (req, res, next) => {
  try {
    const { animeName, hianimeId } = req.body;

    // 1. Fetch Episode List from HiAnime API
    const data = await hianimeService.getEpisodes(hianimeId);
    const episodes = data.episodes; // Adjust based on your API response structure

    // 2. Save Series Info
    let series = await Series.findOneAndUpdate(
      { hianimeId },
      { title: animeName, totalEpisodes: episodes.length },
      { upsert: true, new: true }
    );

    // 3. Queue Jobs for each episode
    const jobs = episodes.map(ep => {
      return {
        name: 'scrape-job',
        data: {
          animeName,
          episodeNumber: ep.number,
          episodeId: null // We need to create DB entry first
        }
      };
    });

    // 4. Create Episode DB Entries & Add to Queue
    let queuedCount = 0;
    for (const ep of episodes) {
        // Only process if not fully scraped
        const exists = await Episode.findOne({ seriesId: series._id, number: ep.number });
        if (!exists || (!exists.hasAudio && !exists.hasHardSub)) {
            
            const newEp = await Episode.findOneAndUpdate(
                { seriesId: series._id, number: ep.number },
                { hianimeEpisodeId: ep.episodeId, number: ep.number },
                { upsert: true, new: true }
            );

            await scraperQueue.add('scrape-job', {
                animeName,
                episodeNumber: ep.number,
                episodeId: newEp._id
            });
            queuedCount++;
        }
    }

    res.status(200).json({ 
      success: true, 
      message: `Extraction started for ${animeName}`, 
      queued: queuedCount 
    });

  } catch (error) {
    next(error);
  }
};
