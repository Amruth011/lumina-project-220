const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

(async () => {
  console.log("Launching browser...");
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  await page.setViewport({ width: 1440, height: 900 });

  try {
    console.log("Navigating to live app...");
    await page.goto('https://lumina-jd-scanner.vercel.app/auth', { waitUntil: 'networkidle2' });

    console.log("Switching to Email Mode...");
    // Just click the button by finding its text
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.textContent.includes('Continue with Email'));
      if (btn) btn.click();
    });
    
    // Wait for animation
    await new Promise(r => setTimeout(r, 1000));

    console.log("Typing credentials...");
    await page.type('input[type="email"]', 'tester.lumina@gmail.com');
    await page.type('input[type="password"]', 'TestPassword123!');
    
    console.log("Clicking Sign In...");
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.textContent.includes('Sign In to Lumina'));
      if (btn) btn.click();
    });

    console.log("Waiting for Dashboard to load...");
    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 });
    
    await new Promise(r => setTimeout(r, 3000));

    // Make sure the artifacts directory exists
    const dirPath = path.resolve(__dirname, '../../brain/c53d48eb-ddcd-458e-9224-96986491deb3');
    if (!fs.existsSync(dirPath)){
        fs.mkdirSync(dirPath, { recursive: true });
    }

    const screenshotPath = path.join(dirPath, 'dashboard_proof.png');
    console.log("Taking screenshot...");
    await page.screenshot({ path: screenshotPath, fullPage: true });
    
    console.log("Successfully saved screenshot to:", screenshotPath);
  } catch (err) {
    console.error("Puppeteer test failed:", err);
  } finally {
    await browser.close();
  }
})();
