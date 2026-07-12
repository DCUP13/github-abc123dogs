import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import OpenAI from "npm:openai@4.68.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY") || "" });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { clients } = await req.json();

    if (!clients || clients.length === 0) {
      return new Response(JSON.stringify({ suggestions: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const clientList = clients
      .slice(0, 50)
      .map((c: any) =>
        `- ID:${c.id} | ${c.name} | Type:${c.client_type} | Status:${c.status} | Days since contact:${c.days_since_contact >= 999 ? "never" : c.days_since_contact} | Grade:${c.grade_letter || "ungraded"}(${c.grade_score || "N/A"}) | Email:${c.email ? "yes" : "no"} | Notes:${c.notes ? c.notes.slice(0, 80) : "none"}`
      )
      .join("\n");

    const prompt = `You are a real estate CRM outreach assistant. Analyze this list of clients and identify which ones need follow-up outreach most urgently.

Clients:
${clientList}

Rules for selecting clients to suggest:
1. Prioritize active/prospect leads with no contact in 14+ days
2. Prioritize high-grade clients (A or B) who have gone quiet
3. Deprioritize closed or inactive clients
4. Only include clients with email = yes (they can receive emails)
5. Select 5-10 contacts maximum — quality over quantity

For each selected client, return a JSON object with:
- client_id: the exact ID string
- reason: 1-2 sentence explanation of why to reach out now (specific, actionable)
- priority: "high", "medium", or "low"
- suggested_action: "email" or "call"
- days_since_contact: number (copy from input, use 999 if never)

Respond ONLY with valid JSON, no markdown:
{ "suggestions": [ ... ] }`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are a precise real estate CRM outreach advisor. Respond only with valid JSON." },
        { role: "user", content: prompt },
      ],
      max_tokens: 1500,
      temperature: 0.3,
    });

    let content = response.choices[0]?.message?.content?.trim() || '{"suggestions":[]}';
    if (content.startsWith("```")) {
      content = content.replace(/^```[a-z]*\s*/i, "").replace(/\s*```$/, "");
    }

    const parsed = JSON.parse(content);
    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message, suggestions: [] }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
