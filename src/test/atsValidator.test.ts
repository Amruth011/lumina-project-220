import { describe, it, expect, vi, beforeEach } from "vitest";
import { validateResumeForATS, heuristicATSValidate } from "@/lib/atsValidator";
import { supabase } from "@/integrations/supabase/client";
import type { Skill } from "@/types/jd";

vi.mock("@/integrations/supabase/client", () => {
  return {
    supabase: {
      functions: {
        invoke: vi.fn(),
      },
    },
  };
});

describe("ATS Validator Module", () => {
  const mockSkills: Skill[] = [
    { skill: "SQL", category: "Database", importance: 90 },
    { skill: "Python", category: "Language", importance: 80 },
    { skill: "dbt", category: "Tool", importance: 70 }
  ];

  const cleanResume = `
    Amruth Kumar M
    Email: amruth@gmail.com | Phone: +91 9876543210
    Professional Summary:
    Experienced Data Engineer with SQL and Python expertise.
    Work Experience:
    Data Science Intern at iStudio
    - Developed and optimized data pipelines using Python and SQL.
    Skills:
    SQL, Python, Pandas, React
    Education:
    B.Tech in Artificial Intelligence
    Projects:
    Customer Churn Prediction Dashboard
  `;

  const messyResume = `
    Amruth Kumar M
    Bengaluru, India
    
    | Name | Amruth |
    |---|---|
    | Role | Intern |
    
    Skills: SQL            Python            Pandas
    Exp 1: Developer      Company A      2023 - 2024
    Exp 2: Assistant      Company B      2022 - 2023
    Edu: B.Tech           College        2018 - 2022
    Projects: RAG         GitHub         2024
  `;

  const mockJdText = "Looking for a Data Scientist / Data Engineer with SQL, Python and dbt experience.";

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  describe("heuristicATSValidate", () => {
    it("should pass a clean, well-formatted resume with correct section scores", () => {
      const report = heuristicATSValidate(cleanResume, mockJdText, mockSkills);
      
      expect(report.pass).toBe(true);
      expect(report.score).toBeGreaterThanOrEqual(65);
      expect(report.formatting_score).toBe(100);
      expect(report.section_completeness).toBe(100); // Has all 5 standard sections
      expect(report.parsing_risks.length).toBe(0);
    });

    it("should flag contact info missing and formatting issues in messy resumes", () => {
      const report = heuristicATSValidate(messyResume, mockJdText, mockSkills);
      
      expect(report.pass).toBe(false);
      expect(report.formatting_score).toBeLessThan(100);
      
      // Email is missing
      const emailRisk = report.parsing_risks.find(r => r.risk === "Missing Email Address");
      expect(emailRisk).toBeDefined();
      expect(emailRisk!.severity).toBe("critical");

      // Table is detected
      const tableIssue = report.formatting_issues.find(i => i.category === "tables");
      expect(tableIssue).toBeDefined();
      expect(tableIssue!.severity).toBe("high");

      // Column structure is detected due to wide spaces
      const layoutIssue = report.formatting_issues.find(i => i.category === "layout");
      expect(layoutIssue).toBeDefined();
    });

    it("should count keyword matches and report them accurately", () => {
      const report = heuristicATSValidate(cleanResume, mockJdText, mockSkills);
      
      // SQL and Python matched, dbt missing
      expect(report.keyword_match_rate).toBe(67); // 2 out of 3 skills
    });
  });

  describe("validateResumeForATS", () => {
    it("should call supabase edge function 'analyze' and parse results on success", async () => {
      const mockAiReport = {
        pass: true,
        score: 85,
        keyword_match_rate: 90,
        section_completeness: 100,
        formatting_score: 95,
        reasons: ["Strong candidate match with minimal gaps."],
        tips: ["Highlight more scale metrics."],
        parsing_risks: [],
        formatting_issues: [],
        actionable_fixes: [
          {
            area: "Skills",
            suggestion: "Add dbt to experience bullets",
            example_before: "Worked on Python and SQL",
            example_after: "Built dbt pipelines integrated with Python and SQL"
          }
        ]
      };

      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify(mockAiReport)
            }
          }
        ]
      };

      vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
        data: mockResponse,
        error: null
      });

      const report = await validateResumeForATS(cleanResume, mockJdText, mockSkills);

      expect(supabase.functions.invoke).toHaveBeenCalledWith("analyze", {
        body: expect.objectContaining({
          model: "llama-3.3-70b-versatile",
          temperature: 0.1
        })
      });
      expect(report.score).toBe(85);
      expect(report.actionable_fixes.length).toBe(1);
      expect(report.actionable_fixes[0].example_after).toContain("dbt");
    });

    it("should gracefully fall back to heuristics on Edge Function error", async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
        data: null,
        error: new Error("Server Error") as any
      });

      const report = await validateResumeForATS(cleanResume, mockJdText, mockSkills);
      
      expect(report.score).toBeDefined();
      expect(report.keyword_match_rate).toBe(67);
    });
  });
});
