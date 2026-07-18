import React, { useState, useEffect } from 'react';
import { X, Users, FileText, Mail, CheckCircle2, AlertTriangle, ChevronRight, ChevronLeft, Send, Loader2, Check, Plus, Trash2, Clock, GitBranch } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from '../../lib/toast';
import {
  STANDARD_FIELDS,
  extractPlaceholders,
  validatePlaceholders,
  validateContactsForTemplate,
  type ContactValidationResult,
} from '../../lib/crmPlaceholders';
import type { Client } from '../CRM';

interface CustomField {
  id: string;
  field_key: string;
  field_label: string;
  field_type: string;
}

interface Template {
  id: string;
  name: string;
  content: string;
  subject?: string;
}

interface CrmCampaignProps {
  scope: 'personal' | 'org';
  orgId?: string | null;
  clients: Client[];
  orgCustomFields: CustomField[];
  userCustomFields?: CustomField[];
  sesEmails: string[];
  currentUserId: string;
  isManager?: boolean;
  onClose: () => void;
}

type Step = 'audience' | 'message' | 'from' | 'validate';

type CampaignMode = 'single' | 'sequence';

interface SequenceStep {
  id: string;
  name: string;
  subject: string;
  body_html: string;
  delay_days: number;
  branch_type: 'none' | 'opened' | 'replied' | 'clicked' | 'bounced' | 'unsubscribed';
  branch_target_step: number | null;
}

const BRANCH_OPTIONS: { value: SequenceStep['branch_type']; label: string }[] = [
  { value: 'none', label: 'No branch' },
  { value: 'opened', label: 'If opened' },
  { value: 'replied', label: 'If replied' },
  { value: 'clicked', label: 'If clicked' },
  { value: 'bounced', label: 'If bounced' },
  { value: 'unsubscribed', label: 'If unsubscribed' },
];

const newStep = (order: number): SequenceStep => ({
  id: crypto.randomUUID(),
  name: `Step ${order}`,
  subject: '',
  body_html: '',
  delay_days: order === 1 ? 0 : 1,
  branch_type: 'none',
  branch_target_step: null,
});

const STEPS: { key: Step; label: string; icon: React.ElementType }[] = [
  { key: 'audience', label: 'Audience', icon: Users },
  { key: 'message', label: 'Message', icon: FileText },
  { key: 'from', label: 'Sender', icon: Mail },
  { key: 'validate', label: 'Review & Send', icon: Send },
];

export function CrmCampaign({ scope, orgId, clients, orgCustomFields, userCustomFields = [], sesEmails, currentUserId, isManager = false, onClose }: CrmCampaignProps) {
  const [step, setStep] = useState<Step>('audience');

  // Audience
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  // Message
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [subject, setSubject] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [campaignName, setCampaignName] = useState('');
  const [mode, setMode] = useState<CampaignMode>('single');
  const [steps, setSteps] = useState<SequenceStep[]>([newStep(1)]);

  // From — prefer persisted default sender
  const [fromEmail, setFromEmail] = useState('');

  useEffect(() => {
    (async () => {
      const { data: settings } = await supabase
        .from('user_settings')
        .select('default_ses_email')
        .eq('user_id', currentUserId)
        .maybeSingle();
      const saved = settings?.default_ses_email as string | undefined;
      if (saved && sesEmails.includes(saved)) setFromEmail(saved);
      else if (sesEmails.length > 0) setFromEmail(sesEmails[0]);
    })();
  }, [sesEmails, currentUserId]);

  // Validate
  const [validating, setValidating] = useState(false);
  const [unknownTokens, setUnknownTokens] = useState<string[]>([]);
  const [contactResults, setContactResults] = useState<ContactValidationResult[]>([]);
  const [sendMode, setSendMode] = useState<'all' | 'valid_only'>('valid_only');

  // Send
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setTemplatesLoading(true);
    const { data } = await supabase
      .from('templates')
      .select('id, name, content')
      .eq('user_id', currentUserId)
      .order('created_at', { ascending: false });
    setTemplates((data as Template[]) || []);
    setTemplatesLoading(false);
  };

  const filteredClients = clients.filter(c => {
    if (filterStatus !== 'all' && c.status !== filterStatus) return false;
    if (filterType !== 'all' && c.client_type !== filterType) return false;
    if (!c.email) return false;
    return true;
  });

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedClientIds(new Set());
      setSelectAll(false);
    } else {
      setSelectedClientIds(new Set(filteredClients.map(c => c.id)));
      setSelectAll(true);
    }
  };

  const toggleClient = (id: string) => {
    setSelectedClientIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const tmpl = templates.find(t => t.id === templateId);
    if (tmpl) {
      setBodyHtml(tmpl.content);
      if (!subject) setSubject(tmpl.name);
    }
  };

  const activeCustomFields = scope === 'personal' ? userCustomFields : orgCustomFields;
  const allKnownFields = [
    ...STANDARD_FIELDS,
    ...activeCustomFields.map(f => ({ key: f.field_key, label: f.field_label })),
  ];

  const updateStep = (id: string, patch: Partial<SequenceStep>) => {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));
  };
  const addStep = () => setSteps(prev => [...prev, newStep(prev.length + 1)]);
  const removeStep = (id: string) => setSteps(prev => prev.length > 1 ? prev.filter(s => s.id !== id) : prev);
  const moveStep = (id: string, dir: -1 | 1) => {
    setSteps(prev => {
      const idx = prev.findIndex(s => s.id === id);
      if (idx < 0) return prev;
      const next = idx + dir;
      if (next < 0 || next >= prev.length) return prev;
      const copy = [...prev];
      [copy[idx], copy[next]] = [copy[next], copy[idx]];
      return copy.map((s, i) => ({ ...s, name: s.name.startsWith('Step ') ? `Step ${i + 1}` : s.name }));
    });
  };

  const runValidation = async () => {
    setValidating(true);
    setUnknownTokens([]);
    setContactResults([]);

    const bodyToValidate = mode === 'sequence' ? steps.map(s => s.body_html).join('\n') : bodyHtml;
    const unknown = validatePlaceholders(bodyToValidate, allKnownFields);
    setUnknownTokens(unknown);

    if (unknown.length === 0) {
      const selectedClients = clients.filter(c => selectedClientIds.has(c.id));
      const bodyForValidation = mode === 'sequence' ? steps.map(s => s.body_html).join('\n') : bodyHtml;

      // Fetch custom values for all selected clients (personal vs org)
      let cvData: any[] | null = null;
      if (scope === 'personal') {
        const res = await supabase
          .from('user_custom_values')
          .select('client_id, field_key, value')
          .in('client_id', selectedClients.map(c => c.id))
          .eq('user_id', currentUserId);
        cvData = res.data;
      } else {
        const res = await supabase
          .from('client_custom_values')
          .select('client_id, field_key, value')
          .in('client_id', selectedClients.map(c => c.id))
          .eq('org_id', orgId);
        cvData = res.data;
      }

      const customValuesByClient: Record<string, Record<string, string>> = {};
      (cvData || []).forEach((row: any) => {
        if (!customValuesByClient[row.client_id]) customValuesByClient[row.client_id] = {};
        customValuesByClient[row.client_id][row.field_key] = row.value || '';
      });

      const results = validateContactsForTemplate(bodyForValidation, selectedClients as any, customValuesByClient, {});
      setContactResults(results);
    }

    setValidating(false);
  };

  const canAdvance = (): boolean => {
    if (step === 'audience') return selectedClientIds.size > 0;
    if (step === 'message') {
      if (!campaignName.trim()) return false;
      if (mode === 'single') return !!subject.trim() && !!bodyHtml.trim();
      return steps.length > 0 && steps.every(s => !!s.subject.trim() && !!s.body_html.trim());
    }
    if (step === 'from') return !!fromEmail;
    return false;
  };

  const advance = () => {
    const order: Step[] = ['audience', 'message', 'from', 'validate'];
    const idx = order.indexOf(step);
    if (idx < order.length - 1) {
      const next = order[idx + 1];
      setStep(next);
      if (next === 'validate') runValidation();
    }
  };

  const goBack = () => {
    const order: Step[] = ['audience', 'message', 'from', 'validate'];
    const idx = order.indexOf(step);
    if (idx > 0) setStep(order[idx - 1]);
  };

  const handleSend = async () => {
    if (!fromEmail) { toast.error('Select a sender address first.'); return; }

    const contactsToSend = sendMode === 'valid_only'
      ? contactResults.filter(r => r.canSend).map(r => r.clientId)
      : contactResults.map(r => r.clientId);

    if (contactsToSend.length === 0) {
      toast.error('No contacts to send to.');
      return;
    }

    setSending(true);
    try {
      // Persist default sender
      await supabase
        .from('user_settings')
        .update({ default_ses_email: fromEmail, updated_at: new Date().toISOString() })
        .eq('user_id', currentUserId);

      // Org campaigns by non-managers go to the approval queue instead of sending immediately.
      const needsApproval = scope === 'org' && !isManager;

      // Create campaign record
      const isSequence = mode === 'sequence' && steps.length > 0;
      const sequenceId = isSequence ? crypto.randomUUID() : null;
      const { data: campaign, error: campaignErr } = await supabase
        .from('crm_campaigns')
        .insert({
          user_id: currentUserId,
          org_id: scope === 'org' ? orgId : null,
          scope,
          name: campaignName,
          subject: isSequence ? steps[0].subject : subject,
          body_html: isSequence ? steps[0].body_html : bodyHtml,
          from_email: fromEmail,
          status: needsApproval ? 'draft' : 'sending',
          total_count: contactsToSend.length,
          sent_count: 0,
          skipped_count: contactResults.filter(r => !r.canSend).length,
          failed_count: 0,
          sequence_id: sequenceId,
        })
        .select()
        .single();

      if (campaignErr) throw campaignErr;

      // Persist sequence steps
      if (isSequence && sequenceId) {
        const stepRows = steps.map((s, i) => ({
          campaign_id: campaign.id,
          step_order: i + 1,
          name: s.name,
          subject: s.subject,
          body_html: s.body_html,
          delay_days: s.delay_days,
          from_email: fromEmail,
          branch_type: s.branch_type,
          branch_target_step: s.branch_target_step,
        }));
        const { error: stepsErr } = await supabase.from('crm_campaign_steps').insert(stepRows);
        if (stepsErr) throw stepsErr;
      }

      if (needsApproval) {
        // Compute next queue position for this org
        const { data: maxPos } = await supabase
          .from('crm_campaign_approvals')
          .select('queue_position')
          .eq('org_id', orgId)
          .order('queue_position', { ascending: false })
          .limit(1)
          .maybeSingle();
        const nextPos = (maxPos?.queue_position || 0) + 1;

        const { error: approvalErr } = await supabase
          .from('crm_campaign_approvals')
          .insert({
            campaign_id: campaign.id,
            org_id: orgId,
            requested_by: currentUserId,
            status: 'pending',
            queue_position: nextPos,
          });
        if (approvalErr) throw approvalErr;

        toast.success(`Campaign submitted for approval — ${contactsToSend.length} recipients queued for manager review.`);
        onClose();
        return;
      }

      // Call edge function to send
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/crm-campaign-send`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          campaign_id: campaign.id,
          client_ids: contactsToSend,
          scope,
          org_id: scope === 'org' ? orgId : null,
          user_id: currentUserId,
          from_email: fromEmail,
          subject: isSequence ? steps[0].subject : subject,
          body_html: isSequence ? steps[0].body_html : bodyHtml,
          is_sequence: isSequence,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Send failed');
      }

      toast.success(`Campaign launched — ${contactsToSend.length} emails queued.`);
      onClose();
    } catch (err: any) {
      toast.error(`Failed to send campaign: ${err.message}`);
    } finally {
      setSending(false);
    }
  };

  const stepIdx = STEPS.findIndex(s => s.key === step);
  const canSendFinal = contactResults.length > 0 && unknownTokens.length === 0 && !validating;
  const validCount = contactResults.filter(r => r.canSend).length;
  const invalidCount = contactResults.filter(r => !r.canSend).length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="app-card rounded-xl shadow-xl w-full max-w-3xl my-4 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">New Campaign</h2>
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${scope === 'personal' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300'}`}>
              {scope === 'personal' ? 'Personal' : 'Org'}
            </span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center px-5 py-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 overflow-x-auto">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isDone = i < stepIdx;
            const isCurrent = i === stepIdx;
            return (
              <React.Fragment key={s.key}>
                <div className={`flex items-center gap-1.5 text-sm font-medium flex-shrink-0 ${isCurrent ? 'text-blue-600 dark:text-blue-400' : isDone ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>
                  {isDone ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                  {s.label}
                </div>
                {i < STEPS.length - 1 && <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 mx-2 flex-shrink-0" />}
              </React.Fragment>
            );
          })}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {step === 'audience' && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Filter contacts (email required)</p>
                <div className="flex gap-3 flex-wrap mb-4">
                  <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm app-card-inner text-gray-900 dark:text-white">
                    <option value="all">All Statuses</option>
                    {['lead','prospect','active','closed','inactive'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <select value={filterType} onChange={e => setFilterType(e.target.value)}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm app-card-inner text-gray-900 dark:text-white">
                    <option value="all">All Types</option>
                    {['buyer','seller','renter','landlord'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{filteredClients.length} contacts with email match filters</p>
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                    <input type="checkbox" checked={selectAll} onChange={toggleSelectAll}
                      className="w-4 h-4 text-blue-600 rounded" />
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      Select All ({selectedClientIds.size} selected)
                    </span>
                  </div>
                  <div className="max-h-64 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
                    {filteredClients.map(c => (
                      <label key={c.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700/40 cursor-pointer">
                        <input type="checkbox" checked={selectedClientIds.has(c.id)} onChange={() => toggleClient(c.id)}
                          className="w-4 h-4 text-blue-600 rounded flex-shrink-0" />
                        <span className="text-sm text-gray-800 dark:text-gray-200 flex-1 min-w-0">
                          {c.first_name} {c.last_name}
                          <span className="ml-2 text-xs text-gray-400">{c.email}</span>
                        </span>
                        <span className="text-xs capitalize text-gray-400">{c.status}</span>
                      </label>
                    ))}
                    {filteredClients.length === 0 && (
                      <p className="text-center text-gray-400 py-6 text-sm">No contacts with email match these filters.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 'message' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Campaign Name *</label>
                <input type="text" value={campaignName} onChange={e => setCampaignName(e.target.value)}
                  placeholder="e.g. Summer Buyers Follow-up"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm app-card-inner text-gray-900 dark:text-white" />
              </div>

              {templates.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Load from Template (optional)</label>
                  <select value={selectedTemplateId} onChange={e => handleTemplateSelect(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm app-card-inner text-gray-900 dark:text-white">
                    <option value="">— Select template —</option>
                    {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Campaign Type</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setMode('single')}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition ${mode === 'single' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/40'}`}>
                    <Mail className="w-4 h-4 inline mr-1.5" />Single email
                  </button>
                  <button type="button" onClick={() => setMode('sequence')}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition ${mode === 'sequence' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/40'}`}>
                    <GitBranch className="w-4 h-4 inline mr-1.5" />Multi-step sequence
                  </button>
                </div>
              </div>

              {mode === 'single' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subject *</label>
                    <input type="text" value={subject} onChange={e => setSubject(e.target.value)}
                      placeholder="Email subject line"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm app-card-inner text-gray-900 dark:text-white" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Body *</label>
                    <textarea value={bodyHtml} onChange={e => setBodyHtml(e.target.value)}
                      rows={8}
                      placeholder="Write your message here. Use {{first_name}}, {{last_name}}, etc. for personalization."
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm app-card-inner text-gray-900 dark:text-white resize-none font-mono" />
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  {steps.map((s, i) => (
                    <div key={s.id} className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/30">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">{i + 1}</span>
                          <input type="text" value={s.name} onChange={e => updateStep(s.id, { name: e.target.value })}
                            placeholder="Step name"
                            className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded app-card-inner text-gray-900 dark:text-white" />
                        </div>
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={() => moveStep(s.id, -1)} disabled={i === 0}
                            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
                          <button type="button" onClick={() => moveStep(s.id, 1)} disabled={i === steps.length - 1}
                            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
                          <button type="button" onClick={() => removeStep(s.id)} disabled={steps.length === 1}
                            className="p-1 text-red-400 hover:text-red-600 disabled:opacity-30"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                      <input type="text" value={s.subject} onChange={e => updateStep(s.id, { subject: e.target.value })}
                        placeholder="Subject *"
                        className="w-full px-2 py-1.5 mb-2 text-sm border border-gray-300 dark:border-gray-600 rounded app-card-inner text-gray-900 dark:text-white" />
                      <textarea value={s.body_html} onChange={e => updateStep(s.id, { body_html: e.target.value })}
                        rows={4}
                        placeholder="Body * — use {{first_name}} etc."
                        className="w-full px-2 py-1.5 mb-2 text-sm border border-gray-300 dark:border-gray-600 rounded app-card-inner text-gray-900 dark:text-white resize-none font-mono" />
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                          <Clock className="w-3.5 h-3.5" />
                          Wait
                          <input type="number" min={0} value={s.delay_days} onChange={e => updateStep(s.id, { delay_days: Math.max(0, parseInt(e.target.value) || 0) })}
                            className="w-14 px-1.5 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded app-card-inner text-gray-900 dark:text-white" />
                          day(s)
                        </label>
                        <label className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                          <GitBranch className="w-3.5 h-3.5" />
                          <select value={s.branch_type} onChange={e => updateStep(s.id, { branch_type: e.target.value as SequenceStep['branch_type'], branch_target_step: e.target.value === 'none' ? null : s.branch_target_step })}
                            className="px-1.5 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded app-card-inner text-gray-900 dark:text-white">
                            {BRANCH_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                        </label>
                        {s.branch_type !== 'none' && (
                          <select value={s.branch_target_step ?? ''} onChange={e => updateStep(s.id, { branch_target_step: e.target.value ? parseInt(e.target.value) : null })}
                            className="px-1.5 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded app-card-inner text-gray-900 dark:text-white">
                            <option value="">Jump to step…</option>
                            {steps.map((_, j) => <option key={j} value={j + 1}>Step {j + 1}</option>)}
                          </select>
                        )}
                      </div>
                    </div>
                  ))}
                  <button type="button" onClick={addStep}
                    className="w-full py-2 text-sm font-medium text-blue-600 dark:text-blue-400 border-2 border-dashed border-blue-300 dark:border-blue-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20">
                    <Plus className="w-4 h-4 inline mr-1.5" />Add step
                  </button>
                </div>
              )}

              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1.5">Available placeholders:</p>
                <div className="flex flex-wrap gap-1.5">
                  {allKnownFields.map(f => (
                    <code key={f.key}
                      onClick={() => {
                        if (mode === 'single') setBodyHtml(prev => prev + `{{${f.key}}}`);
                        else setSteps(prev => prev.map((s, i) => i === prev.length - 1 ? { ...s, body_html: s.body_html + `{{${f.key}}}` } : s));
                      }}
                      className="px-1.5 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 rounded cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-800/60 font-mono"
                      title={`Insert {{${f.key}}}`}
                    >
                      {`{{${f.key}}}`}
                    </code>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 'from' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Send From *</label>
                {sesEmails.length > 0 ? (
                  <select value={fromEmail} onChange={e => setFromEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm app-card-inner text-gray-900 dark:text-white">
                    {sesEmails.map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                ) : (
                  <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
                    <p className="text-sm text-amber-700 dark:text-amber-400">
                      No verified sender addresses found. Add and verify a sender email in Settings &rsaquo; Email.
                    </p>
                  </div>
                )}
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-800/40 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400">
                <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">Campaign summary</p>
                <p>{selectedClientIds.size} recipients &nbsp;|&nbsp; Subject: {subject}</p>
              </div>
            </div>
          )}

          {step === 'validate' && (
            <div className="space-y-4">
              {validating ? (
                <div className="flex items-center justify-center gap-3 py-12">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Checking all contacts…</span>
                </div>
              ) : (
                <>
                  {unknownTokens.length > 0 && (
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-semibold text-red-700 dark:text-red-400 mb-1">Unknown placeholders — cannot send</p>
                          <p className="text-xs text-red-600 dark:text-red-400">
                            These tokens don't map to any known CRM field: {unknownTokens.map(t => `{{${t}}}`).join(', ')}
                          </p>
                          <p className="text-xs text-red-500 dark:text-red-500 mt-1">Go back and fix the message body or remove these placeholders.</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {unknownTokens.length === 0 && contactResults.length > 0 && (
                    <>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="p-3 bg-gray-50 dark:bg-gray-800/40 rounded-lg border border-gray-200 dark:border-gray-700 text-center">
                          <p className="text-2xl font-bold text-gray-900 dark:text-white">{contactResults.length}</p>
                          <p className="text-xs text-gray-500">Total</p>
                        </div>
                        <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 text-center">
                          <p className="text-2xl font-bold text-green-700 dark:text-green-400">{validCount}</p>
                          <p className="text-xs text-green-600 dark:text-green-500">Ready to send</p>
                        </div>
                        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800 text-center">
                          <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{invalidCount}</p>
                          <p className="text-xs text-amber-600 dark:text-amber-500">Missing data</p>
                        </div>
                      </div>

                      {invalidCount > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Contacts with missing data:</p>
                          <div className="border border-amber-200 dark:border-amber-800 rounded-lg overflow-hidden">
                            <div className="max-h-48 overflow-y-auto divide-y divide-amber-100 dark:divide-amber-900/30">
                              {contactResults.filter(r => !r.canSend).map(r => (
                                <div key={r.clientId} className="px-4 py-2.5 bg-amber-50 dark:bg-amber-900/10">
                                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{r.clientName}</p>
                                  <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                                    Missing: {r.missingKeys.map(k => `{{${k}}}`).join(', ')}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="flex gap-3 pt-1">
                            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                              <input type="radio" checked={sendMode === 'valid_only'} onChange={() => setSendMode('valid_only')}
                                className="w-4 h-4 text-blue-600" />
                              Send to {validCount} ready contacts, skip {invalidCount}
                            </label>
                          </div>
                          <div className="flex gap-3">
                            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                              <input type="radio" checked={sendMode === 'all'} onChange={() => setSendMode('all')}
                                className="w-4 h-4 text-blue-600" />
                              Send to all {contactResults.length} (blank values where data is missing)
                            </label>
                          </div>
                        </div>
                      )}

                      {validCount === 0 && invalidCount > 0 && sendMode === 'valid_only' && (
                        <p className="text-sm text-red-600 dark:text-red-400">No contacts have all required data. Update contact records or choose to send anyway.</p>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-5 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
          <button onClick={step === 'audience' ? onClose : goBack}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg">
            {step === 'audience' ? <><X className="w-4 h-4 mr-1.5" />Cancel</> : <><ChevronLeft className="w-4 h-4 mr-1.5" />Back</>}
          </button>

          {step !== 'validate' ? (
            <button
              onClick={advance}
              disabled={!canAdvance()}
              className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1.5" />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={sending || !canSendFinal || unknownTokens.length > 0 || (sendMode === 'valid_only' && validCount === 0)}
              className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{scope === 'org' && !isManager ? 'Submitting…' : 'Sending…'}</>
              ) : (
                <><Send className="w-4 h-4 mr-2" />{scope === 'org' && !isManager ? 'Submit for Approval' : 'Launch Campaign'}</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
