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
    const { client, reason, grade } = await req.json();

    const gradeSummary = grade
      ? `Grade: ${grade.grade_letter} (${grade.overall_score}/100) — ${grade.ai_analysis || ""}`
      : "Not graded";

    const prompt = `You are a professional real estate agent writing a personalized outreach email to a client.

Client: ${client.first_name} ${client.last_name}
Type: ${client.client_type} | Status: ${client.status}
Budget: ${client.budget_min || client.budget_max ? `$${(client.budget_min || 0).toLocaleString()} - $${(client.budget_max || 0).toLocaleString()}` : "Not specified"}
Property Type: ${client.property_type || "N/A"}
Preferred Areas: ${(client.preferred_areas || []).join(", ") || "N/A"}
Notes: ${client.notes || "None"}
${gradeSummary}

Reason for outreach: ${reason || "General follow-up to check in on their search"}

Write a warm, professional, concise outreach email. Keep it under 150 words. Sound human, not templated.

Respond ONLY with valid JSON, no markdown:
{ "subject": "...", "body": "..." }`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are a professional real estate agent. Write personalized, warm outreach emails. Respond only with valid JSON." },
        { role: "user", content: prompt },
      ],
      max_tokens: 500,
      temperature: 0.5,
    });

    let content = response.choices[0]?.message?.content?.trim() || '{}';
    if (content.startsWith("```")) {
      content = content.replace(/^```[a-z]*\s*/i, "").replace(/\s*```$/, "");
    }

    const parsed = JSON.parse(content);
    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
