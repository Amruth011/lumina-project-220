import { describe, it, expect, vi, beforeEach } from "vitest";
import { parseGapAnalysis, heuristicGapAnalysis } from "@/lib/gapAnalyzer";
import { supabase } from "@/integrations/supabase/client";
import type { Skill } from "@/types/jd";
import { cleanAndNormalizeResumeText } from "@/lib/resumeSchemaExtractor";

vi.mock("@/integrations/supabase/client", () => {
  return {
    supabase: {
      functions: {
        invoke: vi.fn(),
      },
    },
  };
});

describe("Gap Analyzer Module", () => {
  const mockSkills: Skill[] = [
    { skill: "SQL", category: "Database", importance: 90 },
    { skill: "dbt", category: "Tool", importance: 80 },
    { skill: "Python", category: "Language", importance: 70 }
  ];

  const mockResumeText = `
    Amruth Kumar M
    Email: amruth@gmail.com
    Skills: SQL, Python, Pandas, React
    Education: B.Tech in Artificial Intelligence and Data Science
    Experience: Data Science Intern at iStudio. Worked with SQL queries and Python scripting to optimize data models.
  `;

  const mockJdText = "Looking for an expert in SQL, Python, and dbt to build stable pipelines.";

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  describe("heuristicGapAnalysis", () => {
    it("should classify skills correctly and compute match score", () => {
      const result = heuristicGapAnalysis(mockResumeText, mockJdText, mockSkills, "Data Engineer");
      
      expect(result.overall_match).toBeGreaterThan(0);
      expect(result.detailed_gaps).toBeDefined();

      const detailed = result.detailed_gaps!;
      // SQL and Python are in resume text
      const sqlGap = detailed.technical_gaps.find(g => g.requirement === "SQL");
      expect(sqlGap).toBeDefined();
      expect(sqlGap!.status).toBe("has_it");

      // dbt is missing
      const dbtGap = detailed.technical_gaps.find(g => g.requirement === "dbt");
      expect(dbtGap).toBeDefined();
      expect(dbtGap!.status).toBe("missing");
      expect(dbtGap!.impact).toBe("dealbreaker"); // Importance 80 > 75
    });

    it("should flag seniority mismatch when candidate is intern and role is senior", () => {
      const result = heuristicGapAnalysis(mockResumeText, mockJdText, mockSkills, "Senior Data Scientist");
      const detailed = result.detailed_gaps!;

      const expGap = detailed.experience_gaps.find(g => g.requirement === "Seniority and Leadership Experience");
      expect(expGap).toBeDefined();
      expect(expGap!.status).toBe("partial");
      expect(expGap!.impact).toBe("dealbreaker");
    });
  });

  describe("parseGapAnalysis", () => {
    it("should call supabase edge function and return unified result on success", async () => {
      const mockEdgeResponse = {
        overall_match: 85,
        summary: "Excellent match.",
        skill_matches: [
          { skill: "SQL", match_percent: 100, verdict: "strong" },
          { skill: "Python", match_percent: 100, verdict: "strong" }
        ],
        deductions: [],
        actionable_directives: [
          { action: "Optimize", description: "Add dbt project detail." }
        ],
        detailed_gaps: {
          overall_match_score: 85,
          summary: "Excellent match.",
          technical_gaps: [],
          experience_gaps: [],
          education_gaps: [],
          keyword_gaps: { missing_keywords: [], underrepresented_keywords: [], keyword_density_suggestions: [] },
          culture_fit_analysis: { alignment_score: 90, matched_signals: [], missing_signals: [], red_flags: [] },
          achievement_gaps: { has_quantified_achievements: true, achievement_quality_score: 80, missing_impact_areas: [], suggested_achievements: [] },
          priority_action_plan: [],
          competitive_positioning: { user_strengths: [], user_weaknesses: [], differentiation_opportunities: [] }
        }
      };

      vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
        data: mockEdgeResponse,
        error: null
      });

      const result = await parseGapAnalysis(mockResumeText, mockJdText, mockSkills, "Data Scientist");
      
      expect(supabase.functions.invoke).toHaveBeenCalledWith("compare-resume", {
        body: {
          jdSkills: mockSkills,
          resumeText: cleanAndNormalizeResumeText(mockResumeText),
          jobTitle: "Data Scientist",
          jdText: mockJdText
        }
      });
      expect(result.overall_match).toBe(85);
      expect(result.detailed_gaps).toBeDefined();
      expect(result.detailed_gaps!.overall_match_score).toBe(85);
    });

    it("should fall back to heuristics when edge function fails", async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
        data: null,
        error: new Error("Network Error") as any
      });

      const result = await parseGapAnalysis(mockResumeText, mockJdText, mockSkills, "Data Scientist");
      
      expect(result.overall_match).toBeDefined();
      expect(result.detailed_gaps).toBeDefined();
      // Should find dbt missing and Python/SQL matching
      const dbtGap = result.detailed_gaps!.technical_gaps.find(g => g.requirement === "dbt");
      expect(dbtGap!.status).toBe("missing");
    });
  });
});
