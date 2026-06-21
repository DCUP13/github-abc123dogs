import React, { useState, useEffect, useRef } from 'react';
import { Users, Send, Search, ChevronLeft, MessageSquare } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface TeamMember {
  user_id: string;
  email: string;
  name: string;
  role: string;
  conversationId?: string;
  lastMessageAt?: string;
}

interface TeamMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

interface TeamViewProps {
  onSignOut: () => void;
}

const AVATAR_COLORS = [
  'from-blue-500 to-blue-700',
  'from-emerald-500 to-emerald-700',
  'from-violet-500 to-violet-700',
  'from-orange-500 to-orange-700',
  'from-rose-500 to-rose-700',
  'from-teal-500 to-teal-700',
];

function avatarGradient(userId: string) {
  const n = userId.charCodeAt(0) + userId.charCodeAt(userId.length - 1);
  return AVATAR_COLORS[n % AVATAR_COLORS.length];
}

function roleStyle(role: string) {
  switch (role) {
    case 'owner': return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400';
    case 'manager': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400';
    default: return 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400';
  }
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  if (h < 24) return `${h}h`;
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString();
}

function getInitial(m: TeamMember) {
  return (m.name || m.email).charAt(0).toUpperCase();
}

function sortMembers(list: TeamMember[]): TeamMember[] {
  return [...list].sort((a, b) => {
    if (a.lastMessageAt && b.lastMessageAt)
      return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
    if (a.lastMessageAt) return -1;
    if (b.lastMessageAt) return 1;
    return (a.name || a.email).localeCompare(b.name || b.email);
  });
}

export function TeamView({ onSignOut }: TeamViewProps) {
  const [orgName, setOrgName] = useState('');
  const [orgId, setOrgId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<TeamMessage[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const bottomRef = useRef<HTMLDivElement>(null);
  const msgChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const convChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    loadData();
    return () => {
      if (convChannelRef.current) supabase.removeChannel(convChannelRef.current);
    };
  }, []);

  useEffect(() => {
    setConversationId(null);
    setMessages([]);
    if (msgChannelRef.current) {
      supabase.removeChannel(msgChannelRef.current);
      msgChannelRef.current = null;
    }
    if (selectedId && currentUserId) openConversation(selectedId);
  }, [selectedId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function loadData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    setCurrentUserId(user.id);

    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!membership) { setLoading(false); return; }
    setOrgId(membership.organization_id);

    const [{ data: org }, { data: memberRows }, { data: convRows }] = await Promise.all([
      supabase.from('organizations').select('name').eq('id', membership.organization_id).single(),
      supabase
        .from('organization_members_with_emails')
        .select('user_id, email, name, role')
        .eq('organization_id', membership.organization_id)
        .neq('user_id', user.id),
      supabase
        .from('team_conversations')
        .select('id, participant_1, participant_2, last_message_at')
        .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`),
    ]);

    if (org) setOrgName(org.name);

    const enriched: TeamMember[] = (memberRows ?? []).map(m => {
      const conv = (convRows ?? []).find(c => c.participant_1 === m.user_id || c.participant_2 === m.user_id);
      return conv
        ? { ...m, conversationId: conv.id, lastMessageAt: conv.last_message_at }
        : { ...m };
    });

    setMembers(sortMembers(enriched));
    setLoading(false);
    subscribeToConversationUpdates(user.id);
  }

  function subscribeToConversationUpdates(userId: string) {
    if (convChannelRef.current) supabase.removeChannel(convChannelRef.current);
    convChannelRef.current = supabase
      .channel('team-conv-list')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'team_conversations' }, (payload) => {
        const c = payload.new as { id: string; participant_1: string; participant_2: string; last_message_at: string };
        const otherId = c.participant_1 === userId ? c.participant_2 : c.participant_1;
        setMembers(prev => sortMembers(prev.map(m =>
          m.user_id === otherId ? { ...m, conversationId: c.id, lastMessageAt: c.last_message_at } : m
        )));
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'team_conversations' }, (payload) => {
        const c = payload.new as { id: string; participant_1: string; participant_2: string; last_message_at: string };
        const otherId = c.participant_1 === userId ? c.participant_2 : c.participant_1;
        setMembers(prev => sortMembers(prev.map(m =>
          m.user_id === otherId ? { ...m, conversationId: c.id, lastMessageAt: c.last_message_at } : m
        )));
      })
      .subscribe();
  }

  async function openConversation(memberId: string) {
    if (!currentUserId) return;
    const [p1, p2] = [currentUserId, memberId].sort();
    const { data: conv } = await supabase
      .from('team_conversations')
      .select('id')
      .eq('participant_1', p1)
      .eq('participant_2', p2)
      .maybeSingle();

    if (conv) {
      setConversationId(conv.id);
      const { data } = await supabase
        .from('team_messages')
        .select('*')
        .eq('conversation_id', conv.id)
        .order('created_at', { ascending: true });
      setMessages(data ?? []);
      subscribeToMessages(conv.id);
    }
  }

  function subscribeToMessages(convId: string) {
    if (msgChannelRef.current) supabase.removeChannel(msgChannelRef.current);
    msgChannelRef.current = supabase
      .channel(`team-msgs-${convId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'team_messages',
        filter: `conversation_id=eq.${convId}`,
      }, (payload) => {
        setMessages(prev => {
          if (prev.find(m => m.id === payload.new.id)) return prev;
          return [...prev, payload.new as TeamMessage];
        });
      })
      .subscribe();
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || !selectedId || !currentUserId || !orgId) return;
    setSending(true);

    try {
      let convId = conversationId;

      if (!convId) {
        const [p1, p2] = [currentUserId, selectedId].sort();
        const { data: newConv, error } = await supabase
          .from('team_conversations')
          .insert({ organization_id: orgId, participant_1: p1, participant_2: p2 })
          .select('id')
          .single();
        if (error) throw error;
        convId = newConv.id;
        setConversationId(convId);
        subscribeToMessages(convId);
      }

      const { data: msg, error: msgErr } = await supabase
        .from('team_messages')
        .insert({ conversation_id: convId, sender_id: currentUserId, body })
        .select()
        .single();
      if (msgErr) throw msgErr;

      setMessages(prev => [...prev, msg]);
      setText('');

      const now = new Date().toISOString();
      await supabase.from('team_conversations').update({ last_message_at: now }).eq('id', convId);
      setMembers(prev => sortMembers(prev.map(m =>
        m.user_id === selectedId ? { ...m, conversationId: convId!, lastMessageAt: now } : m
      )));
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setSending(false);
    }
  }

  const selected = members.find(m => m.user_id === selectedId);
  const filtered = members.filter(m => {
    const q = search.toLowerCase();
    return !q || m.email.toLowerCase().includes(q) || m.name.toLowerCase().includes(q);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!orgId) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-400 dark:text-gray-500">
        <div className="text-center">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">You are not part of any organization yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col app-bg" style={{ minHeight: 'calc(100dvh - 48px)' }}>

      {/* Page header */}
      <div className="px-4 md:px-8 py-4 md:py-5 border-b border-gray-200 dark:border-gray-700 app-card flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
            <Users className="w-5 h-5 md:w-6 md:h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{orgName || 'Team'}</h1>
            <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">
              {members.length} member{members.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Two-panel body */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left: member list — hidden on mobile when chat is open */}
        <div className={`flex flex-col flex-shrink-0 border-r border-gray-200 dark:border-gray-700 md:w-72 ${selectedId ? 'hidden md:flex' : 'flex w-full'}`}>
          <div className="p-3 border-b border-gray-200 dark:border-gray-700 app-card flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search people..."
                style={{ fontSize: 16 }}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 && (
              <div className="text-center py-12 px-4 text-gray-400 dark:text-gray-500">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">{members.length === 0 ? 'No team members yet.' : 'No results.'}</p>
              </div>
            )}
            {filtered.map(m => (
              <button
                key={m.user_id}
                onClick={() => setSelectedId(m.user_id)}
                className={`w-full text-left px-4 py-3.5 border-b border-gray-100 dark:border-gray-800 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50 active:bg-gray-100 dark:active:bg-gray-800 ${
                  selectedId === m.user_id ? 'bg-blue-50 dark:bg-blue-900/20 border-l-2 border-l-blue-600' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarGradient(m.user_id)} flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}>
                    {getInitial(m)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{m.name || m.email}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${roleStyle(m.role)}`}>{m.role}</span>
                      {m.lastMessageAt && (
                        <span className="text-xs text-gray-400 dark:text-gray-500">{relativeTime(m.lastMessageAt)}</span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right: chat panel — visible on mobile only when a member is selected */}
        <div className={`flex flex-col flex-1 min-w-0 min-h-0 ${selectedId ? 'flex' : 'hidden md:flex'}`}>
          {selected ? (
            <>
              {/* Chat header */}
              <div className="px-4 md:px-6 py-3 border-b border-gray-200 dark:border-gray-700 app-card flex items-center gap-3 flex-shrink-0">
                <button
                  onClick={() => setSelectedId(null)}
                  className="md:hidden flex items-center gap-1 text-sm font-medium text-blue-600 dark:text-blue-400 py-1 pr-2 flex-shrink-0"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>
                <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarGradient(selected.user_id)} flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}>
                  {getInitial(selected)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-white truncate">{selected.name || selected.email}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{selected.email}</p>
                </div>
                <span className={`flex-shrink-0 text-xs px-2 py-1 rounded-full font-medium ${roleStyle(selected.role)}`}>
                  {selected.role}
                </span>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto min-h-0 px-4 md:px-6 py-4 space-y-3">
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500 py-16">
                    <MessageSquare className="w-10 h-10 mb-3 opacity-30" />
                    <p className="text-sm font-medium">No messages yet</p>
                    <p className="text-xs mt-1">Say hello to {selected.name || selected.email}</p>
                  </div>
                )}
                {messages.map(msg => {
                  const isMe = msg.sender_id === currentUserId;
                  return (
                    <div key={msg.id} className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                      {!isMe && (
                        <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${avatarGradient(selected.user_id)} flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mb-0.5`}>
                          {getInitial(selected)}
                        </div>
                      )}
                      <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                        isMe
                          ? 'bg-blue-600 text-white rounded-br-sm'
                          : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-bl-sm'
                      }`}>
                        <p className="text-sm whitespace-pre-wrap break-words">{msg.body}</p>
                        <p className={`text-xs mt-1 ${isMe ? 'text-blue-200' : 'text-gray-400 dark:text-gray-500'}`}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              {/* Message input */}
              <div className="px-4 md:px-6 py-3 md:py-4 border-t border-gray-200 dark:border-gray-700 app-card flex-shrink-0">
                <form onSubmit={handleSend} className="flex gap-2">
                  <input
                    value={text}
                    onChange={e => setText(e.target.value)}
                    placeholder={`Message ${selected.name || selected.email}...`}
                    style={{ fontSize: 16 }}
                    className="flex-1 px-3 md:px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    disabled={sending}
                    autoComplete="off"
                  />
                  <button
                    type="submit"
                    disabled={sending || !text.trim()}
                    className="px-3 md:px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400 dark:text-gray-500">
              <div className="text-center">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">Select a team member</p>
                <p className="text-xs mt-1">to start a conversation</p>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
