import { supabase } from "@/integrations/supabase/client";
import type { Skill } from "@/types/jd";
import type { 
  ATSValidationReport, 
  ATSParsingRisk, 
  ATSFormattingIssue, 
  ATSActionableFix 
} from "@/types/atsValidator";

/**
 * Normalizes text for comparison
 */
function cleanText(t: string): string {
  return (t || "").trim();
}

/**
 * Heuristic ATS Validation Fallback when the Edge Function / Groq API is offline.
 * programmatically audits the resume against the JD using regex and rules.
 */
export function heuristicATSValidate(
  resumeText: string,
  jdText: string,
  jdSkills: Skill[]
): ATSValidationReport {
  const normalizedResume = resumeText.toLowerCase();
  const normalizedJd = jdText.toLowerCase();

  const parsing_risks: ATSParsingRisk[] = [];
  const formatting_issues: ATSFormattingIssue[] = [];
  const actionable_fixes: ATSActionableFix[] = [];
  const reasons: string[] = [];
  const tips: string[] = [];

  let formattingScore = 100;

  // 1. Check Contact Info
  const hasEmail = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/.test(resumeText);
  const hasPhone = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b|\+?\d{10,12}\b/.test(resumeText);

  if (!hasEmail) {
    parsing_risks.push({
      risk: "Missing Email Address",
      description: "No email address was identified in your resume text. ATS will fail to contact you.",
      severity: "critical",
      resolution: "Add a professional email address to the contact details section at the top of your resume."
    });
    actionable_fixes.push({
      area: "Contact Details",
      suggestion: "Include your email address (e.g. email@domain.com)",
      example_before: "Name\nBengaluru, India",
      example_after: "Name\nemail@domain.com | Bengaluru, India"
    });
    formattingScore -= 15;
  }

  if (!hasPhone) {
    parsing_risks.push({
      risk: "Missing Phone Number",
      description: "No contact phone number was found. Recruiters or ATS screeners cannot reach you.",
      severity: "critical",
      resolution: "Include a valid contact phone number with country code at the top of your resume."
    });
    formattingScore -= 10;
  }

  // 2. Check Table and Column structures
  const hasTableSymbols = /\|.*\||\+[-+]{3,}\+/.test(resumeText) || (resumeText.split("\n").filter(line => line.includes("|")).length > 2);
  const multipleSpacesPattern = /\w{2,}\s{5,}\w{2,}/g;
  const multipleSpacesMatches = resumeText.match(multipleSpacesPattern) || [];

  if (hasTableSymbols) {
    formatting_issues.push({
      category: "tables",
      severity: "high",
      description: "Table grid symbols (like '|' or '+----+') detected. ATS parsers often merge table cells and scramble sentences.",
      fix: "Remove table outlines and present structural content using simple bullet points instead."
    });
    parsing_risks.push({
      risk: "Table Layout Scrambling",
      description: "ATS cannot reliably parse table cells, often reading row-by-row across columns.",
      severity: "critical",
      resolution: "Convert all tables to tabbed or bulleted lists."
    });
    formattingScore -= 15;
  }

  if (multipleSpacesMatches.length > 5) {
    formatting_issues.push({
      category: "layout",
      severity: "high",
      description: "Multi-column whitespace structure detected. ATS parsers read left-to-right, merging text from parallel columns.",
      fix: "Use a clean, single-column vertical layout for standard resume parsing safety."
    });
    parsing_risks.push({
      risk: "Multi-Column Layout Mismatch",
      description: "Text columns are often read linearly, scrambling experience summaries and timelines.",
      severity: "warning",
      resolution: "Change your resume design to a standard single-column format."
    });
    formattingScore -= 15;
  }

  // 3. Section Completeness Check
  const sectionChecks = [
    {
      name: "Professional Summary",
      regex: /summary|profile|about\s*me|objective/i,
      weight: 20
    },
    {
      name: "Work Experience",
      regex: /experience|work\s*history|employment\s*history|professional\s*experience/i,
      weight: 35
    },
    {
      name: "Skills",
      regex: /skills|technical\s*skills|core\s*competencies|expertise|technologies/i,
      weight: 25
    },
    {
      name: "Education",
      regex: /education|academic\s*background|degrees|academic\s*history/i,
      weight: 15
    },
    {
      name: "Projects",
      regex: /projects|personal\s*projects|selected\s*projects/i,
      weight: 5
    }
  ];

  let sectionCompletenessScore = 0;
  const missingSections: string[] = [];

  sectionChecks.forEach(sec => {
    if (sec.regex.test(resumeText)) {
      sectionCompletenessScore += sec.weight;
    } else {
      missingSections.push(sec.name);
      parsing_risks.push({
        risk: `Missing Section: ${sec.name}`,
        description: `The standard section '${sec.name}' was not detected by our parser.`,
        severity: sec.weight > 20 ? "critical" : "warning",
        resolution: `Add a clear header '${sec.name}' and populate the section.`
      });
    }
  });

  // 4. Keyword Match Check
  let matchedSkillsCount = 0;
  const missingKeywords: string[] = [];
  const underrepresentedKeywords: string[] = [];

  jdSkills.forEach(s => {
    const skillName = s.skill.toLowerCase();
    const regex = new RegExp(`\\b${skillName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i');
    const matches = normalizedResume.match(regex);

    if (matches) {
      matchedSkillsCount++;
      const occurrences = (normalizedResume.match(new RegExp(skillName, 'gi')) || []).length;
      if (occurrences < 2 && s.importance > 60) {
        underrepresentedKeywords.push(s.skill);
      }
    } else {
      missingKeywords.push(s.skill);
    }
  });

  const keywordMatchRate = jdSkills.length > 0 
    ? Math.round((matchedSkillsCount / jdSkills.length) * 100) 
    : 75;

  // Final Calculations
  const finalFormattingScore = Math.max(30, formattingScore);
  const overallScore = Math.round(
    (keywordMatchRate * 0.4) + (sectionCompletenessScore * 0.3) + (finalFormattingScore * 0.3)
  );

  const pass = overallScore >= 65;

  // Populate reasons and tips
  if (keywordMatchRate < 60) {
    reasons.push("Low keyword match rate — your resume misses critical technical skills.");
    tips.push("Integrate key skills directly into your professional experience and projects sections.");
  }
  if (missingSections.length > 0) {
    reasons.push(`Missing standard sections: ${missingSections.join(", ")}`);
    tips.push("Use standard, simple section headers so ATS parsers can categorize your qualifications.");
  }
  if (finalFormattingScore < 80) {
    reasons.push("Formatting issues detected that could cause parsing failures (columns or tables).");
    tips.push("Convert the resume to a clean, single-column layout without graphical elements or tables.");
  }
  if (pass && reasons.length === 0) {
    reasons.push("Resume meets minimum ATS compatibility requirements.");
  }

  // Actionable keyword additions
  if (missingKeywords.length > 0) {
    actionable_fixes.push({
      area: "Skills Section",
      suggestion: `Add the following missing keywords from the JD: ${missingKeywords.slice(0, 4).join(", ")}`,
      example_after: `Skills: ${missingKeywords.slice(0, 4).join(", ")}, [Your current skills]`
    });
  }

  return {
    pass,
    score: overallScore,
    keyword_match_rate: keywordMatchRate,
    section_completeness: sectionCompletenessScore,
    formatting_score: finalFormattingScore,
    reasons,
    tips,
    parsing_risks,
    formatting_issues,
    actionable_fixes
  };
}

/**
 * Validates a resume against a job description for ATS parsing safety.
 * Invokes Groq Llama 3.3 via the Supabase Deno 'analyze' function, with heuristic fallback.
 */
export async function validateResumeForATS(
  resumeText: string,
  jdText: string,
  jdSkills: Skill[],
  options?: { forceRefresh?: boolean }
): Promise<ATSValidationReport> {
  const cleanedResume = cleanText(resumeText);
  const cleanedJd = cleanText(jdText);

  if (cleanedResume.length < 50) {
    throw new Error("Resume too short. Minimum 50 characters required.");
  }

  // 1. Session Storage Cache Lookup
  const cacheKey = `ats_validate_cache_${btoa(cleanedResume.substring(0, 50) + cleanedJd.substring(0, 50))}`;
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

  // 2. API Call to Edge Function 'analyze'
  try {
    const skillList = jdSkills.map(s => s.skill).join(", ");
    const prompt = `
      You are an expert ATS (Applicant Tracking System) parser and validator. 
      Analyze the candidate's resume raw text against the target job description and skills.
      Assess:
      1. Formatting & layout risks (columns, tables, graphics, non-standard elements).
      2. Section completeness (verify if standard sections like Professional Summary, Work Experience, Skills, Education, Projects are present).
      3. Keyword match rate (critical keywords from the JD present/missing/underrepresented in the resume).
      4. Provide actionable fixes with "before" and "after" examples.

      Resume text:
      ${cleanedResume}

      Job Description text:
      ${cleanedJd}

      Core required skills:
      ${skillList}

      You MUST respond with a valid JSON object matching this schema exactly:
      {
        "pass": boolean,
        "score": number, // 0-100 overall score
        "keyword_match_rate": number, // 0-100 keyword match rate
        "section_completeness": number, // 0-100 section completeness score
        "formatting_score": number, // 0-100 formatting safety score
        "reasons": ["short explanation for deductions"],
        "tips": ["high-impact improvement suggestions"],
        "parsing_risks": [
          {
            "risk": "Risk Name",
            "description": "ATS parsing impact details",
            "severity": "critical" | "warning" | "info",
            "resolution": "Action to fix this risk"
          }
        ],
        "formatting_issues": [
          {
            "category": "layout" | "fonts" | "tables" | "graphics" | "other",
            "severity": "high" | "medium" | "low",
            "description": "Details of the formatting issue",
            "fix": "Action to correct this issue"
          }
        ],
        "actionable_fixes": [
          {
            "area": "Section or detail area",
            "suggestion": "Detailed instructions on what to change",
            "example_before": "Raw text snippet from resume",
            "example_after": "Recommended rewrite or addition"
          }
        ]
      }
    `;

    const { data, error } = await supabase.functions.invoke("analyze", {
      body: {
        model: "llama-3.3-70b-versatile",
        messages: [
          { 
            role: "system", 
            content: "You are an elite ATS resume parser and compliance auditor. Analyze the inputs and output JSON matching the requested schema exactly. Never include markdown wrappers like ```json." 
          },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
      }
    });

    if (error) throw new Error(error.message);
    if (!data) throw new Error("No data returned from AI scan.");

    // The 'analyze' function returns a standard OpenAI/Groq response layout:
    // data.choices[0].message.content
    const responseContent = data.choices?.[0]?.message?.content;
    if (!responseContent) throw new Error("Groq returned an empty response.");

    const firstBrace = responseContent.indexOf('{');
    const lastBrace = responseContent.lastIndexOf('}');
    if (firstBrace === -1 || lastBrace === -1) throw new Error("Response was not a valid JSON structure.");

    const parsedReport: ATSValidationReport = JSON.parse(responseContent.substring(firstBrace, lastBrace + 1));

    // Ensure all required fields exist
    parsedReport.pass = typeof parsedReport.pass === "boolean" ? parsedReport.pass : (parsedReport.score >= 65);
    parsedReport.reasons = Array.isArray(parsedReport.reasons) ? parsedReport.reasons : [];
    parsedReport.tips = Array.isArray(parsedReport.tips) ? parsedReport.tips : [];
    parsedReport.parsing_risks = Array.isArray(parsedReport.parsing_risks) ? parsedReport.parsing_risks : [];
    parsedReport.formatting_issues = Array.isArray(parsedReport.formatting_issues) ? parsedReport.formatting_issues : [];
    parsedReport.actionable_fixes = Array.isArray(parsedReport.actionable_fixes) ? parsedReport.actionable_fixes : [];

    sessionStorage.setItem(cacheKey, JSON.stringify(parsedReport));
    return parsedReport;

  } catch (err: any) {
    console.warn(`[ATSValidator] Groq ATS Scan failed. Falling back to offline heuristics. Error: ${err.message || err}`);
    const heuristicReport = heuristicATSValidate(cleanedResume, cleanedJd, jdSkills);
    sessionStorage.setItem(cacheKey, JSON.stringify(heuristicReport));
    return heuristicReport;
  }
}
