export type SeverityLevel = "low" | "medium" | "high" | "critical";

export interface ValidationFinding {
  claim: string;
  claim_type: "metric" | "entity" | "date" | "skill" | "claim";
  severity: SeverityLevel;
  status: "verified" | "partial_match" | "hallucinated" | "inferred" | "placeholder";
  evidence?: string;
  issue_description?: string;
  suggested_fix?: string;
}

export interface GuardrailResult {
  is_safe: boolean;
  score: number; // 0-100
  findings: ValidationFinding[];
  corrected_text: string;
}
