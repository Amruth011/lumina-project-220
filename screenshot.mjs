import puppeteer from 'puppeteer';

(async () => {
  try {
    const browser = await puppeteer.launch({ 
      headless: 'new',
      defaultViewport: { width: 1440, height: 1080 }
    });
    const page = await browser.newPage();
    
    console.log("Navigating to auth...");
    await page.goto('http://localhost:8080/auth', { waitUntil: 'networkidle2' });
    
    // Switch to email mode
    const buttons = await page.$$('button');
    for (const btn of buttons) {
        const text = await page.evaluate(el => el.innerText, btn);
        if (text.includes('Email')) {
            await btn.click();
            break;
        }
    }
    
    await page.waitForSelector('input[type="email"]');
    await page.type('input[type="email"]', 'amruth.kumar.portfolio@gmail.com');
    await page.type('input[type="password"]', 'Amruth@01');
    
    const loginBtns = await page.$$('button');
    for (const btn of loginBtns) {
        const text = await page.evaluate(el => el.innerText, btn);
        if (text.includes('Sign In to Lumina')) {
            await btn.click();
            break;
        }
    }
    
    console.log("Waiting for dashboard...");
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });
    
    console.log("Going to tailor-resume...");
    await page.goto('http://localhost:8080/tailor-resume', { waitUntil: 'networkidle2' });
    
    console.log("Waiting for resume generation page...");
    await page.waitForSelector('button'); 
    
    // Click Synthesize
    const synthBtns = await page.$$('button');
    let clicked = false;
    for (const btn of synthBtns) {
        const text = await page.evaluate(el => el.innerText, btn);
        if (text.includes('Synthesize Resume')) {
            console.log("Clicking Synthesize Resume!");
            await btn.click();
            clicked = true;
            break;
        }
    }
    
    if (!clicked) {
        console.log("Could not find synthesize button. Taking error screenshot.");
        await page.screenshot({ path: 'C:/Users/shara/.gemini/antigravity/brain/c57c7059-37fc-4ba1-8264-de2ebab5fd70/proof.png', fullPage: true });
        process.exit(1);
    }
    
    console.log("Waiting 30s for generation to finish...");
    await new Promise(r => setTimeout(r, 30000));
    
    console.log("Taking screenshot...");
    await page.screenshot({ path: 'C:/Users/shara/.gemini/antigravity/brain/c57c7059-37fc-4ba1-8264-de2ebab5fd70/proof.png', fullPage: true });
    
    await browser.close();
    console.log("Done");
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
