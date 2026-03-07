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
        // 1️⃣ SEARCH & FIND MAIN ANIME PAGE
        // ==========================================
        const searchQuery = encodeURIComponent(animeName);
        const searchUrl = `https://www.tpxsub.com/?s=${searchQuery}`;
        logger.info(`🔍 Searching TPX for Main Post: ${animeName}`);
        
        await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
        
        const targetPostUrl = await page.evaluate(({ anime }) => {
            const links = Array.from(document.querySelectorAll('h2 a, h3 a, .post-title a, article a'));
            const match = links.find(a => {
                const txt = (a.innerText || "").toLowerCase();
                const href = (a.href || "").toLowerCase();
                const nameParts = anime.toLowerCase().split(' ').filter(p => p.length > 3);
                if(nameParts.length === 0) nameParts.push(anime.toLowerCase());

                const matchesName = nameParts.every(part => txt.includes(part) || href.includes(part));
                // Ignore categories/tags, we want the actual post
                return matchesName && !href.includes('/category/') && !href.includes('/tag/') && !href.includes('?s=');
            });
            return match ? match.href : null;
        }, { anime: animeName });

        if (!targetPostUrl) throw new Error(`❌ Search Failed: TPX par "${animeName}" ki main post nahi mili!`);

        logger.info(`🎯 Main Post Found: ${targetPostUrl}`);
        await page.goto(targetPostUrl, { waitUntil: 'load', timeout: 60000 });
        await page.waitForTimeout(3000); 

        // ==========================================
        // 2️⃣ DOM PARSER: FIND EPISODE -> FHD -> SERVER LINK
        // ==========================================
        logger.info(`🔍 Extracting server link for Episode ${episodeNumber} (FHD)...`);
        
        const serverLinkUrl = await page.evaluate(({ ep }) => {
            const epStr1 = `Episode ${ep.toString().padStart(2, '0')}`; // "Episode 01"
            const epStr2 = `Episode ${ep}`; // "Episode 1"
            const elements = Array.from(document.querySelectorAll('p, div, li, tr'));

            let foundEp = false;
            let targetLink = null;

            for (let el of elements) {
                const text = (el.innerText || '').trim();
                
                // Skip massive container divs to avoid false positives
                if (text.length > 1500) continue;

                if (!foundEp) {
                    // Check if we reached our target episode heading
                    if (new RegExp(`^Episode\\s*0?${ep}\\b`, 'i').test(text) || text.includes(epStr1) || text.includes(epStr2)) {
                        foundEp = true;
                    }
                    continue;
                }

                // If we reach the NEXT episode heading, stop looking!
                if (new RegExp(`^Episode\\s*\\d+`, 'i').test(text) && !text.includes(epStr1) && !text.includes(epStr2)) {
                    break; 
                }

                // We are inside the correct episode block. Look for FHD/1080p line.
                if (/FHD|1080p/i.test(text)) {
                    const links = Array.from(el.querySelectorAll('a'));
                    // Find Mir, PL1, Mega, or Theta link
                    const srv = links.find(a => /Mir|PL1|Mega|Theta/i.test(a.innerText || ''));
                    if (srv) {
                        targetLink = srv.href;
                        break;
                    }
                }
            }
            return targetLink;
        }, { ep: episodeNumber });

        if (!serverLinkUrl) {
            throw new Error(`❌ Episode ${episodeNumber} ka FHD link list mein nahi mila!`);
        }

        logger.info(`🔗 Extracted Server Link: ${serverLinkUrl}`);

        // ==========================================
        // 3️⃣ GOTO SHORTENER & BYPASS
        // ==========================================
        logger.info(`🚀 Navigating to Redirector/Shortener...`);
        await page.goto(serverLinkUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForTimeout(3000);

        // Find "Skip Ads and Enjoy" or "Skip Ad v2 (GPLinks)" as seen in your screenshot
        logger.info('🔍 Shortener (Skip Ad/GPLink/Cuty) dhoondh rahe hain...');
        const shortenerBtn = page.locator('text=/Skip Ad|GPLink|Cuty|Download/i').first();
        
        let newPage = page;
        if (await shortenerBtn.isVisible({ timeout: 5000 })) {
            logger.info(`🖱️ Shortener Clicked: ${await shortenerBtn.innerText()}`);
            const pagePromise = context.waitForEvent('page').catch(() => null);
            await shortenerBtn.click({ force: true });
            
            const openedPage = await pagePromise;
            if (openedPage) newPage = openedPage;
        } else {
            logger.warn('⚠️ Skip Ad button nahi mila. Shayad direct URL pe aa gaye hain.');
        }

        // 4️⃣ THE GAUNTLET (Bypass loop)
        logger.info('🚀 Bypass Engine Start...');
        if (newPage !== page) {
            newPage.on('response', sniffResponse);
            await newPage.waitForLoadState('domcontentloaded').catch(()=>{});
        }

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
            } catch (e) {}
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
