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
  { id: 'slate',   name: 'Slate',   lightAccent: 'rgb(71, 85, 105)',   darkAccent: 'rgb(100, 116, 139)' },
  { id: 'blue',    name: 'Blue',    lightAccent: 'rgb(37, 99, 235)',    darkAccent: 'rgb(59, 130, 246)' },
  { id: 'emerald', name: 'Emerald', lightAccent: 'rgb(5, 150, 105)',    darkAccent: 'rgb(16, 185, 129)' },
  { id: 'violet',  name: 'Violet',  lightAccent: 'rgb(124, 58, 237)',   darkAccent: 'rgb(139, 92, 246)' },
  { id: 'amber',   name: 'Amber',   lightAccent: 'rgb(217, 119, 6)',    darkAccent: 'rgb(245, 158, 11)' },
  { id: 'rose',    name: 'Rose',    lightAccent: 'rgb(225, 29, 72)',    darkAccent: 'rgb(244, 63, 94)' },
  { id: 'teal',    name: 'Teal',    lightAccent: 'rgb(13, 148, 136)',   darkAccent: 'rgb(20, 184, 166)' },
  { id: 'indigo',  name: 'Indigo',  lightAccent: 'rgb(79, 70, 229)',    darkAccent: 'rgb(99, 102, 241)' },
  { id: 'fuchsia', name: 'Fuchsia', lightAccent: 'rgb(192, 38, 211)',   darkAccent: 'rgb(217, 70, 239)' },
  { id: 'cyan',    name: 'Cyan',    lightAccent: 'rgb(8, 145, 178)',    darkAccent: 'rgb(6, 182, 212)' },
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
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Choose an accent color for buttons, links, and active states.</p>
        <div className="grid grid-cols-5 gap-2">
          {COLOR_SCHEMES.map(scheme => {
            const isActive = colorScheme === scheme.id;
            const swatchColor = darkMode ? scheme.darkAccent : scheme.lightAccent;
            return (
              <button
                key={scheme.id}
                onClick={() => updateColorScheme(scheme.id)}
                className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all ${
                  isActive
                    ? 'border-gray-400 dark:border-gray-300 app-card-inner'
                    : 'border-transparent hover:border-gray-200 dark:hover:border-gray-600'
                }`}
                title={scheme.name}
              >
                <div
                  className="w-full h-9 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: swatchColor }}
                >
                  {isActive && <Check className="w-4 h-4 text-white drop-shadow" />}
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
