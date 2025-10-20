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

interface EmailData {
  id?: string;
  from: string;
  subject: string;
  body: string;
  received_at: string;
}

interface Client {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  budget_min?: number;
  budget_max?: number;
  preferred_areas?: string[];
  property_type?: string;
  notes?: string;
  client_type: string;
  status: string;
}

async function generateInteractionNotes(emailData: EmailData, client: Client): Promise<string> {
  const prompt = `You are a real estate AI assistant. Analyze the following email from a client and create concise, professional interaction notes for the CRM.

Client Information:
- Name: ${client.first_name} ${client.last_name}
- Type: ${client.client_type}
- Status: ${client.status}
- Budget: ${client.budget_min && client.budget_max ? `$${client.budget_min.toLocaleString()} - $${client.budget_max.toLocaleString()}` : 'Not specified'}
- Property Type: ${client.property_type || 'Not specified'}
- Preferred Areas: ${client.preferred_areas?.join(', ') || 'Not specified'}

Email Details:
- Subject: ${emailData.subject}
- Body: ${emailData.body}

Provide a brief, professional summary (2-4 sentences) of:
1. The main purpose or request in the email
2. Key details or concerns mentioned
3. Any action items or follow-up needed

Write in third person, past tense (e.g., "Client inquired about...", "Expressed interest in...").`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a professional real estate AI assistant that creates concise, actionable CRM notes.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 300,
      temperature: 0.3
    });

    return response.choices[0]?.message?.content || 'Email received from client.';
  } catch (error) {
    console.error('Error generating interaction notes:', error);
    return `Email received: ${emailData.subject || 'No subject'}`;
  }
}

async function callGradeClientFunction(clientId: string, userId: string, clientData: Client) {
  try {
    const gradeUrl = `${supabaseUrl}/functions/v1/grade-client`;
    
    const response = await fetch(gradeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({
        client_id: clientId,
        user_id: userId,
        client_data: clientData
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error calling grade-client function:', errorText);
      throw new Error(`Grade client function failed: ${response.status}`);
    }

    const result = await response.json();
    console.log('Client graded successfully:', result);
    return result;
  } catch (error) {
    console.error('Failed to call grade-client function:', error);
    throw error;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    });
  }

  try {
    const emailData: EmailData = await req.json();
    console.log('Processing email from:', emailData.from);

    const emailMatch = emailData.from.match(/<(.+)>/) || [null, emailData.from];
    const senderEmail = emailMatch[1].toLowerCase().trim();

    console.log('Extracted sender email:', senderEmail);

    const { data: clients, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .ilike('email', senderEmail)
      .limit(1);

    if (clientError) {
      console.error('Error querying clients:', clientError);
      throw new Error(`Database error: ${clientError.message}`);
    }

    if (!clients || clients.length === 0) {
      console.log('No client found with email:', senderEmail);
      return new Response(JSON.stringify({
        success: false,
        message: 'No client found with this email address',
        email: senderEmail
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 404
      });
    }

    const client = clients[0] as Client;
    console.log('Found client:', client.first_name, client.last_name, '(', client.id, ')');

    const notes = await generateInteractionNotes(emailData, client);
    console.log('Generated interaction notes:', notes);

    const { data: interaction, error: interactionError } = await supabase
      .from('client_interactions')
      .insert({
        client_id: client.id,
        user_id: client.user_id,
        interaction_type: 'email',
        subject: emailData.subject || 'Email from client',
        notes: notes,
        interaction_date: emailData.received_at || new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (interactionError) {
      console.error('Error inserting interaction:', interactionError);
      throw new Error(`Failed to save interaction: ${interactionError.message}`);
    }

    console.log('Interaction saved successfully:', interaction.id);

    callGradeClientFunction(client.id, client.user_id, client)
      .then(() => console.log('Client grade updated successfully'))
      .catch(gradeError => console.error('Failed to update client grade:', gradeError));

    fetch(`${supabaseUrl}/functions/v1/track-email-reply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({
        id: emailData.id || crypto.randomUUID(),
        from: emailData.from,
        subject: emailData.subject,
        to: [],
        received_at: emailData.received_at || new Date().toISOString()
      })
    })
      .then(async (response) => {
        if (response.ok) {
          const result = await response.json();
          console.log('Reply tracking result:', result);
        } else {
          console.log('Reply tracking failed (not necessarily an error)');
        }
      })
      .catch(error => console.log('Failed to track reply:', error));

    return new Response(JSON.stringify({
      success: true,
      message: 'Email processed successfully',
      client_id: client.id,
      interaction_id: interaction.id,
      client_name: `${client.first_name} ${client.last_name}`
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });

  } catch (error) {
    console.error('Error processing client email:', error);
    return new Response(JSON.stringify({
      error: 'Failed to process email',
      details: error.message
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
});