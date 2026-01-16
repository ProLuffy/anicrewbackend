const { Worker, Queue } = require('bullmq');
const { connection } = require('../config/redis.config');
const { QUEUES, PATHS } = require('../config/constants');
const ffmpegService = require('../services/ffmpeg.service');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

const uploadQueue = new Queue(QUEUES.UPLOAD, { connection });
const subtitleQueue = new Queue(QUEUES.SUBTITLE, { connection });

const worker = new Worker(QUEUES.DOWNLOAD, async (job) => {
  const { episodeId, audioUrl, tpxUrl, animeName, episodeNumber } = job.data;
  const safeName = `${animeName.replace(/ /g, '_')}_Ep${episodeNumber}`;

  const audioPath = path.join(PATHS.DOWNLOADS, `${safeName}_audio.m4a`);
  const tpxPath = path.join(PATHS.DOWNLOADS, `${safeName}_tpx.mp4`);

  try {
    const uploadJobs = [];

    // 1. Extract/Download Audio (DesiDub)
    if (audioUrl) {
      logger.info(`Downloading Audio: ${safeName}`);
      await ffmpegService.extractAudio(audioUrl, audioPath);
      
      uploadJobs.push({
        type: 'audio',
        filePath: audioPath,
        episodeId,
        language: 'Hindi'
      });
    }

    // 2. Download TPX Video (Optional - Storage permitting)
    if (tpxUrl) {
      logger.info(`Downloading TPX Video: ${safeName}`);
      // Simple stream copy download
      // Note: Implementation of downloadVideo similar to extractAudio
      // await ffmpegService.downloadVideo(tpxUrl, tpxPath);
      // uploadJobs.push({ type: 'video', filePath: tpxPath, episodeId, source: 'tpx' });
    }

    // 3. Send to Upload Queue
    for (const item of uploadJobs) {
        await uploadQueue.add('upload-job', item);
    }

    // 4. Trigger Gemini Subtitle Job (Audio file banne ke baad)
    if (fs.existsSync(audioPath)) {
        await subtitleQueue.add('subtitle-job', {
            filePath: audioPath, // Note: Upload worker needs to handle deletion carefully
            episodeId
        });
    }

  } catch (error) {
    logger.error(`Download Job Failed: ${error.message}`);
    throw error;
  }
}, { connection });

module.exports = worker;
