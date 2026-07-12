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
    const { client, interactions, grade, custom_fields, custom_values } = await req.json();

    const interactionSummary = (interactions || [])
      .slice(0, 20)
      .map((i: any) => `- ${i.interaction_type} on ${new Date(i.interaction_date).toLocaleDateString()}: ${i.subject || ""} ${i.notes || ""}`)
      .join("\n");

    const customFieldsSummary = (custom_fields || [])
      .map((f: any) => `- ${f.field_label}: ${(custom_values || {})[f.field_key] || "not set"}`)
      .join("\n");

    const gradeSummary = grade
      ? `Overall: ${grade.overall_score}/100 (${grade.grade_letter}), Financial: ${grade.financial_score}, Motivation: ${grade.motivation_score}, Timeline: ${grade.timeline_score}, Communication: ${grade.communication_score}`
      : "Not graded yet";

    const prompt = `You are a real estate CRM assistant. Summarize this client relationship concisely.

Client: ${client.first_name} ${client.last_name}
Type: ${client.client_type} | Status: ${client.status}
Email: ${client.email || "N/A"} | Phone: ${client.phone || "N/A"}
Location: ${[client.city, client.state].filter(Boolean).join(", ") || "N/A"}
Budget: ${client.budget_min || client.budget_max ? `$${(client.budget_min || 0).toLocaleString()} - $${(client.budget_max || 0).toLocaleString()}` : "Not specified"}
Property Type: ${client.property_type || "N/A"}
Preferred Areas: ${(client.preferred_areas || []).join(", ") || "N/A"}
Source: ${client.source || "N/A"}
Notes: ${client.notes || "None"}

AI Grade: ${gradeSummary}

${customFieldsSummary ? `Custom Fields:\n${customFieldsSummary}\n` : ""}
${interactionSummary ? `Recent Interactions (last ${Math.min((interactions || []).length, 20)}):\n${interactionSummary}` : "No interactions recorded."}

Write a 4-6 sentence executive summary of this client relationship. Include:
1. Who they are and what they're looking for
2. Current relationship status and engagement level
3. Key strengths or concerns
4. The single best next action to move the relationship forward

Be specific and actionable. Do not use bullet points — write in flowing prose.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are a concise, professional real estate CRM assistant." },
        { role: "user", content: prompt },
      ],
      max_tokens: 400,
      temperature: 0.4,
    });

    const summary = response.choices[0]?.message?.content?.trim() || "Unable to generate summary.";

    return new Response(JSON.stringify({ summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
