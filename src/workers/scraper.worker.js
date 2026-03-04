const { Worker, Queue } = require('bullmq');
const { connection } = require('../config/redis.config');
const { QUEUES } = require('../config/constants');
const desidubScraper = require('../scrapers/desidub.scraper');
const tpxScraper = require('../scrapers/tpx.scraper'); 
const logger = require('../utils/logger');
const Episode = require('../models/Episode.model');

const downloadQueue = new Queue(QUEUES.DOWNLOAD, { connection });

const worker = new Worker(QUEUES.SCRAPER, async (job) => {
  let { animeName, episodeNumber, episodeId, season, sourceType } = job.data;
  const targetSeason = season || 1;

  logger.info(`🚀 Scraper Started: ${animeName} S${targetSeason} E${episodeNumber} [Type: ${sourceType}]`);

  try {
    let mediaUrl = null;
    let type = '';

    // ----------------------------------------------------
    // 🟠 AGAR SOURCE TPX (SUB) HAI
    // ----------------------------------------------------
    if (sourceType === 'tpx') {
        logger.info(`🔍 Fetching TPX video directly from tpxsub.com...`);
        
        // Seedha tpxsub ki website pe jayega
        const tpxResult = await tpxScraper.getTPXVideo(animeName, episodeNumber, targetSeason);
        mediaUrl = tpxResult && tpxResult.url ? tpxResult.url : null;
        type = 'video';
    } 
    // ----------------------------------------------------
    // 🟢 AGAR SOURCE DESIDUB (DUB) HAI
    // ----------------------------------------------------
    else if (sourceType === 'desidub') {
        logger.info(`🔍 Fetching DesiDub audio directly from desidubanime.me...`);
        mediaUrl = await desidubScraper.getDesiDubAudio(animeName, episodeNumber, targetSeason);
        type = 'audio';
        
        if (mediaUrl) {
            await Episode.findByIdAndUpdate(episodeId, { hasExternalAudio: true });
        }
    }

    // ----------------------------------------------------
    // 📥 DOWNLOAD QUEUE MEIN BHEJO
    // ----------------------------------------------------
    if (mediaUrl) {
        logger.info(`✅ Final Link Found: ${mediaUrl}. Sending to Download Worker...`);
        await downloadQueue.add('download-media', {
            url: mediaUrl,
            episodeId: episodeId,
            episodeNumber: episodeNumber,
            animeName: animeName,
            season: targetSeason,
            type: type 
        });
    } else {
        logger.warn(`❌ Extraction failed. Koi link nahi mila for E${episodeNumber}`);
    }

  } catch (error) {
    logger.error(`Scrape Failed: ${error.message}`);
    throw error;
  }
}, { connection });

module.exports = worker;
