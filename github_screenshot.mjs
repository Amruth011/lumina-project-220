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
  
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const outputPath = join(__dirname, 'github_contributors.png');

console.log('Taking screenshot...');
await page.screenshot({ path: outputPath });

await browser.close();
console.log('Screenshot saved to', outputPath);
})();
