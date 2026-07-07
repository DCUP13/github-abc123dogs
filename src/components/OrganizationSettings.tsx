import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Building2, Globe, MapPin, Users, Briefcase, Save, X, Plus, Trash2 } from 'lucide-react';

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

interface OrganizationSettingsProps {
  orgId: string;
  onClose: () => void;
}

export default function OrganizationSettings({ orgId, onClose }: OrganizationSettingsProps) {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [userRole, setUserRole] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    logo_url: '',
    industry: '',
    company_size: '',
    website: '',
    location: ''
  });

  const [orgDomains, setOrgDomains] = useState<Array<{ id: string; domain: string }>>([]);
  const [newOrgDomain, setNewOrgDomain] = useState('');
  const [domainError, setDomainError] = useState('');
  const [domainSuccess, setDomainSuccess] = useState('');
  const [domainSaving, setDomainSaving] = useState(false);

  useEffect(() => {
    loadOrganization();
  }, []);

  const loadOrganization = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setError('Not authenticated');
        return;
      }

      const [orgRes, memberRes] = await Promise.all([
        supabase.from('organizations').select('*').eq('id', orgId).single(),
        supabase.from('organization_members').select('role').eq('organization_id', orgId).eq('user_id', user.id).maybeSingle(),
      ]);

      if (orgRes.error) throw orgRes.error;

      const role = memberRes.data?.role ?? null;
      setUserRole(role);

      if (!role || !['owner', 'manager'].includes(role)) {
        setError('Only owners and managers can edit organization settings');
        return;
      }

      const orgData = orgRes.data;
      setOrganization(orgData);
      setFormData({
        name: orgData.name || '',
        description: orgData.description || '',
        logo_url: orgData.logo_url || '',
        industry: orgData.industry || '',
        company_size: orgData.company_size || '',
        website: orgData.website || '',
        location: orgData.location || ''
      });

      loadOrgDomains(orgId);
    } catch (err: any) {
      console.error('Error loading organization:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadOrgDomains = async (organizationId: string) => {
    const { data } = await supabase
      .from('organization_domains')
      .select('id, domain')
      .eq('organization_id', organizationId)
      .order('domain', { ascending: true });
    setOrgDomains(data || []);
  };

  const handleAddOrgDomain = async () => {
    const domain = newOrgDomain.trim().toLowerCase();
    if (!domain) { setDomainError('Please enter a domain name'); return; }
    if (!/^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/.test(domain)) {
      setDomainError('Please enter a valid domain (e.g. example.com)');
      return;
    }
    if (!organization) return;
    try {
      setDomainSaving(true); setDomainError('');
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase.from('organization_domains')
        .insert({ organization_id: organization.id, domain });
      if (error) {
        if (error.code === '23505') {
          setDomainError('This domain is already registered to an organization.');
          return;
        }
        throw error;
      }

      // Mirror into the current user's amazon_ses_domains so it shows in SES settings
      if (user) {
        await supabase.from('amazon_ses_domains').upsert(
          { user_id: user.id, domain, autoresponder_enabled: false },
          { onConflict: 'user_id,domain', ignoreDuplicates: true }
        );
      }

      setNewOrgDomain('');
      setDomainSuccess('Domain added!');
      loadOrgDomains(organization.id);
      setTimeout(() => setDomainSuccess(''), 3000);
    } catch (err: any) {
      setDomainError(err.message);
    } finally {
      setDomainSaving(false);
    }
  };

  const handleRemoveOrgDomain = async (domainId: string, domainName: string) => {
    if (!confirm(`Remove "${domainName}" from this organization? It will also be unassigned from all members.`)) return;
    if (!organization) return;
    try {
      setDomainSaving(true); setDomainError('');
      const { data: members } = await supabase
        .from('organization_members').select('user_id').eq('organization_id', organization.id);
      if (members && members.length > 0) {
        await supabase.from('amazon_ses_domains')
          .delete().eq('domain', domainName)
          .in('user_id', members.map(m => m.user_id));
      }
      const { error } = await supabase.from('organization_domains').delete().eq('id', domainId);
      if (error) throw error;
      setDomainSuccess('Domain removed!');
      loadOrgDomains(organization.id);
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
      setSaving(true);
      setError('');
      setSuccess('');

      const { error: updateError } = await supabase
        .from('organizations')
        .update({
          name: formData.name,
          description: formData.description,
          logo_url: formData.logo_url,
          industry: formData.industry,
          company_size: formData.company_size,
          website: formData.website,
          location: formData.location,
          updated_at: new Date().toISOString()
        })
        .eq('id', organization.id);

      if (updateError) throw updateError;

      setSuccess('Organization details updated successfully!');
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('Error updating organization:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
        <div className="app-card rounded-xl p-8 max-w-2xl w-full mx-4 shadow-xl">
          <div className="text-center text-gray-600 dark:text-gray-300">Loading...</div>
        </div>
      </div>
    );
  }

  if (error && !organization) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
        <div className="app-card rounded-xl p-8 max-w-2xl w-full mx-4 shadow-xl">
          <div className="text-red-600 dark:text-red-400 mb-4">{error}</div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-start justify-center z-50 overflow-y-auto py-4 px-4">
      <div className="app-card rounded-xl shadow-xl w-full max-w-2xl my-auto">
        {/* Header */}
        <div className="flex justify-between items-center px-8 pt-8 pb-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Organization Settings
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-8 py-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg text-sm">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Organization Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter organization name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Tell us about your organization"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
                <Globe className="w-4 h-4" />
                Logo URL
              </label>
              <input
                type="url"
                name="logo_url"
                value={formData.logo_url}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="https://example.com/logo.png"
              />
              {formData.logo_url && (
                <div className="mt-2">
                  <img
                    src={formData.logo_url}
                    alt="Organization logo preview"
                    className="h-12 w-auto object-contain"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
                  <Briefcase className="w-4 h-4" />
                  Industry
                </label>
                <select
                  name="industry"
                  value={formData.industry}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select an industry</option>
                  <option value="Technology">Technology</option>
                  <option value="Healthcare">Healthcare</option>
                  <option value="Finance">Finance</option>
                  <option value="Education">Education</option>
                  <option value="Retail">Retail</option>
                  <option value="Manufacturing">Manufacturing</option>
                  <option value="Consulting">Consulting</option>
                  <option value="Real Estate">Real Estate</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
                  <Users className="w-4 h-4" />
                  Company Size
                </label>
                <select
                  name="company_size"
                  value={formData.company_size}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select company size</option>
                  <option value="1-10">1-10 employees</option>
                  <option value="11-50">11-50 employees</option>
                  <option value="51-200">51-200 employees</option>
                  <option value="201-500">201-500 employees</option>
                  <option value="501-1000">501-1000 employees</option>
                  <option value="1000+">1000+ employees</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
                  <Globe className="w-4 h-4" />
                  Website
                </label>
                <input
                  type="url"
                  name="website"
                  value={formData.website}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  Location
                </label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="City, State/Country"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-medium transition-colors"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>

          {/* Organization Domains */}
          <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-1">
              <Globe className="w-4 h-4" />
              Organization Domains
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Domains registered here (and via your Amazon SES settings) can be assigned to team members. Each domain can only belong to one organization.
            </p>

            {domainError && (
              <div className="mb-3 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg text-sm">{domainError}</div>
            )}
            {domainSuccess && (
              <div className="mb-3 p-3 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg text-sm">{domainSuccess}</div>
            )}

            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newOrgDomain}
                onChange={(e) => { setNewOrgDomain(e.target.value); setDomainError(''); }}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddOrgDomain(); } }}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="example.com"
                disabled={domainSaving}
              />
              <button
                onClick={handleAddOrgDomain}
                disabled={domainSaving || !newOrgDomain.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-1.5 text-sm font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>

            {orgDomains.length === 0 ? (
              <p className="text-center text-gray-400 dark:text-gray-500 py-6 text-sm">
                No domains registered yet. Add domains here or via the Amazon SES settings tab.
              </p>
            ) : (
              <div className="space-y-2">
                {orgDomains.map((d) => (
                  <div key={d.id} className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800/60 rounded-lg border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{d.domain}</span>
                    </div>
                    <button
                      onClick={() => handleRemoveOrgDomain(d.id, d.domain)}
                      disabled={domainSaving}
                      className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded transition-colors disabled:opacity-50"
                      title="Remove domain"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
