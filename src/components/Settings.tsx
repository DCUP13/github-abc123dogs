import React, { useState, useEffect, useContext } from 'react';
import { Server, Mail } from 'lucide-react';
import { ThemeContext } from '../App';
import { GeneralTab } from './settings/GeneralTab';
import { AmazonTab } from './settings/AmazonTab';
import { GoogleTab } from './settings/GoogleTab';
import { RapidAPITab } from './settings/RapidAPITab';
import { AutoresponderTab } from './settings/AutoresponderTab';
import type { EmailSettings, GeneralSettings } from './settings/types';
import { supabase } from '../lib/supabase';
import { toast } from '../lib/toast';

interface SettingsProps {
  onSignOut: () => void;
  currentView: string;
  onPrivacyClick: () => void;
  onTermsClick: () => void;
}

type SettingsTab = 'general' | 'amazon' | 'google' | 'rapid-api' | 'autoresponder';

export function Settings({ onSignOut, currentView, onPrivacyClick, onTermsClick }: SettingsProps) {
  const { darkMode, colorScheme } = useContext(ThemeContext);
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [settings, setSettings] = useState<GeneralSettings>({
    notifications: true,
    twoFactorAuth: false,
    newsletter: false,
    publicProfile: true,
    debugging: false,
    cleanUpLoi: false
  });
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  const [emailSettings, setEmailSettings] = useState<EmailSettings>({
    smtpUsername: '',
    smtpPassword: '',
    smtpPort: '587',
    smtpServer: 'email-smtp.us-east-1.amazonaws.com',
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    fetchSettings();
    fetchUserRole();
  }, []);

  const fetchUserRole = async () => {
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) return;

      const { data, error } = await supabase
        .from('organization_members')
        .select('role')
        .eq('user_id', user.data.user.id);

      if (error) throw error;

      if (data && data.length > 0) {
        const priority = ['owner', 'manager', 'member'];
        const highestRole = priority.find(r => data.some(d => d.role === r)) ?? data[0].role;
        setUserRole(highestRole);
      }
    } catch (error) {
      console.error('Error fetching user role:', error);
    }
  };

  const createDefaultSettings = async () => {
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) return;

      const { error } = await supabase
        .from('user_settings')
        .insert({
          user_id: user.data.user.id,
          dark_mode: false,
          notifications: true,
          two_factor_auth: false,
          newsletter: false,
          public_profile: true,
          debugging: false,
          clean_up_loi: false
        });

      if (error) throw error;
      await fetchSettings();
    } catch (error) {
      console.error('Error creating default settings:', error);
    }
  };

  const fetchSettings = async () => {
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) {
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.data.user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching settings:', error);
        setIsLoading(false);
        return;
      }

      if (data) {
        setSettings({
          notifications: data.notifications,
          twoFactorAuth: data.two_factor_auth,
          newsletter: data.newsletter,
          publicProfile: data.public_profile,
          debugging: data.debugging,
          cleanUpLoi: data.clean_up_loi || false
        });
      } else {
        await createDefaultSettings();
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = async (setting: keyof GeneralSettings) => {
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) {
        throw new Error('User not authenticated');
      }

      const newSettings = {
        ...settings,
        [setting]: !settings[setting]
      };

      const dbSettings = {
        notifications: newSettings.notifications,
        two_factor_auth: newSettings.twoFactorAuth,
        newsletter: newSettings.newsletter,
        public_profile: newSettings.publicProfile,
        debugging: newSettings.debugging,
        clean_up_loi: newSettings.cleanUpLoi,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('user_settings')
        .update(dbSettings)
        .eq('user_id', user.data.user.id);

      if (error) throw error;

      setSettings(newSettings);
    } catch (error) {
      console.error('Error updating settings:', error);
      toast.error('Failed to update settings. Please try again.');
    }
  };

  const handleEmailSettingChange = (key: keyof EmailSettings, value: string) => {
    setEmailSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSaveEmailSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      toast.error('Failed to save email settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = [
    { id: 'general', label: 'General', shortLabel: 'General', icon: Server },
    { id: 'amazon', label: 'Amazon SES', shortLabel: 'Amazon', icon: Server },
    { id: 'google', label: 'Google SMTP', shortLabel: 'Google', icon: Mail },
    { id: 'rapid-api', label: 'Rapid API', shortLabel: 'API', icon: Server },
    { id: 'autoresponder', label: 'Autoresponder', shortLabel: 'Auto', icon: Mail }
  ];

  const ACCENT: Record<string, { light: string; dark: string }> = {
    slate:   { light: 'rgb(71, 85, 105)',   dark: 'rgb(100, 116, 139)' },
    blue:    { light: 'rgb(37, 99, 235)',    dark: 'rgb(59, 130, 246)' },
    emerald: { light: 'rgb(5, 150, 105)',    dark: 'rgb(16, 185, 129)' },
    violet:  { light: 'rgb(124, 58, 237)',   dark: 'rgb(139, 92, 246)' },
    amber:   { light: 'rgb(217, 119, 6)',    dark: 'rgb(245, 158, 11)' },
    rose:    { light: 'rgb(225, 29, 72)',    dark: 'rgb(244, 63, 94)' },
    teal:    { light: 'rgb(13, 148, 136)',   dark: 'rgb(20, 184, 166)' },
    indigo:  { light: 'rgb(79, 70, 229)',    dark: 'rgb(99, 102, 241)' },
    fuchsia: { light: 'rgb(192, 38, 211)',   dark: 'rgb(217, 70, 239)' },
    cyan:    { light: 'rgb(8, 145, 178)',    dark: 'rgb(6, 182, 212)' },
  };
  const accentColor = (ACCENT[colorScheme] ?? ACCENT['blue'])[darkMode ? 'dark' : 'light'];

  if (isLoading) {
    return (
      <div className="p-4 md:p-8 app-bg min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: accentColor, borderTopColor: 'transparent' }} />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 app-bg min-h-screen">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-6">Settings</h1>
        
        <div className="app-card rounded-xl shadow-sm overflow-hidden">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as SettingsTab)}
                  className={`flex-1 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-1 sm:px-4 py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-transparent'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                  style={activeTab === tab.id ? { borderBottomColor: accentColor, borderBottomWidth: '2px', color: accentColor } : undefined}
                >
                  <tab.icon className="w-4 h-4 flex-shrink-0" />
                  <span className="sm:hidden">{tab.shortLabel}</span>
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'general' && (
              <GeneralTab
                settings={settings}
                onToggle={handleToggle}
              />
            )}

            {activeTab === 'amazon' && (
              <AmazonTab
                emailSettings={emailSettings}
                onEmailSettingChange={handleEmailSettingChange}
                onSaveEmailSettings={handleSaveEmailSettings}
                isSaving={isSaving}
                saveSuccess={saveSuccess}
                userRole={userRole}
              />
            )}

            {activeTab === 'google' && <GoogleTab userRole={userRole} />}

            {activeTab === 'rapid-api' && <RapidAPITab />}

            {activeTab === 'autoresponder' && <AutoresponderTab />}
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <div className="text-sm text-gray-500 dark:text-gray-400 text-center">
            Settings are automatically saved when you toggle them
          </div>

          <div className="flex items-center justify-center gap-6 text-sm">
            <button
              onClick={onPrivacyClick}
              className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 underline"
            >
              Privacy Policy
            </button>
            <span className="text-gray-300 dark:text-gray-600">•</span>
            <button
              onClick={onTermsClick}
              className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 underline"
            >
              Terms of Service
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}