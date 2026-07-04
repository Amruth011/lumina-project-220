const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  console.log("Launching headless browser...");
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  await page.setViewport({ width: 1440, height: 1200 });
  const screenshotPath = 'C:\\Users\\shara\\.gemini\\antigravity\\brain\\6f51328e-c30c-4d7b-9474-7ea5c294c410\\resume_screenshot.png';
  const baseDir = 'C:\\Users\\shara\\.gemini\\antigravity\\brain\\6f51328e-c30c-4d7b-9474-7ea5c294c410\\';

  // Inject localStorage keys to bypass onboarding and dashboard tours completely
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('lumina_onboarding_complete', 'true');
    localStorage.setItem('lumina_dashboard_tour_complete', 'true');
    localStorage.setItem('lumina_pro', 'true'); // bypass pro paywalls
  });

  try {
    console.log("1. Navigating to Auth page...");
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
    
    console.log("Waiting for Decoder view...");
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

    console.log("4. Switching to Generator Tab via dispatchEvent...");
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent("switch-tab", { detail: "generator" }));
    });
    
    console.log("Waiting for Generator tab to mount...");
    await new Promise(r => setTimeout(r, 5000));
    await page.screenshot({ path: path.join(baseDir, 'step_generator_mounted.png') });

    console.log("5. Clicking Generate Blueprint...");
    await page.evaluate(() => {
      // Find the primary button with text Generate Blueprint
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Generate Blueprint') || b.textContent.includes('Tailor Resume'));
      if (btn) {
        btn.click();
        return "Clicked button";
      }
      return "Button not found";
    });

    console.log("Waiting for Resume Generation (38 seconds)...");
    await new Promise(r => setTimeout(r, 38000));

    console.log("Taking final screenshot of the tailored resume preview...");
    await page.screenshot({ path: screenshotPath, fullPage: false });
    
    console.log("SUCCESS: Screenshot saved to", screenshotPath);
  } catch (err) {
    console.error("Puppeteer automation failed:", err);
    await page.screenshot({ path: path.join(baseDir, 'step_failed_error.png') });
  } finally {
    await browser.close();
  }
})();
