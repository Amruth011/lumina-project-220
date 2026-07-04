const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

(async () => {
  console.log("Launching headless browser...");
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  await page.setViewport({ width: 1440, height: 1080 });
  const baseDir = 'C:\\Users\\shara\\.gemini\\antigravity\\brain\\6f51328e-c30c-4d7b-9474-7ea5c294c410\\';

  try {
    console.log("1. Navigating to Auth page...");
    await page.goto('https://lumina-project-220-main.vercel.app/auth', { waitUntil: 'networkidle2' });
    await page.screenshot({ path: path.join(baseDir, 'auth_step1_loaded.png') });
    
    console.log("2. Clicking Continue with Email...");
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Continue with Email'));
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(baseDir, 'auth_step2_email_form.png') });
    
    console.log("3. Typing credentials...");
    await page.type('input[type="email"]', 'tester.lumina@gmail.com');
    await page.type('input[type="password"]', 'TestPassword123!');
    await page.screenshot({ path: path.join(baseDir, 'auth_step3_typed.png') });
    
    console.log("4. Clicking Sign In...");
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Sign In to Lumina'));
      if (btn) btn.click();
    });
    
    await new Promise(r => setTimeout(r, 8000)); // wait 8s for sign-in process
    await page.screenshot({ path: path.join(baseDir, 'auth_step4_after_signin.png') });
    
    console.log("Checking current URL:", page.url());
    
    console.log("5. Waiting for textarea...");
    await page.waitForSelector('textarea', { timeout: 10000 });
    await page.screenshot({ path: path.join(baseDir, 'auth_step5_dashboard.png') });
    
    console.log("SUCCESS");
  } catch (err) {
    console.error("Puppeteer debugging failed:", err);
    await page.screenshot({ path: path.join(baseDir, 'auth_failed_error.png') });
  } finally {
    await browser.close();
  }
})();
