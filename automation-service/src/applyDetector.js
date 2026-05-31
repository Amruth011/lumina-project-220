/**
 * Apply Button Detector — Finds "Apply" buttons on the page using multiple strategies.
 */

const APPLY_SELECTORS = [
  "button:has-text('Apply')",
  "button:has-text('apply')",
  "button:has-text('APPLY')",
  "button:has-text('Easy Apply')",
  "button:has-text('easy apply')",
  "a:has-text('Apply')",
  "a:has-text('apply')",
  '[aria-label*="apply" i]',
  '[aria-label*="Apply" i]',
  "button.jobs-apply-button",
  ".jobs-apply-button button",
  ".jobs-apply-button--top-card button",
  "button[data-testid*='apply']",
  "a[data-testid*='apply']",
  "button[class*='apply']",
  "a[class*='apply']",
  '[data-automation*="apply"]',
];

export async function findApplyButton(page) {
  for (const selector of APPLY_SELECTORS) {
    try {
      const btn = await page.$(selector);
      if (btn) {
        const visible = await btn.evaluate((el) => {
          const style = window.getComputedStyle(el);
          return el.offsetParent !== null && style.visibility !== "hidden" && style.display !== "none";
        });
        if (visible) {
          return { button: btn, selector };
        }
      }
    } catch {}
  }

  // Fallback: scan all buttons and links for apply-related text
  const found = await page.evaluate(() => {
    const elements = document.querySelectorAll("button, a");
    for (const el of elements) {
      const text = el.innerText?.toLowerCase() || "";
      if (text.includes("apply") || text.includes("easy apply")) {
        const style = window.getComputedStyle(el);
        if (el.offsetParent !== null && style.visibility !== "hidden" && style.display !== "none") {
          return el.outerHTML;
        }
      }
    }
    return null;
  });

  return found ? { html: found, selector: null } : null;
}

const NEXT_REVIEW_SELECTORS = [
  "button:has-text('Next')",
  "button:has-text('next')",
  "button:has-text('Review')",
  "button:has-text('review')",
  "button[aria-label*='Next']",
  "button[aria-label*='Review']",
];

const SUBMIT_SELECTORS = [
  "button:has-text('Submit')",
  "button:has-text('submit')",
  "button:has-text('Submit application')",
  "button[type='submit']",
  "button[aria-label*='submit' i]",
  "button[aria-label*='Submit']",
  "button[data-testid*='submit']",
];

const DISMISS_SELECTORS = [
  "button:has-text('Done')",
  "button:has-text('done')",
  "button:has-text('Close')",
  "button[aria-label*='Dismiss']",
  "button[aria-label*='Close']",
];

export { NEXT_REVIEW_SELECTORS, SUBMIT_SELECTORS, DISMISS_SELECTORS };
