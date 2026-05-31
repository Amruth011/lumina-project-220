/**
 * Value Resolver — Maps form field labels/names to resume data values.
 */

export function resolveValue(field, resume) {
  const c = resume.contactInfo || {};
  const r = resume.resume || {};
  const label = (field.label + " " + field.name + " " + field.placeholder).toLowerCase();

  // Contact Info
  if (label.match(/\b(name|fullname|full name)\b/) && !label.includes("company")) return c.fullName || "";
  if (label.match(/\b(email|e-mail)\b/)) return c.email || "";
  if (label.match(/\b(phone|telephone|mobile|contact|cell)\b/)) return c.phone || "";
  if (label.match(/\b(location|city|state|address|country)\b/)) return c.location || "";
  if (label.match(/\b(linkedin)\b/)) return c.linkedin || "";
  if (label.match(/\b(github)\b/)) return c.github || "";
  if (label.match(/\b(website|portfolio|url)\b/)) return c.website || "";

  // Resume / CV Upload
  if (label.match(/\b(resume|cv|upload)\b/) && field.type === "file") {
    return `${c.fullName?.replace(/\s+/g, "_") || "candidate"}_Resume.pdf`;
  }

  // Professional Summary
  if (label.match(/\b(summary|professional summary|about|bio|profile)\b/)) {
    return r.professional_summary?.slice(0, 500) || "";
  }

  // Work Experience
  if (label.match(/\b(experience|work experience|employment|work history|job history)\b/)) {
    const exp = r.experience || [];
    return exp.map((e) => `${e.heading}: ${e.content}`).join("\n").slice(0, 2000);
  }

  // Skills
  if (label.match(/\b(skills|technologies|tech stack|competencies)\b/)) {
    return (r.skills_section || []).slice(0, 20).join(", ");
  }

  // Education
  if (label.match(/\b(education|degree|university|school|college)\b/)) {
    return (r.education || []).join(", ");
  }

  // Certifications
  if (label.match(/\b(certification|certificate|accreditation)\b/)) {
    return (r.certifications || []).join(", ");
  }

  // Projects
  if (label.match(/\b(projects|project)\b/)) {
    const projects = r.projects || [];
    return projects.map((p) => `${p.heading}: ${p.content}`).join("\n").slice(0, 1000);
  }

  // LinkedIn-specific / Indian job portal fields
  if (label.match(/\b(generative ai|genai|gen ai)\b/) && label.includes("year")) return "2";
  if (label.match(/\b(machine learning|ml)\b/) && label.includes("year")) return "2";
  if (label.match(/\b(ctc|salary|compensation|lpa)\b/)) return "5.0";
  if (label.match(/\b(notice period|notice|immediate joiner|serving period)\b/)) return "0";
  if (label.match(/\b(years of experience|total experience|work exp)\b/)) {
    const exp = r.experience || [];
    const nonIntern = exp.filter((e) => !e.heading?.toLowerCase().includes("intern"));
    return String(Math.max(nonIntern.length, 1));
  }

  // Availability / Start Date
  if (label.match(/\b(available|start date|joining date)\b/)) return "Immediate";
  if (label.match(/\b(work authorization|visa|sponsorship)\b/)) return "Yes";

  // Gender / Pronouns
  if (label.match(/\b(gender|pronouns)\b/)) return "Prefer not to say";

  return "";
}
