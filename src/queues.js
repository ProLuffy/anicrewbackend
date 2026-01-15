const { Queue } = require('bullmq');
const IORedis = require('ioredis');
const connection = new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null });

const scraperQueue = new Queue('scraper-queue', { connection });
const processQueue = new Queue('process-queue', { connection });
const uploadQueue = new Queue('upload-queue', { connection });

module.exports = { connection, scraperQueue, processQueue, uploadQueue };
