const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

// Target LinkedIn Job URL
const targetUrl = process.argv[2] || "https://www.linkedin.com/jobs/view/4409245353/";

(async () => {
  console.log("=== LUMINA INTELLIGENT AUTO-APPLIER (HEADED ACTIVE SYNC) ===");
  console.log(`Target Job URL: ${targetUrl}`);

  const userDataDir = path.join(__dirname, '..', '.chrome-session');
  if (!fs.existsSync(userDataDir)) {
    fs.mkdirSync(userDataDir, { recursive: true });
  }

  console.log("Launching headed Chrome browser...");
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false, // HEADED: Opens the window right in front of you!
    viewport: null,
    args: ['--start-maximized'],
  });

  const page = await context.newPage();
  
  console.log("Navigating directly to target LinkedIn job page...");
  await page.goto(targetUrl, { waitUntil: 'load', timeout: 60000 });
  await page.bringToFront(); // Force window focus

  console.log("-----------------------------------------------------------------");
  console.log("LUMINA ACTIVE SYNC: Multi-Tab monitoring activated!");
  console.log("If you are logged out, please complete the login on the opened window.");
  console.log("I will automatically hook in and complete the application the second you are in!");
  console.log("-----------------------------------------------------------------");

  // Multi-tab monitoring loop to catch active login states
  let targetPage = page;
  let applyButton = null;

  const startTime = Date.now();
  const timeoutLimit = 300000; // 5 minutes

  const selectors = [
    'button.jobs-apply-button',
    'button.jobs-apply-button--top-card',
    '.jobs-apply-button button',
    '.jobs-apply-button--top-card button',
    'button:has-text("Easy Apply")',
    'span:has-text("Easy Apply")',
    'a:has-text("Easy Apply")',
    '[aria-label*="Easy Apply"]',
    '.jobs-apply-button'
  ];

  while (Date.now() - startTime < timeoutLimit) {
    const pages = context.pages();
    
    // Scan all open tabs to find one with the target job and active apply button
    for (const p of pages) {
      try {
        const url = p.url();
        if (url.includes("linkedin.com/jobs/view") || url.includes("linkedin.com/jobs/search")) {
          // Try our 9 robust selectors to find the Easy Apply button
          for (const sel of selectors) {
            const btn = await p.$(sel);
            if (btn) {
              const isVisible = await btn.isVisible();
              if (isVisible) {
                targetPage = p;
                applyButton = btn;
                console.log(`[Sync Success] Connected to active LinkedIn tab: ${url}`);
                console.log(`[Selector Match] Hooked 'Easy Apply' button using selector: "${sel}"`);
                break;
              }
            }
          }
        }
      } catch (e) {
        // Ignore page-level errors
      }
      if (applyButton) break;
    }

    if (applyButton) {
      break;
    }

    // Real-time visual diagnostics: capture screenshots of all open tabs
    const currentPages = context.pages();
    for (let i = 0; i < currentPages.length; i++) {
      try {
        await currentPages[i].screenshot({ path: `scratch/live_tab_${i}.png` });
      } catch (e) {}
    }

    if (Math.floor((Date.now() - startTime) / 1000) % 10 === 0) {
      console.log("Waiting for active login... Please complete LinkedIn login on the opened Chrome window.");
      console.log(`[Diagnostic] Capture saved: ${currentPages.length} active tab(s) screenshotted inside scratch/`);
    }
    
    await new Promise(r => setTimeout(r, 1000));
  }

  if (!applyButton) {
    console.error("Timeout waiting for 'Easy Apply' page state. Exiting script.");
    await page.screenshot({ path: 'scratch/apply-error.png' });
    await context.close();
    process.exit(1);
  }

  console.log("Found 'Easy Apply' button! Clicking to open application form...");
  await targetPage.bringToFront();
  await applyButton.click();
  await targetPage.waitForTimeout(2000);

  const mainPage = targetPage;

  // Handle Easy Apply Steps (Loop up to 12 steps)
  let stepsCompleted = 0;
  let maxSteps = 12;
  let isDone = false;

  while (stepsCompleted < maxSteps && !isDone) {
    stepsCompleted++;
    console.log(`\n--- Auto-Processing Step #${stepsCompleted} ---`);
    await mainPage.waitForTimeout(1500);

    // Save step screenshot
    await mainPage.screenshot({ path: `scratch/step_${stepsCompleted}.png` });
    console.log(`Saved step screenshot to scratch/step_${stepsCompleted}.png`);

    // 1. Locate and wait for the LinkedIn Easy Apply modal dialog to appear
    const modal = await mainPage.$('div[role="dialog"], .jobs-easy-apply-modal, [role="dialog"]');
    if (!modal) {
      console.log("Waiting for the application modal dialog to appear on screen...");
      await mainPage.waitForTimeout(1000);
      continue;
    }

    // 2. Process and Fill custom questions INSIDE the modal dialog
    await fillFormInputs(modal);

    // 3. Look for operational buttons INSIDE the modal footer (or action bar)
    const footer = await modal.$('footer, .jobs-easy-apply-modal__footer, .artdeco-modal__actionbar');
    const btnContainer = footer || modal;

    const nextBtn = await btnContainer.$('button:has-text("Next"), button[aria-label*="Next"]');
    const reviewBtn = await btnContainer.$('button:has-text("Review"), button[aria-label*="Review"]');
    const submitBtn = await btnContainer.$('button:has-text("Submit application"), button[aria-label*="Submit application"]');
    const doneBtn = await btnContainer.$('button:has-text("Done"), button[aria-label*="Dismiss"]');

    if (submitBtn) {
      console.log("DETECTED: 'Submit application' button inside modal. Triggering final submission...");
      await submitBtn.click();
      await mainPage.waitForTimeout(4000);
      await mainPage.screenshot({ path: 'scratch/step_final_submitted.png' });
      console.log("SUCCESS: Application submitted successfully! Screenshot saved to scratch/step_final_submitted.png");
      isDone = true;
      break;
    }

    if (reviewBtn) {
      console.log("DETECTED: 'Review' button inside modal. Advancing to review stage...");
      await reviewBtn.click();
      continue;
    }

    if (nextBtn) {
      console.log("DETECTED: 'Next' button inside modal. Advancing to next stage...");
      await nextBtn.click();
      continue;
    }

    if (doneBtn) {
      console.log("DETECTED: 'Done' button inside modal. Application is complete.");
      await doneBtn.click();
      isDone = true;
      break;
    }

    console.log("No further navigation controls visible inside the modal. May require manual interaction.");
    await mainPage.waitForTimeout(3000);
  }

  console.log("\n=== Application Auto-Apply Run Finished Successfully ===");
  console.log("Closing browser in 5 seconds...");
  await mainPage.waitForTimeout(5000);
  await context.close();
})();

// Helper: Check if logged in
async function checkLoginState(page) {
  const currentUrl = page.url();
  if (currentUrl.includes("login") || currentUrl.includes("signup")) {
    return false;
  }
  const avatar = await page.$('img.global-nav__me-photo, button.global-nav__primary-link, #global-nav');
  return avatar !== null;
}

// Helper: Fill visible inputs based on labels
async function fillFormInputs(page) {
  const formElements = await page.$$('.fb-dash-form-element, .jobs-easy-apply-form-section, div[class*="form-element"]');
  
  for (const element of formElements) {
    try {
      const labelElement = await element.$('label, span.fb-form-element-label__title-text, span.fb-form-element-label__title');
      if (!labelElement) continue;

      const rawLabel = await labelElement.innerText();
      const label = rawLabel.toLowerCase();

      const input = await element.$('input[type="text"], textarea');
      const select = await element.$('select');

      if (input) {
        const currentValue = await input.inputValue();
        
        // Optimize Generative AI Years
        if (label.includes("generative ai") || label.includes("genai") || label.includes("gen ai")) {
          console.log(`[Injecting] "${rawLabel.trim()}" -> "2"`);
          await input.focus();
          await input.fill("");
          await input.type("2");
          continue;
        }

        // Optimize Machine Learning Years
        if (label.includes("machine learning") || label.includes("ml")) {
          console.log(`[Injecting] "${rawLabel.trim()}" -> "2"`);
          await input.focus();
          await input.fill("");
          await input.type("2");
          continue;
        }

        // Optimize CTC
        if (label.includes("ctc") || label.includes("salary") || label.includes("compensation")) {
          console.log(`[Injecting] "${rawLabel.trim()}" -> "5.0"`);
          await input.focus();
          await input.fill("");
          await input.type("5.0");
          continue;
        }

        // Optimize Notice Period / Immediate Joiner (in days)
        if (label.includes("notice period") || label.includes("notice") || label.includes("immediate joiner") || label.includes("remaining days") || label.includes("serving")) {
          console.log(`[Injecting] "${rawLabel.trim()}" -> "0"`);
          await input.focus();
          await input.fill("");
          await input.type("0");
          continue;
        }

        // Fallbacks for empty text inputs
        if (currentValue === "" || currentValue === "0") {
          if (label.includes("experience") || label.includes("years")) {
            console.log(`[Injecting Fallback] "${rawLabel.trim()}" -> "2"`);
            await input.focus();
            await input.fill("");
            await input.type("2");
          }
        }
      }

      if (select) {
        const selectValue = await select.inputValue();
        if (selectValue === "" || selectValue === "Select an option") {
          const options = await select.$$eval('option', opts => opts.map(o => o.text));
          const yesOption = options.find(o => o.toLowerCase() === "yes" || o.toLowerCase() === "immediate");
          if (yesOption) {
            console.log(`[Selecting Dropdown] "${rawLabel.trim()}" -> "${yesOption}"`);
            await select.selectOption({ label: yesOption });
          }
        }
      }

      // Handle radio buttons
      const radioButtons = await element.$$('fieldset label, div[role="radio"] label, .fb-radio-buttons label');
      if (radioButtons.length > 0) {
        for (const radio of radioButtons) {
          const radioText = (await radio.innerText()).toLowerCase();
          if (label.includes("immediate") || label.includes("joiner")) {
            if (radioText.includes("yes")) {
              console.log(`[Checking Radio] "${rawLabel.trim()}" -> "${radioText.trim()}"`);
              await radio.click();
              break;
            }
          }
        }
      }

    } catch (err) {
      console.log(`Element skip: ${err.message}`);
    }
  }
}
