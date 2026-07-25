import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { MessageCircle, Send, Bot, User, ToggleLeft, ToggleRight, Phone, Clock, RefreshCw } from 'lucide-react';

interface Conversation {
  id: string;
  phone_number: string;
  contact_name: string | null;
  owner_email: string;
  ai_enabled: boolean;
  last_message_at: string | null;
  created_at: string;
}

interface Message {
  id: string;
  conversation_id: string;
  wa_message_id: string | null;
  direction: 'inbound' | 'outbound';
  body: string;
  status: string;
  ai_source: string | null;
  created_at: string;
}

interface WhatsAppInboxProps {
  onSignOut: () => void;
  currentView: string;
}

function formatPhone(phone: string): string {
  // Convert E.164 to readable: +1 (555) 123-4567
  if (phone.length === 11 && phone.startsWith('1')) {
    return `+1 (${phone.slice(1, 4)}) ${phone.slice(4, 7)}-${phone.slice(7)}`;
  }
  return phone;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function WhatsAppInbox({ currentView }: WhatsAppInboxProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  const loadConversations = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('whatsapp_conversations')
      .select('*')
      .order('last_message_at', { ascending: false, nullsFirst: false });

    if (error) {
      console.error('Error loading conversations:', error);
    } else {
      setConversations((data || []) as Conversation[]);
    }
    setLoading(false);
  }, []);

  const loadMessages = useCallback(async (convId: string) => {
    setLoadingMessages(true);
    const { data, error } = await supabase
      .from('whatsapp_messages')
      .select('*')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading messages:', error);
    } else {
      setMessages((data || []) as Message[]);
    }
    setLoadingMessages(false);
  }, []);

  useEffect(() => {
    loadConversations();
    // Realtime subscription for new conversations
    const channel = supabase
      .channel('whatsapp_conversations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_conversations' }, () => {
        loadConversations();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'whatsapp_messages' }, (payload) => {
        if (selectedId && (payload.new as Message).conversation_id === selectedId) {
          setMessages(prev => [...prev, payload.new as Message]);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [loadConversations, selectedId]);

  useEffect(() => {
    if (selectedId) loadMessages(selectedId);
  }, [selectedId, loadMessages]);

  const toggleAi = async (conv: Conversation) => {
    const { error } = await supabase
      .from('whatsapp_conversations')
      .update({ ai_enabled: !conv.ai_enabled })
      .eq('id', conv.id);
    if (error) { console.error('Error toggling AI:', error); return; }
    setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, ai_enabled: !c.ai_enabled } : c));
  };

  const sendReply = async () => {
    if (!replyText.trim() || !selectedId) return;
    setSending(true);
    // Store the outbound message; actual WhatsApp sending will be wired once the
    // WhatsApp Business phone number ID and access token are configured.
    const { error } = await supabase
      .from('whatsapp_messages')
      .insert({
        conversation_id: selectedId,
        direction: 'outbound',
        body: replyText.trim(),
        status: 'pending',
        ai_source: 'manual',
      });

    if (error) {
      console.error('Error sending reply:', error);
    } else {
      setReplyText('');
      loadMessages(selectedId);
    }
    setSending(false);
  };

  const selected = conversations.find(c => c.id === selectedId);

  return (
    <div className="flex h-screen app-bg">
      {/* Conversation list */}
      <div className="w-full md:w-80 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-green-500" />
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">WhatsApp</h1>
          </div>
          <button onClick={loadConversations} className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 space-y-3 animate-pulse">
              {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg" />)}
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-8 text-center">
              <MessageCircle className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-sm text-gray-400 dark:text-gray-500">
                No conversations yet. Messages will appear here once your WhatsApp webhook is verified and receiving.
              </p>
            </div>
          ) : (
            conversations.map(conv => (
              <button
                key={conv.id}
                onClick={() => setSelectedId(conv.id)}
                className={`w-full text-left p-3 border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors ${selectedId === conv.id ? 'bg-purple-50 dark:bg-purple-900/20' : ''}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {conv.contact_name || formatPhone(conv.phone_number)}
                    </p>
                    {!conv.contact_name && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3" />
                        {formatPhone(conv.phone_number)}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {conv.ai_enabled ? (
                      <Bot className="w-4 h-4 text-green-500" title="AI auto-reply on" />
                    ) : (
                      <User className="w-4 h-4 text-gray-400" title="AI off — manual only" />
                    )}
                  </div>
                </div>
                {conv.last_message_at && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatTime(conv.last_message_at)}
                  </p>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Message thread */}
      <div className="flex-1 flex flex-col">
        {!selected ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageCircle className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-sm text-gray-400 dark:text-gray-500">
                {conversations.length > 0 ? 'Select a conversation to view messages' : 'No conversations yet'}
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  {selected.contact_name || formatPhone(selected.phone_number)}
                </h2>
                <p className="text-xs text-gray-400 dark:text-gray-500">{formatPhone(selected.phone_number)}</p>
              </div>
              <button
                onClick={() => toggleAi(selected)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors"
                title={selected.ai_enabled ? 'AI auto-reply is ON — click to turn off and reply manually' : 'AI is OFF — click to turn on auto-reply'}
              >
                {selected.ai_enabled ? (
                  <><ToggleRight className="w-6 h-6 text-green-500" /><span className="text-green-600 dark:text-green-400">AI On</span></>
                ) : (
                  <><ToggleLeft className="w-6 h-6 text-gray-400" /><span className="text-gray-500 dark:text-gray-400">AI Off</span></>
                )}
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loadingMessages ? (
                <div className="space-y-3 animate-pulse">
                  {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded-lg w-2/3" />)}
                </div>
              ) : messages.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">No messages yet.</p>
              ) : (
                messages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.direction === 'inbound' ? 'justify-start' : 'justify-end'}`}>
                    <div
                      className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm ${msg.direction === 'inbound'
                        ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-bl-sm'
                        : 'bg-green-500 text-white rounded-br-sm'}`}
                    >
                      <p className="whitespace-pre-wrap">{msg.body}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-[10px] opacity-60">{formatTime(msg.created_at)}</span>
                        {msg.ai_source && msg.ai_source !== 'manual' && (
                          <span className="text-[10px] opacity-60 flex items-center gap-0.5">
                            <Bot className="w-2.5 h-2.5" /> AI
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Reply box */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !sending && sendReply()}
                  placeholder="Type a reply..."
                  className="flex-1 px-4 py-2 app-card border border-gray-200 dark:border-gray-700 rounded-full text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <button
                  onClick={sendReply}
                  disabled={!replyText.trim() || sending}
                  className="p-2.5 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Send reply"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              {selected.ai_enabled && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                  AI auto-reply is ON for this number. Your manual replies will still be stored; the AI will also respond to new incoming messages.
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
