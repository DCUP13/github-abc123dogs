import React, { useState, useEffect } from 'react';
import { Mail, Paperclip, Search, RefreshCw, Clock, User, ArrowLeft, Reply, Send, Inbox, Inbox as Outbox, Plus, MessageSquare, ToggleLeft, ToggleRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ReplyDialog } from './ReplyDialog';
import { ComposeEmailDialog } from './ComposeEmailDialog';
import { EditDraftDialog } from './EditDraftDialog';
import { useEmails } from '../contexts/EmailContext';

function formatPlainTextEmail(text: string): string {
  if (!text) return '<p style="color: #9CA3AF;">No content available</p>';

  const hasHtmlTags = /<(p|div|br|span|html|body|table|tr|td|strong|em|b|i|ul|ol|li|h[1-6])[>\s]/i.test(text);
  console.log('Has HTML tags?', hasHtmlTags, 'Text preview:', text.substring(0, 100));

  if (hasHtmlTags) {
    console.log('Returning original HTML');
    return text;
  }

  console.log('Formatting plain text email');

  const escapeHtml = (str: string) => str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const lines = text.split('\n');
  const processedLines = lines.map(line => {
    if (/^>+\s*/.test(line)) {
      const match = line.match(/^(>+)\s*(.*)$/);
      if (match) {
        const level = match[1].length;
        const content = escapeHtml(match[2]);
        const colors = ['#818CF8', '#A78BFA', '#C4B5FD'];
        const color = colors[Math.min(level - 1, 2)];
        console.log('Quote line found:', line);
        return `<div style="border-left: 3px solid ${color}; padding: 8px 0 8px 12px; margin: 6px 0; opacity: 0.85; font-style: italic;">${content}</div>`;
      }
    }

    if (/^On .+? at .+?, .+? (?:wrote|<[^>]+>):?$/.test(line)) {
      console.log('Header line found:', line);
      return `<div style="margin: 16px 0 8px 0; padding: 10px 14px; background: rgba(99, 102, 241, 0.12); border-left: 4px solid #818CF8; font-weight: 500; border-radius: 6px;">📧 ${escapeHtml(line)}</div>`;
    }

    if (/^(From|Date|Subject|To):\s*/.test(line)) {
      const match = line.match(/^(From|Date|Subject|To):\s*(.*)$/);
      if (match) {
        return `<div style="margin: 6px 0; padding: 4px 0;"><span style="font-weight: 600; opacity: 0.7; display: inline-block; min-width: 80px;">${match[1]}:</span> <span style="opacity: 0.9;">${escapeHtml(match[2])}</span></div>`;
      }
    }

    if (/^[-─]{3,}\s*Original Message\s*[-─]{3,}$/.test(line)) {
      return '<div style="margin: 24px 0; padding: 14px; background: rgba(99, 102, 241, 0.08); border-radius: 8px; text-align: center; font-weight: 600; border-top: 2px solid rgba(99, 102, 241, 0.3); border-bottom: 2px solid rgba(99, 102, 241, 0.3);">📧 Original Message</div>';
    }

    if (line === '') return '<div style="height: 8px;"></div>';
    return `<div style="margin: 2px 0;">${escapeHtml(line)}</div>`;
  });

  const formatted = processedLines.join('');
  console.log('Formatted output preview:', formatted.substring(0, 200));
  return `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 15px; line-height: 1.7;">${formatted}</div>`;
}

interface EmailsInboxProps {
  onSignOut: () => void;
  currentView: string;
  userRole?: string | null;
}

interface Email {
  id: string;
  sender: string;
  receiver: string[];
  subject: string;
  body: string;
  attachments: any;
  created_at: string;
  user_reply_count?: number;
  last_user_reply_at?: string;
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
  reply_count?: number;
  last_reply_at?: string;
  reply_to_id?: string;
  thread_position?: number;
}

interface DraftEmail {
  id: string;
  sender: string;
  receiver: string[];
  subject: string;
  body: string;
  attachments: any;
  created_at: string;
  updated_at: string;
}

interface ThreadMessage {
  id: string;
  type: 'received' | 'sent';
  from: string;
  to: string;
  body: string;
  timestamp: string;
  isCurrent: boolean;
}

type TabType = 'inbox' | 'outbox' | 'sent' | 'drafts';

const formatReceiverList = (receiver: string | string[]): string => {
  if (Array.isArray(receiver)) {
    return receiver.join(', ');
  }
  return receiver || '';
};

const getFirstReceiver = (receiver: string | string[]): string => {
  if (Array.isArray(receiver)) {
    return receiver[0] || '';
  }
  return receiver || '';
};

export function EmailsInbox({ onSignOut, currentView, userRole }: EmailsInboxProps) {
  const [emails, setEmails] = useState<Email[]>([]);
  const [outboxEmails, setOutboxEmails] = useState<OutboxEmail[]>([]);
  const [sentEmails, setSentEmails] = useState<SentEmail[]>([]);
  const [draftEmails, setDraftEmails] = useState<DraftEmail[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('inbox');
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showReplyDialog, setShowReplyDialog] = useState(false);
  const [isProcessingEmails, setIsProcessingEmails] = useState(false);
  const [showComposeDialog, setShowComposeDialog] = useState(false);
  const [isReplyAll, setIsReplyAll] = useState(false);
  const [showEditDraftDialog, setShowEditDraftDialog] = useState(false);
  const [selectedDraft, setSelectedDraft] = useState<DraftEmail | null>(null);
  const [inboxMode, setInboxMode] = useState<'master' | 'regular'>('master');
  const [isTogglingMode, setIsTogglingMode] = useState(false);
  const [threadMessages, setThreadMessages] = useState<ThreadMessage[]>([]);

  const isManager = userRole === 'owner' || userRole === 'manager';

  useEffect(() => {
    fetchAllEmails();
    if (isManager) {
      fetchInboxMode();
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'inbox') {
      fetchInboxEmails();
    }
  }, [inboxMode]);

  useEffect(() => {
    if (activeTab === 'inbox') {
      fetchInboxEmails();
    } else if (activeTab === 'outbox') {
      fetchOutboxEmails();
    } else if (activeTab === 'sent') {
      fetchSentEmails();
    } else if (activeTab === 'drafts') {
      fetchDraftEmails();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'sent' && selectedEmail && (selectedEmail as SentEmail).reply_to_id) {
      buildThreadMessages(selectedEmail as SentEmail);
    } else if (activeTab === 'inbox' && selectedEmail) {
      buildInboxThreadMessages(selectedEmail as Email);
    } else {
      setThreadMessages([]);
    }
  }, [selectedEmail, activeTab]);

  const buildThreadMessages = async (sentEmail: SentEmail) => {
    if (!sentEmail.reply_to_id) return;

    // Anchor on the inbox email this was directly replying to, to get sender + base subject
    const { data: anchorEmail } = await supabase
      .from('emails')
      .select('id, sender, receiver, subject, body, created_at')
      .eq('id', sentEmail.reply_to_id)
      .maybeSingle();

    if (!anchorEmail) return;

    const baseSubject = sentEmail.subject.replace(/^(Re:\s*|Fwd:\s*)+/gi, '').trim().toLowerCase();
    const rawSender = anchorEmail.sender;
    const senderAddr = (rawSender.match(/<([^>]+)>/) || [null, rawSender])[1]?.toLowerCase().trim() ?? rawSender.toLowerCase().trim();

    // All inbox emails from this sender whose base subject matches
    const { data: allInbox } = await supabase
      .from('emails')
      .select('id, sender, receiver, subject, body, created_at')
      .ilike('sender', `%${senderAddr}%`)
      .order('created_at', { ascending: true });

    const threadInboxIds: string[] = [];
    const msgs: ThreadMessage[] = [];

    for (const e of allInbox || []) {
      const eBase = e.subject.replace(/^(Re:\s*|Fwd:\s*)+/gi, '').trim().toLowerCase();
      if (eBase === baseSubject) {
        threadInboxIds.push(e.id);
        msgs.push({
          id: e.id,
          type: 'received',
          from: e.sender,
          to: formatReceiverList(e.receiver),
          body: e.body,
          timestamp: e.created_at,
          isCurrent: false,
        });
      }
    }

    // All sent emails that reply to ANY inbox email in this thread
    if (threadInboxIds.length > 0) {
      const { data: allSent } = await supabase
        .from('email_sent')
        .select('id, to_email, from_email, subject, body, sent_at')
        .in('reply_to_id', threadInboxIds)
        .order('sent_at', { ascending: true });

      for (const s of allSent || []) {
        msgs.push({
          id: s.id,
          type: 'sent',
          from: s.from_email,
          to: s.to_email,
          body: s.body,
          timestamp: s.sent_at,
          isCurrent: s.id === sentEmail.id,
        });
      }
    }

    msgs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    setThreadMessages(msgs);
  };

  const buildInboxThreadMessages = async (inboxEmail: Email) => {
    const baseSubject = inboxEmail.subject.replace(/^(Re:\s*|Fwd:\s*)+/gi, '').trim().toLowerCase();
    const rawSender = inboxEmail.sender;
    const senderAddr = (rawSender.match(/<([^>]+)>/) || [null, rawSender])[1]?.toLowerCase().trim() ?? rawSender.toLowerCase().trim();

    const { data: allInbox } = await supabase
      .from('emails')
      .select('id, sender, receiver, subject, body, created_at')
      .ilike('sender', `%${senderAddr}%`)
      .order('created_at', { ascending: true });

    const threadInboxIds: string[] = [];
    const msgs: ThreadMessage[] = [];

    for (const e of allInbox || []) {
      const eBase = e.subject.replace(/^(Re:\s*|Fwd:\s*)+/gi, '').trim().toLowerCase();
      if (eBase === baseSubject) {
        threadInboxIds.push(e.id);
        msgs.push({
          id: e.id,
          type: 'received',
          from: e.sender,
          to: formatReceiverList(e.receiver),
          body: e.body,
          timestamp: e.created_at,
          isCurrent: e.id === inboxEmail.id,
        });
      }
    }

    if (threadInboxIds.length > 0) {
      const { data: allSent } = await supabase
        .from('email_sent')
        .select('id, to_email, from_email, subject, body, sent_at')
        .in('reply_to_id', threadInboxIds)
        .order('sent_at', { ascending: true });

      for (const s of allSent || []) {
        msgs.push({
          id: s.id,
          type: 'sent',
          from: s.from_email,
          to: s.to_email,
          body: s.body,
          timestamp: s.sent_at,
          isCurrent: false,
        });
      }
    }

    msgs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    if (msgs.length > 1) {
      setThreadMessages(msgs);
    } else {
      setThreadMessages([]);
    }
  };

  const fetchInboxMode = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_settings')
        .select('inbox_mode')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      if (data?.inbox_mode) {
        setInboxMode(data.inbox_mode as 'master' | 'regular');
      }
    } catch (error) {
      console.error('Error fetching inbox mode:', error);
    }
  };

  const toggleInboxMode = async () => {
    try {
      setIsTogglingMode(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const newMode = inboxMode === 'master' ? 'regular' : 'master';

      const { error } = await supabase
        .from('user_settings')
        .update({ inbox_mode: newMode })
        .eq('user_id', user.id);

      if (error) throw error;

      setInboxMode(newMode);
    } catch (error) {
      console.error('Error toggling inbox mode:', error);
      alert('Failed to update inbox mode. Please try again.');
    } finally {
      setIsTogglingMode(false);
    }
  };

  const fetchAllEmails = async () => {
    try {
      await Promise.all([
        fetchInboxEmails(),
        fetchOutboxEmails(),
        fetchSentEmails(),
        fetchDraftEmails()
      ]);
    } catch (error) {
      console.error('Error fetching emails:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchInboxEmails = async () => {
    try {
      const { data, error } = await supabase
        .from('emails')
        .select('id, sender, receiver, subject, body, attachments, created_at, user_reply_count, last_user_reply_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setEmails(data || []);
    } catch (error) {
      console.error('Error fetching inbox emails:', error);
      setEmails([]);
    }
  };

  const fetchOutboxEmails = async () => {
    try {
      const { data, error } = await supabase
        .from('email_outbox')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setOutboxEmails(data || []);
    } catch (error) {
      console.error('Error fetching outbox emails:', error);
      setOutboxEmails([]);
    }
  };

  const fetchSentEmails = async () => {
    try {
      const { data, error } = await supabase
        .from('email_sent')
        .select('id, to_email, from_email, subject, body, sent_at, created_at, reply_count, last_reply_at, reply_to_id')
        .order('sent_at', { ascending: false });
      if (error) throw error;

      const rows = data || [];

      // Compute thread_position: how many times the autoresponder has replied in this
      // conversation up to and including each email. Group by (normalized subject + to_email),
      // sort ascending by sent_at, assign 1-based index within each group.
      const normalizeSubject = (s: string) =>
        s.replace(/^(Re:\s*|Fwd:\s*)+/gi, '').trim().toLowerCase();

      const threadGroups = new Map<string, typeof rows>();
      for (const email of rows) {
        if (!email.reply_to_id) continue;
        const key = `${normalizeSubject(email.subject)}::${email.to_email.toLowerCase().trim()}`;
        if (!threadGroups.has(key)) threadGroups.set(key, []);
        threadGroups.get(key)!.push(email);
      }

      const positionMap = new Map<string, number>();
      for (const group of threadGroups.values()) {
        group.sort((a, b) => new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime());
        group.forEach((email, idx) => positionMap.set(email.id, idx + 1));
      }

      setSentEmails(rows.map(e => ({ ...e, thread_position: positionMap.get(e.id) })));
    } catch (error) {
      console.error('Error fetching sent emails:', error);
      setSentEmails([]);
    }
  };

  const fetchDraftEmails = async () => {
    try {
      const { data, error } = await supabase
        .from('email_drafts')
        .select('*')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      setDraftEmails(data || []);
    } catch (error) {
      console.error('Error fetching draft emails:', error);
      setDraftEmails([]);
    }
  };

  const handleSendReply = async (replyData: {
    to: string;
    from: string;
    subject: string;
    body: string;
  }) => {
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) {
        throw new Error('User not authenticated');
      }

      const { error } = await supabase
        .from('email_outbox')
        .insert({
          user_id: user.data.user.id,
          to_email: replyData.to,
          from_email: replyData.from,
          subject: replyData.subject,
          body: replyData.body,
          reply_to_id: selectedEmail?.id,
          status: 'pending'
        });

      if (error) throw error;

      setShowReplyDialog(false);
      alert('Reply added to outbox and will be sent shortly.');
      
      if (activeTab === 'outbox') {
        fetchAllEmails();
      }
    } catch (error) {
      console.error('Error sending reply:', error);
      alert('Failed to send reply. Please try again.');
    }
  };

  const handleProcessOutbox = async () => {
    setIsProcessingEmails(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('You must be logged in to process emails');
        return;
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

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process emails');
      }

      const result = await response.json();
      console.log('Email processing result:', result);
      
      await fetchAllEmails();
      
      if (result.processed > 0) {
        alert(`Processed ${result.processed} emails. Check the Sent tab for successful sends.`);
      } else {
        alert('No pending emails to process.');
      }
      
    } catch (error) {
      console.error('Error processing emails:', error);
      alert(`Failed to process emails: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessingEmails(false);
    }
  };

  const handleRefresh = () => {
    setIsLoading(true);
    fetchAllEmails();
  };

  const handleDeleteEmail = async (emailId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent row click from selecting email

    try {
      setIsLoading(true);
      let error;

      if (activeTab === 'inbox') {
        ({ error } = await supabase
          .from('emails')
          .delete()
          .eq('id', emailId));
      } else if (activeTab === 'outbox') {
        ({ error } = await supabase
          .from('email_outbox')
          .delete()
          .eq('id', emailId));
      } else if (activeTab === 'sent') {
        ({ error } = await supabase
          .from('email_sent')
          .delete()
          .eq('id', emailId));
      } else if (activeTab === 'drafts') {
        ({ error } = await supabase
          .from('email_drafts')
          .delete()
          .eq('id', emailId));
      }

      if (error) throw error;

      // Refresh the appropriate email list
      if (activeTab === 'inbox') {
        await fetchInboxEmails();
      } else if (activeTab === 'outbox') {
        await fetchOutboxEmails();
      } else if (activeTab === 'sent') {
        await fetchSentEmails();
      } else {
        await fetchDraftEmails();
      }

      // If the deleted email was selected, clear the selection
      if (selectedEmail?.id === emailId) {
        setSelectedEmail(null);
      }

      alert('Email deleted successfully');
    } catch (error) {
      console.error('Error deleting email replacethis:', error);
      alert('Failed to delete email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getFilteredEmails = () => {
    if (activeTab === 'inbox') {
      return emails.filter(email => {
        const receiverText = formatReceiverList(email.receiver);
        return email.sender.toLowerCase().includes(searchQuery.toLowerCase()) ||
               email.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
               receiverText.toLowerCase().includes(searchQuery.toLowerCase());
      });
    } else if (activeTab === 'outbox') {
      return outboxEmails.filter(email =>
        email.to_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        email.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        email.from_email?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    } else if (activeTab === 'sent') {
      return sentEmails.filter(email =>
        email.to_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        email.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        email.from_email?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    } else {
      return draftEmails.filter(email => {
        const receiverText = formatReceiverList(email.receiver);
        return email.sender.toLowerCase().includes(searchQuery.toLowerCase()) ||
               email.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
               receiverText.toLowerCase().includes(searchQuery.toLowerCase());
      });
    }
  };

  const filteredEmails = getFilteredEmails();

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

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('You must be logged in to download attachments');
        return;
      }

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
      <div className="p-4 md:p-8 bg-white dark:bg-gray-900 min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 bg-white dark:bg-gray-900 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {!selectedEmail ? (
          <>
            <div className="flex items-center justify-between mb-6 gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <Mail className="w-6 h-6 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
                <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white truncate">Emails</h1>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                <button
                  onClick={() => setShowComposeDialog(true)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 sm:px-4 sm:py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">New Email</span>
                </button>
                <button
                  onClick={handleRefresh}
                  disabled={isProcessingEmails}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 sm:px-4 sm:py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg shadow-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span className="hidden sm:inline">Refresh</span>
                </button>
                {activeTab === 'outbox' && (
                  <button
                    onClick={handleProcessOutbox}
                    disabled={isProcessingEmails}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 sm:px-4 sm:py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white ${
                      isProcessingEmails
                        ? 'bg-indigo-400 cursor-wait'
                        : 'bg-indigo-600 hover:bg-indigo-700'
                    }`}
                  >
                    {isProcessingEmails ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span className="hidden sm:inline">Processing...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span className="hidden sm:inline">Send Emails</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="mb-6">
              <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="flex space-x-8">
                  <button
                    onClick={() => {
                      setActiveTab('inbox');
                      setSelectedEmail(null);
                    }}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'inbox'
                        ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Inbox className="w-4 h-4" />
                      Inbox ({emails.length})
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('drafts');
                      setSelectedEmail(null);
                    }}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'drafts'
                        ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Drafts ({draftEmails.length})
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('outbox');
                      setSelectedEmail(null);
                    }}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'outbox'
                        ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Send className="w-4 h-4" />
                      Outbox ({outboxEmails.length})
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('sent');
                      setSelectedEmail(null);
                    }}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'sent'
                        ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Sent ({sentEmails.length})
                    </div>
                  </button>
                </nav>
              </div>
            </div>

            {/* Inbox Mode Toggle for Managers */}
            {isManager && activeTab === 'inbox' && (
              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Inbox className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      Inbox Mode:
                    </span>
                    <span className="text-sm text-blue-700 dark:text-blue-300">
                      {inboxMode === 'master' ? 'Master Inbox (All Organization Emails)' : 'Regular Inbox (My Emails Only)'}
                    </span>
                  </div>
                  <button
                    onClick={toggleInboxMode}
                    disabled={isTogglingMode}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      isTogglingMode
                        ? 'bg-blue-300 cursor-wait text-blue-900'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {isTogglingMode ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Switching...
                      </>
                    ) : (
                      <>
                        {inboxMode === 'master' ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                        Switch to {inboxMode === 'master' ? 'Regular' : 'Master'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

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
                    {filteredEmails.length === 0 ? `No ${activeTab} emails yet` : 'No emails found'}
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    {filteredEmails.length === 0
                      ? `${activeTab === 'inbox' ? 'Received emails' : activeTab === 'outbox' ? 'Outgoing emails' : activeTab === 'sent' ? 'Sent emails' : 'Draft emails'} will appear here`
                      : 'Try adjusting your search criteria'
                    }
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredEmails.map((email) => (
                    <div
                      key={email.id}
                      onClick={() => {
                        if (activeTab === 'drafts') {
                          setSelectedDraft(email as DraftEmail);
                          setShowEditDraftDialog(true);
                        } else {
                          setSelectedEmail(email);
                        }
                      }}
                      className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          {/* From + To + badges — flex-wrap keeps them on one line on desktop,
                              wraps gracefully on narrow screens */}
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-1">
                            <div className="flex items-center gap-1.5 min-w-0 shrink-0">
                              <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              <span className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[130px] sm:max-w-[220px] lg:max-w-none">
                                {activeTab === 'inbox' ? (email as Email).sender :
                                 activeTab === 'outbox' ? (email as OutboxEmail).from_email :
                                 activeTab === 'sent' ? (email as SentEmail).from_email :
                                 (email as DraftEmail).sender}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 shrink-0">
                              <span>to</span>
                              <span className="truncate max-w-[110px] sm:max-w-[180px] lg:max-w-none">
                                {activeTab === 'inbox' ? formatReceiverList((email as Email).receiver) :
                                 activeTab === 'outbox' ? (email as OutboxEmail).to_email :
                                 activeTab === 'sent' ? (email as SentEmail).to_email :
                                 formatReceiverList((email as DraftEmail).receiver)}
                              </span>
                            </div>
                            {activeTab === 'outbox' && (
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                (email as OutboxEmail).status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' :
                                (email as OutboxEmail).status === 'sending' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' :
                                'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                              }`}>
                                {(email as OutboxEmail).status}
                              </span>
                            )}
                            {(activeTab === 'inbox' || activeTab === 'drafts') && hasAttachments((email as Email | DraftEmail).attachments) && (
                              <Paperclip className="w-4 h-4 text-gray-400" />
                            )}
                            {activeTab === 'inbox' && (email as Email).user_reply_count !== undefined && (email as Email).user_reply_count > 0 && (
                              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                                <Reply className="w-3 h-3" />
                                <span className="text-xs font-medium">{(email as Email).user_reply_count}</span>
                              </div>
                            )}
                            {activeTab === 'sent' && (email as SentEmail).reply_to_id && (
                              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300">
                                <Reply className="w-3 h-3" />
                                <span className="text-xs font-medium">
                                  Reply · {(email as SentEmail).thread_position ?? 1}
                                </span>
                              </div>
                            )}
                            {activeTab === 'sent' && !(email as SentEmail).reply_to_id && (email as SentEmail).reply_count !== undefined && (email as SentEmail).reply_count! > 0 && (
                              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                                <MessageSquare className="w-3 h-3" />
                                <span className="text-xs font-medium">{(email as SentEmail).reply_count}</span>
                              </div>
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
                        <div className="flex flex-col items-end gap-1 ml-3 flex-shrink-0">
                          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                            <Clock className="w-3 h-3" />
                            {formatDate(
                              activeTab === 'sent' ? (email as SentEmail).sent_at : email.created_at
                            )}
                          </div>
                          <button
                            onClick={(e) => handleDeleteEmail(email.id, e)}
                            className="text-xs font-medium text-red-600 hover:text-red-500 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 px-1.5 py-0.5 rounded transition-colors"
                          >
                            Delete
                          </button>
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
            <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
              {/* Top bar: Back on left, actions on right — stacks on mobile */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <button
                  onClick={() => setSelectedEmail(null)}
                  className="inline-flex items-center self-start text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to {activeTab}
                </button>
                <div className="flex flex-wrap items-center gap-2">
                  {activeTab === 'inbox' && (
                    <>
                      <button
                        onClick={() => {
                          setIsReplyAll(false);
                          setShowReplyDialog(true);
                        }}
                        className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 rounded-lg transition-colors"
                      >
                        <Reply className="w-4 h-4 mr-1.5" />
                        Reply
                      </button>
                      <button
                        onClick={() => {
                          setIsReplyAll(true);
                          setShowReplyDialog(true);
                        }}
                        className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 rounded-lg transition-colors"
                      >
                        <Reply className="w-4 h-4 mr-1.5" />
                        Reply All
                      </button>
                    </>
                  )}
                  <div className="flex items-center gap-1 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                    <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="whitespace-nowrap">
                      {new Date(
                        activeTab === 'sent' && 'sent_at' in selectedEmail
                          ? (selectedEmail as any).sent_at
                          : selectedEmail.created_at
                      ).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h1 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
                  {selectedEmail.subject || '(No Subject)'}
                </h1>

                {/* From / To — side by side on desktop, stacked on mobile */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4 gap-1.5 text-sm">
                  <div className="flex items-baseline gap-2 min-w-0">
                    <span className="text-gray-500 dark:text-gray-400 flex-shrink-0">From:</span>
                    <span className="font-medium text-gray-900 dark:text-white break-all min-w-0">
                      {activeTab === 'inbox' ? (selectedEmail as Email).sender :
                       activeTab === 'drafts' ? (selectedEmail as DraftEmail).sender :
                       'from_email' in selectedEmail ? (selectedEmail as any).from_email : 'Unknown'}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2 min-w-0">
                    <span className="text-gray-500 dark:text-gray-400 flex-shrink-0">To:</span>
                    <span className="font-medium text-gray-900 dark:text-white break-all min-w-0">
                      {activeTab === 'inbox' ? formatReceiverList((selectedEmail as Email).receiver) :
                       activeTab === 'drafts' ? formatReceiverList((selectedEmail as DraftEmail).receiver) :
                       'to_email' in selectedEmail ? (selectedEmail as any).to_email : 'Unknown'}
                    </span>
                  </div>
                </div>

                {activeTab === 'sent' && 'reply_count' in selectedEmail && (selectedEmail as SentEmail).reply_count > 0 && (
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-green-600 dark:text-green-400" />
                      <span className="text-sm font-medium text-green-900 dark:text-green-300">
                        {(selectedEmail as SentEmail).reply_count} {(selectedEmail as SentEmail).reply_count === 1 ? 'Reply' : 'Replies'} Received
                      </span>
                      {(selectedEmail as SentEmail).last_reply_at && (
                        <span className="text-xs text-green-700 dark:text-green-400">
                          · Last reply: {new Date((selectedEmail as SentEmail).last_reply_at!).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'inbox' && hasAttachments((selectedEmail as Email).attachments) && (
                  <div className="flex items-center gap-2 text-sm">
                    <Paperclip className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-500 dark:text-gray-400">
                      {(selectedEmail as Email).attachments.length} attachment{(selectedEmail as Email).attachments.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6">
              {/* Thread view for sent replies and inbox conversations */}
              {(activeTab === 'sent' || activeTab === 'inbox') && threadMessages.length > 0 ? (
                <div className="space-y-4">
                  {threadMessages.map((msg, idx) => (
                    <div
                      key={msg.id}
                      className={`rounded-xl border transition-shadow ${
                        msg.isCurrent
                          ? 'border-indigo-300 dark:border-indigo-600 shadow-sm ring-1 ring-indigo-200 dark:ring-indigo-700'
                          : 'border-gray-200 dark:border-gray-700'
                      } ${
                        msg.type === 'received'
                          ? 'bg-gray-50 dark:bg-gray-700/40'
                          : 'bg-white dark:bg-gray-800'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 py-2.5 border-b border-gray-100 dark:border-gray-700/50 gap-1.5 sm:gap-0">
                        <div className="flex items-center gap-3 text-sm min-w-0">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${
                            msg.type === 'received'
                              ? 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200'
                              : 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300'
                          }`}>
                            {msg.from.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 overflow-hidden">
                            <span className="font-medium text-gray-900 dark:text-white truncate block">{msg.from}</span>
                            <span className="text-gray-400 dark:text-gray-500 text-xs truncate block">to {msg.to}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 sm:ml-3 pl-10 sm:pl-0">
                          {msg.isCurrent && (
                            <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-full">Selected</span>
                          )}
                          <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                            {new Date(msg.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                      <div className="px-4 py-3">
                        <div
                          className="text-sm text-gray-800 dark:text-gray-200"
                          dangerouslySetInnerHTML={{ __html: formatPlainTextEmail(msg.body) }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="prose dark:prose-invert max-w-none">
                  <div
                    className="text-gray-900 dark:text-white"
                    dangerouslySetInnerHTML={{ __html: formatPlainTextEmail(selectedEmail.body) }}
                  />
                </div>
              )}

              {activeTab === 'inbox' && hasAttachments((selectedEmail as Email).attachments) && (
                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                    Attachments ({(selectedEmail as Email).attachments.length})
                  </h3>
                  <div className="space-y-2">
                    {(selectedEmail as Email).attachments.map((attachment: any, index: number) => (
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

        {showReplyDialog && selectedEmail && (
          <ReplyDialog
            originalEmail={selectedEmail as Email}
            isReplyAll={isReplyAll}
            onSend={handleSendReply}
            onClose={() => {
              setShowReplyDialog(false);
              setIsReplyAll(false);
            }}
          />
        )}
      </div>

      {showComposeDialog && (
        <ComposeEmailDialog
          onClose={() => setShowComposeDialog(false)}
          onSend={() => {
            fetchAllEmails();
          }}
          onDraftSaved={() => {
            fetchDraftEmails();
          }}
        />
      )}

      {showEditDraftDialog && selectedDraft && (
        <EditDraftDialog
          draft={selectedDraft}
          onClose={() => {
            setShowEditDraftDialog(false);
            setSelectedDraft(null);
          }}
          onDraftUpdated={() => {
            fetchDraftEmails();
          }}
          onDraftSent={() => {
            fetchDraftEmails();
            fetchOutboxEmails();
          }}
        />
      )}
    </div>
  );
}