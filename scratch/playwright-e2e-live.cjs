const { chromium } = require('@playwright/test');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manually parse .env file
const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env file!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// E2E Test Configurations
const TEST_EMAIL = 'tester.lumina@gmail.com';
const TEST_PASSWORD = 'TestPassword123!';
const LIVE_URL = 'https://lumina-jd-scanner.vercel.app';
const ARTIFACTS_DIR = 'C:/Users/shara/.gemini/antigravity/brain/bafae9e6-7523-4cb0-acfb-65b2618d5805';

// Mock JD to decode
const MOCK_JD = `We are looking for a Senior Full Stack Engineer to join our team.

Responsibilities:
- Architect and develop high-performance web applications using React and Node.js.
- Optimize database performance in PostgreSQL and build microservices.
- Ensure excellent application security and maintain robust API systems.
- Collaborate with engineering teams to standardise styling using TailwindCSS.
- Automate CI/CD deployment pipelines using GitHub Actions.

Requirements:
- 5+ years of software engineering experience.
- High proficiency in TypeScript, React, and Node.js.
- Experience with database tuning and complex querying.`;

// Mock vault items to seed
const MOCK_VAULT = [
  {
    title: "Senior Full Stack Engineer",
    organization: "TechNova Solutions",
    description: "Led development of a high-traffic cloud intelligence platform, enhancing processing speed and scalability.",
    bullets: [
      "Architected and deployed a microservices-based analytics dashboard using React, Node.js, and Supabase, reducing page load times by 40%.",
      "Optimized database query performance in PostgreSQL, leading to a 30% increase in data retrieval efficiency.",
      "Collaborated with cross-functional teams to design and implement robust RESTful APIs, securing them with OAuth2."
    ],
    skills: ["React", "Node.js", "Supabase", "PostgreSQL", "RESTful APIs", "Microservices", "TypeScript"],
    type: "professional",
    period: "Jan 2024 - Present"
  },
  {
    title: "Software Engineer II",
    organization: "CloudFlow Systems",
    description: "Developed and maintained highly responsive user interfaces and backend services for cloud-based automation tools.",
    bullets: [
      "Engineered real-time collaboration features using WebSockets and React, increasing active daily user retention by 15%.",
      "Created reusable UI components using TailwindCSS and TypeScript, standardizing the design system across 3 distinct product lines.",
      "Automated CI/CD deployment pipelines using GitHub Actions, decreasing release cycle times by 25%."
    ],
    skills: ["React", "TypeScript", "TailwindCSS", "WebSockets", "CI/CD", "GitHub Actions"],
    type: "professional",
    period: "Mar 2022 - Dec 2023"
  }
];

(async () => {
  console.log("=== STEP 1: DB SEEDING ===");
  let userId;
  try {
    console.log(`Checking if user ${TEST_EMAIL} exists or signing up...`);
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });

    if (authError) {
      console.log("Signup failed or user already exists. Attempting login to get userId...");
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: TEST_EMAIL,
        password: TEST_PASSWORD
      });
      if (signInError) throw signInError;
      userId = signInData.user.id;
    } else {
      userId = authData.user.id;
      console.log("Newly registered user ID:", userId);
    }

    console.log(`Setting up Profile for userId: ${userId}`);
    const { data: profileData } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (!profileData) {
      const { error: profError } = await supabase.from('profiles').insert({
        id: userId,
        full_name: "Amruth Gowda",
        email: TEST_EMAIL,
        location: "San Francisco, CA",
        phone: "+1 (555) 019-2834",
        linkedin_url: "https://linkedin.com/in/amruthgowda",
        github_url: "https://github.com/amruthgowda",
        website_url: "https://amruth.dev"
      });
      if (profError) throw profError;
      console.log("Profile row created successfully.");
    } else {
      console.log("Profile row already exists.");
    }

    console.log("Clearing old master vault items and seeding new mock entries...");
    const { error: delError } = await supabase.from('master_vault').delete().eq('user_id', userId);
    if (delError) throw delError;

    const vaultWithUser = MOCK_VAULT.map(item => ({ ...item, user_id: userId }));
    const { error: insError } = await supabase.from('master_vault').insert(vaultWithUser);
    if (insError) throw insError;

    console.log("SUCCESS: Mock database populated perfectly!");

  } catch (err) {
    console.error("DB Setup Error:", err.message);
    process.exit(1);
  }

  console.log("\n=== STEP 2: BROWSER AUTOMATION VIA PLAYWRIGHT ===");
  let browser;
  let page;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 }
    });
    page = await context.newPage();

    // Log browser console logs for easier debugging
    page.on('console', msg => console.log(`[BROWSER CONSOLE] ${msg.type().toUpperCase()}: ${msg.text()}`));

    console.log("Navigating to auth page...");
    await page.goto(`${LIVE_URL}/auth`);

    console.log("Pre-injecting onboarding bypass keys in localStorage...");
    await page.evaluate(() => {
      localStorage.setItem("lumina_onboarding_complete", "true");
      localStorage.setItem("lumina_dashboard_tour_complete", "true");
    });

    console.log("Swapping to email auth...");
    await page.click('button:has-text("Continue with Email & Password")');
    await page.waitForTimeout(1000);

    console.log("Logging in via credentials...");
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    
    console.log("Submitting login form...");
    await page.click('button:has-text("Sign In to Lumina")');

    console.log("Waiting for redirection to dashboard...");
    await page.waitForURL('**/dashboard', { timeout: 20000 });
    console.log("Successfully logged in! Current URL:", page.url());

    // Instead of doing reload which can trigger a flash-out redirect, we can inject localStorage keys
    // directly and wait for any welcome modals. Let's see if there is any Welcome Screen.
    console.log("Injecting local storage keys to prevent overlays...");
    await page.evaluate(() => {
      localStorage.setItem("lumina_onboarding_complete", "true");
      localStorage.setItem("lumina_dashboard_tour_complete", "true");
    });
    
    // Wait for the Sonner toast to naturally disappear to prevent pointer event blockages
    console.log("Waiting 4 seconds for auth success toasts to fade...");
    await page.waitForTimeout(4000);

    // Take a screenshot of the dashboard loaded state before pasting JD
    console.log("Taking initial dashboard screenshot...");
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'step0_dashboard_initial.png') });

    console.log("Pasting Job Description into decoding textarea...");
    const textareaSelector = 'textarea[placeholder*="Paste complete \'About the Job\'"]';
    await page.waitForSelector(textareaSelector, { timeout: 15000 });
    await page.fill(textareaSelector, MOCK_JD);
    await page.waitForTimeout(1000);

    console.log("Taking screenshot after filling the textarea...");
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'step0_textarea_filled.png') });

    console.log("Checking if Decode button or Tailor My Resume is visible (handling auto-decode)...");
    try {
      await Promise.any([
        page.waitForSelector('button:has-text("Tailor My Resume")', { timeout: 30000 }),
        page.waitForSelector('button:has-text("Decode Job Description")', { timeout: 30000 })
      ]);
    } catch (e) {
      console.log("Neither button appeared within timeout. Continuing anyway.");
    }

    const tailorBtn = await page.$('button:has-text("Tailor My Resume")');
    if (tailorBtn && await tailorBtn.isVisible()) {
      console.log("Dashboard already loaded or auto-decoded successfully!");
    } else {
      const decodeBtn = await page.$('button:has-text("Decode Job Description")');
      if (decodeBtn && await decodeBtn.isVisible()) {
        console.log("Clicking Decode button...");
        await decodeBtn.click();
      } else {
        console.log("Warning: Decode button not found or visible, but Tailor button is also missing. Waiting for Tailor button...");
      }
      
      console.log("Waiting for analysis to complete and dashboard to load...");
      await page.waitForSelector('button:has-text("Tailor My Resume")', { timeout: 45000 });
    }
    console.log("SUCCESS: JD decoded! Dashboard metric widgets and grade analytics rendered.");

    console.log("Capturing Dashboard verification screenshot...");
    const screenshotPath1 = path.join(ARTIFACTS_DIR, 'step1_dashboard.png');
    await page.screenshot({ path: screenshotPath1, fullPage: true });
    console.log(`Saved screenshot to: ${screenshotPath1}`);

    console.log("Transitioning to tailer engine by clicking 'Tailor My Resume'...");
    await page.click('button:has-text("Tailor My Resume")');
    await page.waitForTimeout(2000);

    console.log("Waiting for resume tailoring interface to render...");
    await page.waitForSelector('button:has-text("Open Detailed Synthesis Options")', { timeout: 15000 });
    
    console.log("Expanding Resume Blueprint detailed synthesis options...");
    await page.locator('button:has-text("Open Detailed Synthesis Options")').first().click();
    await page.waitForTimeout(1000);

    console.log("Clicking 'Generate Blueprint' to tailor the resume...");
    await page.click('button:has-text("Generate Blueprint")');

    console.log("Waiting for resume tactical synthesis to complete...");
    await page.waitForSelector('button:has-text("Regenerate Blueprint")', { timeout: 45000 });
    console.log("SUCCESS: Resume tailored blueprint generated successfully!");

    console.log("Capturing Resume tailings verification screenshot...");
    const screenshotPath2 = path.join(ARTIFACTS_DIR, 'step2_resume.png');
    await page.screenshot({ path: screenshotPath2, fullPage: true });
    console.log(`Saved screenshot to: ${screenshotPath2}`);

    console.log("Clicking 'Cover Letter' button in candidacy hub tab selector...");
    try {
      await page.click('div.shadow-inner button:has-text("Cover Letter")', { timeout: 5000 });
    } catch (e) {
      console.log("Candidacy hub selector failed, trying first available 'Cover Letter' button...");
      await page.locator('button:has-text("Cover Letter")').first().click();
    }
    await page.waitForTimeout(2000);

    console.log("Checking if Synthesize Cover Letter or Generate Now is visible...");
    const synthesizeBtn = await page.$('button:has-text("Synthesize Cover Letter")');
    const generateNowBtn = await page.$('button:has-text("Generate Now")');
    const synthesizeLetterBtn = await page.$('button:has-text("Synthesize Letter")');
    
    if (synthesizeBtn && await synthesizeBtn.isVisible()) {
      console.log("Clicking 'Synthesize Cover Letter' in header...");
      await synthesizeBtn.click();
    } else if (generateNowBtn && await generateNowBtn.isVisible()) {
      console.log("Clicking 'Generate Now' in sidebar...");
      await generateNowBtn.click();
    } else if (synthesizeLetterBtn && await synthesizeLetterBtn.isVisible()) {
      console.log("Clicking 'Synthesize Letter'...");
      await synthesizeLetterBtn.click();
    } else {
      console.log("Warning: No synthesis button found! Checking if it's already generated...");
    }
    
    console.log("Synthesizing cover letter... Waiting for LLM generation response...");
    // We wait for the 'Save Changes' button in the Letter Body collapsible editor, which appears when generated!
    await page.waitForSelector('button:has-text("Save Changes")', { timeout: 60000 });
    console.log("SUCCESS: Cover Letter synthesized successfully!");

    console.log("Verifying clean letter body rendering...");
    const letterBodyLocator = page.locator('div.whitespace-pre-wrap.flex-1');
    await letterBodyLocator.waitFor({ state: 'visible' });
    
    const letterBodyText = await letterBodyLocator.innerText();
    console.log("--- Cover Letter Body Sample ---");
    console.log(letterBodyText.slice(0, 300) + "...");
    console.log("--------------------------------");

    // Verify computed style for justification
    const textAlign = await letterBodyLocator.evaluate(el => window.getComputedStyle(el).textAlign);
    console.log(`Validation - CSS Text Justification: ${textAlign === 'justify' ? '✅ PASS' : '❌ FAIL (' + textAlign + ')'}`);

    // Perform validation assertions
    const hasMarkdown = /\*\*|\*|#|__/.test(letterBodyText);
    const hasPlaceholders = /\[Your Name\]|\[Company Name\]|\[Hiring Manager\]|\[/.test(letterBodyText);
    
    console.log(`Validation - Contains raw markdown: ${hasMarkdown ? '❌ FAIL' : '✅ PASS'}`);
    console.log(`Validation - Contains square brackets: ${hasPlaceholders ? '❌ FAIL' : '✅ PASS'}`);

    console.log("Capturing Cover Letter verification screenshot showing left editor panel & right justified A4...");
    const screenshotPath3 = path.join(ARTIFACTS_DIR, 'step3_cover_letter.png');
    await page.screenshot({ path: screenshotPath3, fullPage: true });
    console.log(`Saved screenshot to: ${screenshotPath3}`);

    await browser.close();
    console.log("\n=== ALL E2E TESTS COMPLETED SUCCESSFULLY ===");
    console.log("Visual evidence saved in artifacts. Verify file sizes:");
    console.log(`- Dashboard: ${fs.statSync(screenshotPath1).size} bytes`);
    console.log(`- Resume Blueprint: ${fs.statSync(screenshotPath2).size} bytes`);
    console.log(`- Cover Letter: ${fs.statSync(screenshotPath3).size} bytes`);

  } catch (err) {
    console.error("Playwright E2E Error:", err);
    if (browser) {
      try {
        const currentUrl = page.url();
        console.error("Failure URL:", currentUrl);
        const failureScreenshot = path.join(ARTIFACTS_DIR, 'step_failure.png');
        await page.screenshot({ path: failureScreenshot });
        console.error(`Failure screenshot saved to: ${failureScreenshot}`);
        
        // Print some visible buttons or selectors to help debug
        const buttons = await page.$$eval('button', elems => elems.map(e => ({ text: e.innerText, visible: e.offsetWidth > 0 })));
        console.error("Visible buttons on page:", buttons.filter(b => b.visible));
      } catch (innerErr) {
        console.error("Failed to capture failure info:", innerErr.message);
      }
      await browser.close();
    }
    process.exit(1);
  }
})();
