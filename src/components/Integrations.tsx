import React, { useState, useEffect } from 'react';
import { Plug, Save, Trash2, Eye, EyeOff, Plus, Check, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Integration {
  id: string;
  integration_type: string;
  integration_name: string;
  api_key: string;
  api_secret: string;
  additional_config: Record<string, any>;
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
    type: 'slack',
    name: 'Slack',
    description: 'Send notifications and updates to Slack channels',
    icon: '💬',
    fields: [
      { key: 'webhook_url', label: 'Webhook URL', type: 'textarea', placeholder: 'https://hooks.slack.com/services/...', required: true },
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
];

interface IntegrationsProps {
  onSignOut: () => void;
  currentView: string;
}

export function Integrations({ onSignOut, currentView }: IntegrationsProps) {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<IntegrationTemplate | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [visibleFields, setVisibleFields] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadIntegrations();
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
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={integration.is_active}
                          onChange={() => handleToggleActive(integration.id, integration.is_active)}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {integration.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </label>
                      <button
                        onClick={() => handleDeleteIntegration(integration.id)}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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
      </div>
    </div>
  );
}
