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
    const requestBody = await req.json();
    console.log('Received request body:', JSON.stringify(requestBody));

    const { emailId } = requestBody;
    console.log('Processing autoresponder for email ID:', emailId);

    if (!emailId) {
      console.error('Email ID missing. Request body keys:', Object.keys(requestBody));
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
      .maybeSingle();

    if (domainError || !domainData) {
      console.log('Domain not found:', receiverDomain);
      return new Response(JSON.stringify({
        success: false,
        message: 'Domain not configured'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 200
      });
    }

    const autoresponderEnabled = domainData.autoresponder_enabled || false;
    const draftsEnabled = domainData.drafts_enabled || false;

    if (!autoresponderEnabled && !draftsEnabled) {
      console.log('Both autoresponder and drafts disabled for domain:', receiverDomain);
      return new Response(JSON.stringify({
        success: false,
        message: 'Autoresponder and drafts are disabled for this domain'
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

    if (domainPrompts.length === 0) {
      console.log('No prompts configured for domain:', receiverDomain);
      return new Response(JSON.stringify({
        success: false,
        message: 'No prompts configured for this domain'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 200
      });
    }

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

    const emailContent = `Subject: ${subject}\n\nBody:\n${body}`;

    const processedPrompts = domainPrompts.map((p: any) => {
      const content = p.content.replace(/\{\{email_content\}\}/g, emailContent);
      return content;
    });

    const combinedPrompt = processedPrompts.join('\n\n---\n\n');
    console.log('Using combined prompts for domain:', receiverDomain);

    let replyBody = '';

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: combinedPrompt
          }
        ],
        max_tokens: 500,
        temperature: 0.7
      });

      replyBody = response.choices[0]?.message?.content || '';
    } catch (aiError) {
      console.error('AI generation failed:', aiError);
      throw new Error('Failed to generate autoresponse');
    }

    if (!replyBody) {
      throw new Error('No reply content generated');
    }

    if (autoresponderEnabled) {
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
          from: autoresponderEmail,
          mode: 'autoresponder'
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
          status: 200
        }
      );
    } else if (draftsEnabled) {
      const { error: draftError } = await supabase
        .from('email_drafts')
        .insert({
          user_id: userId,
          sender: autoresponderEmail,
          receiver: [fromEmail],
          subject: replySubject,
          body: replyBody,
          attachments: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (draftError) {
        throw new Error(`Failed to save draft: ${draftError.message}`);
      }

      console.log('Draft saved successfully');

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Draft saved',
          to: fromEmail,
          from: autoresponderEmail,
          mode: 'draft'
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
          status: 200
        }
      );
    }

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