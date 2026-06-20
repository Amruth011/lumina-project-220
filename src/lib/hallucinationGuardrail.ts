import type { ResumeExtractedData } from "@/types/resume";
import type { GuardrailResult, ValidationFinding, SeverityLevel } from "@/types/guardrail";

/**
 * Extracts all numbers, percentages, and monetary values from a text block.
 * e.g., "40%", "₹47.4L", "98.76", "937"
 */
export function extractNumbersFromText(text: string): string[] {
  if (!text) return [];
  // Match percentages, money values, and decimal/integer numbers
  const regex = /(?:[$₹]\s*)?\b\d+(?:\.\d+)?(?:%|\s*percent|\s*[kMBL]|\b)/gi;
  const matches = text.match(regex) || [];
  return matches.map(m => m.trim().toLowerCase());
}

/**
 * Extracts standard skills from a text block by scanning against a known list of skills.
 */
export function extractSkillsFromText(text: string, knownSkills: string[]): string[] {
  if (!text) return [];
  const found: string[] = [];
  knownSkills.forEach(skill => {
    // Escapes special characters for regex
    const escapedSkill = skill.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`\\b${escapedSkill}\\b`, "i");
    if (regex.test(text)) {
      found.push(skill);
    }
  });
  return found;
}

/**
 * Extracts potential company names by matching known companies in the resume.
 */
export function extractCompaniesFromText(text: string, knownCompanies: string[]): string[] {
  if (!text) return [];
  const found: string[] = [];
  knownCompanies.forEach(company => {
    const escapedCompany = company.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`\\b${escapedCompany}\\b`, "i");
    if (regex.test(text)) {
      found.push(company);
    }
  });
  return found;
}

/**
 * Performs a local programmatic validation check on generated content against the extracted resume.
 */
export function validateGeneratedContent(
  generatedText: string,
  resume: ResumeExtractedData
): GuardrailResult {
  const findings: ValidationFinding[] = [];
  let corrected_text = generatedText;

  // 1. Gather Ground Truths
  const resumeText = JSON.stringify(resume).toLowerCase();
  
  // Extract all numbers/metrics from resume
  const resumeNumbers = new Set<string>();
  // Also parse raw numbers to handle format variations (e.g. 40% -> 40)
  const resumeRawNumbers = new Set<string>();
  
  const addNumberToSets = (numStr: string) => {
    const cleanNum = numStr.toLowerCase().trim();
    if (!cleanNum) return;
    resumeNumbers.add(cleanNum);
    const rawMatch = cleanNum.match(/\d+(?:\.\d+)?/);
    if (rawMatch) {
      resumeRawNumbers.add(rawMatch[0]);
    }
  };

  // Extract from experience bullets
  resume.experience.forEach(exp => {
    exp.bullets.forEach(bullet => {
      // Add bullet original text numbers
      extractNumbersFromText(bullet.original_text).forEach(addNumberToSets);
      // Add metric details
      bullet.metrics.forEach(metric => {
        addNumberToSets(String(metric.value));
        addNumberToSets(metric.unit);
      });
    });
  });

  // Extract from projects
  resume.projects.forEach(proj => {
    extractNumbersFromText(proj.description).forEach(addNumberToSets);
    extractNumbersFromText(proj.outcome).forEach(addNumberToSets);
  });

  // Extract from education GPA
  if (resume.education) {
    resume.education.forEach(edu => {
      if (edu.gpa) addNumberToSets(edu.gpa);
    });
  }

  // 2. Metric Validation
  const generatedNumbers = extractNumbersFromText(generatedText);
  generatedNumbers.forEach(num => {
    const rawNumMatch = num.match(/\d+(?:\.\d+)?/);
    const rawNum = rawNumMatch ? rawNumMatch[0] : "";
    
    // Ignore single digits under 5 that are likely list indices or small counts
    if (rawNum && parseFloat(rawNum) < 5 && !num.includes("%") && !num.includes("$") && !num.includes("₹")) {
      return;
    }

    const isDirectMatch = resumeNumbers.has(num);
    const isRawMatch = resumeRawNumbers.has(rawNum);

    if (!isDirectMatch && !isRawMatch) {
      findings.push({
        claim: num,
        claim_type: "metric",
        severity: "critical",
        status: "hallucinated",
        issue_description: `Metric '${num}' was not found in your original resume.`,
        suggested_fix: `Replace with a verified metric or use [METRIC: context].`
      });

      // Safe mode correction: replace hallucination with placeholder
      corrected_text = corrected_text.split(num).join(`[METRIC: verify value]`);
    }
  });

  // 3. Entity & Company Validation
  // Extract companies from resume
  const knownCompanies = resume.experience.map(e => e.company).filter(Boolean);
  const mentionedCompanies = extractCompaniesFromText(generatedText, knownCompanies);
  
  // Extract capitalized words that look like companies
  const possibleCompanies = generatedText.match(/\b[A-Z][a-zA-Z0-9]{2,}\b/g) || [];
  possibleCompanies.forEach(company => {
    const ignoreList = [
      "the", "and", "for", "with", "this", "that", "in", "of", "to", "at", "by", "on", "from",
      "metric", "verify", "value", "placeholder",
      // Action verbs
      "led", "directed", "managed", "oversaw", "guided", "mentored", "championed",
      "built", "designed", "developed", "architected", "engineered", "created", "launched", "implemented",
      "optimized", "enhanced", "streamlined", "refactored", "upgraded", "modernized",
      "increased", "reduced", "accelerated", "improved", "boosted", "drove", "delivered",
      "analyzed", "evaluated", "researched", "investigated", "audited", "assessed",
      "collaborated", "partnered", "coordinated", "facilitated", "aligned"
    ];
    if (ignoreList.includes(company.toLowerCase())) {
      return;
    }
    
    // If it's a known company, it's fine
    if (knownCompanies.some(kc => kc.toLowerCase() === company.toLowerCase())) {
      return;
    }

    // Check if the company is present in the resume text
    if (!resumeText.includes(company.toLowerCase())) {
      // If it looks like a tech skill, skip (checked in skill validation)
      const isSkill = resume.skills.some(s => s.name.toLowerCase() === company.toLowerCase());
      if (isSkill) return;

      findings.push({
        claim: company,
        claim_type: "entity",
        severity: "high",
        status: "inferred",
        issue_description: `Entity '${company}' is not mentioned in your resume.`,
        suggested_fix: `Verify this company or product name.`
      });
    }
  });

  // 4. Skill Validation
  const knownSkills = resume.skills.map(s => s.name);
  const mentionedSkills = extractSkillsFromText(generatedText, knownSkills);
  
  // Check for technical keywords that are NOT in the resume skills list
  const commonTechList = ["react", "vue", "angular", "node", "express", "django", "flask", "fastapi", "spring", "rails", "postgres", "mongodb", "mysql", "sqlite", "redis", "elasticsearch", "docker", "kubernetes", "aws", "azure", "gcp", "git", "github", "gitlab", "jira", "typescript", "javascript", "python", "java", "c++", "c#", "ruby", "php", "go", "rust", "scala", "kotlin", "swift", "dbt", "snowflake", "bigquery", "power bi", "tableau", "qlik", "looker", "airflow", "prefect"];
  
  commonTechList.forEach(tech => {
    const escapedTech = tech.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`\\b${escapedTech}\\b`, "i");
    if (regex.test(generatedText)) {
      const isKnown = resume.skills.some(s => s.name.toLowerCase() === tech.toLowerCase()) || 
                      resume.projects.some(p => p.technologies.some(t => t.toLowerCase() === tech.toLowerCase())) ||
                      resume.experience.some(e => e.bullets.some(b => b.technologies.some(t => t.toLowerCase() === tech.toLowerCase())));
      
      if (!isKnown) {
        findings.push({
          claim: tech,
          claim_type: "skill",
          severity: "high",
          status: "hallucinated",
          issue_description: `Technology '${tech}' is not in your skills list or project tech stacks.`,
          suggested_fix: `Remove this technology or verify if you have experience with it.`
        });
      }
    }
  });

  // Calculate safety and score
  const is_safe = !findings.some(f => f.severity === "critical" || f.severity === "high");
  
  let score = 100;
  findings.forEach(f => {
    if (f.severity === "critical") score -= 25;
    else if (f.severity === "high") score -= 15;
    else if (f.severity === "medium") score -= 8;
    else score -= 3;
  });
  score = Math.max(0, score);

  return {
    is_safe,
    score,
    findings,
    corrected_text
  };
}
