const { createClient } = require('@supabase/supabase-js');

// Route by X-SES-MESSAGE-TAGS app value set in the SMTP header.
// SES surfaces these as detail.mail.tags: { app: ['loiblast'] } in EventBridge events.
function getClient(event) {
  const tags = event.detail?.mail?.tags || {};
  const app = Array.isArray(tags.app) ? tags.app[0] : tags.app;

  if (app === 'loiblast') {
    console.log('Using loiblast Supabase client');
    return createClient(
      process.env.LB_SUPABASE_URL,
      process.env.LB_SUPABASE_KEY
    );
  }

  console.log('Using loireply Supabase client');
  return createClient(
    process.env.LR_SUPABASE_URL,
    process.env.LR_SUPABASE_KEY
  );
}

exports.handler = async (event) => {
  console.log('SES Event received:', JSON.stringify(event, null, 2));

  try {
    const detail = event.detail || {};
    const eventType = event['detail-type'] || 'UNKNOWN';
    const messageId = detail.mail?.messageId || null;
    const recipient = detail.mail?.destination?.[0] || null;
    const eventTime = detail.mail?.timestamp || event.time || new Date().toISOString();

    console.log('Parsed event fields:', JSON.stringify({ eventType, messageId, recipient, eventTime }, null, 2));

    if (!messageId) {
      console.warn('No message_id found in event — skipping');
      return { statusCode: 200 };
    }

    const supabase = getClient(event);

    // Look up email_sent by ses_message_id or message_id
    console.log(`Looking up email_sent for messageId: ${messageId}`);
    const { data: emailRecord, error: lookupError } = await supabase
      .from('email_sent')
      .select('id')
      .or(`ses_message_id.eq.${messageId},message_id.eq.${messageId}`)
      .maybeSingle();

    console.log('email_sent lookup result:', JSON.stringify({ emailRecord, lookupError }, null, 2));

    if (lookupError) {
      console.error('email_sent lookup error:', JSON.stringify(lookupError, null, 2));
      throw lookupError;
    }

    if (!emailRecord) {
      console.warn(`No email_sent row found for message_id: ${messageId} — continuing without email_sent_id`);
    }

    // Insert event into audit log. Use insert (not upsert) to avoid needing
    // UPDATE RLS. Duplicate event_id inserts are caught and skipped gracefully.
    const eventRow = {
      event_id: event.id,
      email_sent_id: emailRecord?.id || null,
      message_id: messageId,
      event_type: eventType,
      recipient,
      event_time: eventTime,
      raw_event: event,
    };
    console.log('Inserting email_events row:', JSON.stringify(eventRow, null, 2));

    const { data: insertData, error: eventError } = await supabase
      .from('email_events')
      .insert([eventRow]);

    console.log('email_events insert result:', JSON.stringify({ insertData, eventError }, null, 2));

    if (eventError) {
      // 23505 = unique_violation (duplicate event_id) — idempotent, not a real error
      if (eventError.code === '23505') {
        console.log(`Duplicate event_id ${event.id} — already processed, skipping`);
      } else {
        console.error('email_events insert error:', JSON.stringify(eventError, null, 2));
        throw eventError;
      }
    }

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
          bounce_reason: detail.bounce?.bounceType || detail.bounce?.bounceSubType || 'Unknown',
        };
        break;
      case 'Email Complaint Received':
        update = {
          delivery_status: 'complained',
          complained_at: eventTime,
          complaint_reason: detail.complaint?.complaintFeedbackType || 'Complaint',
        };
        break;
      case 'Email Rejected':
        update = { delivery_status: 'rejected', failed_at: eventTime, failure_reason: 'Rejected by SES' };
        break;
      case 'Email Rendering Failed':
        update = { delivery_status: 'failed', failed_at: eventTime, failure_reason: 'Rendering failure' };
        break;
      default:
        console.log(`No email_sent update mapped for event type: ${eventType}`);
    }

    if (Object.keys(update).length > 0 && emailRecord) {
      console.log(`Updating email_sent id=${emailRecord.id}:`, JSON.stringify(update, null, 2));

      const { data: updateData, error: updateError } = await supabase
        .from('email_sent')
        .update(update)
        .eq('id', emailRecord.id);

      console.log('email_sent update result:', JSON.stringify({ updateData, updateError }, null, 2));

      if (updateError) {
        console.error('email_sent update error:', JSON.stringify(updateError, null, 2));
        throw updateError;
      }
    } else if (Object.keys(update).length > 0 && !emailRecord) {
      console.warn('Would update email_sent but no record found — skipping update');
    }

    console.log('Handler completed successfully:', JSON.stringify({ messageId, eventType }));
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, messageId, eventType }),
    };
  } catch (error) {
    console.error('Handler error:', JSON.stringify({ message: error.message, code: error.code, details: error.details, hint: error.hint }, null, 2));
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
