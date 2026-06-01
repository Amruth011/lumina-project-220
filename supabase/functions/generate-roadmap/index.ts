// deploy: v3
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VaultItemInput {
  type?: string;
  title?: string;
  organization?: string;
  period?: string;
  description?: string;
  bullets?: string[];
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized: Missing access token." }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized: Invalid token session.", details: authError?.message }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ensure profile row exists
    try {
      const { data: profileExists } = await supabase.from("profiles").select("id").eq("id", user.id).maybeSingle();
      if (!profileExists) {
        await supabase.from("profiles").insert({
          id: user.id,
          email: user.email,
          display_name: user.email ? user.email.split("@")[0] : "User",
        });
      }
    } catch (e) {
      console.error("Profile recovery failed:", e);
    }

    const { jd_data, vault_data, duration, jd_id } = await req.json();
    if (!jd_data || !duration) {
      return new Response(JSON.stringify({ error: 'Request body must contain "jd_data" and "duration" fields.' }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const groqKey = Deno.env.get("GROQ_API_KEY");
    const openAiKey = Deno.env.get("OPENAI_API_KEY");
    if (!groqKey && !openAiKey) {
      return new Response(JSON.stringify({ error: "Server configuration error: Neither GROQ_API_KEY nor OPENAI_API_KEY is configured." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const formattedVaultEntries = Array.isArray(vault_data?.items)
      ? vault_data.items.map((item: VaultItemInput) =>
          `- [${(item.type || "UNKNOWN").toUpperCase()}] Title: "${item.title || "Not Specified"}" at "${item.organization || "Not Specified"}" (Period: ${item.period || "Not Specified"})\n  Description: ${item.description || ""}\n  Bullets: ${Array.isArray(item.bullets) ? item.bullets.join("; ") : ""}`
        ).join("\n\n")
      : "No vault entries recorded.";

    const formattedVaultProfile = vault_data?.profile
      ? `Full Name: ${vault_data.profile.full_name || ""}\nProfessional Summary: ${vault_data.profile.summary_master || ""}`
      : "No master profile summary recorded.";

    const durationBudgetTable: Record<string, { hours_per_task: string; phase_count: string; depth: string }> = {
      "1 Week":   { hours_per_task: "1.5-2",  phase_count: "3-4",   depth: "hyper-focused, single-skill micro-builds only. Each task must be completable in one sitting." },
      "2 Weeks":  { hours_per_task: "2-3",    phase_count: "4-5",   depth: "tight, daily-sprint sized builds with clear start/finish artefacts." },
      "3 Weeks":  { hours_per_task: "3-4",    phase_count: "5-6",   depth: "multi-day feature builds with basic integration." },
      "4 Weeks":  { hours_per_task: "4-6",    phase_count: "6-8",   depth: "feature-complete mini-projects with testing and documentation." },
      "2 Months": { hours_per_task: "6-8",    phase_count: "8-10",  depth: "full sub-system implementations with CI integration and peer-review readiness." },
      "3 Months": { hours_per_task: "8-12",   phase_count: "10-12", depth: "end-to-end module designs including architecture decisions and load considerations." },
      "6 Months": { hours_per_task: "12-18",  phase_count: "12-16", depth: "production-grade systems with observability, fault-tolerance, and scalability baked in." },
      "1 Year":   { hours_per_task: "15-20",  phase_count: "16-20", depth: "full-stack architecture designs with deployment pipelines, monitoring, and team-scale documentation." },
    };
    const budget = durationBudgetTable[duration] || { hours_per_task: "4-6", phase_count: "6-8", depth: "feature-complete mini-projects." };

    const systemMessage = `You are an elite-tier technical career architect operating at the 0.01% level.
Your singular mission: transform skill gaps into a ruthlessly actionable, production-grade implementation curriculum.
Generic study plans are STRICTLY FORBIDDEN. Every task in the roadmap must represent a high-quality, professional, production-grade project calibrated to the target experience level.

For the requested duration "${duration}":
- Target phase count: EXACTLY ${budget.phase_count} PHASES.
- Tasks per phase: EXACTLY 3 to 4 actionable_tasks per phase.
- estimated_hours per task: ${budget.hours_per_task} hours
- Task depth level: ${budget.depth}

Every task MUST include: title (concrete micro-project, no generic "learn"/"study"), estimated_hours, verification_prompt (senior reviewer persona + 3 review criteria + 1 adversarial), is_completed:false.

deep_dive_resources: only official free documentation URLs (react.dev, MDN, typescriptlang.org, nodejs.org, etc.). No paid courses, no fake nested URLs.

Output JSON schema:
{
  "target_role": string,
  "duration": string,
  "skill_gaps_identified": string[],
  "timeline": [
    {
      "phase_number": number,
      "phase_title": string,
      "focus_area": string,
      "gap_addressed": string,
      "actionable_tasks": [{"id": string, "title": string, "estimated_hours": number, "verification_prompt": string, "is_completed": false}],
      "deep_dive_resources": [{"title": string, "url": string, "source_type": "documentation"|"video"|"course", "estimated_time": string}]
    }
  ]
}

Return ONLY parseable JSON, no markdown.`;

    const formattedJdSkills = Array.isArray(jd_data.skills)
      ? jd_data.skills.map((s: { skill?: string; name?: string; importance?: number }) =>
          s ? `${s.skill || s.name || ""} (Importance: ${s.importance || 50})` : ""
        ).filter(Boolean).join(", ")
      : "Not Specified";

    const userMessage = `Generate my elite adaptive roadmap:

TARGET ROLE: ${jd_data.title || "Not Specified"}
TARGET EXPERIENCE LEVEL: ${jd_data.experience || "Not Specified"}
REQUIRED SKILLS FROM JD: ${formattedJdSkills}
JD DESCRIPTION: ${(jd_data.description || "").substring(0, 4000)}

CANDIDATE VAULT PROFILE:
${formattedVaultProfile}

CANDIDATE VAULT RECORDS:
${formattedVaultEntries}

REQUESTED DURATION: ${duration}
TIME BUDGET: ${budget.hours_per_task} hours/task · ${budget.phase_count} phases · ${budget.depth}

Generate the roadmap now. Every task must be a production micro-project with a verification_prompt.`;

    const fallbackConfigs: Array<{ url: string; key: string; model: string }> = [];
    if (groqKey) {
      for (const m of ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "gemma2-9b-it"]) {
        fallbackConfigs.push({ url: "https://api.groq.com/openai/v1/chat/completions", key: groqKey, model: m });
      }
    }
    if (openAiKey) {
      for (const m of ["gpt-4o", "gpt-4o-mini"]) {
        fallbackConfigs.push({ url: "https://api.openai.com/v1/chat/completions", key: openAiKey, model: m });
      }
    }

    let rawResponseText = "";
    let lastError = "";
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    for (const config of fallbackConfigs) {
      let retries = 3;
      let delay = 2000;
      let success = false;
      while (retries > 0 && !success) {
        try {
          console.log(`GENERATE_ROADMAP: ${config.model} (retries=${retries})`);
          const apiResponse = await fetch(config.url, {
            method: "POST",
            headers: { Authorization: `Bearer ${config.key}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: config.model,
              messages: [
                { role: "system", content: systemMessage },
                { role: "user", content: userMessage },
              ],
              temperature: 0.2,
              response_format: { type: "json_object" },
            }),
          });
          const rawBody = await apiResponse.text().catch(() => "");
          if (apiResponse.ok) {
            try {
              const parsed = JSON.parse(rawBody);
              rawResponseText = parsed?.choices?.[0]?.message?.content || "";
              if (rawResponseText.trim()) { success = true; break; }
            } catch { /* fallthrough */ }
          } else {
            try {
              const errData = JSON.parse(rawBody);
              lastError = errData?.error?.message || JSON.stringify(errData);
            } catch { lastError = rawBody || apiResponse.statusText; }
            console.warn(`GENERATE_ROADMAP: ${config.model} HTTP ${apiResponse.status}: ${lastError}`);
          }
          if (apiResponse.status === 429 || apiResponse.status >= 500) {
            await sleep(delay); delay *= 2; retries--;
          } else { break; }
        } catch (err) {
          lastError = err instanceof Error ? err.message : String(err);
          console.error(`GENERATE_ROADMAP: ${config.model} crash:`, lastError);
          break;
        }
      }
      if (success) break;
    }

    if (!rawResponseText) {
      return new Response(JSON.stringify({ error: "All AI engines exhausted", details: lastError }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let roadmapJSONData: Record<string, unknown> | null = null;
    try {
      const cleaned = rawResponseText.replace(/^```json/i, "").replace(/^```/i, "").replace(/```$/m, "").trim();
      roadmapJSONData = JSON.parse(cleaned);
    } catch (parseErr) {
      return new Response(JSON.stringify({
        error: "AI generated invalid roadmap payload format.",
        details: parseErr instanceof Error ? parseErr.message : String(parseErr),
        rawOutput: rawResponseText,
      }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    try {
      const { data: dbRow, error: dbError } = await supabase
        .from("roadmaps")
        .insert({ user_id: user.id, jd_id: jd_id || null, duration, roadmap_data: roadmapJSONData })
        .select("*").single();
      if (dbError) throw dbError;
      return new Response(JSON.stringify(dbRow), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (dbErr) {
      return new Response(JSON.stringify({
        error: "Failed to write the generated roadmap to the database.",
        details: dbErr instanceof Error ? dbErr.message : String(dbErr),
      }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  } catch (e) {
    console.error("GENERATE_ROADMAP: fatal", e);
    return new Response(JSON.stringify({ error: "Internal server error", details: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
