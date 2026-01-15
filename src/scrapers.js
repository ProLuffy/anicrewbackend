const { launchBrowser } = require('./services');
const axios = require('axios');

// Teri Custom API (Env se aayegi)
const API_BASE = process.env.HIANIME_API_URL; // e.g., https://hianimeapi-1vww.onrender.com

// 1. TPX Scraper (Hindi Subbed Video - Browser Based)
const scrapeTPX = async (url) => {
    console.log(`🕵️ TPX Scan: ${url}`);
    const browser = await launchBrowser();
    const page = await browser.newPage();
    let streamUrl = null;

    try {
        // Network Traffic Sniffer
        page.on('response', res => {
            const u = res.url();
            // Hum .m3u8 ya .mp4 dhoondh rahe hain
            if ((u.includes('.m3u8') || u.includes('.mp4')) && !streamUrl) {
                // Priority: 1080p, else fallback
                if (u.includes('1080')) streamUrl = u;
                else streamUrl = u;
            }
        });

        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        
        // Handle "Download/Watch" buttons if present
        try { 
            const btn = await page.waitForSelector('.download-btn, .watch-btn, a[href*="dood"]', { timeout: 3000 });
            if(btn) await btn.click();
        } catch (e) {}
        
        // Thoda wait taaki network request capture ho jaye
        await page.waitForTimeout(5000); 

    } catch (e) { 
        console.error(`TPX Error: ${e.message}`); 
    } finally { 
        await browser.close(); 
    }
    return streamUrl;
};

// 2. HiAnime Scraper (SMART API - FULL AUTOMATION ⚡)
// Browser ki zarurat nahi, ye direct API se link nikaalega
const scrapeHiAnime = async (animeName, episodeNumber) => {
    console.log(`📡 Smart API Search: ${animeName} Ep ${episodeNumber}`);
    
    try {
        // Step 1: Search Anime ID
        // Note: API might be case sensitive or require precise names
        const searchRes = await axios.get(`${API_BASE}/hianime/search?q=${encodeURIComponent(animeName)}`);
        const animeList = searchRes.data?.data?.animes || searchRes.data?.animes;
        
        if (!animeList || animeList.length === 0) throw new Error("Anime Not Found in API");
        
        const anime = animeList[0]; // Best Match uthaya
        const animeId =
