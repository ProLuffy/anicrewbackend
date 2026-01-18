const { Worker } = require('bullmq');
const { connection } = require('../config/redis.config');
const { QUEUES, PATHS } = require('../config/constants');
const geminiService = require('../services/gemini.service');
const Subtitle = require('../models/Subtitle.model');
const Episode = require('../models/Episode.model');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const worker = new Worker(
  QUEUES.SUBTITLE,
  async (job) => {
    const { filePath, episodeId } = job.data;
    logger.info(`🎧 Subtitle job started for episode: ${episodeId}`);

    try {
      // 🔁 MARK PROCESSING
      await Episode.findByIdAndUpdate(episodeId, {
        'subtitleJobs.hindi.status': 'processing'
      });

      // ⬆️ UPLOAD AUDIO TO GEMINI
      const uploadResult = await geminiService.uploadMedia(
        filePath,
        'audio/mp4'
      );

      // 🧠 GENERATE SUBTITLES
      const srtContent = await geminiService.generateSubtitles(
        uploadResult.uri
      );

      // 💾 SAVE LOCALLY
      const fileName = `sub_${episodeId}_hindi.srt`;
      const savePath = path.join(PATHS.SUBTITLES, fileName);
      fs.writeFileSync(savePath, srtContent);

      // 🗃️ SUBTITLE ARCHIVE
      await Subtitle.create({
        episodeId,
        language: 'Hindi',
        format: 'srt',
        source: 'gemini',
        localPath: fileName,
        isApproved: true
      });

      // ✅ UPDATE EPISODE (THIS IS THE MAGIC)
      await Episode.findByIdAndUpdate(episodeId, {
        'subtitleSources.hindi': `/subs/${fileName}`,
        'subtitleJobs.hindi.status': 'ready',
        'subtitleJobs.hindi.file': fileName
      });

      logger.info(`✅ Subtitle ready: ${fileName}`);

    } catch (error) {
      logger.error(`❌ Subtitle job failed: ${error.message}`);

      await Episode.findByIdAndUpdate(episodeId, {
        'subtitleJobs.hindi.status': 'failed',
        'subtitleJobs.hindi.lastError': error.message
      });
    }
  },
  { connection }
);

module.exports = worker;
