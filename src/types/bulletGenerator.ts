export interface RequirementMapping {
  jd_requirement: string;
  matching_experience: string; // e.g. company name, project name, or "General Experience"
  match_strength: "strong" | "moderate" | "weak" | "none";
  gap_notes: string;
}

export interface BulletVariant {
  metric_heavy: string;
  impact_heavy: string;
  technical_heavy: string;
}

export interface GeneratedBulletItem {
  jd_requirement: string;
  matching_experience: string;
  variants: BulletVariant;
  confidence_score: number;
  validation_results: {
    metric_heavy: { is_safe: boolean; score: number; issue?: string };
    impact_heavy: { is_safe: boolean; score: number; issue?: string };
    technical_heavy: { is_safe: boolean; score: number; issue?: string };
  };
}

export interface UnmappedRequirementSuggestion {
  requirement: string;
  suggestion: string;
}

export interface MultiPassBulletResult {
  generated_bullets: GeneratedBulletItem[];
  unmapped_requirements: UnmappedRequirementSuggestion[];
  overall_quality_score: number;
}

export interface PipelineProgress {
  stage: "idle" | "mapping" | "generating" | "polishing" | "complete";
  percent: number;
  message: string;
}
