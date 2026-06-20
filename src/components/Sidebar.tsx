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
  const { darkMode } = useContext(ThemeContext);

  const sidebarBg   = darkMode ? '#1e293b' : '#ffffff';
  const hoverBg     = darkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)';
  const borderColor = darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
  const textClass   = darkMode ? 'text-slate-100' : 'text-slate-700';

  const nav = (handler: () => void) => () => {
    handler();
    onClose?.();
  };

  const navBtn = (onClick: () => void, Icon: React.ElementType, label: string) => (
    <button
      onClick={nav(onClick)}
      className={`w-full flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${textClass}`}
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
          'fixed inset-y-0 left-0 z-50 w-64 flex flex-col transition-transform duration-300 ease-in-out',
          'md:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        ].join(' ')}
        style={{ backgroundColor: sidebarBg, borderRight: `1px solid ${borderColor}` }}
      >
        <div
          className="flex items-center justify-between px-6 py-5 border-b"
          style={{ borderColor }}
        >
          <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Dashboard</h2>
          <button
            onClick={onClose}
            className={`md:hidden p-1 rounded transition-colors ${textClass}`}
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
            className={`w-full flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${darkMode ? 'text-red-400 hover:text-red-300' : 'text-red-500 hover:text-red-600'}`}
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
