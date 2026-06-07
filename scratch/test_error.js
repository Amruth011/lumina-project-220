import puppeteer from 'puppeteer';
import handler from 'serve-handler';
import http from 'http';

const server = http.createServer((request, response) => {
  return handler(request, response, {
    public: 'dist',
    rewrites: [{ source: '**', destination: '/index.html' }]
  });
});

server.listen(3000, async () => {
  console.log('Running at http://localhost:3000');
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.toString(), err.stack));

  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle0' }).catch(console.error);
  console.log('Navigating to dashboard...');
  await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle0' }).catch(console.error);
  
  await browser.close();
  server.close();
});
