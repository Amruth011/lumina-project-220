import { describe, it, expect } from "vitest";
import { 
  extractNumbersFromText, 
  extractSkillsFromText, 
  extractCompaniesFromText, 
  validateGeneratedContent 
} from "@/lib/hallucinationGuardrail";
import type { ResumeExtractedData } from "@/types/resume";

describe("Hallucination Guardrail Module", () => {
  const mockResume: ResumeExtractedData = {
    contact_info: {
      name: "Amruth Kumar M",
      email: "amruth@gmail.com",
      phone: "+91 9148159827",
      location: "Bengaluru",
      linkedin: "ln",
      portfolio: "pf",
      github: "gh"
    },
    professional_summary: "Data Scientist",
    total_years_experience: 1.0,
    experience: [
      {
        company: "iStudio",
        title: "Data Science Intern",
        dates: { start: "2026-02", end: "2026-05", duration_months: 3 },
        location: "Bengaluru",
        employment_type: "internship",
        bullets: [
          {
            original_text: "Optimized data preprocessing pipelines using SQL and Pandas, reducing manual data review time by 40%.",
            action_verb: "Optimized",
            subject: "pipelines",
            metrics: [{ value: "40", unit: "%", context: "reduction in manual review time" }],
            technologies: ["SQL", "Pandas"],
            skills_demonstrated: ["Optimization"],
            impact_level: "high"
          }
        ]
      }
    ],
    education: [
      {
        institution: "REVA University",
        degree: "B.Tech",
        field: "AI and Data Science",
        dates: { start: "2023-12", end: "2026-05" },
        gpa: "8.5/10"
      }
    ],
    skills: [
      { name: "Python", category: "programming_language", proficiency: "advanced" },
      { name: "SQL", category: "programming_language", proficiency: "advanced" },
      { name: "Pandas", category: "framework", proficiency: "advanced" },
      { name: "Snowflake", category: "tool", proficiency: "intermediate" }
    ],
    certifications: [],
    projects: [
      {
        name: "Churn System",
        description: "Customer churn prediction using BigQuery and Python.",
        technologies: ["Python", "BigQuery"],
        outcome: "98.76% accuracy and 0.9989 AUC-ROC, identifying ₹47.4L in revenue."
      }
    ],
    languages: [],
    metrics_summary: {
      total_metrics_found: 3,
      metrics_with_specific_numbers: 2,
      metrics_with_percentages: 2,
      metrics_with_dollar_values: 0,
      average_impact_level: "high"
    },
    confidence_scores: {
      contact_info: 100,
      professional_summary: 100,
      experience: 100,
      education: 100,
      skills: 100,
      projects: 100,
      certifications: 100,
      overall: 100
    }
  };

  describe("extractNumbersFromText", () => {
    it("should extract percentages and raw numbers", () => {
      const text = "Achieved 40% reduction and saved 937 hours of work.";
      const result = extractNumbersFromText(text);
      expect(result).toContain("40%");
      expect(result).toContain("937");
    });
  });

  describe("extractSkillsFromText", () => {
    it("should extract skills matching known lists", () => {
      const text = "Wrote code in Python and query optimizations using SQL.";
      const result = extractSkillsFromText(text, ["Python", "SQL", "Docker"]);
      expect(result).toContain("Python");
      expect(result).toContain("SQL");
      expect(result).not.toContain("Docker");
    });
  });

  describe("validateGeneratedContent", () => {
    it("should pass safe content that only references real metrics and skills", () => {
      const bullet = "Optimized preprocessing pipelines using SQL and Pandas, reducing manual review by 40%.";
      const result = validateGeneratedContent(bullet, mockResume);
      
      expect(result.is_safe).toBe(true);
      expect(result.score).toBe(100);
      expect(result.findings.length).toBe(0);
    });

    it("should flag hallucinated metrics and replace them with placeholders in corrected_text", () => {
      const bullet = "Optimized preprocessing pipelines using SQL and Pandas, reducing manual review by 90%.";
      const result = validateGeneratedContent(bullet, mockResume);

      expect(result.is_safe).toBe(false);
      expect(result.findings.some(f => f.claim === "90%" && f.claim_type === "metric")).toBe(true);
      expect(result.corrected_text).toContain("[METRIC: verify value]");
    });

    it("should flag unverified technical skills", () => {
      const bullet = "Deployed a Docker container to AWS and managed Kubernetes clusters.";
      const result = validateGeneratedContent(bullet, mockResume);

      expect(result.is_safe).toBe(false);
      expect(result.findings.some(f => f.claim === "docker" && f.claim_type === "skill")).toBe(true);
      expect(result.findings.some(f => f.claim === "aws" && f.claim_type === "skill")).toBe(true);
      expect(result.findings.some(f => f.claim === "kubernetes" && f.claim_type === "skill")).toBe(true);
    });
  });
});
