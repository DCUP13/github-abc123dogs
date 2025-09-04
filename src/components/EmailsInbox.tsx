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
  attachments?: any[];
  created_at: string;
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
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchEmails();
  }, [activeTab]);

  const fetchEmails = async () => {
    setIsLoading(true);
    try {
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
          .order('created_at', { ascending: false });

        if (error) throw error;
        setOutboxEmails(data || []);
      } else if (activeTab === 'sent') {
        const { data, error } = await supabase
          .from('email_sent')
          .select('*')
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

  const handleProcessOutbox = async () => {
    setIsProcessing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const result = await response.json();
        alert(`Processed ${result.processed} emails from outbox`);
        fetchEmails();
      } else {
        throw new Error('Failed to process outbox');
      }
    } catch (error) {
      console.error('Error processing outbox:', error);
      alert('Failed to process outbox emails');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReply = (email: Email, replyAll: boolean = false) => {
    setReplyEmail(email);
    setIsReplyAll(replyAll);
  };

  const handleDeleteEmail = async (emailId: string, table: string) => {
    try {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', emailId);

      if (error) throw error;
      fetchEmails();
    } catch (error) {
      console.error('Error deleting email:', error);
      alert('Failed to delete email');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'sending':
        return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
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
      return emails.length === 0 ? (
        <div className="text-center py-12">
          <Mail className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No emails</h3>
          <p className="text-gray-500 dark:text-gray-400">Your inbox is empty</p>
        </div>
      ) : (
        <div className="space-y-4">
          {emails.map((email) => (
            <div key={email.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 group">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-medium text-gray-900 dark:text-white">{email.sender}</h3>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(email.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    {email.subject || '(No Subject)'}
                  </h4>
                  <div 
                    className="text-gray-600 dark:text-gray-300 text-sm line-clamp-3"
                    dangerouslySetInnerHTML={{ __html: email.body || '' }}
                  />
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
                  <button
                    onClick={() => handleDeleteEmail(email.id, 'emails')}
                    className="p-2 text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (activeTab === 'outbox') {
      return outboxEmails.length === 0 ? (
        <div className="text-center py-12">
          <Send className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No pending emails</h3>
          <p className="text-gray-500 dark:text-gray-400">Your outbox is empty</p>
        </div>
      ) : (
        <div className="space-y-4">
          {outboxEmails.map((email) => (
            <div key={email.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 group">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(email.status)}
                      <span className="text-sm font-medium capitalize text-gray-700 dark:text-gray-300">
                        {email.status}
                      </span>
                    </div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(email.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="mb-2">
                    <span className="text-sm text-gray-500 dark:text-gray-400">To: </span>
                    <span className="text-sm text-gray-900 dark:text-white">{email.to_email}</span>
                  </div>
                  <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    {email.subject || '(No Subject)'}
                  </h4>
                  {email.error_message && (
                    <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm mb-2">
                      <AlertCircle className="w-4 h-4" />
                      {email.error_message}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleDeleteEmail(email.id, 'email_outbox')}
                    className="p-2 text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (activeTab === 'sent') {
      return sentEmails.length === 0 ? (
        <div className="text-center py-12">
          <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No sent emails</h3>
          <p className="text-gray-500 dark:text-gray-400">You haven't sent any emails yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sentEmails.map((email) => (
            <div key={email.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 group">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Sent: {new Date(email.sent_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="mb-2">
                    <span className="text-sm text-gray-500 dark:text-gray-400">To: </span>
                    <span className="text-sm text-gray-900 dark:text-white">{email.to_email}</span>
                  </div>
                  <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    {email.subject || '(No Subject)'}
                  </h4>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleDeleteEmail(email.id, 'email_sent')}
                    className="p-2 text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      );
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
            {activeTab === 'outbox' && outboxEmails.some(email => email.status === 'pending') && (
              <button
                onClick={handleProcessOutbox}
                disabled={isProcessing}
                className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white ${
                  isProcessing 
                    ? 'bg-indigo-400 cursor-wait' 
                    : 'bg-indigo-600 hover:bg-indigo-700'
                } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Process Outbox
                  </>
                )}
              </button>
            )}
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
            {renderEmailList()}
          </div>
        </div>
      </div>

      {showComposeDialog && (
        <ComposeEmailDialog
          onClose={() => setShowComposeDialog(false)}
          onSend={() => {
            setShowComposeDialog(false);
            fetchEmails();
          }}
        />
      )}

      {replyEmail && (
        <ReplyDialog
          originalEmail={replyEmail}
          isReplyAll={isReplyAll}
          onSend={() => {
            setReplyEmail(null);
            fetchEmails();
          }}
          onClose={() => setReplyEmail(null)}
        />
      )}
    </div>
  );
}