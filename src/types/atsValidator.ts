import type { ATSVerdict } from "./jd";

export interface ATSParsingRisk {
  risk: string;
  description: string;
  severity: "critical" | "warning" | "info";
  resolution: string;
}

export interface ATSFormattingIssue {
  category: "layout" | "fonts" | "tables" | "graphics" | "other";
  severity: "high" | "medium" | "low";
  description: string;
  fix: string;
}

export interface ATSActionableFix {
  area: string;
  suggestion: string;
  example_before?: string;
  example_after?: string;
}

export interface ATSValidationReport extends ATSVerdict {
  parsing_risks: ATSParsingRisk[];
  formatting_issues: ATSFormattingIssue[];
  actionable_fixes: ATSActionableFix[];
}
