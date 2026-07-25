import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseKey);

const OWNER_EMAIL = "devoncadvertising@gmail.com";

// Meta/WhatsApp verifies webhooks with a GET request containing hub.challenge.
function htmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  // ── Webhook verification (GET) ──────────────────────────────────────────
  // Meta sends GET with hub.mode=subscribe, hub.verify_token, hub.challenge.
  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode === "subscribe" && challenge) {
      // Accept the verify token if configured; if not set, accept any (set
      // WHATSAPP_VERIFY_TOKEN in Supabase secrets to enforce it).
      const expected = Deno.env.get("WHATSAPP_VERIFY_TOKEN");
      if (expected && token !== expected) {
        return new Response("Forbidden", { status: 403, headers: corsHeaders });
      }
      return new Response(challenge, { status: 200, headers: corsHeaders });
    }
    return new Response("Bad request", { status: 400, headers: corsHeaders });
  }

  // ── Incoming messages (POST) ────────────────────────────────────────────
  // Always acknowledge quickly with 200 so Meta does not retry, then process.
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  // Acknowledge immediately.
  const ack = new Response(JSON.stringify({ status: "received" }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

  try {
    const payload = await req.json();
    console.log("WhatsApp webhook payload:", JSON.stringify(payload));

    // Meta Cloud API format: entry[].changes[].value.messages[]
    const entries = payload?.entry || [];
    for (const entry of entries) {
      const changes = entry?.changes || [];
      for (const change of changes) {
        const value = change?.value;
        if (!value) continue;

        const messages = value?.messages || [];
        const contacts = value?.contacts || [];

        for (const msg of messages) {
          const from = msg?.from as string | undefined; // E.164 without +
          const waMessageId = msg?.id as string | undefined;
          const type = msg?.type as string | undefined;

          // Only handle text messages for now.
          let body = "";
          if (type === "text") {
            body = msg?.text?.body || "";
          } else {
            body = `[Unsupported message type: ${type || "unknown"}]`;
          }

          if (!from || !waMessageId) continue;

          // Look up a contact name if Meta provided one.
          const contact = contacts.find((c: any) => c?.wa_id === from);
          const contactName = contact?.profile?.name || null;

          await storeInboundMessage(from, contactName, waMessageId, body);
        }
      }
    }
  } catch (error) {
    console.error("Error processing WhatsApp webhook:", error);
    // Already acknowledged; do not throw.
  }

  return ack;
});

async function storeInboundMessage(
  phoneNumber: string,
  contactName: string | null,
  waMessageId: string,
  body: string,
) {
  const now = new Date().toISOString();

  // Find or create the conversation for this contact + owner.
  const { data: existing } = await supabase
    .from("whatsapp_conversations")
    .select("id")
    .eq("phone_number", phoneNumber)
    .eq("owner_email", OWNER_EMAIL)
    .maybeSingle();

  let conversationId = existing?.id;

  if (!conversationId) {
    const { data: created, error: createError } = await supabase
      .from("whatsapp_conversations")
      .insert({
        phone_number: phoneNumber,
        contact_name: contactName,
        owner_email: OWNER_EMAIL,
        ai_enabled: true,
        last_message_at: now,
      })
      .select("id")
      .single();
    if (createError) {
      console.error("Failed to create conversation:", createError);
      return;
    }
    conversationId = created.id;
  } else {
    await supabase
      .from("whatsapp_conversations")
      .update({ last_message_at: now, contact_name: contactName ?? undefined })
      .eq("id", conversationId);
  }

  // Dedupe on wa_message_id (Meta retries on non-2xx).
  const { error: msgError } = await supabase
    .from("whatsapp_messages")
    .insert({
      conversation_id: conversationId,
      wa_message_id: waMessageId,
      direction: "inbound",
      body,
      status: "received",
    });

  if (msgError) {
    // Likely a duplicate wa_message_id; ignore.
    if (msgError.code !== "23505") {
      console.error("Failed to store message:", msgError);
    }
  }
}

// Suppress unused helper warning if htmlEscape is not referenced.
void htmlEscape;
