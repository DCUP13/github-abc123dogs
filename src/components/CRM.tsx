import React, { useState, useEffect } from 'react';
import {
  Users, Plus, Search, Phone, Mail, MapPin, DollarSign, Calendar, Building,
  CreditCard as Edit, Trash2, X, Save, MessageSquare, Star, Upload, Sparkles,
  Activity, User, Clock, AlertCircle, List, LayoutGrid, Settings2,
  Send, Zap, ChevronDown, ChevronUp, CheckCircle2, Megaphone, ArrowUpCircle, ClipboardCheck, X, RotateCcw
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from '../lib/toast';
import { showConfirm } from '../lib/confirm';
import { CsvImportDialog } from './crm/CsvImportDialog';
import { CrmFieldsManager } from './crm/CrmFieldsManager';
import { CrmCampaign } from './crm/CrmCampaign';

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

interface OutreachSuggestion {
  client_id: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  suggested_action: 'email' | 'call';
  days_since_contact: number;
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

  // Personal custom fields (non-org mode)
  const [userCustomFields, setUserCustomFields] = useState<CustomField[]>([]);
  const [userCustomValues, setUserCustomValues] = useState<Record<string, string>>({});

  // Org permission
  const [allowMemberAdd, setAllowMemberAdd] = useState(true);

  // SES sender emails for compose
  const [sesEmails, setSesEmails] = useState<string[]>([]);
  const [composeFromEmail, setComposeFromEmail] = useState('');

  // Campaigns
  const [showCampaigns, setShowCampaigns] = useState(false);

  // Promote personal contact to org
  const [showPromoteDialog, setShowPromoteDialog] = useState(false);
  const [promoteClientId, setPromoteClientId] = useState<string | null>(null);
  const [promoteTargetOrg, setPromoteTargetOrg] = useState<string>('');
  const [promotePreview, setPromotePreview] = useState<any>(null);
  const [promoteSelectedFields, setPromoteSelectedFields] = useState<string[]>([]);
  const [promoteDuplicate, setPromoteDuplicate] = useState<any>(null);
  const [promoteLoading, setPromoteLoading] = useState(false);

  // Org campaign approval queue
  const [showApprovalQueue, setShowApprovalQueue] = useState(false);
  const [approvalQueue, setApprovalQueue] = useState<any[]>([]);
  const [approvalLoading, setApprovalLoading] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState<Record<string, string>>({});

  // View state
  const [viewMode, setViewMode] = useState<'card' | 'table'>(() =>
    (localStorage.getItem('crm_view_mode') as 'card' | 'table') || 'card'
  );
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('crm_visible_columns');
      return saved ? new Set(JSON.parse(saved)) : new Set(['name', 'status', 'type', 'email', 'phone', 'location', 'budget', 'grade', 'last_activity', 'assigned']);
    } catch { return new Set(['name', 'status', 'type', 'email', 'phone', 'location', 'budget', 'grade', 'last_activity', 'assigned']); }
  });
  const [showColumnPicker, setShowColumnPicker] = useState(false);
  const [sortColumn, setSortColumn] = useState<string>('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

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

  // Fields manager drawer
  const [showFieldsDrawer, setShowFieldsDrawer] = useState(false);

  // Smart outreach
  const [showOutreach, setShowOutreach] = useState(false);
  const [outreachSuggestions, setOutreachSuggestions] = useState<OutreachSuggestion[]>([]);
  const [outreachLoading, setOutreachLoading] = useState(false);
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set());

  // Compose email
  const [composeClient, setComposeClient] = useState<Client | null>(null);
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [composeSending, setComposeSending] = useState(false);
  const [composeDrafting, setComposeDrafting] = useState(false);
  const [composeReason, setComposeReason] = useState('');

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
      await loadUserCustomFields(user.id);
      await loadSesEmails(user.id);
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
      if (!selectedClient.org_id && currentUserId) fetchUserCustomValues(selectedClient.id, currentUserId);
    }
  }, [selectedClient]);

  // Persist view preferences
  useEffect(() => {
    localStorage.setItem('crm_view_mode', viewMode);
  }, [viewMode]);

  useEffect(() => {
    localStorage.setItem('crm_visible_columns', JSON.stringify([...visibleColumns]));
  }, [visibleColumns]);

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
    // Fetch org permission
    const { data: orgData } = await supabase
      .from('organizations')
      .select('allow_member_add_clients')
      .eq('id', orgId)
      .maybeSingle();
    setAllowMemberAdd(orgData?.allow_member_add_clients ?? true);
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

  const loadUserCustomFields = async (userId: string) => {
    const { data } = await supabase
      .from('user_custom_fields')
      .select('*')
      .eq('user_id', userId)
      .order('sort_order', { ascending: true });
    setUserCustomFields((data as CustomField[]) || []);
  };

  const loadSesEmails = async (userId: string) => {
    const { data } = await supabase
      .from('amazon_ses_emails')
      .select('email')
      .eq('user_id', userId)
      .eq('verified', true);
    const emails = (data || []).map((r: any) => r.email);
    setSesEmails(emails);
    if (emails.length > 0 && !composeFromEmail) setComposeFromEmail(emails[0]);
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

  const fetchUserCustomValues = async (clientId: string, userId: string) => {
    const { data } = await supabase
      .from('user_custom_values')
      .select('field_key, value')
      .eq('client_id', clientId)
      .eq('user_id', userId);
    const map: Record<string, string> = {};
    data?.forEach(v => { map[v.field_key] = v.value || ''; });
    setUserCustomValues(map);
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

  // ─── Smart Outreach ───────────────────────────────────────────────────────
  const handleLoadOutreach = async () => {
    setOutreachLoading(true);
    setOutreachSuggestions([]);
    try {
      const clientData = clients
        .filter(c => !dismissedSuggestions.has(c.id))
        .slice(0, 50)
        .map(c => ({
          id: c.id,
          name: `${c.first_name} ${c.last_name}`,
          status: c.status,
          email: c.email || null,
          client_type: c.client_type,
          days_since_contact: lastActivity[c.id] ? daysSince(lastActivity[c.id]) : 999,
          grade_score: clientGrades[c.id]?.overall_score || null,
          grade_letter: clientGrades[c.id]?.grade_letter || null,
          notes: c.notes || null,
        }));

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/crm-outreach-suggestions`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ clients: clientData }),
      });
      if (!res.ok) throw new Error('Outreach failed');
      const json = await res.json();
      setOutreachSuggestions((json.suggestions || []).filter((s: OutreachSuggestion) => !dismissedSuggestions.has(s.client_id)));
    } catch (err: any) {
      toast.error('Failed to load outreach suggestions.');
    } finally {
      setOutreachLoading(false);
    }
  };

  const handleDismissSuggestion = (clientId: string) => {
    setDismissedSuggestions(prev => new Set([...prev, clientId]));
    setOutreachSuggestions(prev => prev.filter(s => s.client_id !== clientId));
  };

  // ─── Compose email ────────────────────────────────────────────────────────
  const openCompose = (client: Client, reason?: string) => {
    setComposeClient(client);
    setComposeSubject('');
    setComposeBody('');
    setComposeReason(reason || '');
  };

  const handleAiDraft = async () => {
    if (!composeClient) return;
    setComposeDrafting(true);
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/crm-draft-message`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client: composeClient,
          reason: composeReason,
          grade: clientGrades[composeClient.id] || null,
        }),
      });
      if (!res.ok) throw new Error('Draft failed');
      const json = await res.json();
      if (json.subject) setComposeSubject(json.subject);
      if (json.body) setComposeBody(json.body);
    } catch {
      toast.error('Failed to generate draft. Please write it manually.');
    } finally {
      setComposeDrafting(false);
    }
  };

  const handleSendEmail = async () => {
    if (!composeClient || !composeSubject || !composeBody) return;
    if (!composeClient.email) { toast.error('This client has no email address.'); return; }
    if (!composeFromEmail) { toast.error('No sending address selected. Verify a sender in Settings > Email.'); return; }

    setComposeSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Persist default sender for next time
      await supabase.from('user_settings')
        .update({ default_ses_email: composeFromEmail, updated_at: new Date().toISOString() })
        .eq('user_id', user.id);

      const { error: outboxErr } = await supabase.from('email_outbox').insert({
        user_id: user.id,
        from_email: composeFromEmail,
        to_email: composeClient.email,
        subject: composeSubject,
        body_html: `<p>${composeBody.replace(/\n/g, '<br/>')}</p>`,
        body_text: composeBody,
        status: 'pending',
      });
      if (outboxErr) throw outboxErr;

      const interPayload: any = {
        client_id: composeClient.id,
        user_id: user.id,
        interaction_type: 'email',
        subject: composeSubject,
        notes: composeBody,
        interaction_date: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      if (composeClient.org_id) interPayload.org_id = composeClient.org_id;
      await supabase.from('client_interactions').insert(interPayload);
      await logActivity(composeClient.id, 'email_sent', { subject: composeSubject });

      toast.success('Email queued successfully.');
      setComposeClient(null);
      await fetchLastActivities([composeClient.id]);
    } catch (err: any) {
      toast.error(`Failed to send: ${err.message}`);
    } finally {
      setComposeSending(false);
    }
  };

  // ─── Promote personal contact to org ──────────────────────────────────────
  const handlePromotePreview = async (clientId: string, targetOrgId: string) => {
    setPromoteLoading(true);
    setPromoteDuplicate(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/promote-client-to-org`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ client_id: clientId, target_org_id: targetOrgId, phase: 'preview' }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Preview failed');
      if (json.duplicate) {
        setPromoteDuplicate(json);
      } else {
        setPromotePreview(json);
        setPromoteSelectedFields((json.personal_fields || []).map((f: any) => f.field_key));
      }
    } catch (err: any) {
      toast.error(`Promote preview failed: ${err.message}`);
    } finally {
      setPromoteLoading(false);
    }
  };

  const handlePromoteCommit = async () => {
    if (!promoteClientId || !promoteTargetOrg) return;
    setPromoteLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/promote-client-to-org`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: promoteClientId,
          target_org_id: promoteTargetOrg,
          phase: 'commit',
          selected_fields: promoteSelectedFields,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Commit failed');
      toast.success('Contact promoted to organization.');
      setShowPromoteDialog(false);
      setPromoteClientId(null);
      setPromotePreview(null);
      setPromoteDuplicate(null);
      setPromoteSelectedFields([]);
      await fetchClients();
    } catch (err: any) {
      toast.error(`Promote failed: ${err.message}`);
    } finally {
      setPromoteLoading(false);
    }
  };

  const openPromoteDialog = (clientId: string) => {
    setPromoteClientId(clientId);
    setPromotePreview(null);
    setPromoteDuplicate(null);
    setPromoteSelectedFields([]);
    setPromoteTargetOrg(userOrgs[0]?.id || '');
    setShowPromoteDialog(true);
  };

  // ─── Org campaign approval queue ──────────────────────────────────────────
  const fetchApprovalQueue = async () => {
    if (!selectedOrgId) return;
    setApprovalLoading(true);
    try {
      const { data, error } = await supabase
        .from('crm_campaign_approvals')
        .select(`
          id, campaign_id, org_id, requested_by, status, requested_at, reviewed_by, reviewed_at, queue_position, manager_notes,
          campaign:crm_campaigns(id, name, subject, body_html, from_email, status, total_count, sent_count, scope, user_id)
        `)
        .eq('org_id', selectedOrgId)
        .order('queue_position', { ascending: true });
      if (error) throw error;
      setApprovalQueue(data || []);
    } catch (err: any) {
      toast.error(`Failed to load approval queue: ${err.message}`);
    } finally {
      setApprovalLoading(false);
    }
  };

  const updateApproval = async (approvalId: string, status: string, notes?: string) => {
    setApprovalLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const updates: any = {
        status,
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
      };
      if (notes !== undefined) updates.manager_notes = notes;
      const { error } = await supabase
        .from('crm_campaign_approvals')
        .update(updates)
        .eq('id', approvalId);
      if (error) throw error;
      toast.success(`Campaign ${status === 'approved' ? 'approved' : status === 'rejected' ? 'rejected' : 'returned for review'}.`);
      await fetchApprovalQueue();
    } catch (err: any) {
      toast.error(`Update failed: ${err.message}`);
    } finally {
      setApprovalLoading(false);
    }
  };

  const reorderApproval = async (approvalId: string, direction: 'up' | 'down') => {
    const sorted = [...approvalQueue].sort((a, b) => a.queue_position - b.queue_position);
    const idx = sorted.findIndex(a => a.id === approvalId);
    if (idx < 0) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    setApprovalLoading(true);
    try {
      const a = sorted[idx];
      const b = sorted[swapIdx];
      await supabase.from('crm_campaign_approvals').update({ queue_position: b.queue_position }).eq('id', a.id);
      await supabase.from('crm_campaign_approvals').update({ queue_position: a.queue_position }).eq('id', b.id);
      await fetchApprovalQueue();
    } catch (err: any) {
      toast.error(`Reorder failed: ${err.message}`);
    } finally {
      setApprovalLoading(false);
    }
  };

  const sendApprovalBack = async (approvalId: string) => {
    const notes = approvalNotes[approvalId] || '';
    await updateApproval(approvalId, 'returned_for_review', notes);
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

  // ─── Filtering + sorting ──────────────────────────────────────────────────
  const getFilteredClients = () => {
    let list = clients.filter(c => {
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

    if (sortColumn) {
      list = [...list].sort((a, b) => {
        let av: any, bv: any;
        if (sortColumn === 'name') { av = `${a.first_name} ${a.last_name}`; bv = `${b.first_name} ${b.last_name}`; }
        else if (sortColumn === 'status') { av = a.status; bv = b.status; }
        else if (sortColumn === 'type') { av = a.client_type; bv = b.client_type; }
        else if (sortColumn === 'email') { av = a.email || ''; bv = b.email || ''; }
        else if (sortColumn === 'budget') { av = a.budget_max || 0; bv = b.budget_max || 0; }
        else if (sortColumn === 'grade') { av = clientGrades[a.id]?.overall_score || 0; bv = clientGrades[b.id]?.overall_score || 0; }
        else if (sortColumn === 'last_activity') {
          av = lastActivity[a.id] ? new Date(lastActivity[a.id]).getTime() : 0;
          bv = lastActivity[b.id] ? new Date(lastActivity[b.id]).getTime() : 0;
        }
        else { av = ''; bv = ''; }
        if (av < bv) return sortDir === 'asc' ? -1 : 1;
        if (av > bv) return sortDir === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return list;
  };

  const handleSort = (col: string) => {
    if (sortColumn === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortColumn(col); setSortDir('asc'); }
  };

  const toggleColumn = (col: string) => {
    setVisibleColumns(prev => {
      const next = new Set(prev);
      if (next.has(col)) { if (next.size > 2) next.delete(col); }
      else next.add(col);
      return next;
    });
  };

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

  const tableColumns = [
    { key: 'name', label: 'Name' },
    { key: 'status', label: 'Status' },
    { key: 'type', label: 'Type' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'location', label: 'Location' },
    { key: 'budget', label: 'Budget' },
    { key: 'grade', label: 'Grade' },
    { key: 'last_activity', label: 'Last Activity' },
    ...(crmMode === 'org' ? [{ key: 'assigned', label: 'Assigned' }] : []),
    ...customFields.map(f => ({ key: `cf_${f.field_key}`, label: f.field_label })),
  ];

  const sortIcon = (col: string) => {
    if (sortColumn !== col) return null;
    return sortDir === 'asc' ? <ChevronUp className="w-3 h-3 inline ml-0.5" /> : <ChevronDown className="w-3 h-3 inline ml-0.5" />;
  };

  const priorityColor = (p: string) =>
    p === 'high' ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20' :
    p === 'medium' ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20' :
    'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20';

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

                {/* View toggle */}
                <div className="flex items-center rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
                  <button
                    onClick={() => setViewMode('card')}
                    title="Card view"
                    className={`p-2 transition-colors ${viewMode === 'card' ? 'bg-indigo-600 text-white' : 'app-card text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('table')}
                    title="Table view"
                    className={`p-2 transition-colors ${viewMode === 'table' ? 'bg-indigo-600 text-white' : 'app-card text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>

                {/* Manage Fields (org managers) */}
                {crmMode === 'org' && isManager && (
                  <button
                    onClick={() => setShowFieldsDrawer(true)}
                    title="Manage custom fields"
                    className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 app-card hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <Settings2 className="w-4 h-4 mr-1.5" />
                    Fields
                  </button>
                )}

                {/* Smart Outreach */}
                {crmMode === 'org' && (
                  <button
                    onClick={() => { setShowOutreach(true); if (outreachSuggestions.length === 0) handleLoadOutreach(); }}
                    className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 app-card hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <Zap className="w-4 h-4 mr-1.5 text-amber-500" />
                    Outreach
                  </button>
                )}

                {/* Campaigns (personal: always; org: managers) */}
                {(crmMode === 'personal' || (crmMode === 'org' && isManager)) && (
                  <button
                    onClick={() => setShowCampaigns(true)}
                    className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 app-card hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <Megaphone className="w-4 h-4 mr-1.5 text-blue-500" />
                    Campaigns
                  </button>
                )}

                {/* Approval Queue (org + managers only) */}
                {crmMode === 'org' && isManager && (
                  <button
                    onClick={() => { setShowApprovalQueue(true); fetchApprovalQueue(); }}
                    className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 app-card hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <ClipboardCheck className="w-4 h-4 mr-1.5 text-amber-500" />
                    Approvals
                    {approvalQueue.filter(a => a.status === 'pending').length > 0 && (
                      <span className="ml-1.5 px-1.5 py-0.5 text-xs font-semibold rounded-full bg-amber-500 text-white">
                        {approvalQueue.filter(a => a.status === 'pending').length}
                      </span>
                    )}
                  </button>
                )}

                {/* Import CSV (org managers only) */}
                {crmMode === 'org' && isManager && (
                  <button
                    onClick={() => setShowCsvImport(true)}
                    className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 app-card hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <Upload className="w-4 h-4 mr-1.5" />
                    Import
                  </button>
                )}

                {(crmMode === 'personal' || allowMemberAdd || isManager) && (
                <button
                  onClick={() => { setClientForm(prev => ({ ...prev, assigned_to: currentUserId || '' })); setShowClientForm(true); }}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Client
                </button>
                )}
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
              {viewMode === 'table' && (
                <div className="relative">
                  <button
                    onClick={() => setShowColumnPicker(p => !p)}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg app-card text-gray-900 dark:text-white text-sm flex items-center gap-1.5"
                  >
                    Columns <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                  {showColumnPicker && (
                    <div className="absolute right-0 top-full mt-1 w-48 app-card rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20 p-2 space-y-1">
                      {tableColumns.map(col => (
                        <label key={col.key} className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer">
                          <input type="checkbox" checked={visibleColumns.has(col.key)} onChange={() => toggleColumn(col.key)}
                            className="w-3.5 h-3.5 text-indigo-600 rounded" />
                          <span className="text-sm text-gray-700 dark:text-gray-300">{col.label}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Client list / table */}
            {filteredClients.length === 0 ? (
              <div className="app-card rounded-xl shadow-sm text-center py-12">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  {clients.length === 0 ? 'No clients yet' : 'No clients match'}
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  {clients.length === 0 ? 'Add your first client to get started.' : 'Try adjusting your search or filters.'}
                </p>
              </div>
            ) : viewMode === 'card' ? (
              <div className="app-card rounded-xl shadow-sm overflow-hidden">
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
                            {client.email && (
                              <button onClick={e => { e.stopPropagation(); openCompose(client); }}
                                title="Send email"
                                className="p-1.5 text-gray-400 hover:text-indigo-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600">
                                <Send className="w-4 h-4" />
                              </button>
                            )}
                            <button onClick={e => { e.stopPropagation(); handleEditClient(client); }}
                              className="p-1.5 text-gray-400 hover:text-indigo-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600">
                              <Edit className="w-4 h-4" />
                            </button>
                            <button onClick={e => { e.stopPropagation(); handleDeleteClient(client.id); }}
                              className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600">
                              <Trash2 className="w-4 h-4" />
                            </button>
                            {crmMode === 'personal' && userOrgs.length > 0 && (
                              <button onClick={e => { e.stopPropagation(); openPromoteDialog(client.id); }} title="Promote to organization"
                                className="p-1.5 text-gray-400 hover:text-blue-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600">
                                <ArrowUpCircle className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Table view */
              <div className="app-card rounded-xl shadow-sm overflow-hidden" onClick={() => setShowColumnPicker(false)}>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                        {tableColumns.filter(c => visibleColumns.has(c.key)).map(col => (
                          <th
                            key={col.key}
                            onClick={() => !col.key.startsWith('cf_') && handleSort(col.key)}
                            className={`px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap ${!col.key.startsWith('cf_') ? 'cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 select-none' : ''}`}
                          >
                            {col.label}{sortIcon(col.key)}
                          </th>
                        ))}
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {filteredClients.map(client => {
                        const typeInfo = getTypeInfo(client.client_type);
                        const statusInfo = getStatusInfo(client.status);
                        const grade = clientGrades[client.id];

                        return (
                          <tr
                            key={client.id}
                            onClick={() => setSelectedClient(client)}
                            className="hover:bg-gray-50 dark:hover:bg-gray-700/40 cursor-pointer transition-colors"
                          >
                            {visibleColumns.has('name') && (
                              <td className="px-4 py-3 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                                {client.first_name} {client.last_name}
                              </td>
                            )}
                            {visibleColumns.has('status') && (
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusInfo.color}`}>{statusInfo.label}</span>
                              </td>
                            )}
                            {visibleColumns.has('type') && (
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${typeInfo.color}`}>{typeInfo.label}</span>
                              </td>
                            )}
                            {visibleColumns.has('email') && (
                              <td className="px-4 py-3 text-gray-600 dark:text-gray-400 max-w-[180px] truncate">{client.email || '—'}</td>
                            )}
                            {visibleColumns.has('phone') && (
                              <td className="px-4 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">{client.phone || '—'}</td>
                            )}
                            {visibleColumns.has('location') && (
                              <td className="px-4 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                                {[client.city, client.state].filter(Boolean).join(', ') || '—'}
                              </td>
                            )}
                            {visibleColumns.has('budget') && (
                              <td className="px-4 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                                {client.budget_min || client.budget_max
                                  ? `${client.budget_min ? formatCurrency(client.budget_min) : '?'} – ${client.budget_max ? formatCurrency(client.budget_max) : '?'}`
                                  : '—'}
                              </td>
                            )}
                            {visibleColumns.has('grade') && (
                              <td className="px-4 py-3">
                                {grade ? (
                                  <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${getGradeColor(grade.grade_letter)}`}>
                                    {grade.grade_letter} ({grade.overall_score})
                                  </span>
                                ) : '—'}
                              </td>
                            )}
                            {visibleColumns.has('last_activity') && (
                              <td className="px-4 py-3">
                                <LastActivityBadge date={lastActivity[client.id] || null} />
                              </td>
                            )}
                            {crmMode === 'org' && visibleColumns.has('assigned') && (
                              <td className="px-4 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                                {client.assigned_to ? getMemberDisplay(client.assigned_to).label : '—'}
                              </td>
                            )}
                            {customFields.filter(f => visibleColumns.has(`cf_${f.field_key}`)).map(f => (
                              <td key={f.field_key} className="px-4 py-3 text-gray-600 dark:text-gray-400 max-w-[160px] truncate">
                                {f.field_type === 'boolean'
                                  ? (customValues[`${client.id}_${f.field_key}`] === 'true' ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : '—')
                                  : (customValues[`${client.id}_${f.field_key}`] || '—')}
                              </td>
                            ))}
                            <td className="px-4 py-3 text-right whitespace-nowrap" onClick={e => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1">
                                {client.email && (
                                  <button onClick={() => openCompose(client)} title="Send email"
                                    className="p-1.5 text-gray-400 hover:text-indigo-500 rounded hover:bg-gray-100 dark:hover:bg-gray-600">
                                    <Send className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <button onClick={() => handleEditClient(client)}
                                  className="p-1.5 text-gray-400 hover:text-indigo-500 rounded hover:bg-gray-100 dark:hover:bg-gray-600">
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => handleDeleteClient(client.id)}
                                  className="p-1.5 text-gray-400 hover:text-red-500 rounded hover:bg-gray-100 dark:hover:bg-gray-600">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
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
                {selectedClient.email && (
                  <button onClick={() => openCompose(selectedClient)}
                    className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 app-card hover:bg-gray-50 dark:hover:bg-gray-700">
                    <Send className="w-4 h-4 mr-1.5" />
                    Email
                  </button>
                )}
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

        {/* ─── Manage Fields Drawer ────────────────────────────────── */}
        {showFieldsDrawer && selectedOrgId && (
          <div className="fixed inset-0 z-50 flex">
            <div className="flex-1" onClick={() => setShowFieldsDrawer(false)} />
            <div className="w-full max-w-sm app-card shadow-2xl border-l border-gray-200 dark:border-gray-700 flex flex-col h-full overflow-y-auto">
              <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <Settings2 className="w-5 h-5 text-indigo-500" />
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">Manage CRM Fields</h3>
                </div>
                <button onClick={() => setShowFieldsDrawer(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-5 flex-1">
                <CrmFieldsManager
                  orgId={selectedOrgId}
                  onChange={fields => setCustomFields(fields)}
                />
              </div>
            </div>
          </div>
        )}

        {/* ─── Smart Outreach Panel ────────────────────────────────── */}
        {showOutreach && (
          <div className="fixed inset-0 z-50 flex">
            <div className="flex-1 bg-black/40" onClick={() => setShowOutreach(false)} />
            <div className="w-full max-w-md app-card shadow-2xl border-l border-gray-200 dark:border-gray-700 flex flex-col h-full overflow-hidden">
              <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-500" />
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">Smart Outreach</h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleLoadOutreach}
                    disabled={outreachLoading}
                    className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline disabled:opacity-50"
                  >
                    {outreachLoading ? 'Analyzing…' : 'Refresh'}
                  </button>
                  <button onClick={() => setShowOutreach(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {outreachLoading ? (
                  <div className="flex items-center justify-center py-16 gap-3">
                    <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-gray-600 dark:text-gray-300 text-sm">Analyzing your contacts…</span>
                  </div>
                ) : outreachSuggestions.length === 0 ? (
                  <div className="text-center py-16">
                    <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto mb-3" />
                    <p className="text-gray-600 dark:text-gray-400 font-medium">All caught up!</p>
                    <p className="text-sm text-gray-400 mt-1">No contacts need immediate outreach.</p>
                  </div>
                ) : (
                  outreachSuggestions.map(s => {
                    const client = clients.find(c => c.id === s.client_id);
                    if (!client) return null;
                    return (
                      <div key={s.client_id} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:border-amber-300 dark:hover:border-amber-700 transition-colors">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-sm text-gray-900 dark:text-white">{client.first_name} {client.last_name}</span>
                              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${priorityColor(s.priority)}`}>
                                {s.priority}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{s.reason}</p>
                            <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {s.days_since_contact >= 999 ? 'Never contacted' : `${s.days_since_contact}d since last contact`}
                            </p>
                          </div>
                          <button
                            onClick={() => handleDismissSuggestion(s.client_id)}
                            className="text-gray-300 hover:text-gray-500 dark:hover:text-gray-400 flex-shrink-0 p-1"
                            title="Dismiss"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex gap-2 mt-3">
                          {client.email && (
                            <button
                              onClick={() => { openCompose(client, s.reason); setShowOutreach(false); }}
                              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700"
                            >
                              <Send className="w-3.5 h-3.5" />
                              Draft Email
                            </button>
                          )}
                          <button
                            onClick={() => { setSelectedClient(client); setShowOutreach(false); }}
                            className="flex-1 px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                          >
                            View Profile
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─── Compose Email Modal ─────────────────────────────────── */}
        {composeClient && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="app-card rounded-xl shadow-lg w-full max-w-lg flex flex-col max-h-[90vh]">
              <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                <div>
                  <div className="flex items-center gap-2">
                    <Send className="w-5 h-5 text-indigo-500" />
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">Send Email</h3>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">To: {composeClient.email}</p>
                </div>
                <button onClick={() => setComposeClient(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-5 flex-1 overflow-y-auto space-y-4">
                {composeReason && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                    <p className="text-xs text-amber-700 dark:text-amber-400"><span className="font-semibold">Outreach reason:</span> {composeReason}</p>
                  </div>
                )}
                {sesEmails.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">From</label>
                    <select
                      value={composeFromEmail}
                      onChange={e => setComposeFromEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg app-card-inner text-gray-900 dark:text-white text-sm"
                    >
                      {sesEmails.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subject</label>
                  <input
                    type="text"
                    value={composeSubject}
                    onChange={e => setComposeSubject(e.target.value)}
                    placeholder="Email subject"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg app-card-inner text-gray-900 dark:text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Message</label>
                  <textarea
                    value={composeBody}
                    onChange={e => setComposeBody(e.target.value)}
                    rows={8}
                    placeholder="Write your message here…"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg app-card-inner text-gray-900 dark:text-white text-sm resize-none"
                  />
                </div>
                <button
                  onClick={handleAiDraft}
                  disabled={composeDrafting}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg border border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 disabled:opacity-50"
                >
                  {composeDrafting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                      Drafting with AI…
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      AI Draft
                    </>
                  )}
                </button>
              </div>
              <div className="flex justify-end gap-2 p-5 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
                <button onClick={() => setComposeClient(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg">
                  Cancel
                </button>
                <button
                  onClick={handleSendEmail}
                  disabled={composeSending || !composeSubject || !composeBody}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {composeSending ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  {composeSending ? 'Sending…' : 'Send'}
                </button>
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
                    A contact with this email already exists: <strong>{dupWarning.first_name} {dupWarning.last_name}</strong>
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

        {/* ─── Campaigns ───────────────────────────────────────────── */}
        {showCampaigns && (crmMode === 'personal' || selectedOrgId) && (
          <CrmCampaign
            scope={crmMode}
            orgId={selectedOrgId}
            clients={clients}
            orgCustomFields={customFields}
            userCustomFields={userCustomFields}
            sesEmails={sesEmails}
            currentUserId={currentUserId || ''}
            isManager={isManager}
            onClose={() => setShowCampaigns(false)}
          />
        )}

        {/* ─── Org Campaign Approval Queue Dialog ──────────────────────────── */}
        {showApprovalQueue && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Campaign Approval Queue</h2>
                <button onClick={() => setShowApprovalQueue(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {approvalLoading ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : approvalQueue.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 italic py-8 text-center">
                  No campaigns awaiting approval.
                </p>
              ) : (
                <div className="space-y-3">
                  {[...approvalQueue].sort((a, b) => a.queue_position - b.queue_position).map((a, idx) => {
                    const c = a.campaign;
                    const isPending = a.status === 'pending';
                    const statusColor = a.status === 'approved' ? 'green' : a.status === 'rejected' ? 'red' : a.status === 'returned_for_review' ? 'amber' : 'blue';
                    return (
                      <div key={a.id} className={`p-4 rounded-xl border ${isPending ? 'border-amber-200 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-900/10' : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50'}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono text-gray-400">#{idx + 1}</span>
                              <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{c?.name || 'Untitled campaign'}</h3>
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 space-y-0.5">
                              <div>From: {c?.from_email || '—'}</div>
                              <div>Subject: {c?.subject || '—'}</div>
                              <div>Recipients: {c?.total_count || 0}</div>
                              <div>Requested: {new Date(a.requested_at).toLocaleString()}</div>
                            </div>
                            {a.status !== 'pending' && (
                              <div className="mt-2">
                                <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-${statusColor}-100 text-${statusColor}-800 dark:bg-${statusColor}-900 dark:text-${statusColor}-300`}>
                                  {a.status.replace(/_/g, ' ')}
                                </span>
                                {a.reviewed_at && (
                                  <span className="ml-2 text-xs text-gray-400">{new Date(a.reviewed_at).toLocaleString()}</span>
                                )}
                              </div>
                            )}
                            {a.manager_notes && (
                              <div className="mt-2 text-xs text-gray-600 dark:text-gray-400 italic">
                                Notes: {a.manager_notes}
                              </div>
                            )}
                          </div>

                          {isPending && (
                            <div className="flex flex-col gap-1">
                              <button disabled={idx === 0 || approvalLoading}
                                onClick={() => reorderApproval(a.id, 'up')} title="Move up"
                                className="p-1 text-gray-400 hover:text-blue-500 disabled:opacity-30">
                                <ChevronUp className="w-4 h-4" />
                              </button>
                              <button disabled={idx === approvalQueue.length - 1 || approvalLoading}
                                onClick={() => reorderApproval(a.id, 'down')} title="Move down"
                                className="p-1 text-gray-400 hover:text-blue-500 disabled:opacity-30">
                                <ChevronDown className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>

                        {isPending && (
                          <div className="mt-3 pt-3 border-t border-amber-200 dark:border-amber-700 space-y-2">
                            <textarea
                              placeholder="Notes for the requester (optional)..."
                              value={approvalNotes[a.id] || ''}
                              onChange={e => setApprovalNotes({ ...approvalNotes, [a.id]: e.target.value })}
                              rows={2}
                              className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                            <div className="flex flex-wrap gap-2">
                              <button disabled={approvalLoading}
                                onClick={() => updateApproval(a.id, 'approved')}
                                className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50">
                                <CheckCircle2 className="w-4 h-4 mr-1" /> Approve
                              </button>
                              <button disabled={approvalLoading}
                                onClick={() => updateApproval(a.id, 'rejected')}
                                className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50">
                                <X className="w-4 h-4 mr-1" /> Reject
                              </button>
                              <button disabled={approvalLoading}
                                onClick={() => sendApprovalBack(a.id)}
                                className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-lg bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50">
                                <RotateCcw className="w-4 h-4 mr-1" /> Return for review
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
        {showPromoteDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Promote to Organization</h2>

              {promoteDuplicate ? (
                <div className="space-y-4">
                  <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700">
                    <p className="text-sm text-amber-800 dark:text-amber-300">
                      A contact with this email already exists in the organization: <strong>{promoteDuplicate.existing_name}</strong>
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                      The contact was not moved. You can view the existing org contact or cancel.
                    </p>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button onClick={() => { setShowPromoteDialog(false); setPromoteDuplicate(null); }}
                      className="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                      Cancel
                    </button>
                    <button onClick={() => { setShowPromoteDialog(false); setPromoteDuplicate(null); }}
                      className="px-3 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700">
                      View Existing
                    </button>
                  </div>
                </div>
              ) : !promotePreview ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Target Organization</label>
                    <select value={promoteTargetOrg} onChange={e => setPromoteTargetOrg(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                      {userOrgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                    </select>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setShowPromoteDialog(false)}
                      className="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                      Cancel
                    </button>
                    <button disabled={!promoteTargetOrg || promoteLoading}
                      onClick={() => handlePromotePreview(promoteClientId!, promoteTargetOrg)}
                      className="px-3 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
                      {promoteLoading ? 'Checking...' : 'Continue'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Select which fields to carry over to <strong>{userOrgs.find(o => o.id === promoteTargetOrg)?.name}</strong>.
                    Matching org fields will be populated; missing org fields will be created automatically.
                  </p>
                  <div className="flex items-center gap-2 text-xs">
                    <button onClick={() => setPromoteSelectedFields(promotePreview.personal_fields.map((f: any) => f.field_key))}
                      className="text-blue-600 hover:underline">Select all</button>
                    <span className="text-gray-400">|</span>
                    <button onClick={() => setPromoteSelectedFields([])}
                      className="text-blue-600 hover:underline">Select none</button>
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {promotePreview.personal_fields.map((f: any) => {
                      const checked = promoteSelectedFields.includes(f.field_key);
                      const orgMatch = promotePreview.org_fields.find((of: any) => of.field_key === f.field_key);
                      return (
                        <label key={f.field_key} className="flex items-start gap-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                          <input type="checkbox" checked={checked}
                            onChange={e => {
                              if (e.target.checked) setPromoteSelectedFields([...promoteSelectedFields, f.field_key]);
                              else setPromoteSelectedFields(promoteSelectedFields.filter(k => k !== f.field_key));
                            }}
                            className="mt-1" />
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">{f.field_label}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              Value: {f.value || <span className="italic">empty</span>}
                              {orgMatch ? <span className="ml-2 text-green-600">→ matches org field</span> : <span className="ml-2 text-blue-600">→ new org field</span>}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                    {promotePreview.personal_fields.length === 0 && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 italic">No custom fields on this contact.</p>
                    )}
                  </div>
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setPromotePreview(null)}
                      className="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                      Back
                    </button>
                    <button disabled={promoteLoading}
                      onClick={handlePromoteCommit}
                      className="px-3 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
                      {promoteLoading ? 'Moving...' : 'Promote Contact'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
