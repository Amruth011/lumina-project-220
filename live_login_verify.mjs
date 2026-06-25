import puppeteer from 'puppeteer-core';

(async () => {
    console.log("Launching browser...");
    const browser = await puppeteer.launch({
        executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1080'],
        defaultViewport: { width: 1920, height: 1080 }
    });

    const page = await browser.newPage();
    console.log("Navigating to live URL...");
    await page.goto('https://lumina-project-220-main.vercel.app/dashboard', { waitUntil: 'networkidle2' });

    console.log("Looking for login form...");
    await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const emailBtn = btns.find(b => b.textContent && b.textContent.includes('Email & Password'));
        if (emailBtn) emailBtn.click();
    });

    await new Promise(r => setTimeout(r, 2000));

    console.log("Entering credentials...");
    await page.evaluate(() => {
        const inputs = Array.from(document.querySelectorAll('input'));
        const emailInput = inputs.find(i => i.type === 'email' || i.placeholder.toLowerCase().includes('email'));
        const passInput = inputs.find(i => i.type === 'password' || i.placeholder.toLowerCase().includes('password'));
        
        if (emailInput) {
            emailInput.value = 'amruth.kumar.portfolio@gmail.com';
            emailInput.dispatchEvent(new Event('input', { bubbles: true }));
            emailInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
        if (passInput) {
            passInput.value = 'Amruth@01';
            passInput.dispatchEvent(new Event('input', { bubbles: true }));
            passInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
    });

    await new Promise(r => setTimeout(r, 1000));

    console.log("Clicking Sign In...");
    await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const signInBtn = btns.find(b => b.textContent && b.textContent === 'Sign In');
        if (signInBtn) signInBtn.click();
    });

    console.log("Waiting for login to complete...");
    await new Promise(r => setTimeout(r, 10000));
    
    // Ensure we are on generator tab
    await page.evaluate(() => {
        localStorage.setItem("lumina_onboarding_complete", "true");
        localStorage.setItem("lumina_has_seen_tour", "true");
        localStorage.setItem("lumina_active_tab", "generator");
    });
    await page.reload({ waitUntil: 'networkidle2' });

    console.log("Clicking Synthesize button...");
    await page.waitForSelector('button');
    await new Promise(r => setTimeout(r, 2000));
    const clicked = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const btn = btns.find(b => b.textContent && b.textContent.includes('Synthesize'));
        if(btn) {
            btn.click();
            return true;
        }
        return false;
    });

    if(!clicked) {
        console.error("Synthesize button not found!");
        await page.screenshot({ path: "C:/Users/shara/.gemini/antigravity/brain/c57c7059-37fc-4ba1-8264-de2ebab5fd70/error.png", fullPage: true });
    } else {
        console.log("Waiting 40s for production AI generation to complete...");
        await new Promise(r => setTimeout(r, 40000));
        
        console.log("Taking final screenshot...");
        await page.screenshot({ path: 'C:/Users/shara/.gemini/antigravity/brain/c57c7059-37fc-4ba1-8264-de2ebab5fd70/live_proof.png', fullPage: true });
        console.log("Screenshot saved at live_proof.png");
    }

    await browser.close();
    process.exit(0);
})();
