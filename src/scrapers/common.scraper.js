const { chromium } = require('playwright-extra');
const stealthPlugin = require('puppeteer-extra-plugin-stealth');

// 🕵️ Stealth Plugin lagaya taaki website block na kare
chromium.use(stealthPlugin());

async function launchBrowser() {
    return await chromium.launch({
        headless: true, // 🚨 VPS ke liye strictly TRUE
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu',
            '--disable-software-rasterizer',
            '--window-size=1920,1080',
            '--disable-blink-features=AutomationControlled'
        ]
    });
}

module.exports = { launchBrowser };
