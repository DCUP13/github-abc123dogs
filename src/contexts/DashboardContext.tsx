import React, { createContext, useContext, useState } from 'react';

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

  const refreshStats = async () => {
    // Simple refresh function - can be implemented later
    console.log('Refreshing stats...');
  };

  const value = {
    stats,
    refreshStats
  };

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}