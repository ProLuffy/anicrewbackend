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
    await page.goto(targetUrl);

    // 3. Click the "Visit Link" / Download button
    const clickBtn = await page.waitForSelector('.btn-download, a.btn', { timeout: 5000 });
    
    // FIX: Do NOT wait for popup. Handle both popup and redirect.
    await clickBtn.click();

    // Race condition: Either we redirected, or a new tab opened, or we are at final URL
    await page.waitForTimeout(2000); // Brief settle

    // Check if we are already at PixelDrain/MediaFire
    if (page.url().includes('pixeldrain') || page.url().includes('mediafire')) {
        return page.url();
    }

    // If it opened a tab (sometimes configured this way)
    const pages = page.context().pages();
    const popup = pages[pages.length - 1];
    
    if (popup && popup !== page) {
        await popup.waitForLoadState();
        return popup.url();
    }

    // Fallback: wait for URL change in current tab
    await page.waitForURL(/pixeldrain|mediafire/, { timeout: 15000 });
    return page.url();

  } catch (e) {
    throw new Error(`Mirrored Resolver Failed: ${e.message}`);
  }
};
