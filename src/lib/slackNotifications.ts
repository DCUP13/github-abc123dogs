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

    const { data: integration, error: integrationError } = await supabase
      .from('integrations')
      .select('*')
      .eq('user_id', user.id)
      .eq('integration_type', 'slack')
      .eq('is_active', true)
      .eq('push_notifications_enabled', true)
      .maybeSingle();

    if (integrationError) {
      console.error('Error fetching Slack integration:', integrationError);
      return { success: false, error: 'Failed to fetch integration' };
    }

    if (!integration) {
      return { success: false, error: 'No active Slack integration with push notifications enabled' };
    }

    const { data: eventNotifications, error: eventError } = await supabase
      .from('event_notifications')
      .select('*')
      .eq('integration_id', integration.id)
      .eq('event_type', eventType)
      .eq('is_active', true);

    if (eventError) {
      console.error('Error fetching event notifications:', eventError);
      return { success: false, error: 'Failed to fetch event configuration' };
    }

    if (!eventNotifications || eventNotifications.length === 0) {
      return { success: false, error: `No active event configuration for ${eventType}` };
    }

    const token = integration.api_key;
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    const results = await Promise.all(
      eventNotifications.map(async (event) => {
        let message = event.message;

        Object.keys(data).forEach(key => {
          if (data[key]) {
            message = message.replace(new RegExp(`\\{${key}\\}`, 'g'), data[key] as string);
          }
        });

        const response = await fetch(`${supabaseUrl}/functions/v1/send-slack-notification`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token,
            channel: event.channel,
            message,
            username: event.username,
          }),
        });

        return response.json();
      })
    );

    const failed = results.filter(r => !r.success);
    if (failed.length > 0) {
      console.error('Some Slack notifications failed:', failed);
      return { success: false, error: `${failed.length} notification(s) failed` };
    }

    return { success: true };
  } catch (error) {
    console.error('Error sending Slack notification:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
