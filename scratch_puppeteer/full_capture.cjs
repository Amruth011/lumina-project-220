const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

(async () => {
  console.log("Launching headless browser...");
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  await page.setViewport({ width: 1440, height: 900 });
  const dirPath = path.resolve(__dirname, '../../brain/c53d48eb-ddcd-458e-9224-96986491deb3/screenshots');
  if (!fs.existsSync(dirPath)){ fs.mkdirSync(dirPath, { recursive: true }); }

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
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Sign In'));
      if (btn) btn.click();
    });
    
    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 });
    await new Promise(r => setTimeout(r, 3000));

    // 2. JD Decoding Screenshot
    console.log("2. Capturing JD Decoder...");
    await page.goto('https://lumina-jd-scanner.vercel.app/dashboard', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 2000));
    
    // Check if there is an active JD already decoded
    const hasJd = await page.evaluate(() => document.body.innerText.includes('Overall Verdict'));
    if (!hasJd) {
        // Try to decode one
        console.log("Typing JD...");
        await page.type('textarea', 'Senior AI Engineer required with 5 years Node.js and TypeScript experience. Must understand Docker, AWS, and LLMs.');
        await page.evaluate(() => {
            const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Decode'));
            if (btn) btn.click();
        });
        await new Promise(r => setTimeout(r, 20000)); // Wait for generation
    }
    await page.screenshot({ path: path.join(dirPath, '1_jd_decoded.png'), fullPage: true });

    // 3. Resume Generator Screenshot
    console.log("3. Capturing Resume Generator...");
    await page.goto('https://lumina-jd-scanner.vercel.app/dashboard?tab=resume-tailor', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 5000));
    await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Generate'));
        if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 15000));
    await page.screenshot({ path: path.join(dirPath, '2_resume_generated.png'), fullPage: true });

    // 4. Cover Letter Screenshot
    console.log("4. Capturing Cover Letter...");
    await page.goto('https://lumina-jd-scanner.vercel.app/dashboard?tab=cover-letter', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 5000));
    await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Generate'));
        if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 15000));
    await page.screenshot({ path: path.join(dirPath, '3_cover_letter.png'), fullPage: true });

    // 5. Roadmap Screenshot
    console.log("5. Capturing Roadmap...");
    await page.goto('https://lumina-jd-scanner.vercel.app/dashboard?tab=roadmap', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 5000));
    await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Generate'));
        if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 20000));
    await page.screenshot({ path: path.join(dirPath, '4_roadmap.png'), fullPage: true });

    console.log("All screenshots captured successfully.");
  } catch (err) {
    console.error("Puppeteer automation failed:", err);
  } finally {
    await browser.close();
  }
})();
