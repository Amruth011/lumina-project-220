import type { AnswerPack } from "./smartApply";

/**
 * Builds a self-contained bookmarklet (javascript: URL) that, when clicked on
 * any job-application page, walks the DOM and fills in inputs/textareas it
 * can confidently match against the user's answer pack. Works on most
 * Greenhouse / Lever / Ashby / Workable / generic HTML forms.
 *
 * Everything is inlined into the URL because bookmarklets can't load
 * external scripts (CSP would block them on most ATS sites).
 */
export function buildBookmarkletUrl(pack: AnswerPack): string {
  const data = {
    fullName: pack.fullName,
    firstName: pack.firstName,
    lastName: pack.lastName,
    email: pack.email,
    phone: pack.phone,
    location: pack.location,
    linkedin: pack.linkedin,
    github: pack.github,
    website: pack.website,
    summary: pack.summary,
    whyThisRole: pack.whyThisRole,
  };

  // NOTE: keep this function self-contained — no closures over outer vars.
  const runner = function (DATA: Record<string, string>) {
    const MAP: Record<string, string[]> = {
      fullName: ["full name", "your name", "name", "candidate name"],
      firstName: ["first name", "given name", "forename", "fname"],
      lastName: ["last name", "family name", "surname", "lname"],
      email: ["email", "e-mail", "email address"],
      phone: ["phone", "mobile", "telephone", "phone number"],
      location: ["location", "city", "address", "current location"],
      linkedin: ["linkedin", "linkedin url", "linkedin profile"],
      github: ["github", "github url", "portfolio url"],
      website: ["website", "personal website", "portfolio"],
      summary: ["summary", "about you", "bio", "introduction"],
      whyThisRole: [
        "why",
        "cover letter",
        "why this role",
        "why are you interested",
        "tell us about yourself",
      ],
    };

    function labelFor(el: HTMLElement): string {
      const id = el.getAttribute("id");
      if (id) {
        const lbl = document.querySelector('label[for="' + id + '"]');
        if (lbl && lbl.textContent) return lbl.textContent.toLowerCase();
      }
      const wrap = el.closest("label");
      if (wrap && wrap.textContent) return wrap.textContent.toLowerCase();
      const aria = el.getAttribute("aria-label") || "";
      const ph = el.getAttribute("placeholder") || "";
      const nm = el.getAttribute("name") || "";
      return (aria + " " + ph + " " + nm).toLowerCase();
    }

    function setValue(el: HTMLInputElement | HTMLTextAreaElement, v: string) {
      const proto = el instanceof HTMLTextAreaElement
        ? window.HTMLTextAreaElement.prototype
        : window.HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
      if (setter) setter.call(el, v);
      else el.value = v;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    }

    let filled = 0;
    const fields = Array.from(
      document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
        'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="checkbox"]):not([type="radio"]):not([type="file"]), textarea',
      ),
    );

    fields.forEach((el) => {
      if (el.value && el.value.trim().length > 0) return;
      const lbl = labelFor(el);
      for (const key in MAP) {
        if (!DATA[key]) continue;
        if (MAP[key].some((k) => lbl.includes(k))) {
          setValue(el, DATA[key]);
          filled++;
          break;
        }
      }
    });

    const msg = "Lumina Autofill: filled " + filled + " field" + (filled === 1 ? "" : "s") + ".";
    const toast = document.createElement("div");
    toast.textContent = msg;
    toast.style.cssText =
      "position:fixed;top:20px;right:20px;z-index:2147483647;background:#10B981;color:#fff;padding:10px 18px;border-radius:12px;font:600 13px/1.2 -apple-system,system-ui,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.18)";
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
  };

  const body = `(${runner.toString()})(${JSON.stringify(data)});`;
  return "javascript:" + encodeURIComponent(body);
}
