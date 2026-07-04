const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

(async () => {
  console.log("Launching headless browser...");
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  await page.setViewport({ width: 1440, height: 1080 });
  const screenshotPath = 'C:\\Users\\shara\\.gemini\\antigravity\\brain\\6f51328e-c30c-4d7b-9474-7ea5c294c410\\resume_screenshot.png';

  try {
    console.log("1. Authenticating on Vercel site...");
    await page.goto('https://lumina-project-220-main.vercel.app/auth', { waitUntil: 'networkidle2' });
    
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Continue with Email'));
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 2000));
    
    await page.type('input[type="email"]', 'tester.lumina@gmail.com');
    await page.type('input[type="password"]', 'TestPassword123!');
    
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Sign In to Lumina'));
      if (btn) btn.click();
    });
    
    console.log("Waiting for Dashboard to load...");
    await page.waitForSelector('textarea', { timeout: 30000 });
    await new Promise(r => setTimeout(r, 5000));

    console.log("3. Entering Cognite Job Description...");
    const cogniteJd = `What Cognite is: Relentless to achieve
Cognite operates at the forefront of industrial digitalization, building AI, and data solutions that solve the world’s hardest, highest-impact problems.

About the role:
Intern – L1+ Data Engineering & Production Support. Python scripting, SQL, Linux, and L1 support. Eagerness to learn production support and cloud technologies.`;

    await page.type('textarea', cogniteJd);
    
    console.log("Clicking Decode JD...");
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Decode'));
      if (btn) btn.click();
    });
    
    console.log("Waiting for JD Decoding to complete...");
    await new Promise(r => setTimeout(r, 15000));

    console.log("4. Switching to Generator Tab...");
    await page.evaluate(() => {
      const navLinks = Array.from(document.querySelectorAll('button, a, span'));
      const generatorTab = navLinks.find(el => el.textContent.includes('Generator'));
      if (generatorTab) generatorTab.click();
    });
    await new Promise(r => setTimeout(r, 5000));

    console.log("5. Clicking Generate Blueprint...");
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Generate Blueprint'));
      if (btn) btn.click();
    });

    console.log("Waiting for Resume Generation to complete (35 seconds)...");
    await new Promise(r => setTimeout(r, 35000));

    console.log("Taking screenshot of the tailored resume preview...");
    await page.screenshot({ path: screenshotPath, fullPage: false });
    
    console.log("SUCCESS: Screenshot saved to", screenshotPath);
  } catch (err) {
    console.error("Puppeteer automation failed:", err);
  } finally {
    await browser.close();
  }
})();
