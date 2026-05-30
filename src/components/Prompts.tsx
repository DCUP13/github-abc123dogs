import React, { useState, useEffect } from 'react';
import { MessageSquare, Plus, CreditCard as Edit, Trash2, Search, Copy, Check, X, Globe, GitBranch, ArrowRight, Home, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../lib/supabase';
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

const emptyProperty = (): PropertyInfo => ({
  address: '', price: '', bedrooms: '', bathrooms: '',
  sqft: '', property_type: '', description: '', features: ''
});

const categories = [
  'General',
  'Email Marketing',
  'Real Estate',
  'Customer Service',
  'Sales',
  'Follow-up',
  'Other'
];

export function Prompts({ onSignOut, currentView }: PromptsProps) {
  const { sesDomains } = useEmails();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [autoresponderDomains, setAutoresponderDomains] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [collapsedProperties, setCollapsedProperties] = useState<Set<number>>(new Set());

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'General',
    prompt_type: 'one_step' as 'one_step' | 'two_step',
    step2_content: '',
    domains: [] as string[],
    properties: [] as PropertyInfo[],
    company_info: ''
  });

  useEffect(() => {
    fetchPrompts();
    fetchAutoresponderDomains();
  }, []);

  const fetchAutoresponderDomains = async () => {
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) return;

      const { data, error } = await supabase
        .from('amazon_ses_domains')
        .select('domain')
        .eq('user_id', user.data.user.id)
        .eq('autoresponder_enabled', true);

      if (error) throw error;
      setAutoresponderDomains(new Set(data?.map(d => d.domain) || []));
    } catch (error) {
      console.error('Error fetching autoresponder domains:', error);
    }
  };

  const fetchPrompts = async () => {
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) { setIsLoading(false); return; }

      const { data: promptsData, error: promptsError } = await supabase
        .from('prompts')
        .select('*')
        .eq('user_id', user.data.user.id)
        .order('updated_at', { ascending: false });

      if (promptsError) {
        console.error('Error fetching prompts:', promptsError);
        setPrompts([]);
        setIsLoading(false);
        return;
      }

      const { data: domainsData, error: domainsError } = await supabase
        .from('prompt_domains')
        .select('prompt_id, domain')
        .eq('user_id', user.data.user.id);

      if (domainsError) console.error('Error fetching prompt domains:', domainsError);

      const domainsByPrompt = (domainsData || []).reduce((acc, item) => {
        if (!acc[item.prompt_id]) acc[item.prompt_id] = [];
        acc[item.prompt_id].push(item.domain);
        return acc;
      }, {} as Record<string, string[]>);

      setPrompts(promptsData?.map(prompt => ({
        ...prompt,
        // normalize legacy single-object property_info to array
        property_info: prompt.property_info
          ? Array.isArray(prompt.property_info)
            ? prompt.property_info
            : [prompt.property_info]
          : null,
        domains: domainsByPrompt[prompt.id] || []
      })) || []);
    } catch (error) {
      console.error('Error fetching prompts:', error);
      setPrompts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSavePrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) throw new Error('User not authenticated');

      const isRealEstate = formData.category === 'Real Estate';
      const filledProperties = formData.properties.filter(p =>
        Object.values(p).some(v => v.trim() !== '')
      );

      const promptData = {
        title: formData.title.trim(),
        content: formData.content.trim(),
        category: formData.category,
        prompt_type: formData.prompt_type,
        step2_content: formData.prompt_type === 'two_step' ? (formData.step2_content.trim() || null) : null,
        property_info: isRealEstate && filledProperties.length > 0 ? filledProperties : null,
        company_info: formData.category === 'General' ? (formData.company_info.trim() || null) : null,
        user_id: user.data.user.id,
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
        const { error: domainError } = await supabase.from('prompt_domains').insert(
          formData.domains.map(domain => ({ prompt_id: promptId, domain, user_id: user.data.user.id }))
        );
        if (domainError) throw domainError;
      }

      await fetchPrompts();
      resetForm();
    } catch (error) {
      console.error('Error saving prompt:', error);
      alert('Failed to save prompt. Please try again.');
    }
  };

  const handleEditPrompt = (prompt: Prompt) => {
    setEditingPrompt(prompt);
    const properties = prompt.property_info && prompt.property_info.length > 0
      ? prompt.property_info
      : [];
    setFormData({
      title: prompt.title,
      content: prompt.content,
      category: prompt.category,
      prompt_type: prompt.prompt_type || 'one_step',
      step2_content: prompt.step2_content || '',
      domains: prompt.domains || [],
      properties,
      company_info: prompt.company_info || ''
    });
    setCollapsedProperties(new Set());
    setShowCreateModal(true);
  };

  const handleDeletePrompt = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this prompt?')) return;
    try {
      const { error } = await supabase.from('prompts').delete().eq('id', id);
      if (error) throw error;
      await fetchPrompts();
    } catch (error) {
      console.error('Error deleting prompt:', error);
      alert('Failed to delete prompt. Please try again.');
    }
  };

  const handleCopyPrompt = async (content: string, id: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error('Failed to copy prompt:', error);
      alert('Failed to copy prompt to clipboard');
    }
  };

  const handleAddDomain = (domain: string) => {
    if (!formData.domains.includes(domain)) {
      setFormData(prev => ({ ...prev, domains: [...prev.domains, domain] }));
    }
  };

  const handleRemoveDomain = (domain: string) => {
    setFormData(prev => ({ ...prev, domains: prev.domains.filter(d => d !== domain) }));
  };

  const handleAddProperty = () => {
    setFormData(prev => ({ ...prev, properties: [...prev.properties, emptyProperty()] }));
  };

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

  const filteredPrompts = prompts.filter(prompt => {
    const matchesSearch = prompt.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prompt.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || prompt.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const resetForm = () => {
    setFormData({ title: '', content: '', category: 'General', prompt_type: 'one_step', step2_content: '', domains: [], properties: [], company_info: '' });
    setCollapsedProperties(new Set());
    setEditingPrompt(null);
    setShowCreateModal(false);
  };

  if (isLoading) {
    return (
      <div className="p-8 bg-white dark:bg-gray-900 min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 bg-white dark:bg-gray-900 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <MessageSquare className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Prompts</h1>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Prompt
          </button>
        </div>

        <div className="flex gap-6 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search prompts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
          </div>
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="All">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPrompts.length === 0 ? (
            <div className="col-span-full text-center py-12 bg-white dark:bg-gray-800 rounded-xl">
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
              <div key={prompt.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 group hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">{prompt.title}</h3>
                      <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 rounded-full">
                        {prompt.category}
                      </span>
                      {prompt.prompt_type === 'two_step' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 rounded-full">
                          <GitBranch className="w-3 h-3" />2-Step
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 rounded-full">
                          <ArrowRight className="w-3 h-3" />1-Step
                        </span>
                      )}
                      {prompt.property_info && prompt.property_info.length > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300 rounded-full">
                          <Home className="w-3 h-3" />{prompt.property_info.length} {prompt.property_info.length === 1 ? 'Property' : 'Properties'}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleCopyPrompt(prompt.content, prompt.id)} className="p-2 text-gray-400 hover:text-blue-500 dark:text-gray-500 dark:hover:text-blue-400 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700" title="Copy prompt">
                        {copiedId === prompt.id ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                      <button onClick={() => handleEditPrompt(prompt)} className="p-2 text-gray-400 hover:text-blue-500 dark:text-gray-500 dark:hover:text-blue-400 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700" title="Edit prompt">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeletePrompt(prompt.id)} className="p-2 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700" title="Delete prompt">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3">{prompt.content}</p>

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

        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg w-full max-w-2xl my-4 max-h-[calc(100vh-2rem)] flex flex-col pr-2">
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
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
                    <input
                      type="text"
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Enter prompt title"
                      required
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                    <select
                      id="category"
                      value={formData.category}
                      onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      {categories.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>

                  {/* Domains */}
                  <div>
                    <label htmlFor="domains" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Applicable Domains</label>
                    <div className="space-y-2">
                      <select
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        onChange={(e) => { if (e.target.value) { handleAddDomain(e.target.value); e.target.value = ''; } }}
                        value=""
                      >
                        <option value="">Select a domain</option>
                        {sesDomains.filter(d => !formData.domains.includes(d)).map(domain => (
                          <option key={domain} value={domain}>{domain}</option>
                        ))}
                      </select>
                      {sesDomains.length === 0 && (
                        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg">
                          <p className="text-sm text-yellow-700 dark:text-yellow-400">No verified domains found. Add domains in Settings → Amazon SES.</p>
                        </div>
                      )}
                      {formData.domains.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {formData.domains.map(domain => (
                            <span key={domain} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-sm">
                              <Globe className="w-3 h-3" />{domain}
                              <button type="button" onClick={() => handleRemoveDomain(domain)} className="text-blue-600 dark:text-blue-400 hover:text-blue-800">
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-gray-500 dark:text-gray-400">Leave empty to apply to all domains.</p>
                    </div>
                  </div>

                  {/* Prompt Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Prompt Type</label>
                    <div className="grid grid-cols-2 gap-3">
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

                  {/* Step 1 / Prompt Content */}
                  <div>
                    <label htmlFor="content" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {formData.prompt_type === 'two_step' ? 'Step 1 — Analysis Prompt' : 'Prompt Content'}
                    </label>
                    {formData.prompt_type === 'two_step' && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                        Use <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">{'{{email_content}}'}</code> or <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">{'{{FULL_CONVERSATION_HISTORY}}'}</code>. The AI response is saved and passed to Step 2.
                      </p>
                    )}
                    <textarea
                      id="content"
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
                      <label htmlFor="step2_content" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Step 2 — Reply Generation Prompt
                      </label>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                        Use <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">{'{{step1_result}}'}</code>, <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">{'{{email_content}}'}</code>, or <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">{'{{FULL_CONVERSATION_HISTORY}}'}</code>. This becomes the final reply.
                      </p>
                      <textarea
                        id="step2_content"
                        value={formData.step2_content}
                        onChange={(e) => setFormData(prev => ({ ...prev, step2_content: e.target.value }))}
                        rows={10}
                        className="w-full px-4 py-2 border border-amber-300 dark:border-amber-700 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                        placeholder="Based on this analysis: {{step1_result}}\n\nWrite a professional reply to: {{email_content}}"
                      />
                    </div>
                  )}

                  {/* Company Info — General category only, at the bottom */}
                  {formData.category === 'General' && (
                    <div className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-700/50">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Company &amp; Product Details</span>
                        </div>
                      </div>
                      <div className="px-4 pb-4 pt-3">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                          Describe your company, the products or services you offer, and any key selling points. Use{' '}
                          <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">{'{{company_info}}'}</code>{' '}
                          in your prompt to inject this context so the AI can reference it when responding.
                        </p>
                        <textarea
                          value={formData.company_info}
                          onChange={(e) => setFormData(prev => ({ ...prev, company_info: e.target.value }))}
                          rows={6}
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                          placeholder="Example: We are Acme Corp, a SaaS company that offers an AI-powered email autoresponder platform. Our core product helps businesses automatically reply to inbound emails using customizable AI prompts. Key features include domain-based routing, two-step prompts, real estate listing support, and CRM integration. Pricing starts at $49/month..."
                        />
                      </div>
                    </div>
                  )}

                  {/* Property Information — Real Estate only, at the bottom */}
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
                        <button
                          type="button"
                          onClick={handleAddProperty}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-md transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                          Add Property
                        </button>
                      </div>

                      {formData.properties.length === 0 ? (
                        <div className="px-4 py-5 text-center">
                          <p className="text-sm text-gray-500 dark:text-gray-400">No properties added yet.</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            Click "Add Property" to enter listing details. Use <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">{'{{property_info}}'}</code> in your prompt to inject the data.
                          </p>
                        </div>
                      ) : (
                        <div className="divide-y divide-teal-100 dark:divide-teal-800/40">
                          {formData.properties.map((property, index) => {
                            const isCollapsed = collapsedProperties.has(index);
                            return (
                              <div key={index} className="bg-white dark:bg-gray-800">
                                {/* Property header row */}
                                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-700/50">
                                  <button
                                    type="button"
                                    onClick={() => togglePropertyCollapse(index)}
                                    className="flex items-center gap-2 flex-1 text-left"
                                  >
                                    {isCollapsed ? (
                                      <ChevronDown className="w-4 h-4 text-gray-400" />
                                    ) : (
                                      <ChevronUp className="w-4 h-4 text-gray-400" />
                                    )}
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                      {propertyLabel(property, index)}
                                    </span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveProperty(index)}
                                    className="p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded transition-colors ml-2"
                                    title="Remove property"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>

                                {/* Property fields */}
                                {!isCollapsed && (
                                  <div className="px-4 pb-4 pt-3 grid grid-cols-2 gap-3">
                                    <div className="col-span-2">
                                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Address</label>
                                      <input
                                        type="text"
                                        value={property.address}
                                        onChange={(e) => handlePropertyChange(index, 'address', e.target.value)}
                                        className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                        placeholder="123 Main St, City, State 00000"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Listing Price</label>
                                      <input
                                        type="text"
                                        value={property.price}
                                        onChange={(e) => handlePropertyChange(index, 'price', e.target.value)}
                                        className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                        placeholder="$500,000"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Property Type</label>
                                      <input
                                        type="text"
                                        value={property.property_type}
                                        onChange={(e) => handlePropertyChange(index, 'property_type', e.target.value)}
                                        className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                        placeholder="Single Family, Condo..."
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Bedrooms</label>
                                      <input
                                        type="text"
                                        value={property.bedrooms}
                                        onChange={(e) => handlePropertyChange(index, 'bedrooms', e.target.value)}
                                        className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                        placeholder="3"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Bathrooms</label>
                                      <input
                                        type="text"
                                        value={property.bathrooms}
                                        onChange={(e) => handlePropertyChange(index, 'bathrooms', e.target.value)}
                                        className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                        placeholder="2"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Square Footage</label>
                                      <input
                                        type="text"
                                        value={property.sqft}
                                        onChange={(e) => handlePropertyChange(index, 'sqft', e.target.value)}
                                        className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                        placeholder="1,800 sq ft"
                                      />
                                    </div>
                                    <div className="col-span-2">
                                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                                      <textarea
                                        value={property.description}
                                        onChange={(e) => handlePropertyChange(index, 'description', e.target.value)}
                                        rows={3}
                                        className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 resize-none"
                                        placeholder="Charming home with open floor plan, updated kitchen..."
                                      />
                                    </div>
                                    <div className="col-span-2">
                                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Key Features / Amenities</label>
                                      <textarea
                                        value={property.features}
                                        onChange={(e) => handlePropertyChange(index, 'features', e.target.value)}
                                        rows={2}
                                        className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 resize-none"
                                        placeholder="Pool, 2-car garage, hardwood floors, new roof (2022)..."
                                      />
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
