import React, { useState, useEffect } from 'react';
import { X, Users, FileText, Mail, CheckCircle2, AlertTriangle, ChevronRight, ChevronLeft, Send, Loader2, Check } from 'lucide-react';
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
  orgId: string;
  clients: Client[];
  orgCustomFields: CustomField[];
  sesEmails: string[];
  currentUserId: string;
  onClose: () => void;
}

type Step = 'audience' | 'message' | 'from' | 'validate';

const STEPS: { key: Step; label: string; icon: React.ElementType }[] = [
  { key: 'audience', label: 'Audience', icon: Users },
  { key: 'message', label: 'Message', icon: FileText },
  { key: 'from', label: 'Sender', icon: Mail },
  { key: 'validate', label: 'Review & Send', icon: Send },
];

export function CrmCampaign({ orgId, clients, orgCustomFields, sesEmails, currentUserId, onClose }: CrmCampaignProps) {
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

  // From
  const [fromEmail, setFromEmail] = useState(sesEmails[0] || '');

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

  const allKnownFields = [
    ...STANDARD_FIELDS,
    ...orgCustomFields.map(f => ({ key: f.field_key, label: f.field_label })),
  ];

  const runValidation = async () => {
    setValidating(true);
    setUnknownTokens([]);
    setContactResults([]);

    const unknown = validatePlaceholders(bodyHtml, allKnownFields);
    setUnknownTokens(unknown);

    if (unknown.length === 0) {
      const selectedClients = clients.filter(c => selectedClientIds.has(c.id));

      // Fetch custom values for all selected clients
      const { data: cvData } = await supabase
        .from('client_custom_values')
        .select('client_id, field_key, value')
        .in('client_id', selectedClients.map(c => c.id))
        .eq('org_id', orgId);

      const customValuesByClient: Record<string, Record<string, string>> = {};
      (cvData || []).forEach((row: any) => {
        if (!customValuesByClient[row.client_id]) customValuesByClient[row.client_id] = {};
        customValuesByClient[row.client_id][row.field_key] = row.value || '';
      });

      const results = validateContactsForTemplate(bodyHtml, selectedClients as any, customValuesByClient, {});
      setContactResults(results);
    }

    setValidating(false);
  };

  const canAdvance = (): boolean => {
    if (step === 'audience') return selectedClientIds.size > 0;
    if (step === 'message') return !!subject.trim() && !!bodyHtml.trim() && !!campaignName.trim();
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
      // Create campaign record
      const { data: campaign, error: campaignErr } = await supabase
        .from('crm_campaigns')
        .insert({
          user_id: currentUserId,
          org_id: orgId,
          name: campaignName,
          subject,
          body_html: bodyHtml,
          from_email: fromEmail,
          status: 'sending',
          total_count: contactsToSend.length,
          sent_count: 0,
          skipped_count: contactResults.filter(r => !r.canSend).length,
          failed_count: 0,
        })
        .select()
        .single();

      if (campaignErr) throw campaignErr;

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
          org_id: orgId,
          from_email: fromEmail,
          subject,
          body_html: bodyHtml,
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
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">New Campaign</h2>
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

              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1.5">Available placeholders:</p>
                <div className="flex flex-wrap gap-1.5">
                  {allKnownFields.map(f => (
                    <code key={f.key}
                      onClick={() => setBodyHtml(prev => prev + `{{${f.key}}}`)}
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
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending…</>
              ) : (
                <><Send className="w-4 h-4 mr-2" />Launch Campaign</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
