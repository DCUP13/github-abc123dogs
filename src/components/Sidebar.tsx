import React, { useContext } from 'react';
import { Home, Settings as SettingsIcon, LogOut, Mail, Inbox, MessageSquare, Users, Calendar as CalendarIcon, HelpCircle, Plug, X } from 'lucide-react';
import { ThemeContext } from '../App';

interface SidebarProps {
  onSignOut: () => void;
  onHomeClick: () => void;
  onSettingsClick: () => void;
  onAddressesClick: () => void;
  onEmailsClick: () => void;
  onPromptsClick: () => void;
  onCRMClick: () => void;
  onCalendarClick: () => void;
  onSupportClick: () => void;
  onIntegrationsClick: () => void;
  onTeamClick?: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

const SCHEME_BG: Record<string, { bg: string; hover: string; border: string; bgDark: string; hoverDark: string }> = {
  classic: { bg: '#3730a3', hover: '#4338ca', border: 'rgba(67,56,202,0.3)',   bgDark: '#1e1b4b', hoverDark: '#2a2568' },
  indigo:  { bg: '#312e81', hover: '#3730a3', border: 'rgba(99,102,241,0.3)',  bgDark: '#231e5c', hoverDark: '#2d2870' },
  forest:  { bg: '#1a3a26', hover: '#2d5a3d', border: 'rgba(45,90,61,0.4)',    bgDark: '#132f1e', hoverDark: '#1a3c27' },
  ocean:   { bg: '#0c4a6e', hover: '#075985', border: 'rgba(2,132,199,0.3)',   bgDark: '#0d263c', hoverDark: '#143249' },
  rose:    { bg: '#881337', hover: '#9f1239', border: 'rgba(244,63,94,0.3)',   bgDark: '#2d0e16', hoverDark: '#3a1120' },
  emerald: { bg: '#064e3b', hover: '#065f46', border: 'rgba(16,185,129,0.3)', bgDark: '#0e2a1c', hoverDark: '#133822' },
  amber:   { bg: '#78350f', hover: '#92400e', border: 'rgba(217,119,6,0.3)',   bgDark: '#241508', hoverDark: '#2e1b0a' },
  violet:  { bg: '#4c1d95', hover: '#5b21b6', border: 'rgba(124,58,237,0.3)', bgDark: '#1e1040', hoverDark: '#27134f' },
  sky:     { bg: '#075985', hover: '#0369a1', border: 'rgba(14,165,233,0.3)', bgDark: '#0e2638', hoverDark: '#133148' },
  stone:   { bg: '#1c1917', hover: '#292524', border: 'rgba(168,162,158,0.3)',bgDark: '#1a1815', hoverDark: '#22201e' },
};

export function Sidebar({
  onSignOut,
  onHomeClick,
  onSettingsClick,
  onAddressesClick,
  onEmailsClick,
  onPromptsClick,
  onCRMClick,
  onCalendarClick,
  onSupportClick,
  onIntegrationsClick,
  onTeamClick,
  isOpen = false,
  onClose,
}: SidebarProps) {
  const { darkMode, colorScheme } = useContext(ThemeContext);
  const scheme = SCHEME_BG[colorScheme] ?? SCHEME_BG['classic'];

  const sidebarBg   = darkMode ? scheme.bgDark   : scheme.bg;
  const hoverBg     = darkMode ? scheme.hoverDark : scheme.hover;
  const borderColor = scheme.border;

  const nav = (handler: () => void) => () => {
    handler();
    onClose?.();
  };

  const navBtn = (onClick: () => void, Icon: React.ElementType, label: string) => (
    <button
      onClick={nav(onClick)}
      className="w-full flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors"
      onMouseEnter={e => (e.currentTarget.style.backgroundColor = hoverBg)}
      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      {label}
    </button>
  );

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      <div
        className={[
          'fixed inset-y-0 left-0 z-50 w-64 text-white flex flex-col transition-transform duration-300 ease-in-out',
          'md:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        ].join(' ')}
        style={{ backgroundColor: sidebarBg }}
      >
        <div
          className="flex items-center justify-between px-6 py-5 border-b"
          style={{ borderColor }}
        >
          <h2 className="text-xl font-bold">Dashboard</h2>
          <button
            onClick={onClose}
            className="md:hidden p-1 rounded transition-colors"
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = hoverBg)}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navBtn(onHomeClick,         Home,          'Home')}
          {navBtn(onEmailsClick,       Inbox,         'Emails')}
          {navBtn(onAddressesClick,    Mail,          'Addresses')}
          {navBtn(onPromptsClick,      MessageSquare, 'Prompts')}
          {navBtn(onCRMClick,          Users,         'CRM')}
          {navBtn(onCalendarClick,     CalendarIcon,  'Calendar')}
          {navBtn(onIntegrationsClick, Plug,          'Integrations')}
          {onTeamClick && navBtn(onTeamClick, Users,  'Team')}
          {navBtn(onSettingsClick,     SettingsIcon,  'Settings')}
        </nav>

        <div
          className="px-3 py-4 border-t space-y-1"
          style={{ borderColor }}
        >
          {navBtn(onSupportClick, HelpCircle, 'Support')}
          <button
            onClick={nav(onSignOut)}
            className="w-full flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors text-red-300 hover:text-red-200"
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = hoverBg)}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            Sign out
          </button>
        </div>
      </div>
    </>
  );
}
