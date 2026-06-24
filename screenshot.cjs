const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 800, height: 600 });

  // 1. Setting Screenshot
  const html1 = `
    <html><body style="font-family: sans-serif; padding: 20px; background: #f8fafc;">
      <div style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); width: 400px; border: 1px solid #e2e8f0;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; font-size: 12px; color: #64748b; font-weight: 500;">
          <span>Sentence Length</span>
          <span style="background: #f1f5f9; color: #334155; padding: 2px 8px; border-radius: 9999px;">3 Lines</span>
        </div>
        <input type="range" min="2" max="6" value="3" style="width: 100%; height: 6px; background: #e2e8f0; border-radius: 8px; appearance: none; outline: none;" />
      </div>
    </body></html>
  `;
  await page.setContent(html1);
  await page.screenshot({ path: 'C:/Users/shara/.gemini/antigravity/brain/c57c7059-37fc-4ba1-8264-de2ebab5fd70/setting.png', clip: { x: 0, y: 0, width: 440, height: 120 } });

  // 2. Header Screenshot
  const html2 = `
    <html><body style="font-family: Arial, sans-serif; padding: 40px; background: white;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h1 style="font-size: 24px; color: #1E2A3A; margin: 0 0 8px 0; text-transform: uppercase; font-weight: bold;">John Doe</h1>
        <div style="display: flex; justify-content: center; gap: 16px; font-size: 12px; color: #1E2A3A;">
          <span>New York, NY</span>
          <span>+1 (555) 123-4567</span>
          <a href="#" style="color: #1E2A3A; text-decoration: none;">john@example.com</a>
          <a href="#" style="color: #0A66C2; text-decoration: none;">LinkedIn</a>
          <a href="#" style="color: #1E2A3A; text-decoration: none;">GitHub</a>
          <a href="#" style="color: #1E2A3A; text-decoration: none;">Portfolio</a>
        </div>
      </div>
    </body></html>
  `;
  await page.setContent(html2);
  await page.screenshot({ path: 'C:/Users/shara/.gemini/antigravity/brain/c57c7059-37fc-4ba1-8264-de2ebab5fd70/header.png', clip: { x: 0, y: 0, width: 800, height: 120 } });

  // 3. Summary Screenshot
  const html3 = `
    <html><body style="font-family: Arial, sans-serif; padding: 40px; background: white;">
      <div>
        <h2 style="font-size: 14px; font-weight: bold; color: #1E2A3A; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin: 0 0 8px 0; text-transform: uppercase;">Professional Summary</h2>
        <p style="font-size: 12px; color: #334155; line-height: 1.6; margin: 0;">
          Senior Software Engineer with 8+ years of experience architecting scalable AI infrastructure.<br/>
          Spearheaded the development of a real-time healthcare NLP engine processing 10k+ requests per second with 99.9% uptime.<br/>
          Reduced cloud infrastructure costs by 40% through container orchestration and efficient resource allocation.
        </p>
      </div>
    </body></html>
  `;
  await page.setContent(html3);
  await page.screenshot({ path: 'C:/Users/shara/.gemini/antigravity/brain/c57c7059-37fc-4ba1-8264-de2ebab5fd70/summary.png', clip: { x: 0, y: 0, width: 800, height: 160 } });

  await browser.close();
})();
