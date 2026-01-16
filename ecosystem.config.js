module.exports = {
  apps: [
    {
      name: "anicrew-api",
      script: "./src/server.js",
      instances: 1, // API ke liye 1 instance kaafi hai (Node is single threaded but fast)
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "worker-scraper",
      script: "./src/workers/scraper.worker.js",
      instances: 1, // Browser heavy hota hai, 1 hi rakho
    },
    {
      name: "worker-download",
      script: "./src/workers/download.worker.js",
      instances: 1, // CPU intensive (FFmpeg)
    },
    {
      name: "worker-upload",
      script: "./src/workers/upload.worker.js",
      instances: 2, // I/O heavy hai, 2 workers parallel chala sakte ho
    },
    {
      name: "worker-subtitle",
      script: "./src/workers/subtitle.worker.js",
      instances: 1,
    },
    {
      name: "worker-notify",
      script: "./src/workers/notify.worker.js",
      instances: 1,
    }
  ]
};
