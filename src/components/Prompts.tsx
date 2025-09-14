import React, { useState, useEffect } from 'react';
import { MessageSquare, Plus, Edit, Trash2, Search, Copy, Check, X, Globe } from 'lucide-react';
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
  created_at: string;
  updated_at: string;
  domains: string[];
}

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
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'General',
    domains: [] as string[]
  });

  useEffect(() => {
    fetchPrompts();
  }, []);

  const fetchPrompts = async () => {
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) return;

      const { data: promptsData, error: promptsError } = await supabase
        .from('prompts')
        .select('*')
        .eq('user_id', user.data.user.id)
        .order('updated_at', { ascending: false });

      if (promptsError) throw promptsError;

      const { data: domainsData, error: domainsError } = await supabase
        .from('prompt_domains')
        .select('prompt_id, domain')
        .eq('user_id', user.data.user.id);

      if (domainsError) throw domainsError;

      const domainsByPrompt = (domainsData || []).reduce((acc, item) => {
        if (!acc[item.prompt_id]) {
          acc[item.prompt_id] = [];
        }
        acc[item.prompt_id].push(item.domain);
        return acc;
      }, {} as Record<string, string[]>);
      
      const transformedPrompts = promptsData?.map(prompt => ({
        ...prompt,
        domains: domainsByPrompt[prompt.id] || []
      })) || [];
      
      setPrompts(transformedPrompts);
    } catch (error) {
      console.error('Error fetching prompts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSavePrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) {
        throw new Error('User not authenticated');
      }

      const promptData = {
        title: formData.title.trim(),
        content: formData.content.trim(),
        category: formData.category,
        user_id: user.data.user.id,
        updated_at: new Date().toISOString()
      };

      let promptId: string;

      if (editingPrompt) {
        const { error } = await supabase
          .from('prompts')
          .update(promptData)
          .eq('id', editingPrompt.id);

        if (error) throw error;
        promptId = editingPrompt.id;
        
        // Delete existing domain associations
        await supabase
          .from('prompt_domains')
          .delete()
          .eq('prompt_id', editingPrompt.id);
      } else {
        const { data: newPrompt, error } = await supabase
          .from('prompts')
          .insert(promptData)
          .select()
          .single();

        if (error) throw error;
        promptId = newPrompt.id;
      }

      // Insert domain associations
      if (formData.domains.length > 0) {
        const domainInserts = formData.domains.map(domain => ({
          prompt_id: promptId,
          domain,
          user_id: user.data.user.id
        }));

        const { error: domainError } = await supabase
          .from('prompt_domains')
          .insert(domainInserts);

        if (domainError) throw domainError;
      }

      await fetchPrompts();
      setShowCreateModal(false);
      setEditingPrompt(null);
      setFormData({ title: '', content: '', category: 'General', domains: [] });
    } catch (error) {
      console.error('Error saving prompt:', error);
      alert('Failed to save prompt. Please try again.');
    }
  };

  const handleEditPrompt = (prompt: Prompt) => {
    setEditingPrompt(prompt);
    setFormData({
      title: prompt.title,
      content: prompt.content,
      category: prompt.category,
      domains: prompt.domains || []
    });
    setShowCreateModal(true);
  };

  const handleDeletePrompt = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this prompt?')) return;

    try {
      const { error } = await supabase
        .from('prompts')
        .delete()
        .eq('id', id);

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
      setFormData(prev => ({
        ...prev,
        domains: [...prev.domains, domain]
      }));
    }
  };

  const handleRemoveDomain = (domain: string) => {
    setFormData(prev => ({
      ...prev,
      domains: prev.domains.filter(d => d !== domain)
    }));
  };

  const filteredPrompts = prompts.filter(prompt => {
    const matchesSearch = prompt.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         prompt.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || prompt.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const resetForm = () => {
    setFormData({ title: '', content: '', category: 'General', domains: [] });
    setEditingPrompt(null);
    setShowCreateModal(false);
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
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <MessageSquare className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Prompts</h1>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
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
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
          </div>
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
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
                  : 'Create your first prompt to get started'
                }
              </p>
            </div>
          ) : (
            filteredPrompts.map((prompt) => (
              <div
                key={prompt.id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 group hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                        {prompt.title}
                      </h3>
                      <span className="inline-block px-2 py-1 text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300 rounded-full">
                        {prompt.category}
                      </span>
                      {prompt.domains && prompt.domains.length > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 rounded-full">
                          <Globe className="w-3 h-3" />
                          {prompt.domains.length} domain{prompt.domains.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleCopyPrompt(prompt.content, prompt.id)}
                        className="p-2 text-gray-400 hover:text-indigo-500 dark:text-gray-500 dark:hover:text-indigo-400 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                        title="Copy prompt"
                      >
                        {copiedId === prompt.id ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => handleEditPrompt(prompt)}
                        className="p-2 text-gray-400 hover:text-indigo-500 dark:text-gray-500 dark:hover:text-indigo-400 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                        title="Edit prompt"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeletePrompt(prompt.id)}
                        className="p-2 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                        title="Delete prompt"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
                
                <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3">
                  {prompt.content}
                </p>
                
                {prompt.domains && prompt.domains.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {prompt.domains.map(domain => (
                      <span
                        key={domain}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 rounded"
                      >
                        <Globe className="w-3 h-3" />
                        {domain}
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
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 w-full max-w-2xl my-4 max-h-[calc(100vh-2rem)] flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  {editingPrompt ? 'Edit Prompt' : 'Create New Prompt'}
                </h3>
                <button
                  onClick={resetForm}
                  className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                >
                  <Plus className="w-5 h-5 rotate-45" />
                </button>
              </div>

              <form id="prompt-form" onSubmit={handleSavePrompt} className="space-y-4 flex-1 overflow-y-auto">
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Enter prompt title"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Category
                  </label>
                  <select
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    {categories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="domains" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Applicable Domains
                  </label>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <select
                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        onChange={(e) => {
                          if (e.target.value) {
                            handleAddDomain(e.target.value);
                            e.target.value = '';
                          }
                        }}
                        value=""
                      >
                        <option value="">Select a domain</option>
                        {sesDomains
                          .filter(domain => !formData.domains.includes(domain))
                          .map(domain => (
                            <option key={domain} value={domain}>
                              {domain}
                            </option>
                          ))
                        }
                      </select>
                    </div>
                    
                    {sesDomains.length === 0 && (
                      <div className="p-3 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg">
                        <p className="text-sm text-yellow-700 dark:text-yellow-400">
                          No verified domains found. Add domains in Settings → Amazon SES to use this feature.
                        </p>
                      </div>
                    )}
                    
                    {formData.domains.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm text-gray-600 dark:text-gray-400">Selected domains:</p>
                        <div className="flex flex-wrap gap-2">
                          {formData.domains.map(domain => (
                            <span
                              key={domain}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 rounded text-sm"
                            >
                              <Globe className="w-3 h-3" />
                              {domain}
                              <button
                                type="button"
                                onClick={() => handleRemoveDomain(domain)}
                                className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Select which domains this prompt applies to. Leave empty to apply to all domains.
                    </p>
                  </div>
                </div>

                <div>
                  <label htmlFor="content" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Prompt Content
                  </label>
                  <textarea
                    id="content"
                    value={formData.content}
                    onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                    rows={8}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                    placeholder="Enter your prompt content here..."
                    required
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700 mt-4 flex-shrink-0">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    {editingPrompt ? 'Update Prompt' : 'Create Prompt'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    {editingPrompt ? 'Update Prompt' : 'Create Prompt'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}