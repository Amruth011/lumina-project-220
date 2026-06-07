const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

(async () => {
  console.log("Launching headless browser...");
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  await page.setViewport({ width: 1440, height: 1080 });
  const dirPath = 'C:\\Users\\shara\\.gemini\\antigravity\\brain\\5737790f-5a53-4d0c-ac13-bb1b3571e926';
  if (!fs.existsSync(dirPath)){ fs.mkdirSync(dirPath, { recursive: true }); }
  const screenshotPath = path.join(dirPath, 'resume_proof.png');

  try {
    console.log("1. Authenticating...");
    await page.goto('https://lumina-jd-scanner.vercel.app/auth', { waitUntil: 'networkidle2' });
    
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Continue with Email'));
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 1000));
    
    await page.type('input[type="email"]', 'tester.lumina@gmail.com');
    await page.type('input[type="password"]', 'TestPassword123!');
    
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Sign In to Lumina'));
      if (btn) btn.click();
    });
    
    console.log("Waiting for Dashboard to load...");
    await page.waitForSelector('textarea', { timeout: 15000 });
    await new Promise(r => setTimeout(r, 3000));

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
    await new Promise(r => setTimeout(r, 12000));

    console.log("4. Switching to Generator Tab...");
    await page.evaluate(() => {
      // Find the "Generator" tab in the navbar and click it
      const navLinks = Array.from(document.querySelectorAll('button, a, span'));
      const generatorTab = navLinks.find(el => el.textContent.includes('Generator'));
      if (generatorTab) generatorTab.click();
    });
    await new Promise(r => setTimeout(r, 2000));

    console.log("5. Clicking Generate Blueprint...");
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Generate Blueprint'));
      if (btn) btn.click();
    });

    console.log("Waiting for Resume Generation to complete (30 seconds)...");
    await new Promise(r => setTimeout(r, 32000));

    console.log("Taking screenshot of the tailored resume preview...");
    await page.screenshot({ path: screenshotPath, fullPage: false });
    
    console.log("SUCCESS: Screenshot saved to", screenshotPath);
  } catch (err) {
    console.error("Puppeteer automation failed:", err);
  } finally {
    await browser.close();
  }
})();
