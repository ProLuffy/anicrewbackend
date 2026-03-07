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
        // 1️⃣ SEARCH ENGINE (Upgraded & Patient)
        // ==========================================
        const searchQuery = encodeURIComponent(animeName);
        const searchUrl = `https://www.tpxsub.com/?s=${searchQuery}`;
        logger.info(`🔍 Searching TPX website for: ${animeName} (Episode ${episodeNumber})`);
        
        // 🚨 FIX: domcontentloaded se 'load' kar diya taaki pura page aaram se khule
        await page.goto(searchUrl, { waitUntil: 'load', timeout: 60000 });
        
        // 🚨 FIX: 5 Second ka extra wait taaki search results screen par aa jayein
        await page.waitForTimeout(5000); 
        
        const targetPostUrl = await page.evaluate(({ anime, ep }) => {
            // Sab a tags nikal lo
            const links = Array.from(document.querySelectorAll('a'));
            const paddedEp = ep.toString().padStart(2, '0');
            const paddedEpAlt = `0${ep}`;
            
            // Priority 1: Smart Match (Check Text AND Href)
            let exactMatch = links.find(a => {
                const txt = (a.innerText || "").toLowerCase();
                const href = (a.href || "").toLowerCase();
                
                // Anime ka naam (kam se kam ek bada word match ho)
                const nameParts = anime.toLowerCase().split(' ').filter(p => p.length > 3);
                const matchesName = nameParts.some(part => txt.includes(part) || href.includes(part));
                
                // Episode number match
                const matchesEp = txt.includes(`episode ${ep}`) || txt.includes(`ep ${ep}`) || 
                                  href.includes(`episode-${ep}`) || href.includes(`-${paddedEp}-`) || 
                                  href.includes(`-${paddedEpAlt}-`) || href.includes(`-e${paddedEp}-`);

                // Faltu links (tag, category) ko ignore karo
                return matchesName && matchesEp && !href.includes('/category/') && !href.includes('/tag/') && !href.includes('/author/');
            });

            if (exactMatch) return exactMatch.href;

            // Priority 2: Agar single episode nahi mila, toh shayad "All Episodes" wala post ho
            let generalMatch = links.find(a => {
                const txt = (a.innerText || "").toLowerCase();
                const href = (a.href || "").toLowerCase();
                return txt.includes(anime.toLowerCase()) && !href.includes('/category/') && !href.includes('/tag/');
            });

            return generalMatch ? generalMatch.href : null;

        }, { anime: animeName, ep: episodeNumber });

        if (!targetPostUrl) throw new Error(`❌ Search Failed: TPX par "${animeName}" Episode ${episodeNumber} nahi mila!`);

        logger.info(`🎯 Page Found via Search: ${targetPostUrl}`);
        await page.goto(targetPostUrl, { waitUntil: 'load', timeout: 60000 });
        await page.waitForTimeout(4000); 

        // ==========================================
        // 2️⃣ QUALITY: Sirf 1080p select karo
        // ==========================================
        logger.info('🔍 1080p Quality dhoondh rahe hain...');
        const qualityBtn = page.locator('text=/1080p|FHD/i').first();
        if (await qualityBtn.isVisible({ timeout: 4000 })) {
            logger.info('🖱️ 1080p Quality Selected!');
            await qualityBtn.click({ force: true });
            await page.waitForTimeout(3000);
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
            await page.waitForTimeout(4000);
        } else {
            logger.warn('⚠️ Server button nahi mila!');
        }

        // ==========================================
        // 4️⃣ SHORTENER: GPLink ya Cuty
        // ==========================================
        logger.info('🔍 Shortener (GPLink/Cuty) dhoondh rahe hain...');
        const shortenerBtn = page.locator('text=/gplink|cuty|link|download/i').first();
        
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

        for (let i = 0; i < 15; i++) { 
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
