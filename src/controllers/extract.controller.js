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

    // 🛑 DUPLICATE CHECK
    const existingSeries = await Series.findOne({ hianimeId });
    if (existingSeries && existingSeries.extractionStatus === 'completed') {
      return res.status(200).json({ message: "Series already fully extracted!", status: 'completed' });
    }

    // AUTO CREATE/UPDATE SERIES
    let series = await Series.findOneAndUpdate(
      { hianimeId },
      { 
        title: animeName, 
        extractionStatus: 'processing',
        lastProcessedAt: new Date()
      },
      { upsert: true, new: true }
    );

    // Fetch Episodes from HiAnime
    const episodes = await hianimeService.getEpisodes(hianimeId);
    
    let count = 0;
    for (const ep of episodes) {
        const epNum = ep.episodeNumber; 
        
        const newEp = await Episode.findOneAndUpdate(
            { seriesId: series._id, number: epNum },
            { hianimeEpisodeId: ep.id, number: epNum },
            { upsert: true, new: true }
        );

        // Job Queue: Pass Series Name for Drive Folder
        await scraperQueue.add('scrape-job', {
            animeName: series.title, 
            episodeNumber: epNum,
            episodeId: newEp._id,
            season: targetSeason
        });
        count++;
    }

    res.status(200).json({ 
        success: true, 
        message: `Started processing ${count} episodes for ${animeName}. Files will be on Drive soon.`,
    });

  } catch (error) {
    next(error);
  }
};
