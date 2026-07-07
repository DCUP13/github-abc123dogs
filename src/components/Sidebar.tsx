import React, { useContext, useEffect, useRef, useState } from 'react';
import { Home, Settings as SettingsIcon, LogOut, Mail, Inbox, MessageSquare, Users, Calendar as CalendarIcon, HelpCircle, Plug, X } from 'lucide-react';
import { ThemeContext } from '../App';
import { supabase } from '../lib/supabase';

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
  isSupportAdmin?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
}

function useTeamUnread() {
  const [count, setCount] = useState(0);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const fetchIdRef = useRef(0);

  useEffect(() => {
    let uid: string | null = null;
    let mounted = true;

    async function fetchCount() {
      if (!uid) return;
      const id = ++fetchIdRef.current;
      const { data } = await supabase.rpc('get_team_unread_count', { uid });
      if (mounted && id === fetchIdRef.current) setCount(data ?? 0);
    }

    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user || !mounted) return;
      uid = user.id;
      await fetchCount();

      channelRef.current = supabase.channel('sidebar-team-unread')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'team_messages' }, fetchCount)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'team_conversations' }, fetchCount)
        .subscribe();
    }

    init();
    return () => {
      mounted = false;
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, []);

  return count;
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
  isSupportAdmin = false,
  isOpen = false,
  onClose,
}: SidebarProps) {
  const { darkMode } = useContext(ThemeContext);
  const teamUnread = useTeamUnread();

  const sidebarBg   = darkMode ? 'var(--sb-bg-d)' : 'var(--sb-bg)';
  const hoverBg     = darkMode ? 'var(--sb-hover-d)' : 'var(--sb-hover)';
  const borderColor = 'var(--sb-border)';

  const nav = (handler: () => void) => () => {
    handler();
    onClose?.();
  };

  // Full nav button — shows icon + label. Used at lg+
  const navBtn = (onClick: () => void, Icon: React.ElementType, label: string, badge?: number) => (
    <button
      key={label}
      onClick={nav(onClick)}
      className="w-full flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors"
      onMouseEnter={e => (e.currentTarget.style.backgroundColor = hoverBg)}
      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
      title={label}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span className="flex-1 text-left truncate">{label}</span>
      {!!badge && badge > 0 && (
        <span className="flex-shrink-0 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center px-1 leading-none">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </button>
  );

  // Icon-only nav button — used at sm–lg
  const iconBtn = (onClick: () => void, Icon: React.ElementType, label: string, badge?: number) => (
    <button
      key={label}
      onClick={nav(onClick)}
      className="relative w-full flex items-center justify-center py-2.5 rounded-lg transition-colors"
      onMouseEnter={e => (e.currentTarget.style.backgroundColor = hoverBg)}
      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
      title={label}
      aria-label={label}
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      {!!badge && badge > 0 && (
        <span className="absolute top-1 right-1 min-w-[14px] h-[14px] rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center px-0.5 leading-none">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </button>
  );

  const navItems = [
    { onClick: onHomeClick,         Icon: Home,          label: 'Home' },
    { onClick: onEmailsClick,       Icon: Inbox,         label: 'Emails' },
    { onClick: onAddressesClick,    Icon: Mail,          label: 'Addresses' },
    { onClick: onPromptsClick,      Icon: MessageSquare, label: 'Prompts' },
    { onClick: onCRMClick,          Icon: Users,         label: 'CRM' },
    { onClick: onCalendarClick,     Icon: CalendarIcon,  label: 'Calendar' },
    { onClick: onIntegrationsClick, Icon: Plug,          label: 'Integrations' },
    ...(onTeamClick ? [{ onClick: onTeamClick, Icon: Users, label: 'Team', badge: teamUnread > 0 ? teamUnread : undefined }] : []),
    { onClick: onSettingsClick,     Icon: SettingsIcon,  label: 'Settings' },
  ] as const;

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 sm:hidden"
          onClick={onClose}
        />
      )}

      {/* ── DESKTOP SIDEBAR ─────────────────────────────────── */}
      {/* Hidden below sm. Icon-only sm→lg. Full labels at lg+  */}
      <div
        className="hidden sm:flex fixed inset-y-0 left-0 z-50 flex-col transition-all duration-200 ease-in-out
                   w-14 lg:w-56 xl:w-64"
        style={{ backgroundColor: sidebarBg }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-center lg:justify-start px-0 lg:px-5 py-5 border-b overflow-hidden"
          style={{ borderColor }}
        >
          <span className="hidden lg:block text-lg xl:text-xl font-bold text-white truncate">Dashboard</span>
          {/* Icon-only header: show a small logo-ish dot */}
          <span className="lg:hidden w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold text-white select-none">D</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-1 lg:px-3 py-4 space-y-1">
          {navItems.map(({ onClick, Icon, label, badge }) => (
            <React.Fragment key={label}>
              <span className="hidden lg:block">
                {navBtn(onClick as () => void, Icon, label, (badge as number | undefined))}
              </span>
              <span className="lg:hidden">
                {iconBtn(onClick as () => void, Icon, label, (badge as number | undefined))}
              </span>
            </React.Fragment>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-1 lg:px-3 py-4 border-t space-y-1" style={{ borderColor }}>
          <span className="hidden lg:block">
            {navBtn(onSupportClick, HelpCircle, isSupportAdmin ? 'Support Admin' : 'Support')}
          </span>
          <span className="lg:hidden">
            {iconBtn(onSupportClick, HelpCircle, isSupportAdmin ? 'Support Admin' : 'Support')}
          </span>

          <button
            onClick={nav(onSignOut)}
            className="w-full flex items-center justify-center lg:justify-start gap-3 px-0 lg:px-4 py-2 text-sm rounded-lg transition-colors text-red-300 hover:text-red-200"
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = hoverBg)}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut className="w-4 h-4 lg:w-4 lg:h-4 flex-shrink-0" />
            <span className="hidden lg:inline">Sign out</span>
          </button>
        </div>
      </div>

      {/* ── MOBILE DRAWER ────────────────────────────────────── */}
      {/* Full sidebar that slides in below sm breakpoint       */}
      <div
        className={[
          'sm:hidden fixed inset-y-0 left-0 z-50 w-64 text-white flex flex-col transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
        style={{ backgroundColor: sidebarBg }}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b" style={{ borderColor }}>
          <h2 className="text-xl font-bold">Dashboard</h2>
          <button
            onClick={onClose}
            className="p-1 rounded transition-colors"
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = hoverBg)}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navItems.map(({ onClick, Icon, label, badge }) =>
            navBtn(onClick as () => void, Icon, label, (badge as number | undefined))
          )}
        </nav>

        <div className="px-3 py-4 border-t space-y-1" style={{ borderColor }}>
          {navBtn(onSupportClick, HelpCircle, isSupportAdmin ? 'Support Admin' : 'Support')}
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
