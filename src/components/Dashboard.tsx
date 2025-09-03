import React from 'react';
import { Mail, FileText, Send, Users, Layout } from 'lucide-react';

interface DashboardProps {
  onSignOut: () => void;
  currentView: string;
}

export function Dashboard({ onSignOut, currentView }: DashboardProps) {
  const stats = {
    totalEmailsRemaining: 0,
    totalEmailAccounts: 0,
    totalEmailsSentToday: 0,
    totalTemplates: 0,
    totalCampaigns: 0
  };

  const stats_cards = [
    {
      title: 'Emails Remaining',
      value: stats.totalEmailsRemaining.toLocaleString(),
      icon: Mail,
      color: 'text-blue-500',
      bgColor: 'bg-blue-100 dark:bg-blue-900/20',
    },
    {
      title: 'Email Accounts',
      value: stats.totalEmailAccounts.toLocaleString(),
      icon: Users,
      color: 'text-green-500',
      bgColor: 'bg-green-100 dark:bg-green-900/20',
    },
    {
      title: 'Emails Sent Today',
      value: stats.totalEmailsSentToday.toLocaleString(),
      icon: Send,
      color: 'text-purple-500',
      bgColor: 'bg-purple-100 dark:bg-purple-900/20',
    },
    {
      title: 'Total Templates',
      value: stats.totalTemplates.toLocaleString(),
      icon: FileText,
      color: 'text-orange-500',
      bgColor: 'bg-orange-100 dark:bg-orange-900/20',
    },
    {
      title: 'Total Campaigns',
      value: stats.totalCampaigns.toLocaleString(),
      icon: Layout,
      color: 'text-indigo-500',
      bgColor: 'bg-indigo-100 dark:bg-indigo-900/20',
    },
  ];

  return (
    <div className="p-8 bg-white dark:bg-gray-900">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white dark:text-white mb-8">Dashboard Overview</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stats_cards.map((card, index) => {
            const Icon = card.icon;
            return (
              <div
                key={index}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-lg ${card.bgColor}`}>
                    <Icon className={`w-6 h-6 ${card.color}`} />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      {card.title}
                    </h3>
                    <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
                      {card.value}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}