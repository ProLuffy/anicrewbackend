const playwright = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const logger = require('../../utils/logger');

// FIX: Correct Stealth Implementation
playwright.chromium.use(StealthPlugin());
const { chromium } = playwright;

class TPXNavigator {
  constructor() {
    this.browser = null;
    this.context = null;
  }

  async init() {
    this.browser = await chromium.launch({ headless: true });
    this.context = await this.browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
      ignoreHTTPSErrors: true
    });

    // FIX: Expanded Whitelist (Critical for Redirects)
    const whitelist = [
      'tpxsub', 'links.tpxsub', 'gplinks', 'gpl', // Core Chain
      'mirrored', 'mega', 'hindisubanime', // Hosts
      'pixeldrain', 'mediafire', 'zippyshare', // Final Destinations
      'google', 'gstatic' // Captcha/Fonts
    ];

    // Aggressive Popup Killer
    this.context.on('page', async (newPage) => {
      await newPage.waitForLoadState();
      const url = newPage.url();
      
      const isSafe = whitelist.some(w => url.includes(w));
      if (!isSafe) {
        logger.warn(`🚫 Killing Ad/Popup: ${url}`);
        await newPage.close();
      }
    });
  }

  async close() {
    if (this.browser) await this.browser.close();
  }

  async resolveChain(tpxEpisodeUrl) {
    const page = await this.context.newPage();
    
    try {
      await page.goto(tpxEpisodeUrl, { waitUntil: 'domcontentloaded' });

      // FIX: Concrete Selectors for TPX Server List
      // TPX structure usually involves buttons with specific text or href patterns
      const serverLinks = await page.evaluate(() => {
        const getLink = (text) => {
          // Look for <a> tags containing specific server names
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
      await page.goto(targetLink);

      // --- THE GAUNTLET --- //

      // 1. Main2.php Redirect
      if (page.url().includes('main2.php')) {
        await page.waitForNavigation({ waitUntil: 'networkidle' });
      }

      // 2. GPLinks / Shortener Bypass
      if (page.url().includes('gplinks') || page.url().includes('gpl')) {
        await this.bypassGPLinks(page);
      }

      // 3. Verify.php
      if (page.url().includes('verify.php')) {
        logger.info("🔐 Handling Verify Token...");
        // Wait for redirect to a known host
        await page.waitForURL(/mirrored|mega|hindisubanime|pixeldrain/, { timeout: 45000 });
      }

      const finalUrl = page.url();
      logger.info(`✅ Resolved Host: ${finalUrl}`);
      return finalUrl;

    } catch (e) {
      await page.close();
      throw e;
    }
  }

  async bypassGPLinks(page) {
    logger.info("💣 Bypassing GPLinks...");
    
    try {
      // Step 1: Wait for Timer/Verify
      // Using generic IDs often found in GPLinks templates
      await page.waitForSelector('#timer, .timer, #verify_button', { timeout: 15000 }).catch(() => {});
      
      // Click Verify (First Step)
      const verifyBtn = page.locator('text=/Verify/i').first();
      if (await verifyBtn.isVisible()) await verifyBtn.click();

      await page.waitForTimeout(6000); // Wait for internal timer

      // Step 2: Get Link (Final Step)
      const getLinkBtn = page.locator('text=/Get Link/i').first();
      
      if (await getLinkBtn.isVisible()) {
        await getLinkBtn.click();
      } else {
        // FIX: JS Fallback if button is hidden/obfuscated
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

      // Wait for the next stage (Verify.php)
      await page.waitForURL(/verify\.php/, { timeout: 20000 });

    } catch (e) {
      throw new Error(`Shortener Bypass Failed: ${e.message}`);
    }
  }
}

module.exports = TPXNavigator;
