import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function resolvePlaceholders(html: string, client: Record<string, any>, customValues: Record<string, string>): string {
  return html.replace(/\{\{(\w+)\}\}/g, (_match, key) => {
    if (client[key] !== undefined && client[key] !== null && client[key] !== '') {
      return String(client[key]);
    }
    if (customValues[key] !== undefined && customValues[key] !== null && customValues[key] !== '') {
      return String(customValues[key]);
    }
    return '';
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { campaign_id, client_ids, org_id, from_email, subject, body_html } = await req.json();

    if (!campaign_id || !client_ids?.length) {
      return new Response(JSON.stringify({ error: "campaign_id and client_ids required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch clients
    const { data: clients, error: clientsErr } = await supabase
      .from("clients")
      .select("*")
      .in("id", client_ids);

    if (clientsErr) throw clientsErr;

    // Fetch custom values for all clients
    const { data: cvData } = await supabase
      .from("client_custom_values")
      .select("client_id, field_key, value")
      .in("client_id", client_ids)
      .eq("org_id", org_id);

    const customValuesByClient: Record<string, Record<string, string>> = {};
    (cvData || []).forEach((row: any) => {
      if (!customValuesByClient[row.client_id]) customValuesByClient[row.client_id] = {};
      customValuesByClient[row.client_id][row.field_key] = row.value || "";
    });

    let sentCount = 0;
    let failedCount = 0;
    const outboxRows: any[] = [];
    const campaignContactRows: any[] = [];

    for (const client of (clients || [])) {
      if (!client.email) {
        campaignContactRows.push({
          campaign_id,
          client_id: client.id,
          status: "skipped",
          skip_reason: "no_email",
        });
        continue;
      }

      const customValues = customValuesByClient[client.id] || {};
      const resolvedBody = resolvePlaceholders(body_html, client, customValues);
      const resolvedSubject = resolvePlaceholders(subject, client, customValues);

      outboxRows.push({
        from_email,
        to_email: client.email,
        subject: resolvedSubject,
        body_html: resolvedBody,
        body_text: resolvedBody.replace(/<[^>]*>/g, ""),
        status: "pending",
        campaign_id,
      });

      campaignContactRows.push({
        campaign_id,
        client_id: client.id,
        status: "pending",
      });

      sentCount++;
    }

    // Bulk insert into email_outbox
    if (outboxRows.length > 0) {
      const { error: outboxErr } = await supabase.from("email_outbox").insert(outboxRows);
      if (outboxErr) throw outboxErr;
    }

    // Bulk insert campaign contacts
    if (campaignContactRows.length > 0) {
      await supabase.from("crm_campaign_contacts").insert(campaignContactRows);
    }

    // Update campaign status
    await supabase
      .from("crm_campaigns")
      .update({
        status: "sent",
        sent_count: sentCount,
        failed_count: failedCount,
        sent_at: new Date().toISOString(),
      })
      .eq("id", campaign_id);

    return new Response(
      JSON.stringify({ success: true, sent: sentCount, failed: failedCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
