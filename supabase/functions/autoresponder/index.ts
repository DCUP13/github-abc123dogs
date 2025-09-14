import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🚀 Autoresponder function called!')
    console.log('Request method:', req.method)
    console.log('Request headers:', Object.fromEntries(req.headers.entries()))

    if (req.method !== 'POST') {
      console.log('❌ Invalid method:', req.method)
      throw new Error('Method not allowed')
    }

    const requestBody = await req.json()
    console.log('📧 Request body:', requestBody)

    const { emailId } = requestBody
    
    if (!emailId) {
      console.log('❌ No email ID provided')
      throw new Error('Email ID is required')
    }

    console.log('📬 Processing email ID:', emailId)

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('🔗 Supabase client initialized')

    // Get the incoming email
    const { data: email, error: emailError } = await supabaseClient
      .from('emails')
      .select('*')
      .eq('id', emailId)
      .single()

    if (emailError) {
      console.log('❌ Error fetching email:', emailError)
      throw new Error(`Email not found: ${emailError.message}`)
    }

    if (!email) {
      console.log('❌ Email not found for ID:', emailId)
      throw new Error('Email not found')
    }

    console.log('✅ Email found!')
    console.log('📧 Email details:')
    console.log('  - ID:', email.id)
    console.log('  - From:', email.sender)
    console.log('  - To:', email.receiver)
    console.log('  - Subject:', email.subject)
    console.log('  - Body length:', email.body?.length || 0, 'characters')
    console.log('  - Created at:', email.created_at)

    // Log receiver details
    const receivers = Array.isArray(email.receiver) ? email.receiver : [email.receiver]
    console.log('📮 Processing receivers:', receivers)

    for (const receiverEmail of receivers) {
      if (!receiverEmail) {
        console.log('⚠️ Empty receiver email, skipping')
        continue
      }

      console.log('🎯 Processing receiver:', receiverEmail)
      
      // Extract domain from receiver email
      const domain = receiverEmail.split('@')[1]
      if (!domain) {
        console.log('⚠️ No domain found in receiver email:', receiverEmail)
        continue
      }

      console.log('🌐 Extracted domain:', domain)

      // Check if this domain has autoresponder enabled
      const { data: domainData, error: domainError } = await supabaseClient
        .from('amazon_ses_domains')
        .select('autoresponder_enabled, user_id')
        .eq('domain', domain)
        .eq('autoresponder_enabled', true)
        .maybeSingle()

      if (domainError) {
        console.log('❌ Error checking domain:', domainError)
        continue
      }

      if (!domainData) {
        console.log('📭 No autoresponder enabled for domain:', domain)
        continue
      }

      console.log('🤖 Autoresponder enabled for domain:', domain)
      console.log('👤 Domain owner user ID:', domainData.user_id)
      
      // For now, just log that we would send an autoresponse
      console.log('✨ AUTORESPONDER WOULD TRIGGER HERE!')
      console.log('  - Would reply to:', email.sender)
      console.log('  - From domain:', domain)
      console.log('  - Original subject:', email.subject)
    }

    console.log('🎉 Autoresponder processing completed successfully!')

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Autoresponder processing completed',
        emailId: emailId,
        processed: true
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('💥 Error in autoresponder function:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})