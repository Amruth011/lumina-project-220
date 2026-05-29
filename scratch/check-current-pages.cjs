const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

(async () => {
  console.log("=== CHECKING CURRENT BROWSER PAGES ===");
  const userDataDir = path.join(__dirname, '..', '.chrome-session');
  
  if (!fs.existsSync(userDataDir)) {
    console.log("No Chrome session directory found at " + userDataDir);
    process.exit(1);
  }

  try {
    const context = await chromium.launchPersistentContext(userDataDir, {
      headless: false,
      viewport: null,
      args: ['--start-maximized'],
    });

    const pages = context.pages();
    console.log(`Number of open pages: ${pages.length}`);

    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      const url = page.url();
      const title = await page.title();
      console.log(`Page #${i}: Title: "${title}", URL: "${url}"`);
      
      const screenshotPath = path.join(__dirname, `current_page_${i}.png`);
      await page.screenshot({ path: screenshotPath });
      console.log(`Saved screenshot of Page #${i} to ${screenshotPath}`);
    }

    console.log("Closing context...");
    await context.close();
  } catch (err) {
    console.error("Error connecting to Chrome session:", err);
  }
})();
