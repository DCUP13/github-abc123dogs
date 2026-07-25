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

const PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID") || "";
const ACCESS_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN") || "";
const WHATSAPP_API = (phoneNumberId: string) =>
  `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;

// Send a manual outbound WhatsApp message from the inbox.
// Body: { conversationId: string, body: string }
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { conversationId, body } = await req.json();
    if (!conversationId || !body || typeof body !== "string") {
      return new Response(
        JSON.stringify({ error: "conversationId and body are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Look up the conversation to get the phone number.
    const { data: conv, error: convError } = await supabase
      .from("whatsapp_conversations")
      .select("id, phone_number")
      .eq("id", conversationId)
      .maybeSingle();

    if (convError || !conv) {
      return new Response(
        JSON.stringify({ error: "Conversation not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
      // Credentials not configured — store the message as pending so it is not
      // lost, and surface the issue to the caller.
      const now = new Date().toISOString();
      await supabase.from("whatsapp_messages").insert({
        conversation_id: conversationId,
        direction: "outbound",
        body,
        status: "pending",
        ai_source: "manual",
      });
      await supabase
        .from("whatsapp_conversations")
        .update({ last_message_at: now })
        .eq("id", conversationId);

      return new Response(
        JSON.stringify({
          error: "WhatsApp sending is not configured. Add WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN in Supabase secrets.",
          stored: true,
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Send through the WhatsApp Cloud API.
    const res = await fetch(WHATSAPP_API(PHONE_NUMBER_ID), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: conv.phone_number,
        type: "text",
        text: { body },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("WhatsApp send failed:", res.status, errText);
      return new Response(
        JSON.stringify({ error: "WhatsApp API rejected the message", details: errText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const json = await res.json();
    const waMessageId = json?.messages?.[0]?.id ?? null;

    const now = new Date().toISOString();
    const { error: insertError } = await supabase.from("whatsapp_messages").insert({
      conversation_id: conversationId,
      direction: "outbound",
      wa_message_id: waMessageId,
      body,
      status: "sent",
      ai_source: "manual",
    });

    if (insertError) {
      console.error("Failed to store outbound message:", insertError);
    }

    await supabase
      .from("whatsapp_conversations")
      .update({ last_message_at: now })
      .eq("id", conversationId);

    return new Response(
      JSON.stringify({ success: true, wa_message_id: waMessageId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("whatsapp-send error:", err);
    return new Response(
      JSON.stringify({ error: "Internal error", details: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
