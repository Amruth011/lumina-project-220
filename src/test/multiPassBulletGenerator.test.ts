import { describe, it, expect, vi, beforeEach } from "vitest";
import { 
  heuristicMapRequirements, 
  heuristicGenerateBullets, 
  generateMultiPassBullets 
} from "@/lib/multiPassBulletGenerator";
import { supabase } from "@/integrations/supabase/client";
import type { ResumeExtractedData } from "@/types/resume";
import type { StructuredJdData } from "@/types/jd";

vi.mock("@/integrations/supabase/client", () => {
  return {
    supabase: {
      functions: {
        invoke: vi.fn(),
      },
    },
  };
});

describe("Multi-Pass Bullet Generator Module", () => {
  const mockResume: ResumeExtractedData = {
    contact_info: { name: "Amruth", email: "amruth@gmail.com", phone: "+91", location: "Bengaluru", linkedin: "ln", portfolio: "pf", github: "gh" },
    professional_summary: "Data Scientist",
    total_years_experience: 1.0,
    experience: [
      {
        company: "iStudio",
        title: "Intern",
        dates: { start: "2026-02", end: "2026-05", duration_months: 3 },
        location: "Bengaluru",
        employment_type: "internship",
        bullets: [
          {
            original_text: "Optimized pipelines using SQL and Pandas by 40%.",
            action_verb: "Optimized",
            subject: "pipelines",
            metrics: [{ value: "40", unit: "%", context: "reduction" }],
            technologies: ["SQL", "Pandas"],
            skills_demonstrated: ["Optimization"],
            impact_level: "high"
          }
        ]
      }
    ],
    education: [],
    skills: [
      { name: "Python", category: "programming_language", proficiency: "advanced" },
      { name: "SQL", category: "programming_language", proficiency: "advanced" }
    ],
    certifications: [],
    projects: [],
    languages: [],
    metrics_summary: { total_metrics_found: 1, metrics_with_specific_numbers: 1, metrics_with_percentages: 1, metrics_with_dollar_values: 0, average_impact_level: "high" },
    confidence_scores: { contact_info: 100, professional_summary: 100, experience: 100, education: 100, skills: 100, projects: 100, certifications: 100, overall: 100 }
  };

  const mockJd: StructuredJdData = {
    role_title: "Data Scientist",
    company_name: "Deutsche Bank",
    employment_type: "full-time",
    location: "Bangalore",
    hard_requirements: [
      { category: "Technical", priority: "must-have", specific_technologies: ["SQL"] }
    ],
    soft_requirements: [],
    responsibilities: [],
    culture_signals: [],
    company_context: {},
    keywords_for_ats: [],
    red_flags: { vague_requirements: [], unrealistic_expectations: [] }
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("heuristicMapRequirements", () => {
    it("should map requirements to matching experiences based on keyword overlap", () => {
      const result = heuristicMapRequirements(mockResume, mockJd);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].matching_experience).toBe("iStudio");
      expect(result[0].match_strength).toBe("strong");
    });
  });

  describe("heuristicGenerateBullets", () => {
    it("should produce templated variants with placeholder metrics", () => {
      const mappings = heuristicMapRequirements(mockResume, mockJd);
      const result = heuristicGenerateBullets(mappings, mockResume);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].variants.metric_heavy).toContain("[METRIC:");
      expect(result[0].variants.impact_heavy).toContain("[METRIC:");
      expect(result[0].variants.technical_heavy).toContain("Architected");
    });
  });

  describe("generateMultiPassBullets", () => {
    it("should execute full pipeline and invoke analyze function", async () => {
      const mockMappingResponse = {
        mappings: [
          { jd_requirement: "SQL", matching_experience: "iStudio", match_strength: "strong", gap_notes: "" }
        ]
      };

      const mockGenResponse = {
        bullets: [
          {
            jd_requirement: "SQL",
            matching_experience: "iStudio",
            variants: {
              metric_heavy: "Optimized SQL query performance by 40% in iStudio.",
              impact_heavy: "Led data engineering optimizations for SQL pipelines.",
              technical_heavy: "Architected scalable dbt transformations using SQL."
            }
          }
        ]
      };

      vi.mocked(supabase.functions.invoke)
        .mockResolvedValueOnce({
          data: { choices: [{ message: { content: JSON.stringify(mockMappingResponse) } }] },
          error: null
        } as any)
        .mockResolvedValueOnce({
          data: { choices: [{ message: { content: JSON.stringify(mockGenResponse) } }] },
          error: null
        } as any);

      const progressLogs: any[] = [];
      const onProgress = (p: any) => progressLogs.push(p);

      const result = await generateMultiPassBullets(mockResume, mockJd, onProgress);

      expect(supabase.functions.invoke).toHaveBeenCalledTimes(2);
      expect(result.generated_bullets.length).toBe(1);
      expect(result.generated_bullets[0].variants.metric_heavy).toBe("Optimized SQL query performance by 40% in iStudio.");
      expect(result.generated_bullets[0].confidence_score).toBeGreaterThan(0);
      expect(progressLogs.some(p => p.stage === "complete")).toBe(true);
    });

    it("should gracefully fall back to heuristics on edge function failure", async () => {
      vi.mocked(supabase.functions.invoke).mockRejectedValue(new Error("Supabase Network Failure"));

      const result = await generateMultiPassBullets(mockResume, mockJd);

      expect(result.generated_bullets.length).toBe(1);
      expect(result.generated_bullets[0].variants.metric_heavy).toContain("[METRIC:");
      expect(result.generated_bullets[0].confidence_score).toBe(100); // validated heuristic has no hallucinations
    });
  });
});
