const { Worker } = require('bullmq');
const { connection } = require('../config/redis.config');
const { QUEUES } = require('../config/constants');
const driveService = require('../services/drive.service');
const AudioTrack = require('../models/AudioTrack.model');
const VideoSource = require('../models/VideoSource.model');
const fs = require('fs');
const logger = require('../utils/logger');

const worker = new Worker(QUEUES.UPLOAD, async (job) => {
  const { type, filePath, episodeId, language, source } = job.data;
  logger.info(`Starting Upload: ${type} - ${filePath}`);

  try {
    // 1. Determine Mime Type
    const mimeType = type === 'audio' ? 'audio/mp4' : 'video/mp4';
    const fileName = filePath.split('/').pop();

    // 2. Upload to Drive
    // Note: Production me Folder ID dynamic hona chahiye (Series wise)
    const fileId = await driveService.uploadFile(fileName, filePath, mimeType, process.env.DRIVE_ROOT_FOLDER_ID);

    // 3. Update Database
    if (type === 'audio') {
      await AudioTrack.create({
        episodeId,
        language: language || 'Hindi',
        source: source || 'desidub',
        driveFileId: fileId,
        duration: 0 // FFmpeg metadata se nikalna chahiye ideally
      });
    } else if (type === 'video') {
      await VideoSource.create({
        episodeId,
        source: source || 'tpx',
        type: 'file',
        driveFileId: fileId,
        quality: '1080p' // Assume scrape logic prioritized 1080p
      });
    }

    // 4. Cleanup Local File (Crucial for 4TB limit)
    fs.unlink(filePath, (err) => {
      if (err) logger.error(`Cleanup Failed: ${filePath}`);
      else logger.info(`🧹 Local file deleted: ${fileName}`);
    });

    logger.info(`Upload Complete: ${fileId}`);

  } catch (error) {
    logger.error(`Upload Job Failed: ${error.message}`);
    throw error;
  }
}, { connection });

module.exports = worker;
