const { Worker } = require('bullmq');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { connection } = require('../config/redis.config');
const { QUEUES } = require('../config/constants');
const Episode = require('../models/Episode.model');
const driveService = require('../services/drive.service');
const logger = require('../utils/logger');

const worker = new Worker(QUEUES.DOWNLOAD, async (job) => {
  const { url, episodeId, episodeNumber, animeName, season, type } = job.data;
  
  logger.info(`⬇️ Processing ${type}: ${animeName} E${episodeNumber}`);

  // Temp folder setup
  const ext = type === 'audio' ? 'mp3' : 'vtt';
  const fileName = `${animeName.replace(/\s+/g, '_')}_S${season}_E${episodeNumber}.${ext}`;
  const tempPath = path.join(__dirname, '../../temp', fileName);
  
  if (!fs.existsSync(path.dirname(tempPath))) fs.mkdirSync(path.dirname(tempPath), { recursive: true });

  try {
    // 1. Download
    const writer = fs.createWriteStream(tempPath);
    const response = await axios({ url, method: 'GET', responseType: 'stream' });
    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    // 2. Upload to Drive
    logger.info(`☁️ Uploading to Drive...`);
    const driveLink = await driveService.uploadToDrive(tempPath, fileName, animeName, season);

    // 3. Auto Attach to HiAnime Video (DB Update)
    const updateField = type === 'audio' 
      ? { 'audioSources.hindi': driveLink, hasExternalAudio: true }
      : { 'subtitleSources.hindi': driveLink };

    await Episode.findByIdAndUpdate(episodeId, updateField);

    logger.info(`✅ Attached to Episode: ${driveLink}`);
    
    // Cleanup
    fs.unlinkSync(tempPath);

  } catch (error) {
    logger.error(`Download/Upload Failed: ${error.message}`);
    // Retry logic BullMQ khud sambhal lega
    throw error;
  }
}, { connection });

module.exports = worker;
