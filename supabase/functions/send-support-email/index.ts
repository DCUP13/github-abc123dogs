import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SupportRequest {
  name: string;
  subject: string;
  message: string;
  userEmail: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      throw new Error("Method not allowed");
    }

    const { name, subject, message, userEmail }: SupportRequest = await req.json();

    if (!name || !subject || !message) {
      throw new Error("Missing required fields");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Persist the request first so it's never lost regardless of email delivery
    await supabase.from("support_requests").insert({
      name,
      subject,
      message,
      user_email: userEmail,
    });

    const { data: sesSettings, error: sesError } = await supabase
      .from("amazon_ses_settings")
      .select("smtp_server, smtp_port, smtp_username, smtp_password, noreply_domain")
      .limit(1)
      .single();

    if (sesError || !sesSettings) {
      // Request is already saved; return success even without email
      console.warn("Email provider not configured — request saved to database only");
      return new Response(
        JSON.stringify({ success: true, message: "Support request saved successfully" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const fromEmail = `noreply@${sesSettings.noreply_domain}`;
    const toEmail = "support@loireply.com";
    const fullSubject = `Support Request: ${subject}`;

    const htmlBody = `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px; }
    .field { margin-bottom: 20px; }
    .label { font-weight: bold; color: #1f2937; margin-bottom: 5px; }
    .value { background-color: white; padding: 12px; border-radius: 6px; border: 1px solid #d1d5db; }
    .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2 style="margin: 0;">New Support Request</h2>
    </div>
    <div class="content">
      <div class="field">
        <div class="label">From:</div>
        <div class="value">${name}</div>
      </div>
      <div class="field">
        <div class="label">User Email:</div>
        <div class="value">${userEmail}</div>
      </div>
      <div class="field">
        <div class="label">Subject:</div>
        <div class="value">${subject}</div>
      </div>
      <div class="field">
        <div class="label">Message:</div>
        <div class="value">${message.replace(/\n/g, "<br>")}</div>
      </div>
      <div class="footer">
        This message was sent from the LoiReply support form.
      </div>
    </div>
  </div>
</body>
</html>`;

    await sendViaSmtp({
      from: fromEmail,
      to: toEmail,
      replyTo: userEmail,
      subject: fullSubject,
      htmlBody,
      smtpServer: sesSettings.smtp_server,
      smtpPort: parseInt(sesSettings.smtp_port),
      smtpUsername: sesSettings.smtp_username,
      smtpPassword: sesSettings.smtp_password,
    });

    return new Response(
      JSON.stringify({ success: true, message: "Support request sent successfully" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-support-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function sendViaSmtp(opts: {
  from: string;
  to: string;
  replyTo: string;
  subject: string;
  htmlBody: string;
  smtpServer: string;
  smtpPort: number;
  smtpUsername: string;
  smtpPassword: string;
}) {
  const encoder = new TextEncoder();
  const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const emailContent = [
    `From: ${opts.from}`,
    `To: ${opts.to}`,
    `Reply-To: ${opts.replyTo}`,
    `Subject: ${opts.subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/html; charset=UTF-8`,
    `Content-Transfer-Encoding: 7bit`,
    ``,
    opts.htmlBody,
    `--${boundary}--`,
  ].join("\r\n");

  let conn: Deno.TcpConn | Deno.TlsConn;
  let activeConn: Deno.TcpConn | Deno.TlsConn;

  if (opts.smtpPort === 465) {
    conn = await Deno.connectTls({ hostname: opts.smtpServer, port: opts.smtpPort });
    activeConn = conn;
  } else {
    conn = await Deno.connect({ hostname: opts.smtpServer, port: opts.smtpPort, transport: "tcp" });
    activeConn = conn;
  }

  try {
    let reader = activeConn.readable.getReader();
    let writer = activeConn.writable.getWriter();

    await readSmtpResponse(reader);

    await writer.write(encoder.encode(`EHLO ${opts.smtpServer}\r\n`));
    await readSmtpResponse(reader);

    if (opts.smtpPort === 587 || opts.smtpPort === 25) {
      await writer.write(encoder.encode(`STARTTLS\r\n`));
      await readSmtpResponse(reader);

      reader.releaseLock();
      writer.releaseLock();

      const tlsConn = await Deno.startTls(conn as Deno.TcpConn, { hostname: opts.smtpServer });
      activeConn = tlsConn;

      reader = activeConn.readable.getReader();
      writer = activeConn.writable.getWriter();

      await writer.write(encoder.encode(`EHLO ${opts.smtpServer}\r\n`));
      await readSmtpResponse(reader);
    }

    await writer.write(encoder.encode(`AUTH LOGIN\r\n`));
    await readSmtpResponse(reader);

    await writer.write(encoder.encode(`${btoa(opts.smtpUsername)}\r\n`));
    await readSmtpResponse(reader);

    await writer.write(encoder.encode(`${btoa(opts.smtpPassword)}\r\n`));
    await readSmtpResponse(reader);

    await writer.write(encoder.encode(`MAIL FROM:<${opts.from}>\r\n`));
    await readSmtpResponse(reader);

    await writer.write(encoder.encode(`RCPT TO:<${opts.to}>\r\n`));
    await readSmtpResponse(reader);

    await writer.write(encoder.encode(`DATA\r\n`));
    await readSmtpResponse(reader);

    await writer.write(encoder.encode(emailContent + "\r\n.\r\n"));
    await readSmtpResponse(reader);

    await writer.write(encoder.encode(`QUIT\r\n`));
    await readSmtpResponse(reader);

    reader.releaseLock();
    writer.releaseLock();

    console.log(`Support email sent successfully to ${opts.to}`);
  } finally {
    try { activeConn.close(); } catch (_) { /* ignore */ }
  }
}

async function readSmtpResponse(reader: ReadableStreamDefaultReader<Uint8Array>): Promise<string> {
  const decoder = new TextDecoder();
  const { value, done } = await reader.read();

  if (done) throw new Error("SMTP connection closed unexpectedly");

  const response = decoder.decode(value);
  console.log("SMTP Response:", response.trim());

  if (response.startsWith("4") || response.startsWith("5")) {
    throw new Error(`SMTP Error: ${response.trim()}`);
  }

  return response;
}
