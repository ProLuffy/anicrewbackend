const { Worker } = require('bullmq');
const { connection } = require('../config/redis.config');
const { QUEUES } = require('../config/constants');
const notificationService = require('../services/notification.service');
const logger = require('../utils/logger');

const worker = new Worker(QUEUES.NOTIFY, async (job) => {
  const { type, payload } = job.data;
  logger.info(`🔔 Processing Notification: ${type}`);

  try {
    switch (type) {
      case 'EPISODE_READY':
        const { animeTitle, episodeNumber, audioLang, quality, link } = payload;
        const msg = `
🎬 *NEW EPISODE UPLOADED!*

📌 *Anime:* ${animeTitle}
🔢 *Episode:* ${episodeNumber}
🔊 *Audio:* ${audioLang}
💿 *Quality:* ${quality}

✅ *Stream Now:* [Click Here](${link})
        `;
        // Agar poster URL hai toh second param me paas kar sakte hain
        await notificationService.sendUpdate(msg);
        break;

      case 'JOB_FAILED':
        await notificationService.sendAdminAlert(`Job Failed: ${payload.reason} for ${payload.id}`);
        break;
        
      default:
        logger.warn(`Unknown notification type: ${type}`);
    }
  } catch (error) {
    logger.error(`Notification Job Failed: ${error.message}`);
  }
}, { connection });

module.exports = worker;
