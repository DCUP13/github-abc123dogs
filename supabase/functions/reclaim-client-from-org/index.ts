import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    }).auth.getUser();

    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = user.id;

    const body = await req.json();
    const { client_id } = body;

    if (!client_id) {
      return new Response(JSON.stringify({ error: "client_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the client
    const { data: client, error: clientErr } = await supabase
      .from("clients")
      .select("*")
      .eq("id", client_id)
      .maybeSingle();

    if (clientErr || !client) {
      return new Response(JSON.stringify({ error: "Client not found." }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!client.org_id) {
      return new Response(JSON.stringify({ error: "This contact is not in an organization." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only the original promoter (or an org manager) may reclaim
    const isOriginalOwner = client.original_user_id === userId;
    let isManager = false;
    if (!isOriginalOwner) {
      const { data: membership } = await supabase
        .from("organization_members")
        .select("role")
        .eq("organization_id", client.org_id)
        .eq("user_id", userId)
        .maybeSingle();
      isManager = membership?.role === "owner" || membership?.role === "manager";
    }

    if (!isOriginalOwner && !isManager) {
      return new Response(JSON.stringify({ error: "Only the original promoter or an org manager can reclaim this contact." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Duplicate check: same email already exists in the caller's personal contacts
    if (client.email) {
      const { data: existing } = await supabase
        .from("clients")
        .select("id, first_name, last_name")
        .is("org_id", null)
        .eq("email", client.email.toLowerCase().trim())
        .is("deleted_at", null)
        .eq("user_id", userId)
        .maybeSingle();

      if (existing) {
        return new Response(JSON.stringify({
          duplicate: true,
          existing_client_id: existing.id,
          existing_name: `${existing.first_name} ${existing.last_name}`,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // Move org custom values back to personal custom values
    const { data: orgValues } = await supabase
      .from("client_custom_values")
      .select("field_key, value")
      .eq("client_id", client_id)
      .eq("org_id", client.org_id);

    const { data: personalFields } = await supabase
      .from("user_custom_fields")
      .select("field_key")
      .eq("user_id", userId);
    const personalFieldKeys = new Set((personalFields || []).map((f: any) => f.field_key));

    const valuesToInsert: any[] = [];
    for (const v of (orgValues || [])) {
      if (personalFieldKeys.has(v.field_key)) {
        valuesToInsert.push({
          client_id,
          user_id: userId,
          field_key: v.field_key,
          value: v.value || "",
          updated_at: new Date().toISOString(),
        });
      }
    }

    if (valuesToInsert.length > 0) {
      const { error: valErr } = await supabase
        .from("user_custom_values")
        .upsert(valuesToInsert, { onConflict: "client_id,field_key" });
      if (valErr) throw valErr;
    }

    // Delete the org custom values (moved, not copied)
    await supabase
      .from("client_custom_values")
      .delete()
      .eq("client_id", client_id)
      .eq("org_id", client.org_id);

    // Return the client to personal ownership
    const { error: updateErr } = await supabase
      .from("clients")
      .update({
        org_id: null,
        assigned_to: null,
        promoted_from_personal: false,
        original_user_id: null,
        user_id: userId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", client_id);

    if (updateErr) throw updateErr;

    return new Response(JSON.stringify({
      success: true,
      client_id,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
