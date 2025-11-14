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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { data: tokenData, error: tokenError } = await supabase
      .from('google_calendar_tokens')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (tokenError || !tokenData) {
      throw new Error('No Google Calendar connection found');
    }

    let accessToken = tokenData.access_token;

    const tokenExpiry = new Date(tokenData.token_expiry);
    const now = new Date();

    if (tokenExpiry <= now && tokenData.refresh_token) {
      const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
      const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

      const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: tokenData.refresh_token,
          grant_type: 'refresh_token',
        }),
      });

      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json();
        accessToken = refreshData.access_token;

        const newExpiry = new Date();
        newExpiry.setSeconds(newExpiry.getSeconds() + refreshData.expires_in);

        await supabase
          .from('google_calendar_tokens')
          .update({
            access_token: accessToken,
            token_expiry: newExpiry.toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id);
      }
    }

    const timeMin = new Date();
    timeMin.setMonth(timeMin.getMonth() - 1);
    const timeMax = new Date();
    timeMax.setMonth(timeMax.getMonth() + 3);

    const calendarResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${tokenData.calendar_id}/events?timeMin=${timeMin.toISOString()}&timeMax=${timeMax.toISOString()}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!calendarResponse.ok) {
      const errorText = await calendarResponse.text();
      console.error('Google Calendar API error:', errorText);
      throw new Error('Failed to fetch events from Google Calendar');
    }

    const calendarData = await calendarResponse.json();
    const googleEvents = calendarData.items || [];

    const eventsToInsert = googleEvents.map((event: any) => ({
      user_id: user.id,
      title: event.summary || 'Untitled Event',
      description: event.description || null,
      start_time: event.start.dateTime || event.start.date,
      end_time: event.end.dateTime || event.end.date,
      all_day: !event.start.dateTime,
      location: event.location || null,
      color: '#3b82f6',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    if (eventsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('calendar_events')
        .insert(eventsToInsert);

      if (insertError) {
        console.error('Error inserting events:', insertError);
        throw new Error(`Failed to insert events: ${insertError.message}`);
      }
    }

    await supabase
      .from('google_calendar_tokens')
      .update({
        last_sync: new Date().toISOString()
      })
      .eq('user_id', user.id);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Synced ${eventsToInsert.length} events from Google Calendar`,
        count: eventsToInsert.length
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
    console.error('Error syncing with Google Calendar:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Sync failed',
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