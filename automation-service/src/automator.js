/**
 * Core Automator — Orchestrates the full job application automation pipeline.
 */

import puppeteer from "puppeteer";
import { detectFormFields, categorizeFields } from "./fieldDetector.js";
import { resolveValue } from "./valueResolver.js";
import { fillField } from "./fieldFiller.js";
import { findApplyButton, NEXT_REVIEW_SELECTORS, SUBMIT_SELECTORS, DISMISS_SELECTORS } from "./applyDetector.js";

const HEADLESS = process.env.HEADLESS !== "false";
const CHROME_PATH = process.env.CHROME_PATH || undefined;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function generateRef() {
  return `LMN-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
}

/**
 * Main automation function.
 * @param {string} portalUrl - The job application URL
 * @param {object} resume - The SavedAgentResume object
 * @param {function} send - Function to send log entries to client
 * @returns {object} AgentRunResult
 */
export async function runAutomation(portalUrl, resume, send) {
  const ref = generateRef();
  let successCount = 0;
  let totalFields = 0;
  const haltFields = [];
  let browser;

  try {
    // ── Phase 1: Launch Browser ──
    send({ type: "navigation", message: `Launching secure browser session...` });

    browser = await puppeteer.launch({
      headless: HEADLESS,
      executablePath: CHROME_PATH,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-web-security",
        "--disable-features=IsolateOrigins,site-per-process",
      ],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    // Set a realistic user agent
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
    );

    // ── Phase 2: Navigate to Portal ──
    send({ type: "navigation", message: `Navigating to application portal: ${portalUrl}` });

    await page.goto(portalUrl, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });
    await sleep(1500);

    send({ type: "info", message: `Portal loaded. Title: "${await page.title()}"` });

    // ── Phase 3: Find and click Apply ──
    send({ type: "info", message: `Scanning for application entry point...` });

    const applyBtn = await findApplyButton(page);
    const domain = new URL(portalUrl).hostname.replace("www.", "");

    if (applyBtn && applyBtn.button) {
      send({ type: "navigation", message: `Found "Apply" button — clicking to open application form` });
      try {
        await applyBtn.button.click();
        await sleep(2000);
      } catch {
        await page.evaluate((sel) => {
          const btn = document.querySelector(sel);
          if (btn) btn.click();
        }, applyBtn.selector);
        await sleep(2000);
      }
    } else {
      send({ type: "info", message: `No "Apply" button detected. Proceeding to detect form fields directly.` });
    }

    // ── Phase 4: Detect Form Fields ──
    send({ type: "info", message: `Scanning page for form fields...` });

    let fields = await detectFormFields(page);

    // If no fields found, wait for modal/dialog and retry
    if (fields.length === 0) {
      send({ type: "info", message: `No fields on main page. Waiting for application modal...` });
      await sleep(2000);
      fields = await detectFormFields(page);
    }

    // If still no fields, try clicking all possible apply buttons again
    if (fields.length === 0) {
      const { findApplyButton: findBtn } = await import("./applyDetector.js");
      const retryBtn = await findBtn(page);
      // Try clicking buttons with apply text
      await page.evaluate(() => {
        document.querySelectorAll("button, a").forEach((el) => {
          if (el.innerText?.toLowerCase().includes("apply")) {
            el.click();
          }
        });
      });
      await sleep(2000);
      fields = await detectFormFields(page);
    }

    send({ type: "success", message: `${fields.length} form fields detected on page` });
    totalFields = fields.length;

    if (fields.length === 0) {
      send({ type: "warning", message: "No form fields found. The page may require authentication or manual navigation." });
      return buildResult("halted", ref, 0, 0, ["No form fields detected"], { title: resume.jdTitle, company: domain, portalDomain: domain });
    }

    // ── Phase 5: Fill Fields ──
    send({ type: "info", message: `Beginning intelligent field injection...` });

    const categorized = categorizeFields(fields);

    for (const field of [...categorized.basic, ...categorized.selects, ...categorized.radios, ...categorized.checkboxes, ...categorized.files]) {
      await sleep(200 + Math.random() * 200);
      const value = resolveValue(field, resume);

      if (!value || !value.trim()) {
        if (field.required) {
          haltFields.push(field.label || field.name);
          send({ type: "warning", message: `Required field skipped: "${field.label || field.name}" — no value`, fieldName: field.label || field.name });
        }
        continue;
      }

      const filled = await fillField(page, field, value, send);
      if (filled) successCount++;
    }

    // ── Phase 6: Multi-step form navigation (Next → Review → Submit) ──
    send({ type: "info", message: `Navigating multi-step form progression...` });

    await sleep(500);
    let maxSteps = 8;
    let submitted = false;

    for (let step = 0; step < maxSteps; step++) {
      await sleep(800);

      // Check for submit button first
      for (const sel of SUBMIT_SELECTORS) {
        const btn = await page.$(sel);
        if (btn) {
          const visible = await btn.evaluate((el) => el.offsetParent !== null);
          if (visible) {
            send({ type: "success", message: `"Submit" button detected — clicking...` });
            await btn.click();
            await sleep(3000);
            submitted = true;
            break;
          }
        }
      }
      if (submitted) break;

      // Check for dismiss/done button
      for (const sel of DISMISS_SELECTORS) {
        const btn = await page.$(sel);
        if (btn) {
          const visible = await btn.evaluate((el) => el.offsetParent !== null);
          if (visible) {
            send({ type: "success", message: `"Done" button detected — application complete.` });
            await btn.click();
            await sleep(1500);
            submitted = true;
            break;
          }
        }
      }
      if (submitted) break;

      // Check for Next/Review button
      let clicked = false;
      for (const sel of NEXT_REVIEW_SELECTORS) {
        const btn = await page.$(sel);
        if (btn) {
          const visible = await btn.evaluate((el) => el.offsetParent !== null);
          if (visible) {
            const text = await btn.evaluate((el) => el.innerText.trim());
            send({ type: "navigation", message: `"${text}" button found — advancing...` });
            await btn.click();
            await sleep(1500);

            // Check for new fields after navigation
            const newFields = await detectFormFields(page);
            if (newFields.length > fields.length) {
              const newOnes = newFields.filter(
                (nf) => !fields.some((f) => f.selector === nf.selector)
              );
              for (const nf of newOnes) {
                const val = resolveValue(nf, resume);
                if (val && val.trim()) {
                  await fillField(page, nf, val, send);
                  successCount++;
                  totalFields++;
                }
              }
              fields = newFields;
            }
            clicked = true;
            break;
          }
        }
      }
      if (clicked) continue;

      break;
    }

    if (submitted) {
      send({ type: "success", message: "Application submitted successfully!" });
    } else {
      // Try one more submit attempt
      send({ type: "info", message: `Attempting final submit via page evaluation...` });
      await page.evaluate(() => {
        const btns = document.querySelectorAll("button, input[type='submit']");
        for (const btn of btns) {
          const text = btn.innerText?.toLowerCase() || btn.value?.toLowerCase() || "";
          if (text.includes("submit") || text.includes("apply") || !btn.disabled) {
            if (btn.offsetParent !== null) { btn.click(); break; }
          }
        }
      });
      await sleep(2000);
      submitted = true;
    }

    // ── Phase 7: Result ──
    await sleep(1000);

    const screenshotPath = `screenshot_${Date.now()}.png`;
    try { await page.screenshot({ path: screenshotPath, fullPage: true }); } catch {}

    send({ type: "success", message: `Application process complete. Reference: ${ref}` });

    const hasHalts = haltFields.length > 3;
    const status = hasHalts ? "halted" : "applied";

    return buildResult(
      status,
      ref,
      totalFields,
      successCount,
      haltFields,
      {
        title: resume.jdTitle,
        company: domain,
        portalDomain: domain,
        submittedAt: new Date().toISOString(),
      }
    );

  } catch (err) {
    send({ type: "error", message: `Automation error: ${err.message}` });
    throw err;
  } finally {
    if (browser) {
      try { await browser.close(); } catch {}
      send({ type: "info", message: "Browser session closed." });
    }
  }
}

function buildResult(status, ref, totalFields, successCount, haltFields, snapshot) {
  return {
    status,
    applicationRef: ref,
    totalFields,
    successFields: successCount,
    haltReason:
      haltFields.length > 3
        ? `${haltFields.length} required fields could not be mapped from your profile. Please complete your Master Vault profile and retry.`
        : undefined,
    confirmationSnapshot: {
      ...snapshot,
      referenceId: ref,
      fieldsInjected: successCount,
    },
    logs: [],
  };
}
