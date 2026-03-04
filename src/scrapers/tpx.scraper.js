const { launchBrowser } = require('./common.scraper');
const logger = require('../utils/logger');

const getTPXVideo = async (animeName, episodeNumber, season = 1) => {
    let browser = null;
    try {
        browser = await launchBrowser();
        const context = await browser.newContext({
            viewport: { width: 1920, height: 1080 },
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            bypassCSP: true // Security bypass karne ke liye
        });
        
        const page = await context.newPage();
        let videoUrl = null;

        // 🕵️ MASTER NETWORK SNIFFER (Sab kuch pakdega)
        const sniffResponse = async (response) => {
            const url = response.url();
            // Agar m3u8 ya mp4 mila aur wo ad nahi hai
            if ((url.includes('.m3u8') || url.includes('.mp4')) && !url.includes('ad') && !url.includes('tracking')) {
                if (url.includes('master') || url.includes('index') || url.includes('1080') || url.includes('720')) {
                    if (!videoUrl) {
                        videoUrl = url;
                        logger.info(`✅ JACKPOT! Final Media Link Found: ${videoUrl}`);
                    }
                } else if (!videoUrl) {
                    videoUrl = url; // Backup link
                }
            }
        };

        // Current page pe network sniff karo
        page.on('response', sniffResponse);

        // 🚨 ANTI-SHORTENER ENGINE: Agar shortener naye tabs (Popups) kholta hai, toh unhe bhi sniff karo!
        context.on('page', async (newPage) => {
            logger.info('⚠️ Shortener ne Naya Tab/Popup khola! Usey bhi sniff kar rahe hain...');
            newPage.on('response', sniffResponse);
        });

        // Slug banayein
        let slug = animeName.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
        if (slug === 'solo-leveling') slug = 'ore-dake-level-up-na-ken';

        const episodeUrl = `https://www.tpxsub.com/watch/${slug}-season-${season}-episode-${episodeNumber}`;
        logger.info(`🎯 Target TPX Website: ${episodeUrl}`);

        await page.goto(episodeUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

        logger.info('⏳ Checking main player first...');
        await page.waitForTimeout(5000); 

        // Agar bina shortener ke seedha player chal gaya
        if (videoUrl) return { hasHardSub: true, url: videoUrl };

        // ----------------------------------------------------------------
        // 🚀 SHORTENER BYPASS MISSION START
        // ----------------------------------------------------------------
        logger.info('⚠️ Player se link nahi mila. Shortener (links.tpxsub) dhoondh rahe hain...');
        
        // Page mein saare <a> tags scan karo aur links.tpxsub.com wala nikaalo
        const shortenerLink = await page.evaluate(() => {
            const links = Array.from(document.querySelectorAll('a'));
            const target = links.find(a => a.href && a.href.includes('links.tpxsub.com'));
            return target ? target.href : null;
        });

        if (shortenerLink) {
            logger.info(`🔗 Shortener Link Mil Gaya: ${shortenerLink}`);
            logger.info(`🚀 Ghus rahe hain shortener ke andar... Wait karo!`);
            
            // Shortener link par jao
            await page.goto(shortenerLink, { waitUntil: 'domcontentloaded', timeout: 60000 });
            
            // Shorteners timer lagate hain (jaise 10-15 seconds), isliye wait karna padega
            logger.info('⏳ Waiting for Shortener countdown/redirects (20 seconds)...');
            await page.waitForTimeout(20000); 

            // Agar redirect ke baad link mil gaya
            if (videoUrl) {
                return { hasHardSub: true, url: videoUrl };
            }
        } else {
            logger.warn('❌ Is page par koi shortener link hi nahi mila!');
        }

        if (!videoUrl) {
            throw new Error('❌ Shortener Bypass fail ho gaya. Shayad wahan Captcha ("I am not a robot") laga hua hai!');
        }

        return { hasHardSub: true, url: videoUrl };

    } catch (err) {
        logger.error(`❌ TPX Scraper Error: ${err.message}`);
        return { hasHardSub: false, url: null, error: err.message };
    } finally {
        if (browser) await browser.close();
    }
};

module.exports = { getTPXVideo };
