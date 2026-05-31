/**
 * Field Detector — Scans a page for interactive form fields
 * and identifies their labels, types, and selectors.
 */

const FIELD_TYPES = ["text", "email", "tel", "url", "number", "textarea", "select", "radio", "checkbox", "file"];

export async function detectFormFields(page) {
  const fields = await page.evaluate(() => {
    const results = [];

    const getLabelForElement = (el) => {
      if (el.id) {
        const label = document.querySelector(`label[for="${el.id}"]`);
        if (label) return label.innerText.trim();
      }
      const parent = el.closest("label");
      if (parent) return parent.innerText.trim();
      const parentWithLabel = el.closest("[class*='form'], [class*='field'], [class*='input-group'], div");
      if (parentWithLabel) {
        const labelEl = parentWithLabel.querySelector("label, span[class*='label'], legend");
        if (labelEl) return labelEl.innerText.trim();
      }
      const ariaLabel = el.getAttribute("aria-label");
      if (ariaLabel) return ariaLabel.trim();
      const placeholder = el.getAttribute("placeholder");
      if (placeholder) return placeholder.trim();
      return "";
    };

    const processElement = (el) => {
      const tag = el.tagName.toLowerCase();
      const type = (el.getAttribute("type") || "text").toLowerCase();
      const name = el.getAttribute("name") || el.getAttribute("id") || "";
      const required = el.hasAttribute("required") || el.getAttribute("aria-required") === "true";

      if (tag === "input" && (type === "submit" || type === "button" || type === "hidden" || type === "image")) {
        return;
      }
      if (tag === "button") return;

      const label = getLabelForElement(el);
      if (!label && !name && !required) return;
      if (el.offsetParent === null) return;

      let fieldType = type;
      if (tag === "textarea") fieldType = "textarea";
      if (tag === "select") fieldType = "select";
      if (type === "radio" || type === "checkbox") fieldType = type;

      results.push({
        tag,
        type: fieldType,
        name,
        label,
        required,
        placeholder: el.getAttribute("placeholder") || "",
        visible: true,
        selector: buildUniqueSelector(el),
      });
    };

    const buildUniqueSelector = (el) => {
      if (el.id) return `#${CSS.escape(el.id)}`;
      const path = [];
      let current = el;
      while (current && current !== document.body) {
        let selector = current.tagName.toLowerCase();
        if (current.id) {
          path.unshift(`#${CSS.escape(current.id)}`);
          break;
        }
        if (current.className && typeof current.className === "string") {
          const classes = current.className.trim().split(/\s+/).slice(0, 2);
          if (classes.length > 0 && classes[0]) {
            selector += "." + classes.map((c) => CSS.escape(c)).join(".");
          }
        }
        const parent = current.parentElement;
        if (parent) {
          const siblings = Array.from(parent.querySelectorAll(`:scope > ${current.tagName.toLowerCase()}`));
          if (siblings.length > 1) {
            const idx = siblings.indexOf(current) + 1;
            selector += `:nth-of-type(${idx})`;
          }
        }
        path.unshift(selector);
        current = current.parentElement;
      }
      return path.join(" > ");
    };

    // Find all inputs, textareas, selects
    const elements = document.querySelectorAll("input, textarea, select");
    elements.forEach(processElement);

    return results;
  });

  return fields;
}

export function categorizeFields(fields) {
  const categorized = { basic: [], selects: [], radios: [], checkboxes: [], files: [] };

  for (const f of fields) {
    if (f.type === "file") categorized.files.push(f);
    else if (f.type === "select") categorized.selects.push(f);
    else if (f.type === "radio") categorized.radios.push(f);
    else if (f.type === "checkbox") categorized.checkboxes.push(f);
    else categorized.basic.push(f);
  }

  return categorized;
}
