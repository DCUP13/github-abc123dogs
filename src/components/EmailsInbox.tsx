import React, { useState, useEffect } from 'react';
import { Inbox, Send, Clock, Mail, Plus, Trash2, Reply, ReplyAll, Eye, X, User, Calendar } from 'lucide-react';
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
  sent_at?: string;
  status?: string;
  error_message?: string;
  reply_to_id?: string;
  attachments?: any[];
}

interface EmailsInboxProps {
  onSignOut: () => void;
  currentView: string;
}

type EmailTab = 'inbox' | 'outbox' | 'sent';

export function EmailsInbox({ onSignOut, currentView }: EmailsInboxProps) {
  const [activeTab, setActiveTab] = useState<EmailTab>('inbox');
  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showComposeDialog, setShowComposeDialog] = useState(false);
  const [showReplyDialog, setShowReplyDialog] = useState(false);
  const [isReplyAll, setIsReplyAll] = useState(false);

  useEffect(() => {
    fetchEmails();
  }, [activeTab]);

  const fetchEmails = async () => {
    setIsLoading(true);
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) return;

      let query;
      switch (activeTab) {
        case 'inbox':
          query = supabase
            .from('emails')
            .select('*')
            .order('created_at', { ascending: false });
          break;
        case 'outbox':
          query = supabase
            .from('email_outbox')
            .select('*')
            .eq('user_id', user.data.user.id)
            .order('created_at', { ascending: false });
          break;
        case 'sent':
          query = supabase
            .from('email_sent')
            .select('*')
            .eq('user_id', user.data.user.id)
            .order('sent_at', { ascending: false });
          break;
      }

      const { data, error } = await query;
      if (error) throw error;

      setEmails(data || []);
    } catch (error) {
      console.error('Error fetching emails:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteEmail = async (email: Email) => {
    if (!window.confirm('Are you sure you want to delete this email?')) {
      return;
    }

    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) {
        throw new Error('User not authenticated');
      }

      let tableName;
      switch (activeTab) {
        case 'inbox':
          tableName = 'emails';
          break;
        case 'outbox':
          tableName = 'email_outbox';
          break;
        case 'sent':
          tableName = 'email_sent';
          break;
      }

      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', email.id);

      if (error) throw error;

      // If we're viewing the deleted email, go back to list
      if (selectedEmail?.id === email.id) {
        setSelectedEmail(null);
      }

      // Refresh the email list
      await fetchEmails();
    } catch (error) {
      console.error('Error deleting email:', error);
      alert('Failed to delete email. Please try again.');
    }
  };

  const handleReply = (isReplyAllMode: boolean = false) => {
    setIsReplyAll(isReplyAllMode);
    setShowReplyDialog(true);
  };

  const handleEmailRefresh = () => {
    fetchEmails();
    setShowComposeDialog(false);
    setShowReplyDialog(false);
  };

  const formatRecipients = (receiver: string | string[]): string => {
    if (Array.isArray(receiver)) {
      return receiver.join(', ');
    }
    return receiver || '';
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/20';
      case 'sending':
        return 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/20';
      case 'failed':
        return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/20';
      default:
        return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-700';
    }
  };

  const tabs = [
    { id: 'inbox', label: 'Inbox', icon: Inbox },
    { id: 'outbox', label: 'Outbox', icon: Clock },
    { id: 'sent', label: 'Sent', icon: Send }
  ];

  if (selectedEmail) {
    return (
      <div className="p-8 bg-white dark:bg-gray-900 min-h-screen">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => setSelectedEmail(null)}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg"
            >
              <X className="w-4 h-4 mr-2" />
              Back to {activeTab}
            </button>
            <div className="flex items-center gap-2">
              {activeTab === 'inbox' && (
                <>
                  <button
                    onClick={() => handleReply(false)}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg"
                  >
                    <Reply className="w-4 h-4 mr-2" />
                    Reply
                  </button>
                  <button
                    onClick={() => handleReply(true)}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg"
                  >
                    <ReplyAll className="w-4 h-4 mr-2" />
                    Reply All
                  </button>
                </>
              )}
              <button
                onClick={() => handleDeleteEmail(selectedEmail)}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 rounded-lg"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                {selectedEmail.subject || '(No Subject)'}
              </h1>
              
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">From:</span>
                  <span className="text-sm text-gray-900 dark:text-white">{selectedEmail.sender}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">To:</span>
                  <span className="text-sm text-gray-900 dark:text-white">
                    {formatRecipients(selectedEmail.receiver)}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {activeTab === 'sent' ? 'Sent:' : 'Received:'}
                  </span>
                  <span className="text-sm text-gray-900 dark:text-white">
                    {new Date(selectedEmail.sent_at || selectedEmail.created_at).toLocaleString()}
                  </span>
                </div>

                {selectedEmail.status && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Status:</span>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedEmail.status)}`}>
                      {selectedEmail.status}
                    </span>
                  </div>
                )}

                {selectedEmail.error_message && (
                  <div className="flex items-start gap-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Error:</span>
                    <span className="text-sm text-red-600 dark:text-red-400">
                      {selectedEmail.error_message}
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-6">
              <div 
                className="prose dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: selectedEmail.body || 'No content' }}
              />
            </div>
          </div>
        </div>

        {showReplyDialog && selectedEmail && (
          <ReplyDialog
            originalEmail={selectedEmail}
            isReplyAll={isReplyAll}
            onSend={handleEmailRefresh}
            onClose={() => setShowReplyDialog(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="p-8 bg-white dark:bg-gray-900 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Mail className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Emails</h1>
          </div>
          <button
            onClick={() => setShowComposeDialog(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <Plus className="w-4 h-4 mr-2" />
            Compose
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as EmailTab)}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 ${
                    activeTab === tab.id
                      ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : emails.length === 0 ? (
              <div className="text-center py-12">
                <Mail className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No emails in {activeTab}
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  {activeTab === 'inbox' && 'No emails received yet'}
                  {activeTab === 'outbox' && 'No emails in outbox'}
                  {activeTab === 'sent' && 'No emails sent yet'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {emails.map((email) => (
                  <div
                    key={email.id}
                    className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg cursor-pointer group"
                    onClick={() => setSelectedEmail(email)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {activeTab === 'inbox' ? email.sender : formatRecipients(email.receiver)}
                          </span>
                        </div>
                        {email.status && (
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(email.status)}`}>
                            {email.status}
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {email.subject || '(No Subject)'}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-1">
                        {email.body?.replace(/<[^>]*>/g, '') || 'No content'}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                        {new Date(email.sent_at || email.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEmail(email);
                        }}
                        className="p-2 text-gray-400 hover:text-indigo-500 dark:text-gray-500 dark:hover:text-indigo-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600"
                        title="View email"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteEmail(email);
                        }}
                        className="p-2 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600"
                        title="Delete email"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showComposeDialog && (
        <ComposeEmailDialog
          onClose={() => setShowComposeDialog(false)}
          onSend={handleEmailRefresh}
        />
      )}
    </div>
  );
}