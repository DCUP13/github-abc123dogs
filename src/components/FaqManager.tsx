import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Trash2, CreditCard as Edit2, Search, Tag, X, Check, TrendingUp } from 'lucide-react';

interface FaqEntry {
  id: string;
  question: string;
  answer: string;
  category: string | null;
  is_active: boolean;
  match_count: number;
  created_at: string;
  updated_at: string;
}

interface FaqManagerProps {
  onSignOut: () => void;
  currentView: string;
}

export function FaqManager({ currentView }: FaqManagerProps) {
  const [entries, setEntries] = useState<FaqEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [editing, setEditing] = useState<FaqEntry | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState({
    question: '',
    answer: '',
    category: '',
    is_active: true,
  });

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) { setLoading(false); return; }

    const { data, error } = await supabase
      .from('faq_entries')
      .select('*')
      .eq('user_id', session.user.id)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error loading FAQs:', error);
    } else {
      setEntries((data || []) as FaqEntry[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const categories = [...new Set(entries.map(e => e.category).filter(Boolean))] as string[];

  const filtered = entries.filter(e => {
    const matchesSearch = !search ||
      e.question.toLowerCase().includes(search.toLowerCase()) ||
      e.answer.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || e.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const openNew = () => {
    setEditing(null);
    setFormData({ question: '', answer: '', category: '', is_active: true });
    setShowForm(true);
  };

  const openEdit = (entry: FaqEntry) => {
    setEditing(entry);
    setFormData({
      question: entry.question,
      answer: entry.answer,
      category: entry.category || '',
      is_active: entry.is_active,
    });
    setShowForm(true);
  };

  const save = async () => {
    if (!formData.question.trim() || !formData.answer.trim()) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    if (editing) {
      const { error } = await supabase
        .from('faq_entries')
        .update({
          question: formData.question.trim(),
          answer: formData.answer.trim(),
          category: formData.category.trim() || null,
          is_active: formData.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editing.id);
      if (error) console.error('Error updating FAQ:', error);
    } else {
      const { error } = await supabase
        .from('faq_entries')
        .insert({
          user_id: session.user.id,
          question: formData.question.trim(),
          answer: formData.answer.trim(),
          category: formData.category.trim() || null,
          is_active: formData.is_active,
        });
      if (error) console.error('Error creating FAQ:', error);
    }

    setShowForm(false);
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from('faq_entries').delete().eq('id', id);
    if (error) { console.error('Error deleting FAQ:', error); return; }
    load();
  };

  const toggleActive = async (entry: FaqEntry) => {
    const { error } = await supabase
      .from('faq_entries')
      .update({ is_active: !entry.is_active, updated_at: new Date().toISOString() })
      .eq('id', entry.id);
    if (error) { console.error('Error toggling FAQ:', error); return; }
    load();
  };

  return (
    <div className="p-4 md:p-8 app-bg min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">FAQ Knowledge Base</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Answers here are checked first by both your email autoresponder and WhatsApp AI, saving AI costs.
            </p>
          </div>
          <button
            onClick={openNew}
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Add FAQ
          </button>
        </div>

        {/* Search + filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search FAQs..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 app-card border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          {categories.length > 0 && (
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="px-3 py-2 app-card border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All categories</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
        </div>

        {/* List */}
        {loading ? (
          <div className="animate-pulse space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 app-card rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="app-card rounded-xl p-12 text-center">
            <p className="text-gray-400 dark:text-gray-500">
              {entries.length === 0 ? 'No FAQs yet. Add your first one to start saving on AI costs.' : 'No FAQs match your search.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(entry => (
              <div key={entry.id} className="app-card rounded-xl p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{entry.question}</h3>
                      {entry.category && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-full">
                          <Tag className="w-3 h-3" />
                          {entry.category}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{entry.answer}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className={`px-2 py-0.5 text-xs rounded-full ${entry.is_active ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-400 dark:bg-gray-700'}`}>
                        {entry.is_active ? 'Active' : 'Inactive'}
                      </span>
                      {entry.match_count > 0 && (
                        <span className="inline-flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                          <TrendingUp className="w-3 h-3" />
                          Used {entry.match_count}x
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => toggleActive(entry)} className="p-2 rounded-md text-gray-400 hover:text-green-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title={entry.is_active ? 'Deactivate' : 'Activate'}>
                      <Check className="w-4 h-4" />
                    </button>
                    <button onClick={() => openEdit(entry)} className="p-2 rounded-md text-gray-400 hover:text-blue-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title="Edit">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => remove(entry.id)} className="p-2 rounded-md text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowForm(false)}>
          <div className="app-card rounded-xl shadow-xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{editing ? 'Edit FAQ' : 'New FAQ'}</h2>
              <button onClick={() => setShowForm(false)} className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Question</label>
                <input
                  type="text"
                  value={formData.question}
                  onChange={e => setFormData({ ...formData, question: e.target.value })}
                  placeholder="What a visitor or lead might ask..."
                  className="w-full px-3 py-2 app-card border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Answer</label>
                <textarea
                  value={formData.answer}
                  onChange={e => setFormData({ ...formData, answer: e.target.value })}
                  placeholder="The answer to return when matched..."
                  rows={4}
                  className="w-full px-3 py-2 app-card border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 resize-y"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category (optional)</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={e => setFormData({ ...formData, category: e.target.value })}
                  placeholder="e.g. Pricing, Hours, Services"
                  className="w-full px-3 py-2 app-card border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 rounded text-purple-500 focus:ring-purple-500"
                />
                Active (AI will use this FAQ)
              </label>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">Cancel</button>
              <button
                onClick={save}
                disabled={!formData.question.trim() || !formData.answer.trim()}
                className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editing ? 'Save changes' : 'Add FAQ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
