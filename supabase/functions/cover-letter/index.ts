import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Lumina AI Cover Letter Engine
 * ============================
 */
serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { jd, resume, tone, focus, length, candidateName, companyName, jdTitle } = await req.json();

    const groqKey = Deno.env.get("GROQ_API_KEY")?.trim();
    if (!groqKey) {
      return new Response(JSON.stringify({ error: "Lumina Auth Error: Missing GROQ_API_KEY" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const safeName = candidateName || 'the candidate';
    const safeCompany = companyName || 'the company';
    const safeTitle = jdTitle || 'this role';

    const messages = [
      {
        role: "system",
        content: `You are an elite Silicon Valley Career Strategist specializing in "Human-First" candidacy narratives.
Your goal is to write ONLY the body paragraphs of a cover letter. The letter header, date, recipient info, salutation ("Dear..."), and closing signature are handled separately by the application.

IMPORTANT OUTPUT RULES:
- Output ONLY the body paragraphs of the letter. Nothing else.
- Do NOT include any of these: "Dear...", "To:", "From:", "Subject:", "Date:", "Sincerely,", "Best regards,", "Yours truly,", "[Your Name]", "[Company Name]", any sign-off, any header, any salutation.
- Do NOT use markdown formatting. No **bold**, no *italic*, no bullet points, no headers (#).
- Output plain text paragraphs only, separated by blank lines.
- Use the candidate's actual name "${safeName}" if referencing themselves, and the actual company name "${safeCompany}".

Tone: ${tone || 'Professional'}
Narrative Focus: ${focus || 'Technical Excellence'}
Length Mode: ${length || 'Concise'}

STRICT HUMANIZATION GUIDELINES:
1. NO AI-isms: Avoid words like "delve", "testament", "vibrant", "holistic", "meticulous", "passionate about", "unwavering", "synergy", "realm", "bespoke".
2. NO ROBOTIC STRUCTURES: Start with a punchy, unique hook. No generic openings.
3. VARY SENTENCE DYNAMICS: Mix short, impactful sentences with longer, complex ones. Use active voice.
4. BE SPECIFIC: Reference specific technical challenges or industry shifts relevant to the job.

ATS ALIGNMENT STRATEGY:
1. SEMANTIC MIRRORING: Identify the 5 most critical keywords/phrases from the Job Description and weave them naturally.
2. METRIC-DRIVEN IMPACT: Quantify achievements using the resume data (e.g., "Increased pipeline efficiency by 40%").
3. PROBLEM-SOLUTION FIT: Frame skills as a direct solution to the JD's specific pain points.
4. ${focus === 'Leadership' ? 'Prioritize leadership metrics and strategic oversight.' : focus === 'Cultural' ? 'Highlight mission alignment and team-first philosophy.' : 'Prioritize technical stack proficiency and architectural impact.'}

LENGTH: ${length === 'Concise' ? 'Under 250 words, 3-4 tight paragraphs.' : 'Under 450 words, 4-5 paragraphs with specific examples.'}`
      },
      {
        role: "user",
        content: `Job Title: ${safeTitle}
Company: ${safeCompany}
Job Description Skills: ${jd}

Candidate Name: ${safeName}
Candidate Resume Data:
${JSON.stringify(resume)}

Write ONLY the body paragraphs. No salutation, no sign-off, no markdown, no placeholders.`
      }
    ];

    const fallbackModels = [
      "llama-3.1-8b-instant",
      "llama-3.3-70b-versatile",
      "mixtral-8x7b-32768"
    ];

    let resultData = null;
    let lastError = "";

    for (const model of fallbackModels) {
      try {
        const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { "Authorization": `Bearer ${groqKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: model,
            messages,
            temperature: 0.7,
          }),
        });

        if (groqResponse.ok) {
          resultData = await groqResponse.json();
          break;
        }
        
        lastError = await groqResponse.text();
      } catch (err) {
        lastError = String(err);
      }
    }

    if (!resultData) {
      return new Response(JSON.stringify({ error: "All AI engines exhausted", details: lastError }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(resultData), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: "Internal server error", details: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
