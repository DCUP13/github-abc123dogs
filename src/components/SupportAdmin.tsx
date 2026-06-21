import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck, Send, CheckCircle, Clock, MessageCircle, User, Search, ChevronLeft,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

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

type FilterType = 'all' | 'open' | 'resolved';

export function SupportAdmin() {
  const [requests, setRequests] = useState<SupportRequest[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('open');
  const [search, setSearch] = useState('');
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const listChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    loadRequests();
    subscribeToNewRequests();
    return () => {
      if (listChannelRef.current) supabase.removeChannel(listChannelRef.current);
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

  async function loadRequests() {
    setLoading(true);
    const { data } = await supabase
      .from('support_requests')
      .select('*')
      .order('created_at', { ascending: false });
    setRequests(data ?? []);
    setLoading(false);
  }

  function subscribeToNewRequests() {
    listChannelRef.current = supabase
      .channel('support-requests-admin')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_requests' }, (payload) => {
        setRequests(prev => [payload.new as SupportRequest, ...prev]);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'support_requests' }, (payload) => {
        setRequests(prev => prev.map(r => r.id === payload.new.id ? payload.new as SupportRequest : r));
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
      .channel(`admin-msgs-${requestId}`)
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

  async function handleReply(e: React.FormEvent) {
    e.preventDefault();
    if (!replyText.trim() || !selectedId) return;
    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: msg, error } = await supabase
        .from('support_messages')
        .insert({ request_id: selectedId, sender_id: user.id, is_owner: true, body: replyText.trim() })
        .select()
        .single();
      if (error) throw error;
      setMessages(prev => [...prev, msg]);
      setReplyText('');
    } catch (err) {
      console.error('Error sending reply:', err);
    } finally {
      setSending(false);
    }
  }

  async function handleToggleStatus(req: SupportRequest) {
    setResolvingId(req.id);
    const newStatus = req.status === 'resolved' ? 'open' : 'resolved';
    const { error } = await supabase.from('support_requests').update({ status: newStatus }).eq('id', req.id);
    if (!error) {
      setRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: newStatus } : r));
    }
    setResolvingId(null);
  }

  const filteredRequests = requests.filter(r => {
    const matchesFilter = filter === 'all' || r.status === filter;
    const q = search.toLowerCase();
    const matchesSearch = !q ||
      r.subject.toLowerCase().includes(q) ||
      r.user_email.toLowerCase().includes(q) ||
      r.name.toLowerCase().includes(q);
    return matchesFilter && matchesSearch;
  });

  const selected = requests.find(r => r.id === selectedId);
  const openCount = requests.filter(r => r.status === 'open').length;

  // ── Mobile chat view (full-screen overlay) ──────────────────────────
  if (selectedId && selected) {
    return (
      <div className="flex flex-col app-bg" style={{ height: 'calc(100dvh - 48px)' }}>
        {/* Header */}
        <div className="app-card border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center gap-3 flex-shrink-0 md:hidden">
          <button
            onClick={() => setSelectedId(null)}
            className="flex items-center gap-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 py-1 pr-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{selected.user_email}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{selected.subject}</p>
          </div>
          <button
            onClick={() => handleToggleStatus(selected)}
            disabled={resolvingId === selected.id}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex-shrink-0 ${
              selected.status === 'resolved'
                ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
            }`}
          >
            <CheckCircle className="w-3.5 h-3.5" />
            {selected.status === 'resolved' ? 'Reopen' : 'Resolve'}
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">
          {messages.length === 0 && (
            <p className="text-center text-gray-400 dark:text-gray-500 text-sm py-8">No messages yet.</p>
          )}
          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.is_owner ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                msg.is_owner
                  ? 'bg-blue-600 text-white rounded-tr-sm'
                  : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-tl-sm'
              }`}>
                {!msg.is_owner && (
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">{selected.user_email}</p>
                )}
                <p className="text-sm whitespace-pre-wrap">{msg.body}</p>
                <p className={`text-xs mt-1.5 ${msg.is_owner ? 'text-blue-200' : 'text-gray-400 dark:text-gray-500'}`}>
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Reply */}
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 app-card flex-shrink-0">
          {selected.status !== 'resolved' ? (
            <form onSubmit={handleReply} className="flex gap-2">
              <input
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                placeholder="Reply..."
                style={{ fontSize: 16 }}
                className="flex-1 px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                disabled={sending}
              />
              <button
                type="submit"
                disabled={sending || !replyText.trim()}
                className="px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <p className="text-center text-sm text-gray-400 dark:text-gray-500">
              Resolved —{' '}
              <button onClick={() => handleToggleStatus(selected)} className="text-blue-600 dark:text-blue-400 hover:underline">
                reopen
              </button>{' '}
              to reply.
            </p>
          )}
        </div>
      </div>
    );
  }

  // ── Desktop two-panel + mobile list ─────────────────────────────────
  return (
    <div className="flex flex-col app-bg" style={{ minHeight: 'calc(100dvh - 48px)' }}>
      {/* Page header */}
      <div className="px-4 md:px-8 py-4 md:py-6 border-b border-gray-200 dark:border-gray-700 app-card flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
            <ShieldCheck className="w-5 h-5 md:w-6 md:h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Support Admin</h1>
            <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">
              {openCount > 0 ? `${openCount} open conversation${openCount !== 1 ? 's' : ''}` : 'All caught up!'}
            </p>
          </div>
        </div>
      </div>

      {/* Main panel */}
      <div className="flex flex-1 overflow-hidden">
        {/* Conversation list */}
        <div className="flex flex-col md:w-80 w-full flex-shrink-0 border-r border-gray-200 dark:border-gray-700">
          {/* Search + filter */}
          <div className="p-3 space-y-2 border-b border-gray-200 dark:border-gray-700 app-card flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search..."
                style={{ fontSize: 16 }}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div className="flex gap-1">
              {(['all', 'open', 'resolved'] as FilterType[]).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-lg capitalize transition-colors ${
                    filter === f
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {f}
                  {f === 'open' && openCount > 0 && (
                    <span className={`ml-1 px-1.5 rounded-full ${filter === f ? 'bg-white/20 text-white' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'}`}>
                      {openCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {loading && (
              <div className="flex justify-center py-8">
                <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {!loading && filteredRequests.length === 0 && (
              <div className="text-center py-12 px-4 text-gray-400 dark:text-gray-500">
                <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No conversations</p>
              </div>
            )}
            {filteredRequests.map(req => (
              <button
                key={req.id}
                onClick={() => setSelectedId(req.id)}
                className={`w-full text-left px-4 py-3.5 border-b border-gray-100 dark:border-gray-800 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50 active:bg-gray-100 dark:active:bg-gray-800 ${
                  selectedId === req.id ? 'bg-blue-50 dark:bg-blue-900/20 border-l-2 border-l-blue-600' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <User className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{req.user_email}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-300 truncate mt-0.5">{req.subject}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />
                        {new Date(req.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <span className={`flex-shrink-0 text-xs px-1.5 py-0.5 rounded-full font-medium ${
                    req.status === 'resolved'
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                      : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                  }`}>
                    {req.status === 'resolved' ? 'Done' : 'Open'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Desktop chat panel */}
        <div className="flex-1 hidden md:flex flex-col min-w-0 min-h-0">
          {selected ? (
            <>
              {/* Chat header */}
              <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700 app-card flex items-center gap-3 flex-shrink-0">
                <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{selected.user_email}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{selected.subject}</p>
                </div>
                <button
                  onClick={() => handleToggleStatus(selected)}
                  disabled={resolvingId === selected.id}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex-shrink-0 ${
                    selected.status === 'resolved'
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                      : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50'
                  }`}
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  {selected.status === 'resolved' ? 'Reopen' : 'Resolve'}
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 min-h-0">
                {messages.length === 0 && (
                  <p className="text-center text-gray-400 dark:text-gray-500 text-sm py-8">No messages yet.</p>
                )}
                {messages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.is_owner ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                      msg.is_owner
                        ? 'bg-blue-600 text-white rounded-tr-sm'
                        : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-tl-sm'
                    }`}>
                      {!msg.is_owner && (
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">{selected.user_email}</p>
                      )}
                      <p className="text-sm whitespace-pre-wrap">{msg.body}</p>
                      <p className={`text-xs mt-1.5 ${msg.is_owner ? 'text-blue-200' : 'text-gray-400 dark:text-gray-500'}`}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              {/* Desktop reply */}
              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 app-card flex-shrink-0">
                {selected.status !== 'resolved' ? (
                  <form onSubmit={handleReply} className="flex gap-2">
                    <input
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      placeholder="Reply to this conversation..."
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      disabled={sending}
                    />
                    <button
                      type="submit"
                      disabled={sending || !replyText.trim()}
                      className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                ) : (
                  <p className="text-center text-sm text-gray-400 dark:text-gray-500">
                    Resolved —{' '}
                    <button onClick={() => handleToggleStatus(selected)} className="text-blue-600 dark:text-blue-400 hover:underline">
                      reopen
                    </button>{' '}
                    to reply.
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400 dark:text-gray-500">
              <div className="text-center">
                <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Select a conversation to view</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
