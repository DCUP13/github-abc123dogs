import React from 'react';
import { Home, Layout, Settings as SettingsIcon, LogOut, FileText, Mail, Inbox, MessageSquare, Users, Calendar as CalendarIcon, HelpCircle, Plug } from 'lucide-react';

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
  onIntegrationsClick
}: SidebarProps) {
  return (
    <div className="h-screen w-64 bg-indigo-800 dark:bg-gray-800 text-white p-6">
      <div className="mb-8">
        <h2 className="text-xl font-bold">Dashboard</h2>
      </div>
      
      <nav className="space-y-2">
        <button 
          onClick={onHomeClick}
          className="w-full flex items-center gap-3 px-4 py-2 text-sm rounded-lg hover:bg-indigo-700 dark:hover:bg-gray-700 transition-colors"
        >
          <Home className="w-4 h-4" />
          Home
        </button>
        
        <button 
          onClick={onEmailsClick}
          className="w-full flex items-center gap-3 px-4 py-2 text-sm rounded-lg hover:bg-indigo-700 dark:hover:bg-gray-700 transition-colors"
        >
          <Inbox className="w-4 h-4" />
          Emails
        </button>

        <button 
          onClick={onAddressesClick}
          className="w-full flex items-center gap-3 px-4 py-2 text-sm rounded-lg hover:bg-indigo-700 dark:hover:bg-gray-700 transition-colors"
        >
          <Mail className="w-4 h-4" />
          Addresses
        </button>
        
        <button 
          onClick={onPromptsClick}
          className="w-full flex items-center gap-3 px-4 py-2 text-sm rounded-lg hover:bg-indigo-700 dark:hover:bg-gray-700 transition-colors"
        >
          <MessageSquare className="w-4 h-4" />
          Prompts
        </button>
        
        <button
          onClick={onCRMClick}
          className="w-full flex items-center gap-3 px-4 py-2 text-sm rounded-lg hover:bg-indigo-700 dark:hover:bg-gray-700 transition-colors"
        >
          <Users className="w-4 h-4" />
          CRM
        </button>

        <button
          onClick={onCalendarClick}
          className="w-full flex items-center gap-3 px-4 py-2 text-sm rounded-lg hover:bg-indigo-700 dark:hover:bg-gray-700 transition-colors"
        >
          <CalendarIcon className="w-4 h-4" />
          Calendar
        </button>

        <button
          onClick={onIntegrationsClick}
          className="w-full flex items-center gap-3 px-4 py-2 text-sm rounded-lg hover:bg-indigo-700 dark:hover:bg-gray-700 transition-colors"
        >
          <Plug className="w-4 h-4" />
          Integrations
        </button>

        <button
          onClick={onSettingsClick}
          className="w-full flex items-center gap-3 px-4 py-2 text-sm rounded-lg hover:bg-indigo-700 dark:hover:bg-gray-700 transition-colors"
        >
          <SettingsIcon className="w-4 h-4" />
          Settings
        </button>

        <button
          onClick={onSupportClick}
          className="w-full flex items-center gap-3 px-4 py-2 text-sm rounded-lg hover:bg-indigo-700 dark:hover:bg-gray-700 transition-colors"
        >
          <HelpCircle className="w-4 h-4" />
          Support
        </button>

        <button 
          onClick={onSignOut}
          className="w-full flex items-center gap-3 px-4 py-2 text-sm rounded-lg hover:bg-indigo-700 dark:hover:bg-gray-700 transition-colors text-red-300 hover:text-red-200"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </nav>
    </div>
  );
}