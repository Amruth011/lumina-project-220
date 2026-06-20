import { describe, it, expect, vi, beforeEach } from "vitest";
import { 
  cleanAndNormalizeResumeText, 
  validateAndRepairResumeResult, 
  decodeResumeHeuristic,
  extractResumeSchema 
} from "@/lib/resumeSchemaExtractor";
import { supabase } from "@/integrations/supabase/client";

// Mock supabase invoke
vi.mock("@/integrations/supabase/client", () => {
  return {
    supabase: {
      functions: {
        invoke: vi.fn(),
      },
    },
  };
});

describe("Resume Schema Extractor Module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock sessionStorage
    const store: Record<string, string> = {};
    vi.stubGlobal("sessionStorage", {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => { store[key] = value; },
      removeItem: (key: string) => { delete store[key]; },
      clear: () => { for (const k in store) delete store[k]; }
    });
  });

  describe("cleanAndNormalizeResumeText", () => {
    it("should collapse multiple whitespace and trim output", () => {
      const input = "  Amruth \n   Kumar   M \u200B  ";
      const expected = "Amruth Kumar M";
      expect(cleanAndNormalizeResumeText(input)).toBe(expected);
    });

    it("should handle empty inputs", () => {
      expect(cleanAndNormalizeResumeText("")).toBe("");
    });
  });

  describe("validateAndRepairResumeResult", () => {
    it("should fill missing sections and scores with safe defaults", () => {
      const rawInput = {
        contact_info: { name: "Amruth Kumar M", email: "", phone: "", location: "", linkedin: "", portfolio: "", github: "" },
        professional_summary: "Data scientist with experience."
      };
      
      const result = validateAndRepairResumeResult(rawInput, "sample resume text with test@gmail.com and +91 9148159827");
      
      expect(result.contact_info.name).toBe("Amruth Kumar M");
      expect(result.contact_info.email).toBe("test@gmail.com");
      expect(result.contact_info.phone).toBe("+91 9148159827");
      expect(result.professional_summary).toBe("Data scientist with experience.");
      expect(result.experience).toEqual([]);
      expect(result.education).toEqual([]);
      expect(result.skills).toEqual([]);
      expect(result.confidence_scores.overall).toBe(50);
    });
  });

  describe("decodeResumeHeuristic", () => {
    it("should extract email, phone, name and standard skills from text", () => {
      const text = "Amruth Kumar M\nEmail: amruth@gmail.com\nPhone: +919148159827\nSkills: Python, SQL, React";
      const result = decodeResumeHeuristic(text);

      expect(result.contact_info.name).toBe("Amruth Kumar M");
      expect(result.contact_info.email).toBe("amruth@gmail.com");
      expect(result.contact_info.phone).toBe("+919148159827");
      expect(result.skills.map(s => s.name)).toContain("Python");
      expect(result.skills.map(s => s.name)).toContain("SQL");
      expect(result.skills.map(s => s.name)).toContain("React");
      expect(result.confidence_scores.overall).toBe(35);
    });
  });

  describe("extractResumeSchema", () => {
    it("should throw error if input is too short", async () => {
      await expect(extractResumeSchema("short")).rejects.toThrow("too short");
    });

    it("should invoke analyze edge function and return repaired result on success", async () => {
      const mockResult = {
        contact_info: { name: "Amruth Kumar M", email: "amruth@gmail.com", phone: "+91 9148159827", location: "Bengaluru", linkedin: "ln", portfolio: "pf", github: "gh" },
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
                original_text: "Optimized preprocessing pipeline by 40%",
                action_verb: "Optimized",
                subject: "pipeline",
                metrics: [{ value: "40", unit: "%", context: "reduction" }],
                technologies: ["SQL", "Pandas"],
                skills_demonstrated: ["Optimization"],
                impact_level: "high"
              }
            ]
          }
        ]
      };

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: {
          choices: [
            {
              message: {
                content: JSON.stringify(mockResult)
              }
            }
          ]
        },
        error: null
      } as unknown);

      const text = "Amruth Kumar M at iStudio. Optimized preprocessing pipeline by 40%. amruth@gmail.com +91 9148159827. Experience: Feb 2026 to May 2026.";
      const result = await extractResumeSchema(text);

      expect(supabase.functions.invoke).toHaveBeenCalled();
      expect(result.contact_info.name).toBe("Amruth Kumar M");
      expect(result.experience[0].company).toBe("iStudio");
      expect(result.experience[0].bullets[0].metrics[0].value).toBe("40");
    });

    it("should fall back to heuristics if analyze edge function fails", async () => {
      vi.mocked(supabase.functions.invoke).mockRejectedValue(new Error("Edge Call Failure"));

      const text = "Amruth Kumar M\nEmail: amruth@gmail.com\nPhone: +919148159827\nSkills: Python, SQL, React";
      const result = await extractResumeSchema(text);

      expect(result.contact_info.name).toBe("Amruth Kumar M");
      expect(result.contact_info.email).toBe("amruth@gmail.com");
      expect(result.skills.map(s => s.name)).toContain("Python");
    });
  });
});
