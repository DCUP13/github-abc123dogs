import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, Mail, Settings, Plus, Trash2, BarChart3, User, Save, Globe } from 'lucide-react';

interface MemberDetailDialogProps {
  memberId: string;
  memberName: string;
  memberEmail: string;
  onClose: () => void;
}

interface EmailAccount {
  id: string;
  address: string;
  daily_limit: number;
  sent_emails: number;
  is_locked: boolean;
  type: 'ses' | 'google';
}

interface UserSettings {
  notifications: boolean;
  dark_mode: boolean;
  two_factor_auth: boolean;
  newsletter: boolean;
  public_profile: boolean;
  debugging: boolean;
  clean_up_loi: boolean;
  client_grading_enabled: boolean;
}

interface DashboardStats {
  total_emails_remaining: number;
  total_email_accounts: number;
  total_emails_sent_today: number;
  total_domains: number;
  total_templates: number;
  total_campaigns: number;
}

export default function MemberDetailDialog({ memberId, memberName, memberEmail, onClose }: MemberDetailDialogProps) {
  const [activeTab, setActiveTab] = useState<'emails' | 'domains' | 'settings' | 'stats'>('emails');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [emailAccounts, setEmailAccounts] = useState<EmailAccount[]>([]);
  const [domains, setDomains] = useState<Array<{ id: string; domain: string; autoresponder_enabled: boolean; drafts_enabled: boolean }>>([]);
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);

  const [newEmailAddress, setNewEmailAddress] = useState('');
  const [newEmailType, setNewEmailType] = useState<'ses' | 'google'>('ses');
  const [newEmailDailyLimit, setNewEmailDailyLimit] = useState(1440);

  const [newDomain, setNewDomain] = useState('');

  useEffect(() => {
    loadMemberData();
  }, [memberId]);

  const loadMemberData = async () => {
    try {
      setLoading(true);
      setError('');

      const [sesEmailsRes, googleEmailsRes, domainsRes, settingsRes, statsRes] = await Promise.all([
        supabase
          .from('amazon_ses_emails')
          .select('*')
          .eq('user_id', memberId),
        supabase
          .from('google_smtp_emails')
          .select('*')
          .eq('user_id', memberId),
        supabase
          .from('amazon_ses_domains')
          .select('*')
          .eq('user_id', memberId),
        supabase
          .from('user_settings')
          .select('*')
          .eq('user_id', memberId)
          .maybeSingle(),
        supabase
          .from('dashboard_statistics')
          .select('*')
          .eq('user_id', memberId)
          .maybeSingle()
      ]);

      const sesEmails: EmailAccount[] = (sesEmailsRes.data || []).map(e => ({
        id: e.id,
        address: e.address,
        daily_limit: e.daily_limit,
        sent_emails: e.sent_emails,
        is_locked: e.is_locked,
        type: 'ses' as const
      }));

      const googleEmails: EmailAccount[] = (googleEmailsRes.data || []).map(e => ({
        id: e.id,
        address: e.address,
        daily_limit: e.daily_limit,
        sent_emails: e.sent_emails,
        is_locked: e.is_locked,
        type: 'google' as const
      }));

      setEmailAccounts([...sesEmails, ...googleEmails]);
      setDomains(domainsRes.data || []);

      if (settingsRes.data) {
        setUserSettings(settingsRes.data);
      } else {
        const defaultSettings: UserSettings = {
          notifications: false,
          dark_mode: false,
          two_factor_auth: false,
          newsletter: false,
          public_profile: false,
          debugging: false,
          clean_up_loi: false,
          client_grading_enabled: false,
        };

        const { error: insertError } = await supabase
          .from('user_settings')
          .insert({
            user_id: memberId,
            ...defaultSettings
          });

        if (!insertError) {
          setUserSettings(defaultSettings);
        }
      }

      setDashboardStats(statsRes.data);

    } catch (err: any) {
      console.error('Error loading member data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEmail = async () => {
    if (!newEmailAddress.trim()) {
      setError('Please enter an email address');
      return;
    }

    try {
      setSaving(true);
      setError('');

      const table = newEmailType === 'ses' ? 'amazon_ses_emails' : 'google_smtp_emails';
      const { error: insertError } = await supabase
        .from(table)
        .insert({
          user_id: memberId,
          address: newEmailAddress,
          daily_limit: newEmailDailyLimit,
          sent_emails: 0,
          is_locked: false
        });

      if (insertError) throw insertError;

      setSuccess('Email address added successfully!');
      setNewEmailAddress('');
      setNewEmailDailyLimit(newEmailType === 'ses' ? 1440 : 500);
      await loadMemberData();

      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Error adding email:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveEmail = async (emailId: string, type: 'ses' | 'google') => {
    if (!confirm('Are you sure you want to remove this email address?')) {
      return;
    }

    try {
      setSaving(true);
      setError('');

      const table = type === 'ses' ? 'amazon_ses_emails' : 'google_smtp_emails';
      const { error: deleteError } = await supabase
        .from(table)
        .delete()
        .eq('id', emailId);

      if (deleteError) throw deleteError;

      setSuccess('Email address removed successfully!');
      await loadMemberData();

      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Error removing email:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateEmailLimit = async (emailId: string, type: 'ses' | 'google', newLimit: number) => {
    try {
      setSaving(true);
      setError('');

      const table = type === 'ses' ? 'amazon_ses_emails' : 'google_smtp_emails';
      const { error: updateError } = await supabase
        .from(table)
        .update({ daily_limit: newLimit })
        .eq('id', emailId);

      if (updateError) throw updateError;

      setSuccess('Email limit updated successfully!');
      await loadMemberData();

      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Error updating email limit:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddDomain = async () => {
    if (!newDomain.trim()) {
      setError('Please enter a domain name');
      return;
    }

    try {
      setSaving(true);
      setError('');

      const { error: insertError } = await supabase
        .from('amazon_ses_domains')
        .insert({
          user_id: memberId,
          domain: newDomain,
          autoresponder_enabled: false,
          drafts_enabled: false
        });

      if (insertError) throw insertError;

      setSuccess('Domain added successfully!');
      setNewDomain('');
      await loadMemberData();

      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Error adding domain:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveDomain = async (domainId: string) => {
    if (!confirm('Are you sure you want to remove this domain?')) {
      return;
    }

    try {
      setSaving(true);
      setError('');

      const { error: deleteError } = await supabase
        .from('amazon_ses_domains')
        .delete()
        .eq('id', domainId);

      if (deleteError) throw deleteError;

      setSuccess('Domain removed successfully!');
      await loadMemberData();

      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Error removing domain:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleDomainAutoresponder = async (domainId: string, enabled: boolean) => {
    try {
      setSaving(true);
      setError('');

      const { error: updateError } = await supabase
        .from('amazon_ses_domains')
        .update({ autoresponder_enabled: enabled })
        .eq('id', domainId);

      if (updateError) throw updateError;

      setSuccess('Domain settings updated!');
      await loadMemberData();

      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Error updating domain:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleDomainDrafts = async (domainId: string, enabled: boolean) => {
    try {
      setSaving(true);
      setError('');

      const { error: updateError } = await supabase
        .from('amazon_ses_domains')
        .update({ drafts_enabled: enabled })
        .eq('id', domainId);

      if (updateError) throw updateError;

      setSuccess('Domain settings updated!');
      await loadMemberData();

      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Error updating domain:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!userSettings) return;

    try {
      setSaving(true);
      setError('');

      const { error: updateError } = await supabase
        .from('user_settings')
        .upsert({
          user_id: memberId,
          ...userSettings,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (updateError) throw updateError;

      setSuccess('Settings updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Error saving settings:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8 max-w-4xl w-full mx-4">
          <div className="text-center">Loading member data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-8 max-w-5xl w-full mx-4 my-8 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <User className="w-6 h-6" />
              {memberName}
            </h2>
            <p className="text-gray-600 dark:text-gray-400">{memberEmail}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded">
            {success}
          </div>
        )}

        <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('emails')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'emails'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <Mail className="w-4 h-4 inline mr-2" />
            Email Accounts
          </button>
          <button
            onClick={() => setActiveTab('domains')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'domains'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <Globe className="w-4 h-4 inline mr-2" />
            Domains
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'settings'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <Settings className="w-4 h-4 inline mr-2" />
            Settings
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'stats'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <BarChart3 className="w-4 h-4 inline mr-2" />
            Statistics
          </button>
        </div>

        {activeTab === 'emails' && (
          <div className="space-y-6">
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Add Email Account</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={newEmailAddress}
                    onChange={(e) => setNewEmailAddress(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    placeholder="member@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Type
                  </label>
                  <select
                    value={newEmailType}
                    onChange={(e) => {
                      setNewEmailType(e.target.value as 'ses' | 'google');
                      setNewEmailDailyLimit(e.target.value === 'ses' ? 1440 : 500);
                    }}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ses">Amazon SES</option>
                    <option value="google">Google SMTP</option>
                  </select>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Daily Limit
                  </label>
                  <input
                    type="number"
                    value={newEmailDailyLimit}
                    onChange={(e) => setNewEmailDailyLimit(parseInt(e.target.value) || 0)}
                    min={1}
                    max={newEmailType === 'ses' ? 50000 : 500}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Max: {newEmailType === 'ses' ? '50,000' : '500'} emails/day
                  </p>
                </div>
                <div className="flex items-end">
                  <button
                    onClick={handleAddEmail}
                    disabled={saving}
                    className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Email
                  </button>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Email Accounts</h3>
              {emailAccounts.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <Mail className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500 dark:text-gray-400">No email accounts configured</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {emailAccounts.map((account) => (
                    <div
                      key={account.id}
                      className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 flex items-center justify-between"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Mail className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                          <span className="font-medium text-gray-800 dark:text-white">{account.address}</span>
                          <span className={`px-2 py-1 text-xs rounded ${
                            account.type === 'ses'
                              ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400'
                              : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400'
                          }`}>
                            {account.type === 'ses' ? 'Amazon SES' : 'Google SMTP'}
                          </span>
                          {account.is_locked && (
                            <span className="px-2 py-1 text-xs rounded bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400">
                              Locked
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Sent today: {account.sent_emails} / {account.daily_limit}
                          <span className="ml-4">
                            Remaining: {account.daily_limit - account.sent_emails}
                          </span>
                        </div>
                        <div className="mt-2">
                          <label className="text-xs text-gray-600 dark:text-gray-400 mr-2">Daily Limit:</label>
                          <input
                            type="number"
                            value={account.daily_limit}
                            onChange={(e) => handleUpdateEmailLimit(account.id, account.type, parseInt(e.target.value) || 0)}
                            min={1}
                            max={account.type === 'ses' ? 50000 : 500}
                            className="w-24 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                          />
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveEmail(account.id, account.type)}
                        disabled={saving}
                        className="ml-4 p-2 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition-colors disabled:opacity-50"
                        title="Remove email"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'domains' && (
          <div className="space-y-6">
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Add Domain</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Domain Name
                  </label>
                  <input
                    type="text"
                    value={newDomain}
                    onChange={(e) => setNewDomain(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    placeholder="example.com"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={handleAddDomain}
                    disabled={saving}
                    className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Domain
                  </button>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Verified Domains</h3>
              {domains.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <Globe className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500 dark:text-gray-400">No domains configured</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {domains.map((domain) => (
                    <div
                      key={domain.id}
                      className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Globe className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                          <span className="font-medium text-gray-800 dark:text-white text-lg">{domain.domain}</span>
                        </div>
                        <button
                          onClick={() => handleRemoveDomain(domain.id)}
                          disabled={saving}
                          className="p-2 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition-colors disabled:opacity-50"
                          title="Remove domain"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded">
                          <div>
                            <label className="font-medium text-gray-800 dark:text-white">Autoresponder</label>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Automatically send AI-generated responses</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={domain.autoresponder_enabled}
                            onChange={(e) => handleToggleDomainAutoresponder(domain.id, e.target.checked)}
                            disabled={saving || domain.drafts_enabled}
                            className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                          />
                        </div>

                        <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded">
                          <div>
                            <label className="font-medium text-gray-800 dark:text-white">Drafts Mode</label>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Save AI responses as drafts instead of sending</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={domain.drafts_enabled}
                            onChange={(e) => handleToggleDomainDrafts(domain.id, e.target.checked)}
                            disabled={saving || domain.autoresponder_enabled}
                            className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-4">
            {userSettings ? (
              <>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <div>
                      <label className="font-medium text-gray-800 dark:text-white">Notifications</label>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Receive email notifications</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={userSettings.notifications}
                      onChange={(e) => setUserSettings({ ...userSettings, notifications: e.target.checked })}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <div>
                      <label className="font-medium text-gray-800 dark:text-white">Dark Mode</label>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Enable dark theme</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={userSettings.dark_mode}
                      onChange={(e) => setUserSettings({ ...userSettings, dark_mode: e.target.checked })}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <div>
                      <label className="font-medium text-gray-800 dark:text-white">Two-Factor Authentication</label>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Add an extra layer of security</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={userSettings.two_factor_auth}
                      onChange={(e) => setUserSettings({ ...userSettings, two_factor_auth: e.target.checked })}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <div>
                      <label className="font-medium text-gray-800 dark:text-white">Newsletter</label>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Subscribe to newsletter</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={userSettings.newsletter}
                      onChange={(e) => setUserSettings({ ...userSettings, newsletter: e.target.checked })}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <div>
                      <label className="font-medium text-gray-800 dark:text-white">Public Profile</label>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Make profile publicly visible</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={userSettings.public_profile}
                      onChange={(e) => setUserSettings({ ...userSettings, public_profile: e.target.checked })}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <div>
                      <label className="font-medium text-gray-800 dark:text-white">Debugging Mode</label>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Enable debug logging</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={userSettings.debugging}
                      onChange={(e) => setUserSettings({ ...userSettings, debugging: e.target.checked })}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <div>
                      <label className="font-medium text-gray-800 dark:text-white">Clean Up LOI</label>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Delete attachments when campaigns run</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={userSettings.clean_up_loi}
                      onChange={(e) => setUserSettings({ ...userSettings, clean_up_loi: e.target.checked })}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <div>
                      <label className="font-medium text-gray-800 dark:text-white">Client Grading</label>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Enable automatic client grading</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={userSettings.client_grading_enabled}
                      onChange={(e) => setUserSettings({ ...userSettings, client_grading_enabled: e.target.checked })}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <button
                  onClick={handleSaveSettings}
                  disabled={saving}
                  className="w-full mt-6 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Save className="w-5 h-5" />
                  {saving ? 'Saving...' : 'Save Settings'}
                </button>
              </>
            ) : (
              <div className="text-center py-12 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <Settings className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500 dark:text-gray-400">No settings configured</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'stats' && (
          <div>
            {dashboardStats ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
                  <div className="text-sm text-blue-600 dark:text-blue-400 mb-1">Emails Remaining</div>
                  <div className="text-3xl font-bold text-blue-800 dark:text-blue-300">
                    {dashboardStats.total_emails_remaining.toLocaleString()}
                  </div>
                </div>

                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-6">
                  <div className="text-sm text-green-600 dark:text-green-400 mb-1">Email Accounts</div>
                  <div className="text-3xl font-bold text-green-800 dark:text-green-300">
                    {dashboardStats.total_email_accounts}
                  </div>
                </div>

                <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-6">
                  <div className="text-sm text-orange-600 dark:text-orange-400 mb-1">Sent Today</div>
                  <div className="text-3xl font-bold text-orange-800 dark:text-orange-300">
                    {dashboardStats.total_emails_sent_today}
                  </div>
                </div>

                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-6">
                  <div className="text-sm text-purple-600 dark:text-purple-400 mb-1">Domains</div>
                  <div className="text-3xl font-bold text-purple-800 dark:text-purple-300">
                    {dashboardStats.total_domains}
                  </div>
                </div>

                <div className="bg-pink-50 dark:bg-pink-900/20 rounded-lg p-6">
                  <div className="text-sm text-pink-600 dark:text-pink-400 mb-1">Templates</div>
                  <div className="text-3xl font-bold text-pink-800 dark:text-pink-300">
                    {dashboardStats.total_templates || 0}
                  </div>
                </div>

                <div className="bg-teal-50 dark:bg-teal-900/20 rounded-lg p-6">
                  <div className="text-sm text-teal-600 dark:text-teal-400 mb-1">Campaigns</div>
                  <div className="text-3xl font-bold text-teal-800 dark:text-teal-300">
                    {dashboardStats.total_campaigns || 0}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500 dark:text-gray-400">No statistics available</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
