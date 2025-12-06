import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey"
};

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

function generateTemporaryPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    });
  }

  try {
    const { email, organization_id, invited_by, role = 'member' } = await req.json();

    if (!email || !organization_id || !invited_by) {
      return new Response(JSON.stringify({
        error: 'Missing required fields'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 400
      });
    }

    if (!['member', 'manager', 'owner'].includes(role)) {
      return new Response(JSON.stringify({
        error: 'Invalid role specified'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 400
      });
    }

    const { data: inviterMember } = await supabase
      .from('organization_members')
      .select('role')
      .eq('user_id', invited_by)
      .eq('organization_id', organization_id)
      .maybeSingle();

    if (!inviterMember || !['owner', 'manager'].includes(inviterMember.role)) {
      return new Response(JSON.stringify({
        error: 'You do not have permission to invite members'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 403
      });
    }

    const { data: existingUser } = await supabase.auth.admin.listUsers();
    const userExists = existingUser.users.find(u => u.email === email);

    if (userExists) {
      const { data: existingMember } = await supabase
        .from('organization_members')
        .select('id')
        .eq('user_id', userExists.id)
        .eq('organization_id', organization_id)
        .maybeSingle();

      if (existingMember) {
        return new Response(JSON.stringify({
          error: 'This user is already a member of your organization'
        }), {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          },
          status: 400
        });
      }
    }

    const temporaryPassword = generateTemporaryPassword();

    const { data: invitation, error: inviteError } = await supabase
      .from('member_invitations')
      .insert({
        organization_id,
        email,
        temporary_password: temporaryPassword,
        invited_by,
        role,
        status: 'pending',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      })
      .select()
      .single();

    if (inviteError) throw inviteError;

    const { data: orgData } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', organization_id)
      .single();

    const organizationName = orgData?.name || 'the organization';

    const { data: sesSettings } = await supabase
      .from('amazon_ses_settings')
      .select('*')
      .eq('user_id', invited_by)
      .maybeSingle();

    const { data: domainData } = await supabase
      .from('email_domains')
      .select('domain')
      .eq('user_id', invited_by)
      .maybeSingle();

    const fromEmail = domainData ? `noreply@${domainData.domain}` : 'noreply@example.com';

    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Team Invitation</h2>
        <p>You've been invited to join <strong>${organizationName}</strong> as a <strong>${role}</strong>!</p>

        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0 0 10px 0;"><strong>Login Details:</strong></p>
          <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
          <p style="margin: 5px 0;"><strong>Temporary Password:</strong> <code style="background-color: #e5e7eb; padding: 4px 8px; border-radius: 4px;">${temporaryPassword}</code></p>
          <p style="margin: 5px 0;"><strong>Role:</strong> ${role.charAt(0).toUpperCase() + role.slice(1)}</p>
        </div>

        <p>To get started:</p>
        <ol>
          <li>Go to the login page</li>
          <li>Select "<strong>${role === 'manager' ? 'Manager' : 'Member'}</strong>" as your login type</li>
          <li>Use the email and temporary password above</li>
          <li>You'll be prompted to change your password after first login</li>
        </ol>

        ${role === 'manager' ? '<p style="background-color: #dbeafe; padding: 12px; border-radius: 6px; border-left: 4px solid #2563eb;"><strong>Note:</strong> As a manager, you can log in to both the Manager view and Member view.</p>' : ''}

        <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
          This invitation will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.
        </p>
      </div>
    `;

    await supabase
      .from('email_outbox')
      .insert({
        user_id: invited_by,
        to_email: email,
        from_email: fromEmail,
        subject: `You've been invited to join ${organizationName}`,
        body: emailBody,
        status: 'pending'
      });

    if (sesSettings) {
      try {
        await fetch(`${supabaseUrl}/functions/v1/send-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`
          }
        });
      } catch (error) {
        console.error('Failed to trigger email sending:', error);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Invitation sent successfully',
      invitation_id: invitation.id
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });

  } catch (error) {
    console.error('Error inviting team member:', error);
    return new Response(JSON.stringify({
      error: 'Failed to send invitation',
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