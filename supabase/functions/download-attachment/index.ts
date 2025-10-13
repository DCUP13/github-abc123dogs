import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    const url = new URL(req.url)
    const s3Url = url.searchParams.get('s3_url')
    const emailId = url.searchParams.get('email_id')

    if (!s3Url || !emailId) {
      throw new Error('Missing required parameters')
    }

    const { data: email, error: emailError } = await supabaseClient
      .from('emails')
      .select('attachments')
      .eq('id', emailId)
      .single()

    if (emailError || !email) {
      throw new Error('Email not found or access denied')
    }

    const attachments = email.attachments || []
    const attachment = attachments.find((att: any) => att.s3_url === s3Url)

    if (!attachment) {
      throw new Error('Attachment not found')
    }

    const { data: sesSettings, error: sesError } = await supabaseClient
      .from('amazon_ses_settings')
      .select('smtp_username, smtp_password')
      .eq('user_id', user.id)
      .single()

    if (sesError || !sesSettings) {
      throw new Error('AWS credentials not configured in database')
    }

    const AWS_ACCESS_KEY_ID = sesSettings.smtp_username
    const AWS_SECRET_ACCESS_KEY = sesSettings.smtp_password
    const AWS_REGION = Deno.env.get('AWS_REGION') || 'us-east-1'

    if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
      throw new Error('AWS credentials not found in database')
    }

    const s3UrlParts = s3Url.replace('s3://', '').split('/')
    const bucket = s3UrlParts[0]
    const key = s3UrlParts.slice(1).join('/')

    const presignedUrl = await generatePresignedUrl(
      bucket, 
      key, 
      AWS_ACCESS_KEY_ID, 
      AWS_SECRET_ACCESS_KEY, 
      AWS_REGION
    )

    return new Response(
      JSON.stringify({ 
        downloadUrl: presignedUrl,
        filename: attachment.filename,
        contentType: attachment.contentType
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Error generating download URL:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})

async function generatePresignedUrl(
  bucket: string,
  key: string,
  accessKeyId: string,
  secretAccessKey: string,
  region: string
): Promise<string> {
  const method = 'GET'
  const service = 's3'
  const host = `${bucket}.s3.${region}.amazonaws.com`
  
  const now = new Date()
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '')
  const dateStamp = amzDate.slice(0, 8)
  
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`
  
  const queryParams = new URLSearchParams()
  queryParams.set('X-Amz-Algorithm', 'AWS4-HMAC-SHA256')
  queryParams.set('X-Amz-Credential', `${accessKeyId}/${credentialScope}`)
  queryParams.set('X-Amz-Date', amzDate)
  queryParams.set('X-Amz-Expires', '3600')
  queryParams.set('X-Amz-SignedHeaders', 'host')
  
  const sortedParams = Array.from(queryParams.entries()).sort()
  const canonicalQueryString = sortedParams.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')
  
  const canonicalUri = '/' + key.split('/').map(part => encodeURIComponent(part)).join('/')
  const canonicalHeaders = `host:${host}\n`
  const signedHeaders = 'host'
  const payloadHash = 'UNSIGNED-PAYLOAD'
  
  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    payloadHash
  ].join('\n')
  
  const algorithm = 'AWS4-HMAC-SHA256'
  const canonicalRequestHash = await sha256(canonicalRequest)
  const stringToSign = [
    algorithm,
    amzDate,
    credentialScope,
    canonicalRequestHash
  ].join('\n')
  
  const signingKey = await getSignatureKey(secretAccessKey, dateStamp, region, service)
  const signature = await hmacSha256Hex(signingKey, stringToSign)
  
  const finalParams = new URLSearchParams()
  finalParams.set('X-Amz-Algorithm', 'AWS4-HMAC-SHA256')
  finalParams.set('X-Amz-Credential', `${accessKeyId}/${credentialScope}`)
  finalParams.set('X-Amz-Date', amzDate)
  finalParams.set('X-Amz-Expires', '3600')
  finalParams.set('X-Amz-SignedHeaders', 'host')
  finalParams.set('X-Amz-Signature', signature)
  
  return `https://${host}${canonicalUri}?${finalParams.toString()}`
}

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