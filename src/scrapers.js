const { launchBrowser } = require('./services');

// 1. TPX (Hindi Subbed Video)
const scrapeTPX = async (url) => {
    console.log(`🕵️ TPX Scan: ${url}`);
    const browser = await launchBrowser();
    const page = await browser.newPage();
    let streamUrl = null;

    try {
        page.on('response', res => {
            const u = res.url();
            if ((u.includes('.m3u8') || u.includes('.mp4')) && !streamUrl) {
                if (u.includes('1080')) streamUrl = u; // Jackpot
                else streamUrl = u;
            }
        });
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        
        // Handle TPX buttons
        try { 
            const btn = await page.waitForSelector('.download-btn, .watch-btn', { timeout: 3000 });
            if(btn) await btn.click();
        } catch (e) {}
        
        await page.waitForTimeout(5000); 
    } catch (e) { console.error(`TPX Error: ${e.message}`); } 
    finally { await browser.close(); }
    return streamUrl;
};

// 2. HiAnime (Clean Video)
const scrapeHiAnime = async (url) => {
    console.log(`🕵️ HiAnime Scan: ${url}`);
    const browser = await launchBrowser();
    const page = await browser.newPage();
    let streamUrl = null;

    try {
        page.on('response', res => {
            const u = res.url();
            if (u.includes('.m3u8') && !streamUrl && !u.includes('google')) streamUrl = u;
        });
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForTimeout(5000); 
    } catch (e) { console.error(`HiAnime Error: ${e.message}`); } 
    finally { await browser.close(); }
    return streamUrl;
};

// 3. DesiDub (Audio Only)
const scrapeDesiDub = async (url) => {
    console.log(`🕵️ DesiDub Scan: ${url}`);
    const browser = await launchBrowser();
    const page = await browser.newPage();
    let audioUrl = null;

    try {
        page.on('response', res => {
            const u = res.url();
            if ((u.includes('.m3u8') || u.includes('.mp4')) && !audioUrl) audioUrl = u;
        });
        await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
        try { await page.click('.play-button', { timeout: 3000 }); } catch (e) {}
        await page.waitForTimeout(5000);
    } catch (e) { console.error(`DesiDub Error: ${e.message}`); } 
    finally { await browser.close(); }
    return audioUrl;
};

module.exports = { scrapeTPX, scrapeHiAnime, scrapeDesiDub };
