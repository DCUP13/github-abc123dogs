import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface DashboardStats {
  totalEmailsRemaining: number;
  totalEmailAccounts: number;
  totalEmailsSentToday: number;
  totalTemplates: number;
  totalCampaigns: number;
  totalDomains: number;
}

interface DashboardContextType {
  stats: DashboardStats;
  refreshStats: () => Promise<void>;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
}

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [stats, setStats] = useState<DashboardStats>({
    totalEmailsRemaining: 0,
    totalEmailAccounts: 0,
    totalEmailsSentToday: 0,
    totalTemplates: 0,
    totalCampaigns: 0,
    totalDomains: 0
  });
  const [isFetching, setIsFetching] = useState(false);

  const fetchStats = async () => {
    if (isFetching) return;

    setIsFetching(true);
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) return;

      const { data, error } = await supabase
        .from('dashboard_statistics')
        .select('*')
        .eq('user_id', user.data.user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setStats({
          totalEmailsRemaining: data.total_emails_remaining ?? 0,
          totalEmailAccounts: data.total_email_accounts ?? 0,
          totalEmailsSentToday: data.total_emails_sent_today ?? 0,
          totalTemplates: data.total_templates ?? 0,
          totalCampaigns: data.total_campaigns ?? 0,
          totalDomains: data.total_domains || 0
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard statistics:', error);
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    let authSubscription: any = null;
    let channelSubscription: any = null;

    const initializeStats = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session && mounted) {
        await fetchStats();
      }
    };

    initializeStats();

    supabase.auth.onAuthStateChange((event, session) => {
      (async () => {
        if (session && mounted && event === 'SIGNED_IN') {
          await fetchStats();
        } else if (event === 'SIGNED_OUT' && mounted) {
          setStats({
            totalEmailsRemaining: 0,
            totalEmailAccounts: 0,
            totalEmailsSentToday: 0,
            totalTemplates: 0,
            totalCampaigns: 0,
            totalDomains: 0
          });
        }
      })();
    }).then(({ data }) => {
      if (mounted) {
        authSubscription = data.subscription;
      }
    });

    channelSubscription = supabase.channel('dashboard_stats')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'dashboard_statistics'
        },
        (payload) => {
          if (payload.new && mounted) {
            setStats({
              totalEmailsRemaining: payload.new.total_emails_remaining ?? 0,
              totalEmailAccounts: payload.new.total_email_accounts ?? 0,
              totalEmailsSentToday: payload.new.total_emails_sent_today ?? 0,
              totalTemplates: payload.new.total_templates ?? 0,
              totalCampaigns: payload.new.total_campaigns ?? 0,
              totalDomains: payload.new.total_domains ?? 0
            });
          }
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
      if (channelSubscription) {
        channelSubscription.unsubscribe();
      }
    };
  }, []);

  const value = {
    stats,
    refreshStats: fetchStats
  };

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}