const { chromium } = require('playwright-extra');
const stealthPlugin = require('puppeteer-extra-plugin-stealth');

// Stealth plugin takki website block na kare
chromium.use(stealthPlugin());

async function launchBrowser() {
    return await chromium.launch({
        headless: true, // 🚨 THE FIX: VPS ke liye yeh 'true' hona zaroori hai!
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu',
            '--disable-software-rasterizer',
            '--window-size=1920,1080'
        ]
    });
}

module.exports = { launchBrowser };
