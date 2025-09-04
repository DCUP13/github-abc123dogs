import React, { useState, useEffect } from 'react';
import { Mail, Send, Reply, ReplyAll, Trash2, Plus, RefreshCw, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ComposeEmailDialog } from './ComposeEmailDialog';
import { ReplyDialog } from './ReplyDialog';

interface Email {
  id: string;
  sender: string;
  receiver: string | string[];
  subject: string;
  body: string;
  created_at: string;
  attachments?: any[];
}

interface OutboxEmail {
  id: string;
  to_email: string;
  from_email: string;
  subject: string;
  body: string;
  status: 'pending' | 'sending' | 'failed';
  error_message?: string;
  created_at: string;
  updated_at: string;
}

interface SentEmail {
  id: string;
  to_email: string;
  from_email: string;
  subject: string;
  body: string;
  sent_at: string;
  created_at: string;
}

interface EmailsInboxProps {
  onSignOut: () => void;
  currentView: string;
}

type TabType = 'inbox' | 'outbox' | 'sent';

export function EmailsInbox({ onSignOut, currentView }: EmailsInboxProps) {
  const [activeTab, setActiveTab] = useState<TabType>('inbox');
  const [emails, setEmails] = useState<Email[]>([]);
  const [outboxEmails, setOutboxEmails] = useState<OutboxEmail[]>([]);
  const [sentEmails, setSentEmails] = useState<SentEmail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showComposeDialog, setShowComposeDialog] = useState(false);
  const [replyEmail, setReplyEmail] = useState<Email | null>(null);
  const [isReplyAll, setIsReplyAll] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchEmails();
  }, [activeTab]);

  const fetchEmails = async () => {
    setIsLoading(true);
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) {
        throw new Error('User not authenticated');
      }

      if (activeTab === 'inbox') {
        const { data, error } = await supabase
          .from('emails')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setEmails(data || []);
      } else if (activeTab === 'outbox') {
        const { data, error } = await supabase
          .from('email_outbox')
          .select('*')
          .eq('user_id', user.data.user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setOutboxEmails(data || []);
      } else if (activeTab === 'sent') {
        const { data, error } = await supabase
          .from('email_sent')
          .select('*')
          .eq('user_id', user.data.user.id)
          .order('sent_at', { ascending: false });

        if (error) throw error;
        setSentEmails(data || []);
      }
    } catch (error) {
      console.error('Error fetching emails:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteEmail = async (emailId: string, emailType: TabType) => {
    if (!window.confirm('Are you sure you want to delete this email?')) {
      return;
    }

    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) {
        throw new Error('User not authenticated');
      }

      let error;
      if (emailType === 'inbox') {
        ({ error } = await supabase
          .from('emails')
          .delete()
          .eq('id', emailId));
      } else if (emailType === 'outbox') {
        ({ error } = await supabase
          .from('email_outbox')
          .delete()
          .eq('id', emailId)
          .eq('user_id', user.data.user.id));
      } else if (emailType === 'sent') {
        ({ error } = await supabase
          .from('email_sent')
          .delete()
          .eq('id', emailId)
          .eq('user_id', user.data.user.id));
      }

      if (error) throw error;
      await fetchEmails();
    } catch (error) {
      console.error('Error deleting email:', error);
      alert('Failed to delete email. Please try again.');
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchEmails();
    setIsRefreshing(false);
  };

  const handleReply = (email: Email, replyAll: boolean = false) => {
    setReplyEmail(email);
    setIsReplyAll(replyAll);
  };

  const handleSendEmail = async () => {
    await fetchEmails();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'sending':
        return <Send className="w-4 h-4 text-blue-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const truncateText = (text: string, maxLength: number = 100) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const renderEmailList = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      );
    }

    if (activeTab === 'inbox') {
      if (emails.length === 0) {
        return (
          <div className="text-center py-12">
            <Mail className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No emails</h3>
            <p className="text-gray-500 dark:text-gray-400">Your inbox is empty</p>
          </div>
        );
      }

      return emails.map((email) => (
        <div key={email.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 group hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  {email.subject || '(No Subject)'}
                </h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                From: {email.sender}
              </p>
              <p className="text-gray-700 dark:text-gray-300 mb-3">
                {truncateText(email.body?.replace(/<[^>]*>/g, '') || '')}
              </p>
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formatDate(email.created_at)}
                </p>
                <button
                  onClick={() => handleDeleteEmail(email.id, 'inbox')}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400"
                  title="Delete email"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex gap-2 ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => handleReply(email, false)}
                className="p-2 text-gray-400 hover:text-indigo-500 dark:hover:text-indigo-400 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                title="Reply"
              >
                <Reply className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleReply(email, true)}
                className="p-2 text-gray-400 hover:text-indigo-500 dark:hover:text-indigo-400 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                title="Reply All"
              >
                <ReplyAll className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ));
    }

    if (activeTab === 'outbox') {
      if (outboxEmails.length === 0) {
        return (
          <div className="text-center py-12">
            <Send className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No outbox emails</h3>
            <p className="text-gray-500 dark:text-gray-400">No emails waiting to be sent</p>
          </div>
        );
      }

      return outboxEmails.map((email) => (
        <div key={email.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 group hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                {getStatusIcon(email.status)}
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  {email.subject || '(No Subject)'}
                </h3>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  email.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' :
                  email.status === 'sending' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' :
                  'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                }`}>
                  {email.status}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                To: {email.to_email}
              </p>
              <p className="text-gray-700 dark:text-gray-300 mb-3">
                {truncateText(email.body?.replace(/<[^>]*>/g, '') || '')}
              </p>
              {email.error_message && (
                <div className="mb-3 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    <p className="text-sm text-red-700 dark:text-red-400">
                      {email.error_message}
                    </p>
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Created: {formatDate(email.created_at)}
                </p>
                <button
                  onClick={() => handleDeleteEmail(email.id, 'outbox')}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400"
                  title="Delete email"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      ));
    }

    if (activeTab === 'sent') {
      if (sentEmails.length === 0) {
        return (
          <div className="text-center py-12">
            <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No sent emails</h3>
            <p className="text-gray-500 dark:text-gray-400">No emails have been sent yet</p>
          </div>
        );
      }

      return sentEmails.map((email) => (
        <div key={email.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 group hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  {email.subject || '(No Subject)'}
                </h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                To: {email.to_email}
              </p>
              <p className="text-gray-700 dark:text-gray-300 mb-3">
                {truncateText(email.body?.replace(/<[^>]*>/g, '') || '')}
              </p>
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Sent: {formatDate(email.sent_at)}
                </p>
                <button
                  onClick={() => handleDeleteEmail(email.id, 'sent')}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400"
                  title="Delete email"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      ));
    }
  };

  return (
    <div className="p-8 bg-white dark:bg-gray-900 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Mail className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Emails</h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg shadow-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={() => setShowComposeDialog(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <Plus className="w-4 h-4 mr-2" />
              Compose
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex">
              {[
                { id: 'inbox', label: 'Inbox', count: emails.length },
                { id: 'outbox', label: 'Outbox', count: outboxEmails.length },
                { id: 'sent', label: 'Sent', count: sentEmails.length }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 ${
                    activeTab === tab.id
                      ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      activeTab === tab.id
                        ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-400'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            <div className="space-y-4">
              {renderEmailList()}
            </div>
          </div>
        </div>
      </div>

      {showComposeDialog && (
        <ComposeEmailDialog
          onClose={() => setShowComposeDialog(false)}
          onSend={handleSendEmail}
        />
      )}

      {replyEmail && (
        <ReplyDialog
          originalEmail={replyEmail}
          isReplyAll={isReplyAll}
          onSend={handleSendEmail}
          onClose={() => {
            setReplyEmail(null);
            setIsReplyAll(false);
          }}
        />
      )}
    </div>
  );
}