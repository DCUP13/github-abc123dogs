import React, { useContext } from 'react';
import { Bell, Moon, Globe, Lock, Mail, Check } from 'lucide-react';
import { ThemeContext } from '../../App';
import { SettingRow } from './SettingRow';
import type { GeneralSettings } from './types';

interface GeneralTabProps {
  settings: GeneralSettings;
  onToggle: (setting: keyof GeneralSettings) => void;
}

const COLOR_SCHEMES = [
  { id: 'indigo',  name: 'Indigo',   sidebar: '#312e81', accent: '#4f46e5' },
  { id: 'forest',  name: 'Forest',   sidebar: '#1a3a26', accent: '#c9a84c' },
  { id: 'ocean',   name: 'Ocean',    sidebar: '#0c4a6e', accent: '#0284c7' },
  { id: 'rose',    name: 'Rose',     sidebar: '#881337', accent: '#e11d48' },
  { id: 'emerald', name: 'Emerald',  sidebar: '#064e3b', accent: '#10b981' },
  { id: 'amber',   name: 'Amber',    sidebar: '#78350f', accent: '#d97706' },
  { id: 'violet',  name: 'Violet',   sidebar: '#4c1d95', accent: '#7c3aed' },
  { id: 'sky',     name: 'Sky',      sidebar: '#075985', accent: '#0ea5e9' },
  { id: 'slate',   name: 'Slate',    sidebar: '#1e293b', accent: '#64748b' },
  { id: 'stone',   name: 'Stone',    sidebar: '#1c1917', accent: '#a8a29e' },
];

export function GeneralTab({ settings, onToggle }: GeneralTabProps) {
  const { darkMode, toggleDarkMode, colorScheme, updateColorScheme } = useContext(ThemeContext);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Preferences</h2>
        <div className="space-y-2">
          <SettingRow
            icon={Bell}
            title="Push Notifications"
            description="Receive notifications about important updates and activity"
            setting="notifications"
            checked={settings.notifications}
            onChange={() => onToggle('notifications')}
          />
          <SettingRow
            icon={Moon}
            title="Dark Mode"
            description="Enable dark mode for a better viewing experience at night"
            setting="darkMode"
            checked={darkMode}
            onChange={toggleDarkMode}
          />
        </div>
      </div>

      <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Privacy & Security</h2>
        <div className="space-y-2">
          <SettingRow
            icon={Lock}
            title="Two-Factor Authentication"
            description="Add an extra layer of security to your account"
            setting="twoFactorAuth"
            checked={settings.twoFactorAuth}
            onChange={() => onToggle('twoFactorAuth')}
          />
          <SettingRow
            icon={Globe}
            title="Public Profile"
            description="Make your profile visible to other users"
            setting="publicProfile"
            checked={settings.publicProfile}
            onChange={() => onToggle('publicProfile')}
          />
        </div>
      </div>

      <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Email Preferences</h2>
        <div className="space-y-2">
          <SettingRow
            icon={Mail}
            title="Newsletter"
            description="Receive our newsletter with updates and featured content"
            setting="newsletter"
            checked={settings.newsletter}
            onChange={() => onToggle('newsletter')}
          />
        </div>
      </div>

      <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-1">Color Scheme</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Choose an accent color for the sidebar and interface highlights.</p>
        <div className="grid grid-cols-5 gap-2">
          {COLOR_SCHEMES.map(scheme => {
            const isActive = colorScheme === scheme.id;
            return (
              <button
                key={scheme.id}
                onClick={() => updateColorScheme(scheme.id)}
                className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all ${
                  isActive
                    ? 'border-gray-400 dark:border-gray-300 bg-gray-50 dark:bg-gray-700'
                    : 'border-transparent hover:border-gray-200 dark:hover:border-gray-600'
                }`}
                title={scheme.name}
              >
                <div
                  className="w-full h-9 rounded-lg relative overflow-hidden flex items-center justify-center"
                  style={{ backgroundColor: scheme.sidebar }}
                >
                  <div
                    className="absolute bottom-1.5 right-1.5 w-2.5 h-2.5 rounded-full border border-white/30"
                    style={{ backgroundColor: scheme.accent }}
                  />
                  {isActive && (
                    <Check className="w-4 h-4 text-white drop-shadow" />
                  )}
                </div>
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400 leading-none">
                  {scheme.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}