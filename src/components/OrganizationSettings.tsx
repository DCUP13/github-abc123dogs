import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { showConfirm } from '../lib/confirm';
import { Building2, Globe, MapPin, Users, Briefcase, Save, X, Plus, Trash2, Server } from 'lucide-react';

interface Organization {
  id: string;
  name: string;
  description: string;
  logo_url: string;
  industry: string;
  company_size: string;
  website: string;
  location: string;
  owner_id: string;
}

interface OrgDomain {
  id: string;
  domain: string;
}

interface OrganizationSettingsProps {
  orgId: string;
  onClose: () => void;
}

const inputClass =
  'w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent';

const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2';

export default function OrganizationSettings({ orgId, onClose }: OrganizationSettingsProps) {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    name: '', description: '', logo_url: '', industry: '',
    company_size: '', website: '', location: ''
  });

  const [orgDomains, setOrgDomains] = useState<OrgDomain[]>([]);
  const [newOrgDomain, setNewOrgDomain] = useState('');
  const [domainError, setDomainError] = useState('');
  const [domainSuccess, setDomainSuccess] = useState('');
  const [domainSaving, setDomainSaving] = useState(false);

  useEffect(() => {
    loadOrganization();
    loadOrgDomains();
  }, []);

  const loadOrganization = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError('Not authenticated'); return; }

      const { data: memberData } = await supabase
        .from('organization_members').select('role')
        .eq('user_id', user.id).eq('organization_id', orgId).maybeSingle();

      if (!memberData || !['owner', 'manager'].includes(memberData.role)) {
        setError('Only owners and managers can edit organization settings');
        return;
      }

      const { data: orgData, error: orgError } = await supabase
        .from('organizations').select('*').eq('id', orgId).single();
      if (orgError) throw orgError;

      setOrganization(orgData);
      setFormData({
        name: orgData.name || '', description: orgData.description || '',
        logo_url: orgData.logo_url || '', industry: orgData.industry || '',
        company_size: orgData.company_size || '', website: orgData.website || '',
        location: orgData.location || ''
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadOrgDomains = async () => {
    const { data } = await supabase
      .from('organization_domains').select('id, domain')
      .eq('organization_id', orgId).order('domain', { ascending: true });
    setOrgDomains(data || []);
  };

  const handleAddOrgDomain = async () => {
    const domain = newOrgDomain.trim().toLowerCase();
    if (!domain) { setDomainError('Please enter a domain name'); return; }
    if (!/^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/.test(domain)) {
      setDomainError('Please enter a valid domain (e.g. example.com)');
      return;
    }
    try {
      setDomainSaving(true); setDomainError('');
      const { error } = await supabase.from('organization_domains')
        .insert({ organization_id: orgId, domain });
      if (error) {
        if (error.code === '23505') {
          setDomainError('This domain is already registered to another organization.');
          return;
        }
        throw error;
      }
      setNewOrgDomain('');
      setDomainSuccess('Domain added!');
      await loadOrgDomains();
      setTimeout(() => setDomainSuccess(''), 3000);
    } catch (err: any) {
      setDomainError(err.message);
    } finally {
      setDomainSaving(false);
    }
  };

  const handleRemoveOrgDomain = async (domainId: string, domainName: string) => {
    if (!await showConfirm({
      title: 'Remove Domain',
      message: `Remove "${domainName}" from this organization? It will also be unassigned from all members.`,
      variant: 'danger',
      confirmText: 'Remove',
    })) return;
    try {
      setDomainSaving(true); setDomainError('');
      const { data: members } = await supabase
        .from('organization_members').select('user_id').eq('organization_id', orgId);
      if (members && members.length > 0) {
        await supabase.from('amazon_ses_domains')
          .delete().eq('domain', domainName)
          .in('user_id', members.map(m => m.user_id));
      }
      const { error } = await supabase.from('organization_domains').delete().eq('id', domainId);
      if (error) throw error;
      setDomainSuccess('Domain removed!');
      await loadOrgDomains();
      setTimeout(() => setDomainSuccess(''), 3000);
    } catch (err: any) {
      setDomainError(err.message);
    } finally {
      setDomainSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization) return;
    try {
      setSaving(true); setError(''); setSuccess('');
      const { error: updateError } = await supabase.from('organizations').update({
        ...formData, updated_at: new Date().toISOString()
      }).eq('id', organization.id);
      if (updateError) throw updateError;
      setSuccess('Organization details updated successfully!');
      setTimeout(() => onClose(), 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const panelClass =
    'app-card w-full flex flex-col overflow-hidden sm:rounded-xl sm:shadow-2xl sm:max-w-2xl sm:max-h-[90vh]';

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className={panelClass + ' p-6 sm:p-8'}>
          <p className="text-center text-gray-700 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  if (error && !organization) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className={panelClass + ' p-6 sm:p-8'}>
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600">
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 overflow-y-auto">
      <div className="flex min-h-full items-stretch sm:items-center justify-center sm:p-4">
      <div className={panelClass}>

        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-8 pt-4 sm:pt-8 pb-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <h2 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" />
            Organization Settings
          </h2>
          <button onClick={onClose} className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-4 sm:py-6 space-y-6">

          {/* ── Org Details ── */}
          <div>
            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg text-sm">{error}</div>
            )}
            {success && (
              <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 rounded-lg text-sm">{success}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className={labelClass}>Organization Name *</label>
                <input type="text" name="name" value={formData.name} onChange={handleChange} required className={inputClass} placeholder="Enter organization name" />
              </div>
              <div>
                <label className={labelClass}>Description</label>
                <textarea name="description" value={formData.description} onChange={handleChange} rows={3} className={inputClass} placeholder="Tell us about your organization" />
              </div>
              <div>
                <label className={labelClass + ' flex items-center gap-2'}><Globe className="w-4 h-4" /> Logo URL</label>
                <input type="url" name="logo_url" value={formData.logo_url} onChange={handleChange} className={inputClass} placeholder="https://example.com/logo.png" />
                {formData.logo_url && (
                  <div className="mt-2">
                    <img src={formData.logo_url} alt="Logo preview" className="h-14 w-auto object-contain border border-gray-200 dark:border-gray-600 rounded-lg p-2 bg-white dark:bg-gray-700"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass + ' flex items-center gap-2'}><Briefcase className="w-4 h-4" /> Industry</label>
                  <select name="industry" value={formData.industry} onChange={handleChange} className={inputClass}>
                    <option value="">Select industry</option>
                    {['Technology','Healthcare','Finance','Education','Retail','Manufacturing','Consulting','Real Estate','Marketing','Other'].map(i => (
                      <option key={i} value={i}>{i}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass + ' flex items-center gap-2'}><Users className="w-4 h-4" /> Company Size</label>
                  <select name="company_size" value={formData.company_size} onChange={handleChange} className={inputClass}>
                    <option value="">Select size</option>
                    {['1-10','11-50','51-200','201-500','501-1000','1000+'].map(s => (
                      <option key={s} value={s}>{s} employees</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className={labelClass + ' flex items-center gap-2'}><Globe className="w-4 h-4" /> Website</label>
                <input type="url" name="website" value={formData.website} onChange={handleChange} className={inputClass} placeholder="https://example.com" />
              </div>
              <div>
                <label className={labelClass + ' flex items-center gap-2'}><MapPin className="w-4 h-4" /> Location</label>
                <input type="text" name="location" value={formData.location} onChange={handleChange} className={inputClass} placeholder="City, State/Country" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium">
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button type="button" onClick={onClose}
                  className="px-6 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium">
                  Cancel
                </button>
              </div>
            </form>
          </div>

          {/* ── Divider ── */}
          <div className="border-t border-gray-200 dark:border-gray-700" />

          {/* ── Organization Domains ── */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Server className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">Organization Domains</h3>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-4">
              Domains registered here can be assigned to any team member. Each domain can only belong to one organization.
            </p>

            {domainError && (
              <div className="mb-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg text-sm">{domainError}</div>
            )}
            {domainSuccess && (
              <div className="mb-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 rounded-lg text-sm">{domainSuccess}</div>
            )}

            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newOrgDomain}
                onChange={(e) => setNewOrgDomain(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddOrgDomain(); }}}
                className={inputClass}
                placeholder="example.com"
                disabled={domainSaving}
              />
              <button
                onClick={handleAddOrgDomain}
                disabled={domainSaving || !newOrgDomain.trim()}
                className="flex-shrink-0 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add</span>
              </button>
            </div>

            {orgDomains.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 dark:bg-gray-900/40 rounded-lg">
                <Server className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">No domains registered yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {orgDomains.map((d) => (
                  <div key={d.id} className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-900/40 rounded-lg gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <Globe className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="text-sm font-medium text-gray-800 dark:text-white truncate">{d.domain}</span>
                    </div>
                    <button
                      onClick={() => handleRemoveOrgDomain(d.id, d.domain)}
                      disabled={domainSaving}
                      className="flex-shrink-0 p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                      title="Remove domain"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="pb-2 sm:pb-0" />
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
