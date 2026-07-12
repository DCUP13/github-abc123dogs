import React, { useState, useEffect, useRef } from 'react';
import {
  Users, Plus, Search, Phone, Mail, MapPin, DollarSign, Calendar, Building,
  CreditCard as Edit, Trash2, X, Save, MessageSquare, Star, Upload, Sparkles,
  ChevronDown, Activity, User, Clock, AlertCircle, CheckCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from '../lib/toast';
import { showConfirm } from '../lib/confirm';
import { CsvImportDialog } from './crm/CsvImportDialog';

export interface Client {
  id: string;
  user_id: string;
  org_id?: string | null;
  assigned_to?: string | null;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  client_type: 'buyer' | 'seller' | 'renter' | 'landlord';
  status: 'lead' | 'prospect' | 'active' | 'closed' | 'inactive';
  budget_min?: number;
  budget_max?: number;
  preferred_areas?: string[];
  property_type?: string;
  notes?: string;
  source?: string;
  deleted_at?: string | null;
  created_at: string;
  updated_at: string;
}

interface ClientGrade {
  id: string;
  client_id: string;
  user_id: string;
  overall_score: number;
  financial_score: number;
  motivation_score: number;
  timeline_score: number;
  communication_score: number;
  ai_analysis: string;
  grade_letter: string;
  created_at: string;
  updated_at: string;
}

interface Interaction {
  id: string;
  client_id: string;
  interaction_type: 'call' | 'email' | 'meeting' | 'showing' | 'text' | 'note';
  subject?: string;
  notes?: string;
  interaction_date: string;
  follow_up_date?: string;
  created_at: string;
  updated_at: string;
}

interface OrgMember {
  user_id: string;
  role: string;
  profile?: { email: string; display_name?: string };
}

interface CustomField {
  id: string;
  org_id: string;
  field_key: string;
  field_label: string;
  field_type: 'text' | 'number' | 'date' | 'dropdown' | 'boolean';
  options?: string[] | null;
  sort_order: number;
}

interface ActivityEntry {
  id: string;
  action: string;
  detail: Record<string, unknown> | null;
  performed_by: string;
  created_at: string;
}

interface OrgInfo {
  id: string;
  name: string;
  role: string;
}

interface CRMProps {
  onSignOut: () => void;
  currentView: string;
}

const clientTypes = [
  { value: 'buyer',    label: 'Buyer',    color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300' },
  { value: 'seller',   label: 'Seller',   color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300' },
  { value: 'renter',   label: 'Renter',   color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300' },
  { value: 'landlord', label: 'Landlord', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300' },
];

const clientStatuses = [
  { value: 'lead',     label: 'Lead',     color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
  { value: 'prospect', label: 'Prospect', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' },
  { value: 'active',   label: 'Active',   color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
  { value: 'closed',   label: 'Closed',   color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300' },
  { value: 'inactive', label: 'Inactive', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300' },
];

const interactionTypes = [
  { value: 'call',     label: 'Call',     icon: Phone },
  { value: 'email',    label: 'Email',    icon: Mail },
  { value: 'meeting',  label: 'Meeting',  icon: Users },
  { value: 'showing',  label: 'Showing',  icon: Building },
  { value: 'text',     label: 'Text',     icon: MessageSquare },
  { value: 'note',     label: 'Note',     icon: Activity },
];

const propertyTypes = ['Single Family Home', 'Condo', 'Townhouse', 'Multi-Family', 'Land', 'Commercial'];

const getGradeColor = (grade: string) => {
  if (grade.startsWith('A')) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
  if (grade.startsWith('B')) return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
  if (grade.startsWith('C')) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
  if (grade.startsWith('D')) return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
  return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
};

function initials(name: string) {
  return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
}

function daysSince(date: string) {
  return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
}

function LastActivityBadge({ date }: { date: string | null }) {
  if (!date) return <span className="text-xs text-gray-400">No activity</span>;
  const days = daysSince(date);
  const color =
    days < 7  ? 'text-green-600 dark:text-green-400' :
    days < 30 ? 'text-yellow-600 dark:text-yellow-400' :
                'text-red-600 dark:text-red-400';
  return (
    <span className={`flex items-center gap-1 text-xs ${color}`}>
      <Clock className="w-3 h-3" />
      {days === 0 ? 'Today' : `${days}d ago`}
    </span>
  );
}

export function CRM({ onSignOut, currentView }: CRMProps) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Org mode
  const [userOrgs, setUserOrgs] = useState<OrgInfo[]>([]);
  const [crmMode, setCrmMode] = useState<'personal' | 'org'>('personal');
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [orgMembers, setOrgMembers] = useState<OrgMember[]>([]);
  const [isManager, setIsManager] = useState(false);

  // Client data
  const [clients, setClients] = useState<Client[]>([]);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityEntry[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedClientGrade, setSelectedClientGrade] = useState<ClientGrade | null>(null);
  const [clientGrades, setClientGrades] = useState<Record<string, ClientGrade>>({});
  const [lastActivity, setLastActivity] = useState<Record<string, string>>({});
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [customValues, setCustomValues] = useState<Record<string, string>>({});

  // UI state
  const [showClientForm, setShowClientForm] = useState(false);
  const [showInteractionForm, setShowInteractionForm] = useState(false);
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [showAiSummary, setShowAiSummary] = useState(false);
  const [aiSummary, setAiSummary] = useState('');
  const [aiSummarizing, setAiSummarizing] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterAssigned, setFilterAssigned] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'interactions' | 'activity' | 'grade'>('interactions');
  const [dupWarning, setDupWarning] = useState<Client | null>(null);
  const [gradingClientId, setGradingClientId] = useState<string | null>(null);

  const [clientForm, setClientForm] = useState({
    first_name: '', last_name: '', email: '', phone: '',
    address: '', city: '', state: '', zip_code: '',
    client_type: 'buyer' as Client['client_type'],
    status: 'lead' as Client['status'],
    budget_min: '', budget_max: '',
    preferred_areas: [] as string[],
    property_type: '', notes: '', source: '',
    assigned_to: '',
  });

  const [interactionForm, setInteractionForm] = useState({
    interaction_type: 'call' as Interaction['interaction_type'],
    subject: '', notes: '',
    interaction_date: new Date().toISOString().slice(0, 16),
    follow_up_date: ''
  });

  const [newPreferredArea, setNewPreferredArea] = useState('');

  // ─── Boot ────────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsLoading(false); return; }
      setCurrentUserId(user.id);
      await loadUserOrgs(user.id);
    })();
  }, []);

  useEffect(() => {
    if (currentUserId !== null) fetchClients();
  }, [crmMode, selectedOrgId, currentUserId]);

  useEffect(() => {
    if (selectedClient) {
      fetchInteractions(selectedClient.id);
      fetchClientGrade(selectedClient.id);
      fetchActivityLog(selectedClient.id);
      if (selectedClient.org_id) fetchCustomValues(selectedClient.id, selectedClient.org_id);
    }
  }, [selectedClient]);

  // ─── Org setup ───────────────────────────────────────────────────────────
  const loadUserOrgs = async (userId: string) => {
    const { data } = await supabase
      .from('organization_members')
      .select('organization_id, role, organizations(id, name)')
      .eq('user_id', userId);

    if (!data?.length) return;
    const orgs: OrgInfo[] = data.map((m: any) => ({
      id: m.organizations.id,
      name: m.organizations.name,
      role: m.role,
    }));
    setUserOrgs(orgs);
  };

  const switchOrg = async (orgId: string) => {
    setSelectedOrgId(orgId);
    const org = userOrgs.find(o => o.id === orgId);
    setIsManager(org?.role === 'owner' || org?.role === 'manager');
    await loadOrgMembers(orgId);
    await loadCustomFields(orgId);
  };

  const loadOrgMembers = async (orgId: string) => {
    const { data } = await supabase
      .from('organization_members')
      .select('user_id, role, profiles(email, display_name)')
      .eq('organization_id', orgId);
    if (data) {
      setOrgMembers(data.map((m: any) => ({
        user_id: m.user_id,
        role: m.role,
        profile: m.profiles,
      })));
    }
  };

  const loadCustomFields = async (orgId: string) => {
    const { data } = await supabase
      .from('client_custom_fields')
      .select('*')
      .eq('org_id', orgId)
      .order('sort_order', { ascending: true });
    setCustomFields((data as CustomField[]) || []);
  };

  const handleModeChange = async (mode: 'personal' | 'org') => {
    if (mode === 'org' && userOrgs.length > 0) {
      setCrmMode('org');
      const firstOrg = userOrgs[0];
      setSelectedOrgId(firstOrg.id);
      setIsManager(firstOrg.role === 'owner' || firstOrg.role === 'manager');
      await loadOrgMembers(firstOrg.id);
      await loadCustomFields(firstOrg.id);
    } else {
      setCrmMode('personal');
      setSelectedOrgId(null);
      setOrgMembers([]);
      setCustomFields([]);
      setIsManager(false);
    }
    setSelectedClient(null);
  };

  // ─── Data fetching ────────────────────────────────────────────────────────
  const fetchClients = async () => {
    try {
      setIsLoading(true);
      let query = supabase.from('clients').select('*').is('deleted_at', null);

      if (crmMode === 'org' && selectedOrgId) {
        query = query.eq('org_id', selectedOrgId);
      } else {
        query = query.is('org_id', null);
      }

      const { data, error } = await query.order('updated_at', { ascending: false });
      if (error) throw error;
      setClients(data || []);
      if (data?.length) {
        await fetchAllClientGrades(data.map(c => c.id));
        await fetchLastActivities(data.map(c => c.id));
      }
    } catch (err) {
      console.error(err);
      setClients([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAllClientGrades = async (ids: string[]) => {
    const { data } = await supabase
      .from('client_grades').select('*').in('client_id', ids);
    const map: Record<string, ClientGrade> = {};
    data?.forEach(g => { map[g.client_id] = g; });
    setClientGrades(map);
  };

  const fetchLastActivities = async (ids: string[]) => {
    const { data } = await supabase
      .from('client_interactions')
      .select('client_id, interaction_date')
      .in('client_id', ids)
      .order('interaction_date', { ascending: false });
    const map: Record<string, string> = {};
    data?.forEach(i => {
      if (!map[i.client_id]) map[i.client_id] = i.interaction_date;
    });
    setLastActivity(map);
  };

  const fetchClientGrade = async (clientId: string) => {
    const { data } = await supabase
      .from('client_grades').select('*').eq('client_id', clientId).maybeSingle();
    setSelectedClientGrade(data);
  };

  const fetchInteractions = async (clientId: string) => {
    const { data } = await supabase
      .from('client_interactions').select('*').eq('client_id', clientId)
      .order('interaction_date', { ascending: false });
    setInteractions(data || []);
  };

  const fetchActivityLog = async (clientId: string) => {
    const { data } = await supabase
      .from('client_activity_log').select('*').eq('client_id', clientId)
      .order('created_at', { ascending: false }).limit(50);
    setActivityLog((data as ActivityEntry[]) || []);
  };

  const fetchCustomValues = async (clientId: string, orgId: string) => {
    const { data } = await supabase
      .from('client_custom_values')
      .select('field_key, value')
      .eq('client_id', clientId)
      .eq('org_id', orgId);
    const map: Record<string, string> = {};
    data?.forEach(v => { map[v.field_key] = v.value || ''; });
    setCustomValues(map);
  };

  // ─── Duplicate check ──────────────────────────────────────────────────────
  const checkDuplicate = async (email: string, excludeId?: string): Promise<Client | null> => {
    if (!email || crmMode !== 'org' || !selectedOrgId) return null;
    const { data } = await supabase
      .from('clients')
      .select('*')
      .eq('org_id', selectedOrgId)
      .eq('email', email.toLowerCase().trim())
      .is('deleted_at', null)
      .maybeSingle();
    if (data && data.id !== excludeId) return data as Client;
    return null;
  };

  // ─── CRUD ─────────────────────────────────────────────────────────────────
  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (clientForm.email && !editingClient) {
      const dup = await checkDuplicate(clientForm.email);
      if (dup) { setDupWarning(dup); return; }
    }

    try {
      const payload: Partial<Client> = {
        first_name: clientForm.first_name,
        last_name: clientForm.last_name,
        email: clientForm.email || null,
        phone: clientForm.phone || null,
        address: clientForm.address || null,
        city: clientForm.city || null,
        state: clientForm.state || null,
        zip_code: clientForm.zip_code || null,
        client_type: clientForm.client_type,
        status: clientForm.status,
        budget_min: clientForm.budget_min ? parseFloat(clientForm.budget_min) : null,
        budget_max: clientForm.budget_max ? parseFloat(clientForm.budget_max) : null,
        preferred_areas: clientForm.preferred_areas.length ? clientForm.preferred_areas : null,
        property_type: clientForm.property_type || null,
        notes: clientForm.notes || null,
        source: clientForm.source || null,
        user_id: user.id,
        updated_at: new Date().toISOString(),
      } as any;

      if (crmMode === 'org' && selectedOrgId) {
        (payload as any).org_id = selectedOrgId;
        (payload as any).assigned_to = clientForm.assigned_to || user.id;
      }

      if (editingClient) {
        const { error } = await supabase.from('clients').update(payload).eq('id', editingClient.id);
        if (error) throw error;
        await logActivity(editingClient.id, 'updated', { name: `${clientForm.first_name} ${clientForm.last_name}` });
        toast.success('Client updated.');
      } else {
        const { data: inserted, error } = await supabase.from('clients').insert(payload).select().single();
        if (error) throw error;
        await logActivity(inserted.id, 'created', { name: `${clientForm.first_name} ${clientForm.last_name}` });
        // Auto-grade on create
        gradeClientInBackground(inserted, user.id);
        toast.success('Client added.');
      }

      await fetchClients();
      resetClientForm();
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to save client.');
    }
  };

  const handleSaveInteraction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const payload: any = {
      ...interactionForm,
      client_id: selectedClient.id,
      user_id: user.id,
      interaction_date: new Date(interactionForm.interaction_date).toISOString(),
      follow_up_date: interactionForm.follow_up_date
        ? new Date(interactionForm.follow_up_date).toISOString() : null,
      updated_at: new Date().toISOString(),
    };
    if (selectedClient.org_id) payload.org_id = selectedClient.org_id;

    const { error } = await supabase.from('client_interactions').insert(payload);
    if (error) { toast.error('Failed to save interaction.'); return; }

    await logActivity(selectedClient.id, 'interaction_added', { type: interactionForm.interaction_type });
    await fetchInteractions(selectedClient.id);
    await fetchActivityLog(selectedClient.id);
    await fetchLastActivities([selectedClient.id]);
    resetInteractionForm();
    toast.success('Interaction saved.');
  };

  const handleDeleteClient = async (id: string) => {
    if (!await showConfirm({ message: 'Delete this client and all associated data?', variant: 'danger', confirmText: 'Delete' })) return;
    try {
      if (crmMode === 'org') {
        // Soft delete for org clients
        await supabase.from('clients').update({ deleted_at: new Date().toISOString() }).eq('id', id);
      } else {
        await supabase.from('clients').delete().eq('id', id);
      }
      if (selectedClient?.id === id) setSelectedClient(null);
      await fetchClients();
      toast.success('Client removed.');
    } catch {
      toast.error('Failed to delete client.');
    }
  };

  const handleDeleteInteraction = async (id: string) => {
    if (!await showConfirm({ message: 'Delete this interaction?', variant: 'danger', confirmText: 'Delete' })) return;
    await supabase.from('client_interactions').delete().eq('id', id);
    if (selectedClient) await fetchInteractions(selectedClient.id);
  };

  const saveCustomValues = async (clientId: string, orgId: string) => {
    for (const [key, value] of Object.entries(customValues)) {
      await supabase.from('client_custom_values').upsert(
        { client_id: clientId, org_id: orgId, field_key: key, value, updated_at: new Date().toISOString() },
        { onConflict: 'client_id,field_key' }
      );
    }
  };

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const logActivity = async (clientId: string, action: string, detail?: Record<string, unknown>) => {
    await supabase.from('client_activity_log').insert({
      client_id: clientId,
      org_id: crmMode === 'org' ? selectedOrgId : null,
      action,
      detail: detail || null,
    });
  };

  const gradeClientInBackground = async (client: Client, userId: string) => {
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/grade-client`;
      await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ client_id: client.id, user_id: userId, client_data: client }),
      });
    } catch { /* non-critical */ }
  };

  const handleRegrade = async () => {
    if (!selectedClient || !currentUserId) return;
    setGradingClientId(selectedClient.id);
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/grade-client`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ client_id: selectedClient.id, user_id: currentUserId, client_data: selectedClient }),
      });
      if (!res.ok) throw new Error('Grade failed');
      await fetchClientGrade(selectedClient.id);
      await fetchAllClientGrades([selectedClient.id]);
      toast.success('Client re-graded.');
    } catch {
      toast.error('Failed to re-grade client.');
    } finally {
      setGradingClientId(null);
    }
  };

  const handleAiSummary = async () => {
    if (!selectedClient) return;
    setAiSummarizing(true);
    setShowAiSummary(true);
    setAiSummary('');
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/crm-ai-summary`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client: selectedClient,
          interactions,
          grade: selectedClientGrade,
          custom_fields: customFields,
          custom_values: customValues,
        }),
      });
      if (!res.ok) throw new Error('Summary failed');
      const json = await res.json();
      setAiSummary(json.summary || 'No summary available.');
    } catch {
      setAiSummary('Failed to generate summary. Please try again.');
    } finally {
      setAiSummarizing(false);
    }
  };

  // ─── Form helpers ─────────────────────────────────────────────────────────
  const resetClientForm = () => {
    setClientForm({
      first_name: '', last_name: '', email: '', phone: '',
      address: '', city: '', state: '', zip_code: '',
      client_type: 'buyer', status: 'lead',
      budget_min: '', budget_max: '',
      preferred_areas: [], property_type: '', notes: '', source: '',
      assigned_to: currentUserId || '',
    });
    setEditingClient(null);
    setShowClientForm(false);
    setDupWarning(null);
  };

  const resetInteractionForm = () => {
    setInteractionForm({
      interaction_type: 'call', subject: '', notes: '',
      interaction_date: new Date().toISOString().slice(0, 16),
      follow_up_date: ''
    });
    setShowInteractionForm(false);
  };

  const handleEditClient = (client: Client) => {
    setEditingClient(client);
    setClientForm({
      first_name: client.first_name, last_name: client.last_name,
      email: client.email || '', phone: client.phone || '',
      address: client.address || '', city: client.city || '',
      state: client.state || '', zip_code: client.zip_code || '',
      client_type: client.client_type, status: client.status,
      budget_min: client.budget_min?.toString() || '',
      budget_max: client.budget_max?.toString() || '',
      preferred_areas: client.preferred_areas || [],
      property_type: client.property_type || '',
      notes: client.notes || '', source: client.source || '',
      assigned_to: client.assigned_to || '',
    });
    setShowClientForm(true);
  };

  const addPreferredArea = () => {
    if (newPreferredArea.trim() && !clientForm.preferred_areas.includes(newPreferredArea.trim())) {
      setClientForm(prev => ({ ...prev, preferred_areas: [...prev.preferred_areas, newPreferredArea.trim()] }));
      setNewPreferredArea('');
    }
  };

  const removePreferredArea = (area: string) =>
    setClientForm(prev => ({ ...prev, preferred_areas: prev.preferred_areas.filter(a => a !== area) }));

  // ─── Filtering ────────────────────────────────────────────────────────────
  const getFilteredClients = () =>
    clients.filter(c => {
      const q = searchQuery.toLowerCase();
      const matchSearch =
        c.first_name.toLowerCase().includes(q) ||
        c.last_name.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone?.includes(q);
      const matchType = filterType === 'all' || c.client_type === filterType;
      const matchStatus = filterStatus === 'all' || c.status === filterStatus;
      const matchAssigned = filterAssigned === 'all' || c.assigned_to === filterAssigned;
      return matchSearch && matchType && matchStatus && matchAssigned;
    });

  const getTypeInfo = (type: string) => clientTypes.find(t => t.value === type) || clientTypes[0];
  const getStatusInfo = (s: string) => clientStatuses.find(x => x.value === s) || clientStatuses[0];
  const getInteractionTypeInfo = (t: string) => interactionTypes.find(x => x.value === t) || interactionTypes[0];

  const getMemberDisplay = (userId: string) => {
    const m = orgMembers.find(o => o.user_id === userId);
    if (!m) return { label: 'Unknown', initials: '?' };
    const email = m.profile?.email || '';
    const name = m.profile?.display_name || email.split('@')[0];
    return { label: name, initials: initials(name) };
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n);

  // ─── Loading ──────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="p-4 md:p-8 app-bg min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin theme-spinner" />
      </div>
    );
  }

  const filteredClients = getFilteredClients();
  const currentOrg = userOrgs.find(o => o.id === selectedOrgId);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-8 app-bg min-h-screen">
      <div className="max-w-7xl mx-auto">
        {!selectedClient ? (
          <div>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
              <div className="flex items-center gap-3">
                <Users className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">CRM</h1>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Org / Personal toggle */}
                {userOrgs.length > 0 && (
                  <div className="flex items-center rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden text-sm">
                    <button
                      onClick={() => handleModeChange('personal')}
                      className={`px-3 py-1.5 font-medium transition-colors ${crmMode === 'personal' ? 'bg-indigo-600 text-white' : 'app-card text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                    >
                      My Contacts
                    </button>
                    {userOrgs.length === 1 ? (
                      <button
                        onClick={() => handleModeChange('org')}
                        className={`px-3 py-1.5 font-medium transition-colors ${crmMode === 'org' ? 'bg-indigo-600 text-white' : 'app-card text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                      >
                        {userOrgs[0].name}
                      </button>
                    ) : (
                      <select
                        value={crmMode === 'org' ? selectedOrgId || '' : ''}
                        onChange={async e => {
                          if (e.target.value) {
                            setCrmMode('org');
                            setSelectedOrgId(e.target.value);
                            await switchOrg(e.target.value);
                          }
                        }}
                        className={`px-3 py-1.5 font-medium transition-colors appearance-none pr-7 ${crmMode === 'org' ? 'bg-indigo-600 text-white' : 'app-card text-gray-700 dark:text-gray-300'}`}
                      >
                        <option value="">Select Org</option>
                        {userOrgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                      </select>
                    )}
                  </div>
                )}

                {/* Import CSV (org managers only) */}
                {crmMode === 'org' && isManager && (
                  <button
                    onClick={() => setShowCsvImport(true)}
                    className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 app-card hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <Upload className="w-4 h-4 mr-1.5" />
                    Import CSV
                  </button>
                )}

                <button
                  onClick={() => { setClientForm(prev => ({ ...prev, assigned_to: currentUserId || '' })); setShowClientForm(true); }}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Client
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-2 mb-5">
              <div className="sm:flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search clients..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 app-card text-gray-900 dark:text-white text-sm"
                />
              </div>
              <select value={filterType} onChange={e => setFilterType(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg app-card text-gray-900 dark:text-white text-sm">
                <option value="all">All Types</option>
                {clientTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg app-card text-gray-900 dark:text-white text-sm">
                <option value="all">All Statuses</option>
                {clientStatuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              {crmMode === 'org' && isManager && (
                <select value={filterAssigned} onChange={e => setFilterAssigned(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg app-card text-gray-900 dark:text-white text-sm">
                  <option value="all">All Members</option>
                  {orgMembers.map(m => {
                    const d = getMemberDisplay(m.user_id);
                    return <option key={m.user_id} value={m.user_id}>{d.label}</option>;
                  })}
                </select>
              )}
            </div>

            {/* Client list */}
            <div className="app-card rounded-xl shadow-sm overflow-hidden">
              {filteredClients.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    {clients.length === 0 ? 'No clients yet' : 'No clients match'}
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    {clients.length === 0 ? 'Add your first client to get started.' : 'Try adjusting your search or filters.'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredClients.map(client => {
                    const typeInfo = getTypeInfo(client.client_type);
                    const statusInfo = getStatusInfo(client.status);
                    const grade = clientGrades[client.id];

                    return (
                      <div
                        key={client.id}
                        onClick={() => setSelectedClient(client)}
                        className="p-4 sm:p-5 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1.5">
                              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                                {client.first_name} {client.last_name}
                              </h3>
                              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${typeInfo.color}`}>{typeInfo.label}</span>
                              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusInfo.color}`}>{statusInfo.label}</span>
                              {grade && (
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold rounded-full ${getGradeColor(grade.grade_letter)}`}>
                                  <Star className="w-3 h-3" /> {grade.grade_letter}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                              {client.email && <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{client.email}</span>}
                              {client.phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{client.phone}</span>}
                              {(client.city || client.state) && (
                                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />
                                  {[client.city, client.state].filter(Boolean).join(', ')}
                                </span>
                              )}
                              <LastActivityBadge date={lastActivity[client.id] || null} />
                            </div>
                          </div>

                          <div className="flex items-center gap-2 ml-3">
                            {crmMode === 'org' && client.assigned_to && (
                              <div
                                title={getMemberDisplay(client.assigned_to).label}
                                className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-xs font-bold text-indigo-700 dark:text-indigo-300 flex-shrink-0"
                              >
                                {getMemberDisplay(client.assigned_to).initials}
                              </div>
                            )}
                            <button onClick={e => { e.stopPropagation(); handleEditClient(client); }}
                              className="p-1.5 text-gray-400 hover:text-indigo-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600">
                              <Edit className="w-4 h-4" />
                            </button>
                            <button onClick={e => { e.stopPropagation(); handleDeleteClient(client.id); }}
                              className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ─── Client Detail ─────────────────────────────────────────── */
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-5 gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <button onClick={() => setSelectedClient(null)}
                  className="flex-shrink-0 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                  <X className="w-5 h-5" />
                </button>
                <div className="min-w-0">
                  <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white truncate">
                    {selectedClient.first_name} {selectedClient.last_name}
                  </h1>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getTypeInfo(selectedClient.client_type).color}`}>
                      {getTypeInfo(selectedClient.client_type).label}
                    </span>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusInfo(selectedClient.status).color}`}>
                      {getStatusInfo(selectedClient.status).label}
                    </span>
                    {crmMode === 'org' && selectedClient.assigned_to && (
                      <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {getMemberDisplay(selectedClient.assigned_to).label}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 flex-wrap">
                <button onClick={handleAiSummary}
                  className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 app-card hover:bg-gray-50 dark:hover:bg-gray-700">
                  <Sparkles className="w-4 h-4 mr-1.5" />
                  AI Summary
                </button>
                <button onClick={() => handleEditClient(selectedClient)}
                  className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 app-card hover:bg-gray-50 dark:hover:bg-gray-700">
                  <Edit className="w-4 h-4 mr-1.5" />
                  Edit
                </button>
                <button onClick={() => setShowInteractionForm(true)}
                  className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700">
                  <Plus className="w-4 h-4 mr-1.5" />
                  Interaction
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Left: Client info */}
              <div className="lg:col-span-1 space-y-5">
                <div className="app-card rounded-xl shadow-sm p-5">
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Contact Details</h2>
                  <div className="space-y-3 text-sm">
                    {selectedClient.email && (
                      <div className="flex items-center gap-2.5 text-gray-700 dark:text-gray-300">
                        <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <a href={`mailto:${selectedClient.email}`} className="hover:text-indigo-600">{selectedClient.email}</a>
                      </div>
                    )}
                    {selectedClient.phone && (
                      <div className="flex items-center gap-2.5 text-gray-700 dark:text-gray-300">
                        <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        {selectedClient.phone}
                      </div>
                    )}
                    {(selectedClient.address || selectedClient.city) && (
                      <div className="flex items-start gap-2.5 text-gray-700 dark:text-gray-300">
                        <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                        <div>
                          {selectedClient.address && <div>{selectedClient.address}</div>}
                          <div>{[selectedClient.city, selectedClient.state, selectedClient.zip_code].filter(Boolean).join(', ')}</div>
                        </div>
                      </div>
                    )}
                    {(selectedClient.budget_min || selectedClient.budget_max) && (
                      <div className="flex items-center gap-2.5 text-gray-700 dark:text-gray-300">
                        <DollarSign className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        {selectedClient.budget_min ? formatCurrency(selectedClient.budget_min) : 'No min'} – {selectedClient.budget_max ? formatCurrency(selectedClient.budget_max) : 'No max'}
                      </div>
                    )}
                    {selectedClient.property_type && (
                      <div className="flex items-center gap-2.5 text-gray-700 dark:text-gray-300">
                        <Building className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        {selectedClient.property_type}
                      </div>
                    )}
                    {selectedClient.preferred_areas?.length && (
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1.5 font-medium">Preferred Areas</div>
                        <div className="flex flex-wrap gap-1">
                          {selectedClient.preferred_areas.map((a, i) => (
                            <span key={i} className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">{a}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {selectedClient.source && (
                      <div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">Source: </span>
                        <span className="text-gray-700 dark:text-gray-300">{selectedClient.source}</span>
                      </div>
                    )}
                    {selectedClient.notes && (
                      <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium">Notes</div>
                        <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{selectedClient.notes}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Custom fields */}
                {crmMode === 'org' && customFields.length > 0 && (
                  <div className="app-card rounded-xl shadow-sm p-5">
                    <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Custom Fields</h2>
                    <div className="space-y-3">
                      {customFields.map(field => (
                        <div key={field.field_key}>
                          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{field.field_label}</label>
                          {field.field_type === 'boolean' ? (
                            <input type="checkbox"
                              checked={customValues[field.field_key] === 'true'}
                              onChange={e => {
                                const val = e.target.checked ? 'true' : 'false';
                                setCustomValues(prev => ({ ...prev, [field.field_key]: val }));
                                if (selectedClient.org_id) saveCustomValues(selectedClient.id, selectedClient.org_id);
                              }}
                              className="w-4 h-4 text-indigo-600 rounded"
                            />
                          ) : field.field_type === 'dropdown' ? (
                            <select
                              value={customValues[field.field_key] || ''}
                              onChange={e => setCustomValues(prev => ({ ...prev, [field.field_key]: e.target.value }))}
                              onBlur={() => { if (selectedClient.org_id) saveCustomValues(selectedClient.id, selectedClient.org_id); }}
                              className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg app-card-inner text-gray-900 dark:text-white"
                            >
                              <option value="">Select…</option>
                              {(field.options || []).map((o: string) => <option key={o} value={o}>{o}</option>)}
                            </select>
                          ) : (
                            <input
                              type={field.field_type === 'number' ? 'number' : field.field_type === 'date' ? 'date' : 'text'}
                              value={customValues[field.field_key] || ''}
                              onChange={e => setCustomValues(prev => ({ ...prev, [field.field_key]: e.target.value }))}
                              onBlur={() => { if (selectedClient.org_id) saveCustomValues(selectedClient.id, selectedClient.org_id); }}
                              className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg app-card-inner text-gray-900 dark:text-white"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right: Tabs */}
              <div className="lg:col-span-2 space-y-5">
                {/* Tab bar */}
                <div className="flex border-b border-gray-200 dark:border-gray-700">
                  {(['interactions', 'grade', 'activity'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize ${
                        activeTab === tab
                          ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                          : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                      }`}
                    >
                      {tab === 'interactions' ? 'Interactions' : tab === 'grade' ? 'AI Grade' : 'Activity'}
                    </button>
                  ))}
                </div>

                {/* Interactions tab */}
                {activeTab === 'interactions' && (
                  <div className="app-card rounded-xl shadow-sm p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-base font-semibold text-gray-900 dark:text-white">Interaction History</h2>
                      <button onClick={() => setShowInteractionForm(true)}
                        className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400">
                        <Plus className="w-4 h-4 mr-1" />Add
                      </button>
                    </div>
                    {interactions.length === 0 ? (
                      <div className="text-center py-8">
                        <MessageSquare className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-500 dark:text-gray-400 text-sm">No interactions yet</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {interactions.map(int => {
                          const ti = getInteractionTypeInfo(int.interaction_type);
                          const Icon = ti.icon;
                          return (
                            <div key={int.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start gap-3 flex-1">
                                  <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg flex-shrink-0">
                                    <Icon className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="font-medium text-sm text-gray-900 dark:text-white">{ti.label}</span>
                                      <span className="text-xs text-gray-500 dark:text-gray-400">{formatDate(int.interaction_date)}</span>
                                    </div>
                                    {int.subject && <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">{int.subject}</p>}
                                    {int.notes && <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{int.notes}</p>}
                                    {int.follow_up_date && (
                                      <div className="flex items-center gap-1 mt-1.5 text-xs text-amber-600 dark:text-amber-400">
                                        <Calendar className="w-3.5 h-3.5" />
                                        Follow up: {formatDate(int.follow_up_date)}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <button onClick={() => handleDeleteInteraction(int.id)}
                                  className="p-1 text-gray-400 hover:text-red-500 rounded flex-shrink-0">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Grade tab */}
                {activeTab === 'grade' && (
                  <div className="app-card rounded-xl shadow-sm p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-base font-semibold text-gray-900 dark:text-white">AI Grade</h2>
                      <div className="flex items-center gap-2">
                        {selectedClientGrade && (
                          <span className={`px-3 py-1 text-lg font-bold rounded-lg ${getGradeColor(selectedClientGrade.grade_letter)}`}>
                            {selectedClientGrade.grade_letter}
                          </span>
                        )}
                        <button
                          onClick={handleRegrade}
                          disabled={!!gradingClientId}
                          className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline disabled:opacity-50"
                        >
                          {gradingClientId ? 'Grading…' : 'Re-grade'}
                        </button>
                      </div>
                    </div>
                    {!selectedClientGrade ? (
                      <div className="text-center py-8">
                        <Star className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-500 dark:text-gray-400 text-sm">No grade yet. Click Re-grade to run AI scoring.</p>
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 gap-3 mb-4">
                          {[
                            { label: 'Financial', score: selectedClientGrade.financial_score, color: 'text-green-600 dark:text-green-400' },
                            { label: 'Motivation', score: selectedClientGrade.motivation_score, color: 'text-blue-600 dark:text-blue-400' },
                            { label: 'Timeline', score: selectedClientGrade.timeline_score, color: 'text-orange-600 dark:text-orange-400' },
                            { label: 'Communication', score: selectedClientGrade.communication_score, color: 'text-purple-600 dark:text-purple-400' },
                          ].map(({ label, score, color }) => (
                            <div key={label} className="p-3 app-card-inner/50 rounded-lg">
                              <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
                              <div className={`text-base font-semibold ${color}`}>{score}/100</div>
                              <div className="mt-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div className="h-full bg-current rounded-full" style={{ width: `${score}%`, opacity: 0.7 }} />
                              </div>
                            </div>
                          ))}
                        </div>
                        {selectedClientGrade.ai_analysis && (
                          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                            <div className="flex items-start gap-2">
                              <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                              <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">{selectedClientGrade.ai_analysis}</p>
                            </div>
                          </div>
                        )}
                        <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                          Graded {new Date(selectedClientGrade.created_at).toLocaleDateString()}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Activity log tab */}
                {activeTab === 'activity' && (
                  <div className="app-card rounded-xl shadow-sm p-5">
                    <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Activity Log</h2>
                    {activityLog.length === 0 ? (
                      <div className="text-center py-8">
                        <Activity className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-500 dark:text-gray-400 text-sm">No activity recorded yet</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {activityLog.map(entry => {
                          const member = crmMode === 'org' ? getMemberDisplay(entry.performed_by) : null;
                          return (
                            <div key={entry.id} className="flex items-start gap-3">
                              <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                                {member ? (
                                  <span className="text-xs font-bold text-gray-600 dark:text-gray-300">{member.initials}</span>
                                ) : (
                                  <Activity className="w-3.5 h-3.5 text-gray-500" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-700 dark:text-gray-300">
                                  {member && <span className="font-medium">{member.label} </span>}
                                  <span className="capitalize">{entry.action.replace(/_/g, ' ')}</span>
                                  {entry.detail?.name && <span className="text-gray-500"> — {String(entry.detail.name)}</span>}
                                </p>
                                <p className="text-xs text-gray-400 mt-0.5">{formatDate(entry.created_at)}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─── AI Summary Modal ───────────────────────────────────── */}
        {showAiSummary && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="app-card rounded-xl shadow-lg w-full max-w-lg">
              <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-500" />
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">AI Summary</h3>
                </div>
                <button onClick={() => setShowAiSummary(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-5">
                {aiSummarizing ? (
                  <div className="flex items-center gap-3 py-6 justify-center">
                    <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-gray-600 dark:text-gray-300 text-sm">Generating summary…</span>
                  </div>
                ) : (
                  <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{aiSummary}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─── Duplicate Warning Modal ────────────────────────────── */}
        {dupWarning && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="app-card rounded-xl shadow-lg w-full max-w-md p-6">
              <div className="flex items-start gap-3 mb-4">
                <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Duplicate Email Detected</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    A contact with this email already exists in the org CRM: <strong>{dupWarning.first_name} {dupWarning.last_name}</strong>
                  </p>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setDupWarning(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg">
                  Cancel
                </button>
                <button
                  onClick={() => { setDupWarning(null); setSelectedClient(dupWarning); }}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
                >
                  View Existing
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── Client Form Modal ───────────────────────────────────── */}
        {showClientForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center p-4 z-50 overflow-y-auto">
            <div className="app-card rounded-xl shadow-lg w-full max-w-2xl mx-auto my-4">
              <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                  {editingClient ? 'Edit Client' : 'Add Client'}
                </h3>
                <button onClick={resetClientForm} className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveClient} className="p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">First Name *</label>
                    <input type="text" required value={clientForm.first_name}
                      onChange={e => setClientForm(p => ({ ...p, first_name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg app-card-inner text-gray-900 dark:text-white text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Last Name *</label>
                    <input type="text" required value={clientForm.last_name}
                      onChange={e => setClientForm(p => ({ ...p, last_name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg app-card-inner text-gray-900 dark:text-white text-sm" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                    <input type="email" value={clientForm.email}
                      onChange={e => setClientForm(p => ({ ...p, email: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg app-card-inner text-gray-900 dark:text-white text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                    <input type="tel" value={clientForm.phone}
                      onChange={e => setClientForm(p => ({ ...p, phone: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg app-card-inner text-gray-900 dark:text-white text-sm" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address</label>
                  <input type="text" value={clientForm.address}
                    onChange={e => setClientForm(p => ({ ...p, address: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg app-card-inner text-gray-900 dark:text-white text-sm" />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">City</label>
                    <input type="text" value={clientForm.city}
                      onChange={e => setClientForm(p => ({ ...p, city: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg app-card-inner text-gray-900 dark:text-white text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">State</label>
                    <input type="text" value={clientForm.state}
                      onChange={e => setClientForm(p => ({ ...p, state: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg app-card-inner text-gray-900 dark:text-white text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ZIP</label>
                    <input type="text" value={clientForm.zip_code}
                      onChange={e => setClientForm(p => ({ ...p, zip_code: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg app-card-inner text-gray-900 dark:text-white text-sm" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Client Type</label>
                    <select value={clientForm.client_type} onChange={e => setClientForm(p => ({ ...p, client_type: e.target.value as Client['client_type'] }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg app-card-inner text-gray-900 dark:text-white text-sm">
                      {clientTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                    <select value={clientForm.status} onChange={e => setClientForm(p => ({ ...p, status: e.target.value as Client['status'] }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg app-card-inner text-gray-900 dark:text-white text-sm">
                      {clientStatuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                </div>

                {/* Assigned to (org mode only) */}
                {crmMode === 'org' && orgMembers.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Assigned To</label>
                    <select value={clientForm.assigned_to} onChange={e => setClientForm(p => ({ ...p, assigned_to: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg app-card-inner text-gray-900 dark:text-white text-sm">
                      {orgMembers.map(m => {
                        const d = getMemberDisplay(m.user_id);
                        return <option key={m.user_id} value={m.user_id}>{d.label}</option>;
                      })}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Budget Min</label>
                    <input type="number" value={clientForm.budget_min} placeholder="Min budget"
                      onChange={e => setClientForm(p => ({ ...p, budget_min: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg app-card-inner text-gray-900 dark:text-white text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Budget Max</label>
                    <input type="number" value={clientForm.budget_max} placeholder="Max budget"
                      onChange={e => setClientForm(p => ({ ...p, budget_max: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg app-card-inner text-gray-900 dark:text-white text-sm" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Property Type</label>
                  <select value={clientForm.property_type} onChange={e => setClientForm(p => ({ ...p, property_type: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg app-card-inner text-gray-900 dark:text-white text-sm">
                    <option value="">Select…</option>
                    {propertyTypes.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Preferred Areas</label>
                  <div className="flex gap-2 mb-2">
                    <input type="text" value={newPreferredArea}
                      onChange={e => setNewPreferredArea(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addPreferredArea())}
                      placeholder="Add area"
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg app-card-inner text-gray-900 dark:text-white text-sm" />
                    <button type="button" onClick={addPreferredArea}
                      className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">Add</button>
                  </div>
                  {clientForm.preferred_areas.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {clientForm.preferred_areas.map((a, i) => (
                        <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 rounded text-sm">
                          {a}
                          <button type="button" onClick={() => removePreferredArea(a)} className="text-indigo-600 hover:text-indigo-800">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Source</label>
                  <input type="text" value={clientForm.source} placeholder="How did you meet this client?"
                    onChange={e => setClientForm(p => ({ ...p, source: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg app-card-inner text-gray-900 dark:text-white text-sm" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                  <textarea value={clientForm.notes} rows={3}
                    onChange={e => setClientForm(p => ({ ...p, notes: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg app-card-inner text-gray-900 dark:text-white text-sm resize-none" />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={resetClientForm}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg">
                    Cancel
                  </button>
                  <button type="submit"
                    className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700">
                    <Save className="w-4 h-4 mr-2" />
                    {editingClient ? 'Update' : 'Save'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ─── Interaction Form Modal ──────────────────────────────── */}
        {showInteractionForm && selectedClient && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="app-card rounded-xl shadow-lg w-full max-w-md flex flex-col max-h-[90vh]">
              <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">Add Interaction</h3>
                <button onClick={resetInteractionForm} className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSaveInteraction} className="flex flex-col flex-1 min-h-0">
                <div className="overflow-y-auto flex-1 p-5 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                    <select value={interactionForm.interaction_type} onChange={e => setInteractionForm(p => ({ ...p, interaction_type: e.target.value as Interaction['interaction_type'] }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg app-card-inner text-gray-900 dark:text-white text-sm">
                      {interactionTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subject</label>
                    <input type="text" value={interactionForm.subject} placeholder="Brief subject"
                      onChange={e => setInteractionForm(p => ({ ...p, subject: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg app-card-inner text-gray-900 dark:text-white text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date *</label>
                    <input type="datetime-local" required value={interactionForm.interaction_date}
                      onChange={e => setInteractionForm(p => ({ ...p, interaction_date: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg app-card-inner text-gray-900 dark:text-white text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Follow-up Date</label>
                    <input type="datetime-local" value={interactionForm.follow_up_date}
                      onChange={e => setInteractionForm(p => ({ ...p, follow_up_date: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg app-card-inner text-gray-900 dark:text-white text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                    <textarea value={interactionForm.notes} rows={4}
                      onChange={e => setInteractionForm(p => ({ ...p, notes: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg app-card-inner text-gray-900 dark:text-white text-sm resize-none" />
                  </div>
                </div>
                <div className="flex justify-end gap-2 p-5 pt-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
                  <button type="button" onClick={resetInteractionForm}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg">
                    Cancel
                  </button>
                  <button type="submit"
                    className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700">
                    <Save className="w-4 h-4 mr-2" />
                    Save
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ─── CSV Import Dialog ───────────────────────────────────── */}
        {showCsvImport && selectedOrgId && (
          <CsvImportDialog
            orgId={selectedOrgId}
            orgMembers={orgMembers}
            customFields={customFields}
            currentUserId={currentUserId || ''}
            onClose={() => setShowCsvImport(false)}
            onImported={() => { setShowCsvImport(false); fetchClients(); }}
          />
        )}
      </div>
    </div>
  );
}
