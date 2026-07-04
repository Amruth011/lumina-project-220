const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  console.log("Launching headless browser...");
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  await page.setViewport({ width: 1440, height: 1080 });
  const screenshotPath = 'C:\\Users\\shara\\.gemini\\antigravity\\brain\\6f51328e-c30c-4d7b-9474-7ea5c294c410\\resume_screenshot.png';

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
    await page.waitForSelector('textarea', { timeout: 30000 });
    await new Promise(r => setTimeout(r, 4000));

    console.log("3. Entering Job Description...");
    const jdText = `AI Intern - IT. Looking for an AI intern to assist in training, testing, and evaluating ML/DL models. Clean and preprocess datasets using NumPy, Pandas, Scikit-learn, TensorFlow, or PyTorch. Collaborate with data and engineering teams.`;
    await page.type('textarea', jdText);
    await new Promise(r => setTimeout(r, 1000));
    
    console.log("Clicking Decode Your First JD button...");
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Decode'));
      if (btn) btn.click();
    });
    
    console.log("Waiting for JD Decoding to complete...");
    await new Promise(r => setTimeout(r, 15000));

    console.log("4. Switching to Generator Tab...");
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('button, a, span'));
      const generatorTab = tabs.find(el => el.textContent.includes('Generator'));
      if (generatorTab) generatorTab.click();
    });
    await new Promise(r => setTimeout(r, 4000));

    console.log("5. Clicking Generate Blueprint...");
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Generate Blueprint'));
      if (btn) btn.click();
    });

    console.log("Waiting for Resume Generation (35 seconds)...");
    await new Promise(r => setTimeout(r, 35000));

    console.log("Taking screenshot of the tailored resume preview...");
    await page.screenshot({ path: screenshotPath, fullPage: false });
    
    console.log("SUCCESS: Screenshot saved to", screenshotPath);
  } catch (err) {
    console.error("Puppeteer automation failed:", err);
    // Take failure screenshot for debugging
    const errPath = 'C:\\Users\\shara\\.gemini\\antigravity\\brain\\6f51328e-c30c-4d7b-9474-7ea5c294c410\\failure_step.png';
    await page.screenshot({ path: errPath });
    console.log("Failure screenshot saved to", errPath);
  } finally {
    await browser.close();
  }
})();
