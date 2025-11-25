import { supabase } from './supabase';

export type EventType = 'new_email' | 'new_contact' | 'meeting_scheduled' | 'task_completed' | 'draft_created';

interface NotificationData {
  sender?: string;
  name?: string;
  contact?: string;
  task?: string;
  [key: string]: string | undefined;
}

export async function sendSlackNotification(
  eventType: EventType,
  data: NotificationData = {}
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data: integrations, error: fetchError } = await supabase
      .from('integrations')
      .select('*')
      .eq('user_id', user.id)
      .eq('integration_type', 'slack')
      .eq('is_active', true)
      .eq('push_notifications_enabled', true)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching Slack integration:', fetchError);
      return { success: false, error: 'Failed to fetch integration' };
    }

    if (!integrations) {
      return { success: false, error: 'No active Slack integration with push notifications enabled' };
    }

    const token = integrations.api_key;
    const channel = integrations.additional_config?.channel || '#general';
    const username = integrations.additional_config?.user_name || 'Bot User';

    let message = integrations.event_messages?.[eventType] || integrations.additional_config?.message || 'Notification from app';

    Object.keys(data).forEach(key => {
      if (data[key]) {
        message = message.replace(new RegExp(`\\{${key}\\}`, 'g'), data[key] as string);
      }
    });

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    const response = await fetch(`${supabaseUrl}/functions/v1/send-slack-notification`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
        channel,
        message,
        username,
      }),
    });

    const result = await response.json();

    if (!result.success) {
      console.error('Slack notification failed:', result.error);
      return { success: false, error: result.error };
    }

    return { success: true };
  } catch (error) {
    console.error('Error sending Slack notification:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
