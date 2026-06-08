const url = "https://esjzitabjftwiqjzjttw.supabase.co/functions/v1/analyze";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzanppdGFiamZ0d2lxanpqdHR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzMzA2NTQsImV4cCI6MjA4OTkwNjY1NH0.rF4FNw2X94XEkl4Vm7XyrnbXF1m1rtyGdV9Wbdh7lXE";

async function testGenerate() {
  console.log("Testing Live Edge Function: /analyze ...");
  
  const prompt = `You are an ATS resume expert. Generate a strict JSON resume matching this schema:
{
  "professional_summary": "3 sentences.",
  "experience": [{"heading": "Software Engineer @ Tech Corp", "content": "2020 - 2024", "bullets": ["Built robust backend systems."]}]
}
Return ONLY the JSON. No markdown, no comments.`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.5,
        max_tokens: 2000
      })
    });

    console.log("Status:", response.status);
    const text = await response.text();
    
    try {
      const data = JSON.parse(text);
      if (data.choices && data.choices[0] && data.choices[0].message) {
        console.log("\n[SUCCESS] Received Output:");
        console.log(data.choices[0].message.content.trim().substring(0, 300) + "...\n");
      } else {
        console.log("\n[ERROR/FALLBACK] Output:", JSON.stringify(data, null, 2));
      }
    } catch (e) {
      console.log("\n[FAILED TO PARSE JSON] Raw Output:");
      console.log(text);
    }
  } catch (err) {
    console.error("Fetch failed:", err);
  }
}

testGenerate();
