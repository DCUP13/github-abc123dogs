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

      const [{ data, error }, { count: promptCount }] = await Promise.all([
        supabase
          .from('dashboard_statistics')
          .select('*')
          .eq('user_id', user.data.user.id)
          .maybeSingle(),
        supabase
          .from('prompts')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.data.user.id),
      ]);

      if (error) throw error;

      if (data) {
        setStats({
          totalEmailsRemaining: data.total_emails_remaining ?? 0,
          totalEmailAccounts: data.total_email_accounts ?? 0,
          totalEmailsSentToday: data.total_emails_sent_today ?? 0,
          totalTemplates: promptCount ?? 0,
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
      try {
        const timeout = new Promise<null>((resolve) => {
          setTimeout(() => resolve(null), 2000);
        });

        const sessionPromise = supabase.auth.getSession();
        const result = await Promise.race([sessionPromise, timeout]);

        if (result && result.data.session && mounted) {
          await fetchStats();
        }
      } catch (error) {
        console.error('Error initializing dashboard stats:', error);
      }
    };

    initializeStats();

    const setupAuthListener = async () => {
      const { data } = await supabase.auth.onAuthStateChange((event, session) => {
        if (!mounted) return;

        if (session && event === 'SIGNED_IN') {
          fetchStats();
        } else if (event === 'SIGNED_OUT') {
          setStats({
            totalEmailsRemaining: 0,
            totalEmailAccounts: 0,
            totalEmailsSentToday: 0,
            totalTemplates: 0,
            totalCampaigns: 0,
            totalDomains: 0
          });
        }
      });

      if (mounted) {
        authSubscription = data.subscription;
      }
    };

    setupAuthListener();

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
            fetchStats();
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'prompts' },
        () => { if (mounted) fetchStats(); }
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