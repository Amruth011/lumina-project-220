import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  let targetUrl = null;
  
  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('Dashboard') && url.endsWith('.js')) {
      targetUrl = url;
    }
  });

  page.on('pageerror', err => console.log('ERROR:', err.message, err.stack));

  // We need to bypass Auth or just see if Dashboard loads at all.
  // We can just visit the URL and wait for scripts to load.
  await page.goto('https://lumina-jd-scanner-main.vercel.app/dashboard', { waitUntil: 'networkidle0' });
  
  if (targetUrl) {
    console.log('Found Dashboard chunk:', targetUrl);
    const scriptRes = await fetch(targetUrl);
    const scriptText = await scriptRes.text();
    
    // The user's error was at line 242 column 371
    // We can print the character at that location if the file is the same.
    const lines = scriptText.split('\n');
    console.log('Line 242 excerpt:');
    if (lines.length >= 242) {
      const line = lines[241];
      console.log(line.substring(Math.max(0, 371 - 50), 371 + 50));
    } else {
      console.log('File has fewer lines:', lines.length);
      console.log(scriptText.substring(0, 200));
    }
  } else {
    console.log('Dashboard chunk not found.');
  }

  await browser.close();
})();
