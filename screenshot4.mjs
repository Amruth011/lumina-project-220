import puppeteer from 'puppeteer-core';
import { spawn } from 'child_process';

const server = spawn('npm.cmd', ['run', 'dev'], { 
    cwd: 'd:/personal files/Projects/lumina-project-220-main/lumina-project-220-main',
    stdio: 'pipe',
    shell: true
});

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
    const started = await waitForServer();
    if (!started) process.exit(1);

    const browser = await puppeteer.launch({
        executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1080'],
        defaultViewport: { width: 1920, height: 1080 }
    });

    const page = await browser.newPage();
    await page.goto('http://localhost:8080/dashboard', { waitUntil: 'networkidle2' });

    await page.evaluate(() => {
        localStorage.setItem("lumina_onboarding_complete", "true");
        localStorage.setItem("lumina_has_seen_tour", "true");
        localStorage.setItem("lumina_active_tab", "generator");
        localStorage.setItem("lumina_last_jd", "Software Engineer role requiring React and Node.");
        localStorage.setItem("lumina_last_jd_analysis", JSON.stringify({ title: "Software Engineer", skills: ["React", "Node"] }));
        localStorage.setItem("lumina_last_results", JSON.stringify({ title: "Software Engineer", skills: ["React", "Node"] }));
    });
    
    console.log("On dashboard, setting tab to generator...");
    await page.evaluate(() => localStorage.setItem("lumina_active_tab", "generator"));
    await page.reload({ waitUntil: 'networkidle2' });
    
    console.log("Clicking Synthesize button...");
    await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const btn = btns.find(b => b.textContent.includes('Synthesize'));
        if(btn) btn.click();
    });
    console.log("Waiting 30s for generation to complete...");
    await new Promise(r => setTimeout(r, 30000));
    
    console.log("Taking screenshot...");
    await page.screenshot({ path: 'C:/Users/shara/.gemini/antigravity/brain/c57c7059-37fc-4ba1-8264-de2ebab5fd70/proof.png', fullPage: true });
    
    await browser.close();
    server.kill();
    process.exit(0);
})();
