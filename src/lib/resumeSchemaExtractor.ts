import { supabase } from "@/integrations/supabase/client";
import type { ResumeExtractedData, ExperienceEntry, EducationEntry, SkillEntry, ProjectEntry, CertificationEntry, LanguageEntry } from "@/types/resume";

/**
 * Collapses whitespace, removes zero-width spaces, and trims text.
 */
export function cleanAndNormalizeResumeText(text: string): string {
  if (!text) return "";
  return text
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Validates and repairs the parsed resume schema, filling missing fields with safe defaults.
 */
export function validateAndRepairResumeResult(raw: Partial<ResumeExtractedData>, resumeText: string): ResumeExtractedData {
  const contact_info = {
    name: raw.contact_info?.name || "",
    email: raw.contact_info?.email || "",
    phone: raw.contact_info?.phone || "",
    location: raw.contact_info?.location || "",
    linkedin: raw.contact_info?.linkedin || "",
    portfolio: raw.contact_info?.portfolio || "",
    github: raw.contact_info?.github || ""
  };

  // Attempt to extract basic details from text if completely empty
  if (!contact_info.email) {
    const emailMatch = resumeText.match(/[\w.-]+@[\w.-]+\.\w+/);
    if (emailMatch) contact_info.email = emailMatch[0];
  }
  if (!contact_info.phone) {
    const phoneMatch = resumeText.match(/\+?\d[\d-\s()]{7,15}\d/);
    if (phoneMatch) contact_info.phone = phoneMatch[0];
  }
  if (!contact_info.name) {
    const lines = resumeText.split(/\n/);
    if (lines.length > 0 && lines[0].trim().length > 3 && lines[0].trim().length < 50) {
      contact_info.name = lines[0].trim();
    }
  }

  const experience: ExperienceEntry[] = Array.isArray(raw.experience) ? raw.experience.map(exp => ({
    company: exp?.company || "Not specified",
    title: exp?.title || "Role",
    dates: {
      start: exp?.dates?.start || "Not specified",
      end: exp?.dates?.end || "Not specified",
      duration_months: typeof exp?.dates?.duration_months === "number" ? exp.dates.duration_months : undefined
    },
    location: exp?.location || "",
    employment_type: exp?.employment_type || "full-time",
    bullets: Array.isArray(exp?.bullets) ? exp.bullets.map(b => ({
      original_text: b?.original_text || (typeof b === "string" ? b : ""),
      action_verb: b?.action_verb || "Actioned",
      subject: b?.subject || "Core tasks",
      metrics: Array.isArray(b?.metrics) ? b.metrics : [],
      technologies: Array.isArray(b?.technologies) ? b.technologies : [],
      skills_demonstrated: Array.isArray(b?.skills_demonstrated) ? b.skills_demonstrated : [],
      impact_level: b?.impact_level || "medium"
    })) : []
  })) : [];

  const education: EducationEntry[] = Array.isArray(raw.education) ? raw.education.map(edu => ({
    institution: edu?.institution || "Institution",
    degree: edu?.degree || "Degree",
    field: edu?.field || "",
    dates: {
      start: edu?.dates?.start || "",
      end: edu?.dates?.end || ""
    },
    gpa: edu?.gpa || undefined,
    honors: Array.isArray(edu?.honors) ? edu.honors : []
  })) : [];

  const skills: SkillEntry[] = Array.isArray(raw.skills) ? raw.skills.map(sk => ({
    name: sk?.name || "",
    category: sk?.category || "other",
    proficiency: sk?.proficiency || "intermediate",
    years_experience: typeof sk?.years_experience === "number" ? sk.years_experience : undefined,
    evidence: Array.isArray(sk?.evidence) ? sk.evidence : []
  })) : [];

  const certifications: CertificationEntry[] = Array.isArray(raw.certifications) ? raw.certifications.map(cert => ({
    name: cert?.name || "Certificate",
    issuer: cert?.issuer || "Issuer",
    dates: {
      obtained: cert?.dates?.obtained || "Not specified",
      expiry: cert?.dates?.expiry || null
    },
    credential_id: cert?.credential_id || null
  })) : [];

  const projects: ProjectEntry[] = Array.isArray(raw.projects) ? raw.projects.map(proj => ({
    name: proj?.name || "Project",
    description: proj?.description || "",
    technologies: Array.isArray(proj?.technologies) ? proj.technologies : [],
    outcome: proj?.outcome || "",
    link: proj?.link || undefined
  })) : [];

  const languages: LanguageEntry[] = Array.isArray(raw.languages) ? raw.languages.map(l => ({
    language: l?.language || "",
    proficiency: l?.proficiency || "conversational"
  })) : [];

  const metrics_summary = {
    total_metrics_found: typeof raw.metrics_summary?.total_metrics_found === "number" ? raw.metrics_summary.total_metrics_found : 0,
    metrics_with_specific_numbers: typeof raw.metrics_summary?.metrics_with_specific_numbers === "number" ? raw.metrics_summary.metrics_with_specific_numbers : 0,
    metrics_with_percentages: typeof raw.metrics_summary?.metrics_with_percentages === "number" ? raw.metrics_summary.metrics_with_percentages : 0,
    metrics_with_dollar_values: typeof raw.metrics_summary?.metrics_with_dollar_values === "number" ? raw.metrics_summary.metrics_with_dollar_values : 0,
    average_impact_level: raw.metrics_summary?.average_impact_level || "medium"
  };

  const confidence_scores = {
    contact_info: typeof raw.confidence_scores?.contact_info === "number" ? raw.confidence_scores.contact_info : 50,
    professional_summary: typeof raw.confidence_scores?.professional_summary === "number" ? raw.confidence_scores.professional_summary : 50,
    experience: typeof raw.confidence_scores?.experience === "number" ? raw.confidence_scores.experience : 50,
    education: typeof raw.confidence_scores?.education === "number" ? raw.confidence_scores.education : 50,
    skills: typeof raw.confidence_scores?.skills === "number" ? raw.confidence_scores.skills : 50,
    projects: typeof raw.confidence_scores?.projects === "number" ? raw.confidence_scores.projects : 50,
    certifications: typeof raw.confidence_scores?.certifications === "number" ? raw.confidence_scores.certifications : 50,
    overall: typeof raw.confidence_scores?.overall === "number" ? raw.confidence_scores.overall : 50
  };

  // Calculate total years of experience if not supplied or zero
  let total_years_experience = typeof raw.total_years_experience === "number" ? raw.total_years_experience : 0;
  if (total_years_experience === 0 && experience.length > 0) {
    let totalMonths = 0;
    experience.forEach(entry => {
      if (entry.dates.duration_months) {
        totalMonths += entry.dates.duration_months;
      } else {
        // Fallback to parse dates
        const start = new Date(entry.dates.start);
        const end = entry.dates.end.toLowerCase().includes("present") ? new Date() : new Date(entry.dates.end);
        if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
          const diff = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
          totalMonths += Math.max(0, diff);
        }
      }
    });
    total_years_experience = Math.round((totalMonths / 12) * 10) / 10;
  }

  return {
    contact_info,
    professional_summary: raw.professional_summary || "",
    total_years_experience,
    experience,
    education,
    skills,
    certifications,
    projects,
    languages,
    metrics_summary,
    confidence_scores
  };
}

/**
 * Heuristic fallback parser for resumes.
 * Extracts basics in case LLM is completely unavailable.
 */
export function decodeResumeHeuristic(text: string): ResumeExtractedData {
  const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/);
  const phoneMatch = text.match(/\+?\d[\d-\s()]{7,15}\d/);
  
  const contact_info = {
    name: "Unknown Candidate",
    email: emailMatch ? emailMatch[0] : "",
    phone: phoneMatch ? phoneMatch[0] : "",
    location: "",
    linkedin: "",
    portfolio: "",
    github: ""
  };

  // Try to find Name by looking at first lines
  const lines = text.split(/\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length > 3 && trimmed.length < 40 && !trimmed.includes("@") && !/\d{5,}/.test(trimmed)) {
      contact_info.name = trimmed;
      break;
    }
  }

  // Word-based name extraction fallback if name is still unknown (e.g. if newlines were collapsed)
  if (contact_info.name === "Unknown Candidate") {
    const words = text.split(/\s+/).filter(Boolean);
    const candidateWords: string[] = [];
    for (const w of words) {
      const lower = w.toLowerCase();
      if (
        w.includes("@") || 
        /\d/.test(w) || 
        lower.includes("email") || 
        lower.includes("phone") || 
        lower.includes("skills") ||
        lower.includes("experience")
      ) {
        break;
      }
      candidateWords.push(w);
      if (candidateWords.length >= 3) break;
    }
    if (candidateWords.length > 0) {
      contact_info.name = candidateWords.join(" ");
    }
  }

  // Parse skills
  const skills: SkillEntry[] = [];
  const knownSkills = ["python", "javascript", "typescript", "react", "sql", "pandas", "dbt", "snowflake", "bigquery", "qlik", "tableau", "aws", "docker"];
  knownSkills.forEach(s => {
    if (new RegExp(`\\b${s}\\b`, "i").test(text)) {
      let name = s.charAt(0).toUpperCase() + s.slice(1);
      if (s === "sql") name = "SQL";
      if (s === "aws") name = "AWS";
      if (s === "dbt") name = "dbt";
      skills.push({
        name,
        category: ["python", "javascript", "typescript", "sql"].includes(s) ? "programming_language" : "tool",
        proficiency: "intermediate",
        evidence: []
      });
    }
  });

  return validateAndRepairResumeResult({
    contact_info,
    professional_summary: "Extracted via offline heuristic backup.",
    total_years_experience: 1,
    skills,
    confidence_scores: {
      contact_info: 70,
      professional_summary: 30,
      experience: 20,
      education: 20,
      skills: 50,
      projects: 20,
      certifications: 20,
      overall: 35
    }
  }, text);
}

/**
 * Reusable Resume Schema Extractor.
 * Invokes Groq via Supabase Edge Functions to produce a highly detailed, validated schema.
 */
export async function extractResumeSchema(resumeText: string, options?: { forceRefresh?: boolean }): Promise<ResumeExtractedData> {
  const cleanedText = cleanAndNormalizeResumeText(resumeText);
  if (cleanedText.length < 50) {
    throw new Error("Resume input text too short. Minimum 50 characters required.");
  }

  // 1. Session Storage cache lookup
  const cacheKey = `resume_schema_cache_${btoa(cleanedText.substring(0, 100))}`;
  if (!options?.forceRefresh) {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        // Continue to fresh extraction
      }
    }
  }

  // 2. Call Supabase edge function 'analyze' to perform extraction using Groq
  try {
    const systemPrompt = `You are an expert resume parser. Extract the structured schema from the resume text.
Calculate total_years_experience based on the experience duration dates.
Analyze every bullet point to extract the action verb, subject, metrics, technologies, and skills.
Return ONLY valid JSON matching the schema below. Do not include markdown code block syntax.`;

    const userPrompt = `Resume Text:
${cleanedText.substring(0, 8000)}

Please return exactly this JSON structure:
{
  "contact_info": { "name": "", "email": "", "phone": "", "location": "", "linkedin": "", "portfolio": "", "github": "" },
  "professional_summary": "",
  "total_years_experience": 0.0,
  "experience": [{
    "company": "",
    "title": "",
    "dates": { "start": "YYYY-MM", "end": "YYYY-MM" or "Present", "duration_months": 0 },
    "location": "",
    "employment_type": "full-time" | "part-time" | "contract" | "internship" | "freelance",
    "bullets": [{
      "original_text": "",
      "action_verb": "",
      "subject": "",
      "metrics": [{ "value": "", "unit": "", "context": "" }],
      "technologies": [],
      "skills_demonstrated": [],
      "impact_level": "low" | "medium" | "high"
    }]
  }],
  "education": [{
    "institution": "",
    "degree": "",
    "field": "",
    "dates": { "start": "YYYY-MM", "end": "YYYY-MM" },
    "gpa": "",
    "honors": []
  }],
  "skills": [{ "name": "", "category": "programming_language" | "framework" | "tool" | "database" | "other", "proficiency": "beginner" | "intermediate" | "advanced" | "expert", "years_experience": 0.0, "evidence": [] }],
  "certifications": [{ "name": "", "issuer": "", "dates": { "obtained": "YYYY-MM", "expiry": "YYYY-MM" or null }, "credential_id": null }],
  "projects": [{ "name": "", "description": "", "technologies": [], "outcome": "", "link": "" }],
  "languages": [{ "language": "", "proficiency": "" }],
  "metrics_summary": { "total_metrics_found": 0, "metrics_with_specific_numbers": 0, "metrics_with_percentages": 0, "metrics_with_dollar_values": 0, "average_impact_level": "medium" },
  "confidence_scores": { "contact_info": 80, "professional_summary": 80, "experience": 80, "education": 80, "skills": 80, "projects": 80, "certifications": 80, "overall": 80 }
}`;

    const { data: rawData, error: invokeError } = await supabase.functions.invoke("analyze", {
      body: {
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1
      }
    });

    if (invokeError) throw new Error(invokeError.message);
    if (!rawData) throw new Error("No data returned from LLM analyzer.");

    const resultText = rawData.choices?.[0]?.message?.content;
    if (!resultText) throw new Error("LLM response body is empty.");

    const parsedJson = JSON.parse(resultText);
    const repaired = validateAndRepairResumeResult(parsedJson, cleanedText);

    // Save to cache
    sessionStorage.setItem(cacheKey, JSON.stringify(repaired));
    return repaired;

  } catch (err: unknown) {
    console.warn(`[ResumeSchemaExtractor] LLM extraction failed. Falling back to heuristics. Error: ${(err as Error).message || err}`);
    const heuristicResult = decodeResumeHeuristic(cleanedText);
    sessionStorage.setItem(cacheKey, JSON.stringify(heuristicResult));
    return heuristicResult;
  }
}
