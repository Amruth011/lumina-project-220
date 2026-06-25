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
    await new Promise(r => setTimeout(r, 2000));

    console.log("Looking for login buttons...");
    // Let's print all buttons to see what we have
    const buttons = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('button')).map(b => ({
            text: b.innerText,
            type: b.type,
            className: b.className
        }));
    });
    console.log("Buttons found:", buttons);

    // Try clicking the email button
    await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const emailBtn = btns.find(b => b.innerText && b.innerText.includes('Email & Password'));
        if (emailBtn) emailBtn.click();
    });

    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: "C:/Users/shara/.gemini/antigravity/brain/c57c7059-37fc-4ba1-8264-de2ebab5fd70/debug1.png" });

    const inputs = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('input')).map(i => ({
            type: i.type,
            placeholder: i.placeholder,
            name: i.name
        }));
    });
    console.log("Inputs found:", inputs);

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
    await page.screenshot({ path: "C:/Users/shara/.gemini/antigravity/brain/c57c7059-37fc-4ba1-8264-de2ebab5fd70/debug2.png" });

    console.log("Clicking Sign In...");
    await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const signInBtn = btns.find(b => b.innerText && b.innerText.trim() === 'Sign In');
        if (signInBtn) signInBtn.click();
        else {
             // Try submit button
             const submitBtn = btns.find(b => b.type === 'submit');
             if(submitBtn) submitBtn.click();
        }
    });

    console.log("Waiting for login to complete...");
    await new Promise(r => setTimeout(r, 10000));
    await page.screenshot({ path: "C:/Users/shara/.gemini/antigravity/brain/c57c7059-37fc-4ba1-8264-de2ebab5fd70/debug3.png" });

    await browser.close();
    process.exit(0);
})();
