// ── Lumina Job Agent: Storage Layer ─────────────────────────────────────────
// Persists SavedAgentResume snapshots to localStorage under a dedicated key.
// Called automatically by ResumeGenerator on generation completion.

import type { SavedAgentResume } from "@/types/agent";
import type { GeneratedResume, Skill } from "@/types/jd";

const VAULT_KEY = "lumina_agent_vault_v1";
const MAX_ENTRIES = 20;

// ── Read ───────────────────────────────────────────────────────────────────

export function getAgentResumes(): SavedAgentResume[] {
  try {
    const raw = localStorage.getItem(VAULT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as SavedAgentResume[];
  } catch {
    return [];
  }
}

// ── Write ──────────────────────────────────────────────────────────────────

export interface SaveAgentResumeOptions {
  resume: GeneratedResume;
  jdTitle: string;
  jdText: string;
  jdSkills: Skill[];
  resumeText: string;
  contactInfo: SavedAgentResume["contactInfo"];
}

export function saveAgentResume(opts: SaveAgentResumeOptions): SavedAgentResume {
  const existing = getAgentResumes();

  const entry: SavedAgentResume = {
    id: `agent_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    label: `${opts.jdTitle} — ${new Date().toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })}`,
    jdTitle: opts.jdTitle,
    jdText: opts.jdText,
    jdSkills: opts.jdSkills,
    resume: opts.resume,
    resumeText: opts.resumeText,
    contactInfo: opts.contactInfo,
    savedAt: Date.now(),
  };

  // Deduplicate by jdTitle — keep newest only
  const deduped = existing.filter(
    (e) => e.jdTitle.toLowerCase() !== opts.jdTitle.toLowerCase()
  );

  const updated = [entry, ...deduped].slice(0, MAX_ENTRIES);
  localStorage.setItem(VAULT_KEY, JSON.stringify(updated));

  // Notify any listening components
  window.dispatchEvent(new CustomEvent("lumina_agent_vault_updated", { detail: entry }));

  return entry;
}

// ── Delete ─────────────────────────────────────────────────────────────────

export function deleteAgentResume(id: string): void {
  const existing = getAgentResumes();
  const updated = existing.filter((e) => e.id !== id);
  localStorage.setItem(VAULT_KEY, JSON.stringify(updated));
  window.dispatchEvent(new Event("lumina_agent_vault_updated"));
}

// ── Utility ────────────────────────────────────────────────────────────────

/** Build a flat text string from a GeneratedResume for LLM injection context */
export function buildResumeTextForAgent(resume: GeneratedResume): string {
  const lines: string[] = [];

  if (resume.professional_summary) {
    lines.push("PROFESSIONAL SUMMARY", resume.professional_summary, "");
  }
  if (resume.skills_section?.length) {
    lines.push("SKILLS", resume.skills_section.join(", "), "");
  }
  if (resume.experience?.length) {
    lines.push("EXPERIENCE");
    resume.experience.forEach((exp) => {
      lines.push(`${exp.heading}: ${exp.content}`);
      exp.bullets?.forEach((b) => lines.push(`  • ${b}`));
    });
    lines.push("");
  }
  if (resume.projects?.length) {
    lines.push("PROJECTS");
    resume.projects.forEach((p) => {
      lines.push(`${p.heading}: ${p.content}`);
      p.bullets?.forEach((b) => lines.push(`  • ${b}`));
    });
    lines.push("");
  }
  if (resume.education?.length) {
    lines.push("EDUCATION", ...resume.education, "");
  }
  if (resume.certifications?.length) {
    lines.push("CERTIFICATIONS", ...resume.certifications, "");
  }

  return lines.join("\n");
}
