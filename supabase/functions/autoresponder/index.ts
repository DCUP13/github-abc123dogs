import { createClient } from 'npm:@supabase/supabase-js@2';
import OpenAI from 'npm:openai@4.68.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey"
};

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const openai = new OpenAI({
  apiKey: Deno.env.get('OPENAI_API_KEY') || ''
});

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { emailId } = await req.json();
    console.log('Processing autoresponder for email ID:', emailId);

    if (!emailId) {
      throw new Error('Email ID is required');
    }

    const { data: email, error: emailError } = await supabase
      .from('emails')
      .select('*')
      .eq('id', emailId)
      .single();

    if (emailError || !email) {
      throw new Error(`Email not found: ${emailError?.message}`);
    }

    const fromEmail = email.sender;
    const subject = email.subject || 'No subject';
    const body = email.body || '';
    const userId = email.user_id;

    const { data: autoresponderEmails, error: autoError } = await supabase
      .from('amazon_ses_emails')
      .select('address')
      .eq('user_id', userId)
      .eq('autoresponder_enabled', true);

    if (autoError || !autoresponderEmails || autoresponderEmails.length === 0) {
      console.log('No autoresponder emails configured for user:', userId);
      return new Response(JSON.stringify({
        success: false,
        message: 'No autoresponder configured'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 200
      });
    }

    const autoresponderEmail = autoresponderEmails[0].address;
    console.log('Using autoresponder email:', autoresponderEmail);

    const replySubject = subject.startsWith('Re:') ? subject : `Re: ${subject}`;

    const prompt = `Generate a professional, polite automatic reply to this email. The reply should:
1. Acknowledge receipt of their email
2. Let them know you'll respond soon
3. Be brief (2-3 sentences)
4. Sound natural and friendly

Original email subject: ${subject}
Original email body: ${body}

Generate only the body text of the reply, no subject line.`;

    let replyBody = 'Thank you for your email. I have received your message and will get back to you shortly.';

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a professional email assistant that generates brief, polite automatic replies.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 150,
        temperature: 0.7
      });

      replyBody = response.choices[0]?.message?.content || replyBody;
    } catch (aiError) {
      console.error('AI generation failed, using default reply:', aiError);
    }

    const { error: outboxError } = await supabase
      .from('email_outbox')
      .insert({
        user_id: userId,
        to_email: fromEmail,
        from_email: autoresponderEmail,
        subject: replySubject,
        body: replyBody,
        reply_to_id: emailId,
        attachments: [],
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (outboxError) {
      throw new Error(`Failed to queue autoresponse: ${outboxError.message}`);
    }

    console.log('Autoresponse queued successfully');

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Autoresponse queued',
        to: fromEmail,
        from: autoresponderEmail
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error in autoresponder:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Autoresponder failed',
        details: error.message 
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 500
      }
    );
  }
});