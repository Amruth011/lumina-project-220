const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

(async () => {
  console.log("Starting E2E Word (DOCX) Typography verification...");
  const downloadsDir = path.join(__dirname, 'downloads');
  if (!fs.existsSync(downloadsDir)) {
    fs.mkdirSync(downloadsDir, { recursive: true });
  }

  // Clear existing downloads
  fs.readdirSync(downloadsDir).forEach(f => {
    fs.unlinkSync(path.join(downloadsDir, f));
  });

  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1080 });

  // Configure Chrome DevTools Protocol to enable downloads
  const client = await page.target().createCDPSession();
  await client.send('Page.setDownloadBehavior', {
    behavior: 'allow',
    downloadPath: downloadsDir
  });

  try {
    console.log("1. Navigating to local Auth page...");
    await page.goto('http://localhost:8080/auth', { waitUntil: 'networkidle2' });

    console.log("2. Clicking 'Continue with Email'...");
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Continue with Email'));
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 1000));

    console.log("3. Typing credentials...");
    await page.type('input[type="email"]', 'tester.lumina@gmail.com');
    await page.type('input[type="password"]', 'TestPassword123!');

    console.log("4. Signing in...");
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Sign In to Lumina'));
      if (btn) btn.click();
    });

    console.log("Waiting for Dashboard textarea to load...");
    await page.waitForSelector('textarea', { timeout: 15000 });
    await new Promise(r => setTimeout(r, 2000));

    console.log("5. Inputting Job Description...");
    const cogniteJd = `What Cognite is: Relentless to achieve
Cognite operates at the forefront of industrial digitalization.
About the role:
Intern – L1+ Data Engineering & Production Support. Python scripting, SQL.`;
    await page.type('textarea', cogniteJd);

    console.log("Clicking Decode...");
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Decode'));
      if (btn) btn.click();
    });

    console.log("Waiting for decoding process...");
    await new Promise(r => setTimeout(r, 10000));

    console.log("6. Switching to Generator tab...");
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('button, a, span'));
      const generatorTab = tabs.find(el => el.textContent.includes('Generator'));
      if (generatorTab) generatorTab.click();
    });
    await new Promise(r => setTimeout(r, 2000));

    console.log("7. Generating Resume Blueprint...");
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Generate Blueprint'));
      if (btn) btn.click();
    });

    console.log("Waiting for Resume Generation (30 seconds)...");
    await new Promise(r => setTimeout(r, 30000));

    console.log("8. Changing typography settings to specific test sizes: 18, 12, 11, 10...");
    await page.evaluate(() => {
      // Find the typography input elements
      const labels = Array.from(document.querySelectorAll('label'));
      
      const nameLabel = labels.find(l => l.textContent.includes('Name (pt)'));
      const headlineLabel = labels.find(l => l.textContent.includes('Headlines (pt)'));
      const subheaderLabel = labels.find(l => l.textContent.includes('Sub-Headers (pt)'));
      const bodyLabel = labels.find(l => l.textContent.includes('Body (pt)'));

      if (nameLabel) {
        const input = nameLabel.nextElementSibling;
        input.value = "18";
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
      if (headlineLabel) {
        const input = headlineLabel.nextElementSibling;
        input.value = "12";
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
      if (subheaderLabel) {
        const input = subheaderLabel.nextElementSibling;
        input.value = "11";
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
      if (bodyLabel) {
        const input = bodyLabel.nextElementSibling;
        input.value = "10";
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    await new Promise(r => setTimeout(r, 2000));

    console.log("9. Clicking 'Download Word Doc'...");
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button, a')).find(b => b.textContent.includes('Word Doc'));
      if (btn) btn.click();
    });

    console.log("Waiting for file download...");
    await new Promise(r => setTimeout(r, 5000));

    // Verify downloaded file content
    const files = fs.readdirSync(downloadsDir);
    if (files.length === 0) {
      throw new Error("No file was downloaded!");
    }

    const downloadedFilePath = path.join(downloadsDir, files[0]);
    console.log("File downloaded successfully to:", downloadedFilePath);

    const docxContent = fs.readFileSync(downloadedFilePath, 'utf8');

    // Run structural assertions on font sizes in Word HTML output
    console.log("10. Asserting typography scales in the Word HTML document...");

    const assertions = [
      { name: "Name Font Size (18px)", regex: /font-size:\s*18px;[^>]*text-align:\s*center/i },
      { name: "Section Title Font Size (12px)", regex: /\.section-title\s*\{[^}]*font-size:\s*12px;/i },
      { name: "Experience Role Font Size (11px)", regex: /font-size:\s*11px;[^>]*color:\s*#1E2A3A;[^>]*font-family:/i },
      { name: "Body Summary Font Size (10px)", regex: /p\.summary-text\s*\{[^}]*font-size:\s*10px;/i },
      { name: "Bullet Item Font Size (10px)", regex: /li\.bullet-item\s*\{[^}]*font-size:\s*10px;/i },
      { name: "Skills Category Font Size (10px)", regex: /\.skills-category\s*\{[^}]*font-size:\s*10px;/i },
      { name: "Education Right-Side Date Font Size (10px)", regex: /text-align:\s*right;[^>]*font-size:\s*10px;[^>]*color:\s*#1E2A3A;[^>]*font-family:[^>]*>\${dateText}/i },
      { name: "Education Right-Side Location Font Size (9px)", regex: /text-align:\s*right;[^>]*font-size:\s*9px;[^>]*color:\s*#1E2A3A;[^>]*font-family:[^>]*>\${loc}/i }
    ];

    let passedAll = true;
    for (const test of assertions) {
      // Map dynamic variable placeholder patterns in code to expected output strings
      let resolvedRegex = test.regex;
      if (test.name.includes("Education Right-Side Date")) {
        resolvedRegex = /text-align:\s*right;[^>]*font-size:\s*10px; color:\s*#1E2A3A/i;
      }
      if (test.name.includes("Education Right-Side Location")) {
        resolvedRegex = /text-align:\s*right;[^>]*font-size:\s*9px; color:\s*#1E2A3A/i;
      }

      if (resolvedRegex.test(docxContent)) {
        console.log(`✅ [PASS] ${test.name}`);
      } else {
        console.warn(`❌ [FAIL] ${test.name}`);
        passedAll = false;
      }
    }

    if (passedAll) {
      console.log("\n🎉 ALL TYPOGRAPHY SCALE TESTS PASSED IN WORD DOCUMENT!");
    } else {
      console.error("\n❌ TYPOGRAPHY SCALE VERIFICATION FAILED.");
      process.exit(1);
    }

  } catch (err) {
    console.error("Test execution failed:", err);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
