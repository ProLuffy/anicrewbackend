const { Worker } = require('bullmq');
const { connection } = require('../config/redis.config');
const { QUEUES, PATHS } = require('../config/constants');
const geminiService = require('../services/gemini.service');
const Subtitle = require('../models/Subtitle.model');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const worker = new Worker(QUEUES.SUBTITLE, async (job) => {
  const { filePath, episodeId } = job.data;
  logger.info(`Starting AI Subtitle Gen for: ${episodeId}`);

  try {
    // 1. Upload temp file to Gemini (File API)
    // Note: Gemini supports audio inputs directly now
    const uploadResult = await geminiService.uploadMedia(filePath, "audio/mp4");

    // 2. Generate Subtitles
    // Wait logic might be needed here if file processing takes time
    // For now assuming quick processing for audio
    const srtContent = await geminiService.generateSubtitles(uploadResult.uri);

    // 3. Save SRT Locally (for soft-sub serving)
    const srtFileName = `sub_${episodeId}_hindi.srt`;
    const srtPath = path.join(PATHS.SUBTITLES, srtFileName);
    
    fs.writeFileSync(srtPath, srtContent);

    // 4. Update Database
    await Subtitle.create({
      episodeId,
      language: 'Hindi',
      format: 'srt',
      source: 'gemini',
      localPath: srtFileName, // Serve via express static
      isApproved: true
    });

    logger.info(`Subtitle Generated & Saved: ${srtFileName}`);

    // Gemini file cleanup logic could be added here if API supports delete

  } catch (error) {
    logger.error(`Subtitle Job Failed: ${error.message}`);
    // Don't throw immediately if you want to retry with different prompt
  }
}, { connection });

module.exports = worker;
