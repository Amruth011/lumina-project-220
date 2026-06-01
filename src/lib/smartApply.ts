import { supabase } from "@/integrations/supabase/client";
import type { SavedAgentResume } from "@/types/agent";

export interface AnswerPack {
  fullName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  github: string;
  website: string;
  summary: string;
  topSkills: string;
  whyThisRole: string;
  resumeText: string;
  combined: string;
}

export function deriveCompanyFromUrl(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    const parts = host.split(".");
    // jobs.company.com -> company; boards.greenhouse.io/acme -> greenhouse fallback
    const core = parts.length >= 2 ? parts[parts.length - 2] : parts[0];
    return core.charAt(0).toUpperCase() + core.slice(1);
  } catch {
    return "Unknown";
  }
}

export function buildAnswerPack(resume: SavedAgentResume): AnswerPack {
  const c = resume.contactInfo;
  const [firstName, ...rest] = (c.fullName || "").trim().split(/\s+/);
  const lastName = rest.join(" ");
  const topSkills = resume.jdSkills.slice(0, 12).map((s) => s.skill).join(", ");

  const summary =
    (resume.resume as { professional_summary?: string })?.professional_summary ||
    `${c.fullName} — applying for ${resume.jdTitle}. Skilled in ${topSkills}.`;

  const whyThisRole = `I'm excited about the ${resume.jdTitle} role because my background aligns directly with the listed requirements — particularly ${resume.jdSkills.slice(0, 3).map((s) => s.skill).join(", ")}. I've shipped production work using these and am ready to contribute from day one.`;

  const combined = [
    `═══════ LUMINA SMART APPLY PACK ═══════`,
    `Role: ${resume.jdTitle}`,
    ``,
    `── CONTACT ──`,
    `Full Name: ${c.fullName}`,
    `First Name: ${firstName}`,
    `Last Name: ${lastName}`,
    `Email: ${c.email}`,
    `Phone: ${c.phone}`,
    `Location: ${c.location}`,
    `LinkedIn: ${c.linkedin}`,
    `GitHub: ${c.github}`,
    `Website: ${c.website}`,
    ``,
    `── SUMMARY ──`,
    summary,
    ``,
    `── TOP SKILLS ──`,
    topSkills,
    ``,
    `── WHY THIS ROLE ──`,
    whyThisRole,
    ``,
    `── RESUME (PLAIN TEXT) ──`,
    resume.resumeText,
  ].join("\n");

  return {
    fullName: c.fullName,
    firstName,
    lastName,
    email: c.email,
    phone: c.phone,
    location: c.location,
    linkedin: c.linkedin,
    github: c.github,
    website: c.website,
    summary,
    topSkills,
    whyThisRole,
    resumeText: resume.resumeText,
    combined,
  };
}

export async function logApplication(params: {
  company: string;
  role: string;
  url: string;
  jdId?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return { ok: false, error: "Not signed in" };

  const { error } = await supabase.from("applications").insert({
    user_id: userId,
    company: params.company,
    role: params.role,
    status: "applied",
    applied_at: new Date().toISOString(),
    notes: `Smart Apply via Lumina · ${params.url}`,
    jd_id: params.jdId ?? null,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
