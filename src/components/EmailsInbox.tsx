import React, { useState, useEffect } from 'react';
import { Mail, Send, Reply, ReplyAll, Trash2, Plus, RefreshCw, Clock, CheckCircle, XCircle, User, Calendar } from 'lucide-react';
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
  attachments?: any[];
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

      // Update local state
      setEmails(prev => prev.filter(email => email.id !== emailId));
      
      // Clear selected email if it was the deleted one
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
          body: JSON.stringify({})
        }
      );

      if (response.ok) {
        const result = await response.json();
        alert(`Processed ${result.processed} emails from outbox`);
        fetchEmails(); // Refresh the current tab
      } else {
        throw new Error('Failed to process outbox');
      }
    } catch (error) {
      console.error('Error processing outbox:', error);
      alert('Failed to process outbox emails. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReply = (isReplyAllMode: boolean = false) => {
    setIsReplyAll(isReplyAllMode);
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderEmailList = () => {
    let emailList: any[] = [];
    
    if (activeTab === 'inbox') {
      emailList = emails;
    } else if (activeTab === 'outbox') {
      emailList = outboxEmails;
    } else {
      emailList = sentEmails;
    }

    if (emailList.length === 0) {
      return (
        <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
          <div className="text-center">
            <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No emails in {activeTab}</p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex-1 overflow-y-auto">
        {emailList.map((email) => (
          <div
            key={email.id}
            onClick={() => setSelectedEmail(email)}
            className={`p-4 border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 group ${
              selectedEmail?.id === email.id ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {activeTab === 'outbox' && getStatusIcon(email.status)}
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <User className="w-4 h-4" />
                    <span className="font-medium">
                      {activeTab === 'inbox' 
                        ? email.sender 
                        : activeTab === 'outbox' 
                          ? `To: ${email.to_email}` 
                          : `To: ${email.to_email}`
                      }
                    </span>
                  </div>
                </div>
                <h3 className="font-medium text-gray-900 dark:text-white truncate">
                  {email.subject || '(No Subject)'}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 truncate mt-1">
                  {email.body?.replace(/<[^>]*>/g, '').substring(0, 100)}...
                </p>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                  <Calendar className="w-3 h-3" />
                  <span>
                    {formatDate(
                      activeTab === 'sent' 
                        ? email.sent_at 
                        : email.created_at
                    )}
                  </span>
                </div>
                {activeTab === 'inbox' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteEmail(email.id);
                    }}
                    className="p-1 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete email"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            {activeTab === 'outbox' && email.status === 'failed' && email.error_message && (
              <div className="mt-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded">
                Error: {email.error_message}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderEmailContent = () => {
    if (!selectedEmail) {
      return (
        <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
          <div className="text-center">
            <Mail className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg">Select an email to view</p>
          </div>
        </div>
      );
    }

    const isInboxEmail = activeTab === 'inbox';
    const email = selectedEmail as any;

    return (
      <div className="flex-1 flex flex-col">
        <div className="border-b border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                {email.subject || '(No Subject)'}
              </h2>
              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-2">
                  <span className="font-medium">From:</span>
                  <span>{isInboxEmail ? email.sender : email.from_email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">To:</span>
                  <span>
                    {isInboxEmail 
                      ? (Array.isArray(email.receiver) ? email.receiver.join(', ') : email.receiver)
                      : email.to_email
                    }
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">Date:</span>
                  <span>
                    {formatDate(
                      activeTab === 'sent' 
                        ? email.sent_at 
                        : email.created_at
                    )}
                  </span>
                </div>
                {activeTab === 'outbox' && (
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Status:</span>
                    <div className="flex items-center gap-1">
                      {getStatusIcon(email.status)}
                      <span className="capitalize">{email.status}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            {isInboxEmail && (
              <div className="flex gap-2 ml-4">
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
        </div>
        
        <div className="flex-1 p-6 overflow-y-auto">
          <div 
            className="prose dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: email.body || 'No content' }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-gray-900">
      <div className="border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Mail className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Emails</h1>
          </div>
          <div className="flex items-center gap-2">
            {activeTab === 'outbox' && (
              <button
                onClick={handleProcessOutbox}
                disabled={isProcessing}
                className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg ${
                  isProcessing
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500'
                    : 'text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/20'
                }`}
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

        <div className="flex space-x-1">
          {(['inbox', 'outbox', 'sent'] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setSelectedEmail(null);
              }}
              className={`px-4 py-2 text-sm font-medium rounded-lg capitalize ${
                activeTab === tab
                  ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-1/3 border-r border-gray-200 dark:border-gray-700 flex flex-col">
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            renderEmailList()
          )}
        </div>

        <div className="flex-1 flex flex-col">
          {renderEmailContent()}
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