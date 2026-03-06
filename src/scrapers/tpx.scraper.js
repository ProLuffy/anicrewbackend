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

        // 🕵️ NETWORK SNIFFER: Agar bypass karte waqt parde ke peeche .m3u8 ya .mp4 mil jaye
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

        // 1️⃣ Website pe jao
        let slug = animeName.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
        if (slug === 'solo-leveling') slug = 'ore-dake-level-up-na-ken';
        const episodeUrl = `https://www.tpxsub.com/watch/${slug}-season-${season}-episode-${episodeNumber}`;
        
        logger.info(`🎯 Target TPX: ${episodeUrl}`);
        await page.goto(episodeUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForTimeout(4000);

        // 2️⃣ SERVER SELECT KARO (Theta, Mega, Mirror, ya PL)
        logger.info('🔍 Server dhoondh rahe hain (Theta/Mega/Mirror/PL)...');
        const serverBtn = page.locator('text=/(?i)(Theta|Mega|Mirror|PL)/').first();
        if (await serverBtn.isVisible({ timeout: 5000 })) {
            logger.info(`🖱️ Server Button Clicked: ${await serverBtn.innerText()}`);
            await serverBtn.click({ force: true });
            await page.waitForTimeout(3000);
        } else {
            logger.warn('⚠️ Koi Server button nahi mila, default try kar rahe hain.');
        }

        // 3️⃣ SHORTENER LINK SELECT KARO (GPLink, Cute, etc.) jo naya tab kholega
        logger.info('🔍 Shortener option dhoondh rahe hain (GPLink/Cute)...');
        const shortenerBtn = page.locator('text=/(?i)(gplink|cute|link|download)/').first();
        
        let newPage;
        if (await shortenerBtn.isVisible({ timeout: 5000 })) {
            logger.info(`🖱️ Shortener Clicked: ${await shortenerBtn.innerText()}`);
            
            // Click karte hi jo naya tab khulega usko pakdo
            [newPage] = await Promise.all([
                context.waitForEvent('page'),
                shortenerBtn.click({ force: true })
            ]);
        } else {
            throw new Error('❌ Shortener button nahi mila!');
        }

        // 4️⃣ SHORTENER BYPASS ENGINE (Naye tab mein)
        logger.info('🚀 Naya Tab Khula! Shortener Bypass Engine Start...');
        newPage.on('response', sniffResponse);
        await newPage.waitForLoadState('domcontentloaded');

        // Shortener pe multiple clicks aur wait karna padta hai
        for (let i = 0; i < 7; i++) {
            if (finalMediaUrl) break; // Link mil gaya toh stop
            
            await newPage.waitForTimeout(5000); // 5 sec timer wait
            
            // Check current URL (kya hum verify.php ya mega.nz pe pohoch gaye?)
            const currentUrl = newPage.url();
            if (currentUrl.includes('verify.php') || currentUrl.includes('mega.nz') || currentUrl.includes('drive.google')) {
                logger.info(`🔗 JACKPOT! Final Destination Reached: ${currentUrl}`);
                finalMediaUrl = currentUrl;
                break;
            }

            // Agar nahi pahuche, toh bypass buttons dhoondho aur click karo
            try {
                const bypassBtn = newPage.locator('text=/(?i)(verify|continue|get link|click here|go to|skip|open)/').first();
                if (await bypassBtn.isVisible({ timeout: 2000 })) {
                    logger.info(`🖱️ Bypassing... Clicking '${await bypassBtn.innerText()}'`);
                    await bypassBtn.click({ force: true });
                }
            } catch (e) {
                // Button nahi mila, next loop mein phir try karega
            }
        }

        if (!finalMediaUrl) throw new Error('❌ Extraction Failed. Auto-bypass aakhri link nahi nikal paaya.');

        // 5️⃣ RETURN LINK (Taaki Download Worker VPS pe download karke Drive pe daal sake)
        return { hasHardSub: true, url: finalMediaUrl };

    } catch (err) {
        logger.error(`❌ TPX Scraper Error: ${err.message}`);
        return { hasHardSub: false, url: null, error: err.message };
    } finally {
        if (browser) await browser.close();
    }
};

module.exports = { getTPXVideo };
