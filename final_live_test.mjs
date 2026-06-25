import puppeteer from 'puppeteer-core';

(async () => {
    console.log("Launching browser...");
    const browser = await puppeteer.launch({
        executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1080'],
        defaultViewport: { width: 1920, height: 1080 }
    });

    try {
        const page = await browser.newPage();
        // Lower timeout to 60s
        page.setDefaultNavigationTimeout(60000);
        
        console.log("Navigating to live URL...");
        await page.goto('https://lumina-project-220-main.vercel.app/dashboard', { waitUntil: 'domcontentloaded' });
        await new Promise(r => setTimeout(r, 5000));

        console.log("Looking for Continue with Email button...");
        await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const emailBtn = btns.find(b => b.textContent && b.textContent.includes('Email & Password'));
            if (emailBtn) emailBtn.click();
        });
        await new Promise(r => setTimeout(r, 3000));

        console.log("Entering credentials...");
        await page.evaluate(() => {
            const inputs = Array.from(document.querySelectorAll('input'));
            const emailInput = inputs.find(i => i.type === 'email' || (i.placeholder && i.placeholder.toLowerCase().includes('email')));
            const passInput = inputs.find(i => i.type === 'password' || (i.placeholder && i.placeholder.toLowerCase().includes('password')));
            
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
            const signInBtn = btns.find(b => b.textContent && b.textContent.includes('Sign In'));
            if (signInBtn) signInBtn.click();
        });

        console.log("Waiting for login to process...");
        await new Promise(r => setTimeout(r, 15000));
        
        // Take proof of login
        await page.screenshot({ path: "C:/Users/shara/.gemini/antigravity/brain/c57c7059-37fc-4ba1-8264-de2ebab5fd70/live_login_success.png" });

        console.log("Forcing Generator Tab...");
        await page.evaluate(() => {
            localStorage.setItem("lumina_active_tab", "generator");
        });
        await page.reload({ waitUntil: 'domcontentloaded' });
        await new Promise(r => setTimeout(r, 5000));

        console.log("Clicking Synthesize...");
        const clicked = await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const btn = btns.find(b => b.textContent && b.textContent.includes('Synthesize'));
            if(btn) { btn.click(); return true; }
            return false;
        });

        if (clicked) {
            console.log("Waiting 40s for AI to synthesize on production...");
            await new Promise(r => setTimeout(r, 40000));
            await page.screenshot({ path: "C:/Users/shara/.gemini/antigravity/brain/c57c7059-37fc-4ba1-8264-de2ebab5fd70/live_final_proof.png", fullPage: true });
            console.log("SUCCESS! Saved final proof.");
        } else {
            console.error("Failed to find Synthesize button.");
            await page.screenshot({ path: "C:/Users/shara/.gemini/antigravity/brain/c57c7059-37fc-4ba1-8264-de2ebab5fd70/live_error_synthesize.png", fullPage: true });
        }
        
    } catch (e) {
        console.error("Script failed:", e);
    } finally {
        await browser.close();
        process.exit(0);
    }
})();
