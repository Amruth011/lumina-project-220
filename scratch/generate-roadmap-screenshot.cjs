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
const ARTIFACTS_DIR = 'C:/Users/shara/.gemini/antigravity/brain/b2cd4731-3598-44b1-a41f-71c468839cc1';

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
      viewport: { width: 1280, height: 1000 }
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

    console.log("Injecting local storage keys to prevent overlays...");
    await page.evaluate(() => {
      localStorage.setItem("lumina_onboarding_complete", "true");
      localStorage.setItem("lumina_dashboard_tour_complete", "true");
    });
    
    console.log("Waiting 4 seconds for auth success toasts to fade...");
    await page.waitForTimeout(4000);

    console.log("Checking if Decode button or Tailor My Resume is visible...");
    try {
      await Promise.any([
        page.waitForSelector('button:has-text("Tailor My Resume")', { timeout: 15000 }),
        page.waitForSelector('button:has-text("Decode Job Description")', { timeout: 15000 })
      ]);
    } catch (e) {
      console.log("Neither button appeared quickly. Checking textarea.");
    }

    const tailorBtn = await page.$('button:has-text("Tailor My Resume")');
    if (tailorBtn && await tailorBtn.isVisible()) {
      console.log("Dashboard already decoded. Excellent.");
    } else {
      console.log("Pasting Job Description into decoding textarea...");
      const textareaSelector = 'textarea[placeholder*="Paste complete \'About the Job\'"]';
      await page.waitForSelector(textareaSelector, { timeout: 10000 });
      await page.fill(textareaSelector, MOCK_JD);
      await page.waitForTimeout(1000);

      const decodeBtn = await page.$('button:has-text("Decode Job Description")');
      if (decodeBtn && await decodeBtn.isVisible()) {
        console.log("Clicking Decode button...");
        await decodeBtn.click();
      }
      
      console.log("Waiting for analysis to complete...");
      await page.waitForSelector('button:has-text("Tailor My Resume")', { timeout: 45000 });
    }

    console.log("Navigating to Roadmap Tab in navigation/navbar...");
    const roadmapTab = page.locator('button:has-text("Roadmap"), a:has-text("Roadmap"), [role="tab"]:has-text("Roadmap")').first();
    await roadmapTab.waitFor({ state: 'visible', timeout: 15000 });
    await roadmapTab.click();
    await page.waitForTimeout(2000);

    console.log("Waiting for Adaptive Upskilling Roadmap configuration screen...");
    await page.waitForSelector('text=Adaptive Upskilling Roadmap', { timeout: 15000 });

    console.log("Opening learning duration dropdown...");
    // The dropdown selector defaults to "4 Weeks", click it
    await page.click('button:has-text("4 Weeks"), button:has-text("3 Months"), button:has-text("1 Week")');
    await page.waitForTimeout(1000);

    console.log("Selecting '1 Year' duration option...");
    await page.click('button:has-text("1 Year")');
    await page.waitForTimeout(1000);

    console.log("Clicking 'Generate Syllabus' button...");
    await page.click('button:has-text("Generate Syllabus")');
    console.log("Generating Roadmap Syllabus... This triggers Groq LLM fallback pipeline.");

    // Wait for Overall Mastery Progress to render (confirming roadmap generation is complete)
    console.log("Waiting for Roadmap Timeline to compile and render (up to 60 seconds)...");
    await page.waitForSelector('text=Overall Mastery Progress', { timeout: 90000 });
    console.log("SUCCESS: 1 Year Upskilling Roadmap compiled and rendered perfectly!");

    console.log("Waiting 3 seconds for UI styles and scrollable stepper timeline to settle...");
    await page.waitForTimeout(3000);

    console.log("Capturing high-resolution full-page screenshot of generated Roadmap...");
    const screenshotPath = path.join(ARTIFACTS_DIR, 'roadmap_one_year.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`Saved screenshot to: ${screenshotPath}`);

    await browser.close();
    console.log("=== AUTOMATED ROADMAP VALIDATION COMPLETE SUCCESSFULLY ===");
    console.log(`Generated file size: ${fs.statSync(screenshotPath).size} bytes`);
    process.exit(0);

  } catch (err) {
    console.error("Playwright E2E Error:", err);
    if (browser) {
      try {
        console.error("Failure URL:", page.url());
        const failureScreenshot = path.join(ARTIFACTS_DIR, 'roadmap_failure.png');
        await page.screenshot({ path: failureScreenshot });
        console.error(`Failure screenshot saved to: ${failureScreenshot}`);
      } catch (innerErr) {
        console.error("Failed to capture failure info:", innerErr.message);
      }
      await browser.close();
    }
    process.exit(1);
  }
})();
