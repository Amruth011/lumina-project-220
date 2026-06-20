import { describe, it, expect, vi, beforeEach } from "vitest";
import { 
  cleanAndNormalizeJdText, 
  validateAndRepairJdResult, 
  parseJobDescription 
} from "@/lib/structuredJdParser";
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

describe("Structured JD Parser Module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock localStorage
    const store: Record<string, string> = {};
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => { store[key] = value; },
      removeItem: (key: string) => { delete store[key]; },
      clear: () => { for (const k in store) delete store[k]; }
    });
  });

  describe("cleanAndNormalizeJdText", () => {
    it("should collapse multiple whitespace and trim output", () => {
      const input = "  Senior \n   Software   Engineer \u200B  ";
      const expected = "Senior Software Engineer";
      expect(cleanAndNormalizeJdText(input)).toBe(expected);
    });

    it("should handle empty inputs", () => {
      expect(cleanAndNormalizeJdText("")).toBe("");
    });
  });

  describe("validateAndRepairJdResult", () => {
    it("should fill missing overview, requirements, and structured_data fields with safe defaults", () => {
      const rawInput = {
        title: "AI Engineer",
        skills: [{ skill: "React", importance: 80, category: "Frontend" }]
      };
      
      const result = validateAndRepairJdResult(rawInput, "sample jd text");
      
      expect(result.valid).toBe(true);
      expect(result.overview?.role).toBe("AI Engineer");
      expect(result.overview?.company).toBe("Not specified");
      expect(result.requirements.education).toEqual([]);
      expect(result.requirements.experience).toBe("Not explicitly specified in the JD.");
      
      // Verify new structured fields are present and safe
      expect(result.structured_data).toBeDefined();
      expect(result.structured_data?.role_title).toBe("AI Engineer");
      expect(result.structured_data?.company_name).toBe("Not specified");
      expect(result.structured_data?.hard_requirements).toEqual([]);
      expect(result.structured_data?.company_context).toEqual({
        stage: "",
        size: "",
        industry: "",
        work_style: "",
        communication_style: ""
      });
      expect(result.structured_data?.red_flags).toEqual({
        vague_requirements: [],
        unrealistic_expectations: []
      });
    });
  });

  describe("parseJobDescription", () => {
    it("should throw error if input is too short", async () => {
      await expect(parseJobDescription("short")).rejects.toThrow("too short");
    });

    it("should invoke edge function and return repaired result on success", async () => {
      const mockEdgeResult = {
        data: {
          valid: true,
          title: "Senior Full Stack Developer",
          skills: [{ skill: "TypeScript", importance: 90, category: "Languages" }],
          structured_data: {
            role_title: "Senior Full Stack Developer",
            company_name: "Lumina Labs",
            employment_type: "Full-time",
            location: "Remote",
            hard_requirements: [
              { category: "Languages", priority: "must-have", minimum_years: 5, specific_technologies: ["TypeScript", "Node.js"] }
            ]
          }
        },
        error: null
      };

      vi.mocked(supabase.functions.invoke).mockResolvedValue(mockEdgeResult as unknown);

      const jdText = "This is a longer job description that meets the length threshold of twenty characters.";
      const result = await parseJobDescription(jdText);

      expect(supabase.functions.invoke).toHaveBeenCalledWith("decode-jd", {
        body: { jdText }
      });
      expect(result.title).toBe("Senior Full Stack Developer");
      expect(result.structured_data?.company_name).toBe("Lumina Labs");
      expect(result.structured_data?.hard_requirements[0].minimum_years).toBe(5);
    });

    it("should fall back to heuristic client-side parser if edge function fails", async () => {
      // Simulate network / edge function error
      vi.mocked(supabase.functions.invoke).mockRejectedValue(new Error("Supabase Network Failure"));

      const jdText = "We are hiring a Python Backend Engineer at Google in Bangalore. Needs 5+ years of experience. Hybrid work.";
      const result = await parseJobDescription(jdText);

      // Verify it fell back to client-side heuristics
      expect(supabase.functions.invoke).toHaveBeenCalled();
      expect(result.valid).toBe(true);
      expect(result.title).toContain("Backend");
      expect(result.structured_data?.role_title).toContain("Backend");
      expect(result.structured_data?.company_name).toBe("Google");
      expect(result.structured_data?.location).toBe("Hybrid");
    });
  });
});
