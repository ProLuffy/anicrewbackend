const { launchBrowser } = require('./common.scraper');
const logger = require('../utils/logger');

/**
 * DesiDub Scraper logic
 * Goal: Find the underlying audio stream (m3u8 or mp4) via Network Tab
 */
async function getDesiDubAudio(episodeUrl) {
  let browser = null;
  try {
    browser = await launchBrowser();
    const page = await browser.newPage();

    // 1. Request Interception Logic
    let audioUrl = null;

    // Browser ka network traffic suno
    await page.route('**/*', (route) => route.continue());
    
    const requestPromise = page.waitForResponse(response => {
      const url = response.url();
      // Hum woh URL dhoond rahe hain jo video/audio stream ho
      const isMedia = (url.includes('googlevideo.com') || url.includes('drive.google.com')) && 
                      (url.includes('videoplayback') || url.includes('export=download'));
      
      // Content-Type check karlo safe side ke liye
      const contentType = response.headers()['content-type'] || '';
      
      if (isMedia) {
        // DesiDub pe video player actually audio file hi play kar raha hota hai aksar
        // Ya agar video bhi hai, hum FFmpeg se sirf audio nikaal lenge
        audioUrl = url;
        return true;
      }
      return false;
    }, { timeout: 30000 }); // 30 sec wait

    // 2. Page Load
    logger.info(`Visiting DesiDub: ${episodeUrl}`);
    await page.goto(episodeUrl, { waitUntil: 'domcontentloaded' });

    // 3. Click Logic (Agar "Hindi" button dabana pade)
    // Note: Selector site ke hisab se adjust karna padega
    try {
        const hindiBtn = await page.getByText('Hindi', { exact: false }).first();
        if (await hindiBtn.isVisible()) {
            await hindiBtn.click();
        }
    } catch (e) {
        // Button nahi mila, shayad default hi Hindi ho
        logger.warn('Hindi button click failed or not needed');
    }

    // 4. Wait for the network sniff to capture the URL
    await requestPromise.catch(() => logger.warn("Network timeout waiting for media"));

    if (audioUrl) {
      logger.info(`🔥 DesiDub Audio Found: ${audioUrl.substring(0, 50)}...`);
      return audioUrl;
    } else {
      throw new Error("Audio URL not found in network traffic");
    }

  } catch (error) {
    logger.error(`DesiDub Scraper Error: ${error.message}`);
    throw error;
  } finally {
    if (browser) await browser.close();
  }
}

module.exports = { getDesiDubAudio };
