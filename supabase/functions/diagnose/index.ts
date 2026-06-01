import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const groqKey = Deno.env.get("GROQ_API_KEY");
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const diagnostics = {
      groq_key_set: !!groqKey,
      openai_key_set: !!openaiKey,
      supabase_url_set: !!supabaseUrl,
      supabase_key_set: !!supabaseKey,
      deno_version: Deno.version.deno,
    };

    let supabase_test = "skipped";
    try {
      const sb = createClient(supabaseUrl, supabaseKey);
      const { error } = await sb.from("profiles").select("id").limit(1);
      supabase_test = error ? `ERROR: ${error.message}` : "OK";
    } catch (e) {
      supabase_test = `CRASH: ${e instanceof Error ? e.message : String(e)}`;
    }

    let groq_test = "skipped";
    if (groqKey) {
      try {
        const r = await fetch("https://api.groq.com/openai/v1/models", {
          headers: { Authorization: `Bearer ${groqKey}` },
        });
        groq_test = r.ok ? `OK (status ${r.status})` : `HTTP ${r.status}`;
      } catch (e) {
        groq_test = `CRASH: ${e instanceof Error ? e.message : String(e)}`;
      }
    }

    return new Response(JSON.stringify({
      status: "diagnostic_ok",
      diagnostics,
      supabase_test,
      groq_test,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({
      status: "diagnostic_crashed",
      error: err instanceof Error ? err.message : String(err),
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
