import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey"
};

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseKey);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { code, userId } = await req.json();

    if (!code || !userId) {
      throw new Error('Code and userId are required');
    }

    const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
    const redirectUri = Deno.env.get('GOOGLE_REDIRECT_URI');

    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error('Google OAuth credentials not configured');
    }

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed:', errorText);
      throw new Error('Failed to exchange code for tokens');
    }

    const tokens = await tokenResponse.json();
    const { access_token, refresh_token, expires_in } = tokens;

    const expiryDate = new Date();
    expiryDate.setSeconds(expiryDate.getSeconds() + expires_in);

    const { error: upsertError } = await supabase
      .from('google_calendar_tokens')
      .upsert({
        user_id: userId,
        access_token,
        refresh_token: refresh_token || null,
        token_expiry: expiryDate.toISOString(),
        calendar_id: 'primary',
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (upsertError) {
      console.error('Database error:', upsertError);
      throw new Error('Failed to save tokens');
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Google Calendar connected successfully'
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
    console.error('Error in Google Calendar auth:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Authentication failed',
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