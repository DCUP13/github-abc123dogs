const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

Deno.serve(async (req: Request) => {
  console.log("🚀 AUTORESPONDER FUNCTION CALLED!")
  console.log("📅 Timestamp:", new Date().toISOString())
  console.log("🔗 Request URL:", req.url)
  console.log("📝 Request method:", req.method)
  
  if (req.method === "OPTIONS") {
    console.log("✅ Handling CORS preflight request")
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    console.log("📦 Reading request body...")
    const body = await req.text()
    console.log("📄 Raw request body:", body)
    
    let parsedBody
    try {
      parsedBody = JSON.parse(body)
      console.log("✅ Parsed JSON body:", parsedBody)
    } catch (parseError) {
      console.log("⚠️ Failed to parse JSON, using raw body")
      parsedBody = { rawBody: body }
    }

    console.log("🎉 AUTORESPONDER FUNCTION EXECUTED SUCCESSFULLY!")
    console.log("📊 Request processed at:", new Date().toISOString())

    const response = {
      success: true,
      message: "Autoresponder function called successfully!",
      timestamp: new Date().toISOString(),
      receivedData: parsedBody
    }

    console.log("📤 Sending response:", response)

    return new Response(
      JSON.stringify(response),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 200
      }
    );

  } catch (error) {
    console.error("💥 ERROR in autoresponder function:", error)
    console.error("📍 Error details:", error.message)
    console.error("🔍 Error stack:", error.stack)

    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    )
  }
});