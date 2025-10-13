import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Toggle } from './Toggle';

export function AutoresponderTab() {
  const [domainSettings, setDomainSettings] = useState<Record<string, { autoresponderEnabled: boolean }>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDomainSettings();
  }, []);

  const fetchDomainSettings = async () => {
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) {
        throw new Error('User not authenticated');
      }

      const { data: domains, error } = await supabase
        .from('amazon_ses_domains')
        .select('domain, autoresponder_enabled')
        .eq('user_id', user.data.user.id);

      if (error) throw error;

      if (domains) {
        const settings = domains.reduce((acc, domain) => {
          acc[domain.domain] = {
            autoresponderEnabled: domain.autoresponder_enabled || false
          };
          return acc;
        }, {} as Record<string, { autoresponderEnabled: boolean }>);

        setDomainSettings(settings);
      }
    } catch (error) {
      console.error('Error fetching domain settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleAutoresponder = async (domain: string, enabled: boolean) => {
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) {
        throw new Error('User not authenticated');
      }

      const { error } = await supabase
        .from('amazon_ses_domains')
        .update({
          autoresponder_enabled: enabled,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.data.user.id)
        .eq('domain', domain);

      if (error) throw error;

      setDomainSettings(prev => ({
        ...prev,
        [domain]: { autoresponderEnabled: enabled }
      }));
    } catch (error) {
      console.error('Error updating autoresponder setting:', error);
      alert('Failed to update autoresponder setting. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const domains = Object.keys(domainSettings);

  if (domains.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 dark:text-gray-400">
          No domains configured. Add domains in the Amazon SES tab to enable autoresponder.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Autoresponder Settings</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Enable or disable autoresponder for each configured domain. When enabled, the system will automatically respond to incoming emails.
        </p>
      </div>

      <div className="space-y-4">
        {domains.map((domain) => (
          <div
            key={domain}
            className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
          >
            <div className="flex-1">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                {domain}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {domainSettings[domain]?.autoresponderEnabled
                  ? 'Autoresponder is active for this domain'
                  : 'Autoresponder is inactive for this domain'}
              </p>
            </div>
            <Toggle
              checked={domainSettings[domain]?.autoresponderEnabled || false}
              onChange={() => handleToggleAutoresponder(domain, !domainSettings[domain]?.autoresponderEnabled)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
