const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

(async () => {
  console.log("Launching headless browser...");
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER PAGE ERROR:', err.message));
  
  await page.setViewport({ width: 1440, height: 3200 });
  const dirPath = 'C:\\Users\\shara\\.gemini\\antigravity\\brain\\5737790f-5a53-4d0c-ac13-bb1b3571e926';
  if (!fs.existsSync(dirPath)){ fs.mkdirSync(dirPath, { recursive: true }); }
  const screenshotPath = path.join(dirPath, 'signup_resume_proof.png');
  const failureScreenshotPath = path.join(dirPath, 'failure_screenshot.png');

  // Generate a random email to ensure a fresh signup
  const randomEmail = `tester.lumina.${Date.now()}@gmail.com`;
  console.log("Using fresh sign-up email:", randomEmail);

  try {
    console.log("1. Navigating to Auth page...");
    await page.goto('http://localhost:8080/auth', { waitUntil: 'networkidle2' });
    
    console.log("Clicking Continue with Email...");
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Continue with Email'));
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 1000));

    console.log("Switching to Sign Up tab...");
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Sign Up');
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 1000));
    
    console.log("Typing fresh credentials...");
    await page.type('input[type="email"]', randomEmail);
    await page.type('input[type="password"]', 'TestPassword123!');
    
    console.log("Clicking Create Free Account...");
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Create Free Account'));
      if (btn) btn.click();
    });
    
    console.log("Waiting for redirection to dashboard URL...");
    await page.waitForFunction(() => window.location.href.includes('/dashboard'), { timeout: 35000 });
    
    console.log("Bypassing onboarding modals by setting localStorage flags...");
    await page.evaluate(() => {
      localStorage.setItem("lumina_onboarding_complete", "true");
      localStorage.setItem("lumina_dashboard_tour_complete", "true");
    });
    
    console.log("Reloading page to apply clean dashboard state...");
    await page.reload({ waitUntil: 'networkidle2' });
    
    console.log("Waiting for Dashboard load...");
    await page.waitForSelector('textarea', { timeout: 25000 });
    await new Promise(r => setTimeout(r, 2000));

    console.log("2. Entering full Cognite Job Description via direct injection...");
    const cogniteJd = `What Cognite is: Relentless to achieve
Cognite operates at the forefront of industrial digitalization, building AI, and data solutions that solve the world’s hardest, highest-impact problems.

How you’ll demonstrate Ownership
● Take accountability for monitoring and supporting production applications and data workflows.
● Proactively identify issues, anomalies, or failures and escalate them appropriately.
● Show curiosity and initiative in troubleshooting problems and understanding root causes.

About the role:
Intern – L1+ Data Engineering & Production Support. Python scripting, SQL, Linux, and L1 support. Eagerness to learn production support and cloud technologies.`;

    await page.evaluate((text) => {
      const textarea = document.querySelector('textarea');
      if (textarea) {
        const nativeValueSetter = Object.getOwnPropertyDescriptor(
          HTMLTextAreaElement.prototype,
          'value'
        ).set;
        nativeValueSetter.call(textarea, text);
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }, cogniteJd);
    await new Promise(r => setTimeout(r, 1500));
    console.log("Clicking Decode JD using native Puppeteer page.click()...");
    await page.waitForSelector('div.flex.justify-center.mt-8 button', { timeout: 10000 });
    await page.click('div.flex.justify-center.mt-8 button');
    
    // Wait a bit and check if it clicked, if not do a coordinate fallback click
    await new Promise(r => setTimeout(r, 2000));
    const isAnalyzing = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Analyzing') || b.textContent.includes('Decoded'));
      return !!btn;
    });
    
    if (!isAnalyzing) {
      console.log("Fallback: page.click didn't trigger Analyzing state. Attempting direct element click via JS...");
      await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Decode Job Description') || b.textContent.includes('Decode'));
        if (btn) btn.click();
      });
      await new Promise(r => setTimeout(r, 2000));
    }
    
    console.log("Waiting for JD Decoding to complete...");
    await page.waitForFunction(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.some(b => b.textContent.includes('Decoded') || b.textContent.includes('Scan New JD') || b.textContent.includes('Export Report'));
    }, { timeout: 45000 });
    console.log("JD Decoding completed successfully!");

    console.log("3. Switching to Generator Tab...");
    await page.evaluate(() => {
      const navLinks = Array.from(document.querySelectorAll('button, a, span'));
      const generatorTab = navLinks.find(el => el.textContent.includes('Generator'));
      if (generatorTab) generatorTab.click();
    });
    
    console.log("Waiting for Generator Tab to render...");
    await page.waitForFunction(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.some(b => b.textContent.includes('Open Detailed Synthesis Options'));
    }, { timeout: 20000 });

    console.log("Opening Resume Synthesis options...");
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Open Detailed Synthesis Options'));
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 1500));

    console.log("Waiting for Generate Blueprint button to render...");
    await page.waitForFunction(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.some(b => b.textContent.includes('Generate Blueprint'));
    }, { timeout: 10000 });

    console.log("4. Clicking Generate Blueprint...");
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Generate Blueprint'));
      if (btn) btn.click();
    });
    
    // Check if it started generating, if not, fallback to coordinate click
    await new Promise(r => setTimeout(r, 2000));
    const isGenerating = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      // When generating, the button text switches to showing a spinner or "Generating..."
      return btns.some(b => b.textContent.includes('Generating') || b.textContent.includes('Regenerate') || document.querySelector('.animate-spin'));
    });
    
    if (!isGenerating) {
      console.log("Fallback: JS click didn't trigger Generate. Attempting native mouse click...");
      const btnRect = await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Generate Blueprint'));
        if (!btn) return null;
        const rect = btn.getBoundingClientRect();
        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      });
      if (btnRect) {
        await page.mouse.click(btnRect.x, btnRect.y);
      }
    }

    console.log("Waiting for Resume Generation to complete...");
    await page.waitForFunction(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.some(b => b.textContent.includes('Regenerate Blueprint'));
    }, { timeout: 75000 });
    console.log("Resume generated successfully!");
    await new Promise(r => setTimeout(r, 3000)); // allow rendering to settle

    console.log("Taking fullPage screenshot of the brand-new tailored resume preview...");
    await page.screenshot({ path: screenshotPath, fullPage: true });
    
    // Create scrolled screenshot to focus on the tailored resume details
    const scrolledPath = path.join(dirPath, 'scrolled_resume_proof.png');
    console.log("Scrolling Resume Preview into view...");
    await page.evaluate(() => {
      // Find element containing SKILLS header and scroll to it
      const skillsHeader = Array.from(document.querySelectorAll('h1, h2, h3, div, span')).find(el => 
        el.textContent.trim() === 'SKILLS' || 
        el.textContent.trim() === 'Skills' || 
        el.textContent.includes('Languages') ||
        el.textContent.includes('Production Support')
      );
      if (skillsHeader) {
        skillsHeader.scrollIntoView({ block: 'center' });
      } else {
        window.scrollTo(0, 2400);
      }
    });
    await new Promise(r => setTimeout(r, 2000));
    console.log("Taking focused scrolled screenshot...");
    await page.screenshot({ path: scrolledPath, fullPage: false });
    
    console.log("SUCCESS: Brand-new user resume screenshots saved successfully!");
  } catch (err) {
    console.error("Puppeteer sign-up automation failed:", err);
    try {
      console.log("Saving failure screenshot to", failureScreenshotPath);
      await page.screenshot({ path: failureScreenshotPath, fullPage: false });
    } catch (ssErr) {
      console.error("Failed to capture screenshot on error:", ssErr);
    }
  } finally {
    await browser.close();
  }
})();
