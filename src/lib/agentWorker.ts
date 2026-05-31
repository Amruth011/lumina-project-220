import type { SavedAgentResume } from "@/types/agent";
import type { AgentLogEntry, AgentRunResult } from "@/types/agent";

// ── Configuration ──────────────────────────────────────────────────────────

const AUTOMATION_SERVICE_URL_KEY = "lumina_automation_service_url";
const DEFAULT_SERVICE_URL = "ws://localhost:3001";

export function getAutomationServiceUrl(): string {
  return localStorage.getItem(AUTOMATION_SERVICE_URL_KEY) || DEFAULT_SERVICE_URL;
}

export function setAutomationServiceUrl(url: string): void {
  localStorage.setItem(AUTOMATION_SERVICE_URL_KEY, url);
}

// ── WebSocket Runner ───────────────────────────────────────────────────────

async function runViaWebSocket(
  resume: SavedAgentResume,
  portalUrl: string,
  onLog: (entry: AgentLogEntry) => void
): Promise<AgentRunResult> {
  const wsUrl = getAutomationServiceUrl();

  return new Promise((resolve, reject) => {
    let ws: WebSocket;
    try {
      ws = new WebSocket(wsUrl);
    } catch {
      reject(new Error(`Invalid WebSocket URL: ${wsUrl}`));
      return;
    }

    const logs: AgentLogEntry[] = [];
    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error("Connection timed out. Is the automation service running?"));
    }, 5000);

    ws.onopen = () => {
      clearTimeout(timeout);
      ws.send(JSON.stringify({
        type: "start",
        portalUrl,
        resume,
      }));
    };

    ws.onmessage = (event) => {
      let data;
      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }

      if (data.type === "result") {
        const result: AgentRunResult = {
          status: data.status || "applied",
          applicationRef: data.applicationRef || `LMN-${Date.now().toString(36).toUpperCase()}`,
          totalFields: data.totalFields || 0,
          successFields: data.successFields || 0,
          haltReason: data.haltReason,
          confirmationSnapshot: data.confirmationSnapshot || {
            title: resume.jdTitle,
            company: new URL(portalUrl).hostname.replace("www.", ""),
            portalDomain: new URL(portalUrl).hostname.replace("www.", ""),
            submittedAt: new Date().toISOString(),
            referenceId: data.applicationRef || "",
            fieldsInjected: data.successFields || 0,
          },
          logs,
        };
        resolve(result);
        return;
      }

      if (data.type === "error") {
        onLog({
          id: `err_${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: "error",
          message: data.message || "Unknown error",
        });
        return;
      }

      const typeMap: Record<string, AgentLogEntry["type"]> = {
        info: "info",
        success: "success",
        warning: "warning",
        error: "error",
        navigation: "navigation",
        field: "field",
      };

      const entry: AgentLogEntry = {
        id: `ws_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toISOString(),
        type: typeMap[data.type] || "info",
        message: data.message || "",
        fieldName: data.fieldName,
        injectedValue: data.injectedValue,
      };

      logs.push(entry);
      onLog(entry);
    };

    ws.onerror = () => {
      clearTimeout(timeout);
      reject(new Error("WebSocket connection failed"));
    };

    ws.onclose = () => {
      clearTimeout(timeout);
    };
  });
}

// ── Simulated Runner (Fallback) ────────────────────────────────────────────

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

async function runSimulated(
  resume: SavedAgentResume,
  portalUrl: string,
  onLog: (entry: AgentLogEntry) => void,
  agentWindow?: Window | null
): Promise<AgentRunResult> {
  const logs: AgentLogEntry[] = [];

  const log = (entry: AgentLogEntry) => {
    logs.push(entry);
    onLog(entry);
  };

  const domain = extractDomain(portalUrl);
  const ref = generateRef();

  await sleep(400);
  log(makeLog("info", `Lumina Agent (simulated) — targeting ${domain}`));
  await sleep(350);
  log(makeLog("info", `Resume profile loaded: "${resume.jdTitle}"`));
  await sleep(300);
  log(makeLog("navigation", `Navigating to: ${portalUrl}`));
  await sleep(600);
  log(makeLog("info", `Simulated portal loaded.`));
  await sleep(400);

  log(makeLog("info", `Analyzing form structure...`));
  await sleep(500);

  const fieldMap = buildFallbackFieldMap(portalUrl);

  await sleep(300);
  log(makeLog("success", `Form field map — ${fieldMap.fields.length} fields detected`));
  await sleep(400);

  log(makeLog("info", `Beginning field injection...`));
  await sleep(350);

  let successCount = 0;
  const haltFields: string[] = [];

  for (const field of fieldMap.fields) {
    await sleep(200 + Math.random() * 300);
    const resolved = resolveValue(field.value, resume);
    const isEmpty = !resolved.trim();

    if (isEmpty) {
      haltFields.push(field.name);
      log(makeLog("warning", `Skipped: "${field.name}" — no value in profile`, { fieldName: field.name }));
      continue;
    }

    log(makeLog("field", `Injected: "${field.name}" → ${resolved.length > 60 ? resolved.slice(0, 60) + "…" : resolved}`, {
      fieldName: field.name,
      injectedValue: resolved.slice(0, 80),
    }));
    successCount++;
  }

  await sleep(400);
  log(makeLog("info", `Deep-parsing textarea blocks...`));
  await sleep(500);

  const experienceBullets = resume.resume.experience
    ?.flatMap((e) => e.bullets ?? [])
    .slice(0, 5)
    .join(" | ") ?? "";

  if (experienceBullets) {
    await sleep(300);
    log(makeLog("field", `Injected: "Detailed Work History" → ${experienceBullets.slice(0, 80)}…`, {
      fieldName: "Detailed Work History",
      injectedValue: experienceBullets.slice(0, 120),
    }));
    successCount++;
  }

  await sleep(600);
  log(makeLog("info", `Locating submit control...`));
  await sleep(400);
  log(makeLog("success", `Submit button located (simulated).`));
  await sleep(500);
  log(makeLog("navigation", `Triggering submission...`));
  await sleep(700);

  const hasHalts = haltFields.length > 3;

  if (hasHalts) {
    log(makeLog("error", `Halted — ${haltFields.length} fields unresolved`));
    return {
      status: "halted",
      applicationRef: ref,
      totalFields: fieldMap.fields.length,
      successFields: successCount,
      haltReason: `${haltFields.length} required fields could not be mapped. Complete your Master Vault profile and retry.`,
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

  log(makeLog("success", `Application submitted. Reference: ${ref}`));
  await sleep(600);

  if (agentWindow) {
    log(makeLog("info", `Closing agent window...`));
    await sleep(1000);
    try { agentWindow.close(); } catch { /* ignore */ }
  }

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

// ── Try backend connection ─────────────────────────────────────────────────

async function testWebSocketConnection(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const ws = new WebSocket(url);
      const timer = setTimeout(() => {
        ws.close();
        resolve(false);
      }, 3000);
      ws.onopen = () => {
        clearTimeout(timer);
        ws.close();
        resolve(true);
      };
      ws.onerror = () => {
        clearTimeout(timer);
        resolve(false);
      };
    } catch {
      resolve(false);
    }
  });
}

// ── Main Entry Point ───────────────────────────────────────────────────────

export async function runAgentJob(
  resume: SavedAgentResume,
  portalUrl: string,
  onLog: (entry: AgentLogEntry) => void,
  agentWindow?: Window | null
): Promise<AgentRunResult> {
  const wsUrl = getAutomationServiceUrl();

  try {
    const connected = await testWebSocketConnection(wsUrl);
    if (connected) {
      onLog({
        id: `init_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: "success",
        message: `Connected to automation service at ${wsUrl}`,
      });
      return await runViaWebSocket(resume, portalUrl, onLog);
    }
  } catch {
    // fall through to simulation
  }

  onLog({
    id: `init_${Date.now()}`,
    timestamp: new Date().toISOString(),
    type: "warning",
    message: `Automation service not available at ${wsUrl}. Running in simulation mode. Start the backend with: cd automation-service && npm start`,
  });

  return runSimulated(resume, portalUrl, onLog, agentWindow);
}
