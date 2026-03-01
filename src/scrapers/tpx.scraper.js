const { launchBrowser } = require('./common.scraper');
const logger = require('../utils/logger');


async function getTPXVideo(episodeUrl) {
let browser = null;
try {
browser = await launchBrowser();
const page = await browser.newPage();
let videoUrl = null;

// 🕵️ SMART QUALITY SNIFFER (1080p/720p Only or Master M3U8)
const responsePromise = page.waitForResponse(response => {
  const url = response.url();
  if (url.includes('master.m3u8') || url.includes('index.m3u8')) return true;
  if (url.includes('.mp4')) {
    return url.includes('1080') || url.includes('720');
  }
  return false;
}, { timeout: 30000 });


await page.goto(episodeUrl, { waitUntil: 'domcontentloaded' });


try {
    const mirBtn = await page.getByText('Mir', { exact: false }).first();
    if (await mirBtn.isVisible()) {
        await mirBtn.click();
    }
} catch (e) {
    logger.warn('Host selection skipped');
}


try {
    const response = await responsePromise;
    videoUrl = response.url();
} catch (e) {
    logger.warn('High quality TPX Stream not sniffed immediately');
}


if (videoUrl) {
    logger.info(`✅ TPX High-Quality Link Found: ${videoUrl}`);
    return { hasHardSub: true, url: videoUrl };
} else {
    return { hasHardSub: false, url: null };
}


} catch (error) {
logger.error(`TPX Scraper Error: ${error.message}`);
return { hasHardSub: false, error: error.message };
} finally {
if (browser) await browser.close();
}
}

module.exports = { getTPXVideo };