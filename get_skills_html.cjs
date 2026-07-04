const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  await page.setViewport({ width: 1440, height: 1200 });

  // Inject localStorage keys to bypass onboarding
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('lumina_onboarding_complete', 'true');
    localStorage.setItem('lumina_dashboard_tour_complete', 'true');
    localStorage.setItem('lumina_pro', 'true');
  });

  try {
    await page.goto('https://lumina-project-220-main.vercel.app/auth', { waitUntil: 'networkidle2' });
    
    // Sign in
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Continue with Email'));
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 2000));
    
    await page.type('input[type="email"]', 'tester.lumina@gmail.com');
    await page.type('input[type="password"]', 'TestPassword123!');
    
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Sign In to Lumina'));
      if (btn) btn.click();
    });
    
    await new Promise(r => setTimeout(r, 8000));

    // Switch to Generator tab
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent("switch-tab", { detail: "generator" }));
    });
    await new Promise(r => setTimeout(r, 4000));

    // Open options
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Open Detailed Synthesis Options'));
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 2000));

    // Click Generate Blueprint
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Generate Blueprint') || b.textContent.includes('Tailor Resume'));
      if (btn) btn.click();
    });

    console.log("Waiting for Resume Generation...");
    await new Promise(r => setTimeout(r, 38000));

    // Fetch the innerHTML of the Skills section in the resume preview sheet
    const skillsHtml = await page.evaluate(() => {
      // Find the Skills header
      const headers = Array.from(document.querySelectorAll('h4'));
      const skillsHeader = headers.find(h => h.textContent.trim().toLowerCase() === 'skills');
      if (skillsHeader) {
        // The parent section of the header
        const section = skillsHeader.closest('section');
        if (section) {
          return {
            outerHTML: section.outerHTML,
            computedStyle: window.getComputedStyle(section).cssText
          };
        }
      }
      return null;
    });

    console.log("Skills Section HTML:");
    console.log(skillsHtml ? skillsHtml.outerHTML : "Not found");
  } catch (err) {
    console.error("Failed:", err);
  } finally {
    await browser.close();
  }
})();
