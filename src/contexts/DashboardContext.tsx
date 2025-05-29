import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface DashboardStats {
  totalEmailsRemaining: number;
  totalEmailAccounts: number;
  totalEmailsSentToday: number;
  totalTemplates: number;
  totalCampaigns: number;
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
    totalCampaigns: 0
  });

  const fetchStats = async () => {
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
          totalEmailsRemaining: data.total_emails_remaining,
          totalEmailAccounts: data.total_email_accounts,
          totalEmailsSentToday: data.total_emails_sent_today,
          totalTemplates: data.total_templates,
          totalCampaigns: data.total_campaigns
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard statistics:', error);
    }
  };

  useEffect(() => {
    fetchStats();

    // Subscribe to changes in dashboard_statistics
    const statsChannel = supabase.channel('dashboard_stats')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'dashboard_statistics'
      }, () => {
        fetchStats();
      })
      .subscribe();

    // Subscribe to changes in related tables that affect statistics
    const relatedTablesChannel = supabase.channel('related_stats')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'amazon_ses_emails'
      }, () => fetchStats())
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'google_smtp_emails'
      }, () => fetchStats())
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'templates'
      }, () => fetchStats())
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'campaigns'
      }, () => fetchStats())
      .subscribe();

    // Cleanup subscriptions
    return () => {
      statsChannel.unsubscribe();
      relatedTablesChannel.unsubscribe();
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