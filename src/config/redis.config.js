const Redis = require('ioredis');

const redisConfig = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null, // Required requirement for BullMQ
};

const connection = new Redis(redisConfig);

connection.on('connect', () => console.log('✅ Redis Connected'));
connection.on('error', (err) => console.error('❌ Redis Error:', err));

module.exports = {
  connection, // For BullMQ
  redisConfig // For general use
};
