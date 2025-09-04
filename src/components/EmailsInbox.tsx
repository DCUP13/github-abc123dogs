import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Clock, Paperclip, Trash2 } from 'lucide-react';

interface Email {
  id: string;
  sender?: string;
  to_email?: string;
  from_email?: string;
  subject: string;
  body: string;
  attachments?: any[];
  created_at: string;
  sent_at?: string;
  status?: string;
  error_message?: string;
  receiver?: string[];
}

export default function EmailsInbox() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [activeTab, setActiveTab] = useState<'inbox' | 'outbox' | 'sent'>('inbox');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEmails();
  }, [activeTab]);

  const fetchEmails = async () => {
    setLoading(true);
    try {
      let query;
      
      switch (activeTab) {
        case 'inbox':
          query = supabase.from('emails').select('*').order('created_at', { ascending: false });
          break;
        case 'outbox':
          query = supabase.from('email_outbox').select('*').order('created_at', { ascending: false });
          break;
        case 'sent':
          query = supabase.from('email_sent').select('*').order('sent_at', { ascending: false });
          break;
      }

      const { data, error } = await query;
      if (error) throw error;
      
      setEmails(data || []);
    } catch (error) {
      console.error('Error fetching emails:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteEmail = async (emailId: string) => {
    if (!confirm('Are you sure you want to delete this email?')) return;

    try {
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

      const { error } = await supabase.from(tableName).delete().eq('id', emailId);
      if (error) throw error;

      // Refresh emails list
      fetchEmails();
      
      // If the deleted email was selected, clear selection
      if (selectedEmail?.id === emailId) {
        setSelectedEmail(null);
      }
    } catch (error) {
      console.error('Error deleting email:', error);
      alert('Failed to delete email');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getEmailAddress = (email: Email) => {
    if (activeTab === 'inbox') {
      return email.sender || 'Unknown';
    } else {
      return email.to_email || (email.receiver && email.receiver.length > 0 ? email.receiver.join(', ') : 'Unknown');
    }
  };

  const getStatusBadge = (email: Email) => {
    if (activeTab !== 'outbox') return null;
    
    const status = email.status || 'pending';
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      sending: 'bg-blue-100 text-blue-800',
      failed: 'bg-red-100 text-red-800'
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status as keyof typeof colors] || colors.pending}`}>
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'inbox', label: 'Inbox' },
            { key: 'outbox', label: 'Outbox' },
            { key: 'sent', label: 'Sent' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key as any);
                setSelectedEmail(null);
              }}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.key
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex-1 flex">
        {/* Email List */}
        <div className="w-1/3 border-r border-gray-200 overflow-y-auto">
          {emails.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              No emails in {activeTab}
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {emails.map((email) => (
                <div
                  key={email.id}
                  onClick={() => setSelectedEmail(email)}
                  className={`p-4 cursor-pointer hover:bg-gray-50 group ${
                    selectedEmail?.id === email.id ? 'bg-indigo-50 border-r-2 border-indigo-500' : ''
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-medium text-gray-900 truncate flex-1">
                      {getEmailAddress(email)}
                    </div>
                    {getStatusBadge(email)}
                  </div>
                  
                  <div className="text-sm text-gray-600 mb-2 truncate">
                    {email.subject || 'No subject'}
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      {formatDate(email.sent_at || email.created_at)}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteEmail(email.id);
                        }}
                        className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3 h-3 text-red-500 hover:text-red-700" />
                      </button>
                    </div>
                    
                    {email.attachments && email.attachments.length > 0 && (
                      <Paperclip className="w-3 h-3" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Email Detail */}
        <div className="flex-1 flex flex-col">
          {selectedEmail ? (
            <>
              {/* Email Header */}
              <div className="border-b border-gray-200 p-6">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">
                    {selectedEmail.subject || 'No subject'}
                  </h2>
                  <button
                    onClick={() => deleteEmail(selectedEmail.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="space-y-2 text-sm text-gray-600">
                  <div>
                    <span className="font-medium">From:</span> {selectedEmail.from_email || selectedEmail.sender}
                  </div>
                  <div>
                    <span className="font-medium">To:</span> {getEmailAddress(selectedEmail)}
                  </div>
                  <div>
                    <span className="font-medium">Date:</span> {formatDate(selectedEmail.sent_at || selectedEmail.created_at)}
                  </div>
                  {selectedEmail.status && (
                    <div>
                      <span className="font-medium">Status:</span> {getStatusBadge(selectedEmail)}
                    </div>
                  )}
                  {selectedEmail.error_message && (
                    <div className="text-red-600">
                      <span className="font-medium">Error:</span> {selectedEmail.error_message}
                    </div>
                  )}
                </div>
              </div>

              {/* Email Body */}
              <div className="flex-1 p-6 overflow-y-auto">
                <div 
                  className="prose max-w-none"
                  dangerouslySetInnerHTML={{ __html: selectedEmail.body }}
                />
              </div>

              {/* Attachments */}
              {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
                <div className="border-t border-gray-200 p-6">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">
                    Attachments ({selectedEmail.attachments.length})
                  </h3>
                  <div className="space-y-2">
                    {selectedEmail.attachments.map((attachment, index) => (
                      <div key={index} className="flex items-center text-sm text-gray-600">
                        <Paperclip className="w-4 h-4 mr-2" />
                        {attachment.filename || `Attachment ${index + 1}`}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              Select an email to view its contents
            </div>
          )}
        </div>
      </div>
    </div>
  );
}