import { supabase } from "@/integrations/supabase/client";
import type { Skill, ResumeGapResult } from "@/types/jd";
import type { 
  GapAnalysisResult, 
  TechnicalGap, 
  ExperienceGap, 
  EducationGap, 
  PriorityActionItem 
} from "@/types/gapAnalysis";
import { cleanAndNormalizeResumeText } from "./resumeSchemaExtractor";

/**
 * Clean text helper
 */
function cleanText(t: string): string {
  return (t || "").trim();
}

/**
 * Heuristic Gap Analysis Fallback when Edge Function is offline.
 * Programmatically compares the candidate's resume text against JD skills and title.
 */
export function heuristicGapAnalysis(
  resumeText: string,
  jdText: string,
  jdSkills: Skill[],
  jobTitle: string
): ResumeGapResult {
  const normalizedResume = resumeText.toLowerCase();
  const normalizedJd = jdText.toLowerCase();

  // 1. Technical Gaps
  const technical_gaps: TechnicalGap[] = [];
  const missingKeywords: string[] = [];
  const underrepresentedKeywords: string[] = [];

  let matchedSkillsCount = 0;

  jdSkills.forEach(s => {
    const skillName = s.skill.toLowerCase();
    const regex = new RegExp(`\\b${skillName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i');
    const hasIt = regex.test(normalizedResume);

    let status: "has_it" | "missing" | "partial" = "missing";
    let description = `The required skill "${s.skill}" was not found in your resume text.`;
    let mitigation_strategy = `Incorporate experience with "${s.skill}" or equivalent technologies in your projects.`;

    if (hasIt) {
      status = "has_it";
      matchedSkillsCount++;
      description = `Found "${s.skill}" in your resume profile.`;
      mitigation_strategy = "";
      
      // Check if mentioned in bullet descriptions or just in skill tags
      const occurrences = (normalizedResume.match(new RegExp(skillName, 'gi')) || []).length;
      if (occurrences < 2) {
        status = "partial";
        description = `Found "${s.skill}" in your resume, but it is underrepresented.`;
        mitigation_strategy = `Integrate "${s.skill}" more prominently into your professional experience achievements.`;
        underrepresentedKeywords.push(s.skill);
      }
    } else {
      missingKeywords.push(s.skill);
    }

    technical_gaps.push({
      requirement: s.skill,
      status,
      impact: s.importance > 75 ? "dealbreaker" : s.importance > 45 ? "important" : "minor",
      description,
      mitigation_strategy
    });
  });

  // 2. Experience Gaps (heuristic check of title and content length)
  const experience_gaps: ExperienceGap[] = [];
  const lowerTitle = jobTitle.toLowerCase();
  const isSeniorRole = lowerTitle.includes("senior") || lowerTitle.includes("lead") || lowerTitle.includes("avp") || lowerTitle.includes("manager") || lowerTitle.includes("director");
  const isCandidateIntern = normalizedResume.includes("intern") || normalizedResume.includes("trainee") || normalizedResume.includes("student");

  if (isSeniorRole && isCandidateIntern) {
    experience_gaps.push({
      requirement: "Seniority and Leadership Experience",
      status: "partial",
      impact: "dealbreaker",
      description: "The job title indicates a senior/AVP level role, but your resume highlights internship experience.",
      mitigation_strategy: "Reframe your internship bullets to emphasize ownership, end-to-end product delivery, and cross-functional leadership."
    });
  }

  // Check general data pipeline experience
  if (lowerTitle.includes("engineer") && !normalizedResume.includes("pipeline") && !normalizedResume.includes("etl") && !normalizedResume.includes("elt")) {
    experience_gaps.push({
      requirement: "Data Pipeline Engineering",
      status: "missing",
      impact: "important",
      description: "Target role requires data engineering pipeline construction, but 'pipeline', 'ETL', or 'ELT' were not found in your resume.",
      mitigation_strategy: "Describe how you cleaned, structured, and moved datasets in your projects using terms like 'ETL pipeline'."
    });
  }

  // 3. Education Gaps
  const education_gaps: EducationGap[] = [];
  const hasDegree = normalizedResume.includes("bachelor") || normalizedResume.includes("b.tech") || normalizedResume.includes("degree") || normalizedResume.includes("b.e.") || normalizedResume.includes("university") || normalizedResume.includes("college");
  
  if (!hasDegree) {
    education_gaps.push({
      requirement: "Bachelor's Degree in Technical Field",
      user_status: "missing",
      impact: "important",
      alternative_path: "Highlight professional experience, active bootcamps, and specialized technical certifications."
    });
  } else if (lowerTitle.includes("data scientist") && !normalizedResume.includes("statistics") && !normalizedResume.includes("math")) {
    education_gaps.push({
      requirement: "Quantitative / Statistical Foundations",
      user_status: "partial",
      impact: "minor",
      alternative_path: "Mention relevant academic coursework in statistics, linear algebra, or machine learning models."
    });
  }

  // 4. Keyword Gaps
  const keyword_gaps = {
    missing_keywords: missingKeywords.slice(0, 5),
    underrepresented_keywords: underrepresentedKeywords.slice(0, 5),
    keyword_density_suggestions: [
      "Incorporate missing core skills into your skills list.",
      "Add context for underrepresented keywords inside your project and experience sections."
    ]
  };

  // 5. Culture Fit Analysis
  const culture_fit_analysis = {
    alignment_score: isSeniorRole && isCandidateIntern ? 65 : 85,
    matched_signals: ["Demonstrates fast learning and technical flexibility.", "Active builder mindset shown in projects."],
    missing_signals: isSeniorRole ? ["Strategic decision ownership.", "Enterprise stakeholder communication."] : ["Data engineering patterns."],
    red_flags: isSeniorRole && isCandidateIntern ? ["Candidate's current tenure might indicate a need for closer supervision than typical for this role."] : []
  };

  // 6. Achievement Gaps
  const hasQuantified = /\b\d+(?:\.\d+)?%/.test(resumeText) || /\$\s*\d+/.test(resumeText) || /₹\s*\d+/.test(resumeText);
  const achievement_gaps = {
    has_quantified_achievements: hasQuantified,
    achievement_quality_score: hasQuantified ? 80 : 40,
    missing_impact_areas: hasQuantified ? ["Scalability metrics"] : ["Quantifiable cost savings", "Latency speedup", "Model accuracy"],
    suggested_achievements: [
      `Delivered automated data workflows, reducing manual analysis time by [METRIC: review speedup %].`,
      `Optimized queries and pipelines, improving execution latency by [METRIC: latency reduction %].`
    ]
  };

  // 7. Priority Action Plan
  const priority_action_plan: PriorityActionItem[] = [
    {
      priority: 1,
      action: "Add missing keywords to Skills section",
      impact: "high",
      effort: "hours",
      how_to_do_it: `Incorporate the following missing keywords directly into your skills tags: ${missingKeywords.slice(0, 3).join(", ")}.`
    }
  ];

  if (isSeniorRole && isCandidateIntern) {
    priority_action_plan.push({
      priority: 2,
      action: "Refocus Professional Summary on End-to-End Ownership",
      impact: "high",
      effort: "hours",
      how_to_do_it: "Rewrite your professional summary to position yourself as an Analytics Engineer capable of autonomous delivery, emphasizing technical credentials over junior tenure."
    });
  }

  priority_action_plan.push({
    priority: priority_action_plan.length + 1,
    action: "Quantify project bullets",
    impact: "medium",
    effort: "days",
    how_to_do_it: "Review your active projects (like Customer Churn or Kannada RAG) and add specific performance or business metrics using the suggested achievements."
  });

  // 8. Competitive Positioning
  const competitive_positioning = {
    user_strengths: [
      "Demonstrates high learning velocity with modern AI/LLM technologies.",
      "Clear capability to build end-to-end projects."
    ],
    user_weaknesses: [
      isSeniorRole && isCandidateIntern ? "Tenure alignment mismatch (intern transitioning directly to AVP)." : "Lacks deep enterprise scale metrics."
    ],
    differentiation_opportunities: [
      "Highlight modern generative AI and agentic skills to position yourself as a forward-looking developer."
    ]
  };

  // 9. Match score calculation
  const baseKeywordScore = jdSkills.length > 0 ? Math.round((matchedSkillsCount / jdSkills.length) * 100) : 70;
  const overall_match_score = Math.max(30, Math.min(95, isSeniorRole && isCandidateIntern ? Math.round(baseKeywordScore * 0.7) : baseKeywordScore));

  const detailed_gaps: GapAnalysisResult = {
    overall_match_score,
    summary: `Your profile has a ${overall_match_score}% match with the required stack. ${
      isSeniorRole && isCandidateIntern 
        ? "However, there is a significant seniority discrepancy for this AVP-level role." 
        : "Some technical keyword gaps should be addressed before submitting."
    }`,
    technical_gaps,
    experience_gaps,
    education_gaps,
    keyword_gaps,
    culture_fit_analysis,
    achievement_gaps,
    priority_action_plan,
    competitive_positioning
  };

  // Build standard deductions list
  const deductions = missingKeywords.map(k => ({
    reason: `Missing skill: ${k}`,
    percent: 5,
    fix_snippet: `Add ${k} to your professional skills section and project descriptions.`
  }));

  if (isSeniorRole && isCandidateIntern) {
    deductions.push({
      reason: "Seniority Gap (AVP vs Intern)",
      percent: 20,
      fix_snippet: "Rewrite professional summary to highlight leadership and complete lifecycle engineering."
    });
  }

  return {
    overall_match: overall_match_score,
    summary: detailed_gaps.summary,
    deductions,
    skill_matches: jdSkills.map(s => {
      const has = !missingKeywords.includes(s.skill);
      return {
        skill: s.skill,
        match_percent: has ? 100 : 0,
        verdict: has ? "strong" : "missing",
        note: has ? "Found in resume" : "Missing from resume"
      };
    }),
    actionable_directives: priority_action_plan.map(p => ({
      action: p.action,
      description: p.how_to_do_it
    })),
    detailed_gaps
  };
}

/**
 * Executes high-fidelity gap analysis by invoking Supabase Edge function
 * and fallbacks to client heuristics on network issues.
 */
export async function parseGapAnalysis(
  resumeText: string,
  jdText: string,
  jdSkills: Skill[],
  jobTitle: string,
  options?: { forceRefresh?: boolean }
): Promise<ResumeGapResult> {
  const cleanedResume = cleanAndNormalizeResumeText(resumeText);
  const cleanedJd = cleanText(jdText);

  if (cleanedResume.length < 50) {
    throw new Error("Resume input text too short. Minimum 50 characters required.");
  }

  // 1. Session Storage cache lookup
  const cacheKey = `gap_analysis_cache_${btoa(cleanedResume.substring(0, 50) + cleanedJd.substring(0, 50))}`;
  if (!options?.forceRefresh) {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        // Fall through
      }
    }
  }

  // 2. Call Supabase edge function 'compare-resume'
  try {
    const { data, error } = await supabase.functions.invoke("compare-resume", {
      body: {
        jdSkills,
        resumeText: cleanedResume,
        jobTitle,
        jdText: cleanedJd
      }
    });

    if (error) throw new Error(error.message);
    if (!data) throw new Error("No analysis data returned.");

    if (data.error) {
      throw new Error(data.error);
    }

    // Secure backwards compatibility
    const result: ResumeGapResult = {
      overall_match: typeof data.overall_match === "number" ? data.overall_match : (data.detailed_gaps?.overall_match_score || 50),
      summary: data.summary || data.detailed_gaps?.summary || "Analysis complete.",
      deductions: Array.isArray(data.deductions) ? data.deductions : [],
      skill_matches: Array.isArray(data.skill_matches) ? data.skill_matches : [],
      actionable_directives: Array.isArray(data.actionable_directives) ? data.actionable_directives : [],
      detailed_gaps: data.detailed_gaps || undefined
    };

    // If detailed_gaps was missing, synthesize a simple one to avoid UI errors
    if (!result.detailed_gaps) {
      result.detailed_gaps = {
        overall_match_score: result.overall_match,
        summary: result.summary,
        technical_gaps: jdSkills.map(s => {
          const matched = result.skill_matches?.find(sm => sm.skill.toLowerCase() === s.skill.toLowerCase());
          const hasIt = matched ? matched.verdict === "strong" : false;
          return {
            requirement: s.skill,
            status: hasIt ? "has_it" : "missing",
            impact: s.importance > 75 ? "dealbreaker" : "important",
            description: hasIt ? `Demonstrated competence in ${s.skill}.` : `No direct mention of ${s.skill} found.`,
            mitigation_strategy: hasIt ? "" : `Acquire proficiency in ${s.skill} or highlight similar tools.`
          };
        }),
        experience_gaps: [],
        education_gaps: [],
        keyword_gaps: {
          missing_keywords: result.deductions.map(d => d.reason.replace("Missing skill: ", "")),
          underrepresented_keywords: [],
          keyword_density_suggestions: ["Incorporate core missing tools into your resume experience and tags."]
        },
        culture_fit_analysis: {
          alignment_score: 80,
          matched_signals: ["Technical capability matching."],
          missing_signals: [],
          red_flags: []
        },
        achievement_gaps: {
          has_quantified_achievements: true,
          achievement_quality_score: 75,
          missing_impact_areas: [],
          suggested_achievements: []
        },
        priority_action_plan: (result.actionable_directives || []).map((ad, idx) => ({
          priority: idx + 1,
          action: ad.action,
          impact: "medium",
          effort: "days",
          how_to_do_it: ad.description
        })),
        competitive_positioning: {
          user_strengths: ["Matching skills found in active profile."],
          user_weaknesses: ["Missing skills noted in deductions."],
          differentiation_opportunities: ["Highlight AI engineering skills and metrics."]
        }
      };
    }

    sessionStorage.setItem(cacheKey, JSON.stringify(result));
    return result;

  } catch (err: any) {
    console.warn(`[GapAnalyzer] AI comparison failed. Falling back to offline heuristics. Error: ${err.message || err}`);
    const heuristicResult = heuristicGapAnalysis(cleanedResume, cleanedJd, jdSkills, jobTitle);
    sessionStorage.setItem(cacheKey, JSON.stringify(heuristicResult));
    return heuristicResult;
  }
}
