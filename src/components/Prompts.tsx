import React, { useState, useEffect, useCallback } from 'react';
import {
  MessageSquare, Plus, CreditCard as Edit, Trash2, Search, Copy, Check, X,
  Globe, GitBranch, ArrowRight, Home, ChevronDown, ChevronUp, Users, Share2,
  Mail, Zap, ArrowLeft, Shield, Eye
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from '../lib/toast';
import { useEmails } from '../contexts/EmailContext';

interface PromptsProps {
  onSignOut: () => void;
  currentView: string;
}

interface Prompt {
  id: string;
  title: string;
  content: string;
  category: string;
  prompt_type: 'one_step' | 'two_step';
  step2_content: string | null;
  property_info: PropertyInfo[] | null;
  company_info: string | null;
  response_mode: 'ai' | 'template' | 'intelligent_template';
  template_subject: string | null;
  template_body: string | null;
  template_ai_instructions: string | null;
  created_at: string;
  updated_at: string;
  domains: string[];
}

interface PropertyInfo {
  address: string;
  price: string;
  bedrooms: string;
  bathrooms: string;
  sqft: string;
  property_type: string;
  description: string;
  features: string;
}

interface SharedPrompt {
  id: string;
  prompt_id: string;
  shared_by: string;
  scope: 'global' | 'organization' | 'team';
  created_at: string;
  sharer_email: string;
  prompt: Prompt;
  org_names: string[];
}

interface Org {
  id: string;
  name: string;
}

const emptyProperty = (): PropertyInfo => ({
  address: '', price: '', bedrooms: '', bathrooms: '',
  sqft: '', property_type: '', description: '', features: ''
});

const AI_CATEGORIES = [
  'General',
  'Email Marketing',
  'Real Estate',
  'Customer Service',
  'Sales',
  'Follow-up',
  'Other'
];

const ALL_CATEGORIES = [...AI_CATEGORIES, 'Template'];

export function Prompts({ onSignOut, currentView }: PromptsProps) {
  const { sesDomains, sesEmails } = useEmails();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [autoresponderDomains, setAutoresponderDomains] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortOrder, setSortOrder] = useState<'updated_desc' | 'updated_asc' | 'created_desc' | 'created_asc' | 'title_asc' | 'title_desc'>('updated_desc');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [collapsedProperties, setCollapsedProperties] = useState<Set<number>>(new Set());

  // Sharing
  const [view, setView] = useState<'mine' | 'shared'>('mine');
  const [sharedPrompts, setSharedPrompts] = useState<SharedPrompt[]>([]);
  const [sharedLoading, setSharedLoading] = useState(false);
  const [isPlatformOwner, setIsPlatformOwner] = useState(false);
  const [userOrgs, setUserOrgs] = useState<Org[]>([]);
  const [sharedRecords, setSharedRecords] = useState<Record<string, { id: string; scope: string; org_ids: string[] }>>({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [previewingShared, setPreviewingShared] = useState<SharedPrompt | null>(null);

  // Shared IDs set — prompts that the current user has already shared (to show badge)
  const sharedPromptIds = new Set(Object.keys(sharedRecords));

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'General',
    prompt_type: 'one_step' as 'one_step' | 'two_step',
    step2_content: '',
    domains: [] as string[],
    properties: [] as PropertyInfo[],
    company_info: '',
    response_mode: 'ai' as 'ai' | 'template' | 'intelligent_template',
    template_subject: '',
    template_body: '',
    template_ai_instructions: '',
    // sharing
    share_enabled: false,
    share_scope: 'team' as 'global' | 'organization' | 'team',
    share_org_ids: [] as string[],
  });

  useEffect(() => {
    fetchPrompts();
    fetchAutoresponderDomains();
    fetchSortOrder();
    fetchUserMeta();
  }, []);

  const fetchUserMeta = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [profileResult, orgsResult, sharedResult] = await Promise.all([
      supabase.from('profiles').select('is_platform_owner').eq('id', user.id).maybeSingle(),
      supabase
        .from('organization_members')
        .select('organizations(id, name)')
        .eq('user_id', user.id),
      supabase
        .from('shared_prompts')
        .select('id, prompt_id, scope, shared_prompt_orgs(organization_id)')
        .eq('shared_by', user.id),
    ]);

    setIsPlatformOwner(profileResult.data?.is_platform_owner ?? false);
    setCurrentUserId(user.id);

    const orgs: Org[] = (orgsResult.data || [])
      .map((r: any) => r.organizations)
      .filter(Boolean)
      .map((o: any) => ({ id: o.id, name: o.name }));
    setUserOrgs(orgs);

    const records: Record<string, { id: string; scope: string; org_ids: string[] }> = {};
    for (const sp of (sharedResult.data || []) as any[]) {
      records[sp.prompt_id] = {
        id: sp.id,
        scope: sp.scope,
        org_ids: (sp.shared_prompt_orgs || []).map((o: any) => o.organization_id),
      };
    }
    setSharedRecords(records);
  };

  const fetchSortOrder = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('user_settings')
      .select('prompts_sort_order, prompts_category_filter')
      .eq('user_id', user.id)
      .maybeSingle();
    if (data?.prompts_sort_order) setSortOrder(data.prompts_sort_order as typeof sortOrder);
    if (data?.prompts_category_filter) setSelectedCategory(data.prompts_category_filter);
  };

  const handleSortChange = async (value: typeof sortOrder) => {
    setSortOrder(value);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('user_settings').upsert({ user_id: user.id, prompts_sort_order: value }, { onConflict: 'user_id' });
  };

  const handleCategoryChange = async (value: string) => {
    setSelectedCategory(value);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('user_settings').upsert({ user_id: user.id, prompts_category_filter: value }, { onConflict: 'user_id' });
  };

  const fetchAutoresponderDomains = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('amazon_ses_domains').select('domain').eq('user_id', user.id).eq('autoresponder_enabled', true);
    setAutoresponderDomains(new Set(data?.map(d => d.domain) || []));
  };

  const fetchPrompts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsLoading(false); return; }

      const { data: promptsData, error: promptsError } = await supabase
        .from('prompts').select('*').eq('user_id', user.id).order('updated_at', { ascending: false });

      if (promptsError) { setPrompts([]); setIsLoading(false); return; }

      const { data: domainsData } = await supabase
        .from('prompt_domains').select('prompt_id, domain').eq('user_id', user.id);

      const domainsByPrompt = (domainsData || []).reduce((acc, item) => {
        if (!acc[item.prompt_id]) acc[item.prompt_id] = [];
        acc[item.prompt_id].push(item.domain);
        return acc;
      }, {} as Record<string, string[]>);

      setPrompts((promptsData || []).map(prompt => ({
        ...prompt,
        property_info: prompt.property_info
          ? Array.isArray(prompt.property_info) ? prompt.property_info : [prompt.property_info]
          : null,
        response_mode: prompt.response_mode || 'ai',
        domains: domainsByPrompt[prompt.id] || []
      })));
    } catch (err) {
      console.error('Error fetching prompts:', err);
      setPrompts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSharedPrompts = useCallback(async () => {
    setSharedLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch shared prompts via SECURITY DEFINER RPC to avoid cross-table RLS recursion
      const { data, error } = await supabase.rpc('get_shared_prompts_for_user');

      if (error) { console.error('Error fetching shared prompts:', error); return; }

      // Resolve sharer emails separately via profiles
      const sharerIds = [...new Set((data || []).map((sp: any) => sp.shared_by))];
      const { data: profilesData } = sharerIds.length > 0
        ? await supabase.from('profiles').select('id, email').in('id', sharerIds)
        : { data: [] };
      const profileMap: Record<string, string> = {};
      for (const p of (profilesData || []) as any[]) {
        profileMap[p.id] = p.email;
      }

      const { data: domainsData } = await supabase.from('prompt_domains').select('prompt_id, domain');
      const domainsByPrompt = (domainsData || []).reduce((acc, item) => {
        if (!acc[item.prompt_id]) acc[item.prompt_id] = [];
        acc[item.prompt_id].push(item.domain);
        return acc;
      }, {} as Record<string, string[]>);

      setSharedPrompts((data || []).map((sp: any) => ({
        id: sp.id,
        prompt_id: sp.prompt_id,
        shared_by: sp.shared_by,
        scope: sp.scope,
        created_at: sp.created_at,
        sharer_email: profileMap[sp.shared_by] || 'Unknown',
        org_names: (sp.shared_prompt_orgs || []).map((o: any) => o.organizations?.name).filter(Boolean),
        prompt: {
          id: sp.p_id,
          user_id: sp.p_user_id,
          title: sp.p_title,
          content: sp.p_content,
          category: sp.p_category,
          prompt_type: sp.p_prompt_type,
          step2_content: sp.p_step2_content,
          response_mode: sp.p_response_mode || 'ai',
          template_subject: sp.p_template_subject,
          template_body: sp.p_template_body,
          template_ai_instructions: sp.p_template_ai_instructions,
          property_info: sp.p_property_info
            ? Array.isArray(sp.p_property_info) ? sp.p_property_info : [sp.p_property_info]
            : null,
          company_info: sp.p_company_info,
          created_at: sp.p_created_at,
          updated_at: sp.p_updated_at,
          domains: domainsByPrompt[sp.prompt_id] || []
        }
      })));
    } finally {
      setSharedLoading(false);
    }
  }, []);

  useEffect(() => {
    if (view === 'shared') fetchSharedPrompts();
  }, [view, fetchSharedPrompts]);

  const handleSavePrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const isTemplate = formData.response_mode !== 'ai';
      const isRealEstate = formData.category === 'Real Estate' && !isTemplate;
      const filledProperties = formData.properties.filter(p => Object.values(p).some(v => v.trim() !== ''));

      const promptData: any = {
        title: formData.title.trim(),
        content: isTemplate ? '' : formData.content.trim(),
        category: formData.category,
        prompt_type: isTemplate ? 'one_step' : formData.prompt_type,
        step2_content: (!isTemplate && formData.prompt_type === 'two_step') ? (formData.step2_content.trim() || null) : null,
        property_info: isRealEstate && filledProperties.length > 0 ? filledProperties : null,
        company_info: (formData.category === 'General' && !isTemplate) ? (formData.company_info.trim() || null) : null,
        response_mode: formData.response_mode,
        template_subject: isTemplate ? (formData.template_subject.trim() || null) : null,
        template_body: isTemplate ? (formData.template_body.trim() || null) : null,
        template_ai_instructions: (formData.response_mode === 'intelligent_template') ? (formData.template_ai_instructions.trim() || null) : null,
        user_id: user.id,
        updated_at: new Date().toISOString()
      };

      let promptId: string;

      if (editingPrompt) {
        const { error } = await supabase.from('prompts').update(promptData).eq('id', editingPrompt.id);
        if (error) throw error;
        promptId = editingPrompt.id;
        await supabase.from('prompt_domains').delete().eq('prompt_id', editingPrompt.id);
      } else {
        const { data: newPrompt, error } = await supabase.from('prompts').insert(promptData).select().single();
        if (error) throw error;
        promptId = newPrompt.id;
      }

      if (formData.domains.length > 0) {
        await supabase.from('prompt_domains').insert(
          formData.domains.map(domain => ({ prompt_id: promptId, domain, user_id: user.id }))
        );
      }

      // Handle sharing
      if (formData.share_enabled) {
        await upsertSharing(promptId, formData.share_scope, formData.share_org_ids, user.id);
      } else if (editingPrompt && sharedRecords[editingPrompt.id]) {
        // Sharing was turned off — remove
        await supabase.from('shared_prompts').delete().eq('id', sharedRecords[editingPrompt.id].id);
      }

      await fetchPrompts();
      await fetchUserMeta();
      resetForm();
    } catch (error) {
      console.error('Error saving prompt:', error);
      toast.error('Failed to save prompt. Please try again.');
    }
  };

  const upsertSharing = async (promptId: string, scope: string, orgIds: string[], userId: string) => {
    const effectiveScope = isPlatformOwner ? scope : 'team';
    const effectiveOrgIds = effectiveScope === 'organization' ? orgIds : [];

    // Delete existing first to handle scope changes
    const existing = sharedRecords[promptId];
    if (existing) {
      await supabase.from('shared_prompts').delete().eq('id', existing.id);
    }

    const { data: sp, error } = await supabase
      .from('shared_prompts')
      .insert({ prompt_id: promptId, shared_by: userId, scope: effectiveScope })
      .select()
      .single();

    if (error) { console.error('Error sharing prompt:', error); toast.error('Failed to share prompt: ' + error.message); return; }

    if (effectiveScope === 'organization' && effectiveOrgIds.length > 0) {
      await supabase.from('shared_prompt_orgs').insert(
        effectiveOrgIds.map(organization_id => ({ shared_prompt_id: sp.id, organization_id }))
      );
    }
  };

  const handleEditPrompt = (prompt: Prompt) => {
    setEditingPrompt(prompt);
    const existingShare = sharedRecords[prompt.id];
    const properties = prompt.property_info && prompt.property_info.length > 0 ? prompt.property_info : [];
    setFormData({
      title: prompt.title,
      content: prompt.content,
      category: prompt.category,
      prompt_type: prompt.prompt_type || 'one_step',
      step2_content: prompt.step2_content || '',
      domains: prompt.domains || [],
      properties,
      company_info: prompt.company_info || '',
      response_mode: prompt.response_mode || 'ai',
      template_subject: prompt.template_subject || '',
      template_body: prompt.template_body || '',
      template_ai_instructions: prompt.template_ai_instructions || '',
      share_enabled: !!existingShare,
      share_scope: (existingShare?.scope as any) || 'team',
      share_org_ids: existingShare?.org_ids || [],
    });
    setCollapsedProperties(new Set());
    setShowCreateModal(true);
  };

  const handleDeletePrompt = (id: string) => setConfirmDeleteId(id);

  const handleConfirmDelete = async () => {
    if (!confirmDeleteId) return;
    const id = confirmDeleteId;
    setConfirmDeleteId(null);
    try {
      const { error } = await supabase.from('prompts').delete().eq('id', id);
      if (error) throw error;
      await fetchPrompts();
      await fetchUserMeta();
    } catch {
      toast.error('Failed to delete prompt. Please try again.');
    }
  };

  const handleDuplicatePrompt = async (prompt: Prompt) => {
    setDuplicatingId(prompt.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const baseName = prompt.title.replace(/ \(copy ?[0-9]*\)$/i, '');
      const siblings = prompts.filter(p => p.title.startsWith(baseName));
      const copyNum = siblings.length;
      const newTitle = `${baseName} (copy${copyNum > 1 ? ` ${copyNum}` : ''})`;

      const { data: newPrompt, error } = await supabase.from('prompts').insert({
        user_id: user.id,
        title: newTitle,
        content: prompt.content,
        category: prompt.category,
        prompt_type: prompt.prompt_type,
        step2_content: prompt.step2_content,
        property_info: prompt.property_info,
        company_info: prompt.company_info,
        response_mode: prompt.response_mode,
        template_subject: prompt.template_subject,
        template_body: prompt.template_body,
        template_ai_instructions: prompt.template_ai_instructions,
        updated_at: new Date(new Date(prompt.updated_at).getTime() - 1).toISOString(),
        created_at: new Date(new Date(prompt.updated_at).getTime() - 1).toISOString(),
      }).select('id').single();

      if (error) throw error;

      if (prompt.domains?.length > 0 && newPrompt) {
        await supabase.from('prompt_domains').insert(
          prompt.domains.map(domain => ({ user_id: user.id, prompt_id: newPrompt.id, domain }))
        );
      }
      await fetchPrompts();
    } catch {
      toast.error('Failed to duplicate prompt. Please try again.');
    } finally {
      setDuplicatingId(null);
    }
  };

  const handleUseSharedPrompt = async (sp: SharedPrompt) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (!sp.prompt?.title) {
        toast.error('Prompt data unavailable — please refresh and try again.');
        return;
      }

      const { data: newPrompt, error } = await supabase.from('prompts').insert({
        user_id: user.id,
        title: sp.prompt.title,
        content: sp.prompt.content,
        category: sp.prompt.category,
        prompt_type: sp.prompt.prompt_type,
        step2_content: sp.prompt.step2_content,
        property_info: sp.prompt.property_info,
        company_info: sp.prompt.company_info,
        response_mode: sp.prompt.response_mode,
        template_subject: sp.prompt.template_subject,
        template_body: sp.prompt.template_body,
        template_ai_instructions: sp.prompt.template_ai_instructions,
      }).select('id').single();

      if (error) throw error;

      toast.success('Prompt copied to your library.');
      await fetchPrompts();
      setView('mine');
    } catch {
      toast.error('Failed to copy prompt.');
    }
  };

  const handleRemoveShared = async (sharedId: string, promptId: string) => {
    const { error } = await supabase.from('shared_prompts').delete().eq('id', sharedId);
    if (error) { toast.error('Failed to remove from shared.'); return; }
    toast.success('Prompt removed from shared.');
    await fetchSharedPrompts();
    await fetchUserMeta();
    // Refresh prompts so badge updates
    await fetchPrompts();
  };

  const handleAddDomain = (domain: string) => {
    if (!formData.domains.includes(domain))
      setFormData(prev => ({ ...prev, domains: [...prev.domains, domain] }));
  };

  const handleRemoveDomain = (domain: string) =>
    setFormData(prev => ({ ...prev, domains: prev.domains.filter(d => d !== domain) }));

  const handleAddProperty = () =>
    setFormData(prev => ({ ...prev, properties: [...prev.properties, emptyProperty()] }));

  const handleRemoveProperty = (index: number) => {
    setFormData(prev => ({ ...prev, properties: prev.properties.filter((_, i) => i !== index) }));
    setCollapsedProperties(prev => {
      const next = new Set<number>();
      prev.forEach(i => { if (i < index) next.add(i); else if (i > index) next.add(i - 1); });
      return next;
    });
  };

  const handlePropertyChange = (index: number, field: keyof PropertyInfo, value: string) => {
    setFormData(prev => ({
      ...prev,
      properties: prev.properties.map((p, i) => i === index ? { ...p, [field]: value } : p)
    }));
  };

  const togglePropertyCollapse = (index: number) => {
    setCollapsedProperties(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index); else next.add(index);
      return next;
    });
  };

  const propertyLabel = (p: PropertyInfo, index: number) => {
    if (p.address.trim()) return p.address.trim();
    if (p.price.trim()) return `Property ${index + 1} — ${p.price.trim()}`;
    return `Property ${index + 1}`;
  };

  const resetForm = () => {
    setFormData({
      title: '', content: '', category: 'General', prompt_type: 'one_step',
      step2_content: '', domains: [], properties: [], company_info: '',
      response_mode: 'ai', template_subject: '', template_body: '',
      template_ai_instructions: '', share_enabled: false, share_scope: 'team', share_org_ids: []
    });
    setCollapsedProperties(new Set());
    setEditingPrompt(null);
    setShowCreateModal(false);
  };

  const filteredPrompts = prompts
    .filter(prompt => {
      const matchesSearch = prompt.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prompt.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (prompt.template_body || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || prompt.category === selectedCategory ||
        (selectedCategory === 'Template' && prompt.response_mode !== 'ai');
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      switch (sortOrder) {
        case 'updated_asc':  return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
        case 'updated_desc': return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        case 'created_desc': return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'created_asc':  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'title_asc':    return a.title.localeCompare(b.title);
        case 'title_desc':   return b.title.localeCompare(a.title);
        default:             return 0;
      }
    });

  if (isLoading) {
    return (
      <div className="p-4 md:p-8 app-bg min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin theme-spinner" />
      </div>
    );
  }

  // ─── Shared Prompts View ───────────────────────────────────────────────────

  const myShares = sharedPrompts.filter(sp => sp.shared_by === currentUserId);
  const sharedWithMe = sharedPrompts.filter(sp => sp.shared_by !== currentUserId);
  const globalShares = isPlatformOwner ? sharedPrompts.filter(sp => sp.scope === 'global') : [];

  const scopeLabel = (sp: SharedPrompt) => {
    if (sp.scope === 'global') return 'All Users';
    if (sp.scope === 'team') return 'My Team';
    if (sp.org_names.length > 0) return sp.org_names.join(', ');
    return 'Organization';
  };

  const renderModeBadge = (prompt: Prompt) => {
    if (prompt.response_mode === 'template') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 rounded-full">
          <Mail className="w-3 h-3" />Template
        </span>
      );
    }
    if (prompt.response_mode === 'intelligent_template') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300 rounded-full">
          <Zap className="w-3 h-3" />Intelligent
        </span>
      );
    }
    if (prompt.prompt_type === 'two_step') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 rounded-full">
          <GitBranch className="w-3 h-3" />2-Step
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 rounded-full">
        <ArrowRight className="w-3 h-3" />1-Step
      </span>
    );
  };

  if (view === 'shared') {
    return (
      <>
      <div className="p-4 md:p-8 app-bg min-h-screen">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => setView('mine')}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Shared Prompts</h1>
          </div>

          {sharedLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin theme-spinner" />
            </div>
          ) : (
            <div className="space-y-8">

              {/* Shared by Me */}
              <section>
                <h2 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  <Share2 className="w-4 h-4" />Shared by Me
                </h2>
                {myShares.length === 0 ? (
                  <div className="app-card rounded-xl p-6 text-center text-gray-500 dark:text-gray-400 text-sm">
                    You haven't shared any prompts yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {myShares.map(sp => (
                      <div key={sp.id} className="app-card rounded-xl p-5 shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => setPreviewingShared(sp)}>
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 dark:text-white truncate">{sp.prompt.title}</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 rounded-full">{sp.prompt.category}</span>
                              {renderModeBadge(sp.prompt)}
                              <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 rounded-full flex items-center gap-1">
                                <Globe className="w-3 h-3" />{scopeLabel(sp)}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleRemoveShared(sp.id, sp.prompt_id)}
                            className="ml-2 p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            title="Remove from shared"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                          Shared {new Date(sp.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Shared with Me */}
              <section>
                <h2 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  <Eye className="w-4 h-4" />Shared with Me
                </h2>
                {sharedWithMe.length === 0 ? (
                  <div className="app-card rounded-xl p-6 text-center text-gray-500 dark:text-gray-400 text-sm">
                    No prompts have been shared with you yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {sharedWithMe.map(sp => (
                      <div key={sp.id} className="app-card rounded-xl p-5 shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => setPreviewingShared(sp)}>
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 dark:text-white truncate">{sp.prompt.title}</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 rounded-full">{sp.prompt.category}</span>
                              {renderModeBadge(sp.prompt)}
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">By {sp.sharer_email}</p>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleUseSharedPrompt(sp); }}
                            className="ml-2 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap"
                          >
                            Use
                          </button>
                        </div>
                        {sp.prompt.response_mode !== 'ai' && sp.prompt.template_body && (
                          <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 mt-2">{sp.prompt.template_body}</p>
                        )}
                        {sp.prompt.response_mode === 'ai' && (
                          <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 mt-2">{sp.prompt.content}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Shared Globally — owner only */}
              {isPlatformOwner && (
                <section>
                  <h2 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-amber-500" />Shared Globally (All Users)
                  </h2>
                  {globalShares.length === 0 ? (
                    <div className="app-card rounded-xl p-6 text-center text-gray-500 dark:text-gray-400 text-sm">
                      No prompts have been shared globally yet.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {globalShares.map(sp => (
                        <div key={sp.id} className="app-card rounded-xl p-5 shadow-sm border border-amber-200 dark:border-amber-700/40 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setPreviewingShared(sp)}>
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 dark:text-white truncate">{sp.prompt.title}</p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 rounded-full">{sp.prompt.category}</span>
                                {renderModeBadge(sp.prompt)}
                              </div>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">By {sp.sharer_email}</p>
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleRemoveShared(sp.id, sp.prompt_id); }}
                              className="ml-2 p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                              title="Moderate: remove from shared"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )}

            </div>
          )}
        </div>
      </div>

      {/* Shared Prompt Preview Modal */}
      {previewingShared && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setPreviewingShared(null)}>
          <div className="app-card rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-start justify-between p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
              <div className="flex-1 min-w-0 pr-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white break-words">{previewingShared.prompt.title}</h2>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {previewingShared.prompt.category && (
                    <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 rounded-full">{previewingShared.prompt.category}</span>
                  )}
                  {renderModeBadge(previewingShared.prompt)}
                  <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 rounded-full">By {previewingShared.sharer_email}</span>
                </div>
              </div>
              <button onClick={() => setPreviewingShared(null)} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex-shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1 p-6 space-y-4">
              {previewingShared.prompt.response_mode === 'ai' && (
                <>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Prompt</p>
                    <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{previewingShared.prompt.content}</p>
                  </div>
                  {previewingShared.prompt.prompt_type === 'two_step' && previewingShared.prompt.step2_content && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Step 2</p>
                      <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{previewingShared.prompt.step2_content}</p>
                    </div>
                  )}
                </>
              )}
              {previewingShared.prompt.response_mode !== 'ai' && (
                <>
                  {previewingShared.prompt.template_subject && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Subject</p>
                      <p className="text-sm text-gray-800 dark:text-gray-200">{previewingShared.prompt.template_subject}</p>
                    </div>
                  )}
                  {previewingShared.prompt.template_body && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Body</p>
                      <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{previewingShared.prompt.template_body}</p>
                    </div>
                  )}
                  {previewingShared.prompt.template_ai_instructions && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">AI Instructions</p>
                      <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{previewingShared.prompt.template_ai_instructions}</p>
                    </div>
                  )}
                </>
              )}
              {previewingShared.prompt.company_info && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Company Info</p>
                  <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{previewingShared.prompt.company_info}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
              <button onClick={() => setPreviewingShared(null)} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg transition-colors">
                Close
              </button>
              {previewingShared.shared_by !== currentUserId && (
                <button
                  onClick={() => { handleUseSharedPrompt(previewingShared); setPreviewingShared(null); }}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  Add to My Prompts
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
    );
  }

  // ─── Main Prompts List View ────────────────────────────────────────────────

  return (
    <div className="p-4 md:p-8 app-bg min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <MessageSquare className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Prompts</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setView('shared')}
              className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            >
              <Users className="w-4 h-4 mr-2" />
              Shared
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Prompt
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative sm:flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search prompts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 app-card text-gray-900 dark:text-white text-sm"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={selectedCategory}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="flex-1 sm:flex-none min-w-0 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 app-card text-gray-900 dark:text-white text-sm"
            >
              <option value="All">All Categories</option>
              {ALL_CATEGORIES.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
            <select
              value={sortOrder}
              onChange={(e) => handleSortChange(e.target.value as typeof sortOrder)}
              className="flex-1 sm:flex-none min-w-0 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 app-card text-gray-900 dark:text-white text-sm"
            >
              <option value="updated_desc">Last modified</option>
              <option value="updated_asc">Oldest modified</option>
              <option value="created_desc">Newest created</option>
              <option value="created_asc">Oldest created</option>
              <option value="title_asc">Title A → Z</option>
              <option value="title_desc">Title Z → A</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPrompts.length === 0 ? (
            <div className="col-span-full text-center py-12 app-card rounded-xl">
              <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {searchQuery || selectedCategory !== 'All' ? 'No prompts found' : 'No prompts yet'}
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                {searchQuery || selectedCategory !== 'All'
                  ? 'Try adjusting your search or category filter'
                  : 'Create your first prompt to get started'}
              </p>
            </div>
          ) : (
            filteredPrompts.map((prompt) => (
              <div key={prompt.id} className="app-card rounded-xl shadow-sm p-6 group hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">{prompt.title}</h3>
                      <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 rounded-full">
                        {prompt.category}
                      </span>
                      {renderModeBadge(prompt)}
                      {prompt.response_mode === 'ai' && prompt.property_info && prompt.property_info.length > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300 rounded-full">
                          <Home className="w-3 h-3" />{prompt.property_info.length} {prompt.property_info.length === 1 ? 'Property' : 'Properties'}
                        </span>
                      )}
                      {sharedPromptIds.has(prompt.id) && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 rounded-full">
                          <Share2 className="w-3 h-3" />Shared
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleDuplicatePrompt(prompt)} disabled={duplicatingId === prompt.id} className="p-2 text-gray-400 hover:text-blue-500 dark:text-gray-500 dark:hover:text-blue-400 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50" title="Duplicate">
                        {duplicatingId === prompt.id ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                      <button onClick={() => handleEditPrompt(prompt)} className="p-2 text-gray-400 hover:text-blue-500 dark:text-gray-500 dark:hover:text-blue-400 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700" title="Edit">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeletePrompt(prompt.id)} className="p-2 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {prompt.response_mode === 'ai' ? (
                  <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3">{prompt.content}</p>
                ) : (
                  <div className="space-y-1">
                    {prompt.template_subject && (
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 truncate">Subject: {prompt.template_subject}</p>
                    )}
                    <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3">{prompt.template_body}</p>
                  </div>
                )}

                {prompt.domains && prompt.domains.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {prompt.domains.map(domain => (
                      <span key={domain} className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded ${autoresponderDomains.has(domain) ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}>
                        <Globe className="w-3 h-3" />{domain}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                  Updated {new Date(prompt.updated_at).toLocaleDateString()}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Delete confirm */}
        {confirmDeleteId && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="app-card rounded-xl shadow-lg w-full max-w-sm p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">Delete prompt</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">This action cannot be undone.</p>
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setConfirmDeleteId(null)} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors">Cancel</button>
                <button onClick={handleConfirmDelete} className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors">Delete</button>
              </div>
            </div>
          </div>
        )}

        {/* Create / Edit modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center p-4 z-50 overflow-y-auto">
            <div className="app-card rounded-xl shadow-lg w-full max-w-2xl mx-4 sm:mx-auto my-4 max-h-[calc(100vh-2rem)] flex flex-col pr-2">
              <div className="flex items-center justify-between p-6 pb-0">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  {editingPrompt ? 'Edit Prompt' : 'Create New Prompt'}
                </h3>
                <button onClick={resetForm} className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pl-6 pr-4 pt-4">
                <form id="prompt-form" onSubmit={handleSavePrompt} className="space-y-4">

                  {/* Title */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Enter prompt title"
                      required
                    />
                  </div>

                  {/* Mode toggle: AI Prompt vs Email Template */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Mode</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, response_mode: 'ai' }))}
                        className={`flex flex-col items-start p-4 rounded-lg border-2 text-left transition-colors ${formData.response_mode === 'ai' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'}`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <MessageSquare className={`w-4 h-4 ${formData.response_mode === 'ai' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`} />
                          <span className={`text-sm font-semibold ${formData.response_mode === 'ai' ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'}`}>AI Prompt</span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">AI generates a unique reply each time.</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          response_mode: prev.response_mode === 'ai' ? 'template' : prev.response_mode,
                          category: prev.response_mode === 'ai' ? 'Template' : prev.category,
                        }))}
                        className={`flex flex-col items-start p-4 rounded-lg border-2 text-left transition-colors ${formData.response_mode !== 'ai' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'}`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Mail className={`w-4 h-4 ${formData.response_mode !== 'ai' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`} />
                          <span className={`text-sm font-semibold ${formData.response_mode !== 'ai' ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'}`}>Email Template</span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Send a fixed or AI-enhanced reply.</p>
                      </button>
                    </div>
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      {(formData.response_mode === 'ai' ? AI_CATEGORIES : ALL_CATEGORIES).map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>

                  {/* Domains */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Applicable Domains &amp; Addresses</label>
                    <div className="space-y-2">
                      <select
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        onChange={(e) => { if (e.target.value) { handleAddDomain(e.target.value); e.target.value = ''; } }}
                        value=""
                      >
                        <option value="">Select a domain or address…</option>
                        {sesEmails.filter(e => !formData.domains.includes(e.address)).length > 0 && (
                          <optgroup label="Email Addresses (specific)">
                            {sesEmails.filter(e => !formData.domains.includes(e.address)).map(e => (
                              <option key={e.address} value={e.address}>{e.address}</option>
                            ))}
                          </optgroup>
                        )}
                        {sesDomains.filter(d => !formData.domains.includes(d)).length > 0 && (
                          <optgroup label="Domains (all addresses)">
                            {sesDomains.filter(d => !formData.domains.includes(d)).map(domain => (
                              <option key={domain} value={domain}>{domain}</option>
                            ))}
                          </optgroup>
                        )}
                      </select>
                      {sesEmails.length === 0 && sesDomains.length === 0 && (
                        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg">
                          <p className="text-sm text-yellow-700 dark:text-yellow-400">No verified domains or addresses found. Add them in Settings → Amazon SES.</p>
                        </div>
                      )}
                      {formData.domains.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {formData.domains.map(entry => {
                            const isAddress = entry.includes('@');
                            return (
                              <span key={entry} className={`inline-flex items-center gap-1 px-2 py-1 rounded text-sm ${isAddress ? 'bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200' : 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'}`}>
                                {isAddress ? <MessageSquare className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
                                {entry}
                                <button type="button" onClick={() => handleRemoveDomain(entry)} className={`hover:opacity-70 ${isAddress ? 'text-teal-600 dark:text-teal-400' : 'text-blue-600 dark:text-blue-400'}`}>
                                  <X className="w-3 h-3" />
                                </button>
                              </span>
                            );
                          })}
                        </div>
                      )}
                      <p className="text-xs text-gray-500 dark:text-gray-400">Specific addresses take priority over domain-wide prompts. Leave empty to apply to all.</p>
                    </div>
                  </div>

                  {/* ── AI mode fields ── */}
                  {formData.response_mode === 'ai' && (
                    <>
                      {/* Prompt Type */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Prompt Type</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, prompt_type: 'one_step' }))}
                            className={`flex flex-col items-start p-4 rounded-lg border-2 text-left transition-colors ${formData.prompt_type === 'one_step' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'}`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <ArrowRight className={`w-4 h-4 ${formData.prompt_type === 'one_step' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`} />
                              <span className={`text-sm font-semibold ${formData.prompt_type === 'one_step' ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'}`}>One-Step</span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Single AI call. Use <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">{'{{email_content}}'}</code> or <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">{'{{FULL_CONVERSATION_HISTORY}}'}</code>.</p>
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, prompt_type: 'two_step' }))}
                            className={`flex flex-col items-start p-4 rounded-lg border-2 text-left transition-colors ${formData.prompt_type === 'two_step' ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20' : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'}`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <GitBranch className={`w-4 h-4 ${formData.prompt_type === 'two_step' ? 'text-amber-600 dark:text-amber-400' : 'text-gray-500 dark:text-gray-400'}`} />
                              <span className={`text-sm font-semibold ${formData.prompt_type === 'two_step' ? 'text-amber-700 dark:text-amber-300' : 'text-gray-700 dark:text-gray-300'}`}>Two-Step</span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Two AI calls. Step 1 result fed into Step 2 via <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">{'{{step1_result}}'}</code>.</p>
                          </button>
                        </div>
                      </div>

                      {/* Step 1 content */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {formData.prompt_type === 'two_step' ? 'Step 1 — Analysis Prompt' : 'Prompt Content'}
                        </label>
                        {formData.prompt_type === 'two_step' && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                            Use <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">{'{{email_content}}'}</code> or <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">{'{{FULL_CONVERSATION_HISTORY}}'}</code>. The AI response is saved and passed to Step 2.
                          </p>
                        )}
                        <textarea
                          value={formData.content}
                          onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                          rows={formData.prompt_type === 'two_step' ? 10 : 16}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                          placeholder={formData.prompt_type === 'two_step' ? 'Analyze the email and extract key details...' : 'Enter your prompt content here...'}
                          required
                        />
                      </div>

                      {/* Step 2 */}
                      {formData.prompt_type === 'two_step' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Step 2 — Reply Generation Prompt</label>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                            Use <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">{'{{step1_result}}'}</code>, <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">{'{{email_content}}'}</code>, or <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">{'{{FULL_CONVERSATION_HISTORY}}'}</code>.
                          </p>
                          <textarea
                            value={formData.step2_content}
                            onChange={(e) => setFormData(prev => ({ ...prev, step2_content: e.target.value }))}
                            rows={10}
                            className="w-full px-4 py-2 border border-amber-300 dark:border-amber-700 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                            placeholder="Based on this analysis: {{step1_result}}\n\nWrite a professional reply to: {{email_content}}"
                          />
                        </div>
                      )}

                      {/* Company Info */}
                      {formData.category === 'General' && (
                        <div className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
                          <div className="flex items-center gap-2 px-4 py-3 app-card-inner/50">
                            <MessageSquare className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Company &amp; Product Details</span>
                          </div>
                          <div className="px-4 pb-4 pt-3">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                              Use <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">{'{{company_info}}'}</code> in your prompt to inject this context.
                            </p>
                            <textarea
                              value={formData.company_info}
                              onChange={(e) => setFormData(prev => ({ ...prev, company_info: e.target.value }))}
                              rows={6}
                              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                              placeholder="Describe your company, products, key selling points..."
                            />
                          </div>
                        </div>
                      )}

                      {/* Property Info */}
                      {formData.category === 'Real Estate' && (
                        <div className="border border-teal-200 dark:border-teal-700 rounded-lg overflow-hidden">
                          <div className="flex items-center justify-between px-4 py-3 bg-teal-50 dark:bg-teal-900/20">
                            <div className="flex items-center gap-2">
                              <Home className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                              <span className="text-sm font-semibold text-teal-800 dark:text-teal-300">Property Information</span>
                              {formData.properties.length > 0 && (
                                <span className="text-xs text-teal-600 dark:text-teal-400">({formData.properties.length} {formData.properties.length === 1 ? 'property' : 'properties'})</span>
                              )}
                            </div>
                            <button type="button" onClick={handleAddProperty} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-md transition-colors">
                              <Plus className="w-3 h-3" />Add Property
                            </button>
                          </div>
                          <div className="px-4 py-2 border-b border-teal-100 dark:border-teal-800/40 bg-teal-50/50 dark:bg-teal-900/10">
                            <p className="text-xs text-teal-700 dark:text-teal-400">Use <code className="bg-teal-100 dark:bg-teal-800/50 px-1 rounded">{'{{property_info}}'}</code> in your prompt to inject listing data.</p>
                          </div>
                          {formData.properties.length === 0 ? (
                            <div className="px-4 py-5 text-center">
                              <p className="text-sm text-gray-500 dark:text-gray-400">No properties added yet.</p>
                            </div>
                          ) : (
                            <div className="divide-y divide-teal-100 dark:divide-teal-800/40">
                              {formData.properties.map((property, index) => {
                                const isCollapsed = collapsedProperties.has(index);
                                return (
                                  <div key={index} className="app-card">
                                    <div className="flex items-center justify-between px-4 py-3 app-card-inner/50">
                                      <button type="button" onClick={() => togglePropertyCollapse(index)} className="flex items-center gap-2 flex-1 text-left">
                                        {isCollapsed ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronUp className="w-4 h-4 text-gray-400" />}
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{propertyLabel(property, index)}</span>
                                      </button>
                                      <button type="button" onClick={() => handleRemoveProperty(index)} className="p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded transition-colors ml-2">
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                    {!isCollapsed && (
                                      <div className="px-4 pb-4 pt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className="col-span-2">
                                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Address</label>
                                          <input type="text" value={property.address} onChange={(e) => handlePropertyChange(index, 'address', e.target.value)} className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500" placeholder="123 Main St, City, State 00000" />
                                        </div>
                                        <div>
                                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Listing Price</label>
                                          <input type="text" value={property.price} onChange={(e) => handlePropertyChange(index, 'price', e.target.value)} className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500" placeholder="$500,000" />
                                        </div>
                                        <div>
                                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Property Type</label>
                                          <input type="text" value={property.property_type} onChange={(e) => handlePropertyChange(index, 'property_type', e.target.value)} className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500" placeholder="Single Family, Condo..." />
                                        </div>
                                        <div>
                                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Bedrooms</label>
                                          <input type="text" value={property.bedrooms} onChange={(e) => handlePropertyChange(index, 'bedrooms', e.target.value)} className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500" placeholder="3" />
                                        </div>
                                        <div>
                                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Bathrooms</label>
                                          <input type="text" value={property.bathrooms} onChange={(e) => handlePropertyChange(index, 'bathrooms', e.target.value)} className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500" placeholder="2" />
                                        </div>
                                        <div>
                                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Square Footage</label>
                                          <input type="text" value={property.sqft} onChange={(e) => handlePropertyChange(index, 'sqft', e.target.value)} className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500" placeholder="1,800 sq ft" />
                                        </div>
                                        <div className="col-span-2">
                                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                                          <textarea value={property.description} onChange={(e) => handlePropertyChange(index, 'description', e.target.value)} rows={3} className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 resize-none" placeholder="Charming home with open floor plan..." />
                                        </div>
                                        <div className="col-span-2">
                                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Key Features / Amenities</label>
                                          <textarea value={property.features} onChange={(e) => handlePropertyChange(index, 'features', e.target.value)} rows={2} className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 resize-none" placeholder="Pool, 2-car garage, hardwood floors..." />
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}

                  {/* ── Email Template mode fields ── */}
                  {formData.response_mode !== 'ai' && (
                    <div className="space-y-4">
                      {/* Response Style sub-toggle */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Response Style</label>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, response_mode: 'template' }))}
                            className={`flex flex-col items-start p-4 rounded-lg border-2 text-left transition-colors ${formData.response_mode === 'template' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'}`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <Mail className={`w-4 h-4 ${formData.response_mode === 'template' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`} />
                              <span className={`text-sm font-semibold ${formData.response_mode === 'template' ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'}`}>Basic</span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Sends the exact body you write — like an out-of-office reply.</p>
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, response_mode: 'intelligent_template' }))}
                            className={`flex flex-col items-start p-4 rounded-lg border-2 text-left transition-colors ${formData.response_mode === 'intelligent_template' ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20' : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'}`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <Zap className={`w-4 h-4 ${formData.response_mode === 'intelligent_template' ? 'text-teal-600 dark:text-teal-400' : 'text-gray-500 dark:text-gray-400'}`} />
                              <span className={`text-sm font-semibold ${formData.response_mode === 'intelligent_template' ? 'text-teal-700 dark:text-teal-300' : 'text-gray-700 dark:text-gray-300'}`}>Intelligent</span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">AI personalizes your template body for each email.</p>
                          </button>
                        </div>
                      </div>

                      {/* Subject */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Subject</label>
                        <input
                          type="text"
                          value={formData.template_subject}
                          onChange={(e) => setFormData(prev => ({ ...prev, template_subject: e.target.value }))}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          placeholder="e.g. Thanks for reaching out — we'll be in touch soon"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Leave blank to use "Re: {'{original subject}'}".</p>
                      </div>

                      {/* Body */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {formData.response_mode === 'intelligent_template' ? 'Base Body (AI will personalize this)' : 'Email Body'}
                        </label>
                        <textarea
                          value={formData.template_body}
                          onChange={(e) => setFormData(prev => ({ ...prev, template_body: e.target.value }))}
                          rows={12}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                          placeholder={formData.response_mode === 'template'
                            ? "Thank you for your email. We're currently out of the office and will respond within 1 business day.\n\nBest regards,\nThe Team"
                            : "Thank you for reaching out about [TOPIC]. We'd love to help you with..."
                          }
                          required
                        />
                      </div>

                      {/* AI Instructions — intelligent only */}
                      {formData.response_mode === 'intelligent_template' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">AI Instructions</label>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                            Tell the AI how to personalize the base body above based on the incoming email.
                          </p>
                          <textarea
                            value={formData.template_ai_instructions}
                            onChange={(e) => setFormData(prev => ({ ...prev, template_ai_instructions: e.target.value }))}
                            rows={5}
                            className="w-full px-4 py-2 border border-teal-300 dark:border-teal-700 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                            placeholder="Customize the greeting to address the sender by name if available. If they mention a specific product, briefly reference it. Keep the tone professional and friendly."
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Share this Prompt section ── */}
                  <div className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, share_enabled: !prev.share_enabled }))}
                      className="w-full flex items-center justify-between px-4 py-3 app-card-inner/50 text-left hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Share2 className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Share this Prompt</span>
                        {formData.share_enabled && (
                          <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 rounded-full">On</span>
                        )}
                      </div>
                      {formData.share_enabled ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </button>

                    {formData.share_enabled && (
                      <div className="px-4 pb-4 pt-3 space-y-3">
                        {isPlatformOwner ? (
                          <>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Choose who can see and use this prompt.</p>
                            <div className="space-y-2">
                              <label className="flex items-start gap-3 cursor-pointer">
                                <input
                                  type="radio"
                                  name="share_scope"
                                  value="team"
                                  checked={formData.share_scope === 'team'}
                                  onChange={() => setFormData(prev => ({ ...prev, share_scope: 'team' }))}
                                  className="mt-0.5"
                                />
                                <div>
                                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">My Team</p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">Everyone in your organization(s) can see this.</p>
                                </div>
                              </label>
                              <label className="flex items-start gap-3 cursor-pointer">
                                <input
                                  type="radio"
                                  name="share_scope"
                                  value="organization"
                                  checked={formData.share_scope === 'organization'}
                                  onChange={() => setFormData(prev => ({ ...prev, share_scope: 'organization' }))}
                                  className="mt-0.5"
                                />
                                <div>
                                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Specific Organizations</p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">Choose which organizations to share with.</p>
                                </div>
                              </label>
                              <label className="flex items-start gap-3 cursor-pointer">
                                <input
                                  type="radio"
                                  name="share_scope"
                                  value="global"
                                  checked={formData.share_scope === 'global'}
                                  onChange={() => setFormData(prev => ({ ...prev, share_scope: 'global' }))}
                                  className="mt-0.5"
                                />
                                <div>
                                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                                    All Users <Shield className="w-3 h-3 text-amber-500" />
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">Visible to all users on the platform.</p>
                                </div>
                              </label>
                            </div>

                            {/* Org selector */}
                            {formData.share_scope === 'organization' && userOrgs.length > 0 && (
                              <div className="space-y-1 pt-1">
                                <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Select organizations:</p>
                                {userOrgs.map(org => (
                                  <label key={org.id} className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={formData.share_org_ids.includes(org.id)}
                                      onChange={(e) => {
                                        setFormData(prev => ({
                                          ...prev,
                                          share_org_ids: e.target.checked
                                            ? [...prev.share_org_ids, org.id]
                                            : prev.share_org_ids.filter(id => id !== org.id)
                                        }));
                                      }}
                                      className="rounded"
                                    />
                                    <span className="text-sm text-gray-700 dark:text-gray-300">{org.name}</span>
                                  </label>
                                ))}
                              </div>
                            )}
                            {formData.share_scope === 'organization' && userOrgs.length === 0 && (
                              <p className="text-xs text-yellow-600 dark:text-yellow-400">You are not a member of any organizations yet.</p>
                            )}
                          </>
                        ) : (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            This prompt will be shared with your team members and lead. Your account owner will also have access.
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                </form>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700 p-6 flex-shrink-0">
                <button type="button" onClick={resetForm} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg">
                  Cancel
                </button>
                <button
                  form="prompt-form"
                  type="submit"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  {editingPrompt ? 'Update Prompt' : 'Create Prompt'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
