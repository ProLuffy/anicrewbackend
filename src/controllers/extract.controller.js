const { Queue } = require('bullmq');
const { connection } = require('../config/redis.config');
const { QUEUES } = require('../config/constants');
const Series = require('../models/Series.model');
const Episode = require('../models/Episode.model');
const hianimeService = require('../services/hianime.service');

const scraperQueue = new Queue(QUEUES.SCRAPER, { connection });

exports.triggerScrape = async (req, res, next) => {
  try {
    const { animeName, hianimeId, season } = req.body;
    const targetSeason = season || 1; 

    console.log(`Extraction Request: ${animeName} (Season ${targetSeason})`);

    const episodes = await hianimeService.getEpisodes(hianimeId);

    if (!episodes || !Array.isArray(episodes)) {
      return res.status(500).json({ message: "Failed to fetch episode list" });
    }

    let series = await Series.findOneAndUpdate(
      { hianimeId },
      { title: animeName, totalEpisodes: episodes.length },
      { upsert: true, new: true }
    );

    let count = 0;
    for (const ep of episodes) {
        const epNum = ep.episodeNumber; 
        const epId = ep.id; 

        const newEp = await Episode.findOneAndUpdate(
            { seriesId: series._id, number: epNum },
            { hianimeEpisodeId: epId, number: epNum },
            { upsert: true, new: true }
        );

        if (!newEp.hasAudio) {
            await scraperQueue.add('scrape-job', {
                animeName,
                episodeNumber: epNum,
                episodeId: newEp._id,
                season: targetSeason
            });
            count++;
        }
    }

    res.status(200).json({ 
        success: true, 
        message: `Queued ${count} episodes for Season ${targetSeason}.`,
        totalEpisodes: episodes.length 
    });

  } catch (error) {
    console.error("Controller Error:", error);
    next(error);
  }
};
