import React, { useState, useEffect, useRef } from 'react';
import { HelpCircle, Send, Plus, ChevronLeft, MessageCircle, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { SupportAdmin } from './SupportAdmin';

interface SupportRequest {
  id: string;
  name: string;
  subject: string;
  message: string;
  user_email: string;
  user_id: string;
  status: string;
  created_at: string;
}

interface SupportMessage {
  id: string;
  request_id: string;
  sender_id: string;
  is_owner: boolean;
  body: string;
  created_at: string;
}

interface SupportProps {
  onSignOut: () => void;
  currentView: string;
  isSupportAdmin?: boolean;
}

export function Support({ onSignOut, currentView, isSupportAdmin = false }: SupportProps) {
  if (isSupportAdmin) {
    return <SupportAdmin />;
  }
  return <SupportUser />;
}

function SupportUser() {
  const [conversations, setConversations] = useState<SupportRequest[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [showNewForm, setShowNewForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // New conversation form state
  const [subject, setSubject] = useState('');
  const [firstMessage, setFirstMessage] = useState('');

  // Reply state
  const [replyText, setReplyText] = useState('');

  const bottomRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const requestsChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    loadConversations();
    subscribeToRequestUpdates();
    return () => {
      if (requestsChannelRef.current) supabase.removeChannel(requestsChannelRef.current);
    };
  }, []);

  useEffect(() => {
    if (selectedId) {
      loadMessages(selectedId);
      subscribeToMessages(selectedId);
    }
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [selectedId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function loadConversations() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('support_requests')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setConversations(data ?? []);
    setLoading(false);
    if (data && data.length === 0) setShowNewForm(true);
  }

  function subscribeToRequestUpdates() {
    requestsChannelRef.current = supabase
      .channel('user-support-requests')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'support_requests',
      }, (payload) => {
        setConversations(prev =>
          prev.map(c => c.id === payload.new.id ? { ...c, ...(payload.new as SupportRequest) } : c)
        );
      })
      .subscribe();
  }

  async function loadMessages(requestId: string) {
    const { data } = await supabase
      .from('support_messages')
      .select('*')
      .eq('request_id', requestId)
      .order('created_at', { ascending: true });
    setMessages(data ?? []);
  }

  function subscribeToMessages(requestId: string) {
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    channelRef.current = supabase
      .channel(`support-msgs-${requestId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'support_messages',
        filter: `request_id=eq.${requestId}`,
      }, (payload) => {
        setMessages(prev => {
          if (prev.find(m => m.id === payload.new.id)) return prev;
          return [...prev, payload.new as SupportMessage];
        });
      })
      .subscribe();
  }

  async function handleNewConversation(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim() || !firstMessage.trim()) return;
    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: req, error: reqErr } = await supabase
        .from('support_requests')
        .insert({
          user_id: user.id,
          user_email: user.email ?? '',
          name: user.email ?? 'User',
          subject: subject.trim(),
          message: firstMessage.trim(),
          status: 'open',
        })
        .select()
        .single();

      if (reqErr || !req) throw reqErr;

      await supabase.from('support_messages').insert({
        request_id: req.id,
        sender_id: user.id,
        is_owner: false,
        body: firstMessage.trim(),
      });

      setConversations(prev => [req, ...prev]);
      setSubject('');
      setFirstMessage('');
      setShowNewForm(false);
      setSelectedId(req.id);
    } catch (err) {
      console.error('Error creating conversation:', err);
    } finally {
      setSending(false);
    }
  }

  async function handleReply(e: React.FormEvent) {
    e.preventDefault();
    if (!replyText.trim() || !selectedId) return;
    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: msg, error } = await supabase
        .from('support_messages')
        .insert({
          request_id: selectedId,
          sender_id: user.id,
          is_owner: false,
          body: replyText.trim(),
        })
        .select()
        .single();

      if (error) throw error;
      setMessages(prev => [...prev, msg]);
      setReplyText('');
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setSending(false);
    }
  }

  const selected = conversations.find(c => c.id === selectedId);

  if (loading) {
    return (
      <div className="min-h-screen app-bg flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Chat view
  if (selectedId && selected) {
    return (
      <div className="min-h-screen app-bg flex flex-col">
        {/* Header */}
        <div className="app-card border-b border-gray-200 dark:border-gray-700 px-4 md:px-6 py-4 flex items-center gap-3 flex-shrink-0">
          <button
            onClick={() => setSelectedId(null)}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-gray-900 dark:text-white truncate">{selected.subject}</h2>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              selected.status === 'resolved'
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
            }`}>
              {selected.status === 'resolved' ? 'Resolved' : 'Open'}
            </span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 space-y-4">
          {messages.length === 0 && (
            <p className="text-center text-gray-400 dark:text-gray-500 text-sm py-8">No messages yet.</p>
          )}
          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.is_owner ? 'justify-start' : 'justify-end'}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                msg.is_owner
                  ? 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-tl-sm'
                  : 'bg-blue-600 text-white rounded-tr-sm'
              }`}>
                {msg.is_owner && (
                  <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">Support</p>
                )}
                <p className="text-sm whitespace-pre-wrap">{msg.body}</p>
                <p className={`text-xs mt-1.5 ${msg.is_owner ? 'text-gray-400 dark:text-gray-500' : 'text-blue-200'}`}>
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Reply input */}
        {selected.status !== 'resolved' && (
          <div className="app-card border-t border-gray-200 dark:border-gray-700 px-4 md:px-6 py-4 flex-shrink-0">
            <form onSubmit={handleReply} className="flex gap-2">
              <input
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                disabled={sending}
              />
              <button
                type="submit"
                disabled={sending || !replyText.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}
        {selected.status === 'resolved' && (
          <div className="px-4 md:px-6 py-3 text-center text-sm text-gray-500 dark:text-gray-400 bg-green-50 dark:bg-green-900/10 border-t border-green-200 dark:border-green-900/30">
            This conversation has been resolved.
          </div>
        )}
      </div>
    );
  }

  // Conversation list / new form
  return (
    <div className="min-h-screen app-bg">
      <div className="max-w-2xl mx-auto px-4 md:px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <HelpCircle className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Support</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">We typically reply within 24 hours</p>
            </div>
          </div>
          {conversations.length > 0 && (
            <button
              onClick={() => setShowNewForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Conversation
            </button>
          )}
        </div>

        {/* New conversation form */}
        {showNewForm && (
          <div className="app-card rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900 dark:text-white">New Conversation</h2>
              {conversations.length > 0 && (
                <button
                  onClick={() => setShowNewForm(false)}
                  className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                >
                  Cancel
                </button>
              )}
            </div>
            <form onSubmit={handleNewConversation} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subject</label>
                <input
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="What do you need help with?"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  required
                  disabled={sending}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Message</label>
                <textarea
                  value={firstMessage}
                  onChange={e => setFirstMessage(e.target.value)}
                  placeholder="Describe your issue in detail..."
                  rows={5}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-none"
                  required
                  disabled={sending}
                />
              </div>
              <button
                type="submit"
                disabled={sending}
                className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors flex items-center justify-center gap-2"
              >
                {sending ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {sending ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          </div>
        )}

        {/* Conversation list */}
        {conversations.length > 0 && !showNewForm && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Your Conversations</h2>
            {conversations.map(conv => (
              <button
                key={conv.id}
                onClick={() => setSelectedId(conv.id)}
                className="w-full text-left app-card rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="mt-0.5 p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex-shrink-0">
                      <MessageCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">{conv.subject}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(conv.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <span className={`flex-shrink-0 text-xs px-2 py-1 rounded-full font-medium ${
                    conv.status === 'resolved'
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                      : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                  }`}>
                    {conv.status === 'resolved' ? 'Resolved' : 'Open'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

        {conversations.length === 0 && !showNewForm && (
          <div className="text-center py-12 text-gray-400 dark:text-gray-500">
            <HelpCircle className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>No conversations yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
