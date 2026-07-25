import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import OpenAI from "npm:openai@4.68.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseKey);

const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY") || "" });

const OWNER_EMAIL = "devoncadvertising@gmail.com";

const PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID") || "";
const ACCESS_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN") || "";
const WHATSAPP_API = (phoneNumberId: string) =>
  `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;

function htmlEscape(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
void htmlEscape;

// ── Helpers shared by webhook + manual-send paths ────────────────────────────

// Fetch the owner's active FAQ entries and format them for the
// {{faq_knowledge_base}} placeholder. Returns '' when there are none.
async function fetchFaqKnowledgeBase(userId: string): Promise<string> {
  const { data: faqs, error } = await supabase
    .from("faq_entries")
    .select("id, question, answer")
    .eq("user_id", userId)
    .eq("is_active", true);

  if (error || !faqs || faqs.length === 0) return "";
  return faqs.map((f, i) => `${i + 1}. Q: ${f.question}\n   A: ${f.answer}`).join("\n\n");
}

// Build a recent-context string for {{conversation_history}}.
async function fetchConversationHistory(conversationId: string, limit = 8): Promise<string> {
  const { data, error } = await supabase
    .from("whatsapp_messages")
    .select("direction, body, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data || data.length === 0) return "";
  const ordered = [...data].reverse();
  return ordered
    .map((m) => `${m.direction === "inbound" ? "Customer" : "You"}: ${m.body}`)
    .join("\n");
}

// Resolve the owner user_id from owner_email so we can fetch their prompt + FAQs.
async function resolveOwnerId(): Promise<string | null> {
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", OWNER_EMAIL)
    .maybeSingle();
  return data?.id ?? null;
}

// Send a text message through the WhatsApp Cloud API. Returns the wa message id
// on success, or null on failure (logs the error).
async function sendWhatsAppMessage(to: string, body: string): Promise<string | null> {
  if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
    console.error("WhatsApp send skipped: WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN not configured.");
    return null;
  }

  try {
    const res = await fetch(WHATSAPP_API(PHONE_NUMBER_ID), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("WhatsApp send failed:", res.status, errText);
      return null;
    }

    const json = await res.json();
    return json?.messages?.[0]?.id ?? null;
  } catch (err) {
    console.error("WhatsApp send exception:", err);
    return null;
  }
}

// Run the WhatsApp AI reply for a conversation. Shared between the inbound
// webhook path and (potentially) future manual "regenerate" calls.
async function generateAiReply(
  conversationId: string,
  inboundBody: string,
  contactName: string | null,
  phoneNumber: string,
): Promise<string | null> {
  const userId = await resolveOwnerId();
  if (!userId) {
    console.error("AI reply skipped: could not resolve owner id for", OWNER_EMAIL);
    return null;
  }

  // Fetch the owner's most recent active WhatsApp prompt.
  const { data: prompt, error: promptError } = await supabase
    .from("whatsapp_prompts")
    .select("id, content, is_active")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (promptError) {
    console.error("Error fetching whatsapp prompt:", promptError);
    return null;
  }

  // Per the owner's decision: only auto-reply when a prompt exists and is active.
  if (!prompt || !prompt.is_active) {
    console.log("AI reply skipped: no active whatsapp prompt for owner.");
    return null;
  }

  const history = await fetchConversationHistory(conversationId);
  const faqKb = prompt.content.includes("{{faq_knowledge_base}}")
    ? await fetchFaqKnowledgeBase(userId)
    : "";
  const displayName = contactName || phoneNumber;

  const finalPrompt = prompt.content
    .replace(/\{\{whatsapp_message\}\}/g, inboundBody)
    .replace(/\{\{conversation_history\}\}/g, history)
    .replace(/\{\{contact_name\}\}/g, displayName)
    .replace(/\{\{faq_knowledge_base\}\}/g, faqKb);

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: finalPrompt }],
      max_tokens: 600,
      temperature: 0.7,
    });
    const reply = completion.choices[0]?.message?.content?.trim();
    return reply || null;
  } catch (err) {
    console.error("OpenAI call failed for WhatsApp reply:", err);
    return null;
  }
}

// Store an outbound message row and update the conversation timestamp.
async function storeOutboundMessage(
  conversationId: string,
  body: string,
  aiSource: string,
  waMessageId: string | null,
): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await supabase.from("whatsapp_messages").insert({
    conversation_id: conversationId,
    direction: "outbound",
    wa_message_id: waMessageId,
    body,
    status: waMessageId ? "sent" : "pending",
    ai_source: aiSource,
  });

  if (error && error.code !== "23505") {
    console.error("Failed to store outbound message:", error);
  }

  await supabase
    .from("whatsapp_conversations")
    .update({ last_message_at: now })
    .eq("id", conversationId);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  // ── Webhook verification (GET) ──────────────────────────────────────────
  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode === "subscribe" && challenge) {
      const expected = Deno.env.get("WHATSAPP_VERIFY_TOKEN");
      if (expected && token !== expected) {
        return new Response("Forbidden", { status: 403, headers: corsHeaders });
      }
      return new Response(challenge, { status: 200, headers: corsHeaders });
    }
    return new Response("Bad request", { status: 400, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  // Acknowledge immediately so Meta does not retry, then process.
  const ack = new Response(JSON.stringify({ status: "received" }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

  try {
    const payload = await req.json();
    console.log("WhatsApp webhook payload:", JSON.stringify(payload));

    const entries = payload?.entry || [];
    for (const entry of entries) {
      const changes = entry?.changes || [];
      for (const change of changes) {
        const value = change?.value;
        if (!value) continue;

        const messages = value?.messages || [];
        const contacts = value?.contacts || [];

        for (const msg of messages) {
          const from = msg?.from as string | undefined;
          const waMessageId = msg?.id as string | undefined;
          const type = msg?.type as string | undefined;

          let body = "";
          if (type === "text") {
            body = msg?.text?.body || "";
          } else {
            body = `[Unsupported message type: ${type || "unknown"}]`;
          }

          if (!from || !waMessageId) continue;

          const contact = contacts.find((c: any) => c?.wa_id === from);
          const contactName = contact?.profile?.name || null;

          const conversation = await findOrCreateConversation(from, contactName);
          if (!conversation) continue;

          // Dedupe inbound on wa_message_id (Meta retries on non-2xx).
          const inserted = await storeInboundMessage(
            conversation.id,
            waMessageId,
            body,
          );

          // Only trigger an AI reply when the inbound message was newly stored
          // (not a duplicate) AND the conversation has AI enabled.
          if (inserted && conversation.ai_enabled) {
            try {
              const reply = await generateAiReply(
                conversation.id,
                body,
                contactName,
                from,
              );

              if (reply) {
                const sentId = await sendWhatsAppMessage(from, reply);
                await storeOutboundMessage(conversation.id, reply, "ai", sentId);
              } else {
                console.log("No AI reply produced for conversation", conversation.id);
              }
            } catch (err) {
              console.error("AI reply pipeline error:", err);
            }
          }
        }
      }
    }
  } catch (error) {
    console.error("Error processing WhatsApp webhook:", error);
  }

  return ack;
});

async function findOrCreateConversation(
  phoneNumber: string,
  contactName: string | null,
): Promise<{ id: string; ai_enabled: boolean } | null> {
  const now = new Date().toISOString();
  const { data: existing } = await supabase
    .from("whatsapp_conversations")
    .select("id, ai_enabled")
    .eq("phone_number", phoneNumber)
    .eq("owner_email", OWNER_EMAIL)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("whatsapp_conversations")
      .update({ last_message_at: now, contact_name: contactName ?? undefined })
      .eq("id", existing.id);
    return existing;
  }

  const { data: created, error: createError } = await supabase
    .from("whatsapp_conversations")
    .insert({
      phone_number: phoneNumber,
      contact_name: contactName,
      owner_email: OWNER_EMAIL,
      ai_enabled: true,
      last_message_at: now,
    })
    .select("id, ai_enabled")
    .single();

  if (createError) {
    console.error("Failed to create conversation:", createError);
    return null;
  }
  return created;
}

// Store an inbound message. Returns true if a new row was inserted (false when
// it was a duplicate wa_message_id so we don't double-reply).
async function storeInboundMessage(
  conversationId: string,
  waMessageId: string,
  body: string,
): Promise<boolean> {
  const now = new Date().toISOString();
  const { error } = await supabase.from("whatsapp_messages").insert({
    conversation_id: conversationId,
    wa_message_id: waMessageId,
    direction: "inbound",
    body,
    status: "received",
  });

  if (error) {
    if (error.code === "23505") {
      // duplicate wa_message_id — Meta retry, ignore.
      return false;
    }
    console.error("Failed to store inbound message:", error);
    return false;
  }

  await supabase
    .from("whatsapp_conversations")
    .update({ last_message_at: now })
    .eq("id", conversationId);

  return true;
}
