import type { GeneratedResume, GeneratedResumeSection } from "@/types/jd";

export const ensureArray = (arr: unknown): unknown[] => Array.isArray(arr) ? arr : [];

export const sanitizeGeneratedResume = (data: unknown, targetSummaryLines = 3): GeneratedResume => {
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
    experience: cleanSections(d.experience),
    education: d.education ? ensureArrayLocal(d.education).map((edu: unknown) => String(edu || "")) : [],
    certifications: mapStringItems(d.certifications),
    awards: mapStringItems(d.awards),
    products: cleanSections(d.products),
    projects: cleanSections(d.projects),
    leadership: cleanSections(d.leadership),
  };
};
