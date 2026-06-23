import { describe, it, expect } from "vitest";

// Local copies of the edge function helpers to verify their logic
function removeFluff(text: string): string {
  if (!text) return "";
  return text
    .replace(/\b[Dd]elve\b/g, "focus")
    .replace(/\b[Ll]everage\b/g, "utilize")
    .replace(/\b[Rr]obust\b/g, "scalable")
    .replace(/\b[Cc]ollaborated\b/g, "architected")
    .replace(/\b[Uu]tilised\b/g, "implemented")
    .replace(/\b[Uu]tilized\b/g, "deployed");
}

function adjustBullet(bullet: string): string {
  let b = bullet.trim();
  b = b.replace(/^[•\-*\s]+/, "");
  
  if (b.length < 100) {
    const paddings = [
      " utilizing advanced methodologies and best engineering practices.",
      " to optimize scalability, resilience, and general system performance.",
      " to deliver high-quality code and support business expansion goals.",
      " to ensure robust data integrity, security, and systems stability.",
      " to enhance team velocity and overall project execution efficiency."
    ];
    let padded = b;
    for (const pad of paddings) {
      if (!b.toLowerCase().includes(pad.split(" ")[1])) {
        padded = b.endsWith(".") ? b.slice(0, -1) + pad : b + pad;
        break;
      }
    }
    if (padded.length < 100) {
      padded = padded.endsWith(".") ? padded.slice(0, -1) + " for technical excellence." : padded + " for technical excellence.";
    }
    b = padded;
  }
  
  if (b.length > 260) {
    b = b.slice(0, 257);
    const lastSpace = b.lastIndexOf(" ");
    if (lastSpace > 50) {
      b = b.slice(0, lastSpace);
    }
    b = b.trim();
    if (!b.endsWith(".")) b += "...";
  }
  
  return b;
}

function countSentences(text: string): number {
  if (!text) return 0;
  const parts = text.split('.').map(s => s.trim()).filter(Boolean);
  return parts.length;
}

function ensureArray(val: unknown): string[] {
  if (Array.isArray(val)) {
    return val.map(v => removeFluff(String(v || "")));
  }
  if (typeof val === "string" && val.trim()) {
    return [removeFluff(val.trim())];
  }
  return [];
}

describe("ATS Resume Architect Edge Function Logic", () => {
  describe("Helper Functions", () => {
    it("should remove fluff words and replace them with standard engineering terms", () => {
      expect(removeFluff("I want to delve into the robust codebase.")).toBe("I want to focus into the scalable codebase.");
      expect(removeFluff("leverage the team and collaborated with them.")).toBe("utilize the team and architected with them.");
      expect(removeFluff("utilised and utilized new tech")).toBe("implemented and deployed new tech");
    });

    it("should adjust bullet length if it is below 100 characters", () => {
      const shortBullet = "Optimized database queries.";
      const adjusted = adjustBullet(shortBullet);
      expect(adjusted.length).toBeGreaterThanOrEqual(100);
      expect(adjusted.length).toBeLessThanOrEqual(260);
      expect(adjusted).toContain("database queries");
    });

    it("should truncate bullet length if it exceeds 260 characters", () => {
      const longBullet = "Optimized database queries and built indexes on high-throughput columns to ensure the system is extremely fast, highly scalable, and completely reliable. This work also helped to reduce overall page load times and improve server CPU utilization significantly across all core services in the production cluster. ".repeat(3);
      const adjusted = adjustBullet(longBullet);
      expect(adjusted.length).toBeLessThanOrEqual(260);
      expect(adjusted.endsWith("...") || adjusted.endsWith(".")).toBe(true);
    });

    it("should count sentences correctly", () => {
      expect(countSentences("Sentence 1. Sentence 2. Sentence 3.")).toBe(3);
      expect(countSentences("Sentence 1. Sentence 2. Sentence 3")).toBe(3);
      expect(countSentences("")).toBe(0);
    });

    it("should ensure value is converted to a sanitized array", () => {
      expect(ensureArray(["delve", "leverage"])).toEqual(["focus", "utilize"]);
      expect(ensureArray("robust")).toEqual(["scalable"]);
      expect(ensureArray(null)).toEqual([]);
    });
  });
});
