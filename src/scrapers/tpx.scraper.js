const { launchBrowser } = require('./common.scraper');
const logger = require('../utils/logger');

async function getTPXVideo(episodeUrl) {
  let browser = null;
  try {
    browser = await launchBrowser();
    const page = await browser.newPage();
    let videoUrl = null;

    // Network Sniffer for TPX (Looking for master.m3u8)
    const responsePromise = page.waitForResponse(response => {
      const url = response.url();
      return url.includes('master.m3u8') || url.includes('index.m3u8');
    }, { timeout: 20000 });

    await page.goto(episodeUrl, { waitUntil: 'domcontentloaded' });

    // TPX pe host select karna padta hai (MIR is best)
    try {
        // "Mir" ya "VidHide" button dhoondo
        const mirBtn = await page.getByText('Mir', { exact: false }).first();
        if (await mirBtn.isVisible()) {
            await mirBtn.click();
        }
    } catch (e) {
        logger.warn('Host selection skipped');
    }

    // Wait for m3u8
    try {
        const response = await responsePromise;
        videoUrl = response.url();
    } catch (e) {
        logger.warn('TPX Stream not sniffed immediately');
    }

    if (videoUrl) {
        logger.info(`✅ TPX Hardsub Link Found: ${videoUrl}`);
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
