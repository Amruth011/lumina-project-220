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
const LOCAL_URL = 'http://localhost:8080';
const ARTIFACTS_DIR = 'C:/Users/shara/.gemini/antigravity/brain/a994a244-9a5a-4d17-8608-1fe027183070';

// NEW Deloitte Data Scientist / DEC Manager Job Description
const NEW_DELOITTE_JD = `About the job
Your potential, unleashed.

India’s impact on the global economy has increased at an exponential rate and Deloitte presents an opportunity to unleash and realise your potential amongst cutting edge leaders, and organisations shaping the future of the region, and indeed, the world beyond.

At Deloitte, your whole self to work, every day. Combine that with our drive to propel with purpose and you have the perfect playground to collaborate, innovate, grow, and make an impact that matters.

The team
The Digital Excellence Centre is responsible for building products and platforms for Deloitte India that focuses on providing extraordinary customer experience by putting design thinking with trailblazing technology in the center of what they do. The diverse team consists of subject matter experts, technology specialists, quality engineers, user experience researchers & designers, data scientists and product managers

Your work profile
As a Manager in our DEC Team you’ll build and nurture positive working relationships with teams and clients with the intention to exceed client expectations: -

Work you’ll do
As a Data Scientist, you will play a crucial role in the development and implementation of cutting-edge artificial intelligence products. Your responsibilities will involve designing and constructing sophisticated machine learning models, as well as refining and updating existing systems.
In order to thrive in this position, you must possess exceptional skills in statistics and programming, as well as a deep understanding of data science and software engineering principles.
Your ultimate objective will be to create highly efficient self-learning applications that can adapt and evolve over time, pushing the boundaries of AI technology.

Responsibilities:
Partner closely with stakeholders to identify high-impact applications of data to solve meaningful business problems.
Identify, mine, and analyze medium and large size datasets to unearth insights that drive new business value for clients.
Develop robust statistical and machine learning models and implement processes to evaluate, automate and improve model performance.
Lead efforts with various functions to test, deploy and iterate on data science solutions
Build, execute, and evaluate A/B tests
Provide feedback to improve the quality of data collection to ensure adequacy, accuracy and legitimacy of data (e.g. this could involve cross-checking of different sources and validating the correlation between them)

As a prospective candidate, you should possess:
Ability to process complex data sets
Ability to perform exploratory data analysis to discover interesting trends and relationships
Experience applying statistical modelling, machine learning, NLP, and other quantitative techniques to solve business problems
Experience in deep learning
Possess understanding of and ability to communicate statistics to experts and non-experts
Creative thinker who has proven ability to innovate through data exploration and application of solutions
Ability to thrive in an environment that requires flexibility and multi-tasking
Ability to take initiative and work with high level of independence
Strong technical and remote collaboration skills are a must
Any exposure to Generative AI would be a great addition.

Desired qualifications:
Graduation
Graduation from Eng. Background Preferred
 
Location and way of working
Base location: Bangalore
This profile does not involve extensive travel for work.
Hybrid is our default way of working. Each domain has customised the hybrid approach to their unique needs.
 
Your role as a Manager
We expect our people to embrace and live our purpose by challenging themselves to identify issues that are most important for our clients, our people, and for society.

In addition to living our purpose, Executive across our organization must strive to be:
Inspiring - Leading with integrity to build inclusion and motivation
Committed to creating purpose - Creating a sense of vision and purpose
Agile - Achieving high-quality results through collaboration and Team unity
Skilled at building diverse capability - Developing diverse capabilities for the future
Persuasive / Influencing - Persuading and influencing stakeholders
Collaborating - Partnering to build new solutions
Delivering value - Showing commercial acumen
Committed to expanding business - Leveraging new business opportunities
Analytical Acumen - Leveraging data to recommend impactful approach and solutions through the power of analysis and visualization
Effective communication – Must be well abled to have well-structured and well-articulated conversations to achieve win-win possibilities
Engagement Management / Delivery Excellence - Effectively managing engagement(s) to ensure timely and proactive execution as well as course correction for the success of engagement(s)
Managing change - Responding to changing environment with resilience
Managing Quality & Risk - Delivering high quality results and mitigating risks with utmost integrity and precision
Strategic Thinking & Problem Solving - Applying strategic mindset to solve business issues and complex problems
Tech Savvy - Leveraging ethical technology practices to deliver high impact for clients and for Deloitte
Empathetic leadership and inclusivity - creating a safe and thriving environment where everyone's valued for who they are, use empathy to understand others to adapt our behaviours and attitudes to become more inclusive.`;

(async () => {
  console.log("=== STEP 1: VERIFYING DATABASE AUTH SEEDING ===");
  let userId;
  try {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });

    if (authError) {
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: TEST_EMAIL,
        password: TEST_PASSWORD
      });
      if (signInError) throw signInError;
      userId = signInData.user.id;
    } else {
      userId = authData.user.id;
    }
    console.log(`Seeded user authenticated successfully (ID: ${userId})`);

    const { data: profileData } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (!profileData) {
      await supabase.from('profiles').insert({
        id: userId,
        full_name: "Deloitte Aspirant",
        email: TEST_EMAIL,
        location: "Bangalore, India",
        phone: "+91 9988776655",
        linkedin_url: "https://linkedin.com/in/deloittecandidate",
        github_url: "https://github.com/deloittecandidate"
      });
      console.log("User Profile row created successfully.");
    }
  } catch (err) {
    console.warn("DB Seeding Warning (continuing anyway):", err.message);
  }

  console.log("\n=== STEP 2: LAUNCHING ISOLATED HEADLESS PLAYWRIGHT BROWSER ===");
  let browser;
  let page;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1440, height: 960 }
    });
    page = await context.newPage();

    page.on('console', msg => {
      const txt = msg.text();
      if (txt.includes('Forensic') || txt.includes('Engine') || txt.includes('Active') || txt.includes('HEURISTIC')) {
        console.log(`[BROWSER CONSOLE] ${msg.type().toUpperCase()}: ${txt}`);
      }
    });

    console.log(`Navigating to local portal at ${LOCAL_URL}/auth...`);
    await page.goto(`${LOCAL_URL}/auth`);

    console.log("Injecting skipping and OFFLINE HEURISTIC engine mode in localStorage...");
    await page.evaluate(() => {
      localStorage.setItem("lumina_onboarding_complete", "true");
      localStorage.setItem("lumina_dashboard_tour_complete", "true");
      localStorage.setItem("lumina_engine_mode", "heuristic");
    });

    console.log("Clicking email auth method...");
    await page.click('button:has-text("Continue with Email & Password")');
    await page.waitForTimeout(500);

    console.log("Entering email and password...");
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);

    console.log("Clicking Sign In...");
    await page.click('button:has-text("Sign In to Lumina")');

    console.log("Waiting for dashboard redirect...");
    await page.waitForURL('**/dashboard', { timeout: 25000 });
    console.log("Successfully authenticated! Landing page:", page.url());

    // Inject bypass keys again to ensure no modals are displayed and heuristic mode remains active
    await page.evaluate(() => {
      localStorage.setItem("lumina_onboarding_complete", "true");
      localStorage.setItem("lumina_dashboard_tour_complete", "true");
      localStorage.setItem("lumina_engine_mode", "heuristic");
    });
    await page.waitForTimeout(3000); // Wait for animations/toasts

    // Check if the dashboard already has results loaded
    const scanNewBtn = await page.$('button:has-text("Scan New JD")');
    if (scanNewBtn && await scanNewBtn.isVisible()) {
      console.log("Stale dashboard detected. Clicking 'Scan New JD' to clean state...");
      await scanNewBtn.click();
      await page.waitForTimeout(1500);
    }

    console.log("Filling Deloitte Manager Data Scientist JD...");
    const textareaSelector = 'textarea[placeholder*="Paste complete \'About the Job\'"]';
    await page.waitForSelector(textareaSelector, { timeout: 10000 });
    await page.fill(textareaSelector, NEW_DELOITTE_JD);
    await page.waitForTimeout(1000);

    console.log("Executing Offline Heuristic Decoding Engine...");
    const decodeBtn = await page.$('button:has-text("Decode Job Description")');
    if (decodeBtn) {
      await decodeBtn.click();
    } else {
      throw new Error("Could not locate Decode button!");
    }

    console.log("Decoder Active. Running heuristic parsing algorithms...");
    // Wait until the "Scan New JD" button appears, indicating the dashboard is compiled and active!
    await page.waitForSelector('button:has-text("Scan New JD")', { timeout: 20000 });
    console.log("SUCCESS: Deloitte Bangalore Data Scientist JD decoded and rendered successfully!");

    console.log("Waiting 4 seconds for UI transitions to settle...");
    await page.waitForTimeout(4000);

    const screenshotPath = path.join(ARTIFACTS_DIR, 'deloitte_data_scientist_heuristic_decoded.png');
    console.log(`Saving high-resolution workspace screenshot to: ${screenshotPath}`);
    await page.screenshot({ path: screenshotPath, fullPage: true });

    // Extract basic dashboard elements to verify correctness
    const titleText = await page.locator('h1, h2, .font-display').first().textContent();
    console.log(`Decoded Job Title in UI: ${titleText?.trim()}`);

    const verdictText = await page.locator('text=Forensic scan of').textContent();
    console.log(`Decoded Verdict Text: ${verdictText?.trim()}`);

    await browser.close();
    console.log("=== PLAYWRIGHT HEURISTIC DECODE PIPELINE COMPLETE ===");
    process.exit(0);

  } catch (err) {
    console.error("Playwright Heuristic Automation Error:", err);
    if (browser) {
      const failureScreenshot = path.join(ARTIFACTS_DIR, 'deloitte_heuristic_failure.png');
      try {
        await page.screenshot({ path: failureScreenshot });
        console.error(`Saved error snapshot to: ${failureScreenshot}`);
      } catch (inner) {
        console.error("Failed to capture error snapshot:", inner.message);
      }
      await browser.close();
    }
    process.exit(1);
  }
})();
