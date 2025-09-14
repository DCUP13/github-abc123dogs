import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface IncomingEmail {
  id: string
  sender: string
  receiver: string[]
  subject: string
  body: string
  created_at: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      throw new Error('Method not allowed')
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { emailId } = await req.json()
    
    if (!emailId) {
      throw new Error('Email ID is required')
    }

    // Get the incoming email
    const { data: email, error: emailError } = await supabaseClient
      .from('emails')
      .select('*')
      .eq('id', emailId)
      .single()

    if (emailError || !email) {
      throw new Error('Email not found')
    }

    console.log('Processing autoresponder for email:', email.id)

    // Check each receiver to see if they have autoresponder enabled
    const receivers = Array.isArray(email.receiver) ? email.receiver : [email.receiver]
    
    for (const receiverEmail of receivers) {
      if (!receiverEmail) continue

      // Extract domain from receiver email
      const domain = receiverEmail.split('@')[1]
      if (!domain) continue

      console.log(`Checking autoresponder for domain: ${domain}`)

      // Check if this domain has autoresponder enabled
      const { data: domainData, error: domainError } = await supabaseClient
        .from('amazon_ses_domains')
        .select('autoresponder_enabled, user_id')
        .eq('domain', domain)
        .eq('autoresponder_enabled', true)
        .maybeSingle()

      if (domainError || !domainData) {
        console.log(`No autoresponder enabled for domain: ${domain}`)
        continue
      }

      console.log(`Autoresponder enabled for domain: ${domain}`)

      // Get prompts for this domain
      const { data: promptDomains, error: promptError } = await supabaseClient
        .from('prompt_domains')
        .select(`
          prompts (
            id,
            title,
            content,
            category
          )
        `)
        .eq('domain', domain)
        .eq('user_id', domainData.user_id)

      if (promptError) {
        console.error('Error fetching prompts:', promptError)
        continue
      }

      // Also get prompts with no domain restrictions (apply to all domains)
      const { data: generalPrompts, error: generalError } = await supabaseClient
        .from('prompts')
        .select('id, title, content, category')
        .eq('user_id', domainData.user_id)
        .not('id', 'in', `(${
          promptDomains?.map(pd => (pd as any).prompts.id).join(',') || 'null'
        })`)

      if (generalError) {
        console.error('Error fetching general prompts:', generalError)
        continue
      }

      // Combine domain-specific and general prompts
      const allPrompts = [
        ...(promptDomains?.map(pd => (pd as any).prompts) || []),
        ...(generalPrompts || [])
      ]

      if (allPrompts.length === 0) {
        console.log(`No prompts found for domain: ${domain}`)
        continue
      }

      // Use the first available prompt (you could add logic to select based on category or other criteria)
      const selectedPrompt = allPrompts[0]
      console.log(`Using prompt: ${selectedPrompt.title}`)

      // Replace {{email_content}} with actual email content
      const promptWithEmail = selectedPrompt.content.replace(
        /\{\{email_content\}\}/g,
        email.body || ''
      )

      console.log('Sending to OpenAI...')

      // Call OpenAI API
      try {
        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4',
            messages: [
              {
                role: 'user',
                content: promptWithEmail
              }
            ],
            max_tokens: 1000,
            temperature: 0.7
          })
        })

        if (!openaiResponse.ok) {
          const errorData = await openaiResponse.json()
          throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`)
        }

        const openaiResult = await openaiResponse.json()
        const responseContent = openaiResult.choices[0]?.message?.content

        if (!responseContent) {
          throw new Error('No response content from OpenAI')
        }

        console.log('Generated response:', responseContent.substring(0, 100) + '...')

        // Create reply subject
        const replySubject = email.subject?.startsWith('Re: ') 
          ? email.subject 
          : `Re: ${email.subject || '(No Subject)'}`

        // Add reply to outbox
        const { error: outboxError } = await supabaseClient
          .from('email_outbox')
          .insert({
            user_id: domainData.user_id,
            to_email: email.sender,
            from_email: receiverEmail,
            subject: replySubject,
            body: responseContent,
            reply_to_id: email.id,
            status: 'pending'
          })

        if (outboxError) {
          console.error('Error adding reply to outbox:', outboxError)
          continue
        }

        console.log(`Autoresponder reply queued for ${email.sender}`)

        // Trigger email sending
        try {
          const sendResponse = await fetch(
            `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-email`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                'Content-Type': 'application/json',
              },
            }
          )

          if (sendResponse.ok) {
            console.log('Autoresponder email sent successfully')
          } else {
            console.log('Autoresponder email queued in outbox')
          }
        } catch (sendError) {
          console.log('Autoresponder email queued in outbox (send function unavailable)')
        }

      } catch (openaiError) {
        console.error('OpenAI API error:', openaiError)
        continue
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Autoresponder processing completed'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Error in autoresponder function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})