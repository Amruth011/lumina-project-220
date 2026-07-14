import type { GeneratedResume, GeneratedResumeSection } from "@/types/jd";
import type { VaultItem } from "@/types/jd";
import type jsPDF from "jspdf";

export const ensureArray = (arr: unknown): unknown[] => Array.isArray(arr) ? arr : [];

export const sanitizePdfText = (text: string): string => {
  if (!text) return "";
  return text
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u20B9/g, "Rs. ")
    .replace(/\u00B9/g, "1")
    .replace(/\u00B2/g, "2")
    .replace(/\u00B3/g, "3")
    .replace(/\u00A0/g, " ");
};

export const getModeOrLocation = (modeAndLocRaw: string, defaultLoc: string): string => {
  const raw = (modeAndLocRaw || "").trim();
  if (!raw) return defaultLoc;
  if (raw.toLowerCase().includes("remote")) return "Remote";
  const match = raw.match(/\(([^)]+)\)/);
  if (match && match[1]) return match[1].trim();
  if (raw.toLowerCase().includes("on-site") || raw.toLowerCase().includes("on site")) return defaultLoc || "On-site";
  return raw;
};

export const parseProductOrProjectContent = (contentStr: string) => {
  const raw = contentStr || "";
  const urlRegex = /(https?:\/\/[^\s|]+|github\.com\/[^\s|]+|[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\/[^\s|]*|[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
  const matches = raw.match(urlRegex) || [];
  const uniqueUrls: string[] = [];
  const seen = new Set<string>();
  matches.forEach(u => {
    const norm = u.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "").trim();
    if (norm && !seen.has(norm)) { seen.add(norm); uniqueUrls.push(u.trim()); }
  });
  let statusOrYear = raw;
  uniqueUrls.forEach(url => { statusOrYear = statusOrYear.split(url).join(""); });
  statusOrYear = statusOrYear.replace(/[|\s-–—]+/g, " ").trim();
  if (statusOrYear.toLowerCase() === "live" || statusOrYear.toLowerCase() === "live |" || statusOrYear.toLowerCase() === "| live") statusOrYear = "";
  if (statusOrYear === "|" || statusOrYear === "-" || statusOrYear === "–" || statusOrYear === "—") statusOrYear = "";
  const parts: string[] = [];
  if (statusOrYear) parts.push(statusOrYear);
  uniqueUrls.forEach(url => parts.push(url));
  return { statusOrYear, urls: uniqueUrls, pdfString: parts.join(" | ") };
};

export const measureOrDrawRightSideLinks = (
  pdf: jsPDF,
  statusOrYear: string,
  urls: string[],
  y: number,
  margin: number,
  pageWidth: number,
  bodyFontSize: number,
  currentFont: string,
  draw = true
): number => {
  pdf.setFont(currentFont, "normal");
  pdf.setFontSize(bodyFontSize - 1);
  const segments: Array<{ text: string; isLink: boolean; url?: string }> = [];
  if (statusOrYear) segments.push({ text: statusOrYear, isLink: false });
  urls.forEach(url => {
    const isGithub = url.toLowerCase().includes("github.com");
    const label = isGithub ? "GitHub" : "Live Link";
    const href = url.startsWith("http") ? url : `https://${url}`;
    segments.push({ text: label, isLink: true, url: href });
  });
  let totalWidth = 0;
  const spacing = pdf.getTextWidth(" | ");
  const measuredSegments = segments.map(seg => ({ ...seg, width: pdf.getTextWidth(seg.text) }));
  measuredSegments.forEach((seg, idx) => { totalWidth += seg.width; if (idx < measuredSegments.length - 1) totalWidth += spacing; });
  if (!draw) return totalWidth;
  let currentX = pageWidth - margin - totalWidth;
  measuredSegments.forEach((seg, idx) => {
    if (seg.isLink && seg.url) {
      pdf.setFont(currentFont, "bold");
      pdf.setTextColor(0, 0, 0);
      pdf.text(seg.text, currentX, y);
      pdf.setDrawColor(0, 0, 0); pdf.setLineWidth(0.15);
      pdf.line(currentX, y + 0.5, currentX + seg.width, y + 0.5);
      pdf.link(currentX, y - 3, seg.width, 4, { url: seg.url });
    } else {
      pdf.setFont(currentFont, "normal");
      pdf.setTextColor(80, 80, 80);
      pdf.text(seg.text, currentX, y);
    }
    currentX += seg.width;
    if (idx < measuredSegments.length - 1) {
      pdf.setFont(currentFont, "normal"); pdf.setTextColor(180, 180, 180);
      pdf.text(" | ", currentX, y); currentX += spacing;
    }
  });
  pdf.setTextColor(0, 0, 0);
  return totalWidth;
};

export const limitSummarySentences = (summaryText: string, maxSentences: number): string => {
  if (!summaryText) return "";
  const sentences = summaryText.split(/(?<=[.!?])\s+/).filter(Boolean);
  let result = sentences.slice(0, maxSentences).map(s => s.trim() + (/[.!?]$/.test(s.trim()) ? "" : ".")).join(" ");
  // Approximate visual-line cap: ~95 chars per rendered line at default body size.
  // Drop trailing sentences until the rendered text fits within maxSentences lines.
  const maxChars = Math.max(80, maxSentences * 95);
  let trimmed = sentences.slice(0, maxSentences);
  while (result.length > maxChars && trimmed.length > 1) {
    trimmed = trimmed.slice(0, -1);
    result = trimmed.map(s => s.trim() + (/[.!?]$/.test(s.trim()) ? "" : ".")).join(" ");
  }
  return result;
};

export const limitBullets = (bullets: string[], maxBullets: number): string[] => {
  if (!bullets) return [];
  return bullets.slice(0, maxBullets);
};

export const groundBulletMetrics = (genBullet: string, vaultItem: VaultItem): string => {
  if (!genBullet || !vaultItem) return genBullet;

  // Extract all number-like terms (including percentages, dollar values, e.g. 40%, 10k, $500, 20+)
  const metricRegex = /\b\d+(?:[.,]\d+)?\s*(?:%|\+|-|k|m|b|x)?\b/gi;
  const matches = genBullet.match(metricRegex);
  if (!matches) return genBullet;

  // Compile a search database from the original vault item
  const vaultText = [
    vaultItem.title || "",
    vaultItem.organization || "",
    vaultItem.description || "",
    ...(vaultItem.bullets || [])
  ].join(" ").toLowerCase();

  let groundedBullet = genBullet;

  for (const match of matches) {
    const cleanNumber = match.replace(/[^0-9]/g, ""); // Extract just the digits
    if (!cleanNumber) continue;

    // Skip years (4-digit numbers starting with 19 or 20)
    if (/^(19|20)\d{2}$/.test(match.trim())) {
      continue;
    }

    // Check if the digits exist in the vault text
    if (!vaultText.includes(cleanNumber)) {
      // Metric is hallucinated! Let's remove or replace the metric
      console.warn(`[Grounding] Hallucinated metric detected: "${match}" in bullet: "${genBullet}"`);
      
      // If it has a percentage, replace with "substantial"
      if (match.includes("%")) {
        groundedBullet = groundedBullet.replace(match, "substantial");
      } else {
        // Just remove the number
        groundedBullet = groundedBullet.replace(match, "");
      }
    }
  }

  // Clean up any double spaces or dangling punctuation left after stripping
  return groundedBullet.replace(/\s+/g, " ").replace(/\s+([.,!?;])/g, "$1").trim();
};

export const restoreExactProfileData = (generated: GeneratedResume, vaultItems: VaultItem[]): GeneratedResume => {
  if (!generated || !vaultItems || vaultItems.length === 0) return generated;
  const restored = { ...generated };
  if (Array.isArray(restored.experience)) {
    restored.experience = restored.experience.map(genItem => {
      const match = vaultItems.find(vItem => {
        if (vItem.type !== 'professional') return false;
        const org = (vItem.organization || "").trim().toLowerCase();
        const title = (vItem.title || "").trim().toLowerCase();
        const heading = (genItem.heading || "").trim().toLowerCase();
        if (!org) return false;
        if (title) return heading.includes(org) && heading.includes(title);
        return heading.includes(org);
      });
      if (match) {
        const groundedBullets = (genItem.bullets || []).map(b => groundBulletMetrics(b, match));
        return { 
          ...genItem, 
          content: match.period || genItem.content, 
          heading: genItem.heading || `${match.title || ""} @ ${match.organization}`,
          bullets: groundedBullets
        };
      }
      return genItem;
    });
  }
  if (Array.isArray(restored.products)) {
    restored.products = restored.products.map(genItem => {
      const match = vaultItems.find(vItem => {
        if (vItem.type !== 'product') return false;
        const title = (vItem.title || "").trim().toLowerCase();
        const heading = (genItem.heading || "").trim().toLowerCase();
        return title && heading.includes(title);
      });
      if (match) {
        const links = [match.github_link, match.live_link].filter(Boolean);
        const newContent = [match.period, ...links].filter(Boolean).join(" | ");
        const headingParts = (genItem.heading || "").split(/\s+[-–—]\s+/);
        const techStack = headingParts.slice(1).join(" - ");
        const newHeading = techStack ? `${match.title} - ${techStack}` : match.title || genItem.heading;
        const groundedBullets = (genItem.bullets || []).map(b => groundBulletMetrics(b, match));
        return { ...genItem, heading: newHeading, content: newContent || genItem.content, bullets: groundedBullets };
      }
      return genItem;
    });
  }
  if (Array.isArray(restored.projects)) {
    restored.projects = restored.projects.map(genItem => {
      const match = vaultItems.find(vItem => {
        if (vItem.type !== 'project') return false;
        const title = (vItem.title || "").trim().toLowerCase();
        const heading = (genItem.heading || "").trim().toLowerCase();
        return title && heading.includes(title);
      });
      if (match) {
        const links = [match.github_link, match.live_link].filter(Boolean);
        const newContent = [match.period, ...links].filter(Boolean).join(" | ");
        const headingParts = (genItem.heading || "").split(/\s+[-–—]\s+/);
        const techStack = headingParts.slice(1).join(" - ");
        const newHeading = techStack ? `${match.title} - ${techStack}` : match.title || genItem.heading;
        const groundedBullets = (genItem.bullets || []).map(b => groundBulletMetrics(b, match));
        return { ...genItem, heading: newHeading, content: newContent || genItem.content, bullets: groundedBullets };
      }
      return genItem;
    });
  }
  if (Array.isArray(restored.leadership)) {
    restored.leadership = restored.leadership.map(genItem => {
      const match = vaultItems.find(vItem => {
        if (vItem.type !== 'leadership') return false;
        const org = (vItem.organization || "").trim().toLowerCase();
        const title = (vItem.title || "").trim().toLowerCase();
        const heading = (genItem.heading || "").trim().toLowerCase();
        if (org && title) return heading.includes(org) && heading.includes(title);
        return (org && heading.includes(org)) || (title && heading.includes(title));
      });
      if (match) {
        const groundedBullets = (genItem.bullets || []).map(b => groundBulletMetrics(b, match));
        return { ...genItem, content: match.period || genItem.content, bullets: groundedBullets };
      }
      return genItem;
    });
  }
  const educationVaultItems = vaultItems.filter(v => v.type === 'education');
  const buildEduString = (vItem: VaultItem): string => {
    const deg = vItem.title || "Degree";
    const sch = vItem.organization || "University";
    const locMatch = (vItem.description || "").match(/Location:\s*([^|\n]+)/i);
    const loc = locMatch ? locMatch[1].trim() : "";
    const dt = vItem.period || "";
    const schoolPart = loc ? `${sch} - ${loc}` : sch;
    return `${deg} @ ${schoolPart}${dt ? ` | ${dt}` : ""}`;
  };
  if (Array.isArray(restored.education) && restored.education.length > 0) {
    restored.education = restored.education.map(genEdu => {
      const match = educationVaultItems.find(vItem => {
        const org = (vItem.organization || "").trim().toLowerCase();
        return org && genEdu.toLowerCase().includes(org);
      });
      return match ? buildEduString(match) : genEdu;
    });
  } else if (educationVaultItems.length > 0) {
    restored.education = educationVaultItems.map(buildEduString);
  }
  return restored;
};

export const sanitizeGeneratedResume = (
  data: unknown,
  targetSummaryLines = 3,
  experienceBullets?: number,
  projectLines?: number,
  productLines?: number,
): GeneratedResume => {
  if (!data || typeof data !== "object") {
    return { professional_summary: "", skills_section: [], experience: [], education: [], certifications: [], awards: [], products: [], projects: [], leadership: [] };
  }
  const d = data as Record<string, unknown>;
  const ensureArrayLocal = (arr: unknown): unknown[] => Array.isArray(arr) ? arr : [];

  let summary = "";
  if (typeof d.professional_summary === "string") summary = d.professional_summary;
  else if (d.professional_summary) summary = String(d.professional_summary);

  if (summary) {
    const normalized = summary.replace(/([a-zA-Z])\.([A-Za-z])/g, '$1. $2').replace(/([a-zA-Z])!([A-Za-z])/g, '$1! $2').replace(/([a-zA-Z])\?([A-Za-z])/g, '$1? $2').replace(/[\u201C\u201D]/g, '"').replace(/[\u2018\u2019]/g, "'").replace(/[\u2013\u2014]/g, "-").replace(/\u20B9/g, "Rs. ").replace(/\u00B9/g, "1").replace(/\u00B2/g, "2").replace(/\u00B3/g, "3").replace(/\u00A0/g, " ");
    let sentences: string[] = [];
    const matchResult = normalized.match(/[^.!?]+[.!?]+(\s|$)/g);
    if (matchResult) sentences = matchResult;
    if (sentences.length < targetSummaryLines) sentences = normalized.split(/\n+/).map(s => s.trim()).filter(Boolean);
    if (sentences.length < targetSummaryLines) sentences = [normalized];
    const cleanedSentences = sentences.map(s => s.trim()).filter(Boolean);
    const finalSentences = cleanedSentences.slice(0, targetSummaryLines).map(s => {
      let clean = s.trim();
      if (!clean.endsWith(".") && !clean.endsWith("!") && !clean.endsWith("?")) clean += ".";
      return clean.charAt(0).toUpperCase() + clean.slice(1);
    });
    summary = finalSentences.join(" ");
  }

  let skills: string[] = [];
  if (Array.isArray(d.skills_section)) skills = d.skills_section.map((s: unknown) => typeof s === "string" ? s : String(s || ""));
  else if (d.skills_section && typeof d.skills_section === "object") skills = Object.entries(d.skills_section).map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(", ") : String(val || "")}`);
  else if (typeof d.skills_section === "string") skills = [d.skills_section];

  const seenSkills = new Set<string>();
  skills = skills.map(line => {
    if (!line.includes(':')) {
      const skillsPart = line.split(',');
      return skillsPart.map(s => s.trim()).filter(s => { if (!s) return false; const key = s.toLowerCase(); if (seenSkills.has(key)) return false; seenSkills.add(key); return true; }).join(', ');
    }
    const colonIndex = line.indexOf(':');
    const category = line.slice(0, colonIndex).trim();
    const skillsList = line.slice(colonIndex + 1).split(',').map(s => s.trim());
    const uniqueSkills = skillsList.filter(s => { if (!s) return false; const key = s.toLowerCase(); if (seenSkills.has(key)) return false; seenSkills.add(key); return true; });
    return uniqueSkills.length > 0 ? `${category}: ${uniqueSkills.join(', ')}` : "";
  }).filter(Boolean);

  let education: string[] = [];
  if (Array.isArray(d.education)) {
    education = d.education.map((edu: Record<string, unknown>) => {
      if (typeof edu === "string") return edu;
      if (edu && typeof edu === "object") {
        const deg = edu.degree || edu.title || "Degree";
        const sch = edu.school || edu.organization || edu.institution || "University";
        const loc = edu.location || "";
        const dt = edu.date || edu.period || edu.expected || "Expected 2027";
        const gpaVal = edu.gpa || "";
        const parts: string[] = [];
        if (loc) parts.push(String(loc));
        if (dt) parts.push(String(dt));
        if (gpaVal) parts.push(`GPA: ${gpaVal}`);
        return `${deg} @ ${sch}${parts.length > 0 ? ` - ${parts.join(" | ")}` : ""}`;
      }
      return String(edu || "");
    });
  } else if (typeof d.education === "string") education = [d.education];

  const cleanSections = (sectionsArr: unknown, limit?: number): GeneratedResumeSection[] => {
    return ensureArrayLocal(sectionsArr).map((item: unknown) => {
      if (!item || typeof item !== "object") return { heading: String(item || ""), content: "", bullets: [] };
      const it = item as Record<string, unknown>;
      const rawBullets = Array.isArray(it.bullets) ? it.bullets.map((b: unknown) => typeof b === "string" ? b : String(b || "")) : (typeof it.bullets === "string" ? [it.bullets] : []);
      const cleanedBullets = rawBullets.map((b: string) => { let clean = b.trim(); clean = clean.replace(/^[•\-*\s]+/, ""); return clean; }).filter(Boolean);
      const finalBullets = limit && limit > 0 ? cleanedBullets.slice(0, limit) : cleanedBullets;
      return { heading: String(it.heading || it.title || ""), content: String(it.content || it.description || ""), bullets: finalBullets };
    });
  };

  const mapStringItems = (arr: unknown): string[] => ensureArrayLocal(arr).map((item: unknown) => {
    if (typeof item === "string") return item;
    if (item && typeof item === "object") {
      const it = item as Record<string, unknown>;
      const name = String(it.name || it.title || it.certification || it.award || "");
      const issuer = String(it.issuer || it.organization || it.provider || "");
      const year = String(it.year || it.date || "");
      return [name, issuer ? `(${issuer})` : "", year ? `- ${year}` : ""].filter(Boolean).join(" ");
    }
    return String(item || "");
  });

  return {
    professional_summary: summary,
    skills_section: skills,
    experience: cleanSections(d.experience, experienceBullets),
    education: d.education ? ensureArrayLocal(d.education).map((edu: unknown) => String(edu || "")) : [],
    certifications: mapStringItems(d.certifications),
    awards: mapStringItems(d.awards),
    products: cleanSections(d.products, productLines),
    projects: cleanSections(d.projects, projectLines),
    leadership: cleanSections(d.leadership),
  };
};
