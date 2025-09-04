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
  user_id: string
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

    // Check if we're sending a specific email or processing the outbox
    const requestBody = await req.json().catch(() => ({}))
    const specificEmailId = requestBody.emailId

    // Process outbox emails
    let query = supabaseClient
      .from('email_outbox')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })

    if (specificEmailId) {
      // Process only the specific email
      query = query.eq('id', specificEmailId).limit(1)
    } else {
      // Process up to 10 emails from the outbox
      query = query.limit(10)
    }

    const { data: outboxEmails, error: fetchError } = await query

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
              error_message: errorMessage || 'No email provider configured',
              updated_at: new Date().toISOString()
            })
            .eq('id', email.id)

          results.push({ id: email.id, status: 'failed', error: errorMessage || 'No email provider configured' })
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
  // Parse multiple recipients from comma-separated string
  const recipients = email.to_email.split(',').map(addr => addr.trim()).filter(addr => addr.length > 0)
  
  console.log(`Sending email to ${recipients.length} recipients via SES SMTP:`, recipients)
  
  // Create SMTP transporter for SES
  const transporter = {
    host: sesSettings.smtp_server,
    port: parseInt(sesSettings.smtp_port),
    secure: sesSettings.smtp_port === '465',
    auth: {
      user: sesSettings.smtp_username,
      pass: sesSettings.smtp_password,
    },
  }
  
  // Prepare email content
  const mailOptions = {
    from: email.from_email,
    to: recipients.join(', '), // All recipients visible to each other
    subject: email.subject,
    html: email.body,
    text: email.body.replace(/<[^>]*>/g, ''), // Strip HTML for text version
  }
  
  console.log('Mail options:', mailOptions)
  
  // Send via SMTP using fetch (since we can't use nodemailer in Deno)
  await sendSMTPEmail(transporter, mailOptions)
  
  console.log(`✅ Successfully sent email to all ${recipients.length} recipients via SES`)
}

async function sendSMTPEmail(transporter: any, mailOptions: any) {
  // Since we can't use nodemailer in Deno, we'll use a simple SMTP implementation
  // For now, let's use the AWS SES API instead
  
  const AWS_ACCESS_KEY_ID = Deno.env.get('AWS_ACCESS_KEY_ID')
  const AWS_SECRET_ACCESS_KEY = Deno.env.get('AWS_SECRET_ACCESS_KEY')
  const AWS_REGION = Deno.env.get('AWS_REGION') || 'us-east-1'
  
  if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
    throw new Error('AWS credentials not configured')
  }
  
  // Parse recipients
  const recipients = mailOptions.to.split(',').map((addr: string) => addr.trim())
  
  // Create the email message
  const message = [
    `From: ${mailOptions.from}`,
    `To: ${mailOptions.to}`,
    `Subject: ${mailOptions.subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    '',
    mailOptions.html
  ].join('\r\n')
  
  // Use SES SendRawEmail API
  const params = {
    RawMessage: {
      Data: btoa(message)
    },
    Destinations: recipients
  }
  
  const endpoint = `https://email.${AWS_REGION}.amazonaws.com/`
  const service = 'ses'
  const method = 'POST'
  const headers = {
    'Content-Type': 'application/x-amz-json-1.0',
    'X-Amz-Target': 'AWSSimpleEmailService.SendRawEmail'
  }
  
  // Create AWS signature
  const now = new Date()
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '')
  const dateStamp = amzDate.slice(0, 8)
  
  const credentialScope = `${dateStamp}/${AWS_REGION}/${service}/aws4_request`
  const canonicalHeaders = `content-type:${headers['Content-Type']}\nhost:email.${AWS_REGION}.amazonaws.com\nx-amz-date:${amzDate}\nx-amz-target:${headers['X-Amz-Target']}\n`
  const signedHeaders = 'content-type;host;x-amz-date;x-amz-target'
  
  const payloadHash = await sha256(JSON.stringify(params))
  const canonicalRequest = [
    method,
    '/',
    '',
    canonicalHeaders,
    signedHeaders,
    payloadHash
  ].join('\n')
  
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    await sha256(canonicalRequest)
  ].join('\n')
  
  const signingKey = await getSignatureKey(AWS_SECRET_ACCESS_KEY, dateStamp, AWS_REGION, service)
  const signature = await hmacSha256Hex(signingKey, stringToSign)
  
  const authorizationHeader = `AWS4-HMAC-SHA256 Credential=${AWS_ACCESS_KEY_ID}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`
  
  // Send the request
  const response = await fetch(endpoint, {
    method: method,
    headers: {
      ...headers,
      'Authorization': authorizationHeader,
      'X-Amz-Date': amzDate
    },
    body: JSON.stringify(params)
  })
  
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`SES API error: ${response.status} ${errorText}`)
  }
  
  console.log('SES API response:', await response.text())

}

// Helper functions for AWS signature calculation
async function sha256(message: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(message)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

async function hmacSha256(key: Uint8Array, message: string): Promise<Uint8Array> {
  const encoder = new TextEncoder()
  const keyObject = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', keyObject, encoder.encode(message))
  return new Uint8Array(signature)
}

async function hmacSha256Hex(key: Uint8Array, message: string): Promise<string> {
  const signature = await hmacSha256(key, message)
  return Array.from(signature).map(b => b.toString(16).padStart(2, '0')).join('')
}

async function getSignatureKey(
  key: string,
  dateStamp: string,
  regionName: string,
  serviceName: string
): Promise<Uint8Array> {
  const encoder = new TextEncoder()
  const kDate = await hmacSha256(encoder.encode('AWS4' + key), dateStamp)
  const kRegion = await hmacSha256(kDate, regionName)
  const kService = await hmacSha256(kRegion, serviceName)
  const kSigning = await hmacSha256(kService, 'aws4_request')
  return kSigning
}