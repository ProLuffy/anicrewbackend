const { launchBrowser } = require('./common.scraper');
const logger = require('../utils/logger');

const getDesiDubAudio = async (animeName, episodeNumber, season = 1) => {
  let browser = null;
  try {
    browser = await launchBrowser();
    
    // Desktop Viewport
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();

    // Slug Logic
    let slug = animeName.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
    if (slug === 'solo-leveling') slug = 'ore-dake-level-up-na-ken';

    const url = `https://www.desidubanime.me/watch/${slug}-season-${season}-episode-${episodeNumber}`;
    logger.info(`🎯 Target: ${url}`);

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    
    logger.info('⏳ Waiting for player...');
    await page.waitForTimeout(15000); 

    // Smart Iframe Extraction
    const iframeSrc = await page.evaluate(() => {
      const iframes = Array.from(document.querySelectorAll('iframe'));
      const target = iframes.find(i => {
        const src = i.src || i.getAttribute('data-src') || '';
        return (src.includes('player') || src.includes('embed') || src.includes('cloud') || src.includes('ruby') || src.includes('vid'));
      });
      return target ? (target.src || target.getAttribute('data-src')) : null;
    });

    if (!iframeSrc) throw new Error('No playable iframe found');

    logger.info(`✅ Iframe Found: ${iframeSrc}`);
    return iframeSrc;

  } catch (err) {
    logger.error(`❌ DesiDub Scraper Error: ${err.message}`);
    throw err;
  } finally {
    if (browser) await browser.close();
  }
};

module.exports = { getDesiDubAudio };
