const { Worker, Queue } = require('bullmq');
const { connection } = require('../config/redis.config');
const { QUEUES } = require('../config/constants');
const desidubScraper = require('../scrapers/desidub.scraper');
const logger = require('../utils/logger');
const Episode = require('../models/Episode.model');

const downloadQueue = new Queue(QUEUES.DOWNLOAD, { connection });

const worker = new Worker(QUEUES.SCRAPER, async (job) => {
  let { animeName, episodeNumber, episodeId, season } = job.data;
  
  // Default to Season 1 if not explicitly provided
  const targetSeason = season || 1;

  logger.info(`🚀 Starting Scrape: ${animeName} | S${targetSeason}-Ep${episodeNumber}`);

  try {
    const iframeUrl = await desidubScraper.getDesiDubAudio(animeName, episodeNumber, targetSeason);

    if (iframeUrl) {
        await Episode.findByIdAndUpdate(episodeId, {
            audioUrl: iframeUrl,
            hasAudio: true
        });
        
        logger.info(`✅ Link Found! Passing to Download Queue...`);

        await downloadQueue.add('download-audio', {
            url: iframeUrl,
            episodeId: episodeId,
            episodeNumber: episodeNumber,
            isDriveLink: true 
        });
    } else {
        throw new Error("Iframe source extraction returned empty");
    }

  } catch (error) {
    logger.error(`Scrape Job Failed: ${error.message}`);
    throw error;
  }
}, { connection });

module.exports = worker;
