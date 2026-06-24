const puppeteer = require('puppeteer');

async function clickByText(page, text) {
  await page.evaluate((textToFind) => {
    const btns = Array.from(document.querySelectorAll('button, a'));
    const btn = btns.find(b => b.textContent && b.textContent.toUpperCase().includes(textToFind.toUpperCase()));
    if (btn) btn.click();
  }, text);
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: "C:\\Users\\shara\\.cache\\puppeteer\\chrome\\win64-149.0.7827.22\\chrome-win64\\chrome.exe" });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 1024 });

  console.log('Navigating to auth page...');
  await page.goto('https://lumina-project-220-main.vercel.app/auth', { waitUntil: 'networkidle0' });

  console.log('Selecting email auth mode...');
  await clickByText(page, "Continue with Email");
  await new Promise(r => setTimeout(r, 1000));

  console.log('Typing credentials...');
  await page.type('input[type="email"]', 'amruth.kumar.portfolio@gmail.com');
  await page.type('input[type="password"]', 'Amruth@01');

  await clickByText(page, "Sign In to Lumina");

  console.log('Waiting for login to complete...');
  await page.waitForNavigation({ waitUntil: 'networkidle0' });
  console.log('Logged in successfully!');

  console.log('Bypassing onboarding & tours...');
  await page.evaluate(() => {
    localStorage.setItem('lumina_onboarding_complete', 'true');
    localStorage.setItem('lumina_dashboard_tour_complete', 'true');
  });
  await page.reload({ waitUntil: 'networkidle0' });

  console.log('Going to dashboard...');
  await page.goto('https://lumina-project-220-main.vercel.app/dashboard', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2000));

  console.log('Switching to decode tab...');
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('switch-tab', { detail: 'decode' }));
  });
  await new Promise(r => setTimeout(r, 2000));
  
  const jdInput = await page.$('textarea');
  if (jdInput) {
    await jdInput.type('Senior Software Engineer. Must know React, Node, and Python. Healthcare domain experience is a plus.');
    console.log('Clicking Decode JD...');
    await clickByText(page, "Decode");
    await new Promise(r => setTimeout(r, 10000));
  } else {
    console.log('Textarea not found!');
  }

  console.log('Switching to generate tab...');
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('switch-tab', { detail: 'generator' }));
  });
  await new Promise(r => setTimeout(r, 3000));

  console.log('Clicking Open Detailed Synthesis Options...');
  await clickByText(page, "Detailed Synthesis Options");
  await new Promise(r => setTimeout(r, 1000));

  console.log('Setting summary lines to 3...');
  await page.evaluate(() => {
    const input = document.querySelector('input[type="range"]');
    if (input) {
      input.value = 3;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      console.log('Range input not found!');
    }
  });

  console.log('Taking setting screenshot...');
  await page.screenshot({ path: 'C:/Users/shara/.gemini/antigravity/brain/c57c7059-37fc-4ba1-8264-de2ebab5fd70/setting.png' });

  console.log('Clicking Generate Resume...');
  await clickByText(page, "Synthesize ATS Blueprint");
  await clickByText(page, "Regenerate Blueprint"); // In case it already generated
  
  console.log('Waiting for generation...');
  await new Promise(r => setTimeout(r, 15000));

  console.log('Taking full builder screenshot...');
  // Force full page to capture scrollable areas
  await page.screenshot({ path: 'C:/Users/shara/.gemini/antigravity/brain/c57c7059-37fc-4ba1-8264-de2ebab5fd70/header.png', fullPage: true });

  await browser.close();
  console.log('All done!');
})();
