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

        // ==========================================
        // 1️⃣ SEARCH ENGINE: TPX par Search karke post dhoondho
        // ==========================================
        const searchQuery = encodeURIComponent(animeName);
        const searchUrl = `https://www.tpxsub.com/?s=${searchQuery}`;
        logger.info(`🔍 Searching TPX website for: ${animeName} (Episode ${episodeNumber})`);
        
        await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
        
        const targetPostUrl = await page.evaluate(({ anime, ep }) => {
            const links = Array.from(document.querySelectorAll('h2 a, h3 a, .post-title a, article a'));
            
            let exactMatch = links.find(a => {
                const txt = a.innerText.toLowerCase();
                return txt.includes(anime.toLowerCase()) && 
                       (txt.includes(`episode ${ep}`) || txt.includes(`ep ${ep}`) || txt.includes(`e${ep}`) || txt.includes(`-${ep}-`) || txt.includes(`0${ep}`));
            });
            if (exactMatch) return exactMatch.href;
            
            let generalMatch = links.find(a => a.innerText.toLowerCase().includes(anime.toLowerCase()));
            return generalMatch ? generalMatch.href : null;
        }, { anime: animeName, ep: episodeNumber });

        if (!targetPostUrl) throw new Error(`❌ Search Failed: TPX par "${animeName}" Episode ${episodeNumber} nahi mila!`);

        logger.info(`🎯 Page Found via Search: ${targetPostUrl}`);
        await page.goto(targetPostUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForTimeout(3000); 

        // ==========================================
        // 2️⃣ QUALITY: Sirf 1080p select karo
        // ==========================================
        logger.info('🔍 1080p Quality dhoondh rahe hain...');
        const qualityBtn = page.locator('text=/1080p|FHD/i').first();
        if (await qualityBtn.isVisible({ timeout: 4000 })) {
            logger.info('🖱️ 1080p Quality Selected!');
            await qualityBtn.click({ force: true });
            await page.waitForTimeout(2000);
        } else {
            logger.warn('⚠️ 1080p button alag se nahi mila, aage badh rahe hain...');
        }

        // ==========================================
        // 3️⃣ SERVER: Mir | PL1 | Mega | Theta 
        // ==========================================
        logger.info('🔍 Server (Mir/PL1/Mega/Theta) dhoondh rahe hain...');
        const serverBtn = page.locator('text=/Mir|PL1|Mega|Theta/i').first();
        if (await serverBtn.isVisible({ timeout: 5000 })) {
            logger.info(`🖱️ Server Clicked: ${await serverBtn.innerText()}`);
            await serverBtn.click({ force: true });
            await page.waitForTimeout(3000);
        } else {
            logger.warn('⚠️ Server button nahi mila!');
        }

        // ==========================================
        // 4️⃣ SHORTENER: GPLink ya Cuty
        // ==========================================
        logger.info('🔍 Shortener (GPLink/Cuty) dhoondh rahe hain...');
        const shortenerBtn = page.locator('text=/gplink|cuty/i').first();
        
        let newPage;
        if (await shortenerBtn.isVisible({ timeout: 5000 })) {
            logger.info(`🖱️ Shortener Clicked: ${await shortenerBtn.innerText()}`);
            
            [newPage] = await Promise.all([
                context.waitForEvent('page'),
                shortenerBtn.click({ force: true })
            ]);
        } else {
            throw new Error('❌ GPLink / Cuty button nahi mila!');
        }

        // ==========================================
        // 5️⃣ BYPASS ENGINE (Shortener to Download Link)
        // ==========================================
        logger.info('🚀 Naya Tab Khula! Redirects aur Bypass handle kar rahe hain...');
        newPage.on('response', sniffResponse);
        await newPage.waitForLoadState('domcontentloaded');

        for (let i = 0; i < 12; i++) { 
            if (finalMediaUrl) break;
            
            await newPage.waitForTimeout(5000); 
            
            const currentUrl = newPage.url();
            logger.info(`⏳ Current URL: ${currentUrl}`);

            if (currentUrl.includes('mega.nz') || currentUrl.includes('drive.google') || currentUrl.includes('mirrored') || currentUrl.includes('pixeldrain') || currentUrl.includes('mediafire') || currentUrl.includes('zippyshare')) {
                logger.info(`🔗 JACKPOT! Final Destination Reached: ${currentUrl}`);
                finalMediaUrl = currentUrl;
                break;
            }

            try {
                const bypassBtn = newPage.locator('text=/verify|continue|get link|click here|go to|skip|open/i').first();
                if (await bypassBtn.isVisible({ timeout: 2000 })) {
                    logger.info(`🖱️ Bypassing Ad: Clicking button...`);
                    await bypassBtn.click({ force: true });
                } else {
                    await newPage.evaluate(() => {
                        const btns = Array.from(document.querySelectorAll('a, button'));
                        const btn = btns.find(b => /verify|continue|get link|click here|go to/i.test(b.innerText || b.textContent));
                        if(btn) btn.click();
                    });
                }
            } catch (e) {
                // Ignore loop errors
            }
        }

        if (!finalMediaUrl) throw new Error('❌ Bypass Timeout! (Timer lamba tha ya link nahi nikla)');

        return { hasHardSub: true, url: finalMediaUrl };

    } catch (err) {
        logger.error(`❌ TPX Scraper Error: ${err.message}`);
        return { hasHardSub: false, url: null, error: err.message };
    } finally {
        if (browser) await browser.close();
    }
};

module.exports = { getTPXVideo };
