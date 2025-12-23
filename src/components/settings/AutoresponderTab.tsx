import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Toggle } from './Toggle';
import { Mail } from 'lucide-react';

export function AutoresponderTab() {
  const [emailSettings, setEmailSettings] = useState<Record<string, { autoresponderEnabled: boolean; draftsEnabled: boolean }>>({});
  const [clientGradingEnabled, setClientGradingEnabled] = useState(false);
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

      const [emailsResult, userSettingsResult] = await Promise.all([
        supabase
          .from('amazon_ses_emails')
          .select('address, autoresponder_enabled, drafts_enabled')
          .eq('user_id', user.data.user.id),
        supabase
          .from('user_settings')
          .select('client_grading_enabled')
          .eq('user_id', user.data.user.id)
          .maybeSingle()
      ]);

      if (emailsResult.error) throw emailsResult.error;
      if (userSettingsResult.error) throw userSettingsResult.error;

      if (emailsResult.data) {
        const settings = emailsResult.data.reduce((acc, email) => {
          acc[email.address] = {
            autoresponderEnabled: email.autoresponder_enabled || false,
            draftsEnabled: email.drafts_enabled || false
          };
          return acc;
        }, {} as Record<string, { autoresponderEnabled: boolean; draftsEnabled: boolean }>);

        setEmailSettings(settings);
      }

      if (userSettingsResult.data) {
        setClientGradingEnabled(userSettingsResult.data.client_grading_enabled || false);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleEmailAutoresponder = async (email: string, enabled: boolean) => {
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) {
        throw new Error('User not authenticated');
      }

      const updateData: any = {
        autoresponder_enabled: enabled,
        updated_at: new Date().toISOString()
      };

      if (enabled) {
        updateData.drafts_enabled = false;
      }

      const { error } = await supabase
        .from('amazon_ses_emails')
        .update(updateData)
        .eq('user_id', user.data.user.id)
        .eq('address', email);

      if (error) throw error;

      setEmailSettings(prev => ({
        ...prev,
        [email]: {
          autoresponderEnabled: enabled,
          draftsEnabled: enabled ? false : prev[email]?.draftsEnabled || false
        }
      }));
    } catch (error) {
      console.error('Error updating autoresponder setting:', error);
      alert('Failed to update autoresponder setting. Please try again.');
    }
  };

  const handleToggleEmailDrafts = async (email: string, enabled: boolean) => {
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) {
        throw new Error('User not authenticated');
      }

      const { error } = await supabase
        .from('amazon_ses_emails')
        .update({
          drafts_enabled: enabled,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.data.user.id)
        .eq('address', email);

      if (error) throw error;

      setEmailSettings(prev => ({
        ...prev,
        [email]: { ...prev[email], draftsEnabled: enabled }
      }));
    } catch (error) {
      console.error('Error updating drafts setting:', error);
      alert('Failed to update drafts setting. Please try again.');
    }
  };

  const handleToggleClientGrading = async (enabled: boolean) => {
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) {
        throw new Error('User not authenticated');
      }

      const { error } = await supabase
        .from('user_settings')
        .update({
          client_grading_enabled: enabled,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.data.user.id);

      if (error) throw error;

      setClientGradingEnabled(enabled);
    } catch (error) {
      console.error('Error updating client grading setting:', error);
      alert('Failed to update client grading setting. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const emails = Object.keys(emailSettings);

  if (emails.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 dark:text-gray-400">
          No email addresses configured. Add sender emails in the Amazon SES tab to enable autoresponder.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Autoresponder Settings</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Enable or disable autoresponder for each email address. When enabled, the system will automatically respond to incoming emails.
        </p>
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <div className="flex-1">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
              AI Client Grading
            </h4>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {clientGradingEnabled
                ? 'Automatically grade clients using AI when they send emails. Disable this to improve performance in high-volume conversations.'
                : 'AI client grading is disabled. Enable to automatically grade and analyze clients when they send emails.'}
            </p>
          </div>
          <Toggle
            checked={clientGradingEnabled}
            onChange={() => handleToggleClientGrading(!clientGradingEnabled)}
          />
        </div>
      </div>

      <div>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mb-3">Email Addresses</h3>
        <div className="space-y-3">
          {emails.map((email) => (
            <div
              key={email}
              className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <Mail className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                      {email}
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {emailSettings[email]?.autoresponderEnabled
                        ? 'Autoresponder is active - emails will be sent automatically'
                        : emailSettings[email]?.draftsEnabled
                        ? 'Draft mode is active - AI will generate responses as drafts'
                        : 'All automation is disabled for this address'}
                    </p>
                  </div>
                </div>
                <Toggle
                  checked={emailSettings[email]?.autoresponderEnabled || false}
                  onChange={() => handleToggleEmailAutoresponder(email, !emailSettings[email]?.autoresponderEnabled)}
                />
              </div>

              {!emailSettings[email]?.autoresponderEnabled && (
                <div className="flex items-center justify-between pl-4 border-l-2 border-gray-300 dark:border-gray-600">
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                      Draft Mode
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {emailSettings[email]?.draftsEnabled
                        ? 'AI generates draft responses that you can review before sending'
                        : 'Disabled - no AI processing to save tokens'}
                    </p>
                  </div>
                  <Toggle
                    checked={emailSettings[email]?.draftsEnabled || false}
                    onChange={() => handleToggleEmailDrafts(email, !emailSettings[email]?.draftsEnabled)}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
