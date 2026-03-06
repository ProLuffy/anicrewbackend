const { launchBrowser } = require('./common.scraper');
const logger = require('../utils/logger');

const getTPXVideo = async (animeName, episodeNumber, season = 1) => {
    let browser = null;
    try {
        browser = await launchBrowser();
        const context = await browser.newContext({
            viewport: { width: 1920, height: 1080 },
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            bypassCSP: true
        });
        
        const page = await context.newPage();
        let finalMediaUrl = null;

        // 🕵️ NETWORK SNIFFER
        const sniffResponse = async (response) => {
            const url = response.url();
            if ((url.includes('.m3u8') || url.includes('.mp4')) && !url.includes('ad')) {
                if (url.includes('master') || url.includes('index') || url.includes('1080')) {
                    if (!finalMediaUrl) {
                        finalMediaUrl = url;
                        logger.info(`✅ Sniffed Direct Stream: ${finalMediaUrl}`);
                    }
                } else if (!finalMediaUrl) {
                    finalMediaUrl = url; 
                }
            }
        };

        page.on('response', sniffResponse);

        // 1️⃣ Website URL Generator (The Fix for URL Format)
        let slug = animeName.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
        
        // Agar solo leveling jaisa koi naam hai jisme override nahi chahiye, toh exact naam use hoga
        // Episode number ko 2 digits mein convert karna (e.g., 1 -> 01, 10 -> 10)
        let paddedEp = episodeNumber.toString().padStart(2, '0');
        
        // Asli TPX URL format: /solo-leveling-hindi-sub-01/
        const episodeUrl = `https://www.tpxsub.com/${slug}-hindi-sub-${paddedEp}/`;
        
        logger.info(`🎯 Target TPX: ${episodeUrl}`);
        await page.goto(episodeUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForTimeout(4000);

        // 2️⃣ SERVER SELECT KARO (Regex syntax fixed)
        logger.info('🔍 Server dhoondh rahe hain (Theta/Mega/Mirror/PL)...');
        const serverBtn = page.locator('text=/Theta|Mega|Mirror|PL/i').first();
        if (await serverBtn.isVisible({ timeout: 5000 })) {
            logger.info(`🖱️ Server Button Clicked: ${await serverBtn.innerText()}`);
            await serverBtn.click({ force: true });
            await page.waitForTimeout(3000);
        } else {
            logger.warn('⚠️ Koi Server button nahi mila, default try kar rahe hain.');
        }

        // 3️⃣ SHORTENER LINK SELECT KARO (GPLink, Cute, etc.) (Regex syntax fixed)
        logger.info('🔍 Shortener option dhoondh rahe hain (GPLink/Cute/Download)...');
        const shortenerBtn = page.locator('text=/gplink|cute|link|download/i').first();
        
        let newPage;
        if (await shortenerBtn.isVisible({ timeout: 5000 })) {
            logger.info(`🖱️ Shortener Clicked: ${await shortenerBtn.innerText()}`);
            
            [newPage] = await Promise.all([
                context.waitForEvent('page'),
                shortenerBtn.click({ force: true })
            ]);
        } else {
            throw new Error('❌ Shortener button nahi mila!');
        }

        // 4️⃣ SHORTENER BYPASS ENGINE
        logger.info('🚀 Naya Tab Khula! Shortener Bypass Engine Start...');
        newPage.on('response', sniffResponse);
        await newPage.waitForLoadState('domcontentloaded');

        for (let i = 0; i < 7; i++) {
            if (finalMediaUrl) break;
            
            await newPage.waitForTimeout(5000);
            
            const currentUrl = newPage.url();
            if (currentUrl.includes('verify.php') || currentUrl.includes('mega.nz') || currentUrl.includes('drive.google')) {
                logger.info(`🔗 JACKPOT! Final Destination Reached: ${currentUrl}`);
                finalMediaUrl = currentUrl;
                break;
            }

            try {
                // Regex syntax fixed here too
                const bypassBtn = newPage.locator('text=/verify|continue|get link|click here|go to|skip|open/i').first();
                if (await bypassBtn.isVisible({ timeout: 2000 })) {
                    logger.info(`🖱️ Bypassing... Clicking '${await bypassBtn.innerText()}'`);
                    await bypassBtn.click({ force: true });
                }
            } catch (e) {
                // Ignore if not found this loop
            }
        }

        if (!finalMediaUrl) throw new Error('❌ Extraction Failed. Auto-bypass aakhri link nahi nikal paaya.');

        return { hasHardSub: true, url: finalMediaUrl };

    } catch (err) {
        logger.error(`❌ TPX Scraper Error: ${err.message}`);
        return { hasHardSub: false, url: null, error: err.message };
    } finally {
        if (browser) await browser.close();
    }
};

module.exports = { getTPXVideo };
