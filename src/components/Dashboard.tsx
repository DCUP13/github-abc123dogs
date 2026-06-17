import React, { useState, useEffect } from 'react';
import { Mail, FileText, Send, Users, Globe, UserPlus, ChevronDown, ChevronUp } from 'lucide-react';
import { useDashboard } from '../contexts/DashboardContext';
import { supabase } from '../lib/supabase';

interface DashboardProps {
  onSignOut: () => void;
  currentView: string;
}

interface DetailItem {
  primary: string;
  secondary?: string;
}

interface StatCard {
  title: string;
  value: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  details: DetailItem[];
  overflow: number;
}

const MAX_ITEMS = 5;

export function Dashboard({ onSignOut, currentView }: DashboardProps) {
  const { stats } = useDashboard();

  const [teamData, setTeamData] = useState<{
    memberCount: number;
    pendingInvites: number;
    isManagerOrOwner: boolean;
    members: { email: string; name?: string; role: string }[];
    invitations: { email: string }[];
  }>({ memberCount: 0, pendingInvites: 0, isManagerOrOwner: false, members: [], invitations: [] });

  const [sesEmails, setSesEmails] = useState<{ address: string; sent_emails: number; daily_limit: number }[]>([]);
  const [googleEmails, setGoogleEmails] = useState<{ address: string; sent_emails: number; daily_limit: number }[]>([]);
  const [domains, setDomains] = useState<{ domain: string }[]>([]);
  const [prompts, setPrompts] = useState<{ title: string; category: string }[]>([]);

  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [sesRes, googleRes, domainsRes, promptsRes, memberRes] = await Promise.all([
        supabase.from('amazon_ses_emails').select('address, sent_emails, daily_limit').eq('user_id', user.id),
        supabase.from('google_smtp_emails').select('address, sent_emails, daily_limit').eq('user_id', user.id),
        supabase.from('amazon_ses_domains').select('domain').eq('user_id', user.id),
        supabase.from('prompts').select('title, category').eq('user_id', user.id).order('updated_at', { ascending: false }),
        supabase.from('organization_members').select('organization_id, role').eq('user_id', user.id).maybeSingle(),
      ]);

      setSesEmails(sesRes.data || []);
      setGoogleEmails(googleRes.data || []);
      setDomains(domainsRes.data || []);
      setPrompts(promptsRes.data || []);

      const member = memberRes.data;
      if (!member) return;

      const isManagerOrOwner = member.role === 'owner' || member.role === 'manager';

      const [membersRes, invitesRes] = await Promise.all([
        supabase
          .from('organization_members_with_emails')
          .select('email, name, role')
          .eq('organization_id', member.organization_id)
          .order('joined_at', { ascending: false }),
        supabase
          .from('member_invitations')
          .select('email')
          .eq('organization_id', member.organization_id)
          .eq('status', 'pending'),
      ]);

      setTeamData({
        memberCount: membersRes.data?.length || 0,
        pendingInvites: invitesRes.data?.length || 0,
        isManagerOrOwner,
        members: membersRes.data || [],
        invitations: invitesRes.data || [],
      });
    };

    load();
  }, []);

  const allAccounts = [
    ...sesEmails.map(e => ({ address: e.address, sent: e.sent_emails, limit: e.daily_limit, type: 'SES' })),
    ...googleEmails.map(e => ({ address: e.address, sent: e.sent_emails, limit: e.daily_limit, type: 'Gmail' })),
  ];

  function buildDetails(items: DetailItem[], total: number) {
    return { shown: items.slice(0, MAX_ITEMS), overflow: Math.max(0, total - MAX_ITEMS) };
  }

  const accountDetails = buildDetails(
    allAccounts.map(a => ({ primary: a.address, secondary: a.type })),
    allAccounts.length
  );

  const remainingDetails = buildDetails(
    allAccounts.map(a => {
      const remaining = Math.max(0, (a.limit || 0) - (a.sent || 0));
      return { primary: a.address, secondary: `${remaining.toLocaleString()} remaining` };
    }),
    allAccounts.length
  );

  const sentTodayDetails = buildDetails(
    allAccounts.map(a => ({ primary: a.address, secondary: `${(a.sent || 0).toLocaleString()} sent` })),
    allAccounts.length
  );

  const domainDetails = buildDetails(
    domains.map(d => ({ primary: d.domain })),
    domains.length
  );

  const promptDetails = buildDetails(
    prompts.map(p => ({ primary: p.title, secondary: p.category })),
    prompts.length
  );

  const memberDetails = buildDetails(
    teamData.members.map(m => ({ primary: m.name || m.email || 'Unknown', secondary: m.role })),
    teamData.members.length
  );

  const inviteDetails = buildDetails(
    teamData.invitations.map(i => ({ primary: i.email })),
    teamData.invitations.length
  );

  const stats_cards: StatCard[] = [
    {
      title: 'Emails Remaining',
      value: stats.totalEmailsRemaining.toLocaleString(),
      icon: Mail,
      color: 'text-blue-500',
      bgColor: 'bg-blue-100 dark:bg-blue-900/20',
      details: remainingDetails.shown,
      overflow: remainingDetails.overflow,
    },
    {
      title: 'Email Accounts',
      value: stats.totalEmailAccounts.toLocaleString(),
      icon: Users,
      color: 'text-green-500',
      bgColor: 'bg-green-100 dark:bg-green-900/20',
      details: accountDetails.shown,
      overflow: accountDetails.overflow,
    },
    {
      title: 'Emails Sent Today',
      value: stats.totalEmailsSentToday.toLocaleString(),
      icon: Send,
      color: 'text-purple-500',
      bgColor: 'bg-purple-100 dark:bg-purple-900/20',
      details: sentTodayDetails.shown,
      overflow: sentTodayDetails.overflow,
    },
    {
      title: 'Total Prompts',
      value: stats.totalTemplates.toLocaleString(),
      icon: FileText,
      color: 'text-orange-500',
      bgColor: 'bg-orange-100 dark:bg-orange-900/20',
      details: promptDetails.shown,
      overflow: promptDetails.overflow,
    },
    {
      title: 'Total Domains',
      value: stats.totalDomains.toLocaleString(),
      icon: Globe,
      color: 'text-teal-500',
      bgColor: 'bg-teal-100 dark:bg-teal-900/20',
      details: domainDetails.shown,
      overflow: domainDetails.overflow,
    },
    ...(teamData.isManagerOrOwner ? [
      {
        title: 'Team Members',
        value: teamData.memberCount.toLocaleString(),
        icon: Users,
        color: 'text-indigo-500',
        bgColor: 'bg-indigo-100 dark:bg-indigo-900/20',
        details: memberDetails.shown,
        overflow: memberDetails.overflow,
      },
      {
        title: 'Pending Invites',
        value: teamData.pendingInvites.toLocaleString(),
        icon: UserPlus,
        color: 'text-yellow-500',
        bgColor: 'bg-yellow-100 dark:bg-yellow-900/20',
        details: inviteDetails.shown,
        overflow: inviteDetails.overflow,
      },
    ] : []),
  ];

  const toggleExpanded = (index: number) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      next.has(index) ? next.delete(index) : next.add(index);
      return next;
    });
  };

  const isOpen = (index: number) => expandedCards.has(index) || hoveredCard === index;

  return (
    <div className="p-4 md:p-8 app-bg min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-xl md:text-2xl md:text-3xl font-bold text-black dark:text-white mb-8">Dashboard Overview</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stats_cards.map((card, index) => {
            const Icon = card.icon;
            const open = isOpen(index);
            const hasDetails = card.details.length > 0;

            return (
              <div
                key={index}
                className="app-card rounded-xl shadow-sm p-6 transition-shadow duration-200 hover:shadow-md cursor-default"
                onMouseEnter={() => hasDetails && setHoveredCard(index)}
                onMouseLeave={() => setHoveredCard(null)}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-lg ${card.bgColor}`}>
                      <Icon className={`w-6 h-6 ${card.color}`} />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        {card.title}
                      </h3>
                      <p className="text-xl md:text-2xl font-semibold text-gray-900 dark:text-white mt-1">
                        {card.value}
                      </p>
                    </div>
                  </div>

                  {hasDetails && (
                    <button
                      className="md:hidden ml-auto p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      onClick={() => toggleExpanded(index)}
                      aria-label={open ? 'Collapse' : 'Expand'}
                    >
                      {expandedCards.has(index) ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  )}
                </div>

                {hasDetails && (
                  <div
                    className={`overflow-hidden transition-all duration-200 ${open ? 'max-h-64 opacity-100 mt-3' : 'max-h-0 opacity-0'}`}
                  >
                    <div className="pt-3 border-t border-gray-100 dark:border-gray-700 space-y-1.5">
                      {card.details.map((item, i) => (
                        <div key={i} className="flex items-center justify-between gap-2">
                          <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{item.primary}</span>
                          {item.secondary && (
                            <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0 capitalize">{item.secondary}</span>
                          )}
                        </div>
                      ))}
                      {card.overflow > 0 && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 pt-1">
                          +{card.overflow} more
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
