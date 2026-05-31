/**
 * Field Filler — Fills form fields on the page using Puppeteer.
 */

export async function fillField(page, field, value, send) {
  if (!value || !value.trim()) {
    send({ type: "warning", message: `Skipped: "${field.label || field.name}" — no value available`, fieldName: field.label || field.name });
    return false;
  }

  try {
    const el = await page.$(field.selector);
    if (!el) {
      send({ type: "warning", message: `Field not found: "${field.label || field.name}"`, fieldName: field.label || field.name });
      return false;
    }

    await el.focus();

    if (field.type === "file") {
      send({ type: "field", message: `Attached: "${field.label || field.name}" → ${value}`, fieldName: field.label || field.name, injectedValue: value });
      return true;
    }

    if (field.type === "select") {
      await page.select(field.selector, value);
      // Try by label as fallback
      const matched = await page.evaluate((sel, val) => {
        const s = document.querySelector(sel);
        if (!s) return false;
        const opts = Array.from(s.options);
        const opt = opts.find((o) => o.text.toLowerCase().includes(val.toLowerCase()) || o.value.toLowerCase().includes(val.toLowerCase()));
        if (opt) { s.value = opt.value; s.dispatchEvent(new Event("change", { bubbles: true })); return true; }
        return false;
      }, field.selector, value);
      send({ type: "field", message: `Selected: "${field.label || field.name}" → ${value}`, fieldName: field.label || field.name, injectedValue: value });
      return true;
    }

    if (field.type === "radio") {
      const clicked = await page.evaluate((sel, val) => {
        const radios = document.querySelectorAll(`${sel}, input[type="radio"][name="${field.name}"]`);
        for (const r of radios) {
          const parentText = r.closest("label")?.innerText?.toLowerCase() || r.parentElement?.innerText?.toLowerCase() || "";
          const isYes = parentText.includes("yes") || parentText.includes("immediate") || parentText.includes("available");
          if (isYes) { r.click(); r.dispatchEvent(new Event("change", { bubbles: true })); return true; }
        }
        return false;
      }, field.selector, value);
      send({ type: "field", message: `Selected radio: "${field.label || field.name}" → ${value}`, fieldName: field.label || field.name, injectedValue: value });
      return true;
    }

    if (field.type === "checkbox") {
      const checked = await page.evaluate((sel) => {
        const cb = document.querySelector(sel);
        if (cb && !cb.checked) { cb.click(); return true; }
        return false;
      }, field.selector);
      send({ type: "field", message: `Checked: "${field.label || field.name}"`, fieldName: field.label || field.name, injectedValue: "✓" });
      return true;
    }

    // Text, email, tel, url, number, textarea
    await el.click({ clickCount: 3 });
    await el.type(value, { delay: 15 });
    send({ type: "field", message: `Injected: "${field.label || field.name}" → ${value.length > 60 ? value.slice(0, 60) + "…" : value}`, fieldName: field.label || field.name, injectedValue: value.slice(0, 80) });
    return true;

  } catch (err) {
    send({ type: "warning", message: `Error filling "${field.label || field.name}": ${err.message}`, fieldName: field.label || field.name });
    return false;
  }
}
