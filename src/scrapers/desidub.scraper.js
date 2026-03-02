const { launchBrowser } = require('./common.scraper');
const logger = require('../utils/logger');


const getDesiDubAudio = async (animeName, episodeNumber, season = 1) => {
let browser = null;
try {
browser = await launchBrowser();
const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
});
const page = await context.newPage();


let videoUrl = null;


// 🕵️ SMART QUALITY SNIFFER
page.on('response', async (response) => {
  const url = response.url();
  if ((url.includes('.m3u8') || url.includes('.mp4')) && !url.includes('ad') && !url.includes('tracking') && !videoUrl) {
    if (url.includes('master') || url.includes('index') || url.includes('1080') || url.includes('720')) {
        videoUrl = url;
        logger.info(`✅ Sniffed High-Quality Link: ${videoUrl}`);
    } else if (!videoUrl) {
        videoUrl = url; // Fallback
    }
  }
});


let slug = animeName.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
if (slug === 'solo-leveling') slug = 'ore-dake-level-up-na-ken';


const url = `https://www.desidubanime.me/watch/${slug}-season-${season}-episode-${episodeNumber}`;
logger.info(`🎯 Target: ${url}`);


await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });


logger.info('⏳ Waiting for player and sniffing network traffic...');
await page.waitForTimeout(15000);


if (!videoUrl) throw new Error('Could not sniff playable high-quality link from network traffic');


return videoUrl;


} catch (err) {
logger.error(`❌ DesiDub Scraper Error: ${err.message}`);
throw err;
} finally {
if (browser) await browser.close();
}
};

module.exports = { getDesiDubAudio };