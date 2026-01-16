const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth');
const logger = require('../utils/logger');

// Playwright ko stealth plugin add karna
chromium.use(stealth());

const launchBrowser = async () => {
  return await chromium.launch({
    headless: process.env.HEADLESS_MODE === 'true', // .env se control
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu'
    ]
  });
};

module.exports = { launchBrowser };
