import puppeteer from 'puppeteer';

(async () => {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.toString(), err.stack));

  console.log('Navigating to live app...');
  await page.goto('https://lumina-jd-scanner-main.vercel.app/dashboard', { waitUntil: 'networkidle0' }).catch(console.error);
  
  await browser.close();
  console.log('Done.');
})();
