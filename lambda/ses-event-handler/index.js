const { createClient } = require('@supabase/supabase-js');

// Route by X-SES-MESSAGE-TAGS app value set in the SMTP header.
// SES surfaces these as detail.mail.tags: { app: ['loiblast'] } in EventBridge events.
function getClient(event) {
  const tags = event.detail?.mail?.tags || {};
  const app = Array.isArray(tags.app) ? tags.app[0] : tags.app;

  if (app === 'loiblast') {
    return createClient(
      process.env.LB_SUPABASE_URL,
      process.env.LB_SUPABASE_KEY
    );
  }

  return createClient(
    process.env.LR_SUPABASE_URL,
    process.env.LR_SUPABASE_KEY
  );
}

exports.handler = async (event) => {
  console.log('SES Event:', JSON.stringify(event, null, 2));

  try {
    const detail = event.detail || {};
    const eventType = event['detail-type'] || 'UNKNOWN';
    const messageId = detail.mail?.messageId || null;
    const recipient = detail.mail?.destination?.[0] || null;
    const eventTime = detail.mail?.timestamp || event.time || new Date().toISOString();

    if (!messageId) {
      console.warn('No message_id found in event');
      return { statusCode: 200 };
    }

    const supabase = getClient(event);

    // Look up email_sent by ses_message_id (set from SMTP 250 response on new emails).
    // Fall back to message_id for any rows created before this change.
    const { data: emailRecord, error: lookupError } = await supabase
      .from('email_sent')
      .select('id')
      .or(`ses_message_id.eq.${messageId},message_id.eq.${messageId}`)
      .maybeSingle();

    if (lookupError) throw lookupError;

    if (!emailRecord) {
      console.warn(`No email_sent row found for message_id: ${messageId}`);
    }

    // Upsert event into audit log (idempotent on event_id)
    const { error: eventError } = await supabase
      .from('email_events')
      .upsert(
        {
          event_id: event.id,
          email_sent_id: emailRecord?.id || null,
          message_id: messageId,
          event_type: eventType,
          recipient,
          event_time: eventTime,
          raw_event: event,
        },
        { onConflict: 'event_id' }
      );

    if (eventError) throw eventError;

    // Build the email_sent update for this event type
    let update = {};

    switch (eventType) {
      case 'Email Sent':
        update = { delivery_status: 'sent' };
        break;

      case 'Email Delivered':
        update = { delivery_status: 'delivered', delivered_at: eventTime };
        break;

      case 'Email Opened':
        update = { delivery_status: 'opened', opened_at: eventTime };
        break;

      case 'Email Clicked':
        update = { delivery_status: 'clicked', clicked_at: eventTime };
        break;

      case 'Email Delivery Delayed':
        update = { delivery_status: 'delayed' };
        break;

      case 'Email Bounced':
        update = {
          delivery_status: 'bounced',
          bounced_at: eventTime,
          bounce_reason:
            detail.bounce?.bounceType ||
            detail.bounce?.bounceSubType ||
            'Unknown',
        };
        break;

      case 'Email Complaint Received':
        update = {
          delivery_status: 'complained',
          complained_at: eventTime,
          complaint_reason:
            detail.complaint?.complaintFeedbackType || 'Complaint',
        };
        break;

      case 'Email Rejected':
        update = {
          delivery_status: 'rejected',
          failed_at: eventTime,
          failure_reason: 'Rejected by SES',
        };
        break;

      case 'Email Rendering Failed':
        update = {
          delivery_status: 'failed',
          failed_at: eventTime,
          failure_reason: 'Rendering failure',
        };
        break;

      default:
        console.log(`No update mapped for event type: ${eventType}`);
    }

    if (Object.keys(update).length > 0 && emailRecord) {
      const { error: updateError } = await supabase
        .from('email_sent')
        .update(update)
        .eq('id', emailRecord.id);

      if (updateError) throw updateError;
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, messageId, eventType }),
    };
  } catch (error) {
    console.error('Handler error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
