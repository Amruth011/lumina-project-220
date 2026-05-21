const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log(`[CONSOLE] ${msg.type().toUpperCase()}: ${msg.text()}`));
  
  console.log("Navigating to auth...");
  await page.goto('https://lumina-jd-scanner.vercel.app/auth');
  
  await page.click('button:has-text("Continue with Email & Password")');
  await page.waitForTimeout(1000);
  
  await page.fill('input[type="email"]', 'tester.lumina@gmail.com');
  await page.fill('input[type="password"]', 'TestPassword123!');
  await page.click('button:has-text("Sign In to Lumina")');
  
  console.log("Waiting for /dashboard...");
  await page.waitForURL('**/dashboard', { timeout: 15000 });
  console.log("Logged in! URL is:", page.url());
  
  // Wait for loading to finish
  await page.waitForTimeout(4000);
  
  // Check what's in local storage and supabase session
  const info = await page.evaluate(async () => {
    const ls = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      ls[key] = localStorage.getItem(key);
    }
    
    // Check if we can find supabase key in localStorage
    const sbKey = Object.keys(ls).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
    let sessionUser = null;
    if (sbKey) {
      const parsed = JSON.parse(ls[sbKey]);
      sessionUser = parsed?.user;
    }
    
    return {
      localStorage: ls,
      sessionUser: sessionUser
    };
  });
  
  console.log("Session User:", info.sessionUser);
  console.log("LocalStorage Keys:", Object.keys(info.localStorage));
  
  // Now navigate to generator
  console.log("Clicking Generator in navbar...");
  await page.click('button:has-text("Generator")');
  await page.waitForTimeout(2000);
  
  // Check if we can run select on master_vault from browser context!
  const vaultItems = await page.evaluate(async () => {
    // We can access supabase client from window if it's exposed, or try to query the DOM
    const buttons = Array.from(document.querySelectorAll('button')).map(b => b.innerText);
    return {
      buttons: buttons
    };
  });
  
  console.log("Buttons on Generator Page:", vaultItems.buttons);
  
  await browser.close();
})();
