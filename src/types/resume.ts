export interface ContactInfo {
  name: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  portfolio: string;
  github: string;
}

export interface MetricDetail {
  value: number | string;
  unit: string;
  context: string;
}

export interface ExperienceBullet {
  original_text: string;
  action_verb: string;
  subject: string;
  metrics: MetricDetail[];
  technologies: string[];
  skills_demonstrated: string[];
  impact_level: "low" | "medium" | "high";
}

export interface ExperienceEntry {
  company: string;
  title: string;
  dates: {
    start: string;
    end: string;
    duration_months?: number;
  };
  location: string;
  employment_type: "full-time" | "part-time" | "contract" | "internship" | "freelance";
  bullets: ExperienceBullet[];
}

export interface EducationEntry {
  institution: string;
  degree: string;
  field: string;
  dates: {
    start: string;
    end: string;
  };
  gpa?: string;
  honors?: string[];
}

export interface SkillEntry {
  name: string;
  category: string;
  proficiency: "beginner" | "intermediate" | "advanced" | "expert";
  years_experience?: number;
  evidence?: string[];
}

export interface CertificationEntry {
  name: string;
  issuer: string;
  dates: {
    obtained: string;
    expiry?: string | null;
  };
  credential_id?: string | null;
}

export interface ProjectEntry {
  name: string;
  description: string;
  technologies: string[];
  outcome: string;
  link?: string;
}

export interface LanguageEntry {
  language: string;
  proficiency: string;
}

export interface MetricsSummary {
  total_metrics_found: number;
  metrics_with_specific_numbers: number;
  metrics_with_percentages: number;
  metrics_with_dollar_values: number;
  average_impact_level: "low" | "medium" | "high";
}

export interface ResumeExtractedData {
  contact_info: ContactInfo;
  professional_summary: string;
  total_years_experience: number;
  experience: ExperienceEntry[];
  education: EducationEntry[];
  skills: SkillEntry[];
  certifications: CertificationEntry[];
  projects: ProjectEntry[];
  languages: LanguageEntry[];
  metrics_summary: MetricsSummary;
  confidence_scores: {
    contact_info: number;
    professional_summary: number;
    experience: number;
    education: number;
    skills: number;
    projects: number;
    certifications: number;
    overall: number;
  };
}
