export type ApplicationStatus = "saved" | "applied" | "interviewing" | "offered" | "rejected" | "ghosted";

export interface Application {
  id: string;
  user_id: string;
  jd_id?: string;
  company: string;
  role: string;
  status: ApplicationStatus;
  score?: number;
  notes?: string;
  applied_at?: string;
  interview_date?: string;
  compensation?: string;
  created_at: string;
  updated_at: string;
}

export type RubricDimension = "relevance" | "impact" | "skills_match" | "experience_depth" | "education_fit" | "cultural_signals";

export interface JobScore {
  overall: "A" | "B" | "C" | "D" | "F";
  dimensions: Record<RubricDimension, number>;
  reasoning: string;
  suggestions: string[];
}
