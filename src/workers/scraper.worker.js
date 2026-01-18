const { Worker, Queue } = require('bullmq');
const { connection } = require('../config/redis.config');
const { QUEUES } = require('../config/constants');
const desidubScraper = require('../scrapers/desidub.scraper');
const logger = require('../utils/logger');
const Episode = require('../models/Episode.model');

const downloadQueue = new Queue(QUEUES.DOWNLOAD, { connection });

const worker = new Worker(QUEUES.SCRAPER, async (job) => {
  let { animeName, episodeNumber, episodeId, season } = job.data;
  const targetSeason = season || 1;

  logger.info(`🚀 Scraper Started: ${animeName} S${targetSeason} E${episodeNumber}`);

  try {
    // Iframe URL nikalo
    const iframeUrl = await desidubScraper.getDesiDubAudio(animeName, episodeNumber, targetSeason);

    if (iframeUrl) {
        // DB update (Temporary Source)
        await Episode.findByIdAndUpdate(episodeId, { hasExternalAudio: true });
        
        logger.info(`✅ Link Found! Sending to Download Worker...`);

        // Send to Download Queue
        await downloadQueue.add('download-audio', {
            url: iframeUrl,
            episodeId: episodeId,
            episodeNumber: episodeNumber,
            animeName: animeName,
            season: targetSeason,
            type: 'audio' // 'subtitle' bhi bhej sakte ho alag job me
        });
    }

  } catch (error) {
    logger.error(`Scrape Failed: ${error.message}`);
    throw error;
  }
}, { connection });

module.exports = worker;
