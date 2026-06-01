import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) {
      return new Response(JSON.stringify({ error: "Server configuration error: OPENAI_API_KEY not set." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { text } = await req.json();
    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'Request body must contain a non-empty "text" field.' }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const truncatedText = text.slice(0, 32000);
    const openaiResponse = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: { Authorization: `Bearer ${openaiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "text-embedding-3-small", input: truncatedText }),
    });

    if (!openaiResponse.ok) {
      const errorBody = await openaiResponse.text();
      console.error(`OpenAI Embedding error (${openaiResponse.status}):`, errorBody);
      return new Response(JSON.stringify({ error: "Embedding API request failed.", details: errorBody }), {
        status: openaiResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await openaiResponse.json();
    const embedding = data?.data?.[0]?.embedding;
    if (!embedding || !Array.isArray(embedding)) {
      return new Response(JSON.stringify({ error: "Unexpected response from embedding API." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ embedding }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Embedding edge function error:", message);
    return new Response(JSON.stringify({ error: "Internal server error during embedding generation.", details: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
