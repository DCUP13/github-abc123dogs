import React, { useState, useEffect } from 'react';
import { Plug, Save, Trash2, Eye, EyeOff, Plus, Check, AlertCircle, Bell, Settings, Edit2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Toggle } from './Toggle';

interface Integration {
  id: string;
  integration_type: string;
  integration_name: string;
  api_key: string;
  api_secret: string;
  additional_config: Record<string, any>;
  is_active: boolean;
  push_notifications_enabled: boolean;
  event_messages: Record<string, string>;
  created_at: string;
  updated_at: string;
}

interface EventNotification {
  id: string;
  integration_id: string;
  event_type: string;
  channel: string;
  message: string;
  username: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface IntegrationTemplate {
  type: string;
  name: string;
  description: string;
  icon: string;
  fields: {
    key: string;
    label: string;
    type: 'text' | 'password' | 'textarea';
    placeholder: string;
    required: boolean;
  }[];
}

const INTEGRATION_TEMPLATES: IntegrationTemplate[] = [
  {
    type: 'salesforce',
    name: 'Salesforce',
    description: 'Sync contacts and leads with Salesforce CRM',
    icon: '☁️',
    fields: [
      { key: 'api_key', label: 'Consumer Key', type: 'password', placeholder: 'Enter your Consumer Key', required: true },
      { key: 'api_secret', label: 'Consumer Secret', type: 'password', placeholder: 'Enter your Consumer Secret', required: true },
      { key: 'instance_url', label: 'Instance URL', type: 'text', placeholder: 'https://yourinstance.salesforce.com', required: true },
    ],
  },
  {
    type: 'hubspot',
    name: 'HubSpot',
    description: 'Connect with HubSpot CRM for contact management',
    icon: '🟠',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'Enter your HubSpot API Key', required: true },
    ],
  },
  {
    type: 'monday',
    name: 'Monday.com',
    description: 'Sync tasks and workflows with Monday.com',
    icon: '📅',
    fields: [
      { key: 'api_key', label: 'API Token', type: 'password', placeholder: 'Enter your Monday.com API Token', required: true },
      { key: 'board_id', label: 'Board ID', type: 'text', placeholder: 'Enter your Board ID (optional)', required: false },
    ],
  },
  {
    type: 'slack',
    name: 'Slack',
    description: 'Send notifications and updates to Slack channels',
    icon: '💬',
    fields: [
      { key: 'api_key', label: 'SLACK_BOT_TOKEN', type: 'password', placeholder: 'xoxb-your-bot-token', required: true },
    ],
  },
  {
    type: 'zapier',
    name: 'Zapier',
    description: 'Connect with thousands of apps via Zapier',
    icon: '⚡',
    fields: [
      { key: 'webhook_url', label: 'Webhook URL', type: 'textarea', placeholder: 'https://hooks.zapier.com/hooks/catch/...', required: true },
    ],
  },
  {
    type: 'pipedrive',
    name: 'Pipedrive',
    description: 'Sync deals and contacts with Pipedrive CRM',
    icon: '📊',
    fields: [
      { key: 'api_key', label: 'API Token', type: 'password', placeholder: 'Enter your Pipedrive API Token', required: true },
      { key: 'domain', label: 'Company Domain', type: 'text', placeholder: 'yourcompany.pipedrive.com', required: true },
    ],
  },
  {
    type: 'zoho',
    name: 'Zoho CRM',
    description: 'Integrate with Zoho CRM for contact management',
    icon: '🔶',
    fields: [
      { key: 'client_id', label: 'Client ID', type: 'password', placeholder: 'Enter your Client ID', required: true },
      { key: 'client_secret', label: 'Client Secret', type: 'password', placeholder: 'Enter your Client Secret', required: true },
      { key: 'refresh_token', label: 'Refresh Token', type: 'password', placeholder: 'Enter your Refresh Token', required: true },
    ],
  },
  {
    type: 'discord',
    name: 'Discord',
    description: 'Send notifications to Discord channels',
    icon: '🎮',
    fields: [
      { key: 'webhook_url', label: 'Webhook URL', type: 'textarea', placeholder: 'https://discord.com/api/webhooks/...', required: true },
    ],
  },
  {
    type: 'telegram',
    name: 'Telegram',
    description: 'Send notifications via Telegram bot',
    icon: '✈️',
    fields: [
      { key: 'bot_token', label: 'Bot Token', type: 'password', placeholder: 'Enter your Bot Token', required: true },
      { key: 'chat_id', label: 'Chat ID', type: 'text', placeholder: 'Enter your Chat ID', required: true },
    ],
  },
  {
    type: 'whatsapp',
    name: 'WhatsApp Business',
    description: 'Send notifications via WhatsApp Business API',
    icon: '📱',
    fields: [
      { key: 'phone_number_id', label: 'Phone Number ID', type: 'text', placeholder: 'Enter your Phone Number ID', required: true },
      { key: 'api_key', label: 'Access Token', type: 'password', placeholder: 'Enter your WhatsApp Business Access Token', required: true },
    ],
  },
  {
    type: 'twilio',
    name: 'Twilio SMS',
    description: 'Send SMS notifications via Twilio',
    icon: '📲',
    fields: [
      { key: 'account_sid', label: 'Account SID', type: 'password', placeholder: 'Enter your Account SID', required: true },
      { key: 'auth_token', label: 'Auth Token', type: 'password', placeholder: 'Enter your Auth Token', required: true },
      { key: 'from_number', label: 'From Phone Number', type: 'text', placeholder: '+1234567890', required: true },
    ],
  },
  {
    type: 'teams',
    name: 'Microsoft Teams',
    description: 'Post notifications to Microsoft Teams channels',
    icon: '🟦',
    fields: [
      { key: 'webhook_url', label: 'Webhook URL', type: 'textarea', placeholder: 'https://outlook.office.com/webhook/...', required: true },
    ],
  },
  {
    type: 'pushover',
    name: 'Pushover',
    description: 'Send push notifications to iOS and Android devices',
    icon: '🔔',
    fields: [
      { key: 'user_key', label: 'User Key', type: 'password', placeholder: 'Enter your User Key', required: true },
      { key: 'api_key', label: 'API Token', type: 'password', placeholder: 'Enter your API Token', required: true },
    ],
  },
  {
    type: 'pushbullet',
    name: 'Pushbullet',
    description: 'Send notifications across all your devices',
    icon: '📤',
    fields: [
      { key: 'api_key', label: 'Access Token', type: 'password', placeholder: 'Enter your Access Token', required: true },
    ],
  },
  {
    type: 'email_webhook',
    name: 'Email Webhook',
    description: 'Send notifications to any email webhook endpoint',
    icon: '📧',
    fields: [
      { key: 'webhook_url', label: 'Webhook URL', type: 'textarea', placeholder: 'https://your-webhook-url.com', required: true },
      { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'Enter API Key (optional)', required: false },
    ],
  },
  {
    type: 'webhook',
    name: 'Custom Webhook',
    description: 'Send notifications to any custom webhook endpoint',
    icon: '🔗',
    fields: [
      { key: 'webhook_url', label: 'Webhook URL', type: 'textarea', placeholder: 'https://your-webhook-url.com', required: true },
      { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'Enter API Key (optional)', required: false },
      { key: 'headers', label: 'Custom Headers (JSON)', type: 'textarea', placeholder: '{"Authorization": "Bearer token"}', required: false },
    ],
  },
  {
    type: 'pagerduty',
    name: 'PagerDuty',
    description: 'Send alerts and incidents to PagerDuty',
    icon: '🚨',
    fields: [
      { key: 'integration_key', label: 'Integration Key', type: 'password', placeholder: 'Enter your Integration Key', required: true },
    ],
  },
  {
    type: 'signal',
    name: 'Signal',
    description: 'Send encrypted notifications via Signal messenger',
    icon: '🔐',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'Enter your Signal API Key', required: true },
      { key: 'phone_number', label: 'Phone Number', type: 'text', placeholder: '+1234567890', required: true },
    ],
  },
  {
    type: 'matrix',
    name: 'Matrix',
    description: 'Send messages to Matrix rooms',
    icon: '🟢',
    fields: [
      { key: 'homeserver', label: 'Homeserver URL', type: 'text', placeholder: 'https://matrix.org', required: true },
      { key: 'api_key', label: 'Access Token', type: 'password', placeholder: 'Enter your Access Token', required: true },
      { key: 'room_id', label: 'Room ID', type: 'text', placeholder: '!roomid:matrix.org', required: true },
    ],
  },
];

interface IntegrationsProps {
  onSignOut: () => void;
  currentView: string;
}

const EVENT_TYPES = [
  { key: 'new_email', label: 'New Email Received', defaultMessage: 'New email received from {sender}' },
  { key: 'new_contact', label: 'New Contact Added', defaultMessage: 'New contact added: {name}' },
  { key: 'meeting_scheduled', label: 'Meeting Scheduled', defaultMessage: 'Meeting scheduled with {contact}' },
  { key: 'task_completed', label: 'Task Completed', defaultMessage: 'Task completed: {task}' },
  { key: 'draft_created', label: 'Draft Created', defaultMessage: 'New draft created' },
];

export function Integrations({ onSignOut, currentView }: IntegrationsProps) {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [eventNotifications, setEventNotifications] = useState<EventNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<EventNotification | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<IntegrationTemplate | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [eventFormData, setEventFormData] = useState({
    event_type: '',
    channel: '',
    message: '',
    username: 'Bot User',
  });
  const [visibleFields, setVisibleFields] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadIntegrations();
    loadEventNotifications();
  }, []);

  const loadIntegrations = async () => {
    try {
      const { data, error } = await supabase
        .from('integrations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setIntegrations(data || []);
    } catch (error) {
      console.error('Error loading integrations:', error);
      setError('Failed to load integrations');
    } finally {
      setIsLoading(false);
    }
  };

  const loadEventNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('event_notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEventNotifications(data || []);
    } catch (error) {
      console.error('Error loading event notifications:', error);
    }
  };

  const handleAddIntegration = (template: IntegrationTemplate) => {
    setSelectedTemplate(template);
    setFormData({});
    setVisibleFields({});
    setShowAddModal(true);
    setError(null);
    setSuccess(null);
  };

  const handleSaveIntegration = async () => {
    if (!selectedTemplate) return;

    const requiredFields = selectedTemplate.fields.filter(f => f.required);
    const missingFields = requiredFields.filter(f => !formData[f.key]?.trim());

    if (missingFields.length > 0) {
      setError(`Please fill in all required fields: ${missingFields.map(f => f.label).join(', ')}`);
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const additionalConfig: Record<string, string> = {};
      const integrationData: any = {
        user_id: user.id,
        integration_type: selectedTemplate.type,
        integration_name: selectedTemplate.name,
        is_active: true,
      };

      selectedTemplate.fields.forEach(field => {
        const value = formData[field.key] || '';
        if (field.key === 'api_key') {
          integrationData.api_key = value;
        } else if (field.key === 'api_secret' || field.key === 'client_secret') {
          integrationData.api_secret = value;
        } else {
          additionalConfig[field.key] = value;
        }
      });

      integrationData.additional_config = additionalConfig;

      const { error } = await supabase
        .from('integrations')
        .insert(integrationData);

      if (error) throw error;

      setSuccess('Integration added successfully!');
      setShowAddModal(false);
      await loadIntegrations();

      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Error saving integration:', error);
      setError('Failed to save integration');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteIntegration = async (id: string) => {
    if (!confirm('Are you sure you want to delete this integration?')) return;

    try {
      const { error } = await supabase
        .from('integrations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setSuccess('Integration deleted successfully!');
      await loadIntegrations();

      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Error deleting integration:', error);
      setError('Failed to delete integration');
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('integrations')
        .update({ is_active: !currentStatus, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      await loadIntegrations();
    } catch (error) {
      console.error('Error toggling integration:', error);
      setError('Failed to update integration');
    }
  };

  const toggleFieldVisibility = (fieldKey: string) => {
    setVisibleFields(prev => ({
      ...prev,
      [fieldKey]: !prev[fieldKey],
    }));
  };

  const handleTogglePushNotifications = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('integrations')
        .update({ push_notifications_enabled: !currentStatus, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      await loadIntegrations();
      setSuccess(`Push notifications ${!currentStatus ? 'enabled' : 'disabled'}`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Error toggling push notifications:', error);
      setError('Failed to update push notifications');
    }
  };

  const handleAddEvent = (integration: Integration) => {
    setSelectedIntegration(integration);
    setSelectedEvent(null);
    setEventFormData({
      event_type: '',
      channel: '',
      message: '',
      username: 'Bot User',
    });
    setShowEventDialog(true);
    setError(null);
    setSuccess(null);
  };

  const handleEditEvent = (event: EventNotification) => {
    const integration = integrations.find(i => i.id === event.integration_id);
    if (integration) {
      setSelectedIntegration(integration);
      setSelectedEvent(event);
      setEventFormData({
        event_type: event.event_type,
        channel: event.channel,
        message: event.message,
        username: event.username,
      });
      setShowEventDialog(true);
      setError(null);
      setSuccess(null);
    }
  };

  const handleSaveEvent = async () => {
    if (!selectedIntegration) return;

    if (!eventFormData.event_type || !eventFormData.channel || !eventFormData.message) {
      setError('Please fill in all required fields');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (selectedEvent) {
        const { error } = await supabase
          .from('event_notifications')
          .update({
            event_type: eventFormData.event_type,
            channel: eventFormData.channel,
            message: eventFormData.message,
            username: eventFormData.username,
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedEvent.id);

        if (error) throw error;
        setSuccess('Event updated successfully!');
      } else {
        const { error } = await supabase
          .from('event_notifications')
          .insert({
            user_id: user.id,
            integration_id: selectedIntegration.id,
            event_type: eventFormData.event_type,
            channel: eventFormData.channel,
            message: eventFormData.message,
            username: eventFormData.username,
          });

        if (error) throw error;
        setSuccess('Event added successfully!');
      }

      setShowEventDialog(false);
      await loadEventNotifications();

      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Error saving event:', error);
      setError('Failed to save event');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;

    try {
      const { error } = await supabase
        .from('event_notifications')
        .delete()
        .eq('id', eventId);

      if (error) throw error;

      setSuccess('Event deleted successfully!');
      await loadEventNotifications();

      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Error deleting event:', error);
      setError('Failed to delete event');
    }
  };

  const handleToggleEventActive = async (eventId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('event_notifications')
        .update({ is_active: !currentStatus, updated_at: new Date().toISOString() })
        .eq('id', eventId);

      if (error) throw error;

      await loadEventNotifications();
    } catch (error) {
      console.error('Error toggling event:', error);
      setError('Failed to update event');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <Plug className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Integrations</h1>
            </div>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Connect with your favorite tools and platforms
          </p>
        </div>

        {(error || success) && (
          <div className={`mb-6 p-4 rounded-lg flex items-start gap-3 ${
            error
              ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
              : 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
          }`}>
            {error ? (
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            ) : (
              <Check className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            )}
            <p className={error ? 'text-red-700 dark:text-red-300' : 'text-green-700 dark:text-green-300'}>
              {error || success}
            </p>
          </div>
        )}

        {integrations.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Active Integrations</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {integrations.map(integration => {
                const template = INTEGRATION_TEMPLATES.find(t => t.type === integration.integration_type);
                return (
                  <div key={integration.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{template?.icon || '🔌'}</span>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">{integration.integration_name}</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{template?.description}</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Toggle
                          checked={integration.is_active}
                          onChange={() => handleToggleActive(integration.id, integration.is_active)}
                          label={integration.is_active ? 'Active' : 'Inactive'}
                        />
                        <button
                          onClick={() => handleDeleteIntegration(integration.id)}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {integration.integration_type === 'slack' && (
                        <>
                          <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <Bell className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                  Push Notifications
                                </span>
                              </div>
                              <Toggle
                                checked={integration.push_notifications_enabled || false}
                                onChange={() => handleTogglePushNotifications(integration.id, integration.push_notifications_enabled || false)}
                              />
                            </div>
                            {integration.push_notifications_enabled && (
                              <>
                                <button
                                  onClick={() => handleAddEvent(integration)}
                                  className="w-full px-3 py-2 text-sm bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors flex items-center justify-center gap-2 mb-3"
                                >
                                  <Plus className="w-4 h-4" />
                                  Add Event
                                </button>
                                {eventNotifications
                                  .filter(e => e.integration_id === integration.id)
                                  .map(event => {
                                    const eventType = EVENT_TYPES.find(t => t.key === event.event_type);
                                    return (
                                      <div key={event.id} className="mb-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                        <div className="flex items-center justify-between mb-1">
                                          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                            {eventType?.label || event.event_type}
                                          </span>
                                          <div className="flex items-center gap-1">
                                            <Toggle
                                              checked={event.is_active}
                                              onChange={() => handleToggleEventActive(event.id, event.is_active)}
                                            />
                                            <button
                                              onClick={() => handleEditEvent(event)}
                                              className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                                            >
                                              <Edit2 className="w-3 h-3" />
                                            </button>
                                            <button
                                              onClick={() => handleDeleteEvent(event.id)}
                                              className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                            >
                                              <Trash2 className="w-3 h-3" />
                                            </button>
                                          </div>
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                          {event.channel}
                                        </p>
                                      </div>
                                    );
                                  })}
                              </>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Available Integrations</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {INTEGRATION_TEMPLATES.map(template => {
              const isConnected = integrations.some(i => i.integration_type === template.type);
              return (
                <div key={template.type} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-4 mb-4">
                    <span className="text-4xl">{template.icon}</span>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{template.name}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{template.description}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleAddIntegration(template)}
                    disabled={isConnected}
                    className={`w-full px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                      isConnected
                        ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {isConnected ? (
                      <>
                        <Check className="w-4 h-4" />
                        Connected
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        Connect
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {showAddModal && selectedTemplate && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-3xl">{selectedTemplate.icon}</span>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Connect {selectedTemplate.name}</h2>
                </div>
                <p className="text-gray-600 dark:text-gray-400">{selectedTemplate.description}</p>
              </div>

              <div className="p-6 space-y-4">
                {selectedTemplate.fields.map(field => (
                  <div key={field.key}>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {field.label} {field.required && <span className="text-red-500">*</span>}
                    </label>
                    <div className="relative">
                      {field.type === 'textarea' ? (
                        <textarea
                          value={formData[field.key] || ''}
                          onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                          placeholder={field.placeholder}
                          rows={3}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent dark:bg-gray-700 dark:text-white resize-none"
                        />
                      ) : (
                        <>
                          <input
                            type={field.type === 'password' && !visibleFields[field.key] ? 'password' : 'text'}
                            value={formData[field.key] || ''}
                            onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                            placeholder={field.placeholder}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent dark:bg-gray-700 dark:text-white pr-10"
                          />
                          {field.type === 'password' && (
                            <button
                              type="button"
                              onClick={() => toggleFieldVisibility(field.key)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            >
                              {visibleFields[field.key] ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveIntegration}
                  disabled={isSaving}
                  className="flex-1 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      Connect Integration
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {showEventDialog && selectedIntegration && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3 mb-2">
                  <Bell className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {selectedEvent ? 'Edit Event' : 'Add Event'}
                  </h2>
                </div>
                <p className="text-gray-600 dark:text-gray-400">
                  Configure a Slack notification for a specific event. Use placeholders like {'{sender}'}, {'{name}'}, {'{contact}'}, or {'{task}'} in your message.
                </p>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Event Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={eventFormData.event_type}
                    onChange={(e) => setEventFormData({ ...eventFormData, event_type: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Select an event type</option>
                    {EVENT_TYPES.map(event => (
                      <option key={event.key} value={event.key}>
                        {event.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Channel <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={eventFormData.channel}
                    onChange={(e) => setEventFormData({ ...eventFormData, channel: e.target.value })}
                    placeholder="#general"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Message <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={eventFormData.message}
                    onChange={(e) => setEventFormData({ ...eventFormData, message: e.target.value })}
                    placeholder={EVENT_TYPES.find(e => e.key === eventFormData.event_type)?.defaultMessage || 'Enter your message'}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent dark:bg-gray-700 dark:text-white resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Username (Bot Display Name)
                  </label>
                  <input
                    type="text"
                    value={eventFormData.username}
                    onChange={(e) => setEventFormData({ ...eventFormData, username: e.target.value })}
                    placeholder="Bot User"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3">
                <button
                  onClick={() => setShowEventDialog(false)}
                  className="flex-1 px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEvent}
                  disabled={isSaving}
                  className="flex-1 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      {selectedEvent ? 'Update Event' : 'Add Event'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
