const { launchBrowser } = require('./common.scraper');
const logger = require('../utils/logger');

/**
 * Scrapes DesiDub for the playable iframe source.
 * Supports Season-aware URLs and hidden data-src attributes.
 */
const getDesiDubAudio = async (animeName, episodeNumber, season = 1) => {
  let browser = null;

  try {
    browser = await launchBrowser();

    // Force Desktop Viewport to ensure all server buttons and iframes are rendered
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });

    const page = await context.newPage();

    // Slug generation: Handles specific naming conventions like Solo Leveling
    let slug = animeName.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
    if (slug === 'solo-leveling') {
      slug = 'ore-dake-level-up-na-ken';
    }

    // DesiDub uses /watch/ prefix for the actual player page
    const url = `https://www.desidubanime.me/watch/${slug}-season-${season}-episode-${episodeNumber}`;
    logger.info(`🎯 Targeting DesiDub URL: ${url}`);

    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    // Wait for lazy-loaded iframes and JS-injected players
    logger.info('⏳ Waiting for player & iframe to appear...');
    await page.waitForTimeout(15000);

    const iframeSrc = await page.evaluate(() => {
      const iframes = Array.from(document.querySelectorAll('iframe'));

      const target = iframes.find(i => {
        // Checks both 'src' and 'data-src' to bypass lazy-loading traps
        const src = i.src || i.getAttribute('data-src') || '';
        return (
          src.includes('player') ||
          src.includes('embed') ||
          src.includes('cloud') ||
          src.includes('ruby') ||
          src.includes('abyss') ||
          src.includes('vid')
        );
      });

      return target ? (target.src || target.getAttribute('data-src')) : null;
    });

    if (!iframeSrc) {
      throw new Error('No playable iframe found (Checked src & data-src)');
    }

    logger.info(`✅ IFRAME FOUND: ${iframeSrc}`);
    return iframeSrc;

  } catch (err) {
    logger.error(`❌ DesiDub Scraper Error: ${err.message}`);
    throw err;
  } finally {
    if (browser) await browser.close();
  }
};

module.exports = { getDesiDubAudio };
