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
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    );
  }

  if (error && !organization) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4">
          <div className="text-red-600 mb-4">{error}</div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4 my-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Building2 className="w-6 h-6" />
            Organization Settings
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-100 text-green-700 rounded">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Organization Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter organization name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Tell us about your organization"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Logo URL
            </label>
            <input
              type="url"
              name="logo_url"
              value={formData.logo_url}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://example.com/logo.png"
            />
            {formData.logo_url && (
              <div className="mt-2">
                <img
                  src={formData.logo_url}
                  alt="Organization logo preview"
                  className="h-16 w-auto object-contain"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                Industry
              </label>
              <select
                name="industry"
                value={formData.industry}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Company Size
              </label>
              <select
                name="company_size"
                value={formData.company_size}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Website
            </label>
            <input
              type="url"
              name="website"
              value={formData.website}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Location
            </label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="City, State/Country"
            />
          </div>

          <div className="flex justify-end gap-4 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>

        {/* Organization Domains */}
        <div className="mt-8 pt-8 border-t border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-1">
            <Globe className="w-5 h-5" />
            Organization Domains
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            Domains registered here (and via your Amazon SES settings) can be assigned to team members. Each domain can only belong to one organization.
          </p>

          {domainError && (
            <div className="mb-3 p-3 bg-red-100 text-red-700 rounded text-sm">{domainError}</div>
          )}
          {domainSuccess && (
            <div className="mb-3 p-3 bg-green-100 text-green-700 rounded text-sm">{domainSuccess}</div>
          )}

          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newOrgDomain}
              onChange={(e) => { setNewOrgDomain(e.target.value); setDomainError(''); }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddOrgDomain(); } }}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="example.com"
              disabled={domainSaving}
            />
            <button
              onClick={handleAddOrgDomain}
              disabled={domainSaving || !newOrgDomain.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>

          {orgDomains.length === 0 ? (
            <p className="text-center text-gray-400 py-6 text-sm">
              No domains registered yet. Add domains here or via the Amazon SES settings tab.
            </p>
          ) : (
            <div className="space-y-2">
              {orgDomains.map((d) => (
                <div key={d.id} className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-800">{d.domain}</span>
                  </div>
                  <button
                    onClick={() => handleRemoveOrgDomain(d.id, d.domain)}
                    disabled={domainSaving}
                    className="p-1.5 text-gray-400 hover:text-red-500 rounded transition-colors disabled:opacity-50"
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
  );
}
