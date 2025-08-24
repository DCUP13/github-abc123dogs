import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
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

    // Get the S3 URL from the request
    const url = new URL(req.url)
    const s3Url = url.searchParams.get('s3_url')
    const emailId = url.searchParams.get('email_id')

    if (!s3Url || !emailId) {
      throw new Error('Missing required parameters')
    }

    // Verify the user has access to this email
    const { data: email, error: emailError } = await supabaseClient
      .from('emails')
      .select('attachments')
      .eq('id', emailId)
      .single()

    if (emailError || !email) {
      throw new Error('Email not found or access denied')
    }

    // Verify the attachment exists in this email
    const attachments = email.attachments || []
    const attachment = attachments.find((att: any) => att.s3_url === s3Url)
    
    if (!attachment) {
      throw new Error('Attachment not found')
    }

    // Get AWS credentials
    const AWS_ACCESS_KEY_ID = Deno.env.get('AWS_ACCESS_KEY_ID')
    const AWS_SECRET_ACCESS_KEY = Deno.env.get('AWS_SECRET_ACCESS_KEY')
    const AWS_REGION = Deno.env.get('AWS_REGION') || 'us-east-1'

    if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
      throw new Error('AWS credentials not configured')
    }

    // Parse S3 URL to get bucket and key
    const s3UrlParts = s3Url.replace('s3://', '').split('/')
    const bucket = s3UrlParts[0]
    const key = s3UrlParts.slice(1).join('/')

    // Generate presigned URL using proper AWS v4 signing
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
  const endpoint = `https://${host}`
  
  // Create timestamp
  const now = new Date()
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '')
  const dateStamp = amzDate.slice(0, 8)
  
  // Create credential scope
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`
  
  // Create query parameters
  const queryParams = new URLSearchParams({
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${accessKeyId}/${credentialScope}`,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': '3600',
    'X-Amz-SignedHeaders': 'host'
  })
  
  // Create canonical request
  const canonicalUri = '/' + key
  const canonicalQueryString = queryParams.toString()
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
  
  // Create string to sign
  const algorithm = 'AWS4-HMAC-SHA256'
  const canonicalRequestHash = await sha256(canonicalRequest)
  const stringToSign = [
    algorithm,
    amzDate,
    credentialScope,
    canonicalRequestHash
  ].join('\n')
  
  // Calculate signature
  const signingKey = await getSignatureKey(secretAccessKey, dateStamp, region, service)
  const signature = await hmacSha256Hex(signingKey, stringToSign)
  
  // Add signature to query parameters
  queryParams.set('X-Amz-Signature', signature)
  
  return `${endpoint}${canonicalUri}?${queryParams.toString()}`
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