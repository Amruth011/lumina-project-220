/**
 * profileSeed.ts
 * ==============
 * Converts /public/user_profile.json into:
 *  - VaultItem[]        for seeding the Master Vault when Supabase rows are empty
 *  - GeneratedResume    for an immediate, production-grade preview (no AI call needed)
 *  - Raw resume text    for ATS gap-analysis scoring via computeDeterministicScore()
 *
 * All three representations include Academic Background, Certifications & Awards,
 * and Key Projects so those sections always contribute to the ATS match score.
 */

import type { VaultItem, GeneratedResume, GeneratedResumeSection } from "@/types/jd";

// ── Typed shape of /public/user_profile.json ─────────────────────────────────

export interface ProfileJsonLinks {
  portfolio?: string;
  linkedin?: string;
  github?: string;
}

export interface ProfileJsonPersonalInfo {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  links: ProfileJsonLinks;
}

export interface ProfileJsonExperience {
  role: string;
  company: string;
  location: string;
  period: string;
  bullets: string[];
}

export interface ProfileJsonAcademic {
  degree: string;
  university: string;
  timeline: string;
  location: string;
  gpa?: string;
}

export interface ProfileJsonProject {
  title: string;
  tech: string;
  github?: string;
  live?: string;
  bullets: string[];
}

export interface ProfileJsonJobPreferences {
  generative_ai_experience_years?: number;
  machine_learning_experience_years?: number;
  current_ctc?: number;
  expected_ctc?: number;
  notice_period_days?: number;
  is_immediate_joiner?: boolean;
}

export interface UserProfileJson {
  personal_info: ProfileJsonPersonalInfo;
  job_application_preferences?: ProfileJsonJobPreferences;
  professional_summary: string;
  experience: ProfileJsonExperience[];
  academic_background: ProfileJsonAcademic;
  certifications_awards: string[];
  key_projects: ProfileJsonProject[];
  technical_skills: Record<string, string[]>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeId(): string {
  return `seed_${Math.random().toString(36).slice(2, 10)}`;
}

const NOW = new Date().toISOString();

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Converts user_profile.json into VaultItem[] so executeTacticalSynthesis()
 * has real profile data even when Supabase master_vault is empty.
 *
 * Includes education, certifications, projects, and professional experience.
 * These keywords feed directly into AI prompt construction for resume generation.
 */
export function buildVaultItemsFromProfileJson(p: UserProfileJson): VaultItem[] {
  const userId = "demo_seed";
  const items: VaultItem[] = [];

  // ── Academic Background ───────────────────────────────────────────────────
  const edu = p.academic_background;
  if (edu) {
    items.push({
      id: makeId(),
      user_id: userId,
      type: "education",
      title: edu.degree,
      organization: edu.university,
      period: edu.timeline,
      description: `${edu.degree} | ${edu.university} | ${edu.location}${edu.gpa ? ` | GPA: ${edu.gpa}` : ""}`,
      bullets: [],
      skills: [
        "Artificial Intelligence",
        "Data Science",
        "Machine Learning",
        "Python",
        "Statistics",
      ],
      created_at: NOW,
      updated_at: NOW,
    });
  }

  // ── Certifications & Awards ───────────────────────────────────────────────
  (p.certifications_awards || []).forEach((cert) => {
    const isML = cert.toLowerCase().includes("machine learning");
    items.push({
      id: makeId(),
      user_id: userId,
      type: "certification",
      title: cert,
      organization: "Coursera / Professional Certificate",
      period: "2024",
      description: cert,
      bullets: [],
      skills: isML
        ? ["Machine Learning", "Python", "Scikit-learn", "XGBoost"]
        : ["Data Analytics", "SQL", "Statistics", "Google Analytics"],
      created_at: NOW,
      updated_at: NOW,
    });
  });

  // ── Key Projects ──────────────────────────────────────────────────────────
  (p.key_projects || []).forEach((proj) => {
    items.push({
      id: makeId(),
      user_id: userId,
      type: "project",
      title: proj.title,
      organization: proj.tech,
      period: "2024 - Present",
      description: `${proj.title} | Stack: ${proj.tech}`,
      bullets: proj.bullets,
      skills: proj.tech
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      github_link: proj.github,
      live_link: proj.live,
      is_quantified: proj.bullets.some((b) => /\d/.test(b)),
      created_at: NOW,
      updated_at: NOW,
    });
  });

  // ── Professional Experience ───────────────────────────────────────────────
  (p.experience || []).forEach((exp) => {
    items.push({
      id: makeId(),
      user_id: userId,
      type: "professional",
      title: exp.role,
      organization: exp.company,
      period: exp.period,
      description: `${exp.role} at ${exp.company}, ${exp.location}`,
      bullets: exp.bullets,
      skills: [
        "Python",
        "Machine Learning",
        "Streamlit",
        "Data Science",
        "Pandas",
        "NumPy",
      ],
      created_at: NOW,
      updated_at: NOW,
    });
  });

  return items;
}

/**
 * Converts user_profile.json into a GeneratedResume object for immediate
 * display inside ResumePreview — no AI call required.
 *
 * All sections (education, certifications, projects) are populated so the
 * rendered preview looks production-grade, not a skeleton.
 */
export function buildResumeFromProfileJson(p: UserProfileJson): GeneratedResume {
  // ── Education string ──────────────────────────────────────────────────────
  const edu = p.academic_background;
  const eduStr = edu
    ? `${edu.degree} @ ${edu.university} - ${edu.location} | ${edu.timeline}${edu.gpa ? ` | GPA: ${edu.gpa}` : ""}`
    : "";

  // ── Skills lines ──────────────────────────────────────────────────────────
  const skills: string[] = Object.entries(p.technical_skills || {}).map(
    ([category, skillList]) => `${category}: ${skillList.join(", ")}`
  );

  // ── Experience sections ───────────────────────────────────────────────────
  const experience: GeneratedResumeSection[] = (p.experience || []).map((exp) => ({
    heading: `${exp.role} @ ${exp.company} - ${exp.location}`,
    content: exp.period,
    bullets: exp.bullets,
  }));

  // ── Key Projects sections ─────────────────────────────────────────────────
  const projects: GeneratedResumeSection[] = (p.key_projects || []).map((proj) => ({
    heading: `${proj.title} — ${proj.tech}`,
    content: [proj.github, proj.live].filter(Boolean).join(" | "),
    bullets: proj.bullets,
  }));

  return {
    professional_summary: p.professional_summary || "",
    skills_section: skills,
    experience,
    education: eduStr ? [eduStr] : [],
    certifications: p.certifications_awards || [],
    awards: [],
    projects,
    products: [],
    leadership: [],
  };
}

/**
 * Converts user_profile.json into a single raw text string suitable for
 * computeDeterministicScore(resumeText, skills) in ResumeGapAnalyzer.
 *
 * Includes Academic Background, Certifications, and Key Projects so ALL
 * relevant keywords are indexed and contribute to the ATS match percentage.
 */
export function buildResumeTextFromProfileJson(p: UserProfileJson): string {
  const parts: string[] = [];

  // Header
  const pi = p.personal_info;
  if (pi) {
    parts.push(
      `${pi.fullName}  ${pi.location} | ${pi.phone} | ${pi.email}  ${
        Object.values(pi.links || {})
          .filter(Boolean)
          .join(" | ")
      }`
    );
  }

  // Summary
  if (p.professional_summary) {
    parts.push(`Professional Summary  ${p.professional_summary}`);
  }

  // Experience
  if (p.experience?.length) {
    parts.push("Experience");
    p.experience.forEach((exp) => {
      parts.push(`${exp.role} at ${exp.company}  ${exp.period}`);
      exp.bullets.forEach((b) => parts.push(`• ${b}`));
    });
  }

  // Key Projects (includes XGBoost, RAG, PySpark, ChromaDB, etc.)
  if (p.key_projects?.length) {
    parts.push("Projects");
    p.key_projects.forEach((proj, i) => {
      parts.push(`${i + 1}. ${proj.title}  ${proj.tech}`);
      proj.bullets.forEach((b) => parts.push(`• ${b}`));
    });
  }

  // Technical Skills
  if (p.technical_skills) {
    parts.push("Technical Skills");
    Object.entries(p.technical_skills).forEach(([cat, skillList]) => {
      parts.push(`• ${cat}: ${skillList.join(", ")}`);
    });
  }

  // Certifications & Awards (IBM ML, Google Analytics — keyword-rich)
  if (p.certifications_awards?.length) {
    parts.push(`Certifications:  ${p.certifications_awards.join("  ")}`);
  }

  // Academic Background (B.Tech, REVA University, Artificial Intelligence and Data Science)
  const e = p.academic_background;
  if (e) {
    parts.push(
      `Education  ${e.degree} | ${e.university} | ${e.location}  ${e.timeline}${
        e.gpa ? ` | GPA: ${e.gpa}` : ""
      }`
    );
  }

  return parts.join("  ");
}
