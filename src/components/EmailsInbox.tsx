import React, { useState, useEffect } from 'react';
import { Mail, Paperclip, Search, RefreshCw, Clock, User, ArrowLeft, Reply, Send, Inbox, Inbox as Outbox } from 'lucide-react'../lib/supabase';

interface EmailsInboxProps {
  onSignOut: () => void;
  currentView: string;
}

interface Email {
  id: string;
  sender: string;
  receiver: string;
  subject: string;
  body: string;
  attachments: any;
  created_at: string;
}

export function EmailsInbox({ onSignOut, currentView }: EmailsInboxProps) {
  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchEmails();
  }, []);

  const fetchEmails = async () => {
    try {
      const { data, error } = await supabase
        .from('emails')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEmails(data || []);
    } catch (error) {
      console.error('Error fetching emails:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    setIsLoading(true);
    fetchEmails();
  };

  const filteredEmails = emails.filter(email =>
    email.sender.toLowerCase().includes(searchQuery.toLowerCase()) ||
    email.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    email.receiver?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 24 * 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const truncateText = (text: string, maxLength: number) => {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  const hasAttachments = (attachments: any) => {
    return attachments && Array.isArray(attachments) && attachments.length > 0;
  };

  const getAttachmentIcon = (contentType: string) => {
    if (contentType.includes('pdf')) {
      return '📄';
    } else if (contentType.includes('word') || contentType.includes('document')) {
      return '📝';
    } else if (contentType.includes('image')) {
      return '🖼️';
    } else if (contentType.includes('excel') || contentType.includes('spreadsheet')) {
      return '📊';
    } else if (contentType.includes('text') || contentType.includes('plain')) {
      return '📃';
    } else if (contentType.includes('zip') || contentType.includes('compressed')) {
      return '🗜️';
    } else if (contentType.includes('video')) {
      return '🎥';
    } else if (contentType.includes('audio')) {
      return '🎵';
    } else if (contentType.includes('presentation') || contentType.includes('powerpoint')) {
      return '📊';
    } else {
      return '📎';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDownloadAttachment = async (attachment: any) => {
    try {
      if (!selectedEmail) return;

      // Get the current user's session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('You must be logged in to download attachments');
        return;
      }

      // Call the Supabase Edge Function to get presigned URL
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/download-attachment?s3_url=${encodeURIComponent(attachment.s3_url)}&email_id=${selectedEmail.id}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate download URL');
      }

      const { downloadUrl, filename } = await response.json();
      
      // Create a temporary link to trigger download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (error) {
      console.error('Error downloading attachment:', error);
      alert(`Failed to download attachment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 bg-white dark:bg-gray-900 min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 bg-white dark:bg-gray-900 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {!selectedEmail ? (
          <>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Mail className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Emails</h1>
              </div>
              <button
                onClick={handleRefresh}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg shadow-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </button>
            </div>

            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search emails..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
              {filteredEmails.length === 0 ? (
                <div className="text-center py-12">
                  <Mail className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    {emails.length === 0 ? 'No emails yet' : 'No emails found'}
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    {emails.length === 0 
                      ? 'Emails will appear here when they are received'
                      : 'Try adjusting your search criteria'
                    }
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredEmails.map((email) => (
                    <div
                      key={email.id}
                      onClick={() => setSelectedEmail(email)}
                      className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-gray-400" />
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {email.sender}
                              </span>
                            </div>
                            {email.receiver && (
                              <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                <span>to</span>
                                <span>{email.receiver}</span>
                              </div>
                            )}
                            {hasAttachments(email.attachments) && (
                              <Paperclip className="w-4 h-4 text-gray-400" />
                            )}
                          </div>
                          <div className="mb-1">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {email.subject || '(No Subject)'}
                            </span>
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {truncateText(email.body, 100)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                            <Clock className="w-3 h-3" />
                            {formatDate(email.created_at)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => setSelectedEmail(null)}
                  className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to inbox
                </button>
                <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                  <Clock className="w-4 h-4" />
                  {new Date(selectedEmail.created_at).toLocaleString()}
                </div>
              </div>
              
              <div className="space-y-3">
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {selectedEmail.subject || '(No Subject)'}
                </h1>
                
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 dark:text-gray-400">From:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {selectedEmail.sender}
                    </span>
                  </div>
                  {selectedEmail.receiver && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 dark:text-gray-400">To:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {selectedEmail.receiver}
                      </span>
                    </div>
                  )}
                </div>

                {hasAttachments(selectedEmail.attachments) && (
                  <div className="flex items-center gap-2 text-sm">
                    <Paperclip className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-500 dark:text-gray-400">
                      {selectedEmail.attachments.length} attachment{selectedEmail.attachments.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6">
              <div className="prose dark:prose-invert max-w-none">
                <div className="whitespace-pre-wrap text-gray-900 dark:text-white">
                  {selectedEmail.body || 'No content available'}
                </div>
              </div>

              {hasAttachments(selectedEmail.attachments) && (
                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                    Attachments ({selectedEmail.attachments.length})
                  </h3>
                  <div className="space-y-2">
                    {selectedEmail.attachments.map((attachment: any, index: number) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-lg">
                            {getAttachmentIcon(attachment.contentType)}
                          </span>
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {attachment.filename}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {formatFileSize(attachment.size)} • {attachment.contentType.split('/')[1].toUpperCase()}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDownloadAttachment(attachment)}
                          className="inline-flex items-center px-3 py-1 text-xs font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                        >
                          Download
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}