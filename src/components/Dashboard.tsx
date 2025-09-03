import React from 'react';
import { Mail, FileText, Send, Users, Layout } from 'lucide-react';

interface DashboardProps {
  onSignOut: () => void;
  currentView: string;
}

export function Dashboard({ onSignOut, currentView }: DashboardProps) {
  const stats_cards = [
    {
      title: 'Emails Remaining',
      value: '0',
      icon: Mail,
      color: 'text-blue-500',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Email Accounts',
      value: '0',
      icon: Users,
      color: 'text-green-500',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Emails Sent Today',
      value: '0',
      icon: Send,
      color: 'text-purple-500',
      bgColor: 'bg-purple-100',
    },
    {
      title: 'Total Templates',
      value: '0',
      icon: FileText,
      color: 'text-orange-500',
      bgColor: 'bg-orange-100',
    },
    {
      title: 'Total Campaigns',
      value: '0',
      icon: Layout,
      color: 'text-indigo-500',
      bgColor: 'bg-indigo-100',
    },
  ];

  return (
    <div className="p-8 bg-white">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard Overview</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stats_cards.map((card, index) => {
            const Icon = card.icon;
            return (
              <div
                key={index}
                className="bg-white rounded-xl shadow-sm p-6 border border-gray-200"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-lg ${card.bgColor}`}>
                    <Icon className={`w-6 h-6 ${card.color}`} />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">
                      {card.title}
                    </h3>
                    <p className="text-2xl font-semibold text-gray-900 mt-1">
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