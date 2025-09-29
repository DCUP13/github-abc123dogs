import { createClient } from 'npm:@supabase/supabase-js@2';
import OpenAI from 'npm:openai@4.68.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: Deno.env.get('OPENAI_API_KEY') || ''
});

interface ClientData {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  client_type: 'buyer' | 'seller' | 'renter' | 'landlord';
  status: 'lead' | 'prospect' | 'active' | 'closed' | 'inactive';
  budget_min?: number;
  budget_max?: number;
  preferred_areas?: string[];
  property_type?: string;
  notes?: string;
  source?: string;
}

interface GradingResult {
  overall_score: number;
  financial_score: number;
  motivation_score: number;
  timeline_score: number;
  communication_score: number;
  ai_analysis: string;
  grade_letter: string;
}

function getGradeLetter(score: number): string {
  if (score >= 97) return 'A+';
  if (score >= 93) return 'A';
  if (score >= 90) return 'A-';
  if (score >= 87) return 'B+';
  if (score >= 83) return 'B';
  if (score >= 80) return 'B-';
  if (score >= 77) return 'C+';
  if (score >= 73) return 'C';
  if (score >= 70) return 'C-';
  if (score >= 67) return 'D+';
  if (score >= 63) return 'D';
  if (score >= 60) return 'D-';
  return 'F';
}

function createGradingPrompt(clientData: ClientData): string {
  const clientInfo = `
Client Information:
- Name: ${clientData.first_name} ${clientData.last_name}
- Type: ${clientData.client_type}
- Status: ${clientData.status}
- Email: ${clientData.email || 'Not provided'}
- Phone: ${clientData.phone || 'Not provided'}
- Location: ${[clientData.city, clientData.state].filter(Boolean).join(', ') || 'Not provided'}
- Budget Range: ${clientData.budget_min && clientData.budget_max ? `$${clientData.budget_min.toLocaleString()} - $${clientData.budget_max.toLocaleString()}` : 'Not specified'}
- Property Type: ${clientData.property_type || 'Not specified'}
- Preferred Areas: ${clientData.preferred_areas?.join(', ') || 'Not specified'}
- Source: ${clientData.source || 'Not specified'}
- Notes: ${clientData.notes || 'No additional notes'}
`;

  return `You are a real estate AI assistant that grades potential clients based on their likelihood of success and quality as a client. 

Analyze the following client information and provide scores (1-100) for each category:

${clientInfo}

Please provide your analysis in the following JSON format:
{
  "financial_score": [1-100 score based on budget clarity, realistic expectations, and financial readiness],
  "motivation_score": [1-100 score based on urgency, commitment level, and seriousness],
  "timeline_score": [1-100 score based on realistic timeline expectations and flexibility],
  "communication_score": [1-100 score based on contact information completeness and responsiveness indicators],
  "overall_score": [1-100 overall weighted average score],
  "analysis": "Detailed analysis explaining the scores, strengths, weaknesses, and recommendations for working with this client. Include specific insights about their potential value and any red flags."
}

Scoring Guidelines:
- Financial Score: Consider budget range clarity, realistic market expectations, pre-approval status (if mentioned)
- Motivation Score: Assess urgency, specific requirements, and commitment indicators
- Timeline Score: Evaluate realistic expectations and flexibility
- Communication Score: Rate based on contact info completeness and professional presentation
- Overall Score: Weighted average emphasizing financial and motivation scores

Provide honest, professional assessment that helps prioritize client attention and resources.`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    });
  }

  try {
    // Parse the request body
    const data = await req.json();
    console.log("Received client grading request:", JSON.stringify(data, null, 2));

    const { client_id, user_id, client_data } = data;

    if (!client_id || !user_id || !client_data) {
      throw new Error('Missing required parameters: client_id, user_id, or client_data');
    }

    // Create the grading prompt
    const gradingPrompt = createGradingPrompt(client_data);
    console.log("Generated grading prompt for client:", client_data.first_name, client_data.last_name);

    // Call OpenAI to grade the client
    const openaiResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a professional real estate AI assistant that provides objective client assessments. Always respond with valid JSON format.'
        },
        {
          role: 'user',
          content: gradingPrompt
        }
      ],
      max_tokens: 800,
      temperature: 0.3 // Lower temperature for more consistent scoring
    });

    const openaiResult = openaiResponse.choices[0]?.message?.content || '';
    console.log("OpenAI grading response:", openaiResult);

    // Parse the AI response
    let gradingResult: GradingResult;
    try {
      const parsed = JSON.parse(openaiResult);
      gradingResult = {
        overall_score: Math.max(1, Math.min(100, parsed.overall_score || 50)),
        financial_score: Math.max(1, Math.min(100, parsed.financial_score || 50)),
        motivation_score: Math.max(1, Math.min(100, parsed.motivation_score || 50)),
        timeline_score: Math.max(1, Math.min(100, parsed.timeline_score || 50)),
        communication_score: Math.max(1, Math.min(100, parsed.communication_score || 50)),
        ai_analysis: parsed.analysis || 'Analysis not available',
        grade_letter: getGradeLetter(parsed.overall_score || 50)
      };
    } catch (parseError) {
      console.error('Failed to parse AI response, using fallback scores:', parseError);
      // Fallback scoring if AI response is malformed
      gradingResult = {
        overall_score: 50,
        financial_score: 50,
        motivation_score: 50,
        timeline_score: 50,
        communication_score: 50,
        ai_analysis: 'AI analysis failed to parse. Manual review recommended.',
        grade_letter: 'C'
      };
    }

    // Insert the grading result into the database
    const { data: insertedGrade, error: insertError } = await supabase
      .from('client_grades')
      .insert({
        client_id,
        user_id,
        overall_score: gradingResult.overall_score,
        financial_score: gradingResult.financial_score,
        motivation_score: gradingResult.motivation_score,
        timeline_score: gradingResult.timeline_score,
        communication_score: gradingResult.communication_score,
        ai_analysis: gradingResult.ai_analysis,
        grade_letter: gradingResult.grade_letter,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting client grade:', insertError);
      throw new Error(`Failed to save client grade: ${insertError.message}`);
    }

    console.log("Successfully graded client:", {
      client_id,
      overall_score: gradingResult.overall_score,
      grade_letter: gradingResult.grade_letter
    });

    return new Response(JSON.stringify({
      success: true,
      message: "Client graded successfully",
      client_id,
      grade: gradingResult,
      grade_id: insertedGrade.id
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });

  } catch (error) {
    console.error("Error grading client:", error);
    return new Response(JSON.stringify({
      error: "Failed to grade client",
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