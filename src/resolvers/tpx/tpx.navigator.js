const { chromium } = require('playwright-extra');
const stealthPlugin = require('puppeteer-extra-plugin-stealth');
const logger = require('../../utils/logger');

// ✅ FIX: Correct Stealth Implementation for playwright-extra
chromium.use(stealthPlugin());

class TPXNavigator {
  constructor() {
    this.browser = null;
    this.context = null;
  }

  async init() {
    // ✅ FIX: Added VPS specific args so it doesn't crash on Ubuntu
    this.browser = await chromium.launch({ 
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu'
        ]
    });
    
    this.context = await this.browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
      ignoreHTTPSErrors: true
    });

    const whitelist = [
      'tpxsub', 'links.tpxsub', 'gplinks', 'gpl', 
      'mirrored', 'mega', 'hindisubanime', 
      'pixeldrain', 'mediafire', 'zippyshare', 
      'google', 'gstatic' 
    ];

    // Aggressive Popup Killer
    this.context.on('page', async (newPage) => {
      try {
          await newPage.waitForLoadState('domcontentloaded');
          const url = newPage.url();
          
          const isSafe = whitelist.some(w => url.includes(w));
          if (!isSafe && url !== 'about:blank') {
            logger.warn(`🚫 Killing Ad/Popup: ${url}`);
            await newPage.close();
          }
      } catch(e) { /* ignore closed page errors */ }
    });
  }

  async close() {
    if (this.browser) await this.browser.close();
  }

  async resolveChain(tpxEpisodeUrl) {
    const page = await this.context.newPage();
    
    try {
      await page.goto(tpxEpisodeUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

      // Concrete Selectors for TPX Server List
      const serverLinks = await page.evaluate(() => {
        const getLink = (text) => {
          const el = Array.from(document.querySelectorAll('a, button')).find(e => 
            e.innerText.toLowerCase().includes(text.toLowerCase())
          );
          return el ? (el.href || el.getAttribute('onclick')) : null;
        };

        return {
          mirrored: getLink('Mirrored'),
          mega: getLink('Mega'),
          pl1: getLink('PL1'),
          theta: getLink('Theta')
        };
      });

      // Priority: Mirrored > Mega > Theta
      const targetLink = serverLinks.mirrored || serverLinks.mega || serverLinks.theta;
      if (!targetLink) throw new Error("TPX Scrape Error: No valid server links found in DOM");

      logger.info(`🔗 Starting Chain: ${targetLink}`);
      
      // ✅ Handle if targetLink is a javascript onclick instead of standard href
      if (targetLink.includes('javascript') || targetLink.includes('window.open')) {
          await page.evaluate((code) => eval(code), targetLink);
      } else {
          await page.goto(targetLink, { waitUntil: 'domcontentloaded' });
      }

      // --- THE GAUNTLET --- //

      // 1. Main2.php Redirect
      if (page.url().includes('main2.php')) {
        await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 }).catch(()=>{});
      }

      // 2. GPLinks / Shortener Bypass
      if (page.url().includes('gplinks') || page.url().includes('gpl')) {
        await this.bypassGPLinks(page);
      }

      // 3. Verify.php
      if (page.url().includes('verify.php')) {
        logger.info("🔐 Handling Verify Token...");
        await page.waitForURL(/mirrored|mega|hindisubanime|pixeldrain/, { timeout: 45000 }).catch(()=>{});
      }

      const finalUrl = page.url();
      logger.info(`✅ Resolved Host: ${finalUrl}`);
      return finalUrl;

    } catch (e) {
      logger.error(`Resolve Chain Error: ${e.message}`);
      throw e;
    } finally {
      await page.close();
    }
  }

  async bypassGPLinks(page) {
    logger.info("💣 Bypassing GPLinks...");
    try {
      await page.waitForSelector('#timer, .timer, #verify_button', { timeout: 15000 }).catch(() => {});
      
      const verifyBtn = page.locator('text=/Verify/i').first();
      if (await verifyBtn.isVisible()) await verifyBtn.click({force: true});

      await page.waitForTimeout(6000); 

      const getLinkBtn = page.locator('text=/Get Link/i').first();
      
      if (await getLinkBtn.isVisible()) {
        await getLinkBtn.click({force: true});
      } else {
        logger.info("⚠️ Button not visible, attempting JS Injection Fallback...");
        await page.evaluate(() => {
          const validLink = Array.from(document.querySelectorAll('a'))
            .find(el => el.href && el.href.includes('verify.php'));
          
          if (validLink) {
             window.location.href = validLink.href;
          } else {
             throw new Error("JS Fallback: Link not found");
          }
        });
      }
      await page.waitForURL(/verify\.php/, { timeout: 20000 }).catch(()=>{});
    } catch (e) {
      throw new Error(`Shortener Bypass Failed: ${e.message}`);
    }
  }
}

module.exports = TPXNavigator;
