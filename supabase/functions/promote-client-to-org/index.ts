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
    const { client_id, target_org_id, phase, selected_fields } = body;

    if (!client_id || !target_org_id) {
      return new Response(JSON.stringify({ error: "client_id and target_org_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify caller is a member of the target org
    const { data: membership } = await supabase
      .from("organization_members")
      .select("role")
      .eq("organization_id", target_org_id)
      .eq("user_id", userId)
      .maybeSingle();

    if (!membership) {
      return new Response(JSON.stringify({ error: "You are not a member of this organization." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the client (must be personal — owned by caller, no org_id)
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

    if (client.org_id) {
      return new Response(JSON.stringify({ error: "Client already belongs to an organization." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Duplicate check: same email in target org
    if (client.email) {
      const { data: existing } = await supabase
        .from("clients")
        .select("id, first_name, last_name, email")
        .eq("org_id", target_org_id)
        .eq("email", client.email.toLowerCase().trim())
        .is("deleted_at", null)
        .maybeSingle();

      if (existing) {
        return new Response(JSON.stringify({
          duplicate: true,
          existing_client_id: existing.id,
          existing_name: `${existing.first_name} ${existing.last_name}`,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // Phase 1 (dry-run): return personal fields/values + org's existing fields
    if (phase === "preview") {
      const { data: personalFields } = await supabase
        .from("user_custom_fields")
        .select("field_key, field_label, field_type, options")
        .eq("user_id", userId)
        .order("sort_order", { ascending: true });

      const { data: personalValues } = await supabase
        .from("user_custom_values")
        .select("field_key, value")
        .eq("client_id", client_id)
        .eq("user_id", userId);

      const { data: orgFields } = await supabase
        .from("client_custom_fields")
        .select("field_key, field_label, field_type, options")
        .eq("org_id", target_org_id)
        .order("sort_order", { ascending: true });

      return new Response(JSON.stringify({
        duplicate: false,
        client,
        personal_fields: (personalFields || []).map((f: any) => ({
          field_key: f.field_key,
          field_label: f.field_label,
          field_type: f.field_type,
          options: f.options,
          value: (personalValues || []).find((v: any) => v.field_key === f.field_key)?.value || "",
        })),
        org_fields: orgFields || [],
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Phase 2 (commit): move the client + selected custom values
    if (phase === "commit") {
      const fieldsToMigrate: string[] = Array.isArray(selected_fields) ? selected_fields : [];

      // Update the client row
      const { error: updateErr } = await supabase
        .from("clients")
        .update({
          org_id: target_org_id,
          assigned_to: userId,
          promoted_from_personal: true,
          original_user_id: userId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", client_id);

      if (updateErr) throw updateErr;

      // Fetch personal field definitions + values for selected fields
      const { data: personalFields } = await supabase
        .from("user_custom_fields")
        .select("field_key, field_label, field_type, options")
        .eq("user_id", userId)
        .in("field_key", fieldsToMigrate);

      const { data: personalValues } = await supabase
        .from("user_custom_values")
        .select("field_key, value")
        .eq("client_id", client_id)
        .eq("user_id", userId)
        .in("field_key", fieldsToMigrate);

      // Fetch existing org fields
      const { data: orgFields } = await supabase
        .from("client_custom_fields")
        .select("id, field_key")
        .eq("org_id", target_org_id);

      const orgFieldKeys = new Set((orgFields || []).map((f: any) => f.field_key));
      const orgFieldIdByKey: Record<string, string> = {};
      (orgFields || []).forEach((f: any) => { orgFieldIdByKey[f.field_key] = f.id; });

      const valuesToInsert: any[] = [];
      const newOrgFieldsToCreate: any[] = [];

      for (const pf of (personalFields || [])) {
        const value = (personalValues || []).find((v: any) => v.field_key === pf.field_key)?.value || "";
        if (orgFieldKeys.has(pf.field_key)) {
          valuesToInsert.push({
            client_id,
            org_id: target_org_id,
            field_key: pf.field_key,
            value,
            updated_at: new Date().toISOString(),
          });
        } else {
          // Create the org field first
          newOrgFieldsToCreate.push({
            org_id: target_org_id,
            field_key: pf.field_key,
            field_label: pf.field_label,
            field_type: pf.field_type,
            options: pf.options,
            created_by: userId,
          });
          // Queue the value for after field creation
          valuesToInsert.push({
            client_id,
            org_id: target_org_id,
            field_key: pf.field_key,
            value,
            updated_at: new Date().toISOString(),
          });
        }
      }

      if (newOrgFieldsToCreate.length > 0) {
        const { error: createErr } = await supabase
          .from("client_custom_fields")
          .insert(newOrgFieldsToCreate);
        if (createErr) throw createErr;
      }

      if (valuesToInsert.length > 0) {
        const { error: valErr } = await supabase
          .from("client_custom_values")
          .upsert(valuesToInsert, { onConflict: "client_id,field_key" });
        if (valErr) throw valErr;
      }

      // Delete personal custom values (moved, not copied)
      await supabase
        .from("user_custom_values")
        .delete()
        .eq("client_id", client_id)
        .eq("user_id", userId);

      return new Response(JSON.stringify({
        success: true,
        client_id,
        org_id: target_org_id,
        migrated_fields: fieldsToMigrate,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Invalid phase. Use 'preview' or 'commit'." }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
