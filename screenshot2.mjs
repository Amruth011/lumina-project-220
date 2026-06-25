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
        await textareas[0].type("We are looking for a highly skilled Software Engineer with React, Node, AI experience. You must be able to use cloud technologies like AWS. Experience with LLMs and prompt engineering is a big plus.", { delay: 10 });
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
        const btns = Array.from(document.querySelectorAll('button'));
        const genBtn = btns.find(b => 
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
    
    await browser.close();
    console.log("Done");
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
