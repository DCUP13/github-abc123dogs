import React, { useState, useEffect, useCallback, useContext, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { ThemeContext } from '../App';
import { MessageCircle, Send, Bot, User, ToggleLeft, ToggleRight, Phone, Clock, RefreshCw, Settings as SettingsIcon, X, Save, Info } from 'lucide-react';

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

interface WhatsAppPrompt {
  id: string;
  content: string;
  is_active: boolean;
  prompt_type: 'one_step' | 'two_step';
  step2_content: string | null;
  company_info: string | null;
  property_info: unknown;
}

interface WhatsAppInboxProps {
  onSignOut: () => void;
  currentView: string;
}

function formatPhone(phone: string): string {
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
  const { darkMode } = useContext(ThemeContext);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [showPromptPanel, setShowPromptPanel] = useState(false);
  const [globalAiOn, setGlobalAiOn] = useState(true);

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

  // Load global AI state (prompt.is_active) so the header toggle reflects truth.
  const loadGlobalAiState = useCallback(async () => {
    const { data } = await supabase
      .from('whatsapp_prompts')
      .select('is_active')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    setGlobalAiOn(data?.is_active ?? true);
  }, []);

  useEffect(() => {
    loadConversations();
    loadGlobalAiState();
  }, [loadConversations, loadGlobalAiState]);

  // Realtime: catch new messages + conversation updates. Resubscribes when the
  // selected conversation changes so the open thread gets live inserts.
  const selectedIdRef = useRef<string | null>(null);
  useEffect(() => { selectedIdRef.current = selectedId; }, [selectedId]);

  useEffect(() => {
    const channel = supabase
      .channel('whatsapp_inbox_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_conversations' }, () => {
        loadConversations();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'whatsapp_messages' }, (payload) => {
        const msg = payload.new as Message;
        if (selectedIdRef.current && msg.conversation_id === selectedIdRef.current) {
          setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
        }
      })
      .subscribe();

    // Fallback: poll every 20s in case a realtime event is missed.
    const interval = setInterval(() => {
      loadConversations();
      if (selectedIdRef.current) loadMessages(selectedIdRef.current);
    }, 20000);

    return () => { supabase.removeChannel(channel); clearInterval(interval); };
  }, [loadConversations, loadMessages]);

  useEffect(() => {
    if (selectedId) loadMessages(selectedId);
  }, [selectedId, loadMessages]);

  const toggleAi = async (conv: Conversation) => {
    const { error } = await supabase
      .from('whatsapp_conversations')
      .update({ ai_enabled: !conv.ai_enabled })
      .eq('id', conv.id);
    if (error) { console.error('Error toggling AI:', error); return; }
    setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, ai_enabled: !conv.ai_enabled } : c));
  };

  const toggleGlobalAi = async () => {
    const next = !globalAiOn;
    setGlobalAiOn(next);
    const { data } = await supabase
      .from('whatsapp_prompts')
      .select('id')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) {
      await supabase
        .from('whatsapp_prompts')
        .update({ is_active: next, updated_at: new Date().toISOString() })
        .eq('id', data.id);
    }
  };

  const sendReply = async () => {
    if (!replyText.trim() || !selectedId) return;
    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-send`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ conversationId: selectedId, body: replyText.trim() }),
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        console.error('Send failed:', response.status, errBody);
        alert(errBody?.error || `Send failed (${response.status})`);
      } else {
        setReplyText('');
        loadMessages(selectedId);
      }
    } catch (err) {
      console.error('Error sending reply:', err);
      alert('Could not send the reply. Please try again.');
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
            <MessageCircle className="w-5 h-5" style={{ color: 'var(--accent)' }} />
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">WhatsApp</h1>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={toggleGlobalAi}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
              title={globalAiOn ? 'Global AI is ON — click to pause all AI auto-replies' : 'Global AI is OFF — click to resume AI auto-replies'}
            >
              {globalAiOn ? (
                <><ToggleRight className="w-5 h-5" style={{ color: 'var(--accent)' }} /><span style={{ color: 'var(--accent)' }} className="hidden sm:inline">AI On</span></>
              ) : (
                <><ToggleLeft className="w-5 h-5 text-gray-400" /><span className="text-gray-500 dark:text-gray-400 hidden sm:inline">AI Off</span></>
              )}
            </button>
            <button onClick={() => setShowPromptPanel(true)} className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title="AI reply prompt settings">
              <SettingsIcon className="w-4 h-4" />
            </button>
            <button onClick={loadConversations} className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title="Refresh">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
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
                className={`w-full text-left p-3 border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors ${selectedId === conv.id ? 'app-card-inner' : ''}`}
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
                    {conv.ai_enabled && globalAiOn ? (
                      <Bot className="w-4 h-4" style={{ color: 'var(--accent)' }} title="AI auto-reply on" />
                    ) : (
                      <User className="w-4 h-4 text-gray-400" title={conv.ai_enabled ? 'AI paused globally' : 'AI off — manual only'} />
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
                title={selected.ai_enabled ? 'AI auto-reply is ON for this contact — click to turn off' : 'AI is OFF for this contact — click to turn on'}
              >
                {selected.ai_enabled ? (
                  <><ToggleRight className="w-6 h-6" style={{ color: 'var(--accent)' }} /><span style={{ color: 'var(--accent)' }}>AI On</span></>
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
                        ? 'app-card border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-bl-sm'
                        : 'text-white rounded-br-sm'}`}
                      style={msg.direction === 'outbound' ? { backgroundColor: 'var(--accent)' } : undefined}
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
                  className="flex-1 px-4 py-2 app-card border border-gray-200 dark:border-gray-700 rounded-full text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2"
                  style={{ '--tw-ring-color': 'var(--accent)' } as React.CSSProperties}
                />
                <button
                  onClick={sendReply}
                  disabled={!replyText.trim() || sending}
                  className="p-2.5 text-white rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: 'var(--accent)' }}
                  onMouseEnter={e => { if (!sending && replyText.trim()) e.currentTarget.style.backgroundColor = 'var(--accent-dark)'; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'var(--accent)'; }}
                  title="Send reply"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              {selected.ai_enabled && globalAiOn && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                  AI auto-reply is ON for this number. Your manual replies will still be stored; the AI will also respond to new incoming messages.
                </p>
              )}
              {selected.ai_enabled && !globalAiOn && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                  AI is paused globally. Turn it back on from the header toggle to resume auto-replies.
                </p>
              )}
            </div>
          </>
        )}
      </div>

      {showPromptPanel && (
        <WhatsAppPromptPanel
          onClose={() => setShowPromptPanel(false)}
          onAiToggleChanged={(on) => setGlobalAiOn(on)}
        />
      )}
    </div>
  );
}

// ── WhatsApp AI prompt editor panel ──────────────────────────────────────────
function WhatsAppPromptPanel({ onClose, onAiToggleChanged }: { onClose: () => void; onAiToggleChanged: (on: boolean) => void }) {
  const [prompt, setPrompt] = useState<WhatsAppPrompt | null>(null);
  const [content, setContent] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [promptType, setPromptType] = useState<'one_step' | 'two_step'>('one_step');
  const [step2Content, setStep2Content] = useState('');
  const [companyInfo, setCompanyInfo] = useState('');
  const [propertyInfoText, setPropertyInfoText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('whatsapp_prompts')
      .select('id, content, is_active, prompt_type, step2_content, company_info, property_info')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error loading whatsapp prompt:', error);
    } else if (data) {
      const p = data as WhatsAppPrompt;
      setPrompt(p);
      setContent(p.content);
      setIsActive(p.is_active);
      setPromptType(p.prompt_type || 'one_step');
      setStep2Content(p.step2_content || '');
      setCompanyInfo(p.company_info || '');
      // property_info is jsonb — render as pretty JSON for editing.
      if (p.property_info) {
        try { setPropertyInfoText(JSON.stringify(p.property_info, null, 2)); }
        catch { setPropertyInfoText(''); }
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setSaving(true);
    setSavedMsg(false);
    try {
      let parsedProperty: unknown = null;
      if (propertyInfoText.trim()) {
        try { parsedProperty = JSON.parse(propertyInfoText); }
        catch { alert('Property info is not valid JSON. Use an object like {"address":"123 Main","price":"$500k"} or an array of such objects.'); setSaving(false); return; }
      }

      const payload = {
        content,
        is_active: isActive,
        prompt_type: promptType,
        step2_content: promptType === 'two_step' ? step2Content : null,
        company_info: companyInfo || null,
        property_info: parsedProperty,
        updated_at: new Date().toISOString(),
      };

      if (prompt) {
        const { error } = await supabase
          .from('whatsapp_prompts')
          .update(payload)
          .eq('id', prompt.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('whatsapp_prompts')
          .insert(payload);
        if (error) throw error;
      }
      setSavedMsg(true);
      setTimeout(() => setSavedMsg(false), 2500);
      onAiToggleChanged(isActive);
      load();
    } catch (err) {
      console.error('Error saving whatsapp prompt:', err);
      alert('Could not save the prompt. Please try again.');
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="app-bg rounded-2xl shadow-xl w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5" style={{ color: 'var(--accent)' }} />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">WhatsApp AI Reply Prompt</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">Loading...</div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Master on/off */}
              <div className="flex items-center justify-between p-3 rounded-lg app-card-inner">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">AI auto-replies</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    When on, incoming WhatsApp messages get an AI reply (if the conversation also has AI enabled). When off, you reply to everyone manually.
                  </p>
                </div>
                <button
                  onClick={() => setIsActive(!isActive)}
                  className="flex items-center gap-2 flex-shrink-0 ml-3"
                  title={isActive ? 'Click to turn AI replies off' : 'Click to turn AI replies on'}
                >
                  {isActive ? (
                    <><ToggleRight className="w-7 h-7" style={{ color: 'var(--accent)' }} /><span className="text-sm" style={{ color: 'var(--accent)' }}>On</span></>
                  ) : (
                    <><ToggleLeft className="w-7 h-7 text-gray-400" /><span className="text-sm text-gray-500">Off</span></>
                  )}
                </button>
              </div>

              {/* One-step / Two-step selector */}
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">Prompt mode</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPromptType('one_step')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${promptType === 'one_step' ? 'text-white' : 'app-card border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'}`}
                    style={promptType === 'one_step' ? { backgroundColor: 'var(--accent)' } : undefined}
                  >
                    One-step
                  </button>
                  <button
                    onClick={() => setPromptType('two_step')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${promptType === 'two_step' ? 'text-white' : 'app-card border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'}`}
                    style={promptType === 'two_step' ? { backgroundColor: 'var(--accent)' } : undefined}
                  >
                    Two-step
                  </button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                  {promptType === 'one_step'
                    ? 'The AI runs your prompt once and sends the result as the reply.'
                    : 'The AI runs step 1, then feeds its result into step 2 (via {{step1_result}}). The step-2 output is what gets sent.'}
                </p>
              </div>

              {/* Step 1 prompt editor */}
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                  {promptType === 'two_step' ? 'Step 1 prompt' : 'Reply prompt'}
                </label>
                <textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  rows={8}
                  placeholder="You are a helpful assistant replying to WhatsApp messages from leads. Be friendly and concise.&#10;&#10;Incoming message: {{whatsapp_message}}&#10;Contact: {{contact_name}}&#10;Recent conversation:&#10;{{conversation_history}}&#10;&#10;Here are FAQs that may help:&#10;{{faq_knowledge_base}}"
                  className="w-full px-3 py-2 app-card border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 resize-y font-mono"
                  style={{ '--tw-ring-color': 'var(--accent)' } as React.CSSProperties}
                />
              </div>

              {/* Step 2 prompt editor (only for two-step) */}
              {promptType === 'two_step' && (
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">Step 2 prompt</label>
                  <textarea
                    value={step2Content}
                    onChange={e => setStep2Content(e.target.value)}
                    rows={8}
                    placeholder="Using the analysis from step 1, write the final WhatsApp reply.&#10;&#10;Step 1 result:&#10;{{step1_result}}&#10;&#10;Original message: {{whatsapp_message}}"
                    className="w-full px-3 py-2 app-card border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 resize-y font-mono"
                    style={{ '--tw-ring-color': 'var(--accent)' } as React.CSSProperties}
                  />
                </div>
              )}

              {/* Company info */}
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">Company info <span className="text-gray-400 font-normal">(optional)</span></label>
                <textarea
                  value={companyInfo}
                  onChange={e => setCompanyInfo(e.target.value)}
                  rows={3}
                  placeholder="Company name, services, hours, website, etc. Reference with {{company_info}} in the prompt."
                  className="w-full px-3 py-2 app-card border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 resize-y"
                  style={{ '--tw-ring-color': 'var(--accent)' } as React.CSSProperties}
                />
              </div>

              {/* Property info */}
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">Property info <span className="text-gray-400 font-normal">(optional, JSON)</span></label>
                <textarea
                  value={propertyInfoText}
                  onChange={e => setPropertyInfoText(e.target.value)}
                  rows={5}
                  placeholder='{"address":"123 Main St","price":"$500,000","beds":3,"baths":2,"sqft":1800,"description":"Charming family home near schools."}'
                  className="w-full px-3 py-2 app-card border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 resize-y font-mono"
                  style={{ '--tw-ring-color': 'var(--accent)' } as React.CSSProperties}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Use a single object or an array of objects. Reference with <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">{'{{property_info}}'}</code> in the prompt.
                </p>
              </div>

              {/* Placeholder help */}
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                    <p className="font-medium">Placeholders you can use in the prompt:</p>
                    <ul className="space-y-0.5 list-disc list-inside">
                      <li><code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">{'{{whatsapp_message}}'}</code> — the latest incoming message text</li>
                      <li><code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">{'{{conversation_history}}'}</code> — recent back-and-forth in this chat</li>
                      <li><code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">{'{{contact_name}}'}</code> — the contact's name (or phone number)</li>
                      <li><code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">{'{{company_info}}'}</code> — the company info you entered above</li>
                      <li><code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">{'{{property_info}}'}</code> — the property info you entered above</li>
                      <li><code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">{'{{faq_knowledge_base}}'}</code> — your active FAQ Q&A pairs</li>
                      {promptType === 'two_step' && (
                        <li><code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">{'{{step1_result}}'}</code> — the step-1 AI output (step 2 only)</li>
                      )}
                    </ul>
                    <p className="pt-1">Only include <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">{'{{faq_knowledge_base}}'}</code> if you want the AI to use your FAQs. Write instructions in the prompt for how the AI should pick and use them.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs" style={{ color: 'var(--accent)' }}>{savedMsg ? 'Saved!' : ''}</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={save}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-white rounded-lg transition-colors disabled:opacity-50"
                  style={{ backgroundColor: 'var(--accent)' }}
                  onMouseEnter={e => { if (!saving) e.currentTarget.style.backgroundColor = 'var(--accent-dark)'; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'var(--accent)'; }}
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save prompt'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
