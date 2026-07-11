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

async function callAI(prompt: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 500,
    temperature: 0.7
  });
  return response.choices[0]?.message?.content || '';
}

async function callAIWithSystem(systemPrompt: string, userMessage: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ],
    max_tokens: 500,
    temperature: 0.7
  });
  return response.choices[0]?.message?.content || '';
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    console.log('Received request body:', JSON.stringify(requestBody));

    const { emailId } = requestBody;
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

    const originalSender = email.sender;
    const subject = email.subject || 'No subject';
    const body = email.body || '';
    const userId = email.user_id;
    const receivers = email.receiver || [];

    if (!receivers || receivers.length === 0) {
      console.log('No receiver addresses found');
      return new Response(JSON.stringify({ success: false, message: 'No receiver addresses' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    const receivedByEmail = receivers[0];
    const receivedByDomain = receivedByEmail.split('@')[1];
    console.log('Email received by:', receivedByEmail, 'Domain:', receivedByDomain);

    const { data: emailAddressData, error: emailAddressError } = await supabase
      .from('amazon_ses_emails')
      .select('*')
      .eq('user_id', userId)
      .eq('address', receivedByEmail)
      .maybeSingle();

    if (emailAddressError || !emailAddressData) {
      console.log('Email address not configured:', receivedByEmail);
      return new Response(JSON.stringify({ success: false, message: 'Email address not configured' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    const shouldAutoSend = emailAddressData.autoresponder_enabled || false;
    const shouldSaveDraft = !shouldAutoSend && (emailAddressData.drafts_enabled || false);

    if (!shouldAutoSend && !shouldSaveDraft) {
      console.log('No action configured for this email');
      return new Response(JSON.stringify({ success: false, message: 'No action configured for this email' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    // Fetch prompts: try exact email address first, then fall back to domain
    const fetchPromptsByTarget = async (target: string) => {
      const { data, error } = await supabase
        .from('prompt_domains')
        .select(`
          prompt_id,
          prompts (
            id,
            title,
            content,
            prompt_type,
            step2_content,
            property_info,
            company_info,
            response_mode,
            template_subject,
            template_body,
            template_ai_instructions
          )
        `)
        .eq('user_id', userId)
        .eq('domain', target);
      if (error) console.error('Error fetching prompts for target', target, error);
      return data?.map(p => p.prompts).filter(Boolean) || [];
    };

    let domainPrompts = await fetchPromptsByTarget(receivedByEmail);
    const resolvedBy = domainPrompts.length > 0 ? 'address' : 'domain';
    if (domainPrompts.length === 0) {
      domainPrompts = await fetchPromptsByTarget(receivedByDomain);
    }
    console.log('Found', domainPrompts.length, 'prompts via', resolvedBy, '—', resolvedBy === 'address' ? receivedByEmail : receivedByDomain);

    if (domainPrompts.length === 0) {
      console.log('No prompts configured for domain:', receivedByDomain);
      return new Response(JSON.stringify({ success: false, message: 'No prompts configured for this domain' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    // {{email_content}} = only the latest inbound message body
    const emailContent = `Subject: ${subject}\n\nBody:\n${body}`;

    // {{FULL_CONVERSATION_HISTORY}} = full thread: original + all sent replies, oldest first
    const { data: sentReplies } = await supabase
      .from('email_sent')
      .select('from_email, to_email, subject, body, sent_at')
      .eq('reply_to_id', emailId)
      .order('sent_at', { ascending: true });

    const historyParts: string[] = [];
    historyParts.push(`[${new Date(email.created_at).toISOString()}] From: ${originalSender}\nSubject: ${subject}\n\n${body}`);
    for (const sent of (sentReplies || [])) {
      historyParts.push(`[${new Date(sent.sent_at).toISOString()}] From: ${sent.from_email} To: ${sent.to_email}\nSubject: ${sent.subject}\n\n${sent.body}`);
    }
    const fullConversationHistory = historyParts.join('\n\n---\n\n');

    const replySubject = subject.startsWith('Re:') ? subject : `Re: ${subject}`;

    // Process each prompt and collect final reply bodies
    const replyParts: string[] = [];
    let customSubject: string | null = null;

    for (const prompt of domainPrompts as any[]) {
      const responseMode = prompt.response_mode || 'ai';

      // ── Email Template: Basic ──────────────────────────────────────────────
      if (responseMode === 'template') {
        console.log(`Using basic template: ${prompt.title}`);
        const templateBody = prompt.template_body || '';
        if (templateBody) {
          replyParts.push(templateBody);
          if (prompt.template_subject && !customSubject) {
            customSubject = prompt.template_subject;
          }
        }
        continue;
      }

      // ── Email Template: Intelligent ────────────────────────────────────────
      if (responseMode === 'intelligent_template') {
        console.log(`Using intelligent template: ${prompt.title}`);
        const templateBody = prompt.template_body || '';
        const aiInstructions = prompt.template_ai_instructions || '';

        if (templateBody) {
          const systemPrompt = aiInstructions
            ? `${aiInstructions}\n\nBase template to personalize:\n${templateBody}`
            : `Personalize the following template for the incoming email:\n${templateBody}`;

          const result = await callAIWithSystem(systemPrompt, emailContent);
          if (result) {
            replyParts.push(result);
          }
          if (prompt.template_subject && !customSubject) {
            customSubject = prompt.template_subject;
          }
        }
        continue;
      }

      // ── AI Mode: One-step or Two-step ──────────────────────────────────────
      const rawPropertyInfo = prompt.property_info;
      let propertyInfoText = '';
      if (rawPropertyInfo) {
        const properties = Array.isArray(rawPropertyInfo) ? rawPropertyInfo : [rawPropertyInfo];
        propertyInfoText = properties
          .map((p: Record<string, string>, i: number) => {
            const lines = Object.entries(p)
              .filter(([, v]) => v && String(v).trim() !== '')
              .map(([k, v]) => `  ${k.replace(/_/g, ' ')}: ${v}`)
              .join('\n');
            return `Property ${i + 1}:\n${lines}`;
          })
          .join('\n\n');
      }

      const step1Prompt = prompt.content
        .replace(/\{\{email_content\}\}/g, emailContent)
        .replace(/\{\{FULL_CONVERSATION_HISTORY\}\}/g, fullConversationHistory)
        .replace(/\{\{property_info\}\}/g, propertyInfoText)
        .replace(/\{\{company_info\}\}/g, prompt.company_info || '');

      if (prompt.prompt_type === 'two_step') {
        console.log(`Running two-step prompt: ${prompt.title}`);

        const step1Result = await callAI(step1Prompt);
        if (!step1Result) {
          console.error('Step 1 produced no output for prompt:', prompt.id);
          continue;
        }

        const { error: step1SaveError } = await supabase
          .from('prompt_step_results')
          .insert({
            user_id: userId,
            prompt_id: prompt.id,
            email_id: emailId,
            step1_result: step1Result
          });

        if (step1SaveError) {
          console.error('Failed to save step 1 result:', step1SaveError);
        }

        const step2Template = prompt.step2_content || '';
        const step2Prompt = step2Template
          .replace(/\{\{email_content\}\}/g, emailContent)
          .replace(/\{\{FULL_CONVERSATION_HISTORY\}\}/g, fullConversationHistory)
          .replace(/\{\{step1_result\}\}/g, step1Result)
          .replace(/\{\{property_info\}\}/g, propertyInfoText)
          .replace(/\{\{company_info\}\}/g, prompt.company_info || '');

        const step2Result = await callAI(step2Prompt);
        if (step2Result) {
          replyParts.push(step2Result);
        }
      } else {
        console.log(`Running one-step prompt: ${prompt.title}`);
        const result = await callAI(step1Prompt);
        if (result) {
          replyParts.push(result);
        }
      }
    }

    const replyBody = replyParts.join('\n\n');
    const finalSubject = customSubject || replySubject;

    if (!replyBody) {
      throw new Error('No reply content generated');
    }

    if (shouldAutoSend) {
      const { error: outboxError } = await supabase
        .from('email_outbox')
        .insert({
          user_id: userId,
          to_email: originalSender,
          from_email: receivedByEmail,
          subject: finalSubject,
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
        JSON.stringify({ success: true, message: 'Autoresponse queued', to: originalSender, from: receivedByEmail, mode: 'autoresponder' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    } else {
      const { error: draftError } = await supabase
        .from('email_drafts')
        .insert({
          user_id: userId,
          sender: receivedByEmail,
          receiver: [originalSender],
          subject: finalSubject,
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
        JSON.stringify({ success: true, message: 'Draft saved', to: originalSender, from: receivedByEmail, mode: 'draft' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

  } catch (error) {
    console.error('Error in autoresponder:', error);
    return new Response(
      JSON.stringify({ error: 'Autoresponder failed', details: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
