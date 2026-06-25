import puppeteer from 'puppeteer-core';
import { spawn } from 'child_process';

const server = spawn('npm.cmd', ['run', 'dev'], { 
    cwd: 'd:/personal files/Projects/lumina-project-220-main/lumina-project-220-main',
    stdio: 'pipe',
    shell: true
});

server.stdout.on('data', data => console.log(`[Vite] ${data}`));
server.stderr.on('data', data => console.error(`[Vite Error] ${data}`));

async function waitForServer() {
    for (let i = 0; i < 30; i++) {
        try {
            const res = await fetch('http://localhost:8080');
            if (res.ok) return true;
        } catch (e) {
            await new Promise(r => setTimeout(r, 1000));
        }
    }
    return false;
}

(async () => {
    console.log("Waiting for server to start...");
    const started = await waitForServer();
    if (!started) {
        console.error("Server failed to start!");
        server.kill();
        process.exit(1);
    }
    console.log("Server is up! Launching browser...");

    const browser = await puppeteer.launch({
        executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1080'],
        defaultViewport: { width: 1920, height: 1080 }
    });

    const page = await browser.newPage();
    page.on('console', msg => console.log(`[Browser] ${msg.text()}`));

    console.log("Navigating to auth...");
    await page.goto('http://localhost:8080/dashboard', { waitUntil: 'networkidle2' });

    console.log("Waiting 3s for redirect...");
    await new Promise(r => setTimeout(r, 3000));
    
    if (page.url().includes('/auth')) {
        console.log("Checking for 'Continue with Email'...");
        const allBtns = await page.$$('button');
        for (const btn of allBtns) {
            const text = await page.evaluate(el => el.innerText, btn);
            if (text && text.includes('Email')) {
                await btn.click();
                console.log("Clicked Continue with Email");
                await new Promise(r => setTimeout(r, 1000));
                break;
            }
        }

        console.log("Typing credentials...");
        await page.waitForSelector('input[type="email"]', { timeout: 10000 });
        await page.type('input[type="email"]', 'Amruth@01', { delay: 10 });
        await page.type('input[type="password"]', 'Amruth@01', { delay: 10 });
        
        console.log("Clicking sign in...");
        const btns = await page.$$('button');
        for (const btn of btns) {
            const text = await page.evaluate(el => el.innerText, btn);
            if (text.includes('Sign In')) {
                await btn.click();
                break;
            }
        }
        console.log("Waiting for dashboard...");
        await new Promise(r => setTimeout(r, 5000));
    }

    console.log("Setting onboarding state...");
    await page.evaluate(() => {
        localStorage.setItem("lumina_onboarding_complete", "true");
        localStorage.setItem("lumina_has_seen_tour", "true");
    });
    await page.reload({ waitUntil: 'networkidle2' });

    console.log("Waiting 3s for dashboard...");
    await new Promise(r => setTimeout(r, 3000));

    console.log("Typing JD...");
    const textareas = await page.$$('textarea');
    if (textareas.length > 0) {
        await textareas[0].type("We are looking for a highly skilled Software Engineer with React, Node, AI experience. You must be able to use cloud technologies like AWS. Experience with LLMs and prompt engineering is a big plus. Strong understanding of system architecture and microservices is required.", { delay: 10 });
    }

    const decodeBtns = await page.$$('button');
    for (const btn of decodeBtns) {
        const text = await page.evaluate(el => el.innerText, btn);
        if (text.includes('Decode Job Description')) {
            await btn.click();
            break;
        }
    }

    console.log("Waiting 15 seconds for decode to finish...");
    await new Promise(r => setTimeout(r, 15000));

    console.log("Switching to generator tab...");
    const tabBtns = await page.$$('button');
    for (const btn of tabBtns) {
        const text = await page.evaluate(el => el.innerText, btn);
        if (text.includes('Resume Blueprint') || text.includes('Tailor') || text.includes('Synthesize Resume')) {
            await btn.click();
            console.log("Clicked tab button: " + text);
            break;
        }
    }

    console.log("Waiting 3s...");
    await new Promise(r => setTimeout(r, 3000));

    console.log("Looking for Generate button...");
    await page.evaluate(() => {
        const bArray = Array.from(document.querySelectorAll('button'));
        const genBtn = bArray.find(b => 
            b.innerText.includes('Generate Blueprint') || 
            b.innerText.includes('Regenerate Blueprint') ||
            b.innerText.includes('Generate') ||
            b.innerText.includes('Synthesize')
        );
        if (genBtn) {
            genBtn.click();
            console.log("Clicked generate via JS!");
        } else {
            console.log("No generate button found in JS!");
        }
    });

    console.log("Waiting 30 seconds for Generation...");
    await new Promise(r => setTimeout(r, 30000));
    
    console.log("Taking final screenshot...");
    await page.screenshot({ path: 'C:/Users/shara/.gemini/antigravity/brain/c57c7059-37fc-4ba1-8264-de2ebab5fd70/proof.png', fullPage: true });
    
    console.log("Cleaning up...");
    await browser.close();
    server.kill();
    process.exit(0);
})();
