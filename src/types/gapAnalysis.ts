export interface TechnicalGap {
  requirement: string;
  status: "has_it" | "missing" | "partial";
  impact: "dealbreaker" | "important" | "minor";
  description: string;
  mitigation_strategy: string;
}

export interface ExperienceGap {
  requirement: string;
  status: "has_it" | "missing" | "partial";
  impact: "dealbreaker" | "important" | "minor";
  description: string;
  mitigation_strategy: string;
}

export interface EducationGap {
  requirement: string;
  user_status: "has_it" | "missing" | "partial";
  impact: "dealbreaker" | "important" | "minor";
  alternative_path: string;
}

export interface KeywordGaps {
  missing_keywords: string[];
  underrepresented_keywords: string[];
  keyword_density_suggestions: string[];
}

export interface CultureFitAnalysis {
  alignment_score: number;
  matched_signals: string[];
  missing_signals: string[];
  red_flags: string[];
}

export interface AchievementGaps {
  has_quantified_achievements: boolean;
  achievement_quality_score: number;
  missing_impact_areas: string[];
  suggested_achievements: string[];
}

export interface PriorityActionItem {
  priority: number;
  action: string;
  impact: "high" | "medium" | "low";
  effort: "hours" | "days" | "weeks";
  how_to_do_it: string;
}

export interface CompetitivePositioning {
  user_strengths: string[];
  user_weaknesses: string[];
  differentiation_opportunities: string[];
}

export interface GapAnalysisResult {
  overall_match_score: number;
  summary: string;
  technical_gaps: TechnicalGap[];
  experience_gaps: ExperienceGap[];
  education_gaps: EducationGap[];
  keyword_gaps: KeywordGaps;
  culture_fit_analysis: CultureFitAnalysis;
  achievement_gaps: AchievementGaps;
  priority_action_plan: PriorityActionItem[];
  competitive_positioning: CompetitivePositioning;
}
