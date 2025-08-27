import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface EmailData {
  id: string
  to_email: string
  from_email: string
  subject: string
  body: string
  reply_to_id?: string
  attachments: any[]
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    // Verify the user is authenticated
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    if (req.method !== 'POST') {
      throw new Error('Method not allowed')
    }

    // Process outbox emails
    const { data: outboxEmails, error: fetchError } = await supabaseClient
      .from('email_outbox')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(10) // Process 10 emails at a time

    if (fetchError) throw fetchError

    const results = []

    for (const email of outboxEmails) {
      try {
        // Update status to sending
        await supabaseClient
          .from('email_outbox')
          .update({ 
            status: 'sending',
            updated_at: new Date().toISOString()
          })
          .eq('id', email.id)

        // Get user's email settings (Amazon SES or Gmail)
        const { data: sesSettings } = await supabaseClient
          .from('amazon_ses_settings')
          .select('*')
          .eq('user_id', email.user_id)
          .single()

        const { data: gmailSettings } = await supabaseClient
          .from('google_smtp_emails')
          .select('*')
          .eq('user_id', email.user_id)
          .eq('address', email.from_email)
          .single()

        let emailSent = false
        let errorMessage = ''

        // Try to send via Amazon SES first
        if (sesSettings && !emailSent) {
          try {
            await sendViaSES(email, sesSettings)
            emailSent = true
          } catch (error) {
            console.error('SES sending failed:', error)
            errorMessage = `SES: ${error.message}`
          }
        }

        // Try Gmail if SES failed or not configured
        if (gmailSettings && !emailSent) {
          try {
            await sendViaGmail(email, gmailSettings)
            emailSent = true
          } catch (error) {
            console.error('Gmail sending failed:', error)
            errorMessage = errorMessage ? `${errorMessage}, Gmail: ${error.message}` : `Gmail: ${error.message}`
          }
        }

        if (emailSent) {
          // Move to sent table
          await supabaseClient
            .from('email_sent')
            .insert({
              user_id: email.user_id,
              to_email: email.to_email,
              from_email: email.from_email,
              subject: email.subject,
              body: email.body,
              reply_to_id: email.reply_to_id,
              attachments: email.attachments,
              sent_at: new Date().toISOString(),
              created_at: email.created_at
            })

          // Remove from outbox
          await supabaseClient
            .from('email_outbox')
            .delete()
            .eq('id', email.id)

          results.push({ id: email.id, status: 'sent' })
        } else {
          // Mark as failed
          await supabaseClient
            .from('email_outbox')
            .update({ 
              status: 'failed',
              error_message: errorMessage,
              updated_at: new Date().toISOString()
            })
            .eq('id', email.id)

          results.push({ id: email.id, status: 'failed', error: errorMessage })
        }

      } catch (error) {
        console.error(`Error processing email ${email.id}:`, error)
        
        // Mark as failed
        await supabaseClient
          .from('email_outbox')
          .update({ 
            status: 'failed',
            error_message: error.message,
            updated_at: new Date().toISOString()
          })
          .eq('id', email.id)

        results.push({ id: email.id, status: 'failed', error: error.message })
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        processed: results.length,
        results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Error in send-email function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})

async function sendViaSES(email: EmailData, sesSettings: any) {
  // This is a simplified version - you'd implement actual SES sending here
  // For now, we'll simulate the sending process
  
  const AWS_REGION = Deno.env.get('AWS_REGION') || 'us-east-1'
  
  // In a real implementation, you'd use AWS SES SDK to send the email
  // For now, we'll just simulate success after a delay
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  // Simulate occasional failures for testing
  if (Math.random() < 0.1) {
    throw new Error('SES rate limit exceeded')
  }
  
  console.log(`Email sent via SES from ${email.from_email} to ${email.to_email}`)
}

async function sendViaGmail(email: EmailData, gmailSettings: any) {
  // This is a simplified version - you'd implement actual Gmail SMTP sending here
  // For now, we'll simulate the sending process
  
  // In a real implementation, you'd use SMTP to send via Gmail
  await new Promise(resolve => setTimeout(resolve, 1500))
  
  // Simulate occasional failures for testing
  if (Math.random() < 0.1) {
    throw new Error('Gmail authentication failed')
  }
  
  console.log(`Email sent via Gmail from ${email.from_email} to ${email.to_email}`)
}