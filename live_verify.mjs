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

    console.log("Setting local storage state to bypass onboarding...");
    await page.evaluate(() => {
        localStorage.setItem("lumina_onboarding_complete", "true");
        localStorage.setItem("lumina_has_seen_tour", "true");
        localStorage.setItem("lumina_active_tab", "generator");
        localStorage.setItem("lumina_last_jd", "Senior React Developer focusing on high performance frontend systems and complex UI.");
        localStorage.setItem("lumina_last_jd_analysis", JSON.stringify({ title: "Senior React Developer", skills: ["React", "Performance"] }));
    });
    
    await page.reload({ waitUntil: 'networkidle2' });
    
    console.log("Clicking Synthesize button...");
    await page.waitForSelector("button");
    await new Promise(r => setTimeout(r, 5000));
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
        await page.screenshot({ path: "debug.png", fullPage: true });
        console.log("Saved debug.png");
    } else {
        console.log("Waiting 40s for production AI generation to complete...");
        await new Promise(r => setTimeout(r, 40000));
        
        console.log("Taking screenshot...");
        await page.screenshot({ path: 'C:/Users/shara/.gemini/antigravity/brain/c57c7059-37fc-4ba1-8264-de2ebab5fd70/live_proof.png', fullPage: true });
        console.log("Screenshot saved at live_proof.png");
    }
    
    await browser.close();
    process.exit(0);
})();
