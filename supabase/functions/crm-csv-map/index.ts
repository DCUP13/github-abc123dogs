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
    const { headers, sample_rows, known_fields, custom_fields } = await req.json();

    const sampleTable = [headers.join(" | ")]
      .concat((sample_rows || []).slice(0, 3).map((r: string[]) => r.join(" | ")))
      .join("\n");

    const knownFieldsList = (known_fields || []).join(", ");
    const customFieldsList = (custom_fields || []).map((f: any) => `${f.key} (${f.label})`).join(", ");

    const prompt = `You are a data mapping assistant for a real estate CRM. Map CSV columns to CRM fields.

Known CRM fields: ${knownFieldsList}
${customFieldsList ? `Existing custom fields: ${customFieldsList}` : ""}

CSV sample:
${sampleTable}

For each CSV column header, return a mapping object. The target must be one of:
- A known CRM field key (e.g. "first_name", "email")
- An existing custom field key
- "new_custom_field" if the column doesn't match any known field but contains useful data (also provide new_field_label and new_field_type: text/number/date/dropdown/boolean)
- "skip" if the column is irrelevant or empty

Respond ONLY with valid JSON in this exact format, no markdown:
{
  "mappings": {
    "<csv_column_header>": { "target": "<field_key_or_directive>", "new_field_label": "<optional>", "new_field_type": "<optional>" }
  }
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are a precise data mapping assistant. Respond only with valid JSON." },
        { role: "user", content: prompt },
      ],
      max_tokens: 1000,
      temperature: 0.1,
    });

    let content = response.choices[0]?.message?.content?.trim() || "{}";
    if (content.startsWith("```")) {
      content = content.replace(/^```[a-z]*\s*/i, "").replace(/\s*```$/, "");
    }

    const parsed = JSON.parse(content);
    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message, mappings: {} }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
