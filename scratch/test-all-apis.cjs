const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const LIVE_URL = 'https://lumina-jd-scanner.vercel.app';
const TEST_EMAIL = 'tester.lumina@gmail.com';
const TEST_PASSWORD = 'TestPassword123!';

const JD_TEXT = `We are looking for a Senior Agentic AI Engineer to lead our forensic intelligence pipelines. You will architect multi-agent systems using LangGraph, Docker, and Node.js. Requirements: 5+ years building autonomous systems, strong TypeScript skills, and experience deploying to Vercel/AWS. You must be able to handle extreme load and optimize prompt context windows.`;

const SYSTEM_PROMPT = `You are the Lumina Forensic Intelligence Architect. 
Task: Decode this Job Description and return a structured forensic report.
JD Text: ${JD_TEXT}

Requirements for JSON:
- grade: { score: number, letter: string, summary: string, breakdown: object, plain_english_summary: string[] }
- title: string
- skills: { skill: string, importance: number, category: string }[]
- red_flags: { phrase: string, intensity: number, note: string }[]
- recruiter_lens: { jargon: string, reality: string }[]
- logistics: { salary_range: object, work_arrangement: object, responsibility_mix: object[], archetype: object }
- deep_dive: { day_in_life: object[], health_radar: object, bias_analysis: object, culture_radar: object }
- role_reality: object
- bonus_pulse: object
- interview_kit: object
- resume_help: object
- winning_strategy: object`;

(async () => {
  try {
    console.log("1. Testing JD Decoder (/api/analyze)...");
    const decodeRes = await fetch(`${LIVE_URL}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: "Analyze the JD now." }],
        temperature: 0.2,
        response_format: { type: "json_object" }
      })
    });
    
    let decodeData = await decodeRes.text();
    console.log("Decode API Status:", decodeRes.status);
    
    fs.writeFileSync('scratch/e2e-test-results.txt', `--- JD DECODE RESULTS ---\n${decodeData}\n\n`);
    console.log("Written decode results.");

    console.log("Done testing core APIs.");
  } catch (err) {
    console.error("Test script failed:", err);
  }
})();
