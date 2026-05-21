const { chromium } = require('@playwright/test');

(async () => {
  console.log("Attempting to launch Playwright Chromium headlessly from workspace context...");
  try {
    const browser = await chromium.launch({ headless: true });
    console.log("SUCCESS: Playwright Chromium launched successfully!");
    const page = await browser.newPage();
    await page.goto("https://example.com");
    console.log("Page title:", await page.title());
    await browser.close();
  } catch (err) {
    console.error("FAILED to launch Playwright browser:", err.message);
  }
})();
