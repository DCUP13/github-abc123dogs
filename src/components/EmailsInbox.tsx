import React, { useState, useEffect } from 'react';
import { Mail, Send, Reply, ReplyAll, Trash2, RefreshCw, Plus, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
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
  const [selectedEmail, setSelectedEmail] = useState<Email | OutboxEmail | SentEmail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showComposeDialog, setShowComposeDialog] = useState(false);
  const [showReplyDialog, setShowReplyDialog] = useState(false);
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

  const handleDeleteEmail = async (emailId: string) => {
    if (!window.confirm('Are you sure you want to delete this email?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('emails')
        .delete()
        .eq('id', emailId);

      if (error) throw error;

      setEmails(prev => prev.filter(email => email.id !== emailId));
      
      if (selectedEmail && selectedEmail.id === emailId) {
        setSelectedEmail(null);
      }
    } catch (error) {
      console.error('Error deleting email:', error);
      alert('Failed to delete email. Please try again.');
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
      alert('Failed to process outbox. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReply = (replyAll: boolean = false) => {
    setIsReplyAll(replyAll);
    setShowReplyDialog(true);
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

  const formatEmailList = (emailString: string | string[]): string => {
    if (Array.isArray(emailString)) {
      return emailString.join(', ');
    }
    return emailString;
  };

  const renderEmailList = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      );
    }

    let emailList: (Email | OutboxEmail | SentEmail)[] = [];
    
    if (activeTab === 'inbox') {
      emailList = emails;
    } else if (activeTab === 'outbox') {
      emailList = outboxEmails;
    } else {
      emailList = sentEmails;
    }

    if (emailList.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No emails in {activeTab}
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {emailList.map((email) => (
          <div
            key={email.id}
            onClick={() => setSelectedEmail(email)}
            className="group p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {'status' in email && getStatusIcon(email.status)}
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {email.subject || '(No Subject)'}
                  </h3>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">
                  {activeTab === 'inbox' && (
                    <span>From: {(email as Email).sender}</span>
                  )}
                  {activeTab === 'outbox' && (
                    <span>To: {formatEmailList((email as OutboxEmail).to_email)}</span>
                  )}
                  {activeTab === 'sent' && (
                    <span>To: {formatEmailList((email as SentEmail).to_email)}</span>
                  )}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {activeTab === 'sent' 
                    ? new Date((email as SentEmail).sent_at).toLocaleString()
                    : new Date(email.created_at).toLocaleString()
                  }
                </div>
                {'status' in email && email.status === 'failed' && email.error_message && (
                  <div className="mt-2 text-xs text-red-600 dark:text-red-400">
                    Error: {email.error_message}
                  </div>
                )}
              </div>
              {activeTab === 'inbox' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteEmail(email.id);
                  }}
                  className="ml-4 p-2 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Delete email"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderEmailContent = () => {
    if (!selectedEmail) {
      return (
        <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
          Select an email to view its content
        </div>
      );
    }

    const isInboxEmail = activeTab === 'inbox';
    const email = selectedEmail as Email;

    return (
      <div className="h-full flex flex-col">
        <div className="border-b border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {selectedEmail.subject || '(No Subject)'}
            </h2>
            {isInboxEmail && (
              <div className="flex gap-2">
                <button
                  onClick={() => handleReply(false)}
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg"
                >
                  <Reply className="w-4 h-4 mr-2" />
                  Reply
                </button>
                <button
                  onClick={() => handleReply(true)}
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg"
                >
                  <ReplyAll className="w-4 h-4 mr-2" />
                  Reply All
                </button>
              </div>
            )}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
            {activeTab === 'inbox' && (
              <>
                <div>From: {email.sender}</div>
                <div>To: {formatEmailList(email.receiver)}</div>
              </>
            )}
            {activeTab === 'outbox' && (
              <>
                <div>From: {(selectedEmail as OutboxEmail).from_email}</div>
                <div>To: {formatEmailList((selectedEmail as OutboxEmail).to_email)}</div>
              </>
            )}
            {activeTab === 'sent' && (
              <>
                <div>From: {(selectedEmail as SentEmail).from_email}</div>
                <div>To: {formatEmailList((selectedEmail as SentEmail).to_email)}</div>
              </>
            )}
            <div>
              Date: {activeTab === 'sent' 
                ? new Date((selectedEmail as SentEmail).sent_at).toLocaleString()
                : new Date(selectedEmail.created_at).toLocaleString()
              }
            </div>
          </div>
        </div>
        <div className="flex-1 p-6 overflow-auto">
          <div 
            className="prose dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: selectedEmail.body || 'No content' }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="p-8 bg-white dark:bg-gray-900 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Mail className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Emails</h1>
          </div>
          <div className="flex gap-2">
            {activeTab === 'outbox' && (
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
              {(['inbox', 'outbox', 'sent'] as TabType[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveTab(tab);
                    setSelectedEmail(null);
                  }}
                  className={`px-6 py-4 text-sm font-medium border-b-2 capitalize ${
                    activeTab === tab
                      ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </nav>
          </div>

          <div className="flex h-[600px]">
            <div className="w-1/3 border-r border-gray-200 dark:border-gray-700 overflow-auto">
              <div className="p-4">
                {renderEmailList()}
              </div>
            </div>
            <div className="flex-1">
              {renderEmailContent()}
            </div>
          </div>
        </div>
      </div>

      {showComposeDialog && (
        <ComposeEmailDialog
          onClose={() => setShowComposeDialog(false)}
          onSend={() => {
            setShowComposeDialog(false);
            if (activeTab === 'outbox') {
              fetchEmails();
            }
          }}
        />
      )}

      {showReplyDialog && selectedEmail && activeTab === 'inbox' && (
        <ReplyDialog
          originalEmail={selectedEmail as Email}
          isReplyAll={isReplyAll}
          onSend={() => {
            setShowReplyDialog(false);
            if (activeTab === 'outbox') {
              fetchEmails();
            }
          }}
          onClose={() => setShowReplyDialog(false)}
        />
      )}
    </div>
  );
}