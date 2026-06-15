import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, Mail, Settings, Plus, Trash2, BarChart3, User, Save, Globe } from 'lucide-react';
import { Toggle } from './Toggle';

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

const inputClass =
  'w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent';

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
        supabase.from('amazon_ses_emails').select('*').eq('user_id', memberId),
        supabase.from('google_smtp_emails').select('*').eq('user_id', memberId),
        supabase.from('amazon_ses_domains').select('*').eq('user_id', memberId),
        supabase.from('user_settings').select('*').eq('user_id', memberId).maybeSingle(),
        supabase.from('dashboard_statistics').select('*').eq('user_id', memberId).maybeSingle()
      ]);

      const sesEmails: EmailAccount[] = (sesEmailsRes.data || []).map(e => ({
        id: e.id, address: e.address, daily_limit: e.daily_limit,
        sent_emails: e.sent_emails, is_locked: e.is_locked, type: 'ses' as const
      }));
      const googleEmails: EmailAccount[] = (googleEmailsRes.data || []).map(e => ({
        id: e.id, address: e.address, daily_limit: e.daily_limit,
        sent_emails: e.sent_emails, is_locked: e.is_locked, type: 'google' as const
      }));

      setEmailAccounts([...sesEmails, ...googleEmails]);
      setDomains(domainsRes.data || []);

      if (settingsRes.data) {
        setUserSettings(settingsRes.data);
      } else {
        const defaultSettings: UserSettings = {
          notifications: false, dark_mode: false, two_factor_auth: false,
          newsletter: false, public_profile: false, debugging: false,
          clean_up_loi: false, client_grading_enabled: false,
        };
        const { error: insertError } = await supabase
          .from('user_settings').insert({ user_id: memberId, ...defaultSettings });
        if (!insertError) setUserSettings(defaultSettings);
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
    if (!newEmailAddress.trim()) { setError('Please enter an email address'); return; }
    try {
      setSaving(true); setError('');
      const table = newEmailType === 'ses' ? 'amazon_ses_emails' : 'google_smtp_emails';
      const { error: insertError } = await supabase.from(table).insert({
        user_id: memberId, address: newEmailAddress,
        daily_limit: newEmailDailyLimit, sent_emails: 0, is_locked: false
      });
      if (insertError) throw insertError;
      setSuccess('Email address added successfully!');
      setNewEmailAddress('');
      setNewEmailDailyLimit(newEmailType === 'ses' ? 1440 : 500);
      await loadMemberData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) { setError(err.message); } finally { setSaving(false); }
  };

  const handleRemoveEmail = async (emailId: string, type: 'ses' | 'google') => {
    if (!confirm('Are you sure you want to remove this email address?')) return;
    try {
      setSaving(true); setError('');
      const table = type === 'ses' ? 'amazon_ses_emails' : 'google_smtp_emails';
      const { error: deleteError } = await supabase.from(table).delete().eq('id', emailId);
      if (deleteError) throw deleteError;
      setSuccess('Email address removed successfully!');
      await loadMemberData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) { setError(err.message); } finally { setSaving(false); }
  };

  const handleUpdateEmailLimit = async (emailId: string, type: 'ses' | 'google', newLimit: number) => {
    try {
      setSaving(true); setError('');
      const table = type === 'ses' ? 'amazon_ses_emails' : 'google_smtp_emails';
      const { error: updateError } = await supabase.from(table).update({ daily_limit: newLimit }).eq('id', emailId);
      if (updateError) throw updateError;
      setSuccess('Email limit updated successfully!');
      await loadMemberData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) { setError(err.message); } finally { setSaving(false); }
  };

  const handleAddDomain = async () => {
    if (!newDomain.trim()) { setError('Please enter a domain name'); return; }
    try {
      setSaving(true); setError('');
      const { error: insertError } = await supabase.from('amazon_ses_domains').insert({
        user_id: memberId, domain: newDomain, autoresponder_enabled: false, drafts_enabled: false
      });
      if (insertError) throw insertError;
      setSuccess('Domain added successfully!');
      setNewDomain('');
      await loadMemberData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) { setError(err.message); } finally { setSaving(false); }
  };

  const handleRemoveDomain = async (domainId: string) => {
    if (!confirm('Are you sure you want to remove this domain?')) return;
    try {
      setSaving(true); setError('');
      const { error: deleteError } = await supabase.from('amazon_ses_domains').delete().eq('id', domainId);
      if (deleteError) throw deleteError;
      setSuccess('Domain removed successfully!');
      await loadMemberData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) { setError(err.message); } finally { setSaving(false); }
  };

  const handleToggleDomainAutoresponder = async (domainId: string, enabled: boolean) => {
    try {
      setSaving(true); setError('');
      const { error: updateError } = await supabase.from('amazon_ses_domains')
        .update({ autoresponder_enabled: enabled }).eq('id', domainId);
      if (updateError) throw updateError;
      setSuccess('Domain settings updated!');
      await loadMemberData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) { setError(err.message); } finally { setSaving(false); }
  };

  const handleToggleDomainDrafts = async (domainId: string, enabled: boolean) => {
    try {
      setSaving(true); setError('');
      const { error: updateError } = await supabase.from('amazon_ses_domains')
        .update({ drafts_enabled: enabled }).eq('id', domainId);
      if (updateError) throw updateError;
      setSuccess('Domain settings updated!');
      await loadMemberData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) { setError(err.message); } finally { setSaving(false); }
  };

  const handleSaveSettings = async () => {
    if (!userSettings) return;
    try {
      setSaving(true); setError('');
      const { error: updateError } = await supabase.from('user_settings').upsert(
        { user_id: memberId, ...userSettings, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      );
      if (updateError) throw updateError;
      setSuccess('Settings updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) { setError(err.message); } finally { setSaving(false); }
  };

  const tabs = [
    { id: 'emails' as const, label: 'Emails', icon: Mail },
    { id: 'domains' as const, label: 'Domains', icon: Globe },
    { id: 'settings' as const, label: 'Settings', icon: Settings },
    { id: 'stats' as const, label: 'Stats', icon: BarChart3 },
  ];

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8 max-w-4xl w-full">
          <div className="text-center text-gray-700 dark:text-gray-300">Loading member data...</div>
        </div>
      </div>
    );
  }

  return (
    /* Mobile: full-screen sheet. Desktop: centered modal */
    <div className="fixed inset-0 bg-black/50 z-50 flex sm:items-center sm:justify-center sm:p-4">
      <div className="bg-white dark:bg-gray-800 w-full flex flex-col sm:rounded-lg sm:shadow-xl sm:max-w-5xl sm:max-h-[90vh]" style={{ height: '100%' }}>

        {/* Sticky header */}
        <div className="flex items-center justify-between px-4 sm:px-8 pt-4 sm:pt-6 pb-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="min-w-0">
            <h2 className="text-base sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2 truncate">
              <User className="w-4 h-4 sm:w-6 sm:h-6 flex-shrink-0 text-blue-600 dark:text-blue-400" />
              <span className="truncate">{memberName}</span>
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">{memberEmail}</p>
          </div>
          <button
            onClick={onClose}
            className="ml-3 p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 flex-shrink-0 overflow-x-auto">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center justify-center gap-1.5 flex-1 min-w-0 px-2 sm:px-4 py-3 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap border-b-2 ${
                activeTab === id
                  ? 'text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400'
                  : 'text-gray-600 dark:text-gray-400 border-transparent hover:text-gray-800 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="hidden xs:inline sm:inline">{label}</span>
              {/* Show label on all sizes since we use flex-1 */}
              <span className="xs:hidden sm:hidden">{label}</span>
            </button>
          ))}
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-4 sm:py-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 rounded-lg text-sm">
              {success}
            </div>
          )}

          {activeTab === 'emails' && (
            <div className="space-y-6">
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-white mb-4">Add Email Account</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Address</label>
                    <input type="email" value={newEmailAddress} onChange={(e) => setNewEmailAddress(e.target.value)}
                      className={inputClass} placeholder="member@example.com" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                      <select value={newEmailType} onChange={(e) => { setNewEmailType(e.target.value as 'ses' | 'google'); setNewEmailDailyLimit(e.target.value === 'ses' ? 1440 : 500); }}
                        className={inputClass}>
                        <option value="ses">Amazon SES</option>
                        <option value="google">Google SMTP</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Daily Limit</label>
                      <input type="number" value={newEmailDailyLimit} onChange={(e) => setNewEmailDailyLimit(parseInt(e.target.value) || 0)}
                        min={1} max={newEmailType === 'ses' ? 50000 : 500} className={inputClass} />
                    </div>
                  </div>
                  <button onClick={handleAddEmail} disabled={saving}
                    className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium">
                    <Plus className="w-4 h-4" />
                    Add Email
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-white mb-3">Email Accounts</h3>
                {emailAccounts.length === 0 ? (
                  <div className="text-center py-10 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <Mail className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500 dark:text-gray-400 text-sm">No email accounts configured</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {emailAccounts.map((account) => (
                      <div key={account.id} className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <span className="font-medium text-gray-800 dark:text-white text-sm truncate">{account.address}</span>
                              <span className={`px-2 py-0.5 text-xs rounded-full flex-shrink-0 ${account.type === 'ses' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400'}`}>
                                {account.type === 'ses' ? 'SES' : 'Google'}
                              </span>
                              {account.is_locked && (
                                <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400">Locked</span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                              Sent: {account.sent_emails} / {account.daily_limit} &nbsp;·&nbsp; Remaining: {account.daily_limit - account.sent_emails}
                            </p>
                            <div className="flex items-center gap-2">
                              <label className="text-xs text-gray-600 dark:text-gray-400 flex-shrink-0">Daily limit:</label>
                              <input type="number" value={account.daily_limit}
                                onChange={(e) => handleUpdateEmailLimit(account.id, account.type, parseInt(e.target.value) || 0)}
                                min={1} max={account.type === 'ses' ? 50000 : 500}
                                className="w-24 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                            </div>
                          </div>
                          <button onClick={() => handleRemoveEmail(account.id, account.type)} disabled={saving}
                            className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50 flex-shrink-0">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'domains' && (
            <div className="space-y-6">
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-white mb-4">Add Domain</h3>
                <div className="flex gap-3">
                  <input type="text" value={newDomain} onChange={(e) => setNewDomain(e.target.value)}
                    className={inputClass} placeholder="example.com" />
                  <button onClick={handleAddDomain} disabled={saving}
                    className="flex-shrink-0 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 font-medium">
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">Add</span>
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-white mb-3">Verified Domains</h3>
                {domains.length === 0 ? (
                  <div className="text-center py-10 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <Globe className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500 dark:text-gray-400 text-sm">No domains configured</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {domains.map((domain) => (
                      <div key={domain.id} className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <Globe className="w-4 h-4 text-gray-600 dark:text-gray-400 flex-shrink-0" />
                            <span className="font-medium text-gray-800 dark:text-white truncate">{domain.domain}</span>
                          </div>
                          <button onClick={() => handleRemoveDomain(domain.id)} disabled={saving}
                            className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50 flex-shrink-0 ml-2">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg">
                            <div className="min-w-0 mr-4">
                              <p className="font-medium text-gray-800 dark:text-white text-sm">Autoresponder</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">Automatically send AI-generated responses</p>
                            </div>
                            <Toggle checked={domain.autoresponder_enabled} onChange={(checked) => handleToggleDomainAutoresponder(domain.id, checked)} disabled={saving || domain.drafts_enabled} />
                          </div>
                          <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg">
                            <div className="min-w-0 mr-4">
                              <p className="font-medium text-gray-800 dark:text-white text-sm">Drafts Mode</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">Save AI responses as drafts instead of sending</p>
                            </div>
                            <Toggle checked={domain.drafts_enabled} onChange={(checked) => handleToggleDomainDrafts(domain.id, checked)} disabled={saving || domain.autoresponder_enabled} />
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
            <div className="space-y-3">
              {userSettings ? (
                <>
                  {([
                    { key: 'notifications', label: 'Notifications', desc: 'Receive email notifications' },
                    { key: 'dark_mode', label: 'Dark Mode', desc: 'Enable dark theme' },
                    { key: 'two_factor_auth', label: 'Two-Factor Auth', desc: 'Add an extra layer of security' },
                    { key: 'newsletter', label: 'Newsletter', desc: 'Subscribe to newsletter' },
                    { key: 'public_profile', label: 'Public Profile', desc: 'Make profile publicly visible' },
                    { key: 'debugging', label: 'Debugging Mode', desc: 'Enable debug logging' },
                    { key: 'clean_up_loi', label: 'Clean Up LOI', desc: 'Delete attachments when campaigns run' },
                    { key: 'client_grading_enabled', label: 'Client Grading', desc: 'Enable automatic client grading' },
                  ] as { key: keyof UserSettings; label: string; desc: string }[]).map(({ key, label, desc }) => (
                    <div key={key} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg gap-4">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-800 dark:text-white text-sm">{label}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{desc}</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={userSettings[key] as boolean}
                        onChange={(e) => setUserSettings({ ...userSettings, [key]: e.target.checked })}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 flex-shrink-0 cursor-pointer"
                      />
                    </div>
                  ))}
                  <button onClick={handleSaveSettings} disabled={saving}
                    className="w-full mt-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium">
                    <Save className="w-4 h-4" />
                    {saving ? 'Saving...' : 'Save Settings'}
                  </button>
                </>
              ) : (
                <div className="text-center py-10 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <Settings className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500 dark:text-gray-400 text-sm">No settings configured</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'stats' && (
            <div>
              {dashboardStats ? (
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {[
                    { label: 'Emails Remaining', value: dashboardStats.total_emails_remaining.toLocaleString(), color: 'blue' },
                    { label: 'Email Accounts', value: dashboardStats.total_email_accounts, color: 'green' },
                    { label: 'Sent Today', value: dashboardStats.total_emails_sent_today, color: 'orange' },
                    { label: 'Domains', value: dashboardStats.total_domains, color: 'teal' },
                    { label: 'Templates', value: dashboardStats.total_templates || 0, color: 'pink' },
                    { label: 'Campaigns', value: dashboardStats.total_campaigns || 0, color: 'teal' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className={`bg-${color}-50 dark:bg-${color}-900/20 rounded-lg p-4 sm:p-6`}>
                      <p className={`text-xs sm:text-sm text-${color}-600 dark:text-${color}-400 mb-1`}>{label}</p>
                      <p className={`text-2xl sm:text-3xl font-bold text-${color}-800 dark:text-${color}-300`}>{value}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <BarChart3 className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500 dark:text-gray-400 text-sm">No statistics available</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
