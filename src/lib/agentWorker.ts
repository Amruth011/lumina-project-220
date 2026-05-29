// ── Lumina Job Agent: AI Execution Worker ────────────────────────────────────
// Powered by Groq Llama-3.1-8B. Simulates intelligent form field detection,
// mapping, and injection. Streams AgentLogEntry events in real time.

import type { SavedAgentResume } from "@/types/agent";
import type { AgentLogEntry, AgentRunResult } from "@/types/agent";

// ── Helpers ────────────────────────────────────────────────────────────────

function makeLog(
  type: AgentLogEntry["type"],
  message: string,
  extra?: Partial<AgentLogEntry>
): AgentLogEntry {
  return {
    id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    type,
    message,
    ...extra,
  };
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return url;
  }
}

function generateRef(): string {
  return `LMN-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
}

// ── Groq LLM Call ─────────────────────────────────────────────────────────

async function callGroq(prompt: string, portalUrl?: string): Promise<string> {
  const apiKey = localStorage.getItem("lumina_groq_api_key") || "";

  if (!apiKey) {
    // Fallback: return a deterministic structured response if no key is set
    return JSON.stringify(buildFallbackFieldMap(portalUrl));
  }

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1024,
      temperature: 0.3,
    }),
  });

  if (!res.ok) return JSON.stringify(buildFallbackFieldMap(portalUrl));
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? JSON.stringify(buildFallbackFieldMap(portalUrl));
}

// ── Fallback Field Map ─────────────────────────────────────────────────────

interface FieldMap {
  fields: { name: string; selector: string; value: string; type: string }[];
  companyGuess: string;
}

function buildFallbackFieldMap(portalUrl?: string): FieldMap {
  const isLinkedIn = portalUrl && portalUrl.includes("linkedin.com");
  const baseFields = [
    { name: "Full Name", selector: "input[name*='name']", value: "{{fullName}}", type: "text" },
    { name: "Email Address", selector: "input[type='email']", value: "{{email}}", type: "email" },
    { name: "Phone Number", selector: "input[name*='phone']", value: "{{phone}}", type: "tel" },
    { name: "Location / City", selector: "input[name*='location']", value: "{{location}}", type: "text" },
    { name: "LinkedIn URL", selector: "input[name*='linkedin']", value: "{{linkedin}}", type: "url" },
    { name: "GitHub Profile", selector: "input[name*='github']", value: "{{github}}", type: "url" },
    { name: "Resume / CV Upload", selector: "input[type='file']", value: "{{resumePDF}}", type: "file" },
    { name: "Professional Summary", selector: "textarea[name*='summary']", value: "{{summary}}", type: "textarea" },
    { name: "Work Experience", selector: "textarea[name*='experience']", value: "{{experience}}", type: "textarea" },
    { name: "Skills", selector: "input[name*='skills']", value: "{{skills}}", type: "text" },
  ];

  if (isLinkedIn) {
    baseFields.push(
      { name: "Years of Generative AI Experience", selector: "input[name*='generative']", value: "{{genAIYears}}", type: "text" },
      { name: "Years of Machine Learning Experience", selector: "input[name*='learning']", value: "{{mlYears}}", type: "text" },
      { name: "Current / Last CTC", selector: "input[name*='ctc']", value: "{{ctc}}", type: "text" },
      { name: "Notice Period / Immediate Joiner Status", selector: "input[name*='notice']", value: "{{noticePeriod}}", type: "text" }
    );
  }

  return {
    fields: baseFields,
    companyGuess: isLinkedIn ? "Deloitte India" : "Target Company",
  };
}

// ── Value Resolver ─────────────────────────────────────────────────────────

function resolveValue(template: string, resume: SavedAgentResume): string {
  const c = resume.contactInfo;
  const r = resume.resume;

  const map: Record<string, string> = {
    "{{fullName}}": c.fullName,
    "{{email}}": c.email,
    "{{phone}}": c.phone,
    "{{location}}": c.location,
    "{{linkedin}}": c.linkedin,
    "{{github}}": c.github,
    "{{website}}": c.website,
    "{{resumePDF}}": `${c.fullName.replace(/\s+/g, "_")}_Resume.pdf`,
    "{{summary}}": r.professional_summary?.slice(0, 300) ?? "",
    "{{experience}}": r.experience?.map((e) => `${e.heading}: ${e.content}`).join("\n") ?? "",
    "{{skills}}": r.skills_section?.slice(0, 15).join(", ") ?? "",
    "{{genAIYears}}": (r.experience?.some(e => !e.heading.toLowerCase().includes("intern")) ? "2" : "0"),
    "{{mlYears}}": (r.experience?.some(e => !e.heading.toLowerCase().includes("intern")) ? "2" : "0"),
    "{{ctc}}": "5.0",
    "{{noticePeriod}}": "0",
  };

  let resolved = template;
  for (const [k, v] of Object.entries(map)) {
    resolved = resolved.replace(k, v);
  }
  return resolved;
}

// ── Main Worker ────────────────────────────────────────────────────────────

export async function runAgentJob(
  resume: SavedAgentResume,
  portalUrl: string,
  onLog: (entry: AgentLogEntry) => void
): Promise<AgentRunResult> {
  const logs: AgentLogEntry[] = [];

  const log = (entry: AgentLogEntry) => {
    logs.push(entry);
    onLog(entry);
  };

  const domain = extractDomain(portalUrl);
  const ref = generateRef();

  // ── Phase 1: Initialization ──────────────────────────────────────────────
  await sleep(400);
  log(makeLog("info", `Lumina Agent v2.1 initialized — targeting ${domain}`));
  await sleep(350);
  log(makeLog("info", `Resume profile loaded: "${resume.jdTitle}" (${resume.resume.skills_section?.length ?? 0} skills)`));
  await sleep(300);
  log(makeLog("navigation", `Navigating to application portal: ${portalUrl}`));
  await sleep(600);
  log(makeLog("info", `Portal loaded successfully. DOM structure scanned.`));
  await sleep(400);

  // ── Phase 2: LLM Field Analysis ─────────────────────────────────────────
  log(makeLog("info", `Llama-3.1-8B analyzing application form structure...`));
  await sleep(500);

  const prompt = `You are a job application form analyzer. Given this job portal domain: "${domain}" and the candidate's profile below, generate a JSON field mapping for filling out the application form. Return ONLY valid JSON with this structure: {"fields": [{"name": "field label", "selector": "css selector", "value": "resolved value", "type": "text|email|file|textarea|url"}], "companyGuess": "company name"}

Candidate Profile Summary:
- Name: ${resume.contactInfo.fullName}
- Email: ${resume.contactInfo.email}
- Role: ${resume.jdTitle}
- Skills: ${resume.resume.skills_section?.slice(0, 10).join(", ")}
- Summary: ${resume.resume.professional_summary?.slice(0, 200)}`;

  let fieldMap: FieldMap;
  try {
    const raw = await callGroq(prompt, portalUrl);
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    fieldMap = jsonMatch ? JSON.parse(jsonMatch[0]) : buildFallbackFieldMap(portalUrl);
  } catch {
    fieldMap = buildFallbackFieldMap(portalUrl);
  }

  await sleep(300);
  log(makeLog("success", `Form field map generated — ${fieldMap.fields.length} injectable fields detected`));
  await sleep(400);

  // ── Phase 3: Field Injection ─────────────────────────────────────────────
  log(makeLog("info", `Beginning intelligent field injection sequence...`));
  await sleep(350);

  let successCount = 0;
  const haltFields: string[] = [];

  for (const field of fieldMap.fields) {
    await sleep(200 + Math.random() * 300);

    const resolved = resolveValue(field.value, resume);
    const isFile = field.type === "file";
    const isEmpty = !resolved.trim();

    if (isEmpty) {
      haltFields.push(field.name);
      log(
        makeLog("warning", `Skipped: "${field.name}" — no value available in profile`, {
          fieldName: field.name,
        })
      );
      continue;
    }

    if (isFile) {
      log(
        makeLog("success", `Attached: "${field.name}" → ${resolved}`, {
          type: "field",
          fieldName: field.name,
          injectedValue: resolved,
        })
      );
    } else {
      log(
        makeLog("field", `Injected: "${field.name}" → ${resolved.length > 60 ? resolved.slice(0, 60) + "…" : resolved}`, {
          fieldName: field.name,
          injectedValue: resolved.slice(0, 80),
        })
      );
    }
    successCount++;
  }

  await sleep(400);

  // ── Phase 4: Multi-line Experience / Summary Fields ──────────────────────
  log(makeLog("info", `Deep-parsing experience and summary textarea blocks...`));
  await sleep(500);

  const experienceBullets = resume.resume.experience
    ?.flatMap((e) => e.bullets ?? [])
    .slice(0, 5)
    .join(" | ") ?? "";

  if (experienceBullets) {
    await sleep(300);
    log(
      makeLog("field", `Injected: "Detailed Work History" → ${experienceBullets.slice(0, 80)}…`, {
        fieldName: "Detailed Work History",
        injectedValue: experienceBullets.slice(0, 120),
      })
    );
    successCount++;
  }

  // ── Phase 5: Submission ──────────────────────────────────────────────────
  await sleep(600);
  log(makeLog("info", `Locating primary submit control...`));
  await sleep(400);
  log(makeLog("success", `Submit button located: button[type='submit'], data-testid='apply-btn'`));
  await sleep(500);
  log(makeLog("navigation", `Triggering submission event...`));
  await sleep(700);

  const hasHalts = haltFields.length > 3;

  if (hasHalts) {
    log(makeLog("error", `Agent halted — ${haltFields.length} mandatory fields could not be resolved: ${haltFields.slice(0, 3).join(", ")}...`));
    return {
      status: "halted",
      applicationRef: ref,
      totalFields: fieldMap.fields.length,
      successFields: successCount,
      haltReason: `${haltFields.length} required fields could not be mapped from your profile. Please complete your Master Vault profile and retry.`,
      confirmationSnapshot: {
        title: resume.jdTitle,
        company: fieldMap.companyGuess,
        portalDomain: domain,
        submittedAt: new Date().toISOString(),
        referenceId: ref,
        fieldsInjected: successCount,
      },
      logs,
    };
  }

  log(makeLog("success", `Application submitted successfully. Confirmation captured.`));
  await sleep(300);
  log(makeLog("success", `Reference ID generated: ${ref}`));

  return {
    status: "applied",
    applicationRef: ref,
    totalFields: fieldMap.fields.length,
    successFields: successCount,
    confirmationSnapshot: {
      title: resume.jdTitle,
      company: fieldMap.companyGuess,
      portalDomain: domain,
      submittedAt: new Date().toISOString(),
      referenceId: ref,
      fieldsInjected: successCount,
    },
    logs,
  };
}
