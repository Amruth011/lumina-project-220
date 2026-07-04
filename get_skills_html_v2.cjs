const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

(async () => {
  console.log("Launching headless browser...");
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  await page.setViewport({ width: 1440, height: 1200 });
  const baseDir = 'C:\\Users\\shara\\.gemini\\antigravity\\brain\\6f51328e-c30c-4d7b-9474-7ea5c294c410\\';

  // Inject localStorage keys to bypass onboarding
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('lumina_onboarding_complete', 'true');
    localStorage.setItem('lumina_dashboard_tour_complete', 'true');
    localStorage.setItem('lumina_pro', 'true');
  });

  try {
    console.log("1. Navigating to Auth...");
    await page.goto('https://lumina-project-220-main.vercel.app/auth', { waitUntil: 'networkidle2' });
    
    console.log("2. Signing in...");
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
    await new Promise(r => setTimeout(r, 6000));

    console.log("Clicking + DECODE NEW JD button...");
    await page.waitForSelector('button.bg-lumina-teal', { timeout: 15000 });
    await page.click('button.bg-lumina-teal');
    
    console.log("Waiting for Decoder...");
    await new Promise(r => setTimeout(r, 3000));

    console.log("3. Entering Job Description...");
    await page.waitForSelector('textarea', { timeout: 15000 });
    const jdText = `AI Intern - IT. Looking for an AI intern to assist in training, testing, and evaluating ML/DL models. Clean and preprocess datasets using NumPy, Pandas, Scikit-learn, TensorFlow, or PyTorch. Collaborate with data and engineering teams.`;
    await page.type('textarea', jdText);
    await new Promise(r => setTimeout(r, 1000));
    
    console.log("Clicking Decode button...");
    await page.click('button.bg-lumina-teal');
    
    console.log("Waiting for JD Decoding...");
    await new Promise(r => setTimeout(r, 16000));

    console.log("4. Switching to Generator Tab...");
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent("switch-tab", { detail: "generator" }));
    });
    
    console.log("Waiting for Generator tab...");
    await new Promise(r => setTimeout(r, 4000));

    console.log("5. Clicking Open Detailed Options...");
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Open Detailed Synthesis Options'));
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 3000));

    console.log("6. Clicking Generate Blueprint...");
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Generate Blueprint') || b.textContent.includes('Tailor Resume'));
      if (btn) btn.click();
    });

    console.log("Waiting for Resume Generation...");
    await new Promise(r => setTimeout(r, 38000));

    console.log("Taking validation screenshot...");
    await page.screenshot({ path: path.join(baseDir, 'inspect_generator.png') });

    console.log("Extracting HTML of preview container...");
    const previewData = await page.evaluate(() => {
      // Find the element containing "space-y-24" or scroll to it
      const el = document.querySelector('div[class*="space-y-24"]');
      if (el) {
        return el.outerHTML;
      }
      return document.body.innerHTML;
    });

    fs.writeFileSync(path.join(baseDir, 'preview_html.txt'), previewData);
    console.log("SUCCESS: HTML saved to preview_html.txt");
  } catch (err) {
    console.error("Error during execution:", err);
  } finally {
    await browser.close();
  }
})();
