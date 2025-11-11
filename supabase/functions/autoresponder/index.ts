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
    const receivers = email.receiver || [];

    if (!receivers || receivers.length === 0) {
      console.log('No receiver addresses found');
      return new Response(JSON.stringify({
        success: false,
        message: 'No receiver addresses'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 200
      });
    }

    const receiverEmail = receivers[0];
    const receiverDomain = receiverEmail.split('@')[1];
    console.log('Receiver email:', receiverEmail, 'Domain:', receiverDomain);

    const { data: domainData, error: domainError } = await supabase
      .from('amazon_ses_domains')
      .select('*')
      .eq('user_id', userId)
      .eq('domain', receiverDomain)
      .eq('autoresponder_enabled', true)
      .maybeSingle();

    if (domainError || !domainData) {
      console.log('Autoresponder not enabled for domain:', receiverDomain);
      return new Response(JSON.stringify({
        success: false,
        message: 'Autoresponder not enabled for this domain'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 200
      });
    }

    const { data: prompts, error: promptsError } = await supabase
      .from('prompt_domains')
      .select(`
        prompt_id,
        prompts (
          id,
          title,
          content
        )
      `)
      .eq('user_id', userId)
      .eq('domain', receiverDomain);

    if (promptsError) {
      console.error('Error fetching prompts:', promptsError);
    }

    const domainPrompts = prompts?.map(p => p.prompts).filter(Boolean) || [];
    console.log('Found', domainPrompts.length, 'prompts for domain:', receiverDomain);

    const { data: autoresponderEmails, error: autoError } = await supabase
      .from('amazon_ses_emails')
      .select('address')
      .eq('user_id', userId)
      .eq('autoresponder_enabled', true);

    if (autoError || !autoresponderEmails || autoresponderEmails.length === 0) {
      console.log('No autoresponder emails configured for user:', userId);
      return new Response(JSON.stringify({
        success: false,
        message: 'No autoresponder email configured'
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

    let systemPrompt = 'You are a professional email assistant that generates brief, polite automatic replies.';
    let userPrompt = `Generate a professional, polite automatic reply to this email. The reply should:
1. Acknowledge receipt of their email
2. Let them know you'll respond soon
3. Be brief (2-3 sentences)
4. Sound natural and friendly

Original email subject: ${subject}
Original email body: ${body}

Generate only the body text of the reply, no subject line.`;

    if (domainPrompts.length > 0) {
      console.log('Using domain-specific prompts');
      const promptContents = domainPrompts.map((p: any, idx: number) =>
        `Prompt ${idx + 1} (${p.title}):\n${p.content}`
      ).join('\n\n');

      userPrompt = `You have the following custom instructions to follow when generating the reply:\n\n${promptContents}\n\nNow, generate a reply to this email following ALL the instructions above:\n\nOriginal email subject: ${subject}\nOriginal email body: ${body}\n\nGenerate only the body text of the reply, no subject line.`;
    }

    let replyBody = 'Thank you for your email. I have received your message and will get back to you shortly.';

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        max_tokens: 500,
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