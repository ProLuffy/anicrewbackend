exports.resolveMirrored = async (page) => {
  try {
    // 1. Parse the table for PixelDrain (Preferred) or MediaFire
    const targetUrl = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('tr'));
      const pixelDrain = rows.find(r => r.innerText.includes('PixelDrain'));
      const mediaFire = rows.find(r => r.innerText.includes('MediaFire'));
      
      const target = pixelDrain || mediaFire;
      return target ? target.querySelector('a').href : null;
    });

    if (!targetUrl) throw new Error("Mirrored: No suitable host found (PixelDrain/MediaFire)");

    // 2. Go to intermediate page
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });

    // 3. Click the "Visit Link" / Download button
    const clickBtn = page.locator('.btn-download, a.btn').first();
    await clickBtn.waitFor({ state: 'visible', timeout: 5000 });
    
    // Do NOT wait for popup. Handle both popup and redirect.
    await clickBtn.click({ force: true });

    await page.waitForTimeout(3000); // Brief settle

    // Check if we are already at PixelDrain/MediaFire in the SAME tab
    const currentUrl = page.url();
    if (currentUrl.includes('pixeldrain') || currentUrl.includes('mediafire')) {
        return currentUrl;
    }

    // If it opened a NEW tab
    const pages = page.context().pages();
    const popup = pages[pages.length - 1];
    
    if (popup && popup !== page) {
        await popup.waitForLoadState('domcontentloaded');
        return popup.url();
    }

    // Fallback: wait for URL change in current tab
    await page.waitForURL(/pixeldrain|mediafire/, { timeout: 15000 }).catch(()=>{});
    return page.url();

  } catch (e) {
    throw new Error(`Mirrored Resolver Failed: ${e.message}`);
  }
};
