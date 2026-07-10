import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, x-webhook-secret",
};

/**
 * Normalized SES event payload sent by your AWS Lambda router.
 *
 * The Lambda receives the raw EventBridge/SES notification, confirms the
 * message_id starts with "lr-" (loireply), then forwards this shape here.
 * Events starting with "lb-" go to loiblast's equivalent endpoint instead.
 */
interface SesEventPayload {
  event_id: string;          // SNS MessageId — used as deduplication key
  event_type: string;        // Delivery | Bounce | Complaint | Open | Click | Send | Reject | DeliveryDelay
  message_id: string;        // SES mail.messageId, e.g. "lr-<uuid>@domain"
  recipient: string | null;  // first address from mail.destination
  event_time: string;        // ISO timestamp from the notification
  raw_event: Record<string, unknown>; // full original payload for audit
  // event-specific optional fields
  bounce_type?: string;
  bounce_sub_type?: string;
  complaint_feedback_type?: string;
  failure_reason?: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Validate shared secret so only our Lambda can call this
  const webhookSecret = Deno.env.get("SES_WEBHOOK_SECRET");
  if (webhookSecret) {
    const provided = req.headers.get("x-webhook-secret");
    if (provided !== webhookSecret) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  let payload: SesEventPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { event_id, event_type, message_id, recipient, event_time, raw_event } = payload;

  if (!event_id || !event_type || !message_id) {
    return new Response(JSON.stringify({ error: "Missing required fields: event_id, event_type, message_id" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  // Look up the email_sent row by message_id
  const { data: sentEmail } = await supabase
    .from("email_sent")
    .select("id")
    .eq("message_id", message_id)
    .maybeSingle();

  const emailSentId: string | null = sentEmail?.id ?? null;

  // Idempotent insert into email_events (unique constraint on event_id prevents duplicates)
  const { error: insertError } = await supabase
    .from("email_events")
    .insert({
      event_id,
      email_sent_id: emailSentId,
      message_id,
      event_type,
      recipient,
      event_time,
      raw_event,
    });

  if (insertError && !insertError.message.includes("duplicate")) {
    console.error("Failed to insert email_event:", insertError);
    return new Response(JSON.stringify({ error: "Failed to record event" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Update email_sent tracking columns if we have a matching row
  if (emailSentId) {
    const update: Record<string, unknown> = {};
    const eventTs = event_time ?? new Date().toISOString();

    switch (event_type) {
      case "Delivery":
        update.delivery_status = "delivered";
        update.delivered_at = eventTs;
        break;
      case "Bounce":
        update.delivery_status = "bounced";
        update.bounced_at = eventTs;
        if (payload.bounce_sub_type) update.bounce_reason = payload.bounce_sub_type;
        break;
      case "Complaint":
        update.delivery_status = "complained";
        update.complained_at = eventTs;
        if (payload.complaint_feedback_type) update.complaint_reason = payload.complaint_feedback_type;
        break;
      case "Open":
        // Only record first open
        update.opened_at = eventTs;
        break;
      case "Click":
        // Only record first click
        update.clicked_at = eventTs;
        break;
      case "Reject":
      case "DeliveryDelay":
        update.delivery_status = event_type.toLowerCase();
        if (payload.failure_reason) update.failure_reason = payload.failure_reason;
        break;
    }

    if (Object.keys(update).length > 0) {
      const updateQuery = supabase
        .from("email_sent")
        .update(update)
        .eq("id", emailSentId);

      // For Open and Click, only set if currently null (first event wins)
      if (event_type === "Open") {
        updateQuery.is("opened_at", null);
      } else if (event_type === "Click") {
        updateQuery.is("clicked_at", null);
      }

      const { error: updateError } = await updateQuery;
      if (updateError) {
        console.error("Failed to update email_sent:", updateError);
      }
    }
  }

  return new Response(
    JSON.stringify({ success: true, event_type, email_sent_id: emailSentId }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
