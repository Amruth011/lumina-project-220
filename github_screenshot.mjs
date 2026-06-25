import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

(async () => {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  await page.setViewport({ width: 1280, height: 1080 });
  
  console.log('Navigating to GitHub...');
  await page.goto('https://github.com/Amruth011/lumina-project-220', { waitUntil: 'networkidle2' });
  
  // Save to the artifacts directory
  const outputPath = 'C:\\Users\\shara\\.gemini\\antigravity\\brain\\d643c353-e4ff-4936-9cc2-18a0b8578123\\github_contributors.png';
  
  console.log('Taking screenshot...');
  await page.screenshot({ path: outputPath });
  
  await browser.close();
  console.log('Screenshot saved to', outputPath);
})();
