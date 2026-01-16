const { Worker } = require('bullmq');
const { connection } = require('../config/redis.config');
const { QUEUES } = require('../config/constants');
const desidubScraper = require('../scrapers/desidub.scraper');
const tpxScraper = require('../scrapers/tpx.scraper');
const hianimeService = require('../services/hianime.service');
const Episode = require('../models/Episode.model');
const logger = require('../utils/logger');

// Queue instance to add next jobs (Download Queue)
const { Queue } = require('bullmq');
const downloadQueue = new Queue(QUEUES.DOWNLOAD, { connection });

const worker = new Worker(QUEUES.SCRAPER, async (job) => {
  const { animeName, episodeNumber, episodeId } = job.data;
  logger.info(`Starting Scrape Job: ${animeName} Ep ${episodeNumber}`);

  try {
    // 1. Get HiAnime Data (API)
    // Hum already API se data le chuke honge extract controller me, 
    // par yahan verify kar sakte hain.
    
    // 2. Scrape DesiDub (Audio Link)
    // Logic: Construct search URL based on name + ep
    const desidubSearchUrl = `https://desidubanime.me/anime/${animeName.replace(/ /g, '-')}-episode-${episodeNumber}`;
    const audioUrl = await desidubScraper.getDesiDubAudio(desidubSearchUrl);

    // 3. Scrape TPX (Fallback Video Link)
    const tpxSearchUrl = `https://tpxsub.com/${animeName.replace(/ /g, '-')}-episode-${episodeNumber}`;
    const tpxData = await tpxScraper.getTPXVideo(tpxSearchUrl);

    // 4. Update DB with Raw Links
    // Hum abhi save nahi kar rahe, hum seedha download queue me bhej rahe hain
    // taaki link expire hone se pehle download ho jaye.

    // 5. Add to Download Queue
    await downloadQueue.add('download-job', {
      episodeId,
      audioUrl: audioUrl, // DesiDub
      tpxUrl: tpxData.url, // TPX (if any)
      animeName,
      episodeNumber
    });

    logger.info(`Scrape Complete. Moved to Download Queue.`);

  } catch (error) {
    logger.error(`Scrape Job Failed: ${error.message}`);
    throw error;
  }
}, { connection });

module.exports = worker;
