module.exports = {
  // Scraper Settings
  TIMEOUTS: {
    PAGE_LOAD: 60000,
    ELEMENT_WAIT: 10000,
    NETWORK_IDLE: 5000,
  },
  USER_AGENT: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  
  // Media Settings
  RESOLUTIONS: ['1080p', '720p', '360p'],
  AUDIO_LANGUAGES: ['Hindi', 'Tamil', 'Telugu', 'English', 'Japanese'],
  
  // Storage Paths
  PATHS: {
    DOWNLOADS: './downloads',
    SUBTITLES: './subtitles'
  },
  
  // BullMQ Settings
  QUEUES: {
    SCRAPER: 'scraper-queue',
    DOWNLOAD: 'download-queue',
    UPLOAD: 'upload-queue',
    SUBTITLE: 'subtitle-queue',
    NOTIFY: 'notify-queue'
  }
};
