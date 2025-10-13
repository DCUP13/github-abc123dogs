import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Toggle } from './Toggle';
import { Mail } from 'lucide-react';

export function AutoresponderTab() {
  const [domainSettings, setDomainSettings] = useState<Record<string, { autoresponderEnabled: boolean }>>({});
  const [emailSettings, setEmailSettings] = useState<Record<string, { autoresponderEnabled: boolean }>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) {
        throw new Error('User not authenticated');
      }

      const [domainsResult, emailsResult] = await Promise.all([
        supabase
          .from('amazon_ses_domains')
          .select('domain, autoresponder_enabled')
          .eq('user_id', user.data.user.id),
        supabase
          .from('amazon_ses_emails')
          .select('address, autoresponder_enabled')
          .eq('user_id', user.data.user.id)
      ]);

      if (domainsResult.error) throw domainsResult.error;
      if (emailsResult.error) throw emailsResult.error;

      if (domainsResult.data) {
        const settings = domainsResult.data.reduce((acc, domain) => {
          acc[domain.domain] = {
            autoresponderEnabled: domain.autoresponder_enabled || false
          };
          return acc;
        }, {} as Record<string, { autoresponderEnabled: boolean }>);

        setDomainSettings(settings);
      }

      if (emailsResult.data) {
        const settings = emailsResult.data.reduce((acc, email) => {
          acc[email.address] = {
            autoresponderEnabled: email.autoresponder_enabled || false
          };
          return acc;
        }, {} as Record<string, { autoresponderEnabled: boolean }>);

        setEmailSettings(settings);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleDomainAutoresponder = async (domain: string, enabled: boolean) => {
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

  const handleToggleEmailAutoresponder = async (email: string, enabled: boolean) => {
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) {
        throw new Error('User not authenticated');
      }

      const { error } = await supabase
        .from('amazon_ses_emails')
        .update({
          autoresponder_enabled: enabled,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.data.user.id)
        .eq('address', email);

      if (error) throw error;

      setEmailSettings(prev => ({
        ...prev,
        [email]: { autoresponderEnabled: enabled }
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
  const emails = Object.keys(emailSettings);

  if (domains.length === 0 && emails.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 dark:text-gray-400">
          No domains or emails configured. Add domains and sender emails in the Amazon SES tab to enable autoresponder.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Autoresponder Settings</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Enable or disable autoresponder for configured domains and email addresses. When enabled, the system will automatically respond to incoming emails.
        </p>
      </div>

      {domains.length > 0 && (
        <div>
          <h3 className="text-base font-medium text-gray-900 dark:text-white mb-3">Domains</h3>
          <div className="space-y-3">
            {domains.map((domain) => (
              <div
                key={domain}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
              >
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                    {domain}
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {domainSettings[domain]?.autoresponderEnabled
                      ? 'Autoresponder is active for this domain'
                      : 'Autoresponder is inactive for this domain'}
                  </p>
                </div>
                <Toggle
                  checked={domainSettings[domain]?.autoresponderEnabled || false}
                  onChange={() => handleToggleDomainAutoresponder(domain, !domainSettings[domain]?.autoresponderEnabled)}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {emails.length > 0 && (
        <div>
          <h3 className="text-base font-medium text-gray-900 dark:text-white mb-3">Sender Email Addresses</h3>
          <div className="space-y-3">
            {emails.map((email) => (
              <div
                key={email}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
              >
                <div className="flex items-center gap-3 flex-1">
                  <Mail className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                      {email}
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {emailSettings[email]?.autoresponderEnabled
                        ? 'Autoresponder is active for this email'
                        : 'Autoresponder is inactive for this email'}
                    </p>
                  </div>
                </div>
                <Toggle
                  checked={emailSettings[email]?.autoresponderEnabled || false}
                  onChange={() => handleToggleEmailAutoresponder(email, !emailSettings[email]?.autoresponderEnabled)}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
