// ── Lumina Job Agent: Core Types ─────────────────────────────────────────────

import type { GeneratedResume, Skill } from "./jd";

/** A saved resume snapshot stored in the agent vault */
export interface SavedAgentResume {
  id: string;
  /** Display label shown in the selector dropdown */
  label: string;
  /** The job title this resume was tailored for */
  jdTitle: string;
  /** The raw job description text linked to this resume */
  jdText: string;
  /** Skills extracted from the JD at generation time */
  jdSkills: Skill[];
  /** The structured resume JSON output */
  resume: GeneratedResume;
  /** Flat text representation for field injection */
  resumeText: string;
  /** Contact info captured at generation time */
  contactInfo: {
    fullName: string;
    email: string;
    phone: string;
    location: string;
    linkedin: string;
    github: string;
    website: string;
  };
  savedAt: number; // Unix ms timestamp
}

/** A single event in the agent's real-time execution log */
export interface AgentLogEntry {
  id: string;
  timestamp: string; // ISO string
  type: "info" | "success" | "warning" | "error" | "field" | "navigation";
  message: string;
  /** Optional field name when type === "field" */
  fieldName?: string;
  /** Optional injected value (truncated) when type === "field" */
  injectedValue?: string;
}

/** Final result returned by the agent worker */
export interface AgentRunResult {
  status: "applied" | "halted" | "running";
  applicationRef: string; // Synthetic confirmation reference
  totalFields: number;
  successFields: number;
  haltReason?: string;
  confirmationSnapshot: {
    title: string;
    company: string;
    portalDomain: string;
    submittedAt: string;
    referenceId: string;
    fieldsInjected: number;
  };
  logs: AgentLogEntry[];
}
