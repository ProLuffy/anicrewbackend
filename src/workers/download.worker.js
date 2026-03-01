const { Worker } = require('bullmq');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const { connection } = require('../config/redis.config');
const { QUEUES } = require('../config/constants');
const Episode = require('../models/Episode.model');
const AudioTrack = require('../models/AudioTrack.model');
const VideoSource = require('../models/VideoSource.model');
const driveService = require('../services/drive.service');
const logger = require('../utils/logger');


const worker = new Worker(QUEUES.DOWNLOAD, async (job) => {
const { url, episodeId, episodeNumber, animeName, season, type } = job.data;
logger.info(`⬇️ Processing ${type}: ${animeName} E${episodeNumber}`);

// Temp folder setup
const ext = type === 'audio' ? 'm4a' : 'mp4'; // Changed to m4a/mp4 for better compatibility
const fileName = `${animeName.replace(/\s+/g, '_')}_S${season}_E${episodeNumber}.${ext}`;
const tempPath = path.join(__dirname, '../../downloads', fileName);
if (!fs.existsSync(path.dirname(tempPath))) fs.mkdirSync(path.dirname(tempPath), { recursive: true });

try {
// 1. Download & Convert Stream using FFmpeg
logger.info(`🎥 Starting FFmpeg stream capture for: ${fileName}`);
await new Promise((resolve, reject) => {
  let command = ffmpeg(url);
  
  if (type === 'audio') {
    // Extract only audio (Fastest way)
    command = command.noVideo().audioCodec('aac');
  } else {
    // Copy stream directly for video (No re-encoding = Fast)
    command = command.videoCodec('copy').audioCodec('copy');
  }


  command
    .outputOptions('-bsf:a aac_adtstoasc') // Fixes audio stream errors in m3u8
    .save(tempPath)
    .on('end', () => {
        logger.info(`✅ FFmpeg download complete: ${fileName}`);
        resolve();
    })
    .on('error', (err) => {
        logger.error(`❌ FFmpeg Error: ${err.message}`);
        reject(err);
    });
});


// 2. Upload to Drive safely
logger.info(`☁️ Uploading to Drive...`);
const driveFileId = await driveService.uploadToDrive(tempPath, fileName, animeName, season);


// 3. Update Database with the Drive File ID
if (type === 'audio') {
  await AudioTrack.create({
    episodeId,
    source: 'desidub',
    language: 'Hindi',
    driveFileId: driveFileId
  });
  await Episode.findByIdAndUpdate(episodeId, { hasExternalAudio: true });
} else {
  await VideoSource.create({
    episodeId,
    source: 'tpx',
    type: 'file',
    quality: '1080p',
    driveFileId: driveFileId
  });
  await Episode.findByIdAndUpdate(episodeId, { hasTPXOverride: true });
}


logger.info(`✅ Attached to Episode DB. Drive ID: ${driveFileId}`);

} catch (error) {
logger.error(`Download/Upload Failed: ${error.message}`);
throw error;
} finally {
// 4. CLEANUP: Always delete the local file to save VPS storage
if (fs.existsSync(tempPath)) {
fs.unlinkSync(tempPath);
logger.info(`🧹 Local file deleted: ${fileName}`);
}
}
}, { connection, concurrency: 1 }); // Concurrency 1 keeps CPU safe from multiple FFmpeg processes

module.exports = worker;