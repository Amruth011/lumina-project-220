const puppeteer = require('puppeteer');

(async () => {
  try {
    console.log("Launching fresh Chrome instance...");
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 1200 });
    
    console.log("Navigating to test resume route...");
    await page.goto('http://localhost:8080/test-resume', { waitUntil: 'networkidle0' });
    
    console.log("Waiting for .font-serif or specific text...");
    // Wait until at least the resume text or a specific class is rendered
    await page.waitForSelector('.font-serif', { timeout: 15000 }).catch(() => console.log("Timeout waiting for font-serif, trying anyway..."));
    
    await new Promise(r => setTimeout(r, 2000));
    
    const screenshotPath = 'C:\\Users\\shara\\.gemini\\antigravity\\brain\\e5aafd7a-855b-4ced-b9a7-1a03361f533e\\resume_fixed_real.png';
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log("Screenshot saved to: " + screenshotPath);
    
    await browser.close();
  } catch (err) {
    console.error(err);
  }
})();
