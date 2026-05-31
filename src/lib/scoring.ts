import type { JobScore, RubricDimension } from "@/types/applications";
import type { GeneratedResume } from "@/types/jd";

const DIMENSIONS: RubricDimension[] = ["relevance", "impact", "skills_match", "experience_depth", "education_fit", "cultural_signals"];

export function buildScoringPrompt(resume: GeneratedResume, jdTitle: string, jdSkills: string[]): string {
  return `You are a hiring expert. Score this resume against the following job:
Job: ${jdTitle}
Required Skills: ${jdSkills.join(", ")}

Resume Summary: ${resume.professional_summary}
Resume Skills: ${(resume.skills_section || []).join(", ")}
Experience: ${(resume.experience || []).map((e) => `${e.heading}: ${e.content}`).join(" | ")}

Score each dimension 0-100:
- relevance: How relevant is the background?
- impact: How impactful are the achievements?
- skills_match: How well do skills match requirements?
- experience_depth: How deep is the relevant experience?
- education_fit: How well does education align?
- cultural_signals: Evidence of ownership, growth, mission-alignment?

Return JSON only: { "overall": "A|B|C|D|F", "dimensions": { "relevance": 85, ... }, "reasoning": "2-3 sentences", "suggestions": ["suggestion1", "suggestion2"] }`;
}

export function parseScoreResponse(raw: string): JobScore | null {
  try {
    const cleaned = raw.replace(/```(?:json)?\s*/gi, "").trim();
    const parsed = JSON.parse(cleaned);
    if (!parsed.overall || !parsed.dimensions) return null;
    const dimensions = parsed.dimensions as Record<string, number>;
    const validDims: Record<RubricDimension, number> = {} as Record<RubricDimension, number>;
    for (const dim of DIMENSIONS) {
      validDims[dim] = typeof dimensions[dim] === "number" ? Math.min(100, Math.max(0, dimensions[dim])) : 50;
    }
    return {
      overall: ["A", "B", "C", "D", "F"].includes(parsed.overall) ? parsed.overall : "C",
      dimensions: validDims,
      reasoning: typeof parsed.reasoning === "string" ? parsed.reasoning : "",
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions.slice(0, 5) : [],
    };
  } catch {
    return null;
  }
}
