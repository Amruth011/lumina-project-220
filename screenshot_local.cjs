const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 1024 });

  console.log('Setting localStorage to bypass onboarding...');
  // Go to empty page on localhost first to set localStorage
  await page.goto('http://localhost:8080');
  await page.evaluate(() => {
    localStorage.setItem('lumina_onboarding_complete', 'true');
    localStorage.setItem('lumina_tooltip_tour_complete', 'true');
  });

  console.log('Navigating to dashboard...');
  await page.goto('http://localhost:8080/dashboard', { waitUntil: 'load', timeout: 60000 });
  
  await new Promise(r => setTimeout(r, 2000));

  console.log('Switching to generate tab...');
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('switch-tab', { detail: 'generate' }));
  });

  await new Promise(r => setTimeout(r, 2000));
  
  console.log('Taking setting screenshot...');
  // Take screenshot of the settings panel
  await page.screenshot({ path: 'C:/Users/shara/.gemini/antigravity/brain/c57c7059-37fc-4ba1-8264-de2ebab5fd70/setting.png' });
  
  console.log('Taking full screenshot...');
  await page.screenshot({ path: 'C:/Users/shara/.gemini/antigravity/brain/c57c7059-37fc-4ba1-8264-de2ebab5fd70/full.png' });
  
  await browser.close();
  console.log('Done.');
})();
