import { DivideIcon as LucideIcon } from 'lucide-react';

export interface EmailSettings {
  smtpUsername: string;
  smtpPassword: string;
  smtpPort: string;
  smtpServer: string;
}

export interface SESEmail {
  address: string;
  dailyLimit?: number;
  testing?: boolean;
}

export interface GoogleEmail {
  address: string;
  appPassword: string;
  dailyLimit?: number;
  testing?: boolean;
}

export interface GeneralSettings {
  notifications: boolean;
  twoFactorAuth: boolean;
  newsletter: boolean;
  publicProfile: boolean;
}

export interface ToggleProps {
  checked: boolean;
  onChange: () => void;
}

export interface SettingRowProps {
  icon: LucideIcon;
  title: string;
  description: string;
  setting: string;
  checked: boolean;
  onChange: () => void;
}