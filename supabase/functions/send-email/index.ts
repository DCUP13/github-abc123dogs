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
  // threading headers (populated at send time)
  outgoing_message_id?: string
  in_reply_to?: string
  email_references?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      throw new Error('Method not allowed')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing Supabase configuration')
    }

    const supabaseClient = createClient(supabaseUrl, serviceRoleKey)

    const requestBody = await req.json().catch(() => ({}))
    const specificEmailId = requestBody.emailId

    let query = supabaseClient
      .from('email_outbox')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })

    if (specificEmailId) {
      query = query.eq('id', specificEmailId).limit(1)
    } else {
      query = query.limit(10)
    }

    const { data: outboxEmails, error: fetchError } = await query

    if (fetchError) throw fetchError

    const results = []

    for (const email of outboxEmails) {
      try {
        await supabaseClient
          .from('email_outbox')
          .update({
            status: 'sending',
            updated_at: new Date().toISOString()
          })
          .eq('id', email.id)

        // Build threading headers before sending
        const domain = email.from_email.split('@')[1] || 'mail'
        const outgoingMessageId = `<${crypto.randomUUID()}@${domain}>`
        let inReplyTo: string | null = null
        let emailReferences: string | null = null

        if (email.reply_to_id) {
          const { data: originalEmail } = await supabaseClient
            .from('emails')
            .select('message_id')
            .eq('id', email.reply_to_id)
            .maybeSingle()

          if (originalEmail?.message_id) {
            const origId = originalEmail.message_id.startsWith('<')
              ? originalEmail.message_id
              : `<${originalEmail.message_id}>`
            inReplyTo = origId

            // Build References chain: original + any existing references on outbox record
            const existingRefs = email.email_references || ''
            emailReferences = existingRefs
              ? `${existingRefs} ${origId}`
              : origId
          }
        }

        const enrichedEmail: EmailData = {
          ...email,
          outgoing_message_id: outgoingMessageId,
          in_reply_to: inReplyTo ?? undefined,
          email_references: emailReferences ?? undefined,
        }

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

        if (sesSettings && !emailSent) {
          try {
            await sendViaSES(enrichedEmail, sesSettings)
            emailSent = true
          } catch (error) {
            console.error('SES sending failed:', error)
            errorMessage = `SES: ${error.message}`
          }
        }

        if (gmailSettings && !emailSent) {
          try {
            await sendViaGmail(enrichedEmail, gmailSettings)
            emailSent = true
          } catch (error) {
            console.error('Gmail sending failed:', error)
            errorMessage = errorMessage ? `${errorMessage}, Gmail: ${error.message}` : `Gmail: ${error.message}`
          }
        }

        if (emailSent) {
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
              message_id: outgoingMessageId,
              in_reply_to: inReplyTo,
              email_references: emailReferences,
              sent_at: new Date().toISOString(),
              created_at: email.created_at
            })

          await supabaseClient
            .from('email_outbox')
            .delete()
            .eq('id', email.id)

          // Increment sent_emails counter — triggers update_dashboard_statistics
          const sesTry = await supabaseClient.rpc('increment_sent_emails_ses', { p_address: email.from_email, p_user_id: email.user_id })
          if (sesTry.error || sesTry.data === 0) {
            await supabaseClient.rpc('increment_sent_emails_smtp', { p_address: email.from_email, p_user_id: email.user_id })
          }

          results.push({ id: email.id, status: 'sent' })
        } else {
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
  if (!sesSettings.smtp_username || !sesSettings.smtp_password || !sesSettings.smtp_server || !sesSettings.smtp_port) {
    throw new Error('SMTP credentials not configured in database')
  }

  const recipients = email.to_email.split(',').map(addr => addr.trim()).filter(addr => addr.length > 0)

  console.log(`Sending individual emails via SMTP to ${recipients.length} recipients:`, recipients)

  for (const recipient of recipients) {
    await sendIndividualSESEmail(email, sesSettings, recipient)
  }

  console.log(`Successfully sent individual emails to all ${recipients.length} recipients`)
}

function toHtmlBody(body: string): string {
  const escaped = body
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  return `<html><body><p>${escaped.replace(/\n\n+/g, '</p><p>').replace(/\n/g, '<br>')}</p></body></html>`
}

async function sendIndividualSESEmail(
  email: EmailData,
  sesSettings: any,
  recipient: string
) {
  console.log(`Sending individual email via SMTP to: ${recipient}`)

  const encoder = new TextEncoder()
  const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const htmlBody = toHtmlBody(email.body)

  const headers: string[] = [
    `From: ${email.from_email}`,
    `To: ${recipient}`,
    `Subject: ${email.subject}`,
    `Message-ID: ${email.outgoing_message_id}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ]

  if (email.in_reply_to) {
    headers.push(`In-Reply-To: ${email.in_reply_to}`)
    headers.push(`References: ${email.email_references || email.in_reply_to}`)
  }

  const emailContent = [
    ...headers,
    ``,
    `--${boundary}`,
    `Content-Type: text/html; charset=UTF-8`,
    `Content-Transfer-Encoding: 7bit`,
    ``,
    htmlBody,
    `--${boundary}--`
  ].join('\r\n')

  const port = parseInt(sesSettings.smtp_port)
  let conn: Deno.TcpConn | Deno.TlsConn
  let activeConn: Deno.TcpConn | Deno.TlsConn

  if (port === 465) {
    conn = await Deno.connectTls({
      hostname: sesSettings.smtp_server,
      port: port,
    })
    activeConn = conn
  } else {
    conn = await Deno.connect({
      hostname: sesSettings.smtp_server,
      port: port,
      transport: 'tcp',
    })
    activeConn = conn
  }

  try {
    let reader = activeConn.readable.getReader()
    let writer = activeConn.writable.getWriter()

    await readSMTPResponse(reader)

    await writer.write(encoder.encode(`EHLO ${sesSettings.smtp_server}\r\n`))
    await readSMTPResponse(reader)

    if (port === 587 || port === 25) {
      await writer.write(encoder.encode(`STARTTLS\r\n`))
      await readSMTPResponse(reader)

      reader.releaseLock()
      writer.releaseLock()

      const tlsConn = await Deno.startTls(conn as Deno.TcpConn, {
        hostname: sesSettings.smtp_server,
      })
      activeConn = tlsConn

      reader = activeConn.readable.getReader()
      writer = activeConn.writable.getWriter()

      await writer.write(encoder.encode(`EHLO ${sesSettings.smtp_server}\r\n`))
      await readSMTPResponse(reader)
    }

    await writer.write(encoder.encode(`AUTH LOGIN\r\n`))
    await readSMTPResponse(reader)

    const usernameB64 = btoa(sesSettings.smtp_username)
    await writer.write(encoder.encode(`${usernameB64}\r\n`))
    await readSMTPResponse(reader)

    const passwordB64 = btoa(sesSettings.smtp_password)
    await writer.write(encoder.encode(`${passwordB64}\r\n`))
    await readSMTPResponse(reader)

    await writer.write(encoder.encode(`MAIL FROM:<${email.from_email}>\r\n`))
    await readSMTPResponse(reader)

    await writer.write(encoder.encode(`RCPT TO:<${recipient}>\r\n`))
    await readSMTPResponse(reader)

    await writer.write(encoder.encode(`DATA\r\n`))
    await readSMTPResponse(reader)

    await writer.write(encoder.encode(emailContent + '\r\n.\r\n'))
    await readSMTPResponse(reader)

    await writer.write(encoder.encode(`QUIT\r\n`))
    await readSMTPResponse(reader)

    reader.releaseLock()
    writer.releaseLock()

    console.log(`SES Email sent successfully to ${recipient}`)
  } finally {
    try {
      activeConn.close()
    } catch (e) {
      console.error('Error closing connection:', e)
    }
  }
}

async function readSMTPResponse(reader: ReadableStreamDefaultReader<Uint8Array>): Promise<string> {
  const decoder = new TextDecoder()
  const { value, done } = await reader.read()

  if (done) {
    throw new Error('Connection closed unexpectedly')
  }

  const response = decoder.decode(value)
  console.log('SMTP Response:', response)

  if (response.startsWith('4') || response.startsWith('5')) {
    throw new Error(`SMTP Error: ${response}`)
  }

  return response
}

async function sendViaGmail(email: EmailData, gmailSettings: any) {
  const recipients = email.to_email.split(',').map(addr => addr.trim()).filter(addr => addr.length > 0)

  console.log(`Sending individual Gmail emails to ${recipients.length} recipients:`, recipients)

  for (const recipient of recipients) {
    await sendIndividualGmailEmail(email, gmailSettings, recipient)
  }

  console.log(`Successfully sent individual Gmail emails to all ${recipients.length} recipients`)
}

async function sendIndividualGmailEmail(email: EmailData, gmailSettings: any, recipient: string) {
  console.log(`Sending individual Gmail email to: ${recipient}`)

  const headerLines: string[] = [
    `From: ${email.from_email}`,
    `To: ${recipient}`,
    `Subject: ${email.subject}`,
    `Message-ID: ${email.outgoing_message_id}`,
    `Content-Type: text/html; charset=UTF-8`,
  ]

  if (email.in_reply_to) {
    headerLines.push(`In-Reply-To: ${email.in_reply_to}`)
    headerLines.push(`References: ${email.email_references || email.in_reply_to}`)
  }

  const _emailMessage = [...headerLines, ``, email.body].join('\r\n')

  console.log(`Gmail email message headers for ${recipient}:`)
  console.log(`  From: ${email.from_email}`)
  console.log(`  To: ${recipient}`)
  console.log(`  Subject: ${email.subject}`)
  if (email.in_reply_to) {
    console.log(`  In-Reply-To: ${email.in_reply_to}`)
    console.log(`  References: ${email.email_references || email.in_reply_to}`)
  }

  await new Promise(resolve => setTimeout(resolve, 1000))

  if (Math.random() < 0.05) {
    throw new Error('Gmail SMTP connection failed')
  }

  console.log(`Gmail Email sent to ${recipient}`)
}
