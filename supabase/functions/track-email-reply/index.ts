import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey"
};

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseKey);

interface EmailData {
  id: string;
  from: string;
  subject: string;
  to: string[];
  received_at: string;
}

function extractEmailAddress(emailString: string): string {
  const match = emailString.match(/<(.+)>/) || [null, emailString];
  return match[1].toLowerCase().trim();
}

function isReplySubject(subject: string, originalSubject: string): boolean {
  if (!subject || !originalSubject) return false;

  const cleanSubject = (s: string) => s.replace(/^(Re:|RE:|Fw:|FW:|Fwd:)\s*/gi, '').trim().toLowerCase();
  const cleanedSubject = cleanSubject(subject);
  const cleanedOriginal = cleanSubject(originalSubject);

  return cleanedSubject === cleanedOriginal || subject.toLowerCase().startsWith('re:');
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    });
  }

  try {
    const emailData: EmailData = await req.json();
    console.log('Tracking potential reply from:', emailData.from);

    const senderEmail = extractEmailAddress(emailData.from);
    console.log('Extracted sender email:', senderEmail);

    // Find all sent emails where we sent TO this sender
    // and the subject matches (considering Re: prefix)
    const { data: sentEmails, error: sentError } = await supabase
      .from('email_sent')
      .select('*')
      .ilike('to_email', senderEmail);

    if (sentError) {
      console.error('Error querying sent emails:', sentError);
      throw new Error(`Database error: ${sentError.message}`);
    }

    if (!sentEmails || sentEmails.length === 0) {
      console.log('No sent emails found to this address:', senderEmail);
      return new Response(JSON.stringify({
        success: false,
        message: 'No sent emails found to match this reply',
        sender: senderEmail
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 404
      });
    }

    // Find the most recent sent email that matches the subject
    let matchedSentEmail = null;
    for (const sentEmail of sentEmails) {
      if (isReplySubject(emailData.subject, sentEmail.subject)) {
        if (!matchedSentEmail || new Date(sentEmail.sent_at) > new Date(matchedSentEmail.sent_at)) {
          matchedSentEmail = sentEmail;
        }
      }
    }

    // If no subject match, use the most recent sent email to this address
    if (!matchedSentEmail && sentEmails.length > 0) {
      matchedSentEmail = sentEmails.reduce((latest, current) =>
        new Date(current.sent_at) > new Date(latest.sent_at) ? current : latest
      );
    }

    if (!matchedSentEmail) {
      console.log('Could not match reply to any sent email');
      return new Response(JSON.stringify({
        success: false,
        message: 'Could not match reply to any sent email'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 404
      });
    }

    console.log('Matched sent email:', matchedSentEmail.id);

    // Check if this reply has already been recorded
    const { data: existingReply, error: existingError } = await supabase
      .from('email_replies')
      .select('id')
      .eq('sent_email_id', matchedSentEmail.id)
      .eq('received_email_id', emailData.id)
      .maybeSingle();

    if (existingError) {
      console.error('Error checking existing reply:', existingError);
    }

    if (existingReply) {
      console.log('Reply already recorded');
      return new Response(JSON.stringify({
        success: true,
        message: 'Reply already recorded',
        reply_id: existingReply.id
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 200
      });
    }

    // Record the reply
    const { data: reply, error: replyError } = await supabase
      .from('email_replies')
      .insert({
        user_id: matchedSentEmail.user_id,
        sent_email_id: matchedSentEmail.id,
        received_email_id: emailData.id,
        from_email: senderEmail,
        subject: emailData.subject,
        created_at: emailData.received_at || new Date().toISOString()
      })
      .select()
      .single();

    if (replyError) {
      console.error('Error recording reply:', replyError);
      throw new Error(`Failed to record reply: ${replyError.message}`);
    }

    console.log('Reply recorded successfully:', reply.id);

    return new Response(JSON.stringify({
      success: true,
      message: 'Reply tracked successfully',
      reply_id: reply.id,
      sent_email_id: matchedSentEmail.id,
      sender: senderEmail
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });

  } catch (error) {
    console.error('Error tracking email reply:', error);
    return new Response(JSON.stringify({
      error: 'Failed to track reply',
      details: error.message
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
});
